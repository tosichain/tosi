FROM node:18-alpine3.14 as builder

WORKDIR /computechain
RUN apk add curl

# "Direct" dependencies from computechain source.
COPY [ "proto/", "./proto" ]
COPY [ "src/util.ts", "./src/util.ts" ]
COPY [ "src/node/ipfs.ts", "./src/node/ipfs.ts"]
COPY [ "src/blockchain", "./src/blockchain" ]
COPY [ "src/contracts", "./src/contracts" ]
COPY [ "src/node/ipfs-service.ts", "./src/node/ipfs-service.ts" ]
COPY [ "src/coordinator/src/api_client.ts", "./src/coordinator/src/api_client.ts" ]
COPY [ "src/p2p", "./src/p2p" ]

# "Indirect" dependencies from computechain source.

# External dependencies of dependencies from computechain source.
COPY ["./src/client/deps-package.json", "./package.json"]
RUN yarn install

WORKDIR /computechain/src/client

# External dependencies of client node.
COPY [ "src/client/package.json", "./" ]
COPY [ "src/client/yarn.lock", "./" ]
RUN yarn install --frozen-lockfile

# Build client node source.
COPY [ "src/client/tsconfig.json", "./" ]
COPY [ "src/client/tslint.json", "./" ]
COPY [ "src/client/src", "./src" ]

COPY ["src/genkey.mjs", "./" ]

RUN yarn build

CMD [ "yarn", "start" ]
