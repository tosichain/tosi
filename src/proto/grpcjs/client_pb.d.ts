// package: client
// file: client.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as blockchain_pb from "./blockchain_pb";
import * as node_pb from "./node_pb";

export class GenerateCreateDataChainTxnRequest extends jspb.Message { 
    getCourtCid(): string;
    setCourtCid(value: string): GenerateCreateDataChainTxnRequest;
    getAppCid(): string;
    setAppCid(value: string): GenerateCreateDataChainTxnRequest;
    getInputCid(): string;
    setInputCid(value: string): GenerateCreateDataChainTxnRequest;
    getOutputCid(): string;
    setOutputCid(value: string): GenerateCreateDataChainTxnRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GenerateCreateDataChainTxnRequest.AsObject;
    static toObject(includeInstance: boolean, msg: GenerateCreateDataChainTxnRequest): GenerateCreateDataChainTxnRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GenerateCreateDataChainTxnRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GenerateCreateDataChainTxnRequest;
    static deserializeBinaryFromReader(message: GenerateCreateDataChainTxnRequest, reader: jspb.BinaryReader): GenerateCreateDataChainTxnRequest;
}

export namespace GenerateCreateDataChainTxnRequest {
    export type AsObject = {
        courtCid: string,
        appCid: string,
        inputCid: string,
        outputCid: string,
    }
}

export class GenerateCreateDataChainTxnResponse extends jspb.Message { 

    hasTransaction(): boolean;
    clearTransaction(): void;
    getTransaction(): blockchain_pb.Transaction | undefined;
    setTransaction(value?: blockchain_pb.Transaction): GenerateCreateDataChainTxnResponse;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GenerateCreateDataChainTxnResponse.AsObject;
    static toObject(includeInstance: boolean, msg: GenerateCreateDataChainTxnResponse): GenerateCreateDataChainTxnResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GenerateCreateDataChainTxnResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GenerateCreateDataChainTxnResponse;
    static deserializeBinaryFromReader(message: GenerateCreateDataChainTxnResponse, reader: jspb.BinaryReader): GenerateCreateDataChainTxnResponse;
}

export namespace GenerateCreateDataChainTxnResponse {
    export type AsObject = {
        transaction?: blockchain_pb.Transaction.AsObject,
    }
}

export class GenerateUpdateDataChainTxnRequest extends jspb.Message { 
    getCourtCid(): string;
    setCourtCid(value: string): GenerateUpdateDataChainTxnRequest;
    getAppCid(): string;
    setAppCid(value: string): GenerateUpdateDataChainTxnRequest;
    getInputCid(): string;
    setInputCid(value: string): GenerateUpdateDataChainTxnRequest;
    getOutputCid(): string;
    setOutputCid(value: string): GenerateUpdateDataChainTxnRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GenerateUpdateDataChainTxnRequest.AsObject;
    static toObject(includeInstance: boolean, msg: GenerateUpdateDataChainTxnRequest): GenerateUpdateDataChainTxnRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GenerateUpdateDataChainTxnRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GenerateUpdateDataChainTxnRequest;
    static deserializeBinaryFromReader(message: GenerateUpdateDataChainTxnRequest, reader: jspb.BinaryReader): GenerateUpdateDataChainTxnRequest;
}

export namespace GenerateUpdateDataChainTxnRequest {
    export type AsObject = {
        courtCid: string,
        appCid: string,
        inputCid: string,
        outputCid: string,
    }
}

export class GenerateUpdateDataChainTxnResponse extends jspb.Message { 

    hasTransaction(): boolean;
    clearTransaction(): void;
    getTransaction(): blockchain_pb.Transaction | undefined;
    setTransaction(value?: blockchain_pb.Transaction): GenerateUpdateDataChainTxnResponse;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GenerateUpdateDataChainTxnResponse.AsObject;
    static toObject(includeInstance: boolean, msg: GenerateUpdateDataChainTxnResponse): GenerateUpdateDataChainTxnResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GenerateUpdateDataChainTxnResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GenerateUpdateDataChainTxnResponse;
    static deserializeBinaryFromReader(message: GenerateUpdateDataChainTxnResponse, reader: jspb.BinaryReader): GenerateUpdateDataChainTxnResponse;
}

