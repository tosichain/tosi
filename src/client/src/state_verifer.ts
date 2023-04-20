import winston from "winston";
import * as BLS from "@noble/bls12-381";
import { CID } from "ipfs-http-client";

import { IPFS } from "../../node/ipfs";
import { encodeCBOR, decodeCBOR } from "../../util";
import { ComputeClaim, ClaimStateCheckResult, StateCheckResult, StakeType, ClaimDataRef } from "../../blockchain/types";
import { signStateCheckResult } from "../../blockchain/block_proof";
import { getSeedFromBlockRandomnessProof } from "../../blockchain/block_randomness";
import { getVerificationCommitteeSample } from "../../blockchain/block_commitee";
import { BlockchainStorage } from "../../blockchain/storage";
import { bytesEqual, bytesToHex, bytesFromHex, hashComputeClaim, stringifyComputeClaim } from "../../blockchain/util";
import {
  IPFS_PUB_SUB_STATE_VERIFICATION,
  IPFS_MESSAGE_STATE_VERIFICATION_REQUEST,
  IPFS_MESSAGE_STATE_VERIFICATION_RESPONSE,
} from "../../p2p/constant";
import { IPFSPubSubMessage, StateVerificationRequestMessage, StateVerificationResponseMessage } from "../../p2p/types";
import {
  stringifyPubSubMessage,
  stringifyStateVerificationRequest,
  stringifyStateVerificationResponse,
} from "../../p2p/util";
import { execTask } from "./util";

export interface StateVerifierConfig {
  stateCheckTimeout: number;
}

export class StateVerifier {
  private readonly blsSecKey: Uint8Array;
  private readonly blsPubKey: Uint8Array;

  private readonly coordinatorPubKey: Uint8Array;

  private readonly stateCommitteeSampleSize: number;

  private readonly config: StateVerifierConfig;
  private readonly log: winston.Logger;

  private readonly ipfs: IPFS;

  // TODO: Is allowed only to read from blockahin storage (seprate interface?);
  private readonly blockchain: BlockchainStorage;

  constructor(
    blsSecKey: Uint8Array,
    cooridnatorPubKey: Uint8Array,
    stateCommitteeSampleSize: number,
    config: StateVerifierConfig,
    log: winston.Logger,
    ipfs: IPFS,
    blockchain: BlockchainStorage,
  ) {
    this.blsSecKey = blsSecKey;
    this.blsPubKey = BLS.getPublicKey(this.blsSecKey);

    this.coordinatorPubKey = cooridnatorPubKey;

    this.stateCommitteeSampleSize = stateCommitteeSampleSize;

    this.config = config;

    this.log = log;

    this.ipfs = ipfs;

    this.blockchain = blockchain;
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
  }


  private async handlePubSubMessage(msg: IPFSPubSubMessage) {
    try {
      this.log.info("state: received IPFS pubsub message " + stringifyPubSubMessage(msg));

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
      if (decoded && decoded.code && decoded.code == IPFS_MESSAGE_STATE_VERIFICATION_RESPONSE) {
        this.log.info(`ignoring state verification response message`);
      } else if (decoded && decoded.code && decoded.code == IPFS_MESSAGE_STATE_VERIFICATION_REQUEST) {
        await this.handleStateVerificationRequest(decoded as StateVerificationRequestMessage);
      } else {
        this.log.warn(`ignoring decoded message with unknown code`);
      }
    } catch (err: any) {
      this.log.error(err.toString() + " " + err.stack);
    }
  }

  async handleStateVerificationRequest(req: StateVerificationRequestMessage): Promise<void> {
    this.log.info(`received State verification request - ${stringifyStateVerificationRequest(req)}`);

    if (!(await this.acceptStateVerificationRequest(req))) {
      return;
    }

    // Check data availability of each claim.
    const claimStateChecks = req.claims.map((claim) => this.checkClaimState(claim));
    const claimStateCheckResults = await Promise.all(claimStateChecks);

    // Generate and publish State check response message.
    const result: StateCheckResult = {
      txnBundleHash: req.txnBundleHash,
      randomnessProof: req.randomnessProof,
      signature: new Uint8Array(),
      signer: this.blsPubKey,
      claims: claimStateCheckResults,
    };
    const response: StateVerificationResponseMessage = {
      code: IPFS_MESSAGE_STATE_VERIFICATION_RESPONSE,
      result: await signStateCheckResult(result, this.blsSecKey),
    };

    this.log.info(`publishing State verification response - ${stringifyStateVerificationResponse(response)}`);
    await this.ipfs.getIPFS().pubsub.publish(IPFS_PUB_SUB_STATE_VERIFICATION, encodeCBOR(response));
  }

  private async acceptStateVerificationRequest(stateReq: StateVerificationRequestMessage): Promise<boolean> {
    // Validate randomness proof (includes verifying coordinator's signature).
    // Check if no is in current State commitee sample and is expected to process request.
    const randSeed = getSeedFromBlockRandomnessProof(stateReq.randomnessProof);
    const committee = await getVerificationCommitteeSample(
      this.blockchain,
      StakeType.StateVerifier,
      this.stateCommitteeSampleSize,
      randSeed,
    );

    const inCommittee = committee.find((s) => bytesEqual(s.address, this.blsPubKey)) != undefined;
    if (!inCommittee) {
      this.log.info("can not process State verification request - not in current State committee sample");
      return false;
    }

    return true;
  }

  private async checkClaimState(claim: ComputeClaim): Promise<ClaimStateCheckResult> {
    const claimHash = hashComputeClaim(claim);
    this.log.info(`checking State for claim ${bytesToHex(claimHash)} - ${stringifyComputeClaim(claim)}`);

    // TODO: this check is actually redundant, but we, probably, need to query previous claim in future.
    // For non-root claim previous claim must exist in local storage.

    const prevClaim =
      claim.prevClaimHash.length != 0 ? await this.blockchain.getComputeClaim(claim.prevClaimHash) : null;

    if (!prevClaim && claim.prevClaimHash.length != 0) {
      throw new Error(`previous claim ${claim.prevClaimHash} does not exist`);
    }

    const EMPTY_OUTPUT_DATA_REF = {
      cid: "bafybeiczsscdsbs7ffqz55asqdf3smv6klcw3gofszvwlyarci47bgf354",
      size: 100,
      cartesiMerkleRoot: bytesFromHex("de611e620dee2c51aec860dbcab29b08a7fe80686bf02c5a1f19ac0c2ff3fe0a"), // tree log size 31 / 2gb
    } as ClaimDataRef;

    // start checks in parallel
    const prevClaimOutputCID = !prevClaim ? EMPTY_OUTPUT_DATA_REF.cid : prevClaim.output.cid;
    try {
      const result = await execTask(
        this.ipfs,
        this.log,
        CID.parse(claim.dataContract.cid),
        CID.parse(prevClaimOutputCID),
        CID.parse(claim.input.cid),
      );
      if (result.output && result.output.outputCID && result.output.outputCID == claim.output.cid) {
        this.log.info(`all good, returning claim ${bytesToHex(claimHash)} with checking compute`);
        return { claimHash: claimHash, stateCorrect: true };
      } else {
        this.log.error(`compute check for claim ${bytesToHex(claimHash)} doesn't match`);
        return { claimHash: claimHash, stateCorrect: false };
      }
    } catch (err) {
      this.log.error("Failed executing computation: " + err);
      return { claimHash: claimHash, stateCorrect: false };
    }
  }
}
