import winston from "winston";

import { IPFS } from "../../node/ipfs";
import { encodeCBOR, decodeCBOR } from "../../util";

import { Staker, ComputeClaim, DACheckResult, SignedTransaction, TransactionBundle } from "../../blockchain/types";
import { verifyDACheckResultsAggergatedSignature, verifyDACheckResultSignature } from "../../blockchain/block_proof";
import { hashComputeClaim, stringifySignedTransaction, hashTransactionBundle } from "../../blockchain/util";
import {
  IPFS_PUB_SUB_DA_VERIFICATION,
  IPFS_MESSAGE_DA_VERIFICATION_REQUEST,
  IPFS_MESSAGE_DA_VERIFICATION_RESPONSE,
} from "../../p2p/constant";
import { IPFSPubSubMessage, DAVerificationRequestMessage, DAVerificationResponseMessage } from "../../p2p/types";
import { stringifyPubSubMessage, stringifyDAVerificationResponse } from "../../p2p/util";

export interface DAVerificationManagerConfig {
  RequestBroadcastPeriod: number;
  RequestTimeout: number;
}

export interface TransactionBundleDACheckResult {
  responses: DACheckResult[];
  aggSignature: Uint8Array;
  acceptedTxns: SignedTransaction[];
  rejectedTxns: SignedTransaction[];
}

interface DACheckState {
  request: DAVerificationRequestMessage;
  commitee: Staker[];
  responses: Record<string, DAVerificationResponseMessage>;
  resolve: any; // Promise resolve function.
  reject: any; // Promise reject function.
}

// Offchain computation manager coordinates offchain nodes, doing:
// 1. Data availability sampling.
// 2. Computation result verification.
export class DAVerificationManager {
  private readonly config: DAVerificationManagerConfig;
  private readonly log: winston.Logger;

  private ipfs: IPFS;

  private readonly checkState: DACheckState;

