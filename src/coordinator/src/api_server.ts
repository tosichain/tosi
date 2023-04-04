import express, { Request, Response } from "express";
import cors from "cors";
import winston from "winston";

import { SignedTransaction, Account, Block, BlockMetadata, StakeType } from "../../blockchain/types";
import { serializeBlock } from "../../blockchain/serde";
import { stringifyAccount, stringifyAccounts } from "../../blockchain/util";

export interface RequestHandler {
  submitTransaction(txn: SignedTransaction): Promise<void>;
  getAccount(pubKey: string): Promise<Account | undefined>;
  getStakerList(stakeType: StakeType): Promise<Account[]>;
  getHeadBblockHash(): Promise<string>;
  getBlockMetadata(blockHash: string): Promise<BlockMetadata | undefined>;
  getBlock(blockHash: string): Promise<Block | undefined>;
  getIPFSMultiaddrs(): Promise<string[]>;
}

export interface APIServerConfig {
  port: number;
}

export class APIServer {
  private readonly config: APIServerConfig;
  private readonly log: winston.Logger;
  private readonly handler: RequestHandler;
  private readonly http: express.Application;

  constructor(config: APIServerConfig, logger: winston.Logger, handler: RequestHandler) {
    this.config = config;
    this.log = logger;
    this.handler = handler;

    this.http = express();
    this.http.use(cors());
    this.http.use(express.json({ type: ["application/json"] }));
    this.http.post("/api/transaction", this.submitTransaction.bind(this));
    this.http.get("/api/account/:pubKey", this.getAccount.bind(this));
    this.http.get("/api/daVerifiers", this.getDAVerifiers.bind(this));
    this.http.get("/api/stateVerifiers", this.getStateVerifiers.bind(this));
    this.http.get("/api/headBlockHash", this.getHeadBlockHash.bind(this));
    this.http.get("/api/blockMetadata/:blockHash", this.getBlockMetadata.bind(this));
    this.http.get("/api/block/:blockHash", this.getBlock.bind(this));
    this.http.get("/api/ipfsBootstrap", this.getIpfsBootstrap.bind(this));
    this.http.get("/health", this.health.bind(this));
  }

  public async start(): Promise<void> {
    this.http.listen(this.config.port, () => {
      this.log.info(`HTTP API server is listening on port ${this.config.port}`);
    });
  }

  private async submitTransaction(req: Request, res: Response): Promise<Response | void> {
    const from = req.body.from;
    if (!from) return res.status(400).send({ error: "missing sender public key" });
    const signature = req.body.signature;

    if (!signature) return res.status(400).send({ error: "missing transaction signature" });
    // TODO: validate each type of transaction in detail.
    const txn = req.body.txn;
    if (!txn) return res.status(400).send({ error: "missing transaction" });

    try {
      const txn = req.body as SignedTransaction;
      await this.handler.submitTransaction(txn);
      res.status(200).send({ message: "transaction submitted to mempool" });
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

  private async getHeadBlockHash(req: Request, res: Response): Promise<Response | void> {
    try {
      const blockHash = await this.handler.getHeadBblockHash();
      res.status(200).send({ blockHash: blockHash });
    } catch (err: any) {
      res.status(500).send({ error: err.message });
    }
  }

  private async getBlockMetadata(req: Request, res: Response): Promise<Response | void> {
    const blockHash = req.params.blockHash;
    if (!blockHash) return res.status(400).send({ error: "invalid block hash" });

    try {
      const blockMeta = await this.handler.getBlockMetadata(blockHash);
      if (!blockMeta) {
        res.status(404).send({ error: "block not found" });
        return;
      }
      res.status(200).send(blockMeta);
    } catch (err: any) {
      res.status(500).send({ error: err.message });
    }
  }

  private async getBlock(req: Request, res: Response): Promise<Response | void> {
    const blockHash = req.params.blockHash;
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

  private async health(req: Request, res: Response): Promise<Response | void> {
    res.status(200).send({ health: true });
  }

  private async getIpfsBootstrap(req: Request, res: Response): Promise<Response | void> {
    res.status(200).send(await this.handler.getIPFSMultiaddrs());
  }
}
