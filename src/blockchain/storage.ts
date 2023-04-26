import mysql from "mysql";

import { WorldState, SignedTransaction, Block, Account, DataChain, ComputeClaim, StakePool } from "./types";
import { accountsMerkleTree } from "./block";
import { bytesToHex, hashBlock, hashSignedTransaction, stringifySignedTransaction } from "./util";
import {
  deserializeBlock,
  deserializeSignedTransaction,
  deserializeWorldState as deserializeWorldState,
  serializeBlock,
  serializeSignedTransaction,
  serializeWorldState,
} from "./serde";
import { GENESIS_BLOCK_VERSION, NULL_HASH } from "./constant";
import Logger from "../log/logger";

const DB_KEY_HEAD_BLOCK = "headBlock";
const DB_KEY_STATE_VALUE = "value";
const DB_KEY_GENESIS_BLOCK = "genesisBlock";

export interface BlockchainStorageConfig {
  readonly dbHost: string;
  readonly dbUser: string;
  readonly dbPassword: string;
  readonly db: string;
  readonly initialState?: WorldState;
}

export class BlockchainStorage {
  private readonly config: BlockchainStorageConfig;

  private readonly log: Logger;
  private readonly db: mysql.Pool;
  constructor(config: BlockchainStorageConfig, log: Logger) {
    this.config = config;

    this.log = log;
    this.db = mysql.createPool({
      connectionLimit: 10,
      host: config.dbHost,
      user: config.dbUser,
      password: config.dbPassword,
      database: config.db,
    });
  }

  public async init(): Promise<void> {
    while (true) {
      try {
        await new Promise((resolve, reject) => {
          this.db.query("SELECT val FROM main", function (error, results, fields) {
            if (error) {
              reject(error);
            } else {
              resolve(null);
            }
          });
        });
        break;
      } catch (err: any) {
        this.log.info(err.toString());
        await new Promise((resolve, reject) => {
          setTimeout(resolve, 1000);
        });
      }
    }
    this.log.info("Checking DB state...");
    const headValue = await this.getValue("main", DB_KEY_HEAD_BLOCK);
    const genesisValue = await this.getValue("main", DB_KEY_GENESIS_BLOCK);
    if (headValue == null || genesisValue == null) {
      this.log.info("Initialising DB");
      if (this.config.initialState) {
        await this.initDB(this.config.initialState);
      }
    } else {
      this.log.info("DB already initialised");
    }
  }

  private async getValue(table: string, key: string): Promise<Uint8Array | null> {
    return await new Promise((resolve, reject) => {
      this.db.query("SELECT `val` FROM " + table + " WHERE k = ?", [key], function (error, results, fields) {
        if (error) {
          reject(error);
        } else {
          if (results.length > 1) {
            throw new Error("Too many results");
          }
          if (results.length > 0) {
            resolve(results[0].val as Uint8Array);
          } else {
            resolve(null);
          }
        }
      });
    });
  }

  private async putValue(table: string, key: string, value: Uint8Array): Promise<void> {
    return await new Promise((resolve, reject) => {
      this.db.query(
        "INSERT INTO " + table + " (`k`, `val`) VALUES (?, ?) ON DUPLICATE KEY UPDATE val = ?",
        [key, Buffer.from(value), Buffer.from(value)],
        function (error, results, fields) {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        },
      );
    });
  }

  private async getValues(table: string): Promise<Uint8Array[]> {
    const results: Uint8Array[] = await new Promise((resolve, reject) => {
      this.db.query("SELECT `val` FROM " + table, function (error, results, fields) {
        if (error) {
          reject(error);
        } else {
          if (results.length > 0) {
            resolve(results.map((x: any) => x.val as Uint8Array));
          } else {
            resolve([] as Uint8Array[]);
          }
        }
      });
    });
    return results;
  }

