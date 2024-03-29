import mysql from "mysql";

import {
  WorldState,
  SignedTransaction,
  Block,
  Account,
  DataChain,
  ComputeClaim,
  StakePool,
  OffchainComputationParameters,
} from "./types";
import { createAccount } from "./transaction";
import { accountsMerkleTree } from "./block";
import { bytesEqual, bytesToHex, hashBlock, hashSignedTransaction } from "./util";
import {
  deserializeBlock,
  deserializeSignedTransaction,
  deserializeWorldState as deserializeWorldState,
  serializeBlock,
  serializeSignedTransaction,
  serializeWorldState,
} from "./serde";
import { DA_VERIFIER_COUNT, GENESIS_BLOCK_VERSION, NULL_HASH, STATE_VERIFIER_COUNT } from "./constant";
import Logger from "../log/logger";

const LOG_STORAGE = "storage";
const LOG_NETWORK = [LOG_STORAGE, "network"];
const LOG_MEMPOOL = [LOG_STORAGE, "mempool"];
const LOG_CHAIN = [LOG_STORAGE, "chain"];

const DB_KEY_HEAD_BLOCK = "headBlock";
const DB_KEY_STATE_VALUE = "value";
const DB_KEY_GENESIS_BLOCK = "genesisBlock";

export interface BlockchainStorageConfig {
  readonly mysqlHost: string;
  readonly mysqlUser: string;
  readonly mysqlPassword: string;
  readonly mysqlDbName: string;
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
      host: this.config.mysqlHost,
      user: this.config.mysqlUser,
      password: this.config.mysqlPassword,
      database: this.config.mysqlDbName,
    });
  }

  public async init(minterAddr: Uint8Array): Promise<void> {
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
        this.log.error("failed to connect to db", err, LOG_NETWORK);
        await new Promise((resolve, reject) => {
          setTimeout(resolve, 1000);
        });
      }
    }
    this.log.info("checking db state", LOG_STORAGE);
    const headValue = await this.getValue("main", DB_KEY_HEAD_BLOCK);
    const genesisValue = await this.getValue("main", DB_KEY_GENESIS_BLOCK);
    if (headValue == null || genesisValue == null) {
      this.log.info("initialising db", LOG_STORAGE);
      const initialState = createInitialWorldState(minterAddr);
      await this.initDB(initialState);
    } else {
      this.log.info("db already initialised", LOG_STORAGE);
      const rawState = await this.getValue("state", DB_KEY_STATE_VALUE);
      if (!rawState) {
        throw new Error("world state does not exist in database");
      }
      const state = deserializeWorldState(rawState);
      if (!bytesEqual(minterAddr, state.minter)) {
        throw new Error("specified minter address does not match one from storage");
      }
    }
  }

  private putValueQuery(table: string, key: string, value: Uint8Array): string {
    const values = [key, Buffer.from(value), Buffer.from(value)];
    return mysql.format("INSERT INTO " + table + " (`k`, `val`) VALUES (?, ?) ON DUPLICATE KEY UPDATE val = ?", values);
  }

  private clearKeyQuery(table: string, key: string): string {
    return mysql.format(`DELETE FROM ${table} WHERE k = ?`, [key]);
  }

  private async execQueriesInTxn(queries: string[]): Promise<void> {
    return await new Promise((resolve, reject) => {
      this.db.getConnection((connErr, conn) => {
        if (connErr) {
          reject(connErr);
        }

        conn.beginTransaction((txnErr) => {
          if (txnErr) {
            conn.rollback((rollbackErr) => reject(rollbackErr));
            reject(txnErr);
          }

          for (const query of queries) {
            conn.query(query, function (error, results, fields) {
              if (error) {
                conn.rollback((rollbackErr) => reject(rollbackErr));
                reject(error);
              } else {
                resolve();
              }
            });
          }

          conn.commit((commitErr) => {
            if (commitErr) {
              conn.rollback((err) => reject(err));
            }
            reject(commitErr);
          });

          conn.release();
        });
      });
    });
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
            resolve(Uint8Array.from(results[0].val));
          } else {
            resolve(null);
          }
        }
      });
    });
  }

  private async getValues(table: string): Promise<Uint8Array[]> {
    const results: Uint8Array[] = await new Promise((resolve, reject) => {
      this.db.query("SELECT `val` FROM " + table, function (error, results, fields) {
        if (error) {
          reject(error);
        } else {
          if (results.length > 0) {
            resolve(results.map((x: any) => Uint8Array.from(x.val)));
          } else {
            resolve([] as Uint8Array[]);
          }
        }
      });
    });
    return results;
  }

  private async putValue(table: string, key: string, value: Uint8Array): Promise<void> {
    return await new Promise((resolve, reject) => {
      this.db.query(this.putValueQuery(table, key, value), function (error, results, fields) {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  private async clearKey(table: string, key: string): Promise<void> {
    return await new Promise((resolve, reject) => {
      this.db.query(this.clearKeyQuery(table, key), function (error, results, fields) {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  private async initDB(state: WorldState): Promise<void> {
    // TODO: some general metadata must be put into this.db
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
    this.log.info("new transaction submitted", LOG_MEMPOOL, { txn: txn, txnHash: txnHash });
  }

  public async removePendingTransaction(txn: SignedTransaction): Promise<void> {
    const txnHash = hashSignedTransaction(txn);
    await this.clearKey("mempool", bytesToHex(txnHash));
    this.log.info("pending transaction removed", LOG_MEMPOOL, { txnHash: txnHash });
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

    const queries: string[] = [
      this.putValueQuery("main", DB_KEY_HEAD_BLOCK, nextBlockHash),
      this.putValueQuery("state", DB_KEY_STATE_VALUE, serializeWorldState(state)),
      this.putValueQuery("block", bytesToHex(nextBlockHash), rawBlock),
    ];
    const removedTxns: string[] = [];
    for (const txn of block.transactions) {
      const txnHash = bytesToHex(hashSignedTransaction(txn));
      if (await this.getValue("mempool", txnHash)) {
        queries.push(this.clearKeyQuery("mempool", txnHash));
        removedTxns.push(txnHash);
      }
    }

    await this.execQueriesInTxn(queries);

    this.log.info("block committed to storage", LOG_CHAIN, { blockHash: nextBlockHash });
    this.log.debug("new head block", LOG_CHAIN, { block: block, blockHash: nextBlockHash });
    if (removedTxns.length > 0) {
      this.log.info("pending transaction removed", LOG_MEMPOOL, { transactions: removedTxns });
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

  public async getDataChain(rootClaimHash: Uint8Array): Promise<DataChain | undefined> {
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

  public async getOffchainComputationParameters(): Promise<OffchainComputationParameters> {
    const rawState = await this.getValue("state", DB_KEY_STATE_VALUE);
    if (!rawState) {
      throw new Error("world state does not exist in database");
    }
    const state = deserializeWorldState(rawState);
    return state.offchainComputation;
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

function createInitialWorldState(minterAddr: Uint8Array): WorldState {
  const state: WorldState = {
    accounts: {},
    stakePool: {
      daVerifierPool: 0n,
      daVerifiers: [],
      stateVerifierPool: 0n,
      stateVerifiers: [],
    },
    minter: minterAddr,
    dataChains: {},
    offchainComputation: {
      DACommitteeSampleSize: DA_VERIFIER_COUNT,
      stateCommitteeSampleSize: STATE_VERIFIER_COUNT,
    },
  };

  const minterAddrHex = bytesToHex(minterAddr);
  state.accounts[minterAddrHex] = createAccount(minterAddr, 0n, 0n, 0n);

  return state;
}
