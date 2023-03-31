import { CID } from "ipfs-http-client";
import express, { Request, Response } from "express";
import cors from "cors";
import winston from "winston";

import { Transaction, Account, Block, DataChain, StakeType } from "../../blockchain/types";
import { serializeBlock } from "../../blockchain/serde";
import { stringifyTransaction, stringifyAccount, stringifyAccounts, stringifyDataChain } from "../../blockchain/util";
import { CreateDatachainParameters, UpdateDatachainParameters } from "./node";

export const GENERATE_TXN_CREATE_DATACHAIN = "createDatachain";
export const GENERATE_TXN_UPDATE_DATACHAIN = "updateDatachain";

export interface RequestHandler {
  generateCreateDatachainTxn(params: CreateDatachainParameters): Promise<Transaction>;
  generateUpdateDatachainTxn(params: UpdateDatachainParameters): Promise<Transaction>;
  submitTransaction(txn: Transaction): Promise<void>;
  getBlock(blockHash: string): Promise<Block | undefined>;
  getAccount(pubKey: string): Promise<Account | undefined>;
  getStakerList(stakeType: StakeType): Promise<Account[]>;
  getDataChain(rootClaimHash: string): Promise<DataChain | undefined>;
  getSyncStatus(): Promise<boolean>;
  getLatestBlockHash(): Promise<string>;
  getLatestLocalHash(): Promise<string>;
  getBlsPubKeyInHex(): Promise<string>;
  getDatachains(): Promise<DataChain[] | undefined>;
  getAccountHistory(pubKey: string): Promise<Transaction[] | undefined>;
}

export interface ClientNodeAPIServerConfig {
  port: number;
}

export class ClientNodeAPIServer {
  private readonly config: ClientNodeAPIServerConfig;
  private readonly log: winston.Logger;
  private readonly handler: RequestHandler;
  private readonly http: express.Application;

  constructor(config: ClientNodeAPIServerConfig, logger: winston.Logger, handler: RequestHandler) {
    this.config = config;
    this.log = logger;
    this.handler = handler;

    this.http = express();
    this.http.use(cors());
    this.http.use(express.json({ type: ["application/json"] }));
    this.http.post("/api/generateTxn/:txnType", this.generateTransaction.bind(this));
    this.http.post("/api/transaction", this.submitTransaction.bind(this));
    this.http.get("/api/block/:hash", this.getBlock.bind(this));
    this.http.get("/api/account/:pubKey", this.getAccount.bind(this));
    this.http.get("/api/daVerifiers", this.getDAVerifiers.bind(this));
    this.http.get("/api/stateVerifiers", this.getStateVerifiers.bind(this));
    this.http.get("/api/dataChain/:rootClaimHash", this.getDataChain.bind(this));
    this.http.get("/health", this.health.bind(this));
    this.http.get("/api/syncStatus", this.getSyncStatus.bind(this));
    this.http.get("/api/latestHash", this.getLatestBlockHash.bind(this));
    this.http.get("/api/latestLocalHash", this.getLatestLocalHash.bind(this));
    this.http.get("/api/blsPubKeyInHex", this.getBlsPubKeyInHex.bind(this));
    this.http.get("/api/datachains", this.getDatachains.bind(this));
    this.http.get("/api/history/:pubKey", this.getAccountHistory.bind(this));
  }

  public async start(): Promise<void> {
    this.http.listen(this.config.port, () => {
      this.log.info(`HTTP API server is listening on port ${this.config.port}`);
    });
  }

  private async generateTransaction(req: Request, res: Response): Promise<Response | void> {
    // TODO: validate each type of transaction in detail.
    const txnType = req.params.txnType;
    if (txnType != GENERATE_TXN_CREATE_DATACHAIN && txnType != GENERATE_TXN_UPDATE_DATACHAIN) {
      return res.status(400).send({ error: "invalid transaction type" });
    }

    try {
      if (txnType == GENERATE_TXN_CREATE_DATACHAIN) {
        const params: CreateDatachainParameters = {
          dataContractCID: CID.parse(req.body.dataContractCID),
          inputCID: CID.parse(req.body.inputCID),
          outputCID: CID.parse(req.body.outputCID),
        };
        const txn = await this.handler.generateCreateDatachainTxn(params);
        res.status(200).send(stringifyTransaction(txn));
      } else if (txnType == GENERATE_TXN_UPDATE_DATACHAIN) {
        const params: UpdateDatachainParameters = {
          dataContractCID: CID.parse(req.body.dataContractCID),
          inputCID: CID.parse(req.body.inputCID),
          outputCID: CID.parse(req.body.outputCID),
          rootClaimHash: req.body.rootClaimHash as string,
        };
        const txn = await this.handler.generateUpdateDatachainTxn(params);
        res.status(200).send(stringifyTransaction(txn));
      }
    } catch (err: any) {
      res.status(500).send({ error: err.message });
    }
  }

