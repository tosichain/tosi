/** @type import('hardhat/config').HardhatUserConfig */
import "@nomiclabs/hardhat-etherscan";
import "@openzeppelin/hardhat-upgrades";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-ethers";
import "hardhat-gas-reporter";
import { ethers } from "ethers";

import * as dotenv from "dotenv";

dotenv.config({ path: __dirname + "/.env" });

const RPC_KEY = process.env["RPC_KEY"] || "https://goerli-rollup.arbitrum.io/rpc";
const ETHERSCAN_KEY = process.env["ETHERSCAN_KEY"] || "0".repeat(34);
const PRIVATE_KEY = process.env["PRIVATE_KEY"] || "0".repeat(64);

const config: HardhatUserConfig = {
  networks: {
    arbitrum_goerli: {
      url: `http://127.0.0.1:1248`,
      accounts: "remote",
      timeout: 100_000,
      //accounts: [PRIVATE_KEY],
    },
    arbitrum: {
      url: `https://arb-mainnet.g.alchemy.com/v2/${RPC_KEY}`,
      accounts: [PRIVATE_KEY],
    },
    goerli: {
      url: `https://eth-goerli.g.alchemy.com/v2/${RPC_KEY}`,
      accounts: [PRIVATE_KEY],
    },
    mainnet: {
      url: `https://eth-mainnet.g.alchemy.com/v2/${RPC_KEY}`,
      accounts: [PRIVATE_KEY],
    },
    hardhat: {
      allowUnlimitedContractSize: true,
      forking: {
        url: process.env["RPC_URL"] || "https://goerli-rollup.arbitrum.io/rpc",
        enabled: true,
      },
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_KEY,
  },
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  paths: {
    sources: "./src/contracts",
  },
  mocha: {
    timeout: 100000000,
  },
};

export default config;
