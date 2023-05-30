import path from "path";
import { writeFileSync } from "fs";

import { dump } from "js-yaml";
import { configure, render } from "nunjucks";
import { bls12_381 as BLS } from "@noble/curves/bls12-381";

import { bytesToHex } from "@noble/curves/abstract/utils";
import { DA_VERIFIER_COUNT, STATE_VERIFIER_COUNT } from "../src/blockchain/constant";
import { CoordinatorNodeConfig } from "../src/coordinator/src/node";
import { ClientNodeConfig } from "../src/client/src/node";

const NODE_CONFIG_DIR = "../docker-compose/config";

// TODO: this must be deprecated.
const MINTER_ADDRESS_LEGACY =
  "87f2f8a1a5c2b002828045ed6b76ff5033ba9983b5856f35d7f4dfd6dbe76b773bd71cb7336dd5e5dbaea3a8d0f11df8";

const MINTER_ADDRESS_MAINNET =
  "8490ca0575998160e2fcb0381b6f95edd7d1ab9e8e4640010476c0c535334b5ea2889ebee4bba46bee6cbbdc9421e95c";
const MINTER_ADDRESS_TESTNET =
  "ab92bd04cb362bf07ce6380727fb956379963da44c6027fea2cbeddf516f7151320491a27b7f4df4106f94224641a6f4";

const CONTRACT_ADDRESS_LOCALNET = "0xB249f874F74B8d873b3252759Caed4388cfe2492";
const CONTRACT_ADDRESS_MAINNET = "0x630809d980b66B36ea733bE3899615339E428C5";
const CONTRACT_ADDRESS_TESTNET = "0x4731A0Dd87e637321D4E4980BeF351f992F14b77";

const COORDINATOR_BLOCK_MINT_PERIOD = 2000; // 2 seconds
const COORDINATOR_BLOCK_UPLOAD_PERIOD = 2000; // 2 seconds

const CLIENT_BLOCK_SYNC_PERIOD = 2000; // 2 seconds

const DA_VERIFICATION_REQUEST_BROADCAST_PERIOD = 300000; // 5 minutes
const DA_VERIFICATION_REQUEST_TIEMOUT = 600000; // 10 minutes
const STATE_VERIFICATION_REQUEST_BROADCAST_PERIOD = 300000; // 5 minutes
const STATE_VERIFICATION_REQUEST_TIEMOUT = 600000; // 10 minute

const DA_CHECK_TIMEOUT = 15; // 15 seconds
const STATE_CHECK_TIMEOUT = 15; // 15 seconds

const MYSQL_USER = "root";
const MYSQL_PASSWORD = "example";
const MYSQL_DB_NAME = "tosi";

const ETH_RPC_ADDRESS_LOCALNET = "http://localnet:8545";
const ETH_RPC_ADDRESS_MAINNET = "https://arb1.arbitrum.io/rpc";
const ETH_RPC_ADDRESS_TESTNET = "https://goerli-rollup.arbitrum.io/rpc";

const ETH_RPC_RETRY_PERIOD = 1000; // 1 second
const ETH_RPC_TIMEOUT = 5000; // 5 seconds

const COORDINATR_ETH_SIGNER_WALLET_SECRET = "0x2cca4b1846d60c2a417ad601ff7b5bfad7343c9de8bdbd19d5ca4a3e0f492dd7";
const COORDINATOR_ETH_SIGNER_IMPERSONATE_ADDRESS = "0xb95391c36d66eba3565a3fc30f2786c9438c5ac5";

const VERIFIER_SERVICE_USER = "root";
const VERIFIER_SERVICE_PASSWORD = "Docker!";

const COORIDNATOR_PUB_KEY_MAINNET =
  "aee7ecc1c86bfb526a3940dc2b1065f7ec436db34ea74022cb8934224ac97b6fa2eba1da0f5344d474f8a7816ec8e65";
const COORDINATOR_PUB_KEY_TESTNET =
  "8ea14bd457eaa9d91a4ad862f6252d67462232a5e3d88ea8a752875725e6e3843b2d1533cc507f59f4c732c266e52417";

const COORDINATOR_RPC_MAINNET = "coordinator.tosichain.com:443";
const COORDINATOR_RPC_TESTNET = "coordinator.dev.tosichain.com:443";

const COORDINATOR_RPC_SERVER_PORT = 20001;
const COORINDATOR_RPC_SERVER_TLS = false;

const CLIENT_RPC_SERVER_PORT = 30001;
const CLIENT_RPC_SERVER_NO_PRIVELEGED = false;

const CLIENT_DB_DATA_PATH_MAINNET = "./client-db-mainnet";
const CLIENT_DB_IPFS_PATH_TESTNET = "./client-db";

const CLIENT_IPFS_DATA_PATH_MAINNET = "./client-ipfs-db-mainnet";
const CLIENT_IPFS_DATA_PATH_TESTNET = "./client-ipfs-db";

const coordinatorBlsSecKey = BLS.utils.randomPrivateKey();
const clientBlsSecKeys: Uint8Array[] = [];

