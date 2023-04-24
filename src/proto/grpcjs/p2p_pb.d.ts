// package: node
// file: p2p.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as blockchain_pb from "./blockchain_pb";

export class P2PPubSubMessage extends jspb.Message { 

    hasDaVerificationRequest(): boolean;
    clearDaVerificationRequest(): void;
    getDaVerificationRequest(): DAVerificationRequest | undefined;
    setDaVerificationRequest(value?: DAVerificationRequest): P2PPubSubMessage;

    hasDaVerificationResponse(): boolean;
    clearDaVerificationResponse(): void;
    getDaVerificationResponse(): DAVerificationResponse | undefined;
    setDaVerificationResponse(value?: DAVerificationResponse): P2PPubSubMessage;

    hasStateVerificationRequest(): boolean;
    clearStateVerificationRequest(): void;
    getStateVerificationRequest(): StateVerificationRequest | undefined;
    setStateVerificationRequest(value?: StateVerificationRequest): P2PPubSubMessage;

    hasStateVerificationResponse(): boolean;
    clearStateVerificationResponse(): void;
    getStateVerificationResponse(): StateVerificationResponse | undefined;
    setStateVerificationResponse(value?: StateVerificationResponse): P2PPubSubMessage;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): P2PPubSubMessage.AsObject;
    static toObject(includeInstance: boolean, msg: P2PPubSubMessage): P2PPubSubMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: P2PPubSubMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): P2PPubSubMessage;
    static deserializeBinaryFromReader(message: P2PPubSubMessage, reader: jspb.BinaryReader): P2PPubSubMessage;
}

export namespace P2PPubSubMessage {
    export type AsObject = {
        daVerificationRequest?: DAVerificationRequest.AsObject,
        daVerificationResponse?: DAVerificationResponse.AsObject,
        stateVerificationRequest?: StateVerificationRequest.AsObject,
        stateVerificationResponse?: StateVerificationResponse.AsObject,
    }
}

export class DAVerificationRequest extends jspb.Message { 
    getTxnBundleHash(): Uint8Array | string;
    getTxnBundleHash_asU8(): Uint8Array;
    getTxnBundleHash_asB64(): string;
    setTxnBundleHash(value: Uint8Array | string): DAVerificationRequest;
    clearClaimsList(): void;
    getClaimsList(): Array<blockchain_pb.ComputeClaim>;
    setClaimsList(value: Array<blockchain_pb.ComputeClaim>): DAVerificationRequest;
    addClaims(value?: blockchain_pb.ComputeClaim, index?: number): blockchain_pb.ComputeClaim;
    getRandomnessProof(): Uint8Array | string;
    getRandomnessProof_asU8(): Uint8Array;
    getRandomnessProof_asB64(): string;
    setRandomnessProof(value: Uint8Array | string): DAVerificationRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): DAVerificationRequest.AsObject;
    static toObject(includeInstance: boolean, msg: DAVerificationRequest): DAVerificationRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: DAVerificationRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): DAVerificationRequest;
    static deserializeBinaryFromReader(message: DAVerificationRequest, reader: jspb.BinaryReader): DAVerificationRequest;
}

export namespace DAVerificationRequest {
    export type AsObject = {
        txnBundleHash: Uint8Array | string,
        claimsList: Array<blockchain_pb.ComputeClaim.AsObject>,
        randomnessProof: Uint8Array | string,
    }
}

export class DAVerificationResponse extends jspb.Message { 

    hasResult(): boolean;
    clearResult(): void;
    getResult(): blockchain_pb.DACheckResult | undefined;
    setResult(value?: blockchain_pb.DACheckResult): DAVerificationResponse;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): DAVerificationResponse.AsObject;
    static toObject(includeInstance: boolean, msg: DAVerificationResponse): DAVerificationResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: DAVerificationResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): DAVerificationResponse;
    static deserializeBinaryFromReader(message: DAVerificationResponse, reader: jspb.BinaryReader): DAVerificationResponse;
}

export namespace DAVerificationResponse {
    export type AsObject = {
        result?: blockchain_pb.DACheckResult.AsObject,
    }
}

export class StateVerificationRequest extends jspb.Message { 
    getTxnBundleHash(): Uint8Array | string;
    getTxnBundleHash_asU8(): Uint8Array;
    getTxnBundleHash_asB64(): string;
    setTxnBundleHash(value: Uint8Array | string): StateVerificationRequest;
    clearClaimsList(): void;
    getClaimsList(): Array<blockchain_pb.ComputeClaim>;
    setClaimsList(value: Array<blockchain_pb.ComputeClaim>): StateVerificationRequest;
    addClaims(value?: blockchain_pb.ComputeClaim, index?: number): blockchain_pb.ComputeClaim;
    getRandomnessProof(): Uint8Array | string;
    getRandomnessProof_asU8(): Uint8Array;
    getRandomnessProof_asB64(): string;
    setRandomnessProof(value: Uint8Array | string): StateVerificationRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): StateVerificationRequest.AsObject;
    static toObject(includeInstance: boolean, msg: StateVerificationRequest): StateVerificationRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: StateVerificationRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): StateVerificationRequest;
    static deserializeBinaryFromReader(message: StateVerificationRequest, reader: jspb.BinaryReader): StateVerificationRequest;
}

export namespace StateVerificationRequest {
    export type AsObject = {
        txnBundleHash: Uint8Array | string,
        claimsList: Array<blockchain_pb.ComputeClaim.AsObject>,
        randomnessProof: Uint8Array | string,
    }
}

export class StateVerificationResponse extends jspb.Message { 

    hasResult(): boolean;
    clearResult(): void;
    getResult(): blockchain_pb.StateCheckResult | undefined;
    setResult(value?: blockchain_pb.StateCheckResult): StateVerificationResponse;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): StateVerificationResponse.AsObject;
    static toObject(includeInstance: boolean, msg: StateVerificationResponse): StateVerificationResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: StateVerificationResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): StateVerificationResponse;
    static deserializeBinaryFromReader(message: StateVerificationResponse, reader: jspb.BinaryReader): StateVerificationResponse;
}

export namespace StateVerificationResponse {
    export type AsObject = {
        result?: blockchain_pb.StateCheckResult.AsObject,
    }
}
