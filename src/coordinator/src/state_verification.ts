import { IPFS } from "../../node/ipfs";

import { Account, ComputeClaim, SignedTransaction, StateCheckResult, TransactionBundle } from "../../blockchain/types";
import { computeClaimToPB, stateCheckResultFromPB } from "../../blockchain/serde";
import {
  verifyStateCheckResultsAggregatedSignature,
  verifyStateCheckResultSignature,
} from "../../blockchain/block_proof";
import {
  bytesEqual,
  bytesToHex,
  hashComputeClaim,
  stringifySignedTransaction,
  hashTransactionBundle,
} from "../../blockchain/util";
import { IPFS_PUB_SUB_STATE_VERIFICATION } from "../../p2p/constant";
import { IPFSPubSubMessage } from "../../p2p/types";
import { keepConnectedToSwarm, stringifyPubSubMessage, stringifyStateVerificationResponse } from "../../p2p/util";
import { StateCheckResult as PBStateCheckResult } from "../../proto/grpcjs/blockchain_pb";
import { P2PPubSubMessage, StateVerificationRequest, StateVerificationResponse } from "../../proto/grpcjs/p2p_pb";
import Logger from "../../log/logger";

export interface StateVerificationManagerConfig {
  RequestBroadcastPeriod: number;
  RequestTimeout: number;
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

  constructor(config: StateVerificationManagerConfig, log: Logger, ipfs: IPFS) {
    this.config = config;
    this.log = log;

    this.ipfs = ipfs;

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
        IPFS_PUB_SUB_STATE_VERIFICATION,
        (msg: IPFSPubSubMessage) => {
          this.handlePubSubMessage(msg);
        },
        {
          onError: () => {
            this.log.debug("error in state pubsub, reconnecting");
            setTimeout(this.setupPubSub.bind(this), 1);
          },
        },
      );
      await this.ipfs.getIPFS().pubsub.publish(IPFS_PUB_SUB_STATE_VERIFICATION, new Uint8Array(0));
    } catch (err) {
      this.log.error("Failed during pubsub setup: " + err);
    }
  }

  public async start(): Promise<void> {
    await this.setupPubSub();
    await keepConnectedToSwarm(IPFS_PUB_SUB_STATE_VERIFICATION, this.ipfs, this.log, 10000);
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
      this.log.error("aggregated State committee sample signature is invalid");
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
        this.log.error(`transaction ${stringifySignedTransaction(txn)} rejected - state incorrect`);
      } else {
        // State checkers didn't reach consensus on claim state correctness.
        result.acceptedTxns = txnsWithoutClaim;
        result.rejectedTxns = Object.values(claimToTxn);
        for (const txn of result.rejectedTxns) {
          this.log.error(`transaction ${stringifySignedTransaction(txn)} rejected - State committee consensus failure`);
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
        this.log.info(`did not receive enough responses for ${bytesToHex(txnBundleHash)}`);
        this.process.reject(
          new Error("State verification timeout - no response for " + this.config.RequestTimeout + "ms"),
        );
        this.resetStateCheckProcess();
        return;
      }
    }, this.config.RequestTimeout);
  }

  private async broadcastStateCheckRequest(txnBundleHash: Uint8Array) {
    this.log.info(
      `starting broadcast of State check verification request for transaction bundle ${bytesToHex(txnBundleHash)}`,
    );

    while (true) {
      if (!bytesEqual(txnBundleHash, this.process.txnBundleHash)) {
        this.log.info(
          `stopping broadcast of State verification request for transaction bundle ${bytesToHex(txnBundleHash)}`,
        );
        return;
      }

      // Send reqeust via IPFS pub-sub.
      this.log.info(`publishing State verification request for transaction bundle ${bytesToHex(txnBundleHash)}`);
      const request = new StateVerificationRequest()
        .setTxnBundleHash(this.process.txnBundleHash)
        .setClaimsList(this.process.claims.map(computeClaimToPB))
        .setRandomnessProof(this.process.randomnessProof);
      const msg = new P2PPubSubMessage().setStateVerificationRequest(request);
      this.ipfs.getIPFS().pubsub.publish(IPFS_PUB_SUB_STATE_VERIFICATION, msg.serializeBinary());

      await new Promise((resolve, _) => {
        setTimeout(resolve, this.config.RequestBroadcastPeriod);
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
      this.log.info("received IPFS pubsub (state) message " + stringifyPubSubMessage(msg));

      // Ignore our own messages.
      if (msg.from == this.ipfs.id) {
        this.log.info("ignoring message from myself");
        return;
      }
      // Ignore pings.
      if (msg.data.length == 0) {
        this.log.info("ignoring ping message");
        return;
      }

      const protoMsg = P2PPubSubMessage.deserializeBinary(msg.data);
      if (protoMsg.hasStateVerificationResponse()) {
        await this.handleStateVerificationResponse(
          protoMsg.getStateVerificationResponse() as StateVerificationResponse,
        );
      }
    } catch (err: any) {
      this.log.error(err.toString() + " " + err.stack);
    }
  }

  private async handleStateVerificationResponse(response: StateVerificationResponse): Promise<void> {
    this.log.info(`received State verification response - ${stringifyStateVerificationResponse(response)}`);

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
      this.log.error("State check result signature is invalid");
      return;
    }

    // Check that response is for current transaction bundle (check txnBundleHash)
    // TODO: should we check randomness proof here as well?
    if (!bytesEqual(result.txnBundleHash, this.process.txnBundleHash)) {
      this.log.error("State verification request transaction bundle hash does not match");
      return;
    }

    // Check if sender is part of committee.
    const inCommittee = this.process.committee.find((s) => bytesEqual(s.address, result.signer));
    if (!inCommittee) {
      this.log.error("State verification response signer does not belong to current State committee sample");
      return;
    }

    // Check if member already sent response.
    const signerAddrHex = bytesToHex(result.signer);
    if (this.process.results[signerAddrHex] != undefined) {
      this.log.error("State committee member already sent response for current transaction bundle");
      return;
    }
    this.process.results[signerAddrHex] = result;

    // If not enough responses received wait for more responses.
    const responseCount = Object.keys(this.process.results).length;
    if (responseCount < this.process.committee.length) {
      return;
    }
    this.log.info("Received all responses for State check");
    // Notify, that all respones have been received.
    this.process.resolve();
  }
}
