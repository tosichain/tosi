import { credentials } from "@grpc/grpc-js";

import { Transaction, StakeType, Account, DataChain, Block } from "../../blockchain/types";
import {
  transactionFromPB,
  transactionToPB,
  stakeTypeToPB,
  accountFromPB,
  dataChainFromPB,
  blockFromPB,
} from "../../blockchain/serde";
import { CreateDatachainParameters, UpdateDatachainParameters } from "./node";
import { Transaction as PBTransaction } from "../../proto/grpcjs/blockchain_pb";
import {
  GetAccountRequest,
  GetAccountTransactionsRequest,
  GetStakerListRequest,
  GetDataChainRequest,
  GetDataChainListRequest,
  GetBlockRequest,
  GetHeadBlockHashRequest,
  GetBLSPublicKeyRequest,
  GetIPFSBootstrapRequest,
  GetHealthRequest,
} from "../../proto/grpcjs/node_pb";
import {
  GenerateCreateDataChainTxnRequest,
  GenerateUpdateDataChainTxnRequest,
  SubmitTransactionRequest,
  GetSyncStatusRequest,
} from "../../proto/grpcjs/client_pb";
import { ClientNodeClient } from "../../proto/grpcjs/client_grpc_pb";

export interface ClientRPCConfig {
  serverAddr: string;
}

export class ClientRPC {
  private config: ClientRPCConfig;
  private grpc: ClientNodeClient;

  constructor(config: ClientRPCConfig) {
    this.config = config;
    this.grpc = new ClientNodeClient(config.serverAddr, credentials.createInsecure());
  }

  public async getBlock(blockHash: string): Promise<Block | undefined> {
    const req = new GetBlockRequest().setBlockHash(blockHash);
    return new Promise<Block | undefined>((resolve, reject) => {
      this.grpc.getBlock(req, (err, resp) => {
        if (err) {
          return reject(err);
        }
        const pb = resp.getBlock();
        pb ? resolve(blockFromPB(pb)) : resolve(undefined);
      });
    });
  }

  public async getAccount(address: string): Promise<Account | undefined> {
    const req = new GetAccountRequest().setAccountAddress(address);
    return new Promise<Account | undefined>((resolve, reject) => {
      this.grpc.getAccount(req, (err, resp) => {
        if (err) {
          return reject(err);
        }
        const pb = resp.getAccount();
        pb ? resolve(accountFromPB(pb)) : resolve(undefined);
      });
    });
  }

  public async getAccountTransactions(address: string): Promise<Transaction[] | undefined> {
    const req = new GetAccountTransactionsRequest().setAccountAddress(address);
    return new Promise<Transaction[] | undefined>((resolve, reject) => {
      this.grpc.getAccountTransactions(req, (err, resp) => {
        if (err) {
          return reject(err);
        }
        const pb = resp.getTransactionsList();
        if (pb) {
          const txns = resp.getTransactionsList().map((txn) => transactionFromPB(txn));
          resolve(txns);
        } else {
          resolve(undefined);
        }
      });
    });
  }

  public async getStakerList(stakeType: StakeType): Promise<Account[]> {
    const req = new GetStakerListRequest().setStakeType(stakeTypeToPB(stakeType));
    return new Promise<Account[]>((resolve, reject) => {
      this.grpc.getStakerList(req, (err, resp) => {
        if (err) {
          return reject(err);
        }
        const stakers = resp.getStakersList().map((staker) => accountFromPB(staker));
        resolve(stakers);
      });
    });
  }

  public async getDataChain(rootClaimHash: string): Promise<DataChain | undefined> {
    const req = new GetDataChainRequest().setRootClaimHash(rootClaimHash);
    return new Promise<DataChain | undefined>((resolve, reject) => {
      this.grpc.getDataChain(req, (err, resp) => {
        if (err) {
          return reject(err);
        }
        const pb = resp.getDataChain();
        pb ? resolve(dataChainFromPB(pb)) : resolve(undefined);
      });
    });
  }

  public async getDataChainList(): Promise<DataChain[]> {
    const req = new GetDataChainListRequest();
    return new Promise<DataChain[]>((resolve, reject) => {
      this.grpc.getDataChainList(req, (err, resp) => {
        if (err) {
          return reject(err);
        }
        const chains = resp.getDataChainsList().map((chain) => dataChainFromPB(chain));
        resolve(chains);
      });
    });
  }

  public async getHeadBlockHash(): Promise<string> {
    const req = new GetHeadBlockHashRequest();
    return new Promise<string>((resolve, reject) => {
      this.grpc.getHeadBlockHash(req, (err, resp) => {
        if (err) {
          return reject(err);
        }
        resolve(resp.getBlockHash());
      });
    });
  }

  public async getBLSPublicKey(): Promise<string> {
    const req = new GetBLSPublicKeyRequest();
    return new Promise<string>((resolve, reject) => {
      this.grpc.getBLSPublicKey(req, (err, resp) => {
        if (err) {
          return reject(err);
        }
        resolve(resp.getPublicKey());
      });
    });
  }

  public async getIPFSBootstrap(): Promise<string[]> {
    const req = new GetIPFSBootstrapRequest();
    return new Promise<string[]>((resolve, reject) => {
      this.grpc.getIPFSBootstrap(req, (err, resp) => {
        if (err) {
          return reject(err);
        }
        resolve(resp.getMultiaddrsList());
      });
    });
  }

  public async getHealth(): Promise<boolean> {
    const req = new GetHealthRequest();
    return new Promise<boolean>((resolve, reject) => {
      this.grpc.getHealth(req, (err, resp) => {
        if (err) {
          return reject(err);
        }
        resolve(resp.getIsHealthy());
      });
    });
  }

  public async generateCreateDatachainTxn(params: CreateDatachainParameters): Promise<Transaction> {
    const req = new GenerateCreateDataChainTxnRequest()
      .setDataContractCid(params.dataContractCID.toString())
      .setInputCid(params.inputCID.toString())
      .setOutputCid(params.outputCID.toString());
    return new Promise<Transaction>((resolve, reject) => {
      this.grpc.generateCreateDataChainTxn(req, (err, resp) => {
        if (err) {
          return reject(err);
        }
        const txn = transactionFromPB(resp.getTransaction() as PBTransaction);
        resolve(txn);
      });
    });
  }

  public async generateUpdateDatachainTxn(params: UpdateDatachainParameters): Promise<Transaction> {
    const req = new GenerateUpdateDataChainTxnRequest()
      .setDataContractCid(params.dataContractCID.toString())
      .setInputCid(params.inputCID.toString())
      .setOutputCid(params.outputCID.toString())
      .setRootClaimHash(params.rootClaimHash);
    return new Promise<Transaction>((resolve, reject) => {
      this.grpc.generateUpdateDataChainTxn(req, (err, resp) => {
        if (err) {
          return reject(err);
        }
        const txn = transactionFromPB(resp.getTransaction() as PBTransaction);
        resolve(txn);
      });
    });
  }

  public async submitTransaction(txn: Transaction): Promise<void> {
    const req = new SubmitTransactionRequest().setTransaction(transactionToPB(txn));
    return new Promise<void>((resolve, reject) => {
      this.grpc.sumbitTransaction(req, (err, resp) => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  }

  public async getSyncStatus(): Promise<boolean> {
    const req = new GetSyncStatusRequest();
    return new Promise<boolean>((resolve, reject) => {
      this.grpc.getSyncStatus(req, (err, resp) => {
        if (err) {
          return reject(err);
        }
        resolve(resp.getIsSynced());
      });
    });
  }
}
