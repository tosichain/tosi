#!/bin/bash

ROOT_PATH="$( cd "$(dirname "$0")" ; cd ../ ; pwd -P )"
PROTO_PATH=$ROOT_PATH/src/proto
GRPCJS_PATH=$PROTO_PATH/grpcjs
PROTOFILES="blockchain.proto node.proto coordinator.proto client.proto"

$ROOT_PATH/node_modules/.bin/grpc_tools_node_protoc \
--js_out=import_style=commonjs,binary:$GRPCJS_PATH \
--grpc_out=grpc_js:$GRPCJS_PATH \
-I $PROTO_PATH \
$PROTOFILES

$ROOT_PATH/node_modules/.bin/grpc_tools_node_protoc \
--plugin=protoc-gen-ts=$ROOT_PATH/node_modules/.bin/protoc-gen-ts \
--ts_out=grpc_js:$GRPCJS_PATH \
-I $PROTO_PATH \
$PROTOFILES