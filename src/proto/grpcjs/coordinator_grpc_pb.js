// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('@grpc/grpc-js');
var coordinator_pb = require('./coordinator_pb.js');
var blockchain_pb = require('./blockchain_pb.js');
var node_pb = require('./node_pb.js');

function serialize_client_GetBlockMetadataRequest(arg) {
  if (!(arg instanceof coordinator_pb.GetBlockMetadataRequest)) {
    throw new Error('Expected argument of type client.GetBlockMetadataRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_client_GetBlockMetadataRequest(buffer_arg) {
  return coordinator_pb.GetBlockMetadataRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_client_GetBlockMetadataResponse(arg) {
  if (!(arg instanceof coordinator_pb.GetBlockMetadataResponse)) {
    throw new Error('Expected argument of type client.GetBlockMetadataResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_client_GetBlockMetadataResponse(buffer_arg) {
  return coordinator_pb.GetBlockMetadataResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_client_SubmitSignedTransactionRequest(arg) {
  if (!(arg instanceof coordinator_pb.SubmitSignedTransactionRequest)) {
    throw new Error('Expected argument of type client.SubmitSignedTransactionRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_client_SubmitSignedTransactionRequest(buffer_arg) {
  return coordinator_pb.SubmitSignedTransactionRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_client_SubmitSignedTransactionResponse(arg) {
  if (!(arg instanceof coordinator_pb.SubmitSignedTransactionResponse)) {
    throw new Error('Expected argument of type client.SubmitSignedTransactionResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_client_SubmitSignedTransactionResponse(buffer_arg) {
  return coordinator_pb.SubmitSignedTransactionResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_node_GetAccountRequest(arg) {
  if (!(arg instanceof node_pb.GetAccountRequest)) {
    throw new Error('Expected argument of type node.GetAccountRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_node_GetAccountRequest(buffer_arg) {
  return node_pb.GetAccountRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_node_GetAccountResponse(arg) {
  if (!(arg instanceof node_pb.GetAccountResponse)) {
    throw new Error('Expected argument of type node.GetAccountResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_node_GetAccountResponse(buffer_arg) {
  return node_pb.GetAccountResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_node_GetAccountTransactionsRequest(arg) {
  if (!(arg instanceof node_pb.GetAccountTransactionsRequest)) {
    throw new Error('Expected argument of type node.GetAccountTransactionsRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_node_GetAccountTransactionsRequest(buffer_arg) {
  return node_pb.GetAccountTransactionsRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_node_GetAccountTransactionsResponse(arg) {
  if (!(arg instanceof node_pb.GetAccountTransactionsResponse)) {
    throw new Error('Expected argument of type node.GetAccountTransactionsResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_node_GetAccountTransactionsResponse(buffer_arg) {
  return node_pb.GetAccountTransactionsResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_node_GetBLSPublicKeyRequest(arg) {
  if (!(arg instanceof node_pb.GetBLSPublicKeyRequest)) {
    throw new Error('Expected argument of type node.GetBLSPublicKeyRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_node_GetBLSPublicKeyRequest(buffer_arg) {
  return node_pb.GetBLSPublicKeyRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_node_GetBLSPublicKeyResponse(arg) {
  if (!(arg instanceof node_pb.GetBLSPublicKeyResponse)) {
    throw new Error('Expected argument of type node.GetBLSPublicKeyResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_node_GetBLSPublicKeyResponse(buffer_arg) {
  return node_pb.GetBLSPublicKeyResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_node_GetBlockRequest(arg) {
  if (!(arg instanceof node_pb.GetBlockRequest)) {
    throw new Error('Expected argument of type node.GetBlockRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_node_GetBlockRequest(buffer_arg) {
  return node_pb.GetBlockRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_node_GetBlockResponse(arg) {
  if (!(arg instanceof node_pb.GetBlockResponse)) {
    throw new Error('Expected argument of type node.GetBlockResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_node_GetBlockResponse(buffer_arg) {
  return node_pb.GetBlockResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_node_GetDataChainListRequest(arg) {
  if (!(arg instanceof node_pb.GetDataChainListRequest)) {
    throw new Error('Expected argument of type node.GetDataChainListRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_node_GetDataChainListRequest(buffer_arg) {
  return node_pb.GetDataChainListRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_node_GetDataChainListResponse(arg) {
  if (!(arg instanceof node_pb.GetDataChainListResponse)) {
    throw new Error('Expected argument of type node.GetDataChainListResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_node_GetDataChainListResponse(buffer_arg) {
  return node_pb.GetDataChainListResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_node_GetDataChainRequest(arg) {
  if (!(arg instanceof node_pb.GetDataChainRequest)) {
    throw new Error('Expected argument of type node.GetDataChainRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_node_GetDataChainRequest(buffer_arg) {
  return node_pb.GetDataChainRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_node_GetDataChainResponse(arg) {
  if (!(arg instanceof node_pb.GetDataChainResponse)) {
    throw new Error('Expected argument of type node.GetDataChainResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_node_GetDataChainResponse(buffer_arg) {
  return node_pb.GetDataChainResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_node_GetHeadBlockHashRequest(arg) {
  if (!(arg instanceof node_pb.GetHeadBlockHashRequest)) {
    throw new Error('Expected argument of type node.GetHeadBlockHashRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_node_GetHeadBlockHashRequest(buffer_arg) {
  return node_pb.GetHeadBlockHashRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_node_GetStakerListRequest(arg) {
  if (!(arg instanceof node_pb.GetStakerListRequest)) {
    throw new Error('Expected argument of type node.GetStakerListRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_node_GetStakerListRequest(buffer_arg) {
  return node_pb.GetStakerListRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_node_GetStakerListResponse(arg) {
  if (!(arg instanceof node_pb.GetStakerListResponse)) {
    throw new Error('Expected argument of type node.GetStakerListResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_node_GetStakerListResponse(buffer_arg) {
  return node_pb.GetStakerListResponse.deserializeBinary(new Uint8Array(buffer_arg));
}


var CoordinatorNodeService = exports.CoordinatorNodeService = {
  getBlock: {
    path: '/client.CoordinatorNode/GetBlock',
    requestStream: false,
    responseStream: false,
    requestType: node_pb.GetBlockRequest,
    responseType: node_pb.GetBlockResponse,
    requestSerialize: serialize_node_GetBlockRequest,
    requestDeserialize: deserialize_node_GetBlockRequest,
    responseSerialize: serialize_node_GetBlockResponse,
    responseDeserialize: deserialize_node_GetBlockResponse,
  },
  getAccount: {
    path: '/client.CoordinatorNode/GetAccount',
    requestStream: false,
    responseStream: false,
    requestType: node_pb.GetAccountRequest,
    responseType: node_pb.GetAccountResponse,
    requestSerialize: serialize_node_GetAccountRequest,
    requestDeserialize: deserialize_node_GetAccountRequest,
    responseSerialize: serialize_node_GetAccountResponse,
    responseDeserialize: deserialize_node_GetAccountResponse,
  },
  getAccountTransactions: {
    path: '/client.CoordinatorNode/GetAccountTransactions',
    requestStream: false,
    responseStream: false,
    requestType: node_pb.GetAccountTransactionsRequest,
    responseType: node_pb.GetAccountTransactionsResponse,
    requestSerialize: serialize_node_GetAccountTransactionsRequest,
    requestDeserialize: deserialize_node_GetAccountTransactionsRequest,
    responseSerialize: serialize_node_GetAccountTransactionsResponse,
    responseDeserialize: deserialize_node_GetAccountTransactionsResponse,
  },
  getStakerList: {
    path: '/client.CoordinatorNode/GetStakerList',
    requestStream: false,
    responseStream: false,
    requestType: node_pb.GetStakerListRequest,
    responseType: node_pb.GetStakerListResponse,
    requestSerialize: serialize_node_GetStakerListRequest,
    requestDeserialize: deserialize_node_GetStakerListRequest,
    responseSerialize: serialize_node_GetStakerListResponse,
    responseDeserialize: deserialize_node_GetStakerListResponse,
  },
  getDataChain: {
    path: '/client.CoordinatorNode/GetDataChain',
    requestStream: false,
    responseStream: false,
    requestType: node_pb.GetDataChainRequest,
    responseType: node_pb.GetDataChainResponse,
    requestSerialize: serialize_node_GetDataChainRequest,
    requestDeserialize: deserialize_node_GetDataChainRequest,
    responseSerialize: serialize_node_GetDataChainResponse,
    responseDeserialize: deserialize_node_GetDataChainResponse,
  },
  getDataChainList: {
    path: '/client.CoordinatorNode/GetDataChainList',
    requestStream: false,
    responseStream: false,
    requestType: node_pb.GetDataChainListRequest,
    responseType: node_pb.GetDataChainResponse,
    requestSerialize: serialize_node_GetDataChainListRequest,
    requestDeserialize: deserialize_node_GetDataChainListRequest,
    responseSerialize: serialize_node_GetDataChainResponse,
    responseDeserialize: deserialize_node_GetDataChainResponse,
  },
  getHeadBlockHash: {
    path: '/client.CoordinatorNode/GetHeadBlockHash',
    requestStream: false,
    responseStream: false,
    requestType: node_pb.GetHeadBlockHashRequest,
    responseType: node_pb.GetDataChainListResponse,
    requestSerialize: serialize_node_GetHeadBlockHashRequest,
    requestDeserialize: deserialize_node_GetHeadBlockHashRequest,
    responseSerialize: serialize_node_GetDataChainListResponse,
    responseDeserialize: deserialize_node_GetDataChainListResponse,
  },
  getBLSPublicKey: {
    path: '/client.CoordinatorNode/GetBLSPublicKey',
    requestStream: false,
    responseStream: false,
    requestType: node_pb.GetBLSPublicKeyRequest,
    responseType: node_pb.GetBLSPublicKeyResponse,
    requestSerialize: serialize_node_GetBLSPublicKeyRequest,
    requestDeserialize: deserialize_node_GetBLSPublicKeyRequest,
    responseSerialize: serialize_node_GetBLSPublicKeyResponse,
    responseDeserialize: deserialize_node_GetBLSPublicKeyResponse,
  },
  sumbitSignedTransaction: {
    path: '/client.CoordinatorNode/SumbitSignedTransaction',
    requestStream: false,
    responseStream: false,
    requestType: coordinator_pb.SubmitSignedTransactionRequest,
    responseType: coordinator_pb.SubmitSignedTransactionResponse,
    requestSerialize: serialize_client_SubmitSignedTransactionRequest,
    requestDeserialize: deserialize_client_SubmitSignedTransactionRequest,
    responseSerialize: serialize_client_SubmitSignedTransactionResponse,
    responseDeserialize: deserialize_client_SubmitSignedTransactionResponse,
  },
  getBlockMetadata: {
    path: '/client.CoordinatorNode/GetBlockMetadata',
    requestStream: false,
    responseStream: false,
    requestType: coordinator_pb.GetBlockMetadataRequest,
    responseType: coordinator_pb.GetBlockMetadataResponse,
    requestSerialize: serialize_client_GetBlockMetadataRequest,
    requestDeserialize: deserialize_client_GetBlockMetadataRequest,
    responseSerialize: serialize_client_GetBlockMetadataResponse,
    responseDeserialize: deserialize_client_GetBlockMetadataResponse,
  },
};

exports.CoordinatorNodeClient = grpc.makeGenericClientConstructor(CoordinatorNodeService);
