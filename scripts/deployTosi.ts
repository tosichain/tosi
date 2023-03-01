/* eslint-disable no-console */
import { ethers, upgrades } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  const ERC20UpgradableV1 = await ethers.getContractFactory("Tosi");
  const instance = await upgrades.deployProxy(ERC20UpgradableV1, []);
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
  fs.writeFileSync(path.join(deploymentPath, "tosi.json"), JSON.stringify(contractInfo, null, 2));
}

main();
