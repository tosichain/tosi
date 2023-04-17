// package: client
// file: coordinator.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as blockchain_pb from "./blockchain_pb";
import * as node_pb from "./node_pb";

export class SubmitSignedTransactionRequest extends jspb.Message { 

    hasTransaction(): boolean;
    clearTransaction(): void;
    getTransaction(): blockchain_pb.SignedTransaction | undefined;
    setTransaction(value?: blockchain_pb.SignedTransaction): SubmitSignedTransactionRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): SubmitSignedTransactionRequest.AsObject;
    static toObject(includeInstance: boolean, msg: SubmitSignedTransactionRequest): SubmitSignedTransactionRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: SubmitSignedTransactionRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): SubmitSignedTransactionRequest;
    static deserializeBinaryFromReader(message: SubmitSignedTransactionRequest, reader: jspb.BinaryReader): SubmitSignedTransactionRequest;
}

export namespace SubmitSignedTransactionRequest {
    export type AsObject = {
        transaction?: blockchain_pb.SignedTransaction.AsObject,
    }
}

export class SubmitSignedTransactionResponse extends jspb.Message { 

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): SubmitSignedTransactionResponse.AsObject;
    static toObject(includeInstance: boolean, msg: SubmitSignedTransactionResponse): SubmitSignedTransactionResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: SubmitSignedTransactionResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): SubmitSignedTransactionResponse;
    static deserializeBinaryFromReader(message: SubmitSignedTransactionResponse, reader: jspb.BinaryReader): SubmitSignedTransactionResponse;
}

export namespace SubmitSignedTransactionResponse {
    export type AsObject = {
    }
}

export class GetBlockMetadataRequest extends jspb.Message { 
    getBlockHash(): Uint8Array | string;
    getBlockHash_asU8(): Uint8Array;
    getBlockHash_asB64(): string;
    setBlockHash(value: Uint8Array | string): GetBlockMetadataRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetBlockMetadataRequest.AsObject;
    static toObject(includeInstance: boolean, msg: GetBlockMetadataRequest): GetBlockMetadataRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetBlockMetadataRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetBlockMetadataRequest;
    static deserializeBinaryFromReader(message: GetBlockMetadataRequest, reader: jspb.BinaryReader): GetBlockMetadataRequest;
}

export namespace GetBlockMetadataRequest {
    export type AsObject = {
        blockHash: Uint8Array | string,
    }
}

export class GetBlockMetadataResponse extends jspb.Message { 

    hasBlockMetadata(): boolean;
    clearBlockMetadata(): void;
    getBlockMetadata(): blockchain_pb.BlockMetadata | undefined;
    setBlockMetadata(value?: blockchain_pb.BlockMetadata): GetBlockMetadataResponse;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetBlockMetadataResponse.AsObject;
    static toObject(includeInstance: boolean, msg: GetBlockMetadataResponse): GetBlockMetadataResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetBlockMetadataResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetBlockMetadataResponse;
    static deserializeBinaryFromReader(message: GetBlockMetadataResponse, reader: jspb.BinaryReader): GetBlockMetadataResponse;
}

export namespace GetBlockMetadataResponse {
    export type AsObject = {
        blockMetadata?: blockchain_pb.BlockMetadata.AsObject,
    }
}
