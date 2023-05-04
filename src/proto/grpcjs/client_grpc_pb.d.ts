// package: client
// file: client.proto

/* tslint:disable */
/* eslint-disable */

import * as grpc from "@grpc/grpc-js";
import * as client_pb from "./client_pb";
import * as blockchain_pb from "./blockchain_pb";
import * as node_pb from "./node_pb";

interface IClientNodeService extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
    getBlock: IClientNodeService_IGetBlock;
    getAccount: IClientNodeService_IGetAccount;
    getAccountTransactions: IClientNodeService_IGetAccountTransactions;
    getStakerList: IClientNodeService_IGetStakerList;
    getDataChain: IClientNodeService_IGetDataChain;
    getDataChainList: IClientNodeService_IGetDataChainList;
    getHeadBlockHash: IClientNodeService_IGetHeadBlockHash;
    getBLSPublicKey: IClientNodeService_IGetBLSPublicKey;
    getIPFSBootstrap: IClientNodeService_IGetIPFSBootstrap;
    getHealth: IClientNodeService_IGetHealth;
    generateCreateDataChainTxn: IClientNodeService_IGenerateCreateDataChainTxn;
    generateUpdateDataChainTxn: IClientNodeService_IGenerateUpdateDataChainTxn;
    submitTransaction: IClientNodeService_ISubmitTransaction;
    getSyncStatus: IClientNodeService_IGetSyncStatus;
}

