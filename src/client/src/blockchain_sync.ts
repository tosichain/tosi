import winston from "winston";
import * as ethers from "ethers";
import { CID } from "ipfs-http-client";

import JSONbigint from "json-bigint";
import * as Digest from "multiformats/hashes/digest";
import { IPFS } from "../../node/ipfs";
import { DatachainV1__factory } from "../../contracts/factories/DatachainV1__factory";
import { DatachainV1 } from "../../contracts/DatachainV1";
import { Block } from "../../blockchain/types";
import { NULL_HASH } from "../../blockchain/constant";
import { mintNextBlock } from "../../blockchain/block";
import { deserializeBlock } from "../../blockchain/serde";
import { hashBlock, stringifySignedTransaction } from "../../blockchain/util";
import { verifyBlockProof } from "../../blockchain/block_proof";
import { BlockchainStorage } from "../../blockchain/storage";
import { CoordinatorAPIClient } from "../../coordinator/src/api_client";
import { CLIENT_MAX_SUPPORTED_BLOCK_VERSION, CLIENT_MIN_SUPPORTED_BLOCK_VERSION } from "./constant";

export interface BlockchainClientSyncConfig {
  eth: {
    rpc: string;
    claimContractAddress: string;
  };
  syncPeriod: number;
}

export class BlockchainClientSync {
  private readonly daCommiteeSampleSize: number;
  private readonly config: BlockchainClientSyncConfig;

  private readonly log: winston.Logger;

  private readonly coordinator: CoordinatorAPIClient;

  private readonly ipfs: IPFS;

  private readonly storage: BlockchainStorage;

  private readonly ethProvider: ethers.providers.JsonRpcProvider;
  private readonly claimContract: DatachainV1;

  constructor(
    daCommitteeSampleSize: number,
    config: BlockchainClientSyncConfig,
    log: winston.Logger,
    coordinator: CoordinatorAPIClient,
    ipfs: IPFS,
    storage: BlockchainStorage,
  ) {
    this.daCommiteeSampleSize = daCommitteeSampleSize;
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
        if (headBlockHash == NULL_HASH) {
          // Coordinator hasn't submitted any blocks yet.
          continue;
        }
        this.log.info(`head block in smart contract ${headBlockHash}`);
        const localHeadBlockHash = await this.storage.getHeadBlockHash();
        this.log.info(`head block in local storage - ${localHeadBlockHash}`);
        if (headBlockHash == localHeadBlockHash) {
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
          if (block.prevBlockHash == localHeadBlockHash) {
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

  private async fetchBlock(blockHash: string): Promise<Block> {
    this.log.info(`fetching block ${blockHash}`);

    const lastBlock = await this.getBlockByHash(blockHash);

    return lastBlock;
  }

  private async getBlockByHash(blockHash: string) {
    const constructedCID = CID.createV1(0x55, Digest.create(0x1b, Buffer.from(blockHash, "hex")));
    const rawLastBlock = await this.getRawBlock(constructedCID);
    const lastBlock = deserializeBlock(rawLastBlock);
    this.log.info(`fetched last block from IPFS: ${blockHash} ${constructedCID.toString()}`);

    const realBlockHash = hashBlock(lastBlock);
    if (realBlockHash != blockHash) {
      // this should never happen
      throw new Error(
        `this should never happen: hash block, fetched from coordinator smart contract - ${blockHash}, does not match hash of block, fetched from IPFS - ${realBlockHash}`,
      );
    }
    return lastBlock;
  }

  private async getContractBlockHash(): Promise<string> {
    const contractBlockHash = await this.claimContract.latestBlockHash();
    // Trim '0x' from block hash, computed by smart contract.
    const blockHash = contractBlockHash.substring(2);
    return blockHash;
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
    if (block.prevBlockHash != headBlockHash) {
      throw new Error(
        `prevHash of new block ${block.time} ${block.prevBlockHash} does not match hash of current head block ${headBlock.time} ${headBlockHash}`,
      );
    }

    if (!(await verifyBlockProof(block, this.storage, this.daCommiteeSampleSize))) {
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
    return headBlockHash === localHeadBlockHash;
  }
  public async latestHash(): Promise<string> {
    const contractBlockHash = await this.claimContract.latestBlockHash();
    return contractBlockHash;
  }
}
