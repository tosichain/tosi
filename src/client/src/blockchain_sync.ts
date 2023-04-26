import * as ethers from "ethers";
import { CID } from "ipfs-http-client";
import * as Digest from "multiformats/hashes/digest";

import { IPFS } from "../../node/ipfs";

import { DatachainV1__factory } from "../../contracts/factories/DatachainV1__factory";
import { DatachainV1 } from "../../contracts/DatachainV1";
import { Block } from "../../blockchain/types";
import { NULL_HASH } from "../../blockchain/constant";
import { mintNextBlock } from "../../blockchain/block";
import { deserializeBlock } from "../../blockchain/serde";
import { bytesEqual, bytesToHex, bytesFromHex, hashBlock, stringifySignedTransaction } from "../../blockchain/util";
import { verifyBlockProof } from "../../blockchain/block_proof";
import { BlockchainStorage } from "../../blockchain/storage";
import { CoordinatorRPC } from "../../coordinator/src/rpc";
import { CLIENT_MAX_SUPPORTED_BLOCK_VERSION, CLIENT_MIN_SUPPORTED_BLOCK_VERSION } from "./constant";
import Logger from "../../log/logger";

export interface BlockchainClientSyncConfig {
  eth: {
    rpc: string;
    claimContractAddress: string;
  };
  syncPeriod: number;
}

export class BlockchainClientSync {
  private readonly daCommiteeSampleSize: number;
  private readonly stateCommiteeSampleSize: number;

  private readonly config: BlockchainClientSyncConfig;

  private readonly log: Logger;

  private readonly coordinator: CoordinatorRPC;

  private readonly ipfs: IPFS;

  private readonly storage: BlockchainStorage;

  private readonly ethProvider: ethers.providers.JsonRpcProvider;
  private readonly claimContract: DatachainV1;

  constructor(
    daCommitteeSampleSize: number,
    stateCommitteeSampleSize: number,
    config: BlockchainClientSyncConfig,
    log: Logger,
    coordinator: CoordinatorRPC,
    ipfs: IPFS,
    storage: BlockchainStorage,
  ) {
    this.daCommiteeSampleSize = daCommitteeSampleSize;
    this.stateCommiteeSampleSize = stateCommitteeSampleSize;

    this.config = config;

    this.log = log;

    this.coordinator = coordinator;

    this.storage = storage;

    this.ipfs = ipfs;

    this.ethProvider = new ethers.providers.JsonRpcProvider(this.config.eth.rpc);
    this.claimContract = DatachainV1__factory.connect(this.config.eth.claimContractAddress, this.ethProvider);
  }

  public async start(): Promise<void> {
    this.syncBlocks();
  }

  private async syncBlocks(): Promise<void> {
    while (true) {
      try {
        await new Promise((resolve, _) => {
          setTimeout(resolve, this.config.syncPeriod);
        });

        this.log.info("starting block sync");

        // Starting from head block fetch, all blocks, until
        // block, already committed to local stroage, is found.

        // Check if local copy of blockchain is up-to-date.
        const headBlockHash = await this.getContractBlockHash();
        if (bytesEqual(headBlockHash, NULL_HASH)) {
          // Coordinator hasn't submitted any blocks yet.
          continue;
        }
        this.log.info(`head block in smart contract ${bytesToHex(headBlockHash)}`);
        const localHeadBlockHash = await this.storage.getHeadBlockHash();
        this.log.info(`head block in local storage - ${bytesToHex(localHeadBlockHash)}`);
        if (bytesEqual(headBlockHash, localHeadBlockHash)) {
          this.log.info("local blockchain copy is up-to-date");
          continue;
        }

        let blockToFetch = headBlockHash;
        const blocksToCommit: Block[] = [];
        // Fetch blocks until first minted block is reached or previous block is in local storage.
        while (true) {
          const block = await this.fetchBlock(blockToFetch);
          blocksToCommit.push(block);
          // Previous block is in local storage.
          if (bytesEqual(block.prevBlockHash, localHeadBlockHash)) {
            this.log.info("hit local head block hash");
            break;
          } else {
            this.log.info("local head block hash not in local storage, continuing");
            blockToFetch = block.prevBlockHash;
          }
        }
        this.log.info("done fetching blocks");
        // Commit block to local storage in correct order.
        blocksToCommit.reverse();
        for (const block of blocksToCommit) {
          await this.applyBlockTxns(block);
        }
        this.log.info("block sync finished");
      } catch (err: any) {
        this.log.error(`failed to sync blocks - ${err.message}`);
      }
    }
  }

