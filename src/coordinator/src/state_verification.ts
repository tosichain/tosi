import winston from "winston";

import { IPFS } from "../../node/ipfs";
import { encodeCBOR, decodeCBOR } from "../../util";

import { Account, ComputeClaim, SignedTransaction, StateCheckResult, TransactionBundle } from "../../blockchain/types";
import {
  verifyStateCheckResultsAggergatedSignature,
  verifyStateCheckResultSignature,
} from "../../blockchain/block_proof";
import {
  bytesEqual,
  bytesToHex,
  hashComputeClaim,
  stringifySignedTransaction,
  hashTransactionBundle,
} from "../../blockchain/util";
import {
  IPFS_PUB_SUB_STATE_VERIFICATION,
  IPFS_MESSAGE_STATE_VERIFICATION_REQUEST,
  IPFS_MESSAGE_STATE_VERIFICATION_RESPONSE,
} from "../../p2p/constant";
import { IPFSPubSubMessage, StateVerificationRequestMessage, StateVerificationResponseMessage } from "../../p2p/types";
import { stringifyPubSubMessage, stringifyStateVerificationResponse } from "../../p2p/util";

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

interface StateCheckState {
  request: StateVerificationRequestMessage;
  commitee: Account[];
  responses: Record<string, StateVerificationResponseMessage>;
  resolve: any; // Promise resolve function.
  reject: any; // Promise reject function.
}

// Computation result verification.
export class StateVerificationManager {
  private readonly config: StateVerificationManagerConfig;
  private readonly log: winston.Logger;

  private ipfs: IPFS;

  private readonly checkState: StateCheckState;

  constructor(config: StateVerificationManagerConfig, log: winston.Logger, ipfs: IPFS) {
    this.config = config;
    this.log = log;

    this.ipfs = ipfs;

    this.checkState = {
      request: {
        code: IPFS_MESSAGE_STATE_VERIFICATION_REQUEST,
        txnBundleHash: new Uint8Array(),
        claims: [],
        randomnessProof: new Uint8Array(),
      },
      commitee: [],
      responses: {},
      resolve: undefined,
      reject: undefined,
    };
  }

