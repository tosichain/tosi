import process from "process";
import winston from "winston";

import { CoordinatorNodeConfig, CoordinatorNode } from "./node";
import { createInitialStateFromEnv } from "../../blockchain/util";

(async () => {
  const config: CoordinatorNodeConfig = {
    storage: {
      dbHost: String(process.env.DB_HOST),
      dbUser: String(process.env.DB_USER),
      dbPassword: String(process.env.DB_PASSWORD),
      db: String(process.env.DB_DB),
      initialState: createInitialStateFromEnv(),
    },
    ipfs: {
      options: {
        host: String(process.env.IPFS_HTTP_API_HOST),
      },
      blockchainSyncPeriod: Number(process.env.IPFS_BLOCKCHAIN_SYNC_PERIOD),
    },
    apiServer: {
      port: Number(process.env.API_PORT),
    },
    eth: {
      rpc: String(process.env.ETH_RPC),
      rpcRetryPeriod: Number(process.env.ETH_RPC_RETRY_PERIOD),
      rpcTimeout: Number(process.env.ETH_RPC_TIMEOUT),
      walletSecret: String(process.env.ETH_WALLET_SECRET),
      impersonateAddress: process.env.IMPERSONATE_ADDRESS,
    },
    chain: {
      blockPeriod: Number(process.env.CHAIN_BLOCK_PERIOD),
      coordinatorSmartContract: process.env.COORDINATOR_SMART_CONTRACT,
    },
    blsSecKey: String(process.env.BLS_SECRET),
    DACommitteeSampleSize: Number(process.env.OFFCHAIN_DA_COMMITEE_SAMPLE_SIZE),
    DAVerification: {
      RequestBroadcastPeriod: Number(process.env.OFFCHAIN_DAS_REQUEST_BROADCAST_PERIOD),
      RequestTimeout: Number(process.env.OFFCHAIN_DAS_REQUEST_TIEMOUT),
    },
  };

  const logger = winston.createLogger({
    level: "debug",
    format: winston.format.json(),
    defaultMeta: { service: "tosi-coordinator" },
    transports: [],
  });
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  );

  const node = new CoordinatorNode(config, logger);
  await node.start();
})().catch((err) => {
  // eslint-disable-next-line no-console
  console.log(err);
});