  private async clearKey(table: string, key: string): Promise<void> {
    return await new Promise((resolve, reject) => {
      this.db.query(`DELETE FROM ${table} WHERE k = ?`, [key], function (error, results, fields) {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  private async initDB(state: WorldState): Promise<void> {
    // TODO: some general metdata must be put into this.db
    const rawState = serializeWorldState(state);

    const genesisBlock: Block = {
      version: GENESIS_BLOCK_VERSION,
      prevBlockHash: NULL_HASH,
      accountsMerkle: accountsMerkleTree(state),
      transactions: [],
      proof: {
        txnBundleHash: new Uint8Array(),
        txnBundleProposer: new Uint8Array(),
        DACheckResults: [],
        stateCheckResults: [],
        randomnessProof: new Uint8Array(),
        aggDACheckResultSignature: new Uint8Array(),
        aggStateCheckResultSignature: new Uint8Array(),
      },
      time: 0,
    };
    const rawGenesisBlock = serializeBlock(genesisBlock);
    const genesisBlockHash = hashBlock(genesisBlock);

    // TODO do this in a singular commit next time
    await this.putValue("main", DB_KEY_HEAD_BLOCK, genesisBlockHash);
    await this.putValue("state", DB_KEY_STATE_VALUE, rawState);
    await this.putValue("main", DB_KEY_GENESIS_BLOCK, genesisBlockHash);

    await this.putValue("block", bytesToHex(genesisBlockHash), rawGenesisBlock);
  }

  public async getGenesisBlockHash(): Promise<Uint8Array> {
    const genesisBlock = await this.getValue("main", DB_KEY_GENESIS_BLOCK);
    if (!genesisBlock) {
      throw new Error("Genesis block info not found");
    }
    return genesisBlock;
  }

  public async submitTransaction(txn: SignedTransaction): Promise<void> {
    // TODO: transactions signature must be verified.
    const serializedTxn = serializeSignedTransaction(txn);
    const txnHash = hashSignedTransaction(txn);
    await this.putValue("mempool", bytesToHex(txnHash), serializedTxn);
    this.log.info(`transaction ${stringifySignedTransaction(txn)} submitted to the mempool`);
  }

  public async removePendingTransaction(txn: SignedTransaction): Promise<void> {
    const txnHash = hashSignedTransaction(txn);
    await this.clearKey("mempool", bytesToHex(txnHash));
    this.log.info(`transaction ${bytesToHex(txnHash)} removed from the mempool`);
  }

  public async getNextBlockInput(): Promise<[WorldState, Block, SignedTransaction[]]> {
    // Fetch current world state.
    const rawState = await this.getValue("state", DB_KEY_STATE_VALUE);
    if (!rawState) {
      throw new Error("State not found");
    }
    const state = deserializeWorldState(rawState);

    // Fetch current head block.
    const headBlockHash = await this.getValue("main", DB_KEY_HEAD_BLOCK);
    if (!headBlockHash) {
      throw new Error("Head block info not found");
    }
    const rawHeadBlock = await this.getValue("block", bytesToHex(headBlockHash));
    if (!rawHeadBlock) {
      throw new Error("Coud not locate head block");
    }
    const headBlock = deserializeBlock(rawHeadBlock);

    // Fetch transactions from mempool.
    const rawTxns = await this.getValues("mempool");
    const txns = rawTxns.map((serializedTxn) => {
      return deserializeSignedTransaction(serializedTxn);
    });

    return [state, headBlock, txns];
  }

  public async commitNextBlock(state: WorldState, block: Block): Promise<void> {
    const rawBlock = serializeBlock(block);
    const nextBlockHash = hashBlock(block);

    /* TODO: turn this atomic */
    await this.putValue("main", DB_KEY_HEAD_BLOCK, nextBlockHash);
    await this.putValue("state", DB_KEY_STATE_VALUE, serializeWorldState(state));
    await this.putValue("block", bytesToHex(nextBlockHash), rawBlock);
    this.log.info(`block ${bytesToHex(nextBlockHash)} committed to storage`);

    // Remove block transactions from mempool.
    for (const txn of block.transactions) {
      const txnHash = hashSignedTransaction(txn);
      await this.clearKey("mempool", bytesToHex(txnHash));
      this.log.info(`transaction ${bytesToHex(txnHash)} removed from the mempool`);
    }
  }

  public async getAccount(address: Uint8Array): Promise<Account | undefined> {
    const rawState = await this.getValue("state", DB_KEY_STATE_VALUE);
    if (!rawState) {
      throw new Error("world state does not exist in database");
    }
    const state = deserializeWorldState(rawState);
    return state.accounts[bytesToHex(address)];
  }

  public async getStakePool(): Promise<StakePool> {
    const rawState = await this.getValue("state", DB_KEY_STATE_VALUE);
    if (!rawState) {
      throw new Error("world state does not exist in database");
    }
    const state = deserializeWorldState(rawState);
    return state.stakePool;
  }

  public async getComputeChain(rootClaimHash: Uint8Array): Promise<DataChain | undefined> {
    const rawState = await this.getValue("state", DB_KEY_STATE_VALUE);
    if (!rawState) {
      throw new Error("world state does not exist in database");
    }
    const state = deserializeWorldState(rawState);
    return state.dataChains[bytesToHex(rootClaimHash)];
  }

  public async getDataChainList(): Promise<DataChain[]> {
    const rawState = await this.getValue("state", DB_KEY_STATE_VALUE);
    if (!rawState) {
      throw new Error("world state does not exist in database");
    }
    const state = deserializeWorldState(rawState);
    return Object.values(state.dataChains);
  }

  public async getComputeClaim(claimHash: Uint8Array): Promise<ComputeClaim | undefined> {
    const rawState = await this.getValue("state", DB_KEY_STATE_VALUE);
    if (!rawState) {
      throw new Error("world state does not exist in database");
    }
    const state = deserializeWorldState(rawState);
    const claimHashHex = bytesToHex(claimHash);
    for (const rootClaimHash of Object.keys(state.dataChains)) {
      const chain = state.dataChains[rootClaimHash];
      if (chain.claims[claimHashHex] != undefined) {
        return chain.claims[claimHashHex];
      }
    }
    return undefined;
  }

  public async getHeadBlockHash(): Promise<Uint8Array> {
    const rawHash = await this.getValue("main", DB_KEY_HEAD_BLOCK);
    if (!rawHash) {
      throw new Error("head block hash does not exist in database");
    }
    return rawHash;
  }

  public async getBlock(blockHash: Uint8Array): Promise<Block | undefined> {
    const rawBlock = await this.getValue("block", bytesToHex(blockHash));
    if (!rawBlock) {
      return undefined;
    }
    return deserializeBlock(rawBlock);
  }

  public async setBlockMetadata(blockHash: Uint8Array, meta: Uint8Array): Promise<void> {
    await this.putValue("blockMeta", bytesToHex(blockHash), meta);
  }

  public async getBlockMetadata(blockHash: Uint8Array): Promise<Uint8Array | undefined> {
    const rawBlock = await this.getValue("blockMeta", bytesToHex(blockHash));
    if (!rawBlock) {
      return undefined;
    }
    return rawBlock;
  }
}
