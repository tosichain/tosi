// package: CartesiIpfs
// file: ipfs.proto

/* tslint:disable */
/* eslint-disable */

import * as grpc from "@grpc/grpc-js";
import * as ipfs_pb from "./ipfs_pb";

interface IIpfsService extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
    getFile: IIpfsService_IGetFile;
    addFile: IIpfsService_IAddFile;
    cacheMerkleRootHash: IIpfsService_ICacheMerkleRootHash;
}

interface IIpfsService_IGetFile extends grpc.MethodDefinition<ipfs_pb.GetFileRequest, ipfs_pb.GetFileResponse> {
    path: "/CartesiIpfs.Ipfs/GetFile";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<ipfs_pb.GetFileRequest>;
    requestDeserialize: grpc.deserialize<ipfs_pb.GetFileRequest>;
    responseSerialize: grpc.serialize<ipfs_pb.GetFileResponse>;
    responseDeserialize: grpc.deserialize<ipfs_pb.GetFileResponse>;
}
interface IIpfsService_IAddFile extends grpc.MethodDefinition<ipfs_pb.AddFileRequest, ipfs_pb.AddFileResponse> {
    path: "/CartesiIpfs.Ipfs/AddFile";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<ipfs_pb.AddFileRequest>;
    requestDeserialize: grpc.deserialize<ipfs_pb.AddFileRequest>;
    responseSerialize: grpc.serialize<ipfs_pb.AddFileResponse>;
    responseDeserialize: grpc.deserialize<ipfs_pb.AddFileResponse>;
}
interface IIpfsService_ICacheMerkleRootHash extends grpc.MethodDefinition<ipfs_pb.CacheMerkleRootHashRequest, ipfs_pb.CacheMerkleRootHashResponse> {
    path: "/CartesiIpfs.Ipfs/CacheMerkleRootHash";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<ipfs_pb.CacheMerkleRootHashRequest>;
    requestDeserialize: grpc.deserialize<ipfs_pb.CacheMerkleRootHashRequest>;
    responseSerialize: grpc.serialize<ipfs_pb.CacheMerkleRootHashResponse>;
    responseDeserialize: grpc.deserialize<ipfs_pb.CacheMerkleRootHashResponse>;
}

export const IpfsService: IIpfsService;

export interface IIpfsServer extends grpc.UntypedServiceImplementation {
    getFile: grpc.handleUnaryCall<ipfs_pb.GetFileRequest, ipfs_pb.GetFileResponse>;
    addFile: grpc.handleUnaryCall<ipfs_pb.AddFileRequest, ipfs_pb.AddFileResponse>;
    cacheMerkleRootHash: grpc.handleUnaryCall<ipfs_pb.CacheMerkleRootHashRequest, ipfs_pb.CacheMerkleRootHashResponse>;
}

export interface IIpfsClient {
    getFile(request: ipfs_pb.GetFileRequest, callback: (error: grpc.ServiceError | null, response: ipfs_pb.GetFileResponse) => void): grpc.ClientUnaryCall;
    getFile(request: ipfs_pb.GetFileRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: ipfs_pb.GetFileResponse) => void): grpc.ClientUnaryCall;
    getFile(request: ipfs_pb.GetFileRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: ipfs_pb.GetFileResponse) => void): grpc.ClientUnaryCall;
    addFile(request: ipfs_pb.AddFileRequest, callback: (error: grpc.ServiceError | null, response: ipfs_pb.AddFileResponse) => void): grpc.ClientUnaryCall;
    addFile(request: ipfs_pb.AddFileRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: ipfs_pb.AddFileResponse) => void): grpc.ClientUnaryCall;
    addFile(request: ipfs_pb.AddFileRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: ipfs_pb.AddFileResponse) => void): grpc.ClientUnaryCall;
    cacheMerkleRootHash(request: ipfs_pb.CacheMerkleRootHashRequest, callback: (error: grpc.ServiceError | null, response: ipfs_pb.CacheMerkleRootHashResponse) => void): grpc.ClientUnaryCall;
    cacheMerkleRootHash(request: ipfs_pb.CacheMerkleRootHashRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: ipfs_pb.CacheMerkleRootHashResponse) => void): grpc.ClientUnaryCall;
    cacheMerkleRootHash(request: ipfs_pb.CacheMerkleRootHashRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: ipfs_pb.CacheMerkleRootHashResponse) => void): grpc.ClientUnaryCall;
}

export class IpfsClient extends grpc.Client implements IIpfsClient {
    constructor(address: string, credentials: grpc.ChannelCredentials, options?: Partial<grpc.ClientOptions>);
    public getFile(request: ipfs_pb.GetFileRequest, callback: (error: grpc.ServiceError | null, response: ipfs_pb.GetFileResponse) => void): grpc.ClientUnaryCall;
    public getFile(request: ipfs_pb.GetFileRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: ipfs_pb.GetFileResponse) => void): grpc.ClientUnaryCall;
    public getFile(request: ipfs_pb.GetFileRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: ipfs_pb.GetFileResponse) => void): grpc.ClientUnaryCall;
    public addFile(request: ipfs_pb.AddFileRequest, callback: (error: grpc.ServiceError | null, response: ipfs_pb.AddFileResponse) => void): grpc.ClientUnaryCall;
    public addFile(request: ipfs_pb.AddFileRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: ipfs_pb.AddFileResponse) => void): grpc.ClientUnaryCall;
    public addFile(request: ipfs_pb.AddFileRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: ipfs_pb.AddFileResponse) => void): grpc.ClientUnaryCall;
    public cacheMerkleRootHash(request: ipfs_pb.CacheMerkleRootHashRequest, callback: (error: grpc.ServiceError | null, response: ipfs_pb.CacheMerkleRootHashResponse) => void): grpc.ClientUnaryCall;
    public cacheMerkleRootHash(request: ipfs_pb.CacheMerkleRootHashRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: ipfs_pb.CacheMerkleRootHashResponse) => void): grpc.ClientUnaryCall;
    public cacheMerkleRootHash(request: ipfs_pb.CacheMerkleRootHashRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: ipfs_pb.CacheMerkleRootHashResponse) => void): grpc.ClientUnaryCall;
}
