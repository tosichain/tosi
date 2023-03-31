import winston from "winston";
import * as BLS from "@noble/bls12-381";
import { CID } from "ipfs-http-client";

import { IPFS } from "../../node/ipfs";
import { encodeCBOR, decodeCBOR, currentUnixTime } from "../../util";

import {
  DAInfo,
  ComputeClaim,
  ClaimDACheckResult,
  DACheckResult,
  StakeType,
  ClaimDataRef,
} from "../../blockchain/types";
import { signDACheckResult } from "../../blockchain/block_proof";
import { getSeedFromBlockRandomnessProof } from "../../blockchain/block_randomness";
import { getVerificationCommitteeSample } from "../../blockchain/block_commitee";
import { BlockchainStorage } from "../../blockchain/storage";
import { hashComputeClaim, stringifyAccounts, stringifyComputeClaim } from "../../blockchain/util";
import {
  IPFS_PUB_SUB_DA_VERIFICATION,
  IPFS_MESSAGE_DA_VERIFICATION_REQUEST,
  IPFS_MESSAGE_DA_VERIFICATION_RESPONSE,
} from "../../p2p/constant";
import { IPFSPubSubMessage, DAVerificationRequestMessage, DAVerificationResponseMessage } from "../../p2p/types";
import {
  stringifyPubSubMessage,
  stringifyDAVerificationRequest,
  stringifyDAVerificationResponse,
} from "../../p2p/util";
import { createDAInfo, execTask, prepopulate } from "./util";

export interface DAVerifierConfig {
  DACheckTimeout: number;
}

export class DAVerifier {
  private readonly blsSecKey: string;
  private readonly blsPubKey: string;

  private readonly coordinatorPubKey: string;

  private readonly daCommitteeSampleSize: number;

  private readonly config: DAVerifierConfig;
  private readonly log: winston.Logger;

  private readonly ipfs: IPFS;

  // TODO: Is allowed only to read from blockahin storage (seprate interface?);
  private readonly blockchain: BlockchainStorage;

  private daInfoCache: Record<string, DAInfo> = {};

  constructor(
    blsSecKey: string,
    cooridnatorPubKey: string,
    daCommitteeSampleSize: number,
    config: DAVerifierConfig,
    log: winston.Logger,
    ipfs: IPFS,
    blockchain: BlockchainStorage,
  ) {
    this.blsSecKey = blsSecKey;
    this.blsPubKey = Buffer.from(BLS.getPublicKey(this.blsSecKey)).toString("hex");

    this.coordinatorPubKey = cooridnatorPubKey;

    this.daCommitteeSampleSize = daCommitteeSampleSize;

    this.config = config;

    this.log = log;

    this.ipfs = ipfs;

    this.blockchain = blockchain;
  }