function generateNodeBlsKeys() {
  for (let i = 0; i < 100; i++) {
    clientBlsSecKeys.push(BLS.utils.randomPrivateKey());
  }
}

function dockerComposeForIntergationTests(composeFile: string, simulateTestnet: boolean) {
  const nodeConfigDir = path.join(NODE_CONFIG_DIR, path.parse(composeFile).name);

  interface ConfigFile {
    yaml: any;
    path: string;
  }
  const nodeConfigs: ConfigFile[] = [];

  // Cordinator node config.
  nodeConfigs.push({
    yaml: coordinatorNodeConfig(simulateTestnet, MINTER_ADDRESS_LEGACY),
    path: path.join(nodeConfigDir, "coordinator.yml"),
  });

  // Client node config.
  const coordinatorBlsPubKeyHex = bytesToHex(BLS.getPublicKey(coordinatorBlsSecKey));
  const coordinatorRpcAddr = `coordinator:${COORDINATOR_RPC_SERVER_PORT}`;

  nodeConfigs.push({
    yaml: clientNodeConfig(
      "client",
      bytesToHex(clientBlsSecKeys[0]),
      MINTER_ADDRESS_LEGACY,
      simulateTestnet ? CONTRACT_ADDRESS_TESTNET : CONTRACT_ADDRESS_LOCALNET,
      false,
      false,
      ETH_RPC_ADDRESS_LOCALNET,
      coordinatorBlsPubKeyHex,
      coordinatorRpcAddr,
    ),
    path: path.join(nodeConfigDir, "client.yml"),
  });

  // Verifier node configs.
  let verifierCount;
  if (DA_VERIFIER_COUNT > STATE_VERIFIER_COUNT) {
    verifierCount = DA_VERIFIER_COUNT;
  } else {
    verifierCount = STATE_VERIFIER_COUNT;
  }
  let daVerfierIdx = 1;
  let stateVerifierIdx = 1;
  for (let verifierIdx = 1; verifierIdx <= verifierCount; verifierIdx++) {
    let isDAVerifier = false;
    let isStateVerifier = false;
    if (daVerfierIdx <= DA_VERIFIER_COUNT) {
      isDAVerifier = true;
      daVerfierIdx++;
    }
    if (stateVerifierIdx <= STATE_VERIFIER_COUNT) {
      isStateVerifier = true;
      stateVerifierIdx++;
    }

    const verifierName = `verifier-${verifierIdx}`;
    nodeConfigs.push({
      yaml: clientNodeConfig(
        verifierName,
        bytesToHex(clientBlsSecKeys[verifierIdx]),
        MINTER_ADDRESS_LEGACY,
        simulateTestnet ? CONTRACT_ADDRESS_TESTNET : CONTRACT_ADDRESS_LOCALNET,
        isDAVerifier,
        isStateVerifier,
        ETH_RPC_ADDRESS_LOCALNET,
        coordinatorBlsPubKeyHex,
        coordinatorRpcAddr,
      ),
      path: path.join(nodeConfigDir, `${verifierName}.yml`),
    });
  }

  // Write conifg files.
  for (const config of nodeConfigs) {
    writeFileSync(absPath(config.path), dump(config.yaml), { flag: "w" });
  }

  // Generate docker compose file.
  configure("docker-compose");
  const compose = render("integration-tests.nunjucks", {
    composeFileName: path.basename(nodeConfigDir),
    simulateTestnet: simulateTestnet,
    coordinatorRpcPort: COORDINATOR_RPC_SERVER_PORT,
    clientRpcPort: CLIENT_RPC_SERVER_PORT,
    verifierCount: verifierCount,
  });
  writeFileSync(absPath(composeFile), compose, { flag: "w" });
}

function dockerComposeForClientSyncTest(composeFile: string, testnet: boolean) {
  const nodeConfigDir = path.join(NODE_CONFIG_DIR, path.parse(composeFile).name);

  // Generate client config.
  const nodeConfig = clientNodeConfig(
    "client",
    bytesToHex(clientBlsSecKeys[0]),
    testnet ? MINTER_ADDRESS_TESTNET : MINTER_ADDRESS_MAINNET,
    testnet ? CONTRACT_ADDRESS_TESTNET : CONTRACT_ADDRESS_MAINNET,
    false,
    false,
    testnet ? ETH_RPC_ADDRESS_TESTNET : ETH_RPC_ADDRESS_MAINNET,
    testnet ? COORDINATOR_PUB_KEY_TESTNET : COORIDNATOR_PUB_KEY_MAINNET,
    testnet ? COORDINATOR_RPC_TESTNET : COORDINATOR_RPC_MAINNET,
  );
  const nodeConfigPath = path.join(nodeConfigDir, "client.yml");
  writeFileSync(absPath(nodeConfigPath), dump(nodeConfig), { flag: "w" });

  // Generate docker compose file.
  configure("docker-compose");
  const compose = render("client-sync-test.nunjucks", {
    composeFileName: path.basename(nodeConfigDir),
    clientDbDataPath: testnet ? CLIENT_DB_IPFS_PATH_TESTNET : CLIENT_DB_DATA_PATH_MAINNET,
    ipfsDataPath: testnet ? CLIENT_IPFS_DATA_PATH_TESTNET : CLIENT_IPFS_DATA_PATH_MAINNET,
    clientRpcPort: CLIENT_RPC_SERVER_PORT,
  });
  writeFileSync(absPath(composeFile), compose, { flag: "w" });
}

