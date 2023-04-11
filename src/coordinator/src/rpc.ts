import { credentials } from "@grpc/grpc-js";

import {
  SignedTransaction,
  Transaction,
  StakeType,
  Account,
  DataChain,
  Block,
  BlockMetadata,
} from "../../blockchain/types";
import {
  signedTransactionToPB,
  transactionFromPB,
  stakeTypeToPB,
  accountFromPB,
  dataChainFromPB,
  blockFromPB,
  blockMetadataFromPB,
} from "../../blockchain/serde";
import { CoordinatorNodeClient } from "../../proto/grpcjs/coordinator_grpc_pb";
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
import { GetBlockMetadataRequest, SubmitSignedTransactionRequest } from "../../proto/grpcjs/coordinator_pb";

export interface CoordinatorRPCConfig {
  serverAddr: string;
}

export class CoordinatorRPC {
  private config: CoordinatorRPCConfig;
  private client: CoordinatorNodeClient;

  constructor(config: CoordinatorRPCConfig) {
    this.config = config;
    this.client = new CoordinatorNodeClient(config.serverAddr, credentials.createInsecure());
  }

  public async getBlock(blockHash: string): Promise<Block | undefined> {
    const req = new GetBlockRequest().setBlockHash(blockHash);
    return new Promise<Block | undefined>((resolve, reject) => {
      this.client.getBlock(req, (err, resp) => {
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
      this.client.getAccount(req, (err, resp) => {
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
      this.client.getAccountTransactions(req, (err, resp) => {
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
      this.client.getStakerList(req, (err, resp) => {
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
      this.client.getDataChain(req, (err, resp) => {
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
      this.client.getDataChainList(req, (err, resp) => {
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
      this.client.getHeadBlockHash(req, (err, resp) => {
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
      this.client.getBLSPublicKey(req, (err, resp) => {
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
      this.client.getIPFSBootstrap(req, (err, resp) => {
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
      this.client.getHealth(req, (err, resp) => {
        if (err) {
          return reject(err);
        }
        resolve(resp.getIsHealthy());
      });
    });
  }

  public async submitSignedTransaction(txn: SignedTransaction): Promise<void> {
    const req = new SubmitSignedTransactionRequest().setTransaction(signedTransactionToPB(txn));
    return new Promise<void>((resolve, reject) => {
      this.client.sumbitSignedTransaction(req, (err, resp) => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  }

  public async getBlockMetadata(blockHash: string): Promise<BlockMetadata | undefined> {
    const req = new GetBlockMetadataRequest().setBlockHash(blockHash);
    return await new Promise<BlockMetadata | undefined>((resolve, reject) => {
      this.client.getBlockMetadata(req, (err, resp) => {
        if (err) {
          return reject(err);
        }
        const pbMeta = resp.getBlockMetadata();
        pbMeta ? resolve(blockMetadataFromPB(pbMeta)) : resolve(undefined);
      });
    });
  }
}
