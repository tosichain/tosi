import * as BLS from "@noble/bls12-381";
import { CID } from "ipfs-http-client";

import { IPFS } from "../../node/ipfs";

import {
  DAInfo,
  ComputeClaim,
  ClaimDACheckResult,
  DACheckResult,
  StakeType,
  ClaimDataRef,
} from "../../blockchain/types";
import { computeClaimFromPB, daCheckResultToPB } from "../../blockchain/serde";
import { signDACheckResult } from "../../blockchain/block_proof";
import { getSeedFromBlockRandomnessProof } from "../../blockchain/block_randomness";
import { getVerificationCommitteeSample } from "../../blockchain/block_commitee";
import { BlockchainStorage } from "../../blockchain/storage";
import { bytesEqual, bytesToHex, bytesFromHex, hashComputeClaim, stringifyComputeClaim } from "../../blockchain/util";
import { IPFS_PUB_SUB_DA_VERIFICATION } from "../../p2p/constant";
import { IPFSPubSubMessage } from "../../p2p/types";
import {
  stringifyPubSubMessage,
  stringifyDAVerificationRequest,
  stringifyDAVerificationResponse,
} from "../../p2p/util";
import { createDAInfo } from "./util";
import { P2PPubSubMessage, DAVerificationRequest, DAVerificationResponse } from "../../proto/grpcjs/p2p_pb";
import Logger from "../../log/logger";

export interface DAVerifierConfig {
  DACheckTimeout: number;
}

export class DAVerifier {
  private readonly blsSecKey: Uint8Array;
  private readonly blsPubKey: Uint8Array;

  private readonly coordinatorPubKey: Uint8Array;

  private readonly daCommitteeSampleSize: number;

  private readonly config: DAVerifierConfig;
  private readonly log: Logger;

  private readonly ipfs: IPFS;

  // TODO: Is allowed only to read from blockahin storage (seprate interface?);
  private readonly blockchain: BlockchainStorage;

  private daInfoCache: Record<string, DAInfo> = {};

  constructor(
    blsSecKey: Uint8Array,
    cooridnatorPubKey: Uint8Array,
    daCommitteeSampleSize: number,
    config: DAVerifierConfig,
    log: Logger,
    ipfs: IPFS,
    blockchain: BlockchainStorage,
  ) {
    this.blsSecKey = blsSecKey;
    this.blsPubKey = Buffer.from(BLS.getPublicKey(this.blsSecKey));

    this.coordinatorPubKey = cooridnatorPubKey;

    this.daCommitteeSampleSize = daCommitteeSampleSize;

    this.config = config;

    this.log = log;

    this.ipfs = ipfs;

    this.blockchain = blockchain;
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

  private async handlePubSubMessage(msg: IPFSPubSubMessage) {
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
      if (protoMsg.hasDaVerificationRequest()) {
        await this.handleDAVerificationRequest(protoMsg.getDaVerificationRequest() as DAVerificationRequest);
      }
    } catch (err: any) {
      this.log.error(err.toString() + " " + err.stack);
    }
  }

  async handleDAVerificationRequest(req: DAVerificationRequest): Promise<void> {
    this.log.info(`received DA verification request - ${stringifyDAVerificationRequest(req)}`);

    if (!(await this.acceptDAVerificationRequest(req))) {
      return;
    }

    // Check data availability of each claim.
    const claimDAChecks = req.getClaimsList().map((claim) => {
      return this.checkClaimDA(computeClaimFromPB(claim));
    });
    const claimDACheckResults = await Promise.all(claimDAChecks);

    // Generate and publish DA check response message.
    const result: DACheckResult = {
      txnBundleHash: req.getTxnBundleHash() as Uint8Array,
      randomnessProof: req.getRandomnessProof() as Uint8Array,
      signature: new Uint8Array(),
      signer: this.blsPubKey,
      claims: claimDACheckResults,
    };
    const signedResult = await signDACheckResult(result, this.blsSecKey);

    const response = new DAVerificationResponse().setResult(daCheckResultToPB(signedResult));
    this.log.info(`publishing DA verification response - ${stringifyDAVerificationResponse(response)}`);
    const msg = new P2PPubSubMessage().setDaVerificationResponse(response);
    await this.ipfs.getIPFS().pubsub.publish(IPFS_PUB_SUB_DA_VERIFICATION, msg.serializeBinary());
  }

