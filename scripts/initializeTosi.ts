import { ethers, upgrades } from "hardhat";
import fs from "fs";

async function main() {
  const filePath = `./../deployments/${hre.network.name}/tosi.json`;
  const [owner] = await ethers.getSigners();

  let address;

  await import(filePath)
    .then((module) => {
      address = module.default.instance.address;
    })
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error(error);
    });

  const tosi = await ethers.getContractFactory("Tosi");
  const Tosi = await tosi.attach(address);

  const amount = ethers.utils.parseUnits("1.00", 18);
  await Tosi.mint(owner.address, amount);
  await Tosi.transfer(owner.address, amount);
  await Tosi.burn(amount);
}

main();
