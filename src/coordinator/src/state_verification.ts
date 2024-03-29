import { IPFS } from "../../p2p/ipfs";

import { Account, ComputeClaim, SignedTransaction, StateCheckResult, TransactionBundle } from "../../blockchain/types";
import { computeClaimToPB, stateCheckResultFromPB } from "../../blockchain/serde";
import {
  verifyStateCheckResultsAggregatedSignature,
  verifyStateCheckResultSignature,
} from "../../blockchain/block_proof";
import { bytesEqual, bytesToHex, hashComputeClaim, hashTransactionBundle } from "../../blockchain/util";
import { IPFS_PUB_SUB_STATE_VERIFICATION } from "../../p2p/constant";
import { IPFSPubSubMessage } from "../../p2p/types";
import { logPubSubMessage, logStateVerificationResponse } from "../../p2p/util";
import { StateCheckResult as PBStateCheckResult } from "../../proto/grpcjs/blockchain_pb";
import { P2PPubSubMessage, StateVerificationRequest, StateVerificationResponse } from "../../proto/grpcjs/p2p_pb";
import Logger from "../../log/logger";

const LOG_VERIFIER = "state-verifier";
const LOG_NETWORK = [LOG_VERIFIER, "network"];

export interface StateVerificationManagerConfig {
  requestBroadcastPeriod: number;
  requestTimeout: number;
}

export interface TransactionBundleStateCheckResult {
  responses: StateCheckResult[];
  aggSignature: Uint8Array;
  acceptedTxns: SignedTransaction[];
  rejectedTxns: SignedTransaction[];
}

interface StateCheckProcess {
  txnBundleHash: Uint8Array;
  claims: ComputeClaim[];
  randomnessProof: Uint8Array;
  committee: Account[];
  results: Record<string, StateCheckResult>;
  resolve: any; // Promise resolve function.
  reject: any; // Promise reject function.
}

// Computation result verification.
export class StateVerificationManager {
  private readonly config: StateVerificationManagerConfig;
  private readonly log: Logger;

  private ipfs: IPFS;

  private readonly process: StateCheckProcess;
  private readonly coordinatorPublicKey: Uint8Array;

  constructor(config: StateVerificationManagerConfig, log: Logger, ipfs: IPFS, coordinatorPubKey: Uint8Array) {
    this.config = config;
    this.log = log;

    this.ipfs = ipfs;
    this.coordinatorPublicKey = coordinatorPubKey;

    this.process = {
      txnBundleHash: new Uint8Array(),
      claims: [],
      randomnessProof: new Uint8Array(),
      committee: [],
      results: {},
      resolve: undefined,
      reject: undefined,
    };
  }

  private async setupPubSub() {
    try {
      await this.ipfs.getIPFSforPubSub().pubsub.subscribe(
        IPFS_PUB_SUB_STATE_VERIFICATION + "-" + bytesToHex(this.coordinatorPublicKey),
        (msg: IPFSPubSubMessage) => {
          this.handlePubSubMessage(msg);
        },
        {
          onError: (err) => {
            this.log.error("pubsub failed, reconnecting", err, LOG_NETWORK);
            setTimeout(this.setupPubSub.bind(this), 1);
          },
        },
      );
      await this.ipfs
        .getIPFS()
        .pubsub.publish(
          IPFS_PUB_SUB_STATE_VERIFICATION + "-" + bytesToHex(this.coordinatorPublicKey),
          new Uint8Array(0),
        );
    } catch (err: any) {
      this.log.error("failed to setup pubsub", err, LOG_NETWORK);
    }
  }