interface IClientNodeService_IGetBlock extends grpc.MethodDefinition<node_pb.GetBlockRequest, node_pb.GetBlockResponse> {
    path: "/client.ClientNode/GetBlock";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<node_pb.GetBlockRequest>;
    requestDeserialize: grpc.deserialize<node_pb.GetBlockRequest>;
    responseSerialize: grpc.serialize<node_pb.GetBlockResponse>;
    responseDeserialize: grpc.deserialize<node_pb.GetBlockResponse>;
}
interface IClientNodeService_IGetAccount extends grpc.MethodDefinition<node_pb.GetAccountRequest, node_pb.GetAccountResponse> {
    path: "/client.ClientNode/GetAccount";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<node_pb.GetAccountRequest>;
    requestDeserialize: grpc.deserialize<node_pb.GetAccountRequest>;
    responseSerialize: grpc.serialize<node_pb.GetAccountResponse>;
    responseDeserialize: grpc.deserialize<node_pb.GetAccountResponse>;
}
interface IClientNodeService_IGetAccountTransactions extends grpc.MethodDefinition<node_pb.GetAccountTransactionsRequest, node_pb.GetAccountTransactionsResponse> {
    path: "/client.ClientNode/GetAccountTransactions";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<node_pb.GetAccountTransactionsRequest>;
    requestDeserialize: grpc.deserialize<node_pb.GetAccountTransactionsRequest>;
    responseSerialize: grpc.serialize<node_pb.GetAccountTransactionsResponse>;
    responseDeserialize: grpc.deserialize<node_pb.GetAccountTransactionsResponse>;
}
interface IClientNodeService_IGetStakerList extends grpc.MethodDefinition<node_pb.GetStakerListRequest, node_pb.GetStakerListResponse> {
    path: "/client.ClientNode/GetStakerList";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<node_pb.GetStakerListRequest>;
    requestDeserialize: grpc.deserialize<node_pb.GetStakerListRequest>;
    responseSerialize: grpc.serialize<node_pb.GetStakerListResponse>;
    responseDeserialize: grpc.deserialize<node_pb.GetStakerListResponse>;
}
interface IClientNodeService_IGetDataChain extends grpc.MethodDefinition<node_pb.GetDataChainRequest, node_pb.GetDataChainResponse> {
    path: "/client.ClientNode/GetDataChain";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<node_pb.GetDataChainRequest>;
    requestDeserialize: grpc.deserialize<node_pb.GetDataChainRequest>;
    responseSerialize: grpc.serialize<node_pb.GetDataChainResponse>;
    responseDeserialize: grpc.deserialize<node_pb.GetDataChainResponse>;
}
interface IClientNodeService_IGetDataChainList extends grpc.MethodDefinition<node_pb.GetDataChainListRequest, node_pb.GetDataChainListResponse> {
    path: "/client.ClientNode/GetDataChainList";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<node_pb.GetDataChainListRequest>;
    requestDeserialize: grpc.deserialize<node_pb.GetDataChainListRequest>;
    responseSerialize: grpc.serialize<node_pb.GetDataChainListResponse>;
    responseDeserialize: grpc.deserialize<node_pb.GetDataChainListResponse>;
}
interface IClientNodeService_IGetHeadBlockHash extends grpc.MethodDefinition<node_pb.GetHeadBlockHashRequest, node_pb.GetHeadBlockHashResponse> {
    path: "/client.ClientNode/GetHeadBlockHash";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<node_pb.GetHeadBlockHashRequest>;
    requestDeserialize: grpc.deserialize<node_pb.GetHeadBlockHashRequest>;
    responseSerialize: grpc.serialize<node_pb.GetHeadBlockHashResponse>;
    responseDeserialize: grpc.deserialize<node_pb.GetHeadBlockHashResponse>;
}
interface IClientNodeService_IGetBLSPublicKey extends grpc.MethodDefinition<node_pb.GetBLSPublicKeyRequest, node_pb.GetBLSPublicKeyResponse> {
    path: "/client.ClientNode/GetBLSPublicKey";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<node_pb.GetBLSPublicKeyRequest>;
    requestDeserialize: grpc.deserialize<node_pb.GetBLSPublicKeyRequest>;
    responseSerialize: grpc.serialize<node_pb.GetBLSPublicKeyResponse>;
    responseDeserialize: grpc.deserialize<node_pb.GetBLSPublicKeyResponse>;
}
interface IClientNodeService_IGetIPFSBootstrap extends grpc.MethodDefinition<node_pb.GetIPFSBootstrapRequest, node_pb.GetIPFSBootstrapResponse> {
    path: "/client.ClientNode/GetIPFSBootstrap";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<node_pb.GetIPFSBootstrapRequest>;
    requestDeserialize: grpc.deserialize<node_pb.GetIPFSBootstrapRequest>;
    responseSerialize: grpc.serialize<node_pb.GetIPFSBootstrapResponse>;
    responseDeserialize: grpc.deserialize<node_pb.GetIPFSBootstrapResponse>;
}
interface IClientNodeService_IGetHealth extends grpc.MethodDefinition<node_pb.GetHealthRequest, node_pb.GetHealthResponse> {
    path: "/client.ClientNode/GetHealth";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<node_pb.GetHealthRequest>;
    requestDeserialize: grpc.deserialize<node_pb.GetHealthRequest>;
    responseSerialize: grpc.serialize<node_pb.GetHealthResponse>;
    responseDeserialize: grpc.deserialize<node_pb.GetHealthResponse>;
}
interface IClientNodeService_IGenerateCreateDataChainTxn extends grpc.MethodDefinition<client_pb.GenerateCreateDataChainTxnRequest, client_pb.GenerateCreateDataChainTxnResponse> {
    path: "/client.ClientNode/GenerateCreateDataChainTxn";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<client_pb.GenerateCreateDataChainTxnRequest>;
    requestDeserialize: grpc.deserialize<client_pb.GenerateCreateDataChainTxnRequest>;
    responseSerialize: grpc.serialize<client_pb.GenerateCreateDataChainTxnResponse>;
    responseDeserialize: grpc.deserialize<client_pb.GenerateCreateDataChainTxnResponse>;
}
interface IClientNodeService_IGenerateUpdateDataChainTxn extends grpc.MethodDefinition<client_pb.GenerateUpdateDataChainTxnRequest, client_pb.GenerateUpdateDataChainTxnResponse> {
    path: "/client.ClientNode/GenerateUpdateDataChainTxn";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<client_pb.GenerateUpdateDataChainTxnRequest>;
    requestDeserialize: grpc.deserialize<client_pb.GenerateUpdateDataChainTxnRequest>;
    responseSerialize: grpc.serialize<client_pb.GenerateUpdateDataChainTxnResponse>;
    responseDeserialize: grpc.deserialize<client_pb.GenerateUpdateDataChainTxnResponse>;
}
interface IClientNodeService_ISubmitTransaction extends grpc.MethodDefinition<client_pb.SubmitTransactionRequest, client_pb.SubmitTransactionResponse> {
    path: "/client.ClientNode/SubmitTransaction";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<client_pb.SubmitTransactionRequest>;
    requestDeserialize: grpc.deserialize<client_pb.SubmitTransactionRequest>;
    responseSerialize: grpc.serialize<client_pb.SubmitTransactionResponse>;
    responseDeserialize: grpc.deserialize<client_pb.SubmitTransactionResponse>;
}
interface IClientNodeService_IGetSyncStatus extends grpc.MethodDefinition<client_pb.GetSyncStatusRequest, client_pb.GetSyncStatusResponse> {
    path: "/client.ClientNode/GetSyncStatus";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<client_pb.GetSyncStatusRequest>;
    requestDeserialize: grpc.deserialize<client_pb.GetSyncStatusRequest>;
    responseSerialize: grpc.serialize<client_pb.GetSyncStatusResponse>;
    responseDeserialize: grpc.deserialize<client_pb.GetSyncStatusResponse>;
}

