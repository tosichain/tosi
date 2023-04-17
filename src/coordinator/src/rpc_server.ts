import { Server, ServerCredentials, ServerUnaryCall, sendUnaryData } from "@grpc/grpc-js";
import winston from "winston";

import {
  SignedTransaction,
  Transaction,
  Account,
  StakeType,
  DataChain,
  Block,
  BlockMetadata,
} from "../../blockchain/types";
import {
  signedTransactionFromPB,
  transactionToPB,
  stakeTypeFromPB,
  accountToPB,
  dataChainToPB,
  blockToPB,
  blockMetadataToPB,
} from "../../blockchain/serde";
import { SignedTransaction as PBSignedTransaction } from "../../proto/grpcjs/blockchain_pb";
import {
  GetBlockRequest,
  GetBlockResponse,
  GetAccountRequest,
  GetAccountResponse,
  GetAccountTransactionsRequest,
  GetAccountTransactionsResponse,
  GetStakerListRequest,
  GetStakerListResponse,
  GetDataChainRequest,
  GetDataChainResponse,
  GetDataChainListRequest,
  GetDataChainListResponse,
  GetHeadBlockHashRequest,
  GetHeadBlockHashResponse,
  GetBLSPublicKeyRequest,
  GetBLSPublicKeyResponse,
  GetHealthRequest,
  GetHealthResponse,
  GetIPFSBootstrapRequest,
  GetIPFSBootstrapResponse,
} from "../../proto/grpcjs/node_pb";
import {
  SubmitSignedTransactionRequest,
  SubmitSignedTransactionResponse,
  GetBlockMetadataRequest,
  GetBlockMetadataResponse,
} from "../../proto/grpcjs/coordinator_pb";
import { CoordinatorNodeService, ICoordinatorNodeServer } from "../../proto/grpcjs/coordinator_grpc_pb";

export interface RequestHandler {
  getBlock(blockHash: Uint8Array): Promise<Block | undefined>;
  getAccount(address: Uint8Array): Promise<Account | undefined>;
  getAccountTransactions(address: Uint8Array): Promise<Transaction[] | undefined>;
  getStakerList(stakeType: StakeType): Promise<Account[]>;
  getDataChain(rootClaimHash: Uint8Array): Promise<DataChain | undefined>;
  getDataChainList(): Promise<DataChain[]>;
  getHeadBblockHash(): Promise<Uint8Array>;
  getBLSPublicKey(): Promise<Uint8Array>;
  getIPFSBootstrap(): Promise<string[]>;
  submitSignedTransaction(txn: SignedTransaction): Promise<void>;
  getBlockMetadata(blockHash: Uint8Array): Promise<BlockMetadata | undefined>;
}

export interface CoordinatorRPCServerConfig {
  port: number;
}

export class CoordinatorRPCServer implements ICoordinatorNodeServer {
  [method: string]: any;

  private readonly config: CoordinatorRPCServerConfig;
  private readonly log: winston.Logger;
  private readonly handler: RequestHandler;
  private readonly grpc: Server;

  constructor(config: CoordinatorRPCServerConfig, logger: winston.Logger, handler: RequestHandler) {
    this.config = config;
    this.log = logger;
    this.handler = handler;
    this.grpc = new Server();

    this.grpc.addService(CoordinatorNodeService, this);
  }

  public start(): void {
    const hostPort = `0.0.0.0:${this.config.port}`;
    this.grpc.bindAsync(hostPort, ServerCredentials.createInsecure(), (err: Error | null, port: number) => {
      if (err) {
        throw err;
      }
      this.log.info(`API server is listening on - ${hostPort}`);
      this.grpc.start();
    });
  }

  public getBlock(
    call: ServerUnaryCall<GetBlockRequest, GetBlockResponse>,
    callback: sendUnaryData<GetBlockResponse>,
  ): void {
    this.handler.getBlock(call.request.getBlockHash() as Uint8Array).then((block) => {
      const resp = new GetBlockResponse();
      if (block) {
        resp.setBlock(blockToPB(block));
      }
      callback(null, resp);
    });
  }

  public getAccount(
    call: ServerUnaryCall<GetAccountRequest, GetAccountResponse>,
    callback: sendUnaryData<GetAccountResponse>,
  ): void {
    this.handler.getAccount(call.request.getAccountAddress() as Uint8Array).then((account) => {
      const resp = new GetAccountResponse();
      if (account) {
        resp.setAccount(accountToPB(account));
      }
      callback(null, resp);
    });
  }

