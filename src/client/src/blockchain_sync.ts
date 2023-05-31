import * as ethers from "ethers";
import { CID } from "ipfs-http-client";
import * as Digest from "multiformats/hashes/digest";

import { IPFS } from "../../p2p/ipfs";

import { DatachainV2__factory } from "../../contracts/factories/DatachainV2__factory";
import { DatachainV2 } from "../../contracts/DatachainV2";
import { Block, DrandBeaconInfo } from "../../blockchain/types";
import { NULL_HASH } from "../../blockchain/constant";
import { bytesToHex, hashSignedTransaction } from "../../blockchain/util";
import { mintNextBlock } from "../../blockchain/block";
import { deserializeBlock } from "../../blockchain/serde";
import { bytesEqual, bytesFromHex, hashBlock } from "../../blockchain/util";
import { verifyBlockProof } from "../../blockchain/block_proof";
import { BlockchainStorage } from "../../blockchain/storage";
import { CoordinatorRPC } from "../../coordinator/src/rpc";
import { CLIENT_MAX_SUPPORTED_BLOCK_VERSION, CLIENT_MIN_SUPPORTED_BLOCK_VERSION } from "./constant";
import Logger from "../../log/logger";

const LOG_SYNC = "sync";
const LOG_NETWORK = [LOG_SYNC, "network"];
const LOG_STATE = [LOG_SYNC, "state"];
const LOG_STATE_TRACE = [LOG_SYNC, "state", "trace"];

export interface BlockchainClientSyncConfig {
  contractAddress: string;
  ethRpcAddress: string;
  blockSyncPeriod: number;
}

export class BlockchainClientSync {
  private readonly config: BlockchainClientSyncConfig;

  private readonly log: Logger;

  private readonly coordinator: CoordinatorRPC;

  private readonly ipfs: IPFS;

  private readonly storage: BlockchainStorage;

  private readonly ethProvider: ethers.providers.JsonRpcProvider;
  private readonly claimContract: DatachainV2;
  private readonly drandBeaconInfo: DrandBeaconInfo;

  constructor(
    config: BlockchainClientSyncConfig,
    log: Logger,
    coordinator: CoordinatorRPC,
    ipfs: IPFS,
    storage: BlockchainStorage,
    drandBeaconInfo: DrandBeaconInfo,
  ) {
    this.config = config;

    this.log = log;

    this.coordinator = coordinator;

    this.storage = storage;

    this.ipfs = ipfs;

    this.drandBeaconInfo = drandBeaconInfo;

    this.ethProvider = new ethers.providers.JsonRpcProvider(this.config.ethRpcAddress);
    this.claimContract = DatachainV2__factory.connect(this.config.contractAddress, this.ethProvider);
  }

  public async start(): Promise<void> {
    this.syncBlocks();
  }

  private async syncBlocks(): Promise<void> {
    while (true) {
      try {
        await new Promise((resolve, _) => {
          setTimeout(resolve, this.config.blockSyncPeriod);
        });

        this.log.info("starting block sync", LOG_SYNC);

        // Starting from head block fetch, all blocks, until
        // block, already committed to local storage, is found.

        // Check if local copy of blockchain is up-to-date.
        const headBlockHash = await this.getContractBlockHash();
        if (bytesEqual(headBlockHash, NULL_HASH)) {
          // Coordinator hasn't submitted any blocks yet.
          continue;
        }
        this.log.info("head block in smart contract", LOG_SYNC, { blockHash: headBlockHash });
        const localHeadBlockHash = await this.storage.getHeadBlockHash();
        this.log.info("head block in local storage", LOG_SYNC, { blockHash: localHeadBlockHash });
        if (bytesEqual(headBlockHash, localHeadBlockHash)) {
          this.log.info("local blockchain copy is up-to-date", LOG_SYNC);
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
            this.log.info("hit local head block hash", LOG_SYNC);
            break;
          } else {
            this.log.info("local head block hash not in local storage, continuing", LOG_SYNC);
            blockToFetch = block.prevBlockHash;
          }
        }
        this.log.info("done fetching blocks", LOG_SYNC);
        // Commit block to local storage in correct order.
        blocksToCommit.reverse();
        for (const block of blocksToCommit) {
          await this.applyBlockTxns(block);
        }
        this.log.info("block sync finished", LOG_SYNC);
      } catch (err: any) {
        this.log.error("failed to sync blocks", err, LOG_SYNC);
      }
    }
  }

  private async fetchBlock(blockHash: Uint8Array): Promise<Block> {
    this.log.info("fetching block", LOG_NETWORK, { blockHash: blockHash });

    const constructedCID = CID.createV1(0x55, Digest.create(0x1b, blockHash));

    let lastBlock;
    try {
      const rawLastBlock = await this.getRawBlock(constructedCID);
      lastBlock = deserializeBlock(rawLastBlock);
      this.log.info("fetched last block from IPFS", LOG_NETWORK, {
        blockHash: blockHash,
        cid: constructedCID,
      });
    } catch (err: any) {
      this.log.error("failed to fetch block from IPFS", err, LOG_NETWORK, {
        blockHash: blockHash,
        cid: constructedCID,
        peers: (await this.ipfs.getIPFS().swarm.peers()).length,
      });
      lastBlock = await this.coordinator.getBlock(blockHash);
      if (!lastBlock) {
        this.log.error("block was not found at the coordinator either", err, LOG_NETWORK, { blockHash: blockHash });
      } else {
        this.log.info(`fetched last block from coordinator instead`, LOG_NETWORK, { blockHash: blockHash });
      }
    }
    if (!lastBlock) {
      throw new Error("last block is undefined");
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

    if (!(await verifyBlockProof(block, this.storage, this.drandBeaconInfo))) {
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
      this.log.error("transaction, approved by, chain, was rejected", err, LOG_STATE, {
        txn: txn,
        txnHash: hashSignedTransaction(txn),
      });
    }
    if (rejectedTxns.length > 0) {
      throw new Error(`failed to apply 1 or more transactions from new block`);
    }

    // Trace updates of world state and chain.
    for (const txn of block.transactions) {
      const txnHash = hashSignedTransaction(txn);
      this.log.info("transaction applied", LOG_STATE_TRACE, { txn: txn, txnHash: txnHash });
    }

    this.log.debug("new world state", LOG_STATE_TRACE, { state: state });

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
