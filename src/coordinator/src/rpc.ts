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
  private grpc: CoordinatorNodeClient;

  constructor(config: CoordinatorRPCConfig) {
    this.config = config;
    this.grpc = new CoordinatorNodeClient(config.serverAddr, credentials.createInsecure());
  }

  public async getBlock(blockHash: Uint8Array): Promise<Block | undefined> {
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

  public async getAccount(address: Uint8Array): Promise<Account | undefined> {
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

  public async getAccountTransactions(address: Uint8Array): Promise<Transaction[] | undefined> {
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

  public async getDataChain(rootClaimHash: Uint8Array): Promise<DataChain | undefined> {
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

  public async getHeadBlockHash(): Promise<Uint8Array> {
    const req = new GetHeadBlockHashRequest();
    return new Promise<Uint8Array>((resolve, reject) => {
      this.grpc.getHeadBlockHash(req, (err, resp) => {
        if (err) {
          return reject(err);
        }
        resolve(resp.getBlockHash() as Uint8Array);
      });
    });
  }

  public async getBLSPublicKey(): Promise<Uint8Array> {
    const req = new GetBLSPublicKeyRequest();
    return new Promise<Uint8Array>((resolve, reject) => {
      this.grpc.getBLSPublicKey(req, (err, resp) => {
        if (err) {
          return reject(err);
        }
        resolve(resp.getPublicKey() as Uint8Array);
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

  public async submitSignedTransaction(txn: SignedTransaction): Promise<void> {
    const req = new SubmitSignedTransactionRequest().setTransaction(signedTransactionToPB(txn));
    return new Promise<void>((resolve, reject) => {
      this.grpc.sumbitSignedTransaction(req, (err, resp) => {
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
      this.grpc.getBlockMetadata(req, (err, resp) => {
        if (err) {
          return reject(err);
        }
        const pbMeta = resp.getBlockMetadata();
        pbMeta ? resolve(blockMetadataFromPB(pbMeta)) : resolve(undefined);
      });
    });
  }
}
