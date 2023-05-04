import { CID } from "ipfs-http-client";
import { Server, ServerCredentials, ServerUnaryCall, sendUnaryData } from "@grpc/grpc-js";

import { Transaction, Account, StakeType, DataChain, Block } from "../../blockchain/types";
import {
  transactionToPB,
  transactionFromPB,
  stakeTypeFromPB,
  accountToPB,
  dataChainToPB,
  blockToPB,
} from "../../blockchain/serde";
import { Transaction as PBTransaction } from "../../proto/grpcjs/blockchain_pb";
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
  GenerateCreateDataChainTxnRequest,
  GenerateCreateDataChainTxnResponse,
  GenerateUpdateDataChainTxnRequest,
  GenerateUpdateDataChainTxnResponse,
  SubmitTransactionRequest,
  SubmitTransactionResponse,
  GetSyncStatusRequest,
  GetSyncStatusResponse,
} from "../../proto/grpcjs/client_pb";
import { ClientNodeService, IClientNodeServer } from "../../proto/grpcjs/client_grpc_pb";
import { CreateDatachainParameters, UpdateDatachainParameters } from "./node";
import Logger from "../../log/logger";
import { Status } from "@grpc/grpc-js/build/src/constants";

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
  generateCreateDatachainTxn(params: CreateDatachainParameters): Promise<Transaction>;
  generateUpdateDatachainTxn(params: UpdateDatachainParameters): Promise<Transaction>;
  submitTransaction(txn: Transaction): Promise<void>;
  getSyncStatus(): Promise<boolean>;
}

export interface ClientNodeRPCServerConfig {
  port: number;
  noPrivileged: boolean;
}

export class ClientNodeRPCServer implements IClientNodeServer {
  [method: string]: any;

  private readonly config: ClientNodeRPCServerConfig;
  private readonly log: Logger;
  private readonly handler: RequestHandler;
  private readonly grpc: Server;

  constructor(config: ClientNodeRPCServerConfig, logger: Logger, handler: RequestHandler) {
    this.config = config;
    this.log = logger;
    this.handler = handler;
    this.grpc = new Server();

    this.grpc.addService(ClientNodeService, this);
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

  public generateCreateDataChainTxn(
    call: ServerUnaryCall<GenerateCreateDataChainTxnRequest, GenerateCreateDataChainTxnResponse>,
    callback: sendUnaryData<GenerateCreateDataChainTxnResponse>,
  ): void {
    if (this.config.noPrivileged) {
      return callback({ code: Status.PERMISSION_DENIED, message: "No privileged calls" });
    }
    const params: CreateDatachainParameters = {
      dataContractCID: CID.parse(call.request.getDataContractCid()),
      inputCID: CID.parse(call.request.getInputCid()),
      outputCID: CID.parse(call.request.getOutputCid()),
      outputFileHash: call.request.getOutputFileHash() as Uint8Array,
    };
    this.handler.generateCreateDatachainTxn(params).then((txn) => {
      const pbTxn = transactionToPB(txn);
      callback(null, new GenerateCreateDataChainTxnResponse().setTransaction(pbTxn));
    });
  }

  public generateUpdateDataChainTxn(
    call: ServerUnaryCall<GenerateUpdateDataChainTxnRequest, GenerateUpdateDataChainTxnResponse>,
    callback: sendUnaryData<GenerateUpdateDataChainTxnResponse>,
  ): void {
    if (this.config.noPrivileged) {
      return callback({ code: Status.PERMISSION_DENIED, message: "No privileged calls" });
    }
    const params: UpdateDatachainParameters = {
      dataContractCID: CID.parse(call.request.getDataContractCid()),
      inputCID: CID.parse(call.request.getInputCid()),
      outputCID: CID.parse(call.request.getOutputCid()),
      rootClaimHash: call.request.getRootClaimHash() as Uint8Array,
      outputFileHash: call.request.getOutputFileHash() as Uint8Array,
    };
    this.handler.generateUpdateDatachainTxn(params).then((txn) => {
      const pbTxn = transactionToPB(txn);
      callback(null, new GenerateUpdateDataChainTxnResponse().setTransaction(pbTxn));
    });
  }

  public sumbitTransaction(
    call: ServerUnaryCall<SubmitTransactionRequest, SubmitTransactionResponse>,
    callback: sendUnaryData<SubmitTransactionResponse>,
  ): void {
    if (this.config.noPrivileged) {
      return callback({ code: Status.PERMISSION_DENIED, message: "No privileged calls" });
    }
    const txn = transactionFromPB(call.request.getTransaction() as PBTransaction);
    this.handler.submitTransaction(txn).then(() => {
      callback(null, new SubmitTransactionResponse());
    });
  }

  public getSyncStatus(
    call: ServerUnaryCall<GetSyncStatusRequest, GetSyncStatusResponse>,
    callback: sendUnaryData<GetSyncStatusResponse>,
  ): void {
    this.handler.getSyncStatus().then((is_synced) => {
      callback(null, new GetSyncStatusResponse().setIsSynced(is_synced));
    });
  }
}