  private async fetchBlock(blockHash: Uint8Array): Promise<Block> {
    this.log.info(`fetching block ${bytesToHex(blockHash)}`);
    return await this.getBlockByHash(blockHash);
  }

  private async getBlockByHash(blockHash: Uint8Array) {
    const constructedCID = CID.createV1(0x55, Digest.create(0x1b, blockHash));

    let lastBlock;
    try {
      const rawLastBlock = await this.getRawBlock(constructedCID);
      lastBlock = deserializeBlock(rawLastBlock);
      this.log.info(`fetched last block from IPFS: ${bytesToHex(blockHash)} ${constructedCID.toString()}`);
    } catch (err) {
      this.log.info(
        `failed to fetch ${bytesToHex(blockHash)} from IPFS, ${constructedCID.toString()}: ${err}, peers: ${
          (await this.ipfs.getIPFS().swarm.peers()).length
        }`,
      );
      lastBlock = await this.coordinator.getBlock(blockHash);
      if (!lastBlock) {
        this.log.info(`block ${bytesToHex(blockHash)} was not found at the coordinator either`);
      } else {
        this.log.info(`fetched last block from Coordinator instead: ${bytesToHex(blockHash)}`);
      }
    }
    if (!lastBlock) {
      throw new Error(`No block?`);
    }
    const realBlockHash = hashBlock(lastBlock);
    if (!bytesEqual(realBlockHash, blockHash)) {
      // this should never happen
      throw new Error(
        `this should never happen: hash block, fetched from coordinator smart contract - ${blockHash}, does not match hash of block, fetched from IPFS - ${realBlockHash}`,
      );
    }
    return lastBlock;
  }

  private async getContractBlockHash(): Promise<Uint8Array> {
    // Trim '0x' from block hash string, computed by smart contract.
    const contractBlockHash = (await this.claimContract.latestBlockHash()).substring(2);
    return bytesFromHex(contractBlockHash);
  }

  private async getRawBlock(blockCID: CID): Promise<Uint8Array> {
    return await this.ipfs.getIPFS().block.get(blockCID, { timeout: 15000 });
  }

  private async applyBlockTxns(block: Block): Promise<void> {
    if (block.version < CLIENT_MIN_SUPPORTED_BLOCK_VERSION && block.version > CLIENT_MAX_SUPPORTED_BLOCK_VERSION) {
      throw new Error(`block version ${block.version} is not supported`);
    }

    // Check reference to previous block.
    const [state, headBlock] = await this.storage.getNextBlockInput();
    const headBlockHash = hashBlock(headBlock);
    if (!bytesEqual(block.prevBlockHash, headBlockHash)) {
      throw new Error(
        `prevHash of new block ${block.time} ${block.prevBlockHash} does not match hash of current head block ${headBlock.time} ${headBlockHash}`,
      );
    }

    if (!(await verifyBlockProof(block, this.storage, this.daCommiteeSampleSize, this.stateCommiteeSampleSize))) {
      throw new Error(`block proof is invalid`);
    }

    // Mint next block "locally" by "replaying" transactions from block, fetched from IPFS.
    const [nextBlock, _, rejectedTxns] = await mintNextBlock(
      state,
      headBlock,
      block.version,
      block.transactions,
      block.proof,
      block.time,
    );
    for (const [txn, err] of rejectedTxns) {
      this.log.error(`transaction ${stringifySignedTransaction(txn)} rejected - ${err.message}`);
    }
    if (rejectedTxns.length > 0) {
      throw new Error(`failed to apply 1 or more transactions from new block`);
    }

    await this.storage.commitNextBlock(state, nextBlock);
  }

  public async isSynced(): Promise<boolean> {
    const headBlockHash = await this.getContractBlockHash();
    const localHeadBlockHash = await this.storage.getHeadBlockHash();
    return bytesEqual(headBlockHash, localHeadBlockHash);
  }
  public async latestHash(): Promise<string> {
    const contractBlockHash = await this.claimContract.latestBlockHash();
    return contractBlockHash;
  }
}
