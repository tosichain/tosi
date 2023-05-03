import { bls12_381 as BLS } from "@noble/curves/bls12-381";
import { CID } from "ipfs-http-client";

import { IPFS } from "../../node/ipfs";
import {
  ComputeClaim,
  ClaimStateCheckResult,
  StateCheckResult,
  StakeType,
  ClaimDataRef,
  DrandBeaconInfo,
} from "../../blockchain/types";
import { computeClaimFromPB, stateCheckResultToPB } from "../../blockchain/serde";
import { signStateCheckResult } from "../../blockchain/block_proof";
import { getSeedFromBlockRandomnessProof, verifyBlockRandomnessProof } from "../../blockchain/block_randomness";
import { getVerificationCommitteeSample } from "../../blockchain/block_commitee";
import { BlockchainStorage } from "../../blockchain/storage";
import { bytesEqual, bytesFromHex, hashComputeClaim } from "../../blockchain/util";
import { IPFS_PUB_SUB_STATE_VERIFICATION } from "../../p2p/constant";
import { IPFSPubSubMessage } from "../../p2p/types";
import {
  keepConnectedToSwarm,
  logPubSubMessage,
  logStateVerificationRequest,
  logStateVerificationResponse,
} from "../../p2p/util";
import { execTask } from "./util";
import { P2PPubSubMessage, StateVerificationRequest, StateVerificationResponse } from "../../proto/grpcjs/p2p_pb";
import Logger from "../../log/logger";
import { currentUnixTime } from "../../util";

const LOG_VERIFIER = "state-verifier";
const LOG_NETWORK = [LOG_VERIFIER, "network"];

export interface StateVerifierConfig {
  stateCheckTimeout: number;
}

export class StateVerifier {
  private readonly blsSecKey: Uint8Array;
  private readonly blsPubKey: Uint8Array;

  private readonly coordinatorPubKey: Uint8Array;

  private readonly stateCommitteeSampleSize: number;

  private readonly config: StateVerifierConfig;
  private readonly log: Logger;

  private readonly ipfs: IPFS;
  private readonly drandBeaconInfo: DrandBeaconInfo;

  // TODO: Is allowed only to read from blockahin storage (seprate interface?);
  private readonly blockchain: BlockchainStorage;

  constructor(
    blsSecKey: Uint8Array,
    cooridnatorPubKey: Uint8Array,
    stateCommitteeSampleSize: number,
    config: StateVerifierConfig,
    log: Logger,
    ipfs: IPFS,
    blockchain: BlockchainStorage,
    drandBeaconInfo: DrandBeaconInfo,
  ) {
    this.blsSecKey = blsSecKey;
    this.blsPubKey = BLS.getPublicKey(this.blsSecKey);

    this.coordinatorPubKey = cooridnatorPubKey;

    this.stateCommitteeSampleSize = stateCommitteeSampleSize;

    this.config = config;

    this.log = log;

    this.ipfs = ipfs;

    this.blockchain = blockchain;
    this.drandBeaconInfo = drandBeaconInfo;
  }

  private async setupPubSub() {
    try {
      await this.ipfs.getIPFSforPubSub().pubsub.subscribe(
        IPFS_PUB_SUB_STATE_VERIFICATION,
        (msg: IPFSPubSubMessage) => {
          this.handlePubSubMessage(msg);
        },
        {
          onError: (err) => {
            this.log.error("error in state pubsub, reconnecting", err, LOG_NETWORK);
            setTimeout(this.setupPubSub.bind(this), 1);
          },
        },
      );
      await this.ipfs.getIPFS().pubsub.publish(IPFS_PUB_SUB_STATE_VERIFICATION, new Uint8Array(0));
    } catch (err: any) {
      this.log.error("failed to setup pubsub", err, LOG_NETWORK);
    }
  }

  public async start(): Promise<void> {
    await this.setupPubSub();
    await keepConnectedToSwarm(IPFS_PUB_SUB_STATE_VERIFICATION, this.ipfs, this.log, 10000);
  }

  private async handlePubSubMessage(msg: IPFSPubSubMessage) {
    try {
      this.log.info("received IPFS pubsub message", LOG_NETWORK, { message: logPubSubMessage(msg) });

      // Ignore our own messages.
      if (msg.from == this.ipfs.id) {
        this.log.debug("ignoring message from myself", LOG_NETWORK);
        return;
      }
      // Ignore pings.
      if (msg.data.length == 0) {
        this.log.debug("ignoring ping message", LOG_NETWORK);
        return;
      }

      const protoMsg = P2PPubSubMessage.deserializeBinary(msg.data);
      if (protoMsg.hasStateVerificationRequest()) {
        await this.handleStateVerificationRequest(protoMsg.getStateVerificationRequest() as StateVerificationRequest);
      }
    } catch (err: any) {
      this.log.error(err.stack, err, LOG_NETWORK);
    }
  }

