/* eslint-disable no-console */
import { ethers, upgrades } from "hardhat";

async function main() {
  // Deploying
  const datachain = await ethers.getContractFactory("DatachainV1");
  const instance = await upgrades.deployProxy(datachain, [ethers.constants.AddressZero]);
  await instance.deployed();

  const implementation = await instance.getImplementation();

  try {
    await hre.run("verify:verify", {
      address: implementation,
      constructorArguments: [],
    });
  } catch (error) {}

  console.log(`proxy: ${instance.address}`);
  console.log(`implementation: ${implementation}`);
}

main();
