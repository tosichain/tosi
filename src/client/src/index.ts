import process from "process";

import { ClientNodeConfig, ClientNode } from "./node";
import { bytesFromHex, createInitialStateFromEnv } from "../../blockchain/util";
import Logger from "../../log/logger";

(async () => {
  const config: ClientNodeConfig = {
    coordinator: {
      serverAddr: String(process.env.COORDINATOR_RPC_SERVER_ADDR),
    },
    ipfs: {
      host: process.env.IPFS_HTTP_API_HOST,
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
      stateVerifier: {
        stateCheckTimeout: Number(process.env.ROLE_STATE_VERIFIER_CHECK_TIMEOUT),
      },
    },
    rpc: {
      port: Number(process.env.API_PORT),
    },
    blsSecKey: bytesFromHex(String(process.env.BLS_SEC_KEY)),
    coordinatorPubKey: bytesFromHex(String(process.env.COORDINATOR_PUB_KEY)),
    DACommitteeSampleSize: Number(process.env.OFFCHAIN_DA_COMMITEE_SAMPLE_SIZE),
    stateCommitteeSampleSize: Number(process.env.OFFCHAIN_STATE_COMMITEE_SAMPLE_SIZE),
  };

  const isDAVerifier = JSON.parse(String(process.env.ROLE_IS_DA_VERIFIER));
  if (!isDAVerifier) {
    config.roles.daVerifier = undefined;
  }

  const isStateVerifier = JSON.parse(String(process.env.ROLE_IS_STATE_VERIFIER));
  if (!isStateVerifier) {
    config.roles.stateVerifier = undefined;
  }

  const log = new Logger("tosi-client", "debug");

  const node = new ClientNode(config, log);
  await node.start();
})().catch((err) => {
  // eslint-disable-next-line no-console
  console.log(err);
});
