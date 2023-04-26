import { IPFS } from "../../node/ipfs";

import { Account, ComputeClaim, DACheckResult, SignedTransaction, TransactionBundle } from "../../blockchain/types";
import { computeClaimToPB, daCheckResultFromPB } from "../../blockchain/serde";
import { verifyDACheckResultsAggergatedSignature, verifyDACheckResultSignature } from "../../blockchain/block_proof";
import {
  bytesEqual,
  bytesToHex,
  hashComputeClaim,
  stringifySignedTransaction,
  hashTransactionBundle,
} from "../../blockchain/util";
import { IPFS_PUB_SUB_DA_VERIFICATION } from "../../p2p/constant";
import { IPFSPubSubMessage } from "../../p2p/types";
import { DACheckResult as PBDACheckResult } from "../../proto/grpcjs/blockchain_pb";
import { P2PPubSubMessage, DAVerificationRequest, DAVerificationResponse } from "../../proto/grpcjs/p2p_pb";
import { stringifyPubSubMessage, stringifyDAVerificationResponse } from "../../p2p/util";
import Logger from "../../log/logger";

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

interface DACheckProcess {
  txnBundleHash: Uint8Array;
  claims: ComputeClaim[];
  randomnessProof: Uint8Array;
  commitee: Account[];
  results: Record<string, DACheckResult>;
  resolve: any; // Promise resolve function.
  reject: any; // Promise reject function.
}

export class DAVerificationManager {
  private readonly config: DAVerificationManagerConfig;
  private readonly log: Logger;

  private ipfs: IPFS;

  private readonly process: DACheckProcess;

  constructor(config: DAVerificationManagerConfig, log: Logger, ipfs: IPFS) {
    this.config = config;
    this.log = log;

    this.ipfs = ipfs;

    this.process = {
      txnBundleHash: new Uint8Array(),
      claims: [],
      randomnessProof: new Uint8Array(),
      commitee: [],
      results: {},
      resolve: undefined,
      reject: undefined,
    };
  }

  private async setupPubSub() {
    try {
      await this.ipfs.getIPFSforPubSub().pubsub.subscribe(
        IPFS_PUB_SUB_DA_VERIFICATION,
        (msg: IPFSPubSubMessage) => {
          this.handlePubSubMessage(msg);
        },
        {
          onError: () => {
            this.log.debug("error in da pubsub, reconnecting");
            setTimeout(this.setupPubSub.bind(this), 1);
          },
        },
      );
      await this.ipfs.getIPFS().pubsub.publish(IPFS_PUB_SUB_DA_VERIFICATION, new Uint8Array(0));
    } catch (err) {
      this.log.error("Failed during pubsub setup: " + err);
    }
  }

  public async start(): Promise<void> {
    await this.setupPubSub();
  }

