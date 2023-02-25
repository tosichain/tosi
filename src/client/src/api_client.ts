import winston from "winston";
import fetch from "node-fetch";

import { Transaction, Account, Block, ComputeChain } from "../../blockchain/types";
import { stringifyTransaction } from "../../blockchain/util";
import { deserializeBlock } from "../../blockchain/serde";
import { CreateDatachainParameters, UpdateDatachainParameters } from "./node";
import { GENERATE_TXN_CREATE_DATACHAIN, GENERATE_TXN_UPDATE_DATACHAIN } from "./api_server";

export interface ClientNodeAPIClientConfig {
  apiURL: string;
}

export class ClientNodeAPIClient {
  private config: ClientNodeAPIClientConfig;
  private log: winston.Logger;

  constructor(config: ClientNodeAPIClientConfig, log: winston.Logger) {
    this.config = config;
    this.log = log;
  }

  public async generateCreateDatachainTxn(params: CreateDatachainParameters): Promise<Transaction> {
    const url = `${this.config.apiURL}/generateTxn/${GENERATE_TXN_CREATE_DATACHAIN}`;
    const body = {
      appCID: params.appCID.toString(),
      courtCID: params.courtCID.toString(),
      inputCID: params.inputCID.toString(),
      outputCID: params.outputCID.toString(),
    };
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`failed to generate CreateDatachain transaction - status: ${response.status}`);
    }
    return (await response.json()) as Transaction;
  }

  public async generateUpdateDatachainTxn(params: UpdateDatachainParameters): Promise<Transaction> {
    const url = `${this.config.apiURL}/generateTxn/${GENERATE_TXN_UPDATE_DATACHAIN}`;
    const body = {
      appCID: params.appCID.toString(),
      courtCID: params.courtCID.toString(),
      inputCID: params.inputCID.toString(),
      outputCID: params.outputCID.toString(),
      rootClaimHash: params.rootClaimHash,
    };
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`failed to generate UpdateDatachain transaction - status: ${response.status}`);
    }
    return (await response.json()) as Transaction;
  }

  public async submitTransaction(txn: Transaction): Promise<void> {
    const url = `${this.config.apiURL}/transaction`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: stringifyTransaction(txn),
    });
    if (!response.ok) {
      throw new Error(`failed to submit transaction - status: ${response.status}`);
    }
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
    const result = await response.json();
    const account: Account = {
      nonce: result.nonce,
      balance: BigInt(result.balance),
      stake: BigInt(result.stake),
    };
    return account;
  }

  public async getStakerList(): Promise<Record<string, Account>> {
    const url = `${this.config.apiURL}/stakers`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });
    if (!response.ok) {
      throw new Error(`failed to get staker list - status: ${response.status}`);
    }
    return (await response.json()) as Record<string, Account>;
  }

  public async getDataChain(rootClaimHash: string): Promise<ComputeChain | undefined> {
    const url = `${this.config.apiURL}/dataChain/${rootClaimHash}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });
    if (response.status == 404) {
      return undefined;
    } else if (!response.ok) {
      throw new Error(`failed to get data chain - status: ${response.status}`);
    }
    const result = await response.json();
    return result as ComputeChain;
  }

  public async getSyncStatus(): Promise<boolean> {
    const url = `${this.config.apiURL}/syncStatus`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });
    if (!response.ok) {
      throw new Error(`failed to get sync status: ${response.status}`);
    }
    return (await response.json()).isSynced;
  }

  public async getLatestLocalHash(): Promise<string> {
    const url = `${this.config.apiURL}/latestLocalHash`;
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
}
