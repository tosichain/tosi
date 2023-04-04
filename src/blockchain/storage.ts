import winston from "winston";
import mysql from "mysql";

import { encodeCBOR, decodeCBOR } from "../util";

import { WorldState, SignedTransaction, Block, Account, DataChain, ComputeClaim, StakePool } from "./types";
import { accountsMerkleTree } from "./block";
import { hashBlock, hashSignedTransaction, stringifySignedTransaction } from "./util";
import {
  deserializeBlock,
  deserializeSignedTransaction,
  deserializeWorldState as deserializeWorldState,
  serializeBlock,
  serializeSignedTransaction,
  serializeWorldState,
} from "./serde";
import { GENESIS_BLOCK_VERSION, NULL_HASH } from "./constant";

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

  private readonly log: winston.Logger;
  private readonly db: mysql.Pool;
  constructor(config: BlockchainStorageConfig, log: winston.Logger) {
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

  private async clearAllKeys(table: string): Promise<void> {
    return await new Promise((resolve, reject) => {
      this.db.query("DELETE FROM " + table, function (error, results, fields) {
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
        txnBundleHash: "",
        txnBundleProposer: "",
        DACheckResults: [],
        randomnessProof: new Uint8Array(),
        aggDACheckResultSignature: new Uint8Array(),
      },
      time: 0,
    };
    const rawGenesisBlock = serializeBlock(genesisBlock);
    const genesisBlockHash = hashBlock(genesisBlock);

    // TODO do this in a singular commit next time
    await this.putValue("main", DB_KEY_HEAD_BLOCK, encodeStringValue(genesisBlockHash));
    await this.putValue("state", DB_KEY_STATE_VALUE, rawState);
    await this.putValue("main", DB_KEY_GENESIS_BLOCK, encodeStringValue(genesisBlockHash));

    await this.putValue("block", genesisBlockHash, rawGenesisBlock);
  }

  public async getGenesisBlockHash(): Promise<string> {
    const genesisBlock = await this.getValue("main", DB_KEY_GENESIS_BLOCK);
    if (!genesisBlock) {
      throw new Error("Genesis block info not found");
    }
    const genesisBlockHash = decodeStringValue(genesisBlock);
    return genesisBlockHash;
  }

  public async submitTransaction(txn: SignedTransaction): Promise<void> {
    // TODO: transactions signature must be verified.
    const serializedTxn = serializeSignedTransaction(txn);
    const txnHash = hashSignedTransaction(txn);
    await this.putValue("mempool", txnHash, serializedTxn);
    this.log.info(`transaction ${stringifySignedTransaction(txn)} submitted to the mempool`);
  }

  public async removePendingTransaction(txn: SignedTransaction): Promise<void> {
    const txnHash = hashSignedTransaction(txn);
    this.clearKey("mempool", txnHash);
    await this.clearKey("mempool", txnHash);
    this.log.info(`transaction ${txnHash} removed from the mempool`);
  }

  public async getNextBlockInput(): Promise<[WorldState, Block, SignedTransaction[]]> {
    // Fetch current world state.
    const rawState = await this.getValue("state", DB_KEY_STATE_VALUE);
    if (!rawState) {
      throw new Error("State not found");
    }
    const state = deserializeWorldState(rawState);

    // Fetch current head block.
    const keyHeadBlock = await this.getValue("main", DB_KEY_HEAD_BLOCK);
    if (!keyHeadBlock) {
      throw new Error("Head block info not found");
    }
    const headBlockHash = decodeStringValue(keyHeadBlock);
    const rawHeadBlock = await this.getValue("block", headBlockHash);
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
    await this.putValue("main", DB_KEY_HEAD_BLOCK, encodeStringValue(nextBlockHash));
    await this.putValue("state", DB_KEY_STATE_VALUE, serializeWorldState(state));
    await this.putValue("block", nextBlockHash, rawBlock);
    this.log.info(`block ${nextBlockHash} committed to storage`);

    // Remove block transactions from mempool.
    for (const txn of block.transactions) {
      const txnHash = hashSignedTransaction(txn);
      await this.clearKey("mempool", txnHash);
      this.log.info(`transaction ${txnHash} removed from the mempool`);
    }
  }

  public async getAccount(pubKey: string): Promise<Account | undefined> {
    const rawState = await this.getValue("state", DB_KEY_STATE_VALUE);
    if (!rawState) {
      throw new Error("world state does not exist in database");
    }
    const state = deserializeWorldState(rawState);
    return state.accounts[pubKey];
  }

  public async getStakePool(): Promise<StakePool> {
    const rawState = await this.getValue("state", DB_KEY_STATE_VALUE);
    if (!rawState) {
      throw new Error("world state does not exist in database");
    }
    const state = deserializeWorldState(rawState);
    return state.stakePool;
  }

  public async getComputeChain(rootClaimHash: string): Promise<DataChain | undefined> {
    const rawState = await this.getValue("state", DB_KEY_STATE_VALUE);
    if (!rawState) {
      throw new Error("world state does not exist in database");
    }
    const state = deserializeWorldState(rawState);
    return state.dataChains[rootClaimHash];
  }

  public async getDatachains(): Promise<DataChain[] | undefined> {
    const rawState = await this.getValue("state", DB_KEY_STATE_VALUE);
    if (!rawState) {
      throw new Error("world state does not exist in database");
    }
    const state = deserializeWorldState(rawState);
    return Object.values(state.dataChains);
  }

  public async getComputeClaim(claimHash: string): Promise<ComputeClaim | undefined> {
    const rawState = await this.getValue("state", DB_KEY_STATE_VALUE);
    if (!rawState) {
      throw new Error("world state does not exist in database");
    }
    const state = deserializeWorldState(rawState);
    for (const rootClaimHash of Object.keys(state.dataChains)) {
      const chain = state.dataChains[rootClaimHash];
      if (chain.claims[claimHash] != undefined) {
        return chain.claims[claimHash];
      }
    }
    return undefined;
  }

  public async getHeadBlockHash(): Promise<string> {
    const rawHash = await this.getValue("main", DB_KEY_HEAD_BLOCK);
    if (!rawHash) {
      throw new Error("head block hash does not exist in database");
    }
    return decodeStringValue(rawHash);
  }

  public async getBlock(blockHash: string): Promise<Block | undefined> {
    const rawBlock = await this.getValue("block", blockHash);
    if (!rawBlock) {
      return undefined;
    }
    return deserializeBlock(rawBlock);
  }

  public async setBlockMetadata(blockHash: string, meta: Uint8Array): Promise<void> {
    await this.putValue("blockMeta", blockHash, meta);
  }

  public async getBlockMetadata(blockHash: string): Promise<Uint8Array | undefined> {
    const rawBlock = await this.getValue("blockMeta", blockHash);
    if (!rawBlock) {
      return undefined;
    }
    return rawBlock;
  }
}

function encodeStringValue(s: string): Uint8Array {
  return encodeCBOR(s);
}

function decodeStringValue(s: Uint8Array): string {
  return decodeCBOR(s) as string;
}

function encodeNumberValue(n: number): Uint8Array {
  return encodeCBOR(n);
}

function decodeNumberValue(n: Uint8Array): number {
  return decodeCBOR(n) as number;
}