  async handleStateVerificationRequest(req: StateVerificationRequest): Promise<void> {
    this.log.info("received state verification request", LOG_NETWORK, {
      request: logStateVerificationRequest(req),
    });

    if (!(await this.acceptStateVerificationRequest(req))) {
      return;
    }

    // Check all claims concurrently.
    const claimStateChecks = req.getClaimsList().map((claim) => {
      return this.checkClaimState(computeClaimFromPB(claim));
    });
    const claimStateCheckResults = await Promise.all(claimStateChecks);

    // Generate and publish State check response message.
    const result: StateCheckResult = {
      txnBundleHash: req.getTxnBundleHash() as Uint8Array,
      randomnessProof: req.getRandomnessProof() as Uint8Array,
      signature: new Uint8Array(),
      signer: this.blsPubKey,
      claims: claimStateCheckResults,
    };
    const signedResult = await signStateCheckResult(result, this.blsSecKey);

    const response = new StateVerificationResponse().setResult(stateCheckResultToPB(signedResult));
    this.log.info("publishing state verification response", LOG_NETWORK, {
      response: logStateVerificationResponse(response),
    });
    const msg = new P2PPubSubMessage().setStateVerificationResponse(response);
    await this.ipfs.getIPFS().pubsub.publish(IPFS_PUB_SUB_STATE_VERIFICATION, msg.serializeBinary());
  }

  private async acceptStateVerificationRequest(stateReq: StateVerificationRequest): Promise<boolean> {
    // Validate randomness proof (includes verifying coordinator's signature).
    if (
      !verifyBlockRandomnessProof(
        stateReq.getTxnBundleHash_asU8(),
        this.coordinatorPubKey,
        stateReq.getRandomnessProof_asU8(),
        this.drandBeaconInfo,
        currentUnixTime(),
      )
    ) {
      this.log.info("can not process state verification request", LOG_VERIFIER, { reason: "invalid randomness proof" });
      return false;
    }
    // Check if no is in current State commitee sample and is expected to process request.
    const randSeed = getSeedFromBlockRandomnessProof(stateReq.getRandomnessProof() as Uint8Array);
    const committee = await getVerificationCommitteeSample(
      this.blockchain,
      StakeType.StateVerifier,
      this.stateCommitteeSampleSize,
      randSeed,
    );

    const inCommittee = committee.find((s) => bytesEqual(s.address, this.blsPubKey)) != undefined;
    if (!inCommittee) {
      this.log.info("can not process state verification request", LOG_VERIFIER, {
        reason: "not in current State committee sample",
      });
      return false;
    }

    return true;
  }

  private async checkClaimState(claim: ComputeClaim): Promise<ClaimStateCheckResult> {
    const claimHash = hashComputeClaim(claim);
    this.log.info("checking claim state", LOG_VERIFIER, { claim: claim, claimHash: claimHash });

    // XXX Debug
    if (claim.outputFileHash.length != 32) {
      throw new Error("invalid hash of output file");
    }

    // TODO: this check is actually redundant, but we, probably, need to query previous claim in future.
    // For non-root claim previous claim must exist in local storage.

    const prevClaim =
      claim.prevClaimHash.length != 0 ? await this.blockchain.getComputeClaim(claim.prevClaimHash) : null;

    if (!prevClaim && claim.prevClaimHash.length != 0) {
      throw new Error(`previous claim ${claim.prevClaimHash} does not exist`);
    }

    const EMPTY_OUTPUT_DATA_REF = {
      cid: CID.parse("bafybeiczsscdsbs7ffqz55asqdf3smv6klcw3gofszvwlyarci47bgf354"),
      size: 100,
      cartesiMerkleRoot: bytesFromHex("de611e620dee2c51aec860dbcab29b08a7fe80686bf02c5a1f19ac0c2ff3fe0a"), // tree log size 31 / 2gb
    } as ClaimDataRef;

    // start checks in parallel
    const prevClaimOutputCID = !prevClaim ? EMPTY_OUTPUT_DATA_REF.cid : prevClaim.output.cid;
    try {
      const before = currentUnixTime();
      const result = await execTask(this.ipfs, this.log, claim.dataContract.cid, prevClaimOutputCID, claim.input.cid);
      if (
        result.output &&
        result.output.outputCID &&
        result.output.outputCID == claim.output.cid.toString() &&
        result.output.outputFileHash == Buffer.from(claim.outputFileHash).toString("hex")
      ) {
        const after = currentUnixTime();
        this.log.info("claim successfully passed state state check", LOG_VERIFIER, {
          timeElapsed: after - before,
          claimHash: claimHash,
        });
        return { claimHash: claimHash, stateCorrect: true };
      } else {
        this.log.info("claim state check failed", LOG_VERIFIER, {
          claimHash: claimHash,
          outputFileHash: claim.outputFileHash,
          actualOutput: result.output,
          claimOutputCID: claim.output.cid,
        });
        return { claimHash: claimHash, stateCorrect: false };
      }
    } catch (err: any) {
      this.log.error("failed to compute claim state", err, LOG_VERIFIER);
      return { claimHash: claimHash, stateCorrect: false };
    }
  }
}
