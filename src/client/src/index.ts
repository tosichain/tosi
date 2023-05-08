import process from "process";

import { ClientNodeConfig, ClientNode } from "./node";
import { bytesFromHex, createInitialStateFromEnv } from "../../blockchain/util";
import Logger from "../../log/logger";
import { fetchDrandBeaconInfo } from "../../blockchain/block_randomness";

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
    blockchainSync: {
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
      noPrivileged: process.env.NO_PRIVILEGED_RPC ? true : false,
    },
    blsSecKey: bytesFromHex(String(process.env.BLS_SEC_KEY)),
    coordinatorPubKey: bytesFromHex(String(process.env.COORDINATOR_PUB_KEY)),
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
  const drandBeaconInfo = await fetchDrandBeaconInfo();
  const node = new ClientNode(config, log, drandBeaconInfo);
  await node.start();
})().catch((err) => {
  // eslint-disable-next-line no-console
  console.log(err);
});
