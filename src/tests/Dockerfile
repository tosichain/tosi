FROM node:18-alpine3.14 as builder

WORKDIR /app

COPY src ./src

COPY test ./test

COPY scripts ./scripts

COPY hardhat.config.ts ./hardhat.config.ts

COPY tsconfig.json ./tsconfig.json

COPY package.json yarn.lock ./

COPY .mocharc.json ./.mocharc.json

RUN apk update && apk add --virtual build-dependencies build-base gcc wget git python3 cmake

RUN yarn install