export const ClientNodeService: IClientNodeService;

export interface IClientNodeServer extends grpc.UntypedServiceImplementation {
    getBlock: grpc.handleUnaryCall<node_pb.GetBlockRequest, node_pb.GetBlockResponse>;
    getAccount: grpc.handleUnaryCall<node_pb.GetAccountRequest, node_pb.GetAccountResponse>;
    getAccountTransactions: grpc.handleUnaryCall<node_pb.GetAccountTransactionsRequest, node_pb.GetAccountTransactionsResponse>;
    getStakerList: grpc.handleUnaryCall<node_pb.GetStakerListRequest, node_pb.GetStakerListResponse>;
    getDataChain: grpc.handleUnaryCall<node_pb.GetDataChainRequest, node_pb.GetDataChainResponse>;
    getDataChainList: grpc.handleUnaryCall<node_pb.GetDataChainListRequest, node_pb.GetDataChainListResponse>;
    getHeadBlockHash: grpc.handleUnaryCall<node_pb.GetHeadBlockHashRequest, node_pb.GetHeadBlockHashResponse>;
    getBLSPublicKey: grpc.handleUnaryCall<node_pb.GetBLSPublicKeyRequest, node_pb.GetBLSPublicKeyResponse>;
    getIPFSBootstrap: grpc.handleUnaryCall<node_pb.GetIPFSBootstrapRequest, node_pb.GetIPFSBootstrapResponse>;
    getHealth: grpc.handleUnaryCall<node_pb.GetHealthRequest, node_pb.GetHealthResponse>;
    generateCreateDataChainTxn: grpc.handleUnaryCall<client_pb.GenerateCreateDataChainTxnRequest, client_pb.GenerateCreateDataChainTxnResponse>;
    generateUpdateDataChainTxn: grpc.handleUnaryCall<client_pb.GenerateUpdateDataChainTxnRequest, client_pb.GenerateUpdateDataChainTxnResponse>;
    submitTransaction: grpc.handleUnaryCall<client_pb.SubmitTransactionRequest, client_pb.SubmitTransactionResponse>;
    getSyncStatus: grpc.handleUnaryCall<client_pb.GetSyncStatusRequest, client_pb.GetSyncStatusResponse>;
}