function coordinatorNodeConfig(simulateTestnet: boolean, minterAddrHex: string): CoordinatorNodeConfig {
  return {
    blsSecKey: bytesToHex(coordinatorBlsSecKey),
    chain: {
      minterAddress: minterAddrHex,
      contractAddress: simulateTestnet ? CONTRACT_ADDRESS_TESTNET : undefined,
      blockMintPeriod: COORDINATOR_BLOCK_MINT_PERIOD,
      daVerification: {
        requestBroadcastPeriod: DA_VERIFICATION_REQUEST_BROADCAST_PERIOD,
        requestTimeout: DA_VERIFICATION_REQUEST_TIEMOUT,
      },
      stateVerification: {
        requestBroadcastPeriod: STATE_VERIFICATION_REQUEST_BROADCAST_PERIOD,
        requestTimeout: STATE_VERIFICATION_REQUEST_TIEMOUT,
      },
    },
    storage: {
      mysqlHost: "coordinator-db",
      mysqlUser: MYSQL_USER,
      mysqlPassword: MYSQL_PASSWORD,
      mysqlDbName: MYSQL_DB_NAME,
    },
    ipfs: {
      apiHost: "coordinator-ipfs",
      blockUploadPeriod: COORDINATOR_BLOCK_UPLOAD_PERIOD,
    },
    eth: {
      rpc: {
        address: ETH_RPC_ADDRESS_LOCALNET,
        retryPeriod: ETH_RPC_RETRY_PERIOD,
        timeout: ETH_RPC_TIMEOUT,
      },
      signer: {
        walletSecret: COORDINATR_ETH_SIGNER_WALLET_SECRET,
        impersonateAddress: simulateTestnet ? COORDINATOR_ETH_SIGNER_IMPERSONATE_ADDRESS : undefined,
      },
    },
    rpcServer: {
      port: COORDINATOR_RPC_SERVER_PORT,
    },
  };
}

function clientNodeConfig(
  nodeName: string,
  blsSecKeyHex: string,
  minterAddrHex: string,
  contractAddressHex: string,
  isDAVerifier: boolean,
  isStateVerifier: boolean,
  ethRpcAddress: string,
  coordinatorBlsPubKeyHex: string,
  coordinatorRpcAddress: string,
): ClientNodeConfig {
  return {
    blsSecKey: blsSecKeyHex,
    chain: {
      minterAddress: minterAddrHex,
      contractAddress: contractAddressHex,
      blockSyncPeriod: CLIENT_BLOCK_SYNC_PERIOD,
      roles: {
        daVerifier: isDAVerifier ? { DACheckTimeout: DA_CHECK_TIMEOUT } : undefined,
        stateVerifier: isStateVerifier ? { stateCheckTimeout: STATE_CHECK_TIMEOUT } : undefined,
      },
    },
    storage: {
      mysqlHost: `${nodeName}-db`,
      mysqlUser: MYSQL_USER,
      mysqlPassword: MYSQL_PASSWORD,
      mysqlDbName: MYSQL_DB_NAME,
    },
    ipfs: {
      apiHost: `${nodeName}-ipfs`,
    },
    eth: {
      rpc: {
        address: ethRpcAddress,
        retryPeriod: ETH_RPC_RETRY_PERIOD,
        timeout: ETH_RPC_TIMEOUT,
      },
    },
    coordinator: {
      blsPubKey: coordinatorBlsPubKeyHex,
      rpc: {
        serverAddr: coordinatorRpcAddress,
        tls: COORINDATOR_RPC_SERVER_TLS,
      },
    },
    verifierService: {
      host: `${nodeName}-verifier-service`,
      user: VERIFIER_SERVICE_USER,
      password: VERIFIER_SERVICE_PASSWORD,
    },
    rpcServer: {
      port: CLIENT_RPC_SERVER_PORT,
      noPrivileged: CLIENT_RPC_SERVER_NO_PRIVELEGED,
    },
  };
}

function absPath(relativePath: string) {
  return path.resolve(__dirname, relativePath);
}

function run() {
  generateNodeBlsKeys();

  dockerComposeForIntergationTests("../docker-compose-tosi-chain.yml", false);
  dockerComposeForIntergationTests("../docker-compose-tosi-chain-testnet-simul.yml", true);

  dockerComposeForClientSyncTest("../docker-compose-tosi-node-mainnet.yml", false);
  dockerComposeForClientSyncTest("../docker-compose-tosi-node-testnet.yml", true);
}

run();
