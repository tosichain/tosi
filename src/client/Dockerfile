FROM node:18-alpine3.14 as builder

WORKDIR /computechain
RUN apk add curl python3

# "Direct" dependencies from computechain source.
COPY [ "src/util.ts", "./src/util.ts" ]
COPY [ "src/blockchain", "./src/blockchain" ]
COPY [ "src/contracts", "./src/contracts" ]
COPY [ "src/coordinator/src/rpc.ts", "./src/coordinator/src/rpc.ts" ]
COPY [ "src/p2p", "./src/p2p" ]
COPY [ "src/proto", "./src/proto"]
COPY [ "src/log", "./src/log"]

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