export interface IClientNodeClient {
    getBlock(request: node_pb.GetBlockRequest, callback: (error: grpc.ServiceError | null, response: node_pb.GetBlockResponse) => void): grpc.ClientUnaryCall;
    getBlock(request: node_pb.GetBlockRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: node_pb.GetBlockResponse) => void): grpc.ClientUnaryCall;
    getBlock(request: node_pb.GetBlockRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: node_pb.GetBlockResponse) => void): grpc.ClientUnaryCall;
    getAccount(request: node_pb.GetAccountRequest, callback: (error: grpc.ServiceError | null, response: node_pb.GetAccountResponse) => void): grpc.ClientUnaryCall;
    getAccount(request: node_pb.GetAccountRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: node_pb.GetAccountResponse) => void): grpc.ClientUnaryCall;
    getAccount(request: node_pb.GetAccountRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: node_pb.GetAccountResponse) => void): grpc.ClientUnaryCall;
    getAccountTransactions(request: node_pb.GetAccountTransactionsRequest, callback: (error: grpc.ServiceError | null, response: node_pb.GetAccountTransactionsResponse) => void): grpc.ClientUnaryCall;
    getAccountTransactions(request: node_pb.GetAccountTransactionsRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: node_pb.GetAccountTransactionsResponse) => void): grpc.ClientUnaryCall;
    getAccountTransactions(request: node_pb.GetAccountTransactionsRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: node_pb.GetAccountTransactionsResponse) => void): grpc.ClientUnaryCall;
    getStakerList(request: node_pb.GetStakerListRequest, callback: (error: grpc.ServiceError | null, response: node_pb.GetStakerListResponse) => void): grpc.ClientUnaryCall;
    getStakerList(request: node_pb.GetStakerListRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: node_pb.GetStakerListResponse) => void): grpc.ClientUnaryCall;
    getStakerList(request: node_pb.GetStakerListRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: node_pb.GetStakerListResponse) => void): grpc.ClientUnaryCall;
    getDataChain(request: node_pb.GetDataChainRequest, callback: (error: grpc.ServiceError | null, response: node_pb.GetDataChainResponse) => void): grpc.ClientUnaryCall;
    getDataChain(request: node_pb.GetDataChainRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: node_pb.GetDataChainResponse) => void): grpc.ClientUnaryCall;
    getDataChain(request: node_pb.GetDataChainRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: node_pb.GetDataChainResponse) => void): grpc.ClientUnaryCall;
    getDataChainList(request: node_pb.GetDataChainListRequest, callback: (error: grpc.ServiceError | null, response: node_pb.GetDataChainListResponse) => void): grpc.ClientUnaryCall;
    getDataChainList(request: node_pb.GetDataChainListRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: node_pb.GetDataChainListResponse) => void): grpc.ClientUnaryCall;
    getDataChainList(request: node_pb.GetDataChainListRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: node_pb.GetDataChainListResponse) => void): grpc.ClientUnaryCall;
    getHeadBlockHash(request: node_pb.GetHeadBlockHashRequest, callback: (error: grpc.ServiceError | null, response: node_pb.GetHeadBlockHashResponse) => void): grpc.ClientUnaryCall;
    getHeadBlockHash(request: node_pb.GetHeadBlockHashRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: node_pb.GetHeadBlockHashResponse) => void): grpc.ClientUnaryCall;
    getHeadBlockHash(request: node_pb.GetHeadBlockHashRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: node_pb.GetHeadBlockHashResponse) => void): grpc.ClientUnaryCall;
    getBLSPublicKey(request: node_pb.GetBLSPublicKeyRequest, callback: (error: grpc.ServiceError | null, response: node_pb.GetBLSPublicKeyResponse) => void): grpc.ClientUnaryCall;
    getBLSPublicKey(request: node_pb.GetBLSPublicKeyRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: node_pb.GetBLSPublicKeyResponse) => void): grpc.ClientUnaryCall;
    getBLSPublicKey(request: node_pb.GetBLSPublicKeyRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: node_pb.GetBLSPublicKeyResponse) => void): grpc.ClientUnaryCall;
    getIPFSBootstrap(request: node_pb.GetIPFSBootstrapRequest, callback: (error: grpc.ServiceError | null, response: node_pb.GetIPFSBootstrapResponse) => void): grpc.ClientUnaryCall;
    getIPFSBootstrap(request: node_pb.GetIPFSBootstrapRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: node_pb.GetIPFSBootstrapResponse) => void): grpc.ClientUnaryCall;
    getIPFSBootstrap(request: node_pb.GetIPFSBootstrapRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: node_pb.GetIPFSBootstrapResponse) => void): grpc.ClientUnaryCall;
    getHealth(request: node_pb.GetHealthRequest, callback: (error: grpc.ServiceError | null, response: node_pb.GetHealthResponse) => void): grpc.ClientUnaryCall;
    getHealth(request: node_pb.GetHealthRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: node_pb.GetHealthResponse) => void): grpc.ClientUnaryCall;
    getHealth(request: node_pb.GetHealthRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: node_pb.GetHealthResponse) => void): grpc.ClientUnaryCall;
    generateCreateDataChainTxn(request: client_pb.GenerateCreateDataChainTxnRequest, callback: (error: grpc.ServiceError | null, response: client_pb.GenerateCreateDataChainTxnResponse) => void): grpc.ClientUnaryCall;
    generateCreateDataChainTxn(request: client_pb.GenerateCreateDataChainTxnRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: client_pb.GenerateCreateDataChainTxnResponse) => void): grpc.ClientUnaryCall;
    generateCreateDataChainTxn(request: client_pb.GenerateCreateDataChainTxnRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: client_pb.GenerateCreateDataChainTxnResponse) => void): grpc.ClientUnaryCall;
    generateUpdateDataChainTxn(request: client_pb.GenerateUpdateDataChainTxnRequest, callback: (error: grpc.ServiceError | null, response: client_pb.GenerateUpdateDataChainTxnResponse) => void): grpc.ClientUnaryCall;
    generateUpdateDataChainTxn(request: client_pb.GenerateUpdateDataChainTxnRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: client_pb.GenerateUpdateDataChainTxnResponse) => void): grpc.ClientUnaryCall;
    generateUpdateDataChainTxn(request: client_pb.GenerateUpdateDataChainTxnRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: client_pb.GenerateUpdateDataChainTxnResponse) => void): grpc.ClientUnaryCall;
    submitTransaction(request: client_pb.SubmitTransactionRequest, callback: (error: grpc.ServiceError | null, response: client_pb.SubmitTransactionResponse) => void): grpc.ClientUnaryCall;
    submitTransaction(request: client_pb.SubmitTransactionRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: client_pb.SubmitTransactionResponse) => void): grpc.ClientUnaryCall;
    submitTransaction(request: client_pb.SubmitTransactionRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: client_pb.SubmitTransactionResponse) => void): grpc.ClientUnaryCall;
    getSyncStatus(request: client_pb.GetSyncStatusRequest, callback: (error: grpc.ServiceError | null, response: client_pb.GetSyncStatusResponse) => void): grpc.ClientUnaryCall;
    getSyncStatus(request: client_pb.GetSyncStatusRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: client_pb.GetSyncStatusResponse) => void): grpc.ClientUnaryCall;
    getSyncStatus(request: client_pb.GetSyncStatusRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: client_pb.GetSyncStatusResponse) => void): grpc.ClientUnaryCall;
}

