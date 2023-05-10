import { bls12_381 as BLS } from "@noble/curves/bls12-381";
import { CID } from "ipfs-http-client";

import { IPFS } from "../../node/ipfs";

import {
  DAInfo,
  ComputeClaim,
  ClaimDACheckResult,
  DACheckResult,
  StakeType,
  ClaimDataRef,
  DrandBeaconInfo,
} from "../../blockchain/types";
import { computeClaimFromPB, daCheckResultToPB } from "../../blockchain/serde";
import { signDACheckResult } from "../../blockchain/block_proof";
import { getSeedFromBlockRandomnessProof, verifyBlockRandomnessProof } from "../../blockchain/block_randomness";
import { getVerificationCommitteeSample } from "../../blockchain/block_commitee";
import { BlockchainStorage } from "../../blockchain/storage";
import { bytesEqual, bytesFromHex, hashComputeClaim } from "../../blockchain/util";
import { IPFS_PUB_SUB_DA_VERIFICATION } from "../../p2p/constant";
import { IPFSPubSubMessage } from "../../p2p/types";
import {
  logPubSubMessage,
  logDAVerificationRequest,
  logDAVerificationResponse,
  keepConnectedToSwarm,
} from "../../p2p/util";
import { createDAInfo } from "./util";
import { P2PPubSubMessage, DAVerificationRequest, DAVerificationResponse } from "../../proto/grpcjs/p2p_pb";
import Logger from "../../log/logger";
import { currentUnixTime } from "../../util";

const LOG_VERIFIER = "da-verifier";
const LOG_NETWORK = [LOG_VERIFIER, "network"];

export interface DAVerifierConfig {
  DACheckTimeout: number;
}

export class DAVerifier {
  private readonly blsSecKey: Uint8Array;
  private readonly blsPubKey: Uint8Array;

  private readonly coordinatorPubKey: Uint8Array;

  private readonly config: DAVerifierConfig;
  private readonly log: Logger;

  private readonly ipfs: IPFS;
  private readonly drandBeaconInfo: DrandBeaconInfo;

  // TODO: Is allowed only to read from blockchain storage (separate interface?);
  private readonly blockchain: BlockchainStorage;

  private daInfoCache: Record<string, DAInfo> = {};