  public async start(): Promise<void> {
    await this.ipfs.getIPFS().pubsub.subscribe(IPFS_PUB_SUB_STATE_VERIFICATION, (msg: IPFSPubSubMessage) => {
      this.handlePubSubMessage(msg);
    });
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
    const responseCount = Object.keys(this.checkState.responses).length;
    if (responseCount < this.checkState.commitee.length) {
      // Reset State check state to stop request broadcast.
      this.resetStateCheckState();
      // That means coding error in message processing or callbacks.
      throw new Error("Number of unique State verification responses is less then size of State committee");
    } else if (responseCount > this.checkState.commitee.length) {
      // Reset State check state to stop request broadcast.
      this.resetStateCheckState();
      // That means coding error in message processing callback.
      throw new Error("Number of unique State verification responses is greater then size of State committee");
    }

    // We expect State checkers to reach full consensus on state correctness.
    // Hence we can consider to one of responses to carry "final result".
    const result: TransactionBundleStateCheckResult = {
      responses: Object.values(this.checkState.responses).map((response) => response.result),
      aggSignature: new Uint8Array(),
      acceptedTxns: [],
      rejectedTxns: [],
    };
    const claimResults = result.responses[0].claims;

    // Check of aggregated signature of received State check verification responses.
    // For now this also ensures that State checkers have reached consensus.
    const responseSigners = result.responses.map((response) => response.signer);
    const [validAggSig, aggSig] = await verifyStateCheckResultsAggergatedSignature(
      this.checkState.request.txnBundleHash,
      this.checkState.request.randomnessProof,
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
      this.resetStateCheckState();

      return result;
    }

    // Collect "State check votes" for every claim.
    const claimState: Record<string, boolean[]> = {};
    for (const claim of this.checkState.request.claims) {
      const claimHash = hashComputeClaim(claim);
      claimState[bytesToHex(claimHash)] = [];
    }
    for (const response of Object.values(this.checkState.responses)) {
      for (const claimResult of response.result.claims) {
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
    this.resetStateCheckState();

    return result;
  }

  private async execStateCheckRequest(
    txnBunde: TransactionBundle,
    blockRandProof: Uint8Array,
    committee: Account[],
    claims: ComputeClaim[],
  ): Promise<void> {
    // Setup request.
    const txnBundleHash = hashTransactionBundle(txnBunde);
    this.checkState.request = {
      code: IPFS_MESSAGE_STATE_VERIFICATION_REQUEST,
      txnBundleHash: txnBundleHash,
      claims: claims,
      randomnessProof: blockRandProof,
    };

    // Setup State committee sample.
    this.checkState.commitee = committee;

    // Clear responses for previous transaction bundle.
    this.checkState.responses = {};

    // Need to wait until all State verification responses.
    // request are received (or timeout occurs).
    const stateCheckProgress = new Promise<void>((resolve, reject) => {
      this.checkState.resolve = resolve;
      this.checkState.reject = reject;
    });

    this.setupStateCheckRequestTimeout(this.checkState.request.txnBundleHash);
    this.broadcastStateCheckRequest(this.checkState.request.txnBundleHash);

    await stateCheckProgress;
  }

  private setupStateCheckRequestTimeout(txnBundleHash: Uint8Array): void {
    setTimeout(() => {
      // Next transaction bundle is already being processed.
      if (!bytesEqual(txnBundleHash, this.checkState.request.txnBundleHash)) {
        return;
      }
      // Current transaction bundle haven't received enough responses.
      const responseCount = Object.keys(this.checkState.responses).length;
      if (responseCount < this.checkState.commitee.length) {
        this.log.info(`did not receive enough responses for ${bytesToHex(txnBundleHash)}`);
        this.checkState.reject(
          new Error("State verification timeout - no response for " + this.config.RequestTimeout + "ms"),
        );
        this.resetStateCheckState();
        return;
      }
    }, this.config.RequestTimeout);
  }

  private async broadcastStateCheckRequest(txnBundleHash: Uint8Array) {
    this.log.info(
      `starting broadcast of State check verification request for transaction bundle ${bytesToHex(txnBundleHash)}`,
    );

    while (true) {
      if (!bytesEqual(txnBundleHash, this.checkState.request.txnBundleHash)) {
        this.log.info(
          `stopping broadcast of State verification request for transaction bundle ${bytesToHex(txnBundleHash)}`,
        );
        return;
      }

      // Send reqeust via IPFS pub-sub.
      this.log.info(`publishing State verification request for transaction bundle ${bytesToHex(txnBundleHash)}`);
      this.ipfs.getIPFS().pubsub.publish(IPFS_PUB_SUB_STATE_VERIFICATION, encodeCBOR(this.checkState.request));

      await new Promise((resolve, _) => {
        setTimeout(resolve, this.config.RequestBroadcastPeriod);
      });
    }
  }

  private resetStateCheckState(): void {
    this.checkState.request = {
      code: IPFS_MESSAGE_STATE_VERIFICATION_REQUEST,
      txnBundleHash: new Uint8Array(),
      claims: [],
      randomnessProof: new Uint8Array(),
    };
    this.checkState.commitee = [];
    this.checkState.responses = {};
    this.checkState.resolve = undefined;
    this.checkState.reject = undefined;
  }

  private handlePubSubMessage(msg: IPFSPubSubMessage): void {
    try {
      this.log.info("received IPFS pubsub message " + stringifyPubSubMessage(msg));

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

      const decoded = decodeCBOR(msg.data);
      if (decoded && decoded.code && decoded.code == IPFS_MESSAGE_STATE_VERIFICATION_REQUEST) {
        this.log.error(`ignoring State verification request - only coordinator can send State verification requests`);
      } else if (decoded && decoded.code && decoded.code == IPFS_MESSAGE_STATE_VERIFICATION_RESPONSE) {
        this.handleStateVerificationResponse(decoded as StateVerificationResponseMessage);
      } else {
        this.log.warn(`ignoring decoded message with unknown code`);
      }
    } catch (err: any) {
      this.log.error(err.toString() + " " + err.stack);
    }
  }

  private async handleStateVerificationResponse(msg: StateVerificationResponseMessage): Promise<void> {
    this.log.info(`received State verification response - ${stringifyStateVerificationResponse(msg)}`);

    // Check signature of response.
    if (
      !(await verifyStateCheckResultSignature(
        msg.result.txnBundleHash,
        msg.result.randomnessProof,
        msg.result.claims,
        msg.result.signature,
        msg.result.signer,
      ))
    ) {
      this.log.error("State check result signature is invalid");
      return;
    }

    // Check that response is for current transaction bundle (check txnBundleHash)
    // TODO: should we check randomness proof here as well?
    if (!bytesEqual(msg.result.txnBundleHash, this.checkState.request.txnBundleHash)) {
      this.log.error("State verification request transaction bundle hash does not match");
      return;
    }

    // Check if sender is part of committee.
    const inCommittee = this.checkState.commitee.find((s) => bytesEqual(s.address, msg.result.signer));
    if (!inCommittee) {
      this.log.error("State verification response signer does not belong to current State committee sample");
      return;
    }

    // Check if member already sent response.
    const signerAddrHex = bytesToHex(msg.result.signer);
    if (this.checkState.responses[signerAddrHex] != undefined) {
      this.log.error("State committee member already sent response for current transaction bundle");
      return;
    }
    this.checkState.responses[signerAddrHex] = msg;

    // If not enough responses received wait for more responses.
    const responseCount = Object.keys(this.checkState.responses).length;
    if (responseCount < this.checkState.commitee.length) {
      return;
    }
    this.log.info("Received all responses for State check");
    // Notify, that all respones have been received.
    this.checkState.resolve();
  }
}