  public async checkTxnBundleDA(
    txnBundle: TransactionBundle,
    blockRandProof: Uint8Array,
    committee: Account[],
  ): Promise<TransactionBundleDACheckResult> {
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

    // Query DA committee.
    // This fills DA state, which has to be resetted after.
    await this.execDARequest(txnBundle, blockRandProof, committee, requestClaims);

    // Sanity check of number of received responses.
    const responseCount = Object.keys(this.process.results).length;
    if (responseCount < this.process.commitee.length) {
      // Reset DA state to stop request broadcast.
      this.resetDACheckProcess();
      // That means coding error in message processing or callbacks.
      throw new Error("Number of unique DA verification responses is less then size of DA committee");
    } else if (responseCount > this.process.commitee.length) {
      // Reset DA state to stop request broadcast.
      this.resetDACheckProcess();
      // That means coding error in message processing callback.
      throw new Error("Number of unique DA verification responses is greater then size of DA committee");
    }

    // We expect DA checkers to reach full consensus on data availability.
    // Hence we can consider to one of responses to carry "final result".
    const result: TransactionBundleDACheckResult = {
      responses: Object.values(this.process.results),
      aggSignature: new Uint8Array(),
      acceptedTxns: [],
      rejectedTxns: [],
    };
    const claimResults = result.responses[0].claims;

    // Check of aggregated signature of received DA verification responses.
    // For now this also ensures that DA checkers have reached consensus.
    const responseSigners = result.responses.map((response) => response.signer);
    const [validAggSig, aggSig] = await verifyDACheckResultsAggergatedSignature(
      this.process.txnBundleHash,
      this.process.randomnessProof,
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
      this.resetDACheckProcess();

      return result;
    }

    // Collect "DA votes" for every claim.
    const claimDA: Record<string, boolean[]> = {};
    for (const claim of this.process.claims) {
      const claimHash = hashComputeClaim(claim);
      claimDA[bytesToHex(claimHash)] = [];
    }
    for (const result of Object.values(this.process.results)) {
      for (const claimResult of result.claims) {
        claimDA[bytesToHex(claimResult.claimHash)].push(claimResult.dataAvailable);
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
    this.resetDACheckProcess();

    return result;
  }

  private async execDARequest(
    txnBunde: TransactionBundle,
    blockRandProof: Uint8Array,
    committee: Account[],
    claims: ComputeClaim[],
  ): Promise<void> {
    // Setup essentials.
    this.process.txnBundleHash = hashTransactionBundle(txnBunde);
    this.process.claims = claims;
    this.process.randomnessProof = blockRandProof;

    // Setup DA committee sample.
    this.process.commitee = committee;

    // Clear responses for previous transaction bundle.
    this.process.results = {};

    // Need to wait until all DA verification responses.
    // request are received (or timeout occurs).
    const dasProgress = new Promise<void>((resolve, reject) => {
      this.process.resolve = resolve;
      this.process.reject = reject;
    });

    this.setupDASRequestTimeout(this.process.txnBundleHash);
    this.broadcastDASRequest(this.process.txnBundleHash);

    await dasProgress;
  }

  private setupDASRequestTimeout(txnBundleHash: Uint8Array): void {
    setTimeout(() => {
      // Next transaction bundle is already being processed.
      if (!bytesEqual(txnBundleHash, this.process.txnBundleHash)) {
        return;
      }
      // Current transaction bundle haven't received enough responses.
      const responseCount = Object.keys(this.process.results).length;
      if (responseCount < this.process.commitee.length) {
        this.log.info(`did not receive enough responses for ${bytesToHex(txnBundleHash)}`);
        this.process.reject(
          new Error("DA verification timeout - no response for " + this.config.RequestTimeout + "ms"),
        );
        this.resetDACheckProcess();
        return;
      }
    }, this.config.RequestTimeout);
  }

  private async broadcastDASRequest(txnBundleHash: Uint8Array) {
    this.log.info(`starting broadcast of DA verification request for transaction bundle ${bytesToHex(txnBundleHash)}`);

    while (true) {
      if (!bytesEqual(txnBundleHash, this.process.txnBundleHash)) {
        this.log.info(
          `stopping broadcast of DA verification request for transaction bundle ${bytesToHex(txnBundleHash)}`,
        );
        return;
      }

      // Send reqeust via IPFS pub-sub.
      this.log.info(`publishing DA verification request for transaction bundle ${bytesToHex(txnBundleHash)}`);
      const request = new DAVerificationRequest()
        .setTxnBundleHash(this.process.txnBundleHash)
        .setClaimsList(this.process.claims.map(computeClaimToPB))
        .setRandomnessProof(this.process.randomnessProof);
      const msg = new P2PPubSubMessage().setDaVerificationRequest(request);
      this.ipfs.getIPFS().pubsub.publish(IPFS_PUB_SUB_DA_VERIFICATION, msg.serializeBinary());

      await new Promise((resolve, _) => {
        setTimeout(resolve, this.config.RequestBroadcastPeriod);
      });
    }
  }

  private resetDACheckProcess(): void {
    this.process.txnBundleHash = new Uint8Array();
    this.process.claims = [];
    this.process.randomnessProof = new Uint8Array();
    this.process.commitee = [];
    this.process.results = {};
    this.process.resolve = undefined;
    this.process.reject = undefined;
  }

  private async handlePubSubMessage(msg: IPFSPubSubMessage): Promise<void> {
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

      const protoMsg = P2PPubSubMessage.deserializeBinary(msg.data);
      if (protoMsg.hasDaVerificationResponse()) {
        await this.handleDAVerificationResponse(protoMsg.getDaVerificationResponse() as DAVerificationResponse);
      }
    } catch (err: any) {
      this.log.error(err.toString() + " " + err.stack);
    }
  }

  private async handleDAVerificationResponse(response: DAVerificationResponse): Promise<void> {
    this.log.info(`received DA verification response - ${stringifyDAVerificationResponse(response)}`);

    // Check signature of response.
    const result = daCheckResultFromPB(response.getResult() as PBDACheckResult);
    if (
      !(await verifyDACheckResultSignature(
        result.txnBundleHash,
        result.randomnessProof,
        result.claims,
        result.signature,
        result.signer,
      ))
    ) {
      this.log.error("DA check result signature is invalid");
      return;
    }

    // Check that response is for current transaction bundle (check txnBundleHash)
    // TODO: should we check randomness proof here as well?
    if (!bytesEqual(result.txnBundleHash, this.process.txnBundleHash)) {
      this.log.error("DA verification request transaction bundle hash does not match");
      return;
    }

    // Check if sender is part of committee.
    const inCommittee = this.process.commitee.find((s) => bytesEqual(s.address, result.signer));
    if (!inCommittee) {
      this.log.error("DA verification response signer does not belong to current DA committee sample");
      return;
    }

    // Check if member already sent response.
    const signerAddrHex = bytesToHex(result.signer);
    if (this.process.results[signerAddrHex] != undefined) {
      this.log.error("DA committee member already sent response for current transaction bundle");
      return;
    }
    this.process.results[signerAddrHex] = result;

    // If not enough responses received wait for more responses.
    const responseCount = Object.keys(this.process.results).length;
    if (responseCount < this.process.commitee.length) {
      return;
    }
    this.log.info("Received all responses for DA check");
    // Notify, that all respones have been received.
    this.process.resolve();
  }
}