  private async acceptDAVerificationRequest(daReq: DAVerificationRequest): Promise<boolean> {
    // Validate randomness proof (includes verifying coordinator's signature).
    // Check if no is in current DA commitee sample and is expected to process request.
    const randSeed = getSeedFromBlockRandomnessProof(daReq.getRandomnessProof() as Uint8Array);
    const committee = await getVerificationCommitteeSample(
      this.blockchain,
      StakeType.DAVerifier,
      this.daCommitteeSampleSize,
      randSeed,
    );

    const inCommittee = committee.find((s) => bytesEqual(s.address, this.blsPubKey)) != undefined;
    if (!inCommittee) {
      this.log.info("can not process DA verification request - not in current DA committee sample");
      return false;
    }

    return true;
  }

  private async checkClaimDA(claim: ComputeClaim): Promise<ClaimDACheckResult> {
    const claimHash = hashComputeClaim(claim);
    this.log.info(`checking DA for claim ${bytesToHex(claimHash)} - ${stringifyComputeClaim(claim)}`);

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
    const prevClaimDataRef = prevClaim ? prevClaim.output : EMPTY_OUTPUT_DATA_REF;
    const prevClaimOutputCID = !prevClaim ? EMPTY_OUTPUT_DATA_REF.cid : prevClaim.output.cid;
    const functionDataPromise = this.fetchDAInfo(CID.parse(claim.dataContract.cid), false);
    const prevOutputDataPromise = this.fetchDAInfo(CID.parse(prevClaimOutputCID), true); // strictly speaking we don't really need to re-merkle this but double checking doesn't hurt
    const inputDataPromise = this.fetchDAInfo(CID.parse(claim.input.cid), true);
    const outputDataPromise = this.fetchDAInfo(CID.parse(claim.output.cid), true);

    // wait for them all to settle
    const functionInfo = await functionDataPromise;
    const prevOutputInfo = await prevOutputDataPromise;
    const inputInfo = await inputDataPromise;
    const outputInfo = await outputDataPromise;

    function compareDAInfo(d: DAInfo, c: ClaimDataRef) {
      return bytesEqual(d.cartesiMerkleRoot, c.cartesiMerkleRoot) && d.size == c.size;
    }

    if (!functionInfo || !compareDAInfo(functionInfo, claim.dataContract)) {
      this.log.error(
        `function data for claim ${bytesToHex(claimHash)} doesn't match - ${JSON.stringify(
          functionInfo,
        )} ${JSON.stringify(claim.dataContract)}`,
      );
      return { claimHash: claimHash, dataAvailable: false };
    }

    if (!prevOutputInfo || !compareDAInfo(prevOutputInfo, prevClaimDataRef)) {
      this.log.error(`prev output info data for claim ${bytesToHex(claimHash)} doesn't match`);
      return { claimHash: claimHash, dataAvailable: false };
    }

    if (!inputInfo || !compareDAInfo(inputInfo, claim.input)) {
      this.log.error(`input info data for claim ${bytesToHex(claimHash)} doesn't match`);
      return { claimHash: claimHash, dataAvailable: false };
    }

    if (!outputInfo || !compareDAInfo(outputInfo, claim.output)) {
      this.log.error(`output info data for claim ${bytesToHex(claimHash)} doesn't match`);
      return { claimHash: claimHash, dataAvailable: false };
    }
    return { claimHash: claimHash, dataAvailable: true };
  }

  private async fetchDAInfo(cid: CID, car: boolean): Promise<DAInfo | undefined> {
    this.log.info("FETCH DA INFO: " + cid.toString());
    const cachedDAInfo = this.daInfoCache[cid.toString() + ":" + car];
    if (cachedDAInfo != undefined) {
      this.log.info(`found DA info for CID ${cid.toString() + ":" + car} in cache`);
      return cachedDAInfo;
    }

    const daInfo = await createDAInfo(this.ipfs, this.log, cid.toString(), this.config.DACheckTimeout, car);
    if (!daInfo) {
      this.log.info(`error getting DA info for CID ${cid.toString()}`);
      return undefined;
    }
    this.log.info(`fetched DA info for CID ${cid.toString()} - ${JSON.stringify(daInfo)}`);
    this.daInfoCache[cid.toString() + ":" + car] = daInfo;
    this.log.info("local DA info cache updated");

    return daInfo;
  }
}
