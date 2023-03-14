import winston from "winston";
import * as BLS from "@noble/bls12-381";
import { CID } from "ipfs-http-client";

import { IPFS } from "../../node/ipfs";
import { encodeCBOR, decodeCBOR, currentUnixTime } from "../../util";
import { IPFSService } from "../../node/ipfs-service";

import { DAInfo, ComputeClaim, ClaimDACheckResult, DACheckResult, StakeType } from "../../blockchain/types";
import { signDACheckResult } from "../../blockchain/block_proof";
import {
  fetchDrandBeaconInfo,
  getSeedFromBlockRandomnessProof,
  verifyBlockRandomnessProof,
} from "../../blockchain/block_randomness";
import { getVerificationCommitteeSample } from "../../blockchain/block_commitee";
import { BlockchainStorage } from "../../blockchain/storage";
import { hashComputeClaim, stringifyComputeClaim } from "../../blockchain/util";
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
import { createDAInfo } from "./util";

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
  private readonly ipfsService: IPFSService;

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
    ipfsService: IPFSService,
    blockchain: BlockchainStorage,
  ) {
    this.blsSecKey = blsSecKey;
    this.blsPubKey = Buffer.from(BLS.getPublicKey(this.blsSecKey)).toString("hex");

    this.coordinatorPubKey = cooridnatorPubKey;

    this.daCommitteeSampleSize = daCommitteeSampleSize;

    this.config = config;

    this.log = log;

    this.ipfs = ipfs;
    this.ipfsService = ipfsService;

    this.blockchain = blockchain;
  }

  public async start(): Promise<void> {
    await this.ipfs.getIPFS().pubsub.subscribe(IPFS_PUB_SUB_DA_VERIFICATION, (msg: IPFSPubSubMessage) => {
      this.handlePubSubMessage(msg);
    });
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
    const beaconInfo = await fetchDrandBeaconInfo();
    const validRandProof = await verifyBlockRandomnessProof(
      Buffer.from(daReq.txnBundleHash, "hex"),
      Buffer.from(this.coordinatorPubKey, "hex"),
      daReq.randomnessProof,
      beaconInfo,
      currentUnixTime(),
    );
    if (!validRandProof) {
      this.log.error("invalid DA verification request randomness proof");
      return false;
    }

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
    if (claim.prevClaimHash != "") {
      const prevClaim = await this.blockchain.getComputeClaim(claim.prevClaimHash);
      if (prevClaim == undefined) {
        throw new Error(`previous claim ${claim.prevClaimHash} does not exist`);
      }
    }

    const availability: [string, CID, DAInfo, string][] = await Promise.all(
      (
        [
          ["court.img", CID.parse(claim.courtCID), "/prev/gov/court.img"],
          ["app.img", CID.parse(claim.appCID), "/prev/gov/app.img"],
          ["input", CID.parse(claim.inputCID), "/input"],
        ] as [string, CID, string][]
      ).map(async ([path, cid, loc]): Promise<[string, CID, DAInfo, string]> => {
        const daInfo = await this.fetchDAInfo(cid);
        return [path, cid, daInfo, loc];
      }),
    );

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const daInfo: DAInfo[] = availability.map(([path, cid, info, loc]) => {
      return {
        ...info,
        name: loc,
      };
    });

    // Validate the metadata actually matches.
    const [courtInfo, appInfo, inputInfo] = daInfo;

    const courtInfoInClaim = claim.daInfo.find((info) => {
      return info.name == "/prev/gov/court.img";
    });
    const appInfoInClaim = claim.daInfo.find((info) => {
      return info.name == "/prev/gov/app.img";
    });
    const inputInfoInClaim = claim.daInfo.find((info) => {
      return info.name == "/input";
    });

    if (!courtInfoInClaim || !compareDAInfo(courtInfo, courtInfoInClaim, false, false)) {
      this.log.error(`court data for claim ${claimHash} doesn't match`);
      return { claimHash: claimHash, dataAvailable: false };
    }
    if (!appInfoInClaim || !compareDAInfo(appInfo, appInfoInClaim, false, false)) {
      this.log.error("app data for claim ${claimHash} doesn't match");
      return { claimHash: claimHash, dataAvailable: false };
    }
    if (!inputInfoInClaim || !compareDAInfo(inputInfo, inputInfoInClaim, false, false)) {
      this.log.error("input data for claim ${claimHash} doesn't match");
      return { claimHash: claimHash, dataAvailable: false };
    }

    return { claimHash: claimHash, dataAvailable: true };
  }

  private async fetchDAInfo(cid: CID): Promise<DAInfo> {
    const cachedDAInfo = this.daInfoCache[cid.toString()];
    if (cachedDAInfo != undefined) {
      this.log.info(`found DA info for CID ${cid.toString()} in cache`);
      return cachedDAInfo;
    }

    const daInfo = await createDAInfo(this.ipfs, this.log, cid.toString(), false, this.config.DACheckTimeout);
    this.log.info(`fetched DA info for CID ${cid.toString()} - ${JSON.stringify(daInfo)}`);

    this.daInfoCache[cid.toString()] = daInfo;
    this.log.info("local DA info cache updated");

    await this.updateDescartesMekrleRootCache(cid.toString(), cid.toString(), daInfo.log2, daInfo.cartesiMerkleRoot);

    return daInfo;
  }

  private async updateDescartesMekrleRootCache(
    directPath: string,
    claimPath: string,
    log2Size: number,
    hash: string,
  ): Promise<void> {
    if (directPath != undefined) {
      await this.ipfsService.cacheMerkeRootHash(directPath, log2Size, hash);
    }
    if (claimPath != undefined) {
      await this.ipfsService.cacheMerkeRootHash(claimPath, log2Size, hash);
    }
    this.log.info("descartes merkle root cache updated");
  }
}

function compareDAInfo(a: DAInfo, b: DAInfo, ignoreSizes: boolean, ignoreKeccak: boolean): boolean {
  return (
    a.name === b.name &&
    (ignoreSizes || a.size === b.size) &&
    (ignoreSizes || b.log2 === b.log2) &&
    (ignoreKeccak || a.keccak256 == b.keccak256) &&
    a.cartesiMerkleRoot == b.cartesiMerkleRoot
  );
}
