FROM node:18-alpine3.14 as builder

WORKDIR /computechain
RUN apk add curl python3

# "Direct" dependencies from computechain source.
COPY [ "src/util.ts", "./src/util.ts" ]
COPY [ "src/blockchain", "./src/blockchain" ]
COPY [ "src/p2p", "./src/p2p" ]
COPY [ "src/contracts", "./src/contracts" ]
COPY [ "src/proto", "./src/proto"]
COPY [ "src/log", "./src/log"]

# "Indirect" dependencies from computechain source.

# External dependencies of dependencies from computechain source.
COPY ["./src/coordinator/deps-package.json", "./package.json"]
RUN yarn install

WORKDIR /computechain/src/coordinator

# External dependencies of coordinator node.
COPY [ "src/coordinator/package.json", "./" ]
RUN yarn install

# Build coordinator node source.
COPY [ "src/coordinator/tsconfig.json", "./" ]
COPY [ "src/coordinator/tslint.json", "./" ]
COPY [ "src/coordinator/src", "./src" ]
RUN yarn build

CMD [ "yarn", "start", "--configFile", "/config/tosi-coordinator.yml"]