  public async start(): Promise<void> {
    await this.setupPubSub();
    await this.ipfs.keepConnectedToSwarm(
      IPFS_PUB_SUB_STATE_VERIFICATION + "-" + bytesToHex(this.coordinatorPublicKey),
      10000,
    );
  }
  public async checkTxnBundleState(
    txnBundle: TransactionBundle,
    blockRandProof: Uint8Array,
    committee: Account[],
  ): Promise<TransactionBundleStateCheckResult> {
    // Collect all computational claims, appearing in transaction bundle.
    const requestClaims: ComputeClaim[] = [];
    const claimToTxn: Record<string, SignedTransaction> = {};
    const txnsWithoutClaim: SignedTransaction[] = [];
    for (const txn of txnBundle.transactions) {
      let claimHash = undefined;
      if (txn.txn.createChain != undefined) {
        requestClaims.push(txn.txn.createChain.rootClaim);
        claimHash = hashComputeClaim(txn.txn.createChain.rootClaim);
      } else if (txn.txn.updateChain != undefined) {
        requestClaims.push(txn.txn.updateChain.claim);
        claimHash = hashComputeClaim(txn.txn.updateChain.claim);
      } else {
        txnsWithoutClaim.push(txn);
      }
      if (claimHash) {
        claimToTxn[bytesToHex(claimHash)] = txn;
      }
    }
    if (requestClaims.length == 0) {
      return {
        acceptedTxns: txnBundle.transactions,
        rejectedTxns: [],
        responses: [],
        aggSignature: new Uint8Array(),
      };
    }

    // Query state check committee.
    // This fills State check state, which has to be resetted after.
    await this.execStateCheckRequest(txnBundle, blockRandProof, committee, requestClaims);

    // Sanity check of number of received responses.
    const responseCount = Object.keys(this.process.results).length;
    if (responseCount < this.process.committee.length) {
      // Reset State check state to stop request broadcast.
      this.resetStateCheckProcess();
      // That means coding error in message processing or callbacks.
      throw new Error("Number of unique State verification responses is less then size of State committee");
    } else if (responseCount > this.process.committee.length) {
      // Reset State check state to stop request broadcast.
      this.resetStateCheckProcess();
      // That means coding error in message processing callback.
      throw new Error("Number of unique State verification responses is greater then size of State committee");
    }

    // We expect State checkers to reach full consensus on state correctness.
    // Hence we can consider to one of responses to carry "final result".
    const result: TransactionBundleStateCheckResult = {
      responses: Object.values(this.process.results),
      aggSignature: new Uint8Array(),
      acceptedTxns: [],
      rejectedTxns: [],
    };
    const claimResults = result.responses[0].claims;

    // Check of aggregated signature of received State check verification responses.
    // For now this also ensures that State checkers have reached consensus.
    const responseSigners = result.responses.map((response) => response.signer);
    const [validAggSig, aggSig] = await verifyStateCheckResultsAggregatedSignature(
      this.process.txnBundleHash,
      this.process.randomnessProof,
      claimResults,
      result.responses,
      responseSigners,
    );
    if (validAggSig) {
      result.aggSignature = aggSig;
    } else {
      this.log.info("aggregated state committee sample signature is invalid", LOG_VERIFIER);
      result.acceptedTxns = txnsWithoutClaim;
      result.rejectedTxns = Object.values(claimToTxn);

      // Reset State Check state to stop request broadcast.
      this.resetStateCheckProcess();

      return result;
    }

    // Collect "State check votes" for every claim.
    const claimState: Record<string, boolean[]> = {};
    for (const claim of this.process.claims) {
      const claimHash = hashComputeClaim(claim);
      claimState[bytesToHex(claimHash)] = [];
    }
    for (const result of Object.values(this.process.results)) {
      for (const claimResult of result.claims) {
        claimState[bytesToHex(claimResult.claimHash)].push(claimResult.stateCorrect);
      }
    }

    // Find out, which claims have been rejected/accpeted and by State
    // committee and ensure that last one has reached unanimous agreement.
    for (const claimHash of Object.keys(claimState)) {
      if (claimState[claimHash].every((stateCorrect) => stateCorrect)) {
        // State checkers agreed that state for claim is correct.
        const txn = claimToTxn[claimHash];
        result.acceptedTxns.push(txn);
      } else if (claimState[claimHash].every((stateCorrect) => !stateCorrect)) {
        // State checkers agreed that state for claim is incorrect.
        const txn = claimToTxn[claimHash];
        result.rejectedTxns.push(txn);
        this.log.info("transaction rejected", LOG_VERIFIER, { reason: "invalid state", txn: txn });
      } else {
        // State checkers didn't reach consensus on claim state correctness.
        result.acceptedTxns = txnsWithoutClaim;
        result.rejectedTxns = Object.values(claimToTxn);
        for (const txn of result.rejectedTxns) {
          this.log.info("transaction rejected", LOG_VERIFIER, {
            reason: "state committee consensus failure",
            txn: txn,
          });
        }
        break;
      }
    }

    // Reset State check state to stop reqeust broadcast.
    this.resetStateCheckProcess();

    return result;
  }

  private async execStateCheckRequest(
    txnBunde: TransactionBundle,
    blockRandProof: Uint8Array,
    committee: Account[],
    claims: ComputeClaim[],
  ): Promise<void> {
    // Setup essentials.
    this.process.txnBundleHash = hashTransactionBundle(txnBunde);
    this.process.claims = claims;
    this.process.randomnessProof = blockRandProof;

    // Setup State committee sample.
    this.process.committee = committee;

    // Clear responses for previous transaction bundle.
    this.process.results = {};

    // Need to wait until all State verification responses.
    // request are received (or timeout occurs).
    const stateCheckProgress = new Promise<void>((resolve, reject) => {
      this.process.resolve = resolve;
      this.process.reject = reject;
    });

    this.setupStateCheckRequestTimeout(this.process.txnBundleHash);
    this.broadcastStateCheckRequest(this.process.txnBundleHash);

    await stateCheckProgress;
  }