  constructor(config: DAVerificationManagerConfig, log: winston.Logger, ipfs: IPFS) {
    this.config = config;
    this.log = log;

    this.ipfs = ipfs;

    this.checkState = {
      request: {
        code: IPFS_MESSAGE_DA_VERIFICATION_REQUEST,
        txnBundleHash: "",
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
    await this.ipfs.getIPFS().pubsub.subscribe(IPFS_PUB_SUB_DA_VERIFICATION, (msg: IPFSPubSubMessage) => {
      this.handlePubSubMessage(msg);
    });
  }

  public async checkTxnBundleDA(
    txnBundle: TransactionBundle,
    blockRandProof: Uint8Array,
    committee: Staker[],
  ): Promise<TransactionBundleDACheckResult> {
    // Collect all computational claims, appearing in transaction bundle.
    const requestClaims: ComputeClaim[] = [];
    const claimToTxn: Record<string, SignedTransaction> = {};
    const txnsWithoutClaim: SignedTransaction[] = [];
    for (const txn of txnBundle.transactions) {
      let claimHash = undefined;
      if (txn.txn.addChain != undefined) {
        requestClaims.push(txn.txn.addChain.rootClaim);
        claimHash = hashComputeClaim(txn.txn.addChain.rootClaim);
      } else if (txn.txn.addClaim != undefined) {
        requestClaims.push(txn.txn.addClaim.claim);
        claimHash = hashComputeClaim(txn.txn.addClaim.claim);
      } else {
        txnsWithoutClaim.push(txn);
      }
      if (claimHash) {
        claimToTxn[claimHash] = txn;
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

    // Query DA committee.
    // This fills DA state, which has to be resetted after.
    await this.execDARequest(txnBundle, blockRandProof, committee, requestClaims);

    // Sanity check of number of received responses.
    const responseCount = Object.keys(this.checkState.responses).length;
    if (responseCount < this.checkState.commitee.length) {
      // Reset DA state to stop request broadcast.
      this.resetDAState();
      // That means coding error in message processing or callbacks.
      throw new Error("Number of unique DA verification responses is less then size of DA committee");
    } else if (responseCount > this.checkState.commitee.length) {
      // Reset DA state to stop request broadcast.
      this.resetDAState();
      // That means coding error in message processing callback.
      throw new Error("Number of unique DA verification responses is greater then size of DA committee");
    }

    // We expect DA checkers to reach full consensus on data availability.
    // Hence we can consider to one of responses to carry "final result".
    const result: TransactionBundleDACheckResult = {
      responses: Object.values(this.checkState.responses).map((response) => response.result),
      aggSignature: new Uint8Array(),
      acceptedTxns: [],
      rejectedTxns: [],
    };
    const claimResults = result.responses[0].claims;

    // Check of aggregated signature of received DA verification responses.
    // For now this also ensures that DA checkers have reached consensus.
    const responseSigners = result.responses.map((response) => response.signer);
    const [validAggSig, aggSig] = await verifyDACheckResultsAggergatedSignature(
      this.checkState.request.txnBundleHash,
      this.checkState.request.randomnessProof,
      claimResults,
      result.responses,
      responseSigners,
    );
    if (validAggSig) {
      result.aggSignature = aggSig;
    } else {
      this.log.error("aggregated DA committee sample signature is invalid");
      result.acceptedTxns = txnsWithoutClaim;
      result.rejectedTxns = Object.values(claimToTxn);

      // Reset DA state to stop request broadcast.
      this.resetDAState();

      return result;
    }

    // Collect "DA votes" for every claim.
    const claimDA: Record<string, boolean[]> = {};
    for (const claim of this.checkState.request.claims) {
      claimDA[hashComputeClaim(claim)] = [];
    }
    for (const response of Object.values(this.checkState.responses)) {
      for (const claimResult of response.result.claims) {
        claimDA[claimResult.claimHash].push(claimResult.dataAvailable);
      }
    }

    // Find out, which claims have been rejected/accpeted and by DA
    // committee and ensure that last one has reached unanimous agreement.
    for (const claimHash of Object.keys(claimDA)) {
      if (claimDA[claimHash].every((dataAvailable) => dataAvailable)) {
        // DA checkers agreed that data for claim is available.
        const txn = claimToTxn[claimHash];
        result.acceptedTxns.push(txn);
      } else if (claimDA[claimHash].every((dataAvailable) => !dataAvailable)) {
        // DA checkers agreed that data for claim is unavailable.
        const txn = claimToTxn[claimHash];
        result.rejectedTxns.push(txn);
        this.log.error(`transaction ${stringifySignedTransaction(txn)} rejected - data unavailable`);
      } else {
        // DA checkers didn't reach consensus on claim data availability.
        result.acceptedTxns = txnsWithoutClaim;
        result.rejectedTxns = Object.values(claimToTxn);
        for (const txn of result.rejectedTxns) {
          this.log.error(`transaction ${stringifySignedTransaction(txn)} rejected - DA committee consensus failure`);
        }
        break;
      }
    }

    // Reset DA state to stop reqeust broadcast.
    this.resetDAState();

    return result;
  }

  private async execDARequest(
    txnBunde: TransactionBundle,
    blockRandProof: Uint8Array,
    committee: Staker[],
    claims: ComputeClaim[],
  ): Promise<void> {
    // Setup request.
    const txnBundleHash = hashTransactionBundle(txnBunde);
    this.checkState.request = {
      code: IPFS_MESSAGE_DA_VERIFICATION_REQUEST,
      txnBundleHash: txnBundleHash,
      claims: claims,
      randomnessProof: blockRandProof,
    };

    // Setup DA committee sample.
    this.checkState.commitee = committee;

    // Clear responses for previous transaction bundle.
    this.checkState.responses = {};

    // Need to wait until all DA verification responses.
    // request are received (or timeout occurs).
    const dasProgress = new Promise<void>((resolve, reject) => {
      this.checkState.resolve = resolve;
      this.checkState.reject = reject;
    });

    this.setupDASRequestTimeout(this.checkState.request.txnBundleHash);
    this.broadcastDASRequest(this.checkState.request.txnBundleHash);

    await dasProgress;
  }

  private setupDASRequestTimeout(txnBundleHash: string): void {
    setTimeout(() => {
      // Next transaction bundle is already being processed.
      if (txnBundleHash != this.checkState.request.txnBundleHash) {
        return;
      }
      // Current transaction bundle haven't received enough responses.
      const responseCount = Object.keys(this.checkState.responses).length;
      if (responseCount < this.checkState.commitee.length) {
        this.checkState.reject(new Error("DA verification timeout"));
        this.resetDAState();
        return;
      }
    }, this.config.RequestTimeout);
  }

  private async broadcastDASRequest(txnBundleHash: string) {
    this.log.info(`starting broadcast of DA verification request for transaction bundle ${txnBundleHash}`);

    while (true) {
      if (txnBundleHash != this.checkState.request.txnBundleHash) {
        this.log.info(`stopping broadcast of DA verification request for transaction bundle ${txnBundleHash}`);
        return;
      }

      // Send reqeust via IPFS pub-sub.
      this.log.info(`publishing DA verification request for transaction bundle ${txnBundleHash}`);
      this.ipfs.getIPFS().pubsub.publish(IPFS_PUB_SUB_DA_VERIFICATION, encodeCBOR(this.checkState.request));

      await new Promise((resolve, _) => {
        setTimeout(resolve, this.config.RequestBroadcastPeriod);
      });
    }
  }

  private resetDAState(): void {
    this.checkState.request = {
      code: IPFS_MESSAGE_DA_VERIFICATION_REQUEST,
      txnBundleHash: "",
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
      if (msg.from === this.ipfs.id) {
        this.log.info("ignoring message from myself");
        return;
      }
      // Ignore pings.
      if (msg.data.length == 0) {
        this.log.info("ignoring ping message");
        return;
      }

      const decoded = decodeCBOR(msg.data);
      if (decoded && decoded.code && decoded.code === IPFS_MESSAGE_DA_VERIFICATION_REQUEST) {
        this.log.error(`ignoring DA verification request - only coordinator can send DA verification requests`);
      } else if (decoded && decoded.code && decoded.code == IPFS_MESSAGE_DA_VERIFICATION_RESPONSE) {
        this.handelDAVerificationResponse(decoded as DAVerificationResponseMessage);
      } else {
        this.log.warn(`ignoring decoded message with unknown code`);
      }
    } catch (err: any) {
      this.log.error(err.toString() + " " + err.stack);
    }
  }

  private async handelDAVerificationResponse(msg: DAVerificationResponseMessage): Promise<void> {
    this.log.info(`received DA verification response - ${stringifyDAVerificationResponse(msg)}`);

    // Check signature of response.
    if (
      !(await verifyDACheckResultSignature(
        msg.result.txnBundleHash,
        msg.result.randomnessProof,
        msg.result.claims,
        msg.result.signature,
        msg.result.signer,
      ))
    ) {
      this.log.error("DA check result signature is invalid");
      return;
    }

    // Check that response is for current transaction bundle (check txnBundleHash)
    // TODO: should we check randomness proof here as well?
    if (msg.result.txnBundleHash != this.checkState.request.txnBundleHash) {
      this.log.error("DA verification request transaction bundle hash does not match");
      return;
    }

    // Check if sender is part of committee.
    const inCommittee = this.checkState.commitee.find((s) => s.pubKey == msg.result.signer);
    if (!inCommittee) {
      this.log.error("DA verification response signer does not belong to current DA committee sample");
      return;
    }

    // Check if member already sent response.
    if (this.checkState.responses[msg.result.signer] != undefined) {
      this.log.error("DA committee member already sent response for current transaction bundle");
      return;
    }
    this.checkState.responses[msg.result.signer] = msg;

    // If not enough responses received wait for more responses.
    const responseCount = Object.keys(this.checkState.responses).length;
    if (responseCount < this.checkState.commitee.length) {
      return;
    }

    // Notify, that all respones have been received.
    this.checkState.resolve();
  }
}