  private async submitTransaction(req: Request, res: Response): Promise<Response | void> {
    // TODO: validate each type of transaction in detail.
    try {
      const txn = req.body as Transaction;
      await this.handler.submitTransaction(txn);
      res.status(200).send({ message: "transaction submitted to mempool" });
    } catch (err: any) {
      res.status(500).send({ error: err.message });
    }
  }

  private async health(req: Request, res: Response): Promise<Response | void> {
    res.status(200).send({ health: true });
  }

  private async getBlock(req: Request, res: Response): Promise<Response | void> {
    const blockHash = req.params.hash;
    if (!blockHash) return res.status(400).send({ error: "invalid block hash" });

    try {
      const block = await this.handler.getBlock(blockHash);
      if (!block) {
        res.status(404).send({ error: "block not found" });
        return;
      }
      const rawBlock = serializeBlock(block);
      res.status(200).send({ block: Buffer.from(rawBlock).toString("base64") });
    } catch (err: any) {
      res.status(500).send({ error: err.message });
    }
  }

  private async getAccount(req: Request, res: Response): Promise<Response | void> {
    const pubKey = req.params.pubKey;
    if (!pubKey) return res.status(400).send({ error: "invalid account key" });

    try {
      const account = await this.handler.getAccount(pubKey);
      if (!account) {
        res.status(404).send({ error: "account not found" });
        return;
      }
      res.status(200).send(stringifyAccount(account));
    } catch (err: any) {
      res.status(500).send({ error: err.message });
    }
  }

  private async getDAVerifiers(req: Request, res: Response): Promise<Response | void> {
    try {
      const stakers = await this.handler.getStakerList(StakeType.DAVerifier);
      res.status(200).send(stringifyAccounts(stakers));
    } catch (err: any) {
      res.status(500).send({ error: err.message });
    }
  }

  private async getStateVerifiers(req: Request, res: Response): Promise<Response | void> {
    try {
      const stakers = await this.handler.getStakerList(StakeType.StateVerifier);
      res.status(200).send(stringifyAccounts(stakers));
    } catch (err: any) {
      res.status(500).send({ error: err.message });
    }
  }

  private async getDataChain(req: Request, res: Response): Promise<Response | void> {
    const rootClaimHash = req.params.rootClaimHash;
    if (!rootClaimHash) return res.status(400).send({ error: "invalid root claim hash" });

    try {
      const chain = await this.handler.getDataChain(rootClaimHash);
      if (!chain) {
        res.status(404).send({ error: "data chain not found" });
        return;
      }
      res.status(200).send(stringifyDataChain(chain));
    } catch (err: any) {
      res.status(500).send({ error: err.message });
    }
  }
  private async getSyncStatus(req: Request, res: Response): Promise<Response | void> {
    try {
      const syncStatus = await this.handler.getSyncStatus();
      res.status(200).send({ isSynced: syncStatus });
    } catch (err: any) {
      this.log.error(`failed to get block head hashes - ${err.message}`);
      res.status(500).send({ error: err.message });
    }
  }

  private async getLatestBlockHash(req: Request, res: Response): Promise<Response | void> {
    try {
      const latestHash = await this.handler.getLatestBlockHash();
      if (!latestHash) {
        return res.status(404).send({ error: "none" });
      }
      res.status(200).send({ blockHash: latestHash });
    } catch (err: any) {
      res.status(500).send({ error: err.message });
    }
  }

  private async getLatestLocalHash(req: Request, res: Response): Promise<Response | void> {
    try {
      const latestLocalHash = await this.handler.getLatestLocalHash();
      res.status(200).send({ blockHash: latestLocalHash });
    } catch (err: any) {
      this.log.error(`hash does not exist in database - ${err.message}`);
      res.status(500).send({ error: err.message });
    }
  }

  private async getBlsPubKeyInHex(req: Request, res: Response): Promise<Response | void> {
    try {
      const blsPubKeyInHex = await this.handler.getBlsPubKeyInHex();
      res.status(200).send({ blsPubKeyInHex });
    } catch (err: any) {
      res.status(500).send({ error: err.message });
    }
  }

  private async getDatachains(req: Request, res: Response): Promise<Response | void> {
    try {
      const chain = await this.handler.getDatachains();
      if (!chain) {
        res.status(404).send({ error: "data chain not found" });
        return;
      }
      res.status(200).send(chain);
    } catch (err: any) {
      res.status(500).send({ error: err.message });
    }
  }

  private async getAccountHistory(req: Request, res: Response): Promise<Response | void> {
    const pubkey = req.params.pubKey;
    try {
      const history = await this.handler.getAccountHistory(pubkey);
      if (!history) {
        res.status(404).send({ error: "history not found" });
        return;
      }
      res.status(200).send(history);
    } catch (err: any) {
      res.status(500).send({ error: err.message });
    }
  }
}
