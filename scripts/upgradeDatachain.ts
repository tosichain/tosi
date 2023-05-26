const { ethers, upgrades } = require("hardhat");
//const ethProvider = require('eth-provider') // eth-provider is a simple EIP-1193 provider
//const frame = ethProvider('frame') // Connect to Frame

const BOX_ADDRESS = "0x4731A0Dd87e637321D4E4980BeF351f992F14b77"

async function main() {
/*  const signer = await ethers.getSigner();
  const impersonatedAddress = "0xb95391c36d66eba3565a3fc30f2786c9438c5ac5"; 
  await hre.network.provider.request({ method: 'hardhat_impersonateAccount', params: [impersonatedAddress] });
  await signer.sendTransaction({ to: impersonatedAddress, value: ethers.utils.parseEther("1") })

  const impersonatedSigner = await ethers.getSigner(impersonatedAddress)
*/
  const DatachainV1 = await ethers.getContractFactory("DatachainV1");
  const DatachainV2 = await ethers.getContractFactory("DatachainV2");
  
  const d1 = await upgrades.forceImport(BOX_ADDRESS, DatachainV2, { kind: 'uups' });
  const prev = await d1.getImplementation();
  const box = await upgrades.upgradeProxy(BOX_ADDRESS, DatachainV2);
  await box.deployed(); 
  const implementation = await box.getImplementation();
  console.log("old implementation " + prev);
  console.log("new implementation " + implementation); 

  try {
    await hre.run("verify:verify", {
      address: implementation,
      constructorArguments: [],
    });
  } catch (error) {}
}

main();
