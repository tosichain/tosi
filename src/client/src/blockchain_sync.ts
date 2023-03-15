import winston from "winston";
import * as ethers from "ethers";
import { CID } from "ipfs-http-client";

import { IPFS } from "../../node/ipfs";

import { DatachainV1__factory } from "../../contracts/factories/DatachainV1__factory";
import { DatachainV1 } from "../../contracts/DatachainV1";
import { Block } from "../../blockchain/types";
import { mintNextBlock } from "../../blockchain/block";
import { deserializeBlock } from "../../blockchain/serde";
import { hashBlock, stringifySignedTransaction } from "../../blockchain/util";
import { verifyBlockProof } from "../../blockchain/block_proof";
import { BlockchainStorage } from "../../blockchain/storage";
import { CoordinatorAPIClient } from "../../coordinator/src/api_client";
import { CLIENT_MAX_SUPPORTED_BLOCK_VERSION } from "./constant";

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

        // Check if any blocks have been submitted to smart contract.
        let blockIndex = (await this.claimContract.blockNumber()).toNumber();
        if (blockIndex == 0) {
          this.log.info("no blocks were submitted to smart contract");
          continue;
        }

        // Check if local copy of blockchain is up-to-date.
        const headBlockHash = await this.getContractHeadBlockHash();
        this.log.info(`head block in smart contract ${headBlockHash}`);
        const localHeadBlockHash = await this.storage.getHeadBlockHash();
        this.log.info(`head block in local storage - ${localHeadBlockHash}`);
        if (headBlockHash == localHeadBlockHash) {
          this.log.info("local blockchain copy is up-to-date");
          continue;
        }

        const blocksToCommit: Block[] = [];
        // Fetch blocks until first minted block is reached or previous block is in local storage.
        while (blockIndex > 0) {
          const block = await this.fetchBlock(blockIndex);
          blocksToCommit.push(block);
          // Previous block is in local storage.
          if (block.prevBlockHash == localHeadBlockHash) {
            this.log.info("hit local head block hash");
            break;
          } else {
            this.log.info("local head block hash not in local storage, continuing");
          }
          blockIndex--;
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

  private async fetchBlock(blockIndex: number): Promise<Block> {
    this.log.info(`fetching block ${blockIndex}`);

    // Trim '0x' from block hash, computed by smart contract.
    const blockHash = await this.getContractBlockHash(blockIndex);
    this.log.info(`fetched block hash from smart contract - ${blockHash}`);

    const blockMeta = await this.coordinator.getBlockMetadata(blockHash);
    if (blockMeta == undefined) {
      throw new Error("failed to fetch CID of last block from coordinator node");
    }
    this.log.info(`fetched CID of last block from coordinator node - ${blockMeta?.CID.toString()}`);

    const rawLastBlock = await this.getRawBlock(CID.parse(blockMeta.CID));
    const lastBlock = deserializeBlock(rawLastBlock);
    this.log.info(`fetched last block from IPFS`);

    const realBlockHash = hashBlock(lastBlock);
    if (realBlockHash != blockHash) {
      throw new Error(
        `hash block, fetched from coordinator smart contract, does not match hash of block, fetched from IPFS`,
      );
    }

    return lastBlock;
  }

  private async getContractHeadBlockHash(): Promise<string> {
    const contractBlockHash = await this.claimContract.latestBlockHash();
    // Trim '0x' from block hash, computed by smart contract.
    const blockHash = contractBlockHash.substring(2);
    return blockHash;
  }

  private async getContractBlockHash(blockIndex: number): Promise<string> {
    const contractBlockHash = await this.claimContract.blockHash(blockIndex);
    // Trim '0x' from block hash, computed by smart contract.
    const blockHash = contractBlockHash.substring(2);
    return blockHash;
  }

  private async getRawBlock(blockCID: CID): Promise<Uint8Array> {
    return await (
      await this.ipfs.getIPFS().dag.get(blockCID, { timeout: 15000 })
    ).value;
  }

  private async applyBlockTxns(block: Block): Promise<void> {
    if (block.version > CLIENT_MAX_SUPPORTED_BLOCK_VERSION) {
      throw new Error(`block version ${block.version} is not supported`);
    }

    // Check reference to previous block.
    const [state, headBlock] = await this.storage.getNextBlockInput();
    const headBlockHash = hashBlock(headBlock);
    if (block.prevBlockHash != headBlockHash) {
      throw new Error(
        `prevHash of new block ${block.prevBlockHash} does not match hash of current head block ${headBlockHash}`,
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
    const headBlockHash = await this.getContractHeadBlockHash();
    const localHeadBlockHash = await this.storage.getHeadBlockHash();
    return headBlockHash === localHeadBlockHash;
  }
  public async latestHash(): Promise<string> {
    const contractBlockHash = await this.claimContract.latestBlockHash();
    return contractBlockHash;
  }
}
