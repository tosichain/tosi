// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('@grpc/grpc-js');
var client_pb = require('./client_pb.js');
var blockchain_pb = require('./blockchain_pb.js');
var node_pb = require('./node_pb.js');

function serialize_client_GenerateCreateDataChainTxnRequest(arg) {
  if (!(arg instanceof client_pb.GenerateCreateDataChainTxnRequest)) {
    throw new Error('Expected argument of type client.GenerateCreateDataChainTxnRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_client_GenerateCreateDataChainTxnRequest(buffer_arg) {
  return client_pb.GenerateCreateDataChainTxnRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_client_GenerateCreateDataChainTxnResponse(arg) {
  if (!(arg instanceof client_pb.GenerateCreateDataChainTxnResponse)) {
    throw new Error('Expected argument of type client.GenerateCreateDataChainTxnResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_client_GenerateCreateDataChainTxnResponse(buffer_arg) {
  return client_pb.GenerateCreateDataChainTxnResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_client_GenerateUpdateDataChainTxnRequest(arg) {
  if (!(arg instanceof client_pb.GenerateUpdateDataChainTxnRequest)) {
    throw new Error('Expected argument of type client.GenerateUpdateDataChainTxnRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_client_GenerateUpdateDataChainTxnRequest(buffer_arg) {
  return client_pb.GenerateUpdateDataChainTxnRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_client_GenerateUpdateDataChainTxnResponse(arg) {
  if (!(arg instanceof client_pb.GenerateUpdateDataChainTxnResponse)) {
    throw new Error('Expected argument of type client.GenerateUpdateDataChainTxnResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_client_GenerateUpdateDataChainTxnResponse(buffer_arg) {
  return client_pb.GenerateUpdateDataChainTxnResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_client_GetLocalHeadBlockHashRequest(arg) {
  if (!(arg instanceof client_pb.GetLocalHeadBlockHashRequest)) {
    throw new Error('Expected argument of type client.GetLocalHeadBlockHashRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_client_GetLocalHeadBlockHashRequest(buffer_arg) {
  return client_pb.GetLocalHeadBlockHashRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_client_GetLocalHeadBlockHashResponse(arg) {
  if (!(arg instanceof client_pb.GetLocalHeadBlockHashResponse)) {
    throw new Error('Expected argument of type client.GetLocalHeadBlockHashResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_client_GetLocalHeadBlockHashResponse(buffer_arg) {
  return client_pb.GetLocalHeadBlockHashResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_client_GetSyncStatusRequest(arg) {
  if (!(arg instanceof client_pb.GetSyncStatusRequest)) {
    throw new Error('Expected argument of type client.GetSyncStatusRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_client_GetSyncStatusRequest(buffer_arg) {
  return client_pb.GetSyncStatusRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_client_GetSyncStatusResponse(arg) {
  if (!(arg instanceof client_pb.GetSyncStatusResponse)) {
    throw new Error('Expected argument of type client.GetSyncStatusResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_client_GetSyncStatusResponse(buffer_arg) {
  return client_pb.GetSyncStatusResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_client_SubmitTransactionRequest(arg) {
  if (!(arg instanceof client_pb.SubmitTransactionRequest)) {
    throw new Error('Expected argument of type client.SubmitTransactionRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_client_SubmitTransactionRequest(buffer_arg) {
  return client_pb.SubmitTransactionRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_client_SubmitTransactionResponse(arg) {
  if (!(arg instanceof client_pb.SubmitTransactionResponse)) {
    throw new Error('Expected argument of type client.SubmitTransactionResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_client_SubmitTransactionResponse(buffer_arg) {
  return client_pb.SubmitTransactionResponse.deserializeBinary(new Uint8Array(buffer_arg));
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


var ClientNodeService = exports.ClientNodeService = {
  getBlock: {
    path: '/client.ClientNode/GetBlock',
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
    path: '/client.ClientNode/GetAccount',
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
    path: '/client.ClientNode/GetAccountTransactions',
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
    path: '/client.ClientNode/GetStakerList',
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
    path: '/client.ClientNode/GetDataChain',
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
    path: '/client.ClientNode/GetDataChainList',
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
    path: '/client.ClientNode/GetHeadBlockHash',
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
    path: '/client.ClientNode/GetBLSPublicKey',
    requestStream: false,
    responseStream: false,
    requestType: node_pb.GetBLSPublicKeyRequest,
    responseType: node_pb.GetBLSPublicKeyResponse,
    requestSerialize: serialize_node_GetBLSPublicKeyRequest,
    requestDeserialize: deserialize_node_GetBLSPublicKeyRequest,
    responseSerialize: serialize_node_GetBLSPublicKeyResponse,
    responseDeserialize: deserialize_node_GetBLSPublicKeyResponse,
  },
  generateCreateDatachainTxn: {
    path: '/client.ClientNode/GenerateCreateDatachainTxn',
    requestStream: false,
    responseStream: false,
    requestType: client_pb.GenerateCreateDataChainTxnRequest,
    responseType: client_pb.GenerateCreateDataChainTxnResponse,
    requestSerialize: serialize_client_GenerateCreateDataChainTxnRequest,
    requestDeserialize: deserialize_client_GenerateCreateDataChainTxnRequest,
    responseSerialize: serialize_client_GenerateCreateDataChainTxnResponse,
    responseDeserialize: deserialize_client_GenerateCreateDataChainTxnResponse,
  },
  generateUpdateDatachainTxn: {
    path: '/client.ClientNode/GenerateUpdateDatachainTxn',
    requestStream: false,
    responseStream: false,
    requestType: client_pb.GenerateUpdateDataChainTxnRequest,
    responseType: client_pb.GenerateUpdateDataChainTxnResponse,
    requestSerialize: serialize_client_GenerateUpdateDataChainTxnRequest,
    requestDeserialize: deserialize_client_GenerateUpdateDataChainTxnRequest,
    responseSerialize: serialize_client_GenerateUpdateDataChainTxnResponse,
    responseDeserialize: deserialize_client_GenerateUpdateDataChainTxnResponse,
  },
  sumbitTransaction: {
    path: '/client.ClientNode/SumbitTransaction',
    requestStream: false,
    responseStream: false,
    requestType: client_pb.SubmitTransactionRequest,
    responseType: client_pb.SubmitTransactionResponse,
    requestSerialize: serialize_client_SubmitTransactionRequest,
    requestDeserialize: deserialize_client_SubmitTransactionRequest,
    responseSerialize: serialize_client_SubmitTransactionResponse,
    responseDeserialize: deserialize_client_SubmitTransactionResponse,
  },
  getSyncStatus: {
    path: '/client.ClientNode/GetSyncStatus',
    requestStream: false,
    responseStream: false,
    requestType: client_pb.GetSyncStatusRequest,
    responseType: client_pb.GetSyncStatusResponse,
    requestSerialize: serialize_client_GetSyncStatusRequest,
    requestDeserialize: deserialize_client_GetSyncStatusRequest,
    responseSerialize: serialize_client_GetSyncStatusResponse,
    responseDeserialize: deserialize_client_GetSyncStatusResponse,
  },
  getLocalHeadBlockHash: {
    path: '/client.ClientNode/GetLocalHeadBlockHash',
    requestStream: false,
    responseStream: false,
    requestType: client_pb.GetLocalHeadBlockHashRequest,
    responseType: client_pb.GetLocalHeadBlockHashResponse,
    requestSerialize: serialize_client_GetLocalHeadBlockHashRequest,
    requestDeserialize: deserialize_client_GetLocalHeadBlockHashRequest,
    responseSerialize: serialize_client_GetLocalHeadBlockHashResponse,
    responseDeserialize: deserialize_client_GetLocalHeadBlockHashResponse,
  },
};

exports.ClientNodeClient = grpc.makeGenericClientConstructor(ClientNodeService);