export class ClientNodeClient extends grpc.Client implements IClientNodeClient {
    constructor(address: string, credentials: grpc.ChannelCredentials, options?: Partial<grpc.ClientOptions>);
    public getBlock(request: node_pb.GetBlockRequest, callback: (error: grpc.ServiceError | null, response: node_pb.GetBlockResponse) => void): grpc.ClientUnaryCall;
    public getBlock(request: node_pb.GetBlockRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: node_pb.GetBlockResponse) => void): grpc.ClientUnaryCall;
    public getBlock(request: node_pb.GetBlockRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: node_pb.GetBlockResponse) => void): grpc.ClientUnaryCall;
    public getAccount(request: node_pb.GetAccountRequest, callback: (error: grpc.ServiceError | null, response: node_pb.GetAccountResponse) => void): grpc.ClientUnaryCall;
    public getAccount(request: node_pb.GetAccountRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: node_pb.GetAccountResponse) => void): grpc.ClientUnaryCall;
    public getAccount(request: node_pb.GetAccountRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: node_pb.GetAccountResponse) => void): grpc.ClientUnaryCall;
    public getAccountTransactions(request: node_pb.GetAccountTransactionsRequest, callback: (error: grpc.ServiceError | null, response: node_pb.GetAccountTransactionsResponse) => void): grpc.ClientUnaryCall;
    public getAccountTransactions(request: node_pb.GetAccountTransactionsRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: node_pb.GetAccountTransactionsResponse) => void): grpc.ClientUnaryCall;
    public getAccountTransactions(request: node_pb.GetAccountTransactionsRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: node_pb.GetAccountTransactionsResponse) => void): grpc.ClientUnaryCall;
    public getStakerList(request: node_pb.GetStakerListRequest, callback: (error: grpc.ServiceError | null, response: node_pb.GetStakerListResponse) => void): grpc.ClientUnaryCall;
    public getStakerList(request: node_pb.GetStakerListRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: node_pb.GetStakerListResponse) => void): grpc.ClientUnaryCall;
    public getStakerList(request: node_pb.GetStakerListRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: node_pb.GetStakerListResponse) => void): grpc.ClientUnaryCall;
    public getDataChain(request: node_pb.GetDataChainRequest, callback: (error: grpc.ServiceError | null, response: node_pb.GetDataChainResponse) => void): grpc.ClientUnaryCall;
    public getDataChain(request: node_pb.GetDataChainRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: node_pb.GetDataChainResponse) => void): grpc.ClientUnaryCall;
    public getDataChain(request: node_pb.GetDataChainRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: node_pb.GetDataChainResponse) => void): grpc.ClientUnaryCall;
    public getDataChainList(request: node_pb.GetDataChainListRequest, callback: (error: grpc.ServiceError | null, response: node_pb.GetDataChainListResponse) => void): grpc.ClientUnaryCall;
    public getDataChainList(request: node_pb.GetDataChainListRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: node_pb.GetDataChainListResponse) => void): grpc.ClientUnaryCall;
    public getDataChainList(request: node_pb.GetDataChainListRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: node_pb.GetDataChainListResponse) => void): grpc.ClientUnaryCall;
    public getHeadBlockHash(request: node_pb.GetHeadBlockHashRequest, callback: (error: grpc.ServiceError | null, response: node_pb.GetHeadBlockHashResponse) => void): grpc.ClientUnaryCall;
    public getHeadBlockHash(request: node_pb.GetHeadBlockHashRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: node_pb.GetHeadBlockHashResponse) => void): grpc.ClientUnaryCall;
    public getHeadBlockHash(request: node_pb.GetHeadBlockHashRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: node_pb.GetHeadBlockHashResponse) => void): grpc.ClientUnaryCall;
    public getBLSPublicKey(request: node_pb.GetBLSPublicKeyRequest, callback: (error: grpc.ServiceError | null, response: node_pb.GetBLSPublicKeyResponse) => void): grpc.ClientUnaryCall;
    public getBLSPublicKey(request: node_pb.GetBLSPublicKeyRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: node_pb.GetBLSPublicKeyResponse) => void): grpc.ClientUnaryCall;
    public getBLSPublicKey(request: node_pb.GetBLSPublicKeyRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: node_pb.GetBLSPublicKeyResponse) => void): grpc.ClientUnaryCall;
    public getIPFSBootstrap(request: node_pb.GetIPFSBootstrapRequest, callback: (error: grpc.ServiceError | null, response: node_pb.GetIPFSBootstrapResponse) => void): grpc.ClientUnaryCall;
    public getIPFSBootstrap(request: node_pb.GetIPFSBootstrapRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: node_pb.GetIPFSBootstrapResponse) => void): grpc.ClientUnaryCall;
    public getIPFSBootstrap(request: node_pb.GetIPFSBootstrapRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: node_pb.GetIPFSBootstrapResponse) => void): grpc.ClientUnaryCall;
    public getHealth(request: node_pb.GetHealthRequest, callback: (error: grpc.ServiceError | null, response: node_pb.GetHealthResponse) => void): grpc.ClientUnaryCall;
    public getHealth(request: node_pb.GetHealthRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: node_pb.GetHealthResponse) => void): grpc.ClientUnaryCall;
    public getHealth(request: node_pb.GetHealthRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: node_pb.GetHealthResponse) => void): grpc.ClientUnaryCall;
    public generateCreateDataChainTxn(request: client_pb.GenerateCreateDataChainTxnRequest, callback: (error: grpc.ServiceError | null, response: client_pb.GenerateCreateDataChainTxnResponse) => void): grpc.ClientUnaryCall;
    public generateCreateDataChainTxn(request: client_pb.GenerateCreateDataChainTxnRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: client_pb.GenerateCreateDataChainTxnResponse) => void): grpc.ClientUnaryCall;
    public generateCreateDataChainTxn(request: client_pb.GenerateCreateDataChainTxnRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: client_pb.GenerateCreateDataChainTxnResponse) => void): grpc.ClientUnaryCall;
    public generateUpdateDataChainTxn(request: client_pb.GenerateUpdateDataChainTxnRequest, callback: (error: grpc.ServiceError | null, response: client_pb.GenerateUpdateDataChainTxnResponse) => void): grpc.ClientUnaryCall;
    public generateUpdateDataChainTxn(request: client_pb.GenerateUpdateDataChainTxnRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: client_pb.GenerateUpdateDataChainTxnResponse) => void): grpc.ClientUnaryCall;
    public generateUpdateDataChainTxn(request: client_pb.GenerateUpdateDataChainTxnRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: client_pb.GenerateUpdateDataChainTxnResponse) => void): grpc.ClientUnaryCall;
    public submitTransaction(request: client_pb.SubmitTransactionRequest, callback: (error: grpc.ServiceError | null, response: client_pb.SubmitTransactionResponse) => void): grpc.ClientUnaryCall;
    public submitTransaction(request: client_pb.SubmitTransactionRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: client_pb.SubmitTransactionResponse) => void): grpc.ClientUnaryCall;
    public submitTransaction(request: client_pb.SubmitTransactionRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: client_pb.SubmitTransactionResponse) => void): grpc.ClientUnaryCall;
    public getSyncStatus(request: client_pb.GetSyncStatusRequest, callback: (error: grpc.ServiceError | null, response: client_pb.GetSyncStatusResponse) => void): grpc.ClientUnaryCall;
    public getSyncStatus(request: client_pb.GetSyncStatusRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: client_pb.GetSyncStatusResponse) => void): grpc.ClientUnaryCall;
    public getSyncStatus(request: client_pb.GetSyncStatusRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: client_pb.GetSyncStatusResponse) => void): grpc.ClientUnaryCall;
}
