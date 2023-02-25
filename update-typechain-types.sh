#!/bin/sh
npx hardhat compile
npx typechain --target ethers-v5 --out-dir src/contracts artifacts/src/contracts/helpers/UUPSProxy.sol/UUPSProxy.json
npx typechain --target ethers-v5 --out-dir src/contracts artifacts/src/contracts/DatachainV1.sol/DatachainV1.json

