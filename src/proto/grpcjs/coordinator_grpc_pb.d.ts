// package: client
// file: coordinator.proto

/* tslint:disable */
/* eslint-disable */

import * as grpc from "@grpc/grpc-js";
import * as coordinator_pb from "./coordinator_pb";
import * as blockchain_pb from "./blockchain_pb";
import * as node_pb from "./node_pb";

interface ICoordinatorNodeService extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
    getBlock: ICoordinatorNodeService_IGetBlock;
    getAccount: ICoordinatorNodeService_IGetAccount;
    getAccountTransactions: ICoordinatorNodeService_IGetAccountTransactions;
    getStakerList: ICoordinatorNodeService_IGetStakerList;
    getDataChain: ICoordinatorNodeService_IGetDataChain;
    getDataChainList: ICoordinatorNodeService_IGetDataChainList;
    getHeadBlockHash: ICoordinatorNodeService_IGetHeadBlockHash;
    getBLSPublicKey: ICoordinatorNodeService_IGetBLSPublicKey;
    getIPFSBootstrap: ICoordinatorNodeService_IGetIPFSBootstrap;
    getHealth: ICoordinatorNodeService_IGetHealth;
    sumbitSignedTransaction: ICoordinatorNodeService_ISumbitSignedTransaction;
    getBlockMetadata: ICoordinatorNodeService_IGetBlockMetadata;
}

interface ICoordinatorNodeService_IGetBlock extends grpc.MethodDefinition<node_pb.GetBlockRequest, node_pb.GetBlockResponse> {
    path: "/client.CoordinatorNode/GetBlock";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<node_pb.GetBlockRequest>;
    requestDeserialize: grpc.deserialize<node_pb.GetBlockRequest>;
    responseSerialize: grpc.serialize<node_pb.GetBlockResponse>;
    responseDeserialize: grpc.deserialize<node_pb.GetBlockResponse>;
}
interface ICoordinatorNodeService_IGetAccount extends grpc.MethodDefinition<node_pb.GetAccountRequest, node_pb.GetAccountResponse> {
    path: "/client.CoordinatorNode/GetAccount";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<node_pb.GetAccountRequest>;
    requestDeserialize: grpc.deserialize<node_pb.GetAccountRequest>;
    responseSerialize: grpc.serialize<node_pb.GetAccountResponse>;
    responseDeserialize: grpc.deserialize<node_pb.GetAccountResponse>;
}
interface ICoordinatorNodeService_IGetAccountTransactions extends grpc.MethodDefinition<node_pb.GetAccountTransactionsRequest, node_pb.GetAccountTransactionsResponse> {
    path: "/client.CoordinatorNode/GetAccountTransactions";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<node_pb.GetAccountTransactionsRequest>;
    requestDeserialize: grpc.deserialize<node_pb.GetAccountTransactionsRequest>;
    responseSerialize: grpc.serialize<node_pb.GetAccountTransactionsResponse>;
    responseDeserialize: grpc.deserialize<node_pb.GetAccountTransactionsResponse>;
}
interface ICoordinatorNodeService_IGetStakerList extends grpc.MethodDefinition<node_pb.GetStakerListRequest, node_pb.GetStakerListResponse> {
    path: "/client.CoordinatorNode/GetStakerList";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<node_pb.GetStakerListRequest>;
    requestDeserialize: grpc.deserialize<node_pb.GetStakerListRequest>;
    responseSerialize: grpc.serialize<node_pb.GetStakerListResponse>;
    responseDeserialize: grpc.deserialize<node_pb.GetStakerListResponse>;
}
interface ICoordinatorNodeService_IGetDataChain extends grpc.MethodDefinition<node_pb.GetDataChainRequest, node_pb.GetDataChainResponse> {
    path: "/client.CoordinatorNode/GetDataChain";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<node_pb.GetDataChainRequest>;
    requestDeserialize: grpc.deserialize<node_pb.GetDataChainRequest>;
    responseSerialize: grpc.serialize<node_pb.GetDataChainResponse>;
    responseDeserialize: grpc.deserialize<node_pb.GetDataChainResponse>;
}
interface ICoordinatorNodeService_IGetDataChainList extends grpc.MethodDefinition<node_pb.GetDataChainListRequest, node_pb.GetDataChainListResponse> {
    path: "/client.CoordinatorNode/GetDataChainList";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<node_pb.GetDataChainListRequest>;
    requestDeserialize: grpc.deserialize<node_pb.GetDataChainListRequest>;
    responseSerialize: grpc.serialize<node_pb.GetDataChainListResponse>;
    responseDeserialize: grpc.deserialize<node_pb.GetDataChainListResponse>;
}
interface ICoordinatorNodeService_IGetHeadBlockHash extends grpc.MethodDefinition<node_pb.GetHeadBlockHashRequest, node_pb.GetHeadBlockHashResponse> {
    path: "/client.CoordinatorNode/GetHeadBlockHash";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<node_pb.GetHeadBlockHashRequest>;
    requestDeserialize: grpc.deserialize<node_pb.GetHeadBlockHashRequest>;
    responseSerialize: grpc.serialize<node_pb.GetHeadBlockHashResponse>;
    responseDeserialize: grpc.deserialize<node_pb.GetHeadBlockHashResponse>;
}
interface ICoordinatorNodeService_IGetBLSPublicKey extends grpc.MethodDefinition<node_pb.GetBLSPublicKeyRequest, node_pb.GetBLSPublicKeyResponse> {
    path: "/client.CoordinatorNode/GetBLSPublicKey";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<node_pb.GetBLSPublicKeyRequest>;
    requestDeserialize: grpc.deserialize<node_pb.GetBLSPublicKeyRequest>;
    responseSerialize: grpc.serialize<node_pb.GetBLSPublicKeyResponse>;
    responseDeserialize: grpc.deserialize<node_pb.GetBLSPublicKeyResponse>;
}
interface ICoordinatorNodeService_IGetIPFSBootstrap extends grpc.MethodDefinition<node_pb.GetIPFSBootstrapRequest, node_pb.GetIPFSBootstrapResponse> {
    path: "/client.CoordinatorNode/GetIPFSBootstrap";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<node_pb.GetIPFSBootstrapRequest>;
    requestDeserialize: grpc.deserialize<node_pb.GetIPFSBootstrapRequest>;
    responseSerialize: grpc.serialize<node_pb.GetIPFSBootstrapResponse>;
    responseDeserialize: grpc.deserialize<node_pb.GetIPFSBootstrapResponse>;
}
interface ICoordinatorNodeService_IGetHealth extends grpc.MethodDefinition<node_pb.GetHealthRequest, node_pb.GetHealthResponse> {
    path: "/client.CoordinatorNode/GetHealth";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<node_pb.GetHealthRequest>;
    requestDeserialize: grpc.deserialize<node_pb.GetHealthRequest>;
    responseSerialize: grpc.serialize<node_pb.GetHealthResponse>;
    responseDeserialize: grpc.deserialize<node_pb.GetHealthResponse>;
}
interface ICoordinatorNodeService_ISumbitSignedTransaction extends grpc.MethodDefinition<coordinator_pb.SubmitSignedTransactionRequest, coordinator_pb.SubmitSignedTransactionResponse> {
    path: "/client.CoordinatorNode/SumbitSignedTransaction";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<coordinator_pb.SubmitSignedTransactionRequest>;
    requestDeserialize: grpc.deserialize<coordinator_pb.SubmitSignedTransactionRequest>;
    responseSerialize: grpc.serialize<coordinator_pb.SubmitSignedTransactionResponse>;
    responseDeserialize: grpc.deserialize<coordinator_pb.SubmitSignedTransactionResponse>;
}
interface ICoordinatorNodeService_IGetBlockMetadata extends grpc.MethodDefinition<coordinator_pb.GetBlockMetadataRequest, coordinator_pb.GetBlockMetadataResponse> {
    path: "/client.CoordinatorNode/GetBlockMetadata";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<coordinator_pb.GetBlockMetadataRequest>;
    requestDeserialize: grpc.deserialize<coordinator_pb.GetBlockMetadataRequest>;
    responseSerialize: grpc.serialize<coordinator_pb.GetBlockMetadataResponse>;
    responseDeserialize: grpc.deserialize<coordinator_pb.GetBlockMetadataResponse>;
}

