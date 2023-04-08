import winston from "winston";
import fetch from "node-fetch";

import { SignedTransaction, Account, Block, BlockMetadata } from "../../blockchain/types";
import { deserializeBlock } from "../../blockchain/serde";
import { stringifySignedTransaction, parseAccount } from "../../blockchain/util";

export interface CoordinatorAPIClientConfig {
  apiURL: string;
}

export class CoordinatorAPIClient {
  private config: CoordinatorAPIClientConfig;
  private log: winston.Logger;

  constructor(config: CoordinatorAPIClientConfig, log: winston.Logger) {
    this.config = config;
    this.log = log;
  }

  public async submitTransaction(txn: SignedTransaction): Promise<void> {
    const url = `${this.config.apiURL}/transaction`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: stringifySignedTransaction(txn),
    });
    if (!response.ok) {
      throw new Error(`failed to submit transaction - status: ${response.status}`);
    }
  }

  public async getAccount(pubKey: string): Promise<Account | undefined> {
    const url = `${this.config.apiURL}/account/${pubKey}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });
    if (response.status == 404) {
      return undefined;
    } else if (!response.ok) {
      throw new Error(`failed to get account - status: ${response.status}`);
    }
    const account = parseAccount(await response.text());
    return account;
  }

  public async getDAVerifiers(): Promise<Account[]> {
    const url = `${this.config.apiURL}/daVerifiers`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });
    if (!response.ok) {
      throw new Error(`failed to get DA verifiers - status: ${response.status}`);
    }
    const stakers = (await response.json()) as Account[];
    return stakers;
  }

  public async getStateVerifiers(): Promise<Account[]> {
    const url = `${this.config.apiURL}/stateVerifiers`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });
    if (!response.ok) {
      throw new Error(`failed to get state verifiers - status: ${response.status}`);
    }
    const stakers = (await response.json()) as Account[];
    return stakers;
  }

  public async getHeadBblockHash(): Promise<string> {
    const url = `${this.config.apiURL}/headBlockHash`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });
    if (!response.ok) {
      throw new Error(`failed to get head block hash - status: ${response.status}`);
    }
    const result = (await response.json()) as any;
    return result.blockHash;
  }

  public async getBlockMetadata(blockHash: string): Promise<BlockMetadata | undefined> {
    const url = `${this.config.apiURL}/blockMetadata/${blockHash}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });
    if (response.status == 404) {
      return undefined;
    } else if (!response.ok) {
      throw new Error(`failed to get block metadata - status: ${response.status}`);
    }
    return (await response.json()) as BlockMetadata;
  }

  public async getBlock(blockHash: string): Promise<Block | undefined> {
    const url = `${this.config.apiURL}/block/${blockHash}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });
    if (response.status == 404) {
      return undefined;
    } else if (!response.ok) {
      throw new Error(`failed to get block - status: ${response.status}`);
    }
    const result = (await response.json()) as any;
    const rawBlock = new Uint8Array(Buffer.from(result.block, "base64"));
    return deserializeBlock(rawBlock);
  }

  public async getIpfsBootstrap(): Promise<string[] | undefined> {
    const url = `${this.config.apiURL}/ipfsBootstrap`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });
    if (response.status == 404) {
      return undefined;
    } else if (!response.ok) {
      throw new Error(`failed to get ipfs bootstrap - status: ${response.status}`);
    }
    return (await response.json()) as string[];
  }
}
