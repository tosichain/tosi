// package: CartesiIpfs
// file: ipfs.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";

export class GetFileRequest extends jspb.Message { 
    getIpfsPath(): string;
    setIpfsPath(value: string): GetFileRequest;
    getLog2Size(): number;
    setLog2Size(value: number): GetFileRequest;
    getOutputPath(): string;
    setOutputPath(value: string): GetFileRequest;
    getTimeout(): number;
    setTimeout(value: number): GetFileRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetFileRequest.AsObject;
    static toObject(includeInstance: boolean, msg: GetFileRequest): GetFileRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetFileRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetFileRequest;
    static deserializeBinaryFromReader(message: GetFileRequest, reader: jspb.BinaryReader): GetFileRequest;
}

export namespace GetFileRequest {
    export type AsObject = {
        ipfsPath: string,
        log2Size: number,
        outputPath: string,
        timeout: number,
    }
}

export class Progress extends jspb.Message { 
    getProgress(): number;
    setProgress(value: number): Progress;
    getUpdatedAt(): number;
    setUpdatedAt(value: number): Progress;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Progress.AsObject;
    static toObject(includeInstance: boolean, msg: Progress): Progress.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Progress, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Progress;
    static deserializeBinaryFromReader(message: Progress, reader: jspb.BinaryReader): Progress;
}

export namespace Progress {
    export type AsObject = {
        progress: number,
        updatedAt: number,
    }
}

export class GetFileResult extends jspb.Message { 
    getOutputPath(): string;
    setOutputPath(value: string): GetFileResult;

    hasRootHash(): boolean;
    clearRootHash(): void;
    getRootHash(): Hash | undefined;
    setRootHash(value?: Hash): GetFileResult;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetFileResult.AsObject;
    static toObject(includeInstance: boolean, msg: GetFileResult): GetFileResult.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetFileResult, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetFileResult;
    static deserializeBinaryFromReader(message: GetFileResult, reader: jspb.BinaryReader): GetFileResult;
}

export namespace GetFileResult {
    export type AsObject = {
        outputPath: string,
        rootHash?: Hash.AsObject,
    }
}

export class GetFileResponse extends jspb.Message { 

    hasProgress(): boolean;
    clearProgress(): void;
    getProgress(): Progress | undefined;
    setProgress(value?: Progress): GetFileResponse;

    hasResult(): boolean;
    clearResult(): void;
    getResult(): GetFileResult | undefined;
    setResult(value?: GetFileResult): GetFileResponse;

    getGetOneofCase(): GetFileResponse.GetOneofCase;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetFileResponse.AsObject;
    static toObject(includeInstance: boolean, msg: GetFileResponse): GetFileResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetFileResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetFileResponse;
    static deserializeBinaryFromReader(message: GetFileResponse, reader: jspb.BinaryReader): GetFileResponse;
}

export namespace GetFileResponse {
    export type AsObject = {
        progress?: Progress.AsObject,
        result?: GetFileResult.AsObject,
    }

    export enum GetOneofCase {
        GET_ONEOF_NOT_SET = 0,
        PROGRESS = 1,
        RESULT = 2,
    }

}

export class AddFileRequest extends jspb.Message { 
    getFilePath(): string;
    setFilePath(value: string): AddFileRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): AddFileRequest.AsObject;
    static toObject(includeInstance: boolean, msg: AddFileRequest): AddFileRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: AddFileRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): AddFileRequest;
    static deserializeBinaryFromReader(message: AddFileRequest, reader: jspb.BinaryReader): AddFileRequest;
}

export namespace AddFileRequest {
    export type AsObject = {
        filePath: string,
    }
}

export class AddFileResult extends jspb.Message { 
    getIpfsPath(): string;
    setIpfsPath(value: string): AddFileResult;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): AddFileResult.AsObject;
    static toObject(includeInstance: boolean, msg: AddFileResult): AddFileResult.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: AddFileResult, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): AddFileResult;
    static deserializeBinaryFromReader(message: AddFileResult, reader: jspb.BinaryReader): AddFileResult;
}

export namespace AddFileResult {
    export type AsObject = {
        ipfsPath: string,
    }
}

export class AddFileResponse extends jspb.Message { 

    hasProgress(): boolean;
    clearProgress(): void;
    getProgress(): Progress | undefined;
    setProgress(value?: Progress): AddFileResponse;

    hasResult(): boolean;
    clearResult(): void;
    getResult(): AddFileResult | undefined;
    setResult(value?: AddFileResult): AddFileResponse;

    getAddOneofCase(): AddFileResponse.AddOneofCase;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): AddFileResponse.AsObject;
    static toObject(includeInstance: boolean, msg: AddFileResponse): AddFileResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: AddFileResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): AddFileResponse;
    static deserializeBinaryFromReader(message: AddFileResponse, reader: jspb.BinaryReader): AddFileResponse;
}

export namespace AddFileResponse {
    export type AsObject = {
        progress?: Progress.AsObject,
        result?: AddFileResult.AsObject,
    }

    export enum AddOneofCase {
        ADD_ONEOF_NOT_SET = 0,
        PROGRESS = 1,
        RESULT = 2,
    }

}

export class Hash extends jspb.Message { 
    getData(): Uint8Array | string;
    getData_asU8(): Uint8Array;
    getData_asB64(): string;
    setData(value: Uint8Array | string): Hash;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Hash.AsObject;
    static toObject(includeInstance: boolean, msg: Hash): Hash.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Hash, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Hash;
    static deserializeBinaryFromReader(message: Hash, reader: jspb.BinaryReader): Hash;
}

export namespace Hash {
    export type AsObject = {
        data: Uint8Array | string,
    }
}

export class CacheMerkleRootHashRequest extends jspb.Message { 
    getIpfsPath(): string;
    setIpfsPath(value: string): CacheMerkleRootHashRequest;
    getLog2Size(): number;
    setLog2Size(value: number): CacheMerkleRootHashRequest;

    hasMerkleRootHash(): boolean;
    clearMerkleRootHash(): void;
    getMerkleRootHash(): Hash | undefined;
    setMerkleRootHash(value?: Hash): CacheMerkleRootHashRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): CacheMerkleRootHashRequest.AsObject;
    static toObject(includeInstance: boolean, msg: CacheMerkleRootHashRequest): CacheMerkleRootHashRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: CacheMerkleRootHashRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): CacheMerkleRootHashRequest;
    static deserializeBinaryFromReader(message: CacheMerkleRootHashRequest, reader: jspb.BinaryReader): CacheMerkleRootHashRequest;
}

export namespace CacheMerkleRootHashRequest {
    export type AsObject = {
        ipfsPath: string,
        log2Size: number,
        merkleRootHash?: Hash.AsObject,
    }
}

export class CacheMerkleRootHashResponse extends jspb.Message { 

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): CacheMerkleRootHashResponse.AsObject;
    static toObject(includeInstance: boolean, msg: CacheMerkleRootHashResponse): CacheMerkleRootHashResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: CacheMerkleRootHashResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): CacheMerkleRootHashResponse;
    static deserializeBinaryFromReader(message: CacheMerkleRootHashResponse, reader: jspb.BinaryReader): CacheMerkleRootHashResponse;
}

export namespace CacheMerkleRootHashResponse {
    export type AsObject = {
    }
}