export const CoordinatorNodeService: ICoordinatorNodeService;

export interface ICoordinatorNodeServer extends grpc.UntypedServiceImplementation {
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
    sumbitSignedTransaction: grpc.handleUnaryCall<coordinator_pb.SubmitSignedTransactionRequest, coordinator_pb.SubmitSignedTransactionResponse>;
    getBlockMetadata: grpc.handleUnaryCall<coordinator_pb.GetBlockMetadataRequest, coordinator_pb.GetBlockMetadataResponse>;
}

export interface ICoordinatorNodeClient {
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
    sumbitSignedTransaction(request: coordinator_pb.SubmitSignedTransactionRequest, callback: (error: grpc.ServiceError | null, response: coordinator_pb.SubmitSignedTransactionResponse) => void): grpc.ClientUnaryCall;
    sumbitSignedTransaction(request: coordinator_pb.SubmitSignedTransactionRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: coordinator_pb.SubmitSignedTransactionResponse) => void): grpc.ClientUnaryCall;
    sumbitSignedTransaction(request: coordinator_pb.SubmitSignedTransactionRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: coordinator_pb.SubmitSignedTransactionResponse) => void): grpc.ClientUnaryCall;
    getBlockMetadata(request: coordinator_pb.GetBlockMetadataRequest, callback: (error: grpc.ServiceError | null, response: coordinator_pb.GetBlockMetadataResponse) => void): grpc.ClientUnaryCall;
    getBlockMetadata(request: coordinator_pb.GetBlockMetadataRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: coordinator_pb.GetBlockMetadataResponse) => void): grpc.ClientUnaryCall;
    getBlockMetadata(request: coordinator_pb.GetBlockMetadataRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: coordinator_pb.GetBlockMetadataResponse) => void): grpc.ClientUnaryCall;
}

export class CoordinatorNodeClient extends grpc.Client implements ICoordinatorNodeClient {
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
    public sumbitSignedTransaction(request: coordinator_pb.SubmitSignedTransactionRequest, callback: (error: grpc.ServiceError | null, response: coordinator_pb.SubmitSignedTransactionResponse) => void): grpc.ClientUnaryCall;
    public sumbitSignedTransaction(request: coordinator_pb.SubmitSignedTransactionRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: coordinator_pb.SubmitSignedTransactionResponse) => void): grpc.ClientUnaryCall;
    public sumbitSignedTransaction(request: coordinator_pb.SubmitSignedTransactionRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: coordinator_pb.SubmitSignedTransactionResponse) => void): grpc.ClientUnaryCall;
    public getBlockMetadata(request: coordinator_pb.GetBlockMetadataRequest, callback: (error: grpc.ServiceError | null, response: coordinator_pb.GetBlockMetadataResponse) => void): grpc.ClientUnaryCall;
    public getBlockMetadata(request: coordinator_pb.GetBlockMetadataRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: coordinator_pb.GetBlockMetadataResponse) => void): grpc.ClientUnaryCall;
    public getBlockMetadata(request: coordinator_pb.GetBlockMetadataRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: coordinator_pb.GetBlockMetadataResponse) => void): grpc.ClientUnaryCall;
}