  constructor(
    blsSecKey: Uint8Array,
    coordinatorPubKey: Uint8Array,
    config: DAVerifierConfig,
    log: Logger,
    ipfs: IPFS,
    blockchain: BlockchainStorage,
    drandBeaconInfo: DrandBeaconInfo,
  ) {
    this.blsSecKey = blsSecKey;
    this.blsPubKey = Buffer.from(BLS.getPublicKey(this.blsSecKey));

    this.coordinatorPubKey = coordinatorPubKey;

    this.drandBeaconInfo = drandBeaconInfo;
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
          onError: (err) => {
            this.log.error("pubsub failed, reconnecting", err, LOG_NETWORK);
            setTimeout(this.setupPubSub.bind(this), 1);
          },
        },
      );
      await this.ipfs.getIPFS().pubsub.publish(IPFS_PUB_SUB_DA_VERIFICATION, new Uint8Array(0));
    } catch (err: any) {
      this.log.error("failed to setup pubsub", err, LOG_NETWORK);
    }
  }

  public async start(): Promise<void> {
    await this.setupPubSub();
    await keepConnectedToSwarm(IPFS_PUB_SUB_DA_VERIFICATION, this.ipfs, this.log, 10000);
  }

  private async handlePubSubMessage(msg: IPFSPubSubMessage) {
    try {
      this.log.info("received IPFS pubsub message", LOG_NETWORK, { message: logPubSubMessage(msg) });

      // Ignore our own messages.
      if (msg.from === this.ipfs.id) {
        this.log.debug("ignoring message from myself", LOG_NETWORK);
        return;
      }
      // Ignore pings.
      if (msg.data.length == 0) {
        this.log.debug("ignoring ping message", LOG_NETWORK);
        return;
      }

      const protoMsg = P2PPubSubMessage.deserializeBinary(msg.data);
      if (protoMsg.hasDaVerificationRequest()) {
        await this.handleDAVerificationRequest(protoMsg.getDaVerificationRequest() as DAVerificationRequest);
      }
    } catch (err: any) {
      this.log.error("failed to process pubsub message", err, LOG_NETWORK);
    }
  }

  async handleDAVerificationRequest(req: DAVerificationRequest): Promise<void> {
    this.log.info("received DA verification request", LOG_NETWORK, { request: logDAVerificationRequest(req) });

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
    this.log.info("publishing DA verification response", LOG_NETWORK, {
      response: logDAVerificationResponse(response),
    });
    const msg = new P2PPubSubMessage().setDaVerificationResponse(response);
    await this.ipfs.getIPFS().pubsub.publish(IPFS_PUB_SUB_DA_VERIFICATION, msg.serializeBinary());
  }

  private async acceptDAVerificationRequest(daReq: DAVerificationRequest): Promise<boolean> {
    // Validate randomness proof (includes verifying coordinator's signature).
    if (
      !verifyBlockRandomnessProof(
        daReq.getTxnBundleHash_asU8(),
        this.coordinatorPubKey,
        daReq.getRandomnessProof_asU8(),
        this.drandBeaconInfo,
        currentUnixTime(),
      )
    ) {
      this.log.info("can not process DA verification request", LOG_VERIFIER, { reason: "invalid randomness proof" });
      return false;
    }
    // Check if no is in current DA commitee sample and is expected to process request.
    const randSeed = getSeedFromBlockRandomnessProof(daReq.getRandomnessProof() as Uint8Array);
    const committee = await getVerificationCommitteeSample(this.blockchain, StakeType.DAVerifier, randSeed);

    const inCommittee = committee.find((s) => bytesEqual(s.address, this.blsPubKey)) != undefined;
    if (!inCommittee) {
      this.log.info("can not process DA verification request", LOG_VERIFIER, {
        reason: "not in current DA committee sample",
      });
      return false;
    }

    return true;
  }

  private async checkClaimDA(claim: ComputeClaim): Promise<ClaimDACheckResult> {
    const claimHash = hashComputeClaim(claim);
    this.log.info("checking DA for claim", LOG_VERIFIER, { claim: claim, claimHash: claimHash });

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
    const prevClaimDataRef = prevClaim ? prevClaim.output : EMPTY_OUTPUT_DATA_REF;
    const prevClaimOutputCID = !prevClaim ? EMPTY_OUTPUT_DATA_REF.cid : prevClaim.output.cid;
    const functionDataPromise = this.fetchDAInfo(claim.dataContract.cid, false);
    const prevOutputDataPromise = this.fetchDAInfo(prevClaimOutputCID, true); // strictly speaking we don't really need to re-merkle this but double checking doesn't hurt
    const inputDataPromise = this.fetchDAInfo(claim.input.cid, true);
    const outputDataPromise = this.fetchDAInfo(claim.output.cid, true);

    // wait for them all to settle
    const functionInfo = await functionDataPromise;
    const prevOutputInfo = await prevOutputDataPromise;
    const inputInfo = await inputDataPromise;
    const outputInfo = await outputDataPromise;

    function compareDAInfo(d: DAInfo, c: ClaimDataRef) {
      return bytesEqual(d.cartesiMerkleRoot, c.cartesiMerkleRoot) && d.size == c.size;
    }

    if (!functionInfo || !compareDAInfo(functionInfo, claim.dataContract)) {
      this.log.info("function data for claim does not match", LOG_VERIFIER, {
        claimHash: claimHash,
        functionInfo: functionInfo,
        dataContract: claim.dataContract,
      });
      return { claimHash: claimHash, dataAvailable: false };
    }

    if (!prevOutputInfo || !compareDAInfo(prevOutputInfo, prevClaimDataRef)) {
      this.log.info("prev output info data for claim does not match", LOG_VERIFIER, { claimHash: claimHash });
      return { claimHash: claimHash, dataAvailable: false };
    }

    if (!inputInfo || !compareDAInfo(inputInfo, claim.input)) {
      this.log.info("input info data for claim does not match", LOG_VERIFIER, { claimHash: claimHash });
      return { claimHash: claimHash, dataAvailable: false };
    }

    if (!outputInfo || !compareDAInfo(outputInfo, claim.output)) {
      this.log.info("output info data for claim doesn not match", LOG_VERIFIER, { claimHash: claimHash });
      return { claimHash: claimHash, dataAvailable: false };
    }
    return { claimHash: claimHash, dataAvailable: true };
  }

  private async fetchDAInfo(cid: CID, car: boolean): Promise<DAInfo | undefined> {
    const cacheKey = cid.toString() + ":" + car;

    const cachedDAInfo = this.daInfoCache[cacheKey];
    if (cachedDAInfo != undefined) {
      this.log.info("found DA info in cache", LOG_VERIFIER, { cacheKey: cacheKey });
      return cachedDAInfo;
    }

    this.log.info("fetching DA info", LOG_NETWORK, { cid: cid });
    const daInfo = await createDAInfo(this.ipfs, this.log, cid.toString(), this.config.DACheckTimeout, car);
    if (!daInfo) {
      this.log.info("can not fetch DA info", LOG_NETWORK, { cid: cid });
      return undefined;
    }
    this.log.info("fetched DA info", LOG_NETWORK, { daInfo: daInfo });

    this.daInfoCache[cacheKey] = daInfo;
    this.log.info("local DA info cache updated", LOG_VERIFIER, { cacheKey: cacheKey });

    return daInfo;
  }
}
