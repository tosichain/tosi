/* eslint-disable no-console */
import { ethers, upgrades } from "hardhat";

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

  console.log(`proxy: ${instance.address}`);
  console.log(`implementation: ${implementation}`);
}

main();
