// package: node
// file: node.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as blockchain_pb from "./blockchain_pb";

export class GetBlockRequest extends jspb.Message { 
    getBlockHash(): Uint8Array | string;
    getBlockHash_asU8(): Uint8Array;
    getBlockHash_asB64(): string;
    setBlockHash(value: Uint8Array | string): GetBlockRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetBlockRequest.AsObject;
    static toObject(includeInstance: boolean, msg: GetBlockRequest): GetBlockRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetBlockRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetBlockRequest;
    static deserializeBinaryFromReader(message: GetBlockRequest, reader: jspb.BinaryReader): GetBlockRequest;
}

export namespace GetBlockRequest {
    export type AsObject = {
        blockHash: Uint8Array | string,
    }
}

export class GetBlockResponse extends jspb.Message { 

    hasBlock(): boolean;
    clearBlock(): void;
    getBlock(): blockchain_pb.Block | undefined;
    setBlock(value?: blockchain_pb.Block): GetBlockResponse;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetBlockResponse.AsObject;
    static toObject(includeInstance: boolean, msg: GetBlockResponse): GetBlockResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetBlockResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetBlockResponse;
    static deserializeBinaryFromReader(message: GetBlockResponse, reader: jspb.BinaryReader): GetBlockResponse;
}

export namespace GetBlockResponse {
    export type AsObject = {
        block?: blockchain_pb.Block.AsObject,
    }
}

export class GetAccountRequest extends jspb.Message { 
    getAccountAddress(): Uint8Array | string;
    getAccountAddress_asU8(): Uint8Array;
    getAccountAddress_asB64(): string;
    setAccountAddress(value: Uint8Array | string): GetAccountRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetAccountRequest.AsObject;
    static toObject(includeInstance: boolean, msg: GetAccountRequest): GetAccountRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetAccountRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetAccountRequest;
    static deserializeBinaryFromReader(message: GetAccountRequest, reader: jspb.BinaryReader): GetAccountRequest;
}

export namespace GetAccountRequest {
    export type AsObject = {
        accountAddress: Uint8Array | string,
    }
}

export class GetAccountResponse extends jspb.Message { 

    hasAccount(): boolean;
    clearAccount(): void;
    getAccount(): blockchain_pb.Account | undefined;
    setAccount(value?: blockchain_pb.Account): GetAccountResponse;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetAccountResponse.AsObject;
    static toObject(includeInstance: boolean, msg: GetAccountResponse): GetAccountResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetAccountResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetAccountResponse;
    static deserializeBinaryFromReader(message: GetAccountResponse, reader: jspb.BinaryReader): GetAccountResponse;
}

export namespace GetAccountResponse {
    export type AsObject = {
        account?: blockchain_pb.Account.AsObject,
    }
}

export class GetAccountTransactionsRequest extends jspb.Message { 
    getAccountAddress(): Uint8Array | string;
    getAccountAddress_asU8(): Uint8Array;
    getAccountAddress_asB64(): string;
    setAccountAddress(value: Uint8Array | string): GetAccountTransactionsRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetAccountTransactionsRequest.AsObject;
    static toObject(includeInstance: boolean, msg: GetAccountTransactionsRequest): GetAccountTransactionsRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetAccountTransactionsRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetAccountTransactionsRequest;
    static deserializeBinaryFromReader(message: GetAccountTransactionsRequest, reader: jspb.BinaryReader): GetAccountTransactionsRequest;
}

export namespace GetAccountTransactionsRequest {
    export type AsObject = {
        accountAddress: Uint8Array | string,
    }
}

export class GetAccountTransactionsResponse extends jspb.Message { 
    clearTransactionsList(): void;
    getTransactionsList(): Array<blockchain_pb.Transaction>;
    setTransactionsList(value: Array<blockchain_pb.Transaction>): GetAccountTransactionsResponse;
    addTransactions(value?: blockchain_pb.Transaction, index?: number): blockchain_pb.Transaction;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetAccountTransactionsResponse.AsObject;
    static toObject(includeInstance: boolean, msg: GetAccountTransactionsResponse): GetAccountTransactionsResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetAccountTransactionsResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetAccountTransactionsResponse;
    static deserializeBinaryFromReader(message: GetAccountTransactionsResponse, reader: jspb.BinaryReader): GetAccountTransactionsResponse;
}

export namespace GetAccountTransactionsResponse {
    export type AsObject = {
        transactionsList: Array<blockchain_pb.Transaction.AsObject>,
    }
}

