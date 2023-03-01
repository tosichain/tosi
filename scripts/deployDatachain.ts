/* eslint-disable no-console */
import { ethers, upgrades } from "hardhat";
import fs from "fs";
import path from "path";

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

  const contractInfo = {
    instance: {
      address: instance.address,
    },
    implementation: {
      address: implementation,
    },
  };

  const deploymentPath = path.join("deployments", hre.network.name);
  // create directory if it doesn't exist
  if (!fs.existsSync(deploymentPath)) {
    fs.mkdirSync(deploymentPath, { recursive: true });
  }
  // write to file
  fs.writeFileSync(path.join(deploymentPath, "datachain.json"), JSON.stringify(contractInfo, null, 2));
}

main();