export namespace GenerateUpdateDataChainTxnResponse {
    export type AsObject = {
        transaction?: blockchain_pb.Transaction.AsObject,
    }
}

export class SubmitTransactionRequest extends jspb.Message { 

    hasTransaction(): boolean;
    clearTransaction(): void;
    getTransaction(): blockchain_pb.Transaction | undefined;
    setTransaction(value?: blockchain_pb.Transaction): SubmitTransactionRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): SubmitTransactionRequest.AsObject;
    static toObject(includeInstance: boolean, msg: SubmitTransactionRequest): SubmitTransactionRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: SubmitTransactionRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): SubmitTransactionRequest;
    static deserializeBinaryFromReader(message: SubmitTransactionRequest, reader: jspb.BinaryReader): SubmitTransactionRequest;
}

export namespace SubmitTransactionRequest {
    export type AsObject = {
        transaction?: blockchain_pb.Transaction.AsObject,
    }
}

export class SubmitTransactionResponse extends jspb.Message { 

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): SubmitTransactionResponse.AsObject;
    static toObject(includeInstance: boolean, msg: SubmitTransactionResponse): SubmitTransactionResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: SubmitTransactionResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): SubmitTransactionResponse;
    static deserializeBinaryFromReader(message: SubmitTransactionResponse, reader: jspb.BinaryReader): SubmitTransactionResponse;
}

export namespace SubmitTransactionResponse {
    export type AsObject = {
    }
}

export class GetSyncStatusRequest extends jspb.Message { 

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetSyncStatusRequest.AsObject;
    static toObject(includeInstance: boolean, msg: GetSyncStatusRequest): GetSyncStatusRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetSyncStatusRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetSyncStatusRequest;
    static deserializeBinaryFromReader(message: GetSyncStatusRequest, reader: jspb.BinaryReader): GetSyncStatusRequest;
}

export namespace GetSyncStatusRequest {
    export type AsObject = {
    }
}

export class GetSyncStatusResponse extends jspb.Message { 
    getIsSynced(): boolean;
    setIsSynced(value: boolean): GetSyncStatusResponse;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetSyncStatusResponse.AsObject;
    static toObject(includeInstance: boolean, msg: GetSyncStatusResponse): GetSyncStatusResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetSyncStatusResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetSyncStatusResponse;
    static deserializeBinaryFromReader(message: GetSyncStatusResponse, reader: jspb.BinaryReader): GetSyncStatusResponse;
}

export namespace GetSyncStatusResponse {
    export type AsObject = {
        isSynced: boolean,
    }
}

export class GetLocalHeadBlockHashRequest extends jspb.Message { 

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetLocalHeadBlockHashRequest.AsObject;
    static toObject(includeInstance: boolean, msg: GetLocalHeadBlockHashRequest): GetLocalHeadBlockHashRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetLocalHeadBlockHashRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetLocalHeadBlockHashRequest;
    static deserializeBinaryFromReader(message: GetLocalHeadBlockHashRequest, reader: jspb.BinaryReader): GetLocalHeadBlockHashRequest;
}

export namespace GetLocalHeadBlockHashRequest {
    export type AsObject = {
    }
}

export class GetLocalHeadBlockHashResponse extends jspb.Message { 
    getBlockHash(): string;
    setBlockHash(value: string): GetLocalHeadBlockHashResponse;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetLocalHeadBlockHashResponse.AsObject;
    static toObject(includeInstance: boolean, msg: GetLocalHeadBlockHashResponse): GetLocalHeadBlockHashResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetLocalHeadBlockHashResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetLocalHeadBlockHashResponse;
    static deserializeBinaryFromReader(message: GetLocalHeadBlockHashResponse, reader: jspb.BinaryReader): GetLocalHeadBlockHashResponse;
}

export namespace GetLocalHeadBlockHashResponse {
    export type AsObject = {
        blockHash: string,
    }
}