export class GetStakerListRequest extends jspb.Message { 
    getStakeType(): blockchain_pb.StakeType;
    setStakeType(value: blockchain_pb.StakeType): GetStakerListRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetStakerListRequest.AsObject;
    static toObject(includeInstance: boolean, msg: GetStakerListRequest): GetStakerListRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetStakerListRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetStakerListRequest;
    static deserializeBinaryFromReader(message: GetStakerListRequest, reader: jspb.BinaryReader): GetStakerListRequest;
}

export namespace GetStakerListRequest {
    export type AsObject = {
        stakeType: blockchain_pb.StakeType,
    }
}

export class GetStakerListResponse extends jspb.Message { 
    clearStakersList(): void;
    getStakersList(): Array<blockchain_pb.Account>;
    setStakersList(value: Array<blockchain_pb.Account>): GetStakerListResponse;
    addStakers(value?: blockchain_pb.Account, index?: number): blockchain_pb.Account;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetStakerListResponse.AsObject;
    static toObject(includeInstance: boolean, msg: GetStakerListResponse): GetStakerListResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetStakerListResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetStakerListResponse;
    static deserializeBinaryFromReader(message: GetStakerListResponse, reader: jspb.BinaryReader): GetStakerListResponse;
}

export namespace GetStakerListResponse {
    export type AsObject = {
        stakersList: Array<blockchain_pb.Account.AsObject>,
    }
}

export class GetDataChainRequest extends jspb.Message { 
    getRootClaimHash(): Uint8Array | string;
    getRootClaimHash_asU8(): Uint8Array;
    getRootClaimHash_asB64(): string;
    setRootClaimHash(value: Uint8Array | string): GetDataChainRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetDataChainRequest.AsObject;
    static toObject(includeInstance: boolean, msg: GetDataChainRequest): GetDataChainRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetDataChainRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetDataChainRequest;
    static deserializeBinaryFromReader(message: GetDataChainRequest, reader: jspb.BinaryReader): GetDataChainRequest;
}

export namespace GetDataChainRequest {
    export type AsObject = {
        rootClaimHash: Uint8Array | string,
    }
}

export class GetDataChainResponse extends jspb.Message { 

    hasDataChain(): boolean;
    clearDataChain(): void;
    getDataChain(): blockchain_pb.DataChain | undefined;
    setDataChain(value?: blockchain_pb.DataChain): GetDataChainResponse;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetDataChainResponse.AsObject;
    static toObject(includeInstance: boolean, msg: GetDataChainResponse): GetDataChainResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetDataChainResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetDataChainResponse;
    static deserializeBinaryFromReader(message: GetDataChainResponse, reader: jspb.BinaryReader): GetDataChainResponse;
}

export namespace GetDataChainResponse {
    export type AsObject = {
        dataChain?: blockchain_pb.DataChain.AsObject,
    }
}

export class GetDataChainListRequest extends jspb.Message { 

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetDataChainListRequest.AsObject;
    static toObject(includeInstance: boolean, msg: GetDataChainListRequest): GetDataChainListRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetDataChainListRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetDataChainListRequest;
    static deserializeBinaryFromReader(message: GetDataChainListRequest, reader: jspb.BinaryReader): GetDataChainListRequest;
}

export namespace GetDataChainListRequest {
    export type AsObject = {
    }
}

export class GetDataChainListResponse extends jspb.Message { 
    clearDataChainsList(): void;
    getDataChainsList(): Array<blockchain_pb.DataChain>;
    setDataChainsList(value: Array<blockchain_pb.DataChain>): GetDataChainListResponse;
    addDataChains(value?: blockchain_pb.DataChain, index?: number): blockchain_pb.DataChain;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetDataChainListResponse.AsObject;
    static toObject(includeInstance: boolean, msg: GetDataChainListResponse): GetDataChainListResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetDataChainListResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetDataChainListResponse;
    static deserializeBinaryFromReader(message: GetDataChainListResponse, reader: jspb.BinaryReader): GetDataChainListResponse;
}

export namespace GetDataChainListResponse {
    export type AsObject = {
        dataChainsList: Array<blockchain_pb.DataChain.AsObject>,
    }
}

export class GetHeadBlockHashRequest extends jspb.Message { 

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetHeadBlockHashRequest.AsObject;
    static toObject(includeInstance: boolean, msg: GetHeadBlockHashRequest): GetHeadBlockHashRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetHeadBlockHashRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetHeadBlockHashRequest;
    static deserializeBinaryFromReader(message: GetHeadBlockHashRequest, reader: jspb.BinaryReader): GetHeadBlockHashRequest;
}

export namespace GetHeadBlockHashRequest {
    export type AsObject = {
    }
}

