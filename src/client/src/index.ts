import process from "process";
import winston from "winston";

import { ClientNodeConfig, ClientNode } from "./node";
import { createInitialStateFromEnv } from "../../blockchain/util";

(async () => {
  const config: ClientNodeConfig = {
    coordinator: {
      apiURL: String(process.env.COORDINATOR_API_URL),
    },
    ipfs: {
      host: process.env.IPFS_HTTP_API_HOST,
    },
    ipfsService: {
      address: String(process.env.IPFS_SERVICE_HOST_PORT),
    },
    storage: {
      dbHost: String(process.env.DB_HOST),
      dbUser: String(process.env.DB_USER),
      dbPassword: String(process.env.DB_PASSWORD),
      db: String(process.env.DB_DB),
      initialState: createInitialStateFromEnv(),
    },
    blokchainSync: {
      eth: {
        rpc: String(process.env.SYNC_ETH_RPC),
        claimContractAddress: String(process.env.SYNC_ETH_CLAIM_CONTRACT_ADDRESS),
      },
      syncPeriod: Number(process.env.SYNC_PERIOD),
    },
    roles: {
      daVerifier: {
        DACheckTimeout: Number(process.env.ROLE_DA_VERIFIER_DA_CHECK_TIMEOUT),
      },
    },
    api: {
      port: Number(process.env.API_PORT),
    },
    blsSecKey: String(process.env.BLS_SEC_KEY),
    coordinatorPubKey: String(process.env.COORDINATOR_PUB_KEY),
    DACommitteeSampleSize: Number(process.env.OFFCHAIN_DA_COMMITEE_SAMPLE_SIZE),
  };

  const isDAVerifier = JSON.parse(String(process.env.ROLE_IS_DA_VERIFIER));
  if (!isDAVerifier) {
    config.roles.daVerifier = undefined;
  }

  const log = winston.createLogger({
    level: "debug",
    format: winston.format.json(),
    defaultMeta: { service: "tosi-client" },
    transports: [],
  });
  log.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  );

  const node = new ClientNode(config, log);
  await node.start();
})().catch((err) => {
  // eslint-disable-next-line no-console
  console.log(err);
});