  private setupStateCheckRequestTimeout(txnBundleHash: Uint8Array): void {
    setTimeout(() => {
      // Next transaction bundle is already being processed.
      if (!bytesEqual(txnBundleHash, this.process.txnBundleHash)) {
        return;
      }
      // Current transaction bundle haven't received enough responses.
      const responseCount = Object.keys(this.process.results).length;
      if (responseCount < this.process.committee.length) {
        this.log.info("not enough responses from committee for transaction bundle", LOG_NETWORK, {
          txnBundleHash: txnBundleHash,
        });
        this.process.reject(
          new Error("State verification timeout - no response for " + this.config.requestTimeout + "ms"),
        );
        this.resetStateCheckProcess();
        return;
      }
    }, this.config.requestTimeout);
  }

  private async broadcastStateCheckRequest(txnBundleHash: Uint8Array) {
    this.log.info("starting broadcast of state verification request", LOG_NETWORK, {
      txnBundleHash: txnBundleHash,
    });

    while (true) {
      if (!bytesEqual(txnBundleHash, this.process.txnBundleHash)) {
        this.log.info("stopping broadcast of state verification request", LOG_NETWORK, {
          txnBundleHash: txnBundleHash,
        });
        return;
      }

      // Send reqeust via IPFS pub-sub.
      this.log.info("publishing state verification request", LOG_NETWORK, {
        txnBundleHash: txnBundleHash,
      });
      const request = new StateVerificationRequest()
        .setTxnBundleHash(this.process.txnBundleHash)
        .setClaimsList(this.process.claims.map(computeClaimToPB))
        .setRandomnessProof(this.process.randomnessProof);
      const msg = new P2PPubSubMessage().setStateVerificationRequest(request);
      this.ipfs
        .getIPFS()
        .pubsub.publish(
          IPFS_PUB_SUB_STATE_VERIFICATION + "-" + bytesToHex(this.coordinatorPublicKey),
          msg.serializeBinary(),
        );

      await new Promise((resolve, _) => {
        setTimeout(resolve, this.config.requestBroadcastPeriod);
      });
    }
  }

  private resetStateCheckProcess(): void {
    this.process.txnBundleHash = new Uint8Array();
    this.process.claims = [];
    this.process.randomnessProof = new Uint8Array();
    this.process.committee = [];
    this.process.results = {};
    this.process.resolve = undefined;
    this.process.reject = undefined;
  }

  private async handlePubSubMessage(msg: IPFSPubSubMessage): Promise<void> {
    try {
      this.log.info("received IPFS pubsub message", LOG_NETWORK, {
        message: logPubSubMessage(msg),
      });

      // Ignore our own messages.
      if (msg.from == this.ipfs.id) {
        this.log.debug("ignoring message from myself", LOG_NETWORK);
        return;
      }
      // Ignore pings.
      if (msg.data.length == 0) {
        this.log.info("ignoring ping message", LOG_NETWORK);
        return;
      }

      const protoMsg = P2PPubSubMessage.deserializeBinary(msg.data);
      if (protoMsg.hasStateVerificationResponse()) {
        await this.handleStateVerificationResponse(
          protoMsg.getStateVerificationResponse() as StateVerificationResponse,
        );
      }
    } catch (err: any) {
      this.log.error("failed to process pubsub message", err, LOG_NETWORK);
    }
  }

  private async handleStateVerificationResponse(response: StateVerificationResponse): Promise<void> {
    this.log.info("received state verification response", LOG_NETWORK, {
      response: logStateVerificationResponse(response),
    });

    // Check signature of response.
    const result = stateCheckResultFromPB(response.getResult() as PBStateCheckResult);
    if (
      !(await verifyStateCheckResultSignature(
        result.txnBundleHash,
        result.randomnessProof,
        result.claims,
        result.signature,
        result.signer,
      ))
    ) {
      this.log.info("state check result signature is invalid", LOG_VERIFIER);
      return;
    }

    // Check that response is for current transaction bundle (check txnBundleHash)
    // TODO: should we check randomness proof here as well?
    if (!bytesEqual(result.txnBundleHash, this.process.txnBundleHash)) {
      this.log.info("state verification request transaction bundle hash does not match", LOG_VERIFIER);
      return;
    }

    // Check if sender is part of committee.
    const inCommittee = this.process.committee.find((s) => bytesEqual(s.address, result.signer));
    if (!inCommittee) {
      this.log.info(
        "state verification response signer does not belong to current state committee sample",
        LOG_VERIFIER,
      );
      return;
    }

    // Check if member already sent response.
    const signerAddrHex = bytesToHex(result.signer);
    if (this.process.results[signerAddrHex] != undefined) {
      this.log.info("state committee member already sent response for current transaction bundle", LOG_VERIFIER);
      return;
    }
    this.process.results[signerAddrHex] = result;

    // If not enough responses received wait for more responses.
    const responseCount = Object.keys(this.process.results).length;
    if (responseCount < this.process.committee.length) {
      return;
    }
    this.log.info("Received all responses for state check", LOG_VERIFIER);
    // Notify, that all respones have been received.
    this.process.resolve();
  }
}