export class GetHeadBlockHashResponse extends jspb.Message { 
    getBlockHash(): Uint8Array | string;
    getBlockHash_asU8(): Uint8Array;
    getBlockHash_asB64(): string;
    setBlockHash(value: Uint8Array | string): GetHeadBlockHashResponse;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetHeadBlockHashResponse.AsObject;
    static toObject(includeInstance: boolean, msg: GetHeadBlockHashResponse): GetHeadBlockHashResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetHeadBlockHashResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetHeadBlockHashResponse;
    static deserializeBinaryFromReader(message: GetHeadBlockHashResponse, reader: jspb.BinaryReader): GetHeadBlockHashResponse;
}

export namespace GetHeadBlockHashResponse {
    export type AsObject = {
        blockHash: Uint8Array | string,
    }
}

export class GetBLSPublicKeyRequest extends jspb.Message { 

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetBLSPublicKeyRequest.AsObject;
    static toObject(includeInstance: boolean, msg: GetBLSPublicKeyRequest): GetBLSPublicKeyRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetBLSPublicKeyRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetBLSPublicKeyRequest;
    static deserializeBinaryFromReader(message: GetBLSPublicKeyRequest, reader: jspb.BinaryReader): GetBLSPublicKeyRequest;
}

export namespace GetBLSPublicKeyRequest {
    export type AsObject = {
    }
}

export class GetBLSPublicKeyResponse extends jspb.Message { 
    getPublicKey(): Uint8Array | string;
    getPublicKey_asU8(): Uint8Array;
    getPublicKey_asB64(): string;
    setPublicKey(value: Uint8Array | string): GetBLSPublicKeyResponse;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetBLSPublicKeyResponse.AsObject;
    static toObject(includeInstance: boolean, msg: GetBLSPublicKeyResponse): GetBLSPublicKeyResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetBLSPublicKeyResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetBLSPublicKeyResponse;
    static deserializeBinaryFromReader(message: GetBLSPublicKeyResponse, reader: jspb.BinaryReader): GetBLSPublicKeyResponse;
}

export namespace GetBLSPublicKeyResponse {
    export type AsObject = {
        publicKey: Uint8Array | string,
    }
}

export class GetIPFSBootstrapRequest extends jspb.Message { 

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetIPFSBootstrapRequest.AsObject;
    static toObject(includeInstance: boolean, msg: GetIPFSBootstrapRequest): GetIPFSBootstrapRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetIPFSBootstrapRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetIPFSBootstrapRequest;
    static deserializeBinaryFromReader(message: GetIPFSBootstrapRequest, reader: jspb.BinaryReader): GetIPFSBootstrapRequest;
}

export namespace GetIPFSBootstrapRequest {
    export type AsObject = {
    }
}

export class GetIPFSBootstrapResponse extends jspb.Message { 
    clearMultiaddrsList(): void;
    getMultiaddrsList(): Array<string>;
    setMultiaddrsList(value: Array<string>): GetIPFSBootstrapResponse;
    addMultiaddrs(value: string, index?: number): string;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetIPFSBootstrapResponse.AsObject;
    static toObject(includeInstance: boolean, msg: GetIPFSBootstrapResponse): GetIPFSBootstrapResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetIPFSBootstrapResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetIPFSBootstrapResponse;
    static deserializeBinaryFromReader(message: GetIPFSBootstrapResponse, reader: jspb.BinaryReader): GetIPFSBootstrapResponse;
}

export namespace GetIPFSBootstrapResponse {
    export type AsObject = {
        multiaddrsList: Array<string>,
    }
}

export class GetHealthRequest extends jspb.Message { 

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetHealthRequest.AsObject;
    static toObject(includeInstance: boolean, msg: GetHealthRequest): GetHealthRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetHealthRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetHealthRequest;
    static deserializeBinaryFromReader(message: GetHealthRequest, reader: jspb.BinaryReader): GetHealthRequest;
}

export namespace GetHealthRequest {
    export type AsObject = {
    }
}

export class GetHealthResponse extends jspb.Message { 
    getIsHealthy(): boolean;
    setIsHealthy(value: boolean): GetHealthResponse;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetHealthResponse.AsObject;
    static toObject(includeInstance: boolean, msg: GetHealthResponse): GetHealthResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetHealthResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetHealthResponse;
    static deserializeBinaryFromReader(message: GetHealthResponse, reader: jspb.BinaryReader): GetHealthResponse;
}

export namespace GetHealthResponse {
    export type AsObject = {
        isHealthy: boolean,
    }
}