  public getAccountTransactions(
    call: ServerUnaryCall<GetAccountTransactionsRequest, GetAccountTransactionsResponse>,
    callback: sendUnaryData<GetAccountTransactionsResponse>,
  ): void {
    this.handler.getAccountTransactions(call.request.getAccountAddress() as Uint8Array).then((txns) => {
      const resp = new GetAccountTransactionsResponse();
      if (txns) {
        const pbTxns = txns.map((txn) => transactionToPB(txn));
        resp.setTransactionsList(pbTxns);
      }
      callback(null, resp);
    });
  }

  public getStakerList(
    call: ServerUnaryCall<GetStakerListRequest, GetStakerListResponse>,
    callback: sendUnaryData<GetStakerListResponse>,
  ): void {
    const stakeType = stakeTypeFromPB(call.request.getStakeType());
    this.handler.getStakerList(stakeType).then((stakers) => {
      const pbStakers = stakers.map((staker) => accountToPB(staker));
      callback(null, new GetStakerListResponse().setStakersList(pbStakers));
    });
  }

  public getDataChain(
    call: ServerUnaryCall<GetDataChainRequest, GetDataChainResponse>,
    callback: sendUnaryData<GetDataChainResponse>,
  ): void {
    this.handler.getDataChain(call.request.getRootClaimHash() as Uint8Array).then((chain) => {
      const resp = new GetDataChainResponse();
      if (chain) {
        resp.setDataChain(dataChainToPB(chain));
      }
      callback(null, resp);
    });
  }

  public getDataChainList(
    call: ServerUnaryCall<GetDataChainListRequest, GetDataChainListResponse>,
    callback: sendUnaryData<GetDataChainListResponse>,
  ): void {
    this.handler.getDataChainList().then((chains) => {
      const pbChains = chains.map((chain) => dataChainToPB(chain));
      callback(null, new GetDataChainListResponse().setDataChainsList(pbChains));
    });
  }

  public getHeadBlockHash(
    call: ServerUnaryCall<GetHeadBlockHashRequest, GetDataChainListResponse>,
    callback: sendUnaryData<GetHeadBlockHashResponse>,
  ): void {
    this.handler.getHeadBblockHash().then((blockHash) => {
      callback(null, new GetHeadBlockHashResponse().setBlockHash(blockHash));
    });
  }

  public getBLSPublicKey(
    call: ServerUnaryCall<GetBLSPublicKeyRequest, GetBLSPublicKeyResponse>,
    callback: sendUnaryData<GetBLSPublicKeyResponse>,
  ): void {
    this.handler.getBLSPublicKey().then((pubKey) => {
      callback(null, new GetBLSPublicKeyResponse().setPublicKey(pubKey));
    });
  }

  public getIPFSBootstrap(
    call: ServerUnaryCall<GetIPFSBootstrapRequest, GetIPFSBootstrapResponse>,
    callback: sendUnaryData<GetIPFSBootstrapResponse>,
  ): void {
    this.handler.getIPFSBootstrap().then((multiaddrs) => {
      callback(null, new GetIPFSBootstrapResponse().setMultiaddrsList(multiaddrs));
    });
  }

  public getHealth(
    call: ServerUnaryCall<GetHealthRequest, GetHealthResponse>,
    callback: sendUnaryData<GetHealthResponse>,
  ): void {
    callback(null, new GetHealthResponse().setIsHealthy(true));
  }

  public sumbitSignedTransaction(
    call: ServerUnaryCall<SubmitSignedTransactionRequest, SubmitSignedTransactionResponse>,
    callback: sendUnaryData<SubmitSignedTransactionResponse>,
  ): void {
    const txn = signedTransactionFromPB(call.request.getTransaction() as PBSignedTransaction);
    this.handler.submitSignedTransaction(txn).then(() => {
      callback(null, new SubmitSignedTransactionResponse());
    });
  }

  public getBlockMetadata(
    call: ServerUnaryCall<GetBlockMetadataRequest, GetBlockMetadataResponse>,
    callback: sendUnaryData<GetBlockMetadataResponse>,
  ): void {
    this.handler.getBlockMetadata(call.request.getBlockHash() as Uint8Array).then((meta) => {
      const resp = new GetBlockMetadataResponse();
      if (meta) {
        resp.setBlockMetadata(blockMetadataToPB(meta));
      }
      callback(null, resp);
    });
  }
}