  public async start(): Promise<void> {
    await this.ipfs.getIPFS().pubsub.subscribe(IPFS_PUB_SUB_DA_VERIFICATION, (msg: IPFSPubSubMessage) => {
      this.handlePubSubMessage(msg);
    });
    await prepopulate(this.ipfs, this.log);
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

      const decoded = decodeCBOR(msg.data);
      if (decoded && decoded.code && decoded.code === IPFS_MESSAGE_DA_VERIFICATION_RESPONSE) {
        this.log.info(`ignoring DA verification response message`);
      } else if (decoded && decoded.code && decoded.code == IPFS_MESSAGE_DA_VERIFICATION_REQUEST) {
        await this.handleDAVerificationRequest(decoded as DAVerificationRequestMessage);
      } else {
        this.log.warn(`ignoring decoded message with unknown code`);
      }
    } catch (err: any) {
      this.log.error(err.toString() + " " + err.stack);
    }
  }

  async handleDAVerificationRequest(req: DAVerificationRequestMessage): Promise<void> {
    this.log.info(`received DA verification request - ${stringifyDAVerificationRequest(req)}`);

    if (!(await this.acceptDAVerificationRequest(req))) {
      return;
    }

    // Check data availability of each claim.
    const claimDAChecks = req.claims.map((claim) => this.checkClaimDA(claim));
    const claimDACheckResults = await Promise.all(claimDAChecks);

    // Generate and publish DA check response message.
    const result: DACheckResult = {
      txnBundleHash: req.txnBundleHash,
      randomnessProof: req.randomnessProof,
      signature: new Uint8Array(),
      signer: this.blsPubKey,
      claims: claimDACheckResults,
    };
    const response: DAVerificationResponseMessage = {
      code: IPFS_MESSAGE_DA_VERIFICATION_RESPONSE,
      result: await signDACheckResult(result, this.blsSecKey),
    };

    this.log.info(`publishing DA verification response - ${stringifyDAVerificationResponse(response)}`);
    await this.ipfs.getIPFS().pubsub.publish(IPFS_PUB_SUB_DA_VERIFICATION, encodeCBOR(response));
  }

  private async acceptDAVerificationRequest(daReq: DAVerificationRequestMessage): Promise<boolean> {
    // Validate randomness proof (includes verifying coordinator's signature).
    // Check if no is in current DA commitee sample and is expected to process request.
    const randSeed = getSeedFromBlockRandomnessProof(daReq.randomnessProof);
    const committee = await getVerificationCommitteeSample(
      this.blockchain,
      StakeType.DAVerifier,
      this.daCommitteeSampleSize,
      randSeed,
    );

    const inCommittee = committee.find((s) => s.address == this.blsPubKey) != undefined;
    if (!inCommittee) {
      this.log.info("can not process DA verification request - not in current DA committee sample");
      return false;
    }

    return true;
  }

  private async checkClaimDA(claim: ComputeClaim): Promise<ClaimDACheckResult> {
    const claimHash = hashComputeClaim(claim);
    this.log.info(`checking DA for claim ${claimHash} - ${stringifyComputeClaim(claim)}`);

    // TODO: this check is actually redundant, but we, probably, need to query previous claim in future.
    // For non-root claim previous claim must exist in local storage.

    const prevClaim = claim.prevClaimHash != "" ? await this.blockchain.getComputeClaim(claim.prevClaimHash) : null;

    if (!prevClaim && claim.prevClaimHash != "") {
      throw new Error(`previous claim ${claim.prevClaimHash} does not exist`);
    }

    const EMPTY_OUTPUT_DATA_REF = {
      cid: "bafybeiczsscdsbs7ffqz55asqdf3smv6klcw3gofszvwlyarci47bgf354",
      size: 100,
      cartesiMerkleRoot: "de611e620dee2c51aec860dbcab29b08a7fe80686bf02c5a1f19ac0c2ff3fe0a", // tree log size 31 / 2gb
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
      return d.cartesiMerkleRoot == c.cartesiMerkleRoot && d.size == c.size;
    }

    if (!functionInfo || !compareDAInfo(functionInfo, claim.dataContract)) {
      this.log.error(
        `function data for claim ${claimHash} doesn't match - ${JSON.stringify(functionInfo)} ${JSON.stringify(
          claim.dataContract,
        )}`,
      );
      return { claimHash: claimHash, dataAvailable: false };
    }

    if (!prevOutputInfo || !compareDAInfo(prevOutputInfo, prevClaimDataRef)) {
      this.log.error(`prev output info data for claim ${claimHash} doesn't match`);
      return { claimHash: claimHash, dataAvailable: false };
    }

    if (!inputInfo || !compareDAInfo(inputInfo, claim.input)) {
      this.log.error(`input info data for claim ${claimHash} doesn't match`);
      return { claimHash: claimHash, dataAvailable: false };
    }

    if (!outputInfo || !compareDAInfo(outputInfo, claim.output)) {
      this.log.error(`output info data for claim ${claimHash} doesn't match`);
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
