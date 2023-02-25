// GENERATED CODE -- DO NOT EDIT!

// Original file comments:
// Copyright 2019 Cartesi Pte. Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License"); you may not use
// this file except in compliance with the License. You may obtain a copy of the
// License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed
// under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
// CONDITIONS OF ANY KIND, either express or implied. See the License for the
// specific language governing permissions and limitations under the License.
//
'use strict';
var grpc = require('@grpc/grpc-js');
var ipfs_pb = require('./ipfs_pb.js');

function serialize_CartesiIpfs_AddFileRequest(arg) {
  if (!(arg instanceof ipfs_pb.AddFileRequest)) {
    throw new Error('Expected argument of type CartesiIpfs.AddFileRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_CartesiIpfs_AddFileRequest(buffer_arg) {
  return ipfs_pb.AddFileRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_CartesiIpfs_AddFileResponse(arg) {
  if (!(arg instanceof ipfs_pb.AddFileResponse)) {
    throw new Error('Expected argument of type CartesiIpfs.AddFileResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_CartesiIpfs_AddFileResponse(buffer_arg) {
  return ipfs_pb.AddFileResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_CartesiIpfs_CacheMerkleRootHashRequest(arg) {
  if (!(arg instanceof ipfs_pb.CacheMerkleRootHashRequest)) {
    throw new Error('Expected argument of type CartesiIpfs.CacheMerkleRootHashRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_CartesiIpfs_CacheMerkleRootHashRequest(buffer_arg) {
  return ipfs_pb.CacheMerkleRootHashRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_CartesiIpfs_CacheMerkleRootHashResponse(arg) {
  if (!(arg instanceof ipfs_pb.CacheMerkleRootHashResponse)) {
    throw new Error('Expected argument of type CartesiIpfs.CacheMerkleRootHashResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_CartesiIpfs_CacheMerkleRootHashResponse(buffer_arg) {
  return ipfs_pb.CacheMerkleRootHashResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_CartesiIpfs_GetFileRequest(arg) {
  if (!(arg instanceof ipfs_pb.GetFileRequest)) {
    throw new Error('Expected argument of type CartesiIpfs.GetFileRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_CartesiIpfs_GetFileRequest(buffer_arg) {
  return ipfs_pb.GetFileRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_CartesiIpfs_GetFileResponse(arg) {
  if (!(arg instanceof ipfs_pb.GetFileResponse)) {
    throw new Error('Expected argument of type CartesiIpfs.GetFileResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_CartesiIpfs_GetFileResponse(buffer_arg) {
  return ipfs_pb.GetFileResponse.deserializeBinary(new Uint8Array(buffer_arg));
}


var IpfsService = exports.IpfsService = {
  getFile: {
    path: '/CartesiIpfs.Ipfs/GetFile',
    requestStream: false,
    responseStream: false,
    requestType: ipfs_pb.GetFileRequest,
    responseType: ipfs_pb.GetFileResponse,
    requestSerialize: serialize_CartesiIpfs_GetFileRequest,
    requestDeserialize: deserialize_CartesiIpfs_GetFileRequest,
    responseSerialize: serialize_CartesiIpfs_GetFileResponse,
    responseDeserialize: deserialize_CartesiIpfs_GetFileResponse,
  },
  addFile: {
    path: '/CartesiIpfs.Ipfs/AddFile',
    requestStream: false,
    responseStream: false,
    requestType: ipfs_pb.AddFileRequest,
    responseType: ipfs_pb.AddFileResponse,
    requestSerialize: serialize_CartesiIpfs_AddFileRequest,
    requestDeserialize: deserialize_CartesiIpfs_AddFileRequest,
    responseSerialize: serialize_CartesiIpfs_AddFileResponse,
    responseDeserialize: deserialize_CartesiIpfs_AddFileResponse,
  },
  // CacheMerkleRootHash caches value of merkle root hash for given ipfs_path and log_2_size.
// GetFile will use cached merkle root hash instead of computing it.
cacheMerkleRootHash: {
    path: '/CartesiIpfs.Ipfs/CacheMerkleRootHash',
    requestStream: false,
    responseStream: false,
    requestType: ipfs_pb.CacheMerkleRootHashRequest,
    responseType: ipfs_pb.CacheMerkleRootHashResponse,
    requestSerialize: serialize_CartesiIpfs_CacheMerkleRootHashRequest,
    requestDeserialize: deserialize_CartesiIpfs_CacheMerkleRootHashRequest,
    responseSerialize: serialize_CartesiIpfs_CacheMerkleRootHashResponse,
    responseDeserialize: deserialize_CartesiIpfs_CacheMerkleRootHashResponse,
  },
};

exports.IpfsClient = grpc.makeGenericClientConstructor(IpfsService);
