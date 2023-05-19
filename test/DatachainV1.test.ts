/* eslint-disable no-console */
import { expect } from "chai";
import { Buffer } from 'node:buffer';
import { ethers, upgrades } from "hardhat";
import crypto from "crypto";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("Token contract", function () {
  const proxyDeployFixture = async () => {
    const datachain = await ethers.getContractFactory("DatachainV1");
    const proxy = await upgrades.deployProxy(datachain, [ethers.constants.AddressZero]);
    await proxy.deployed();
    const implementation = await proxy.getImplementation();

    const owner = await ethers.getImpersonatedSigner(await proxy.owner());
    const coordinator = await ethers.getImpersonatedSigner(await proxy.coordinatorNode());

    await fundWithEth(coordinator.address);
    await fundWithEth(owner.address);

    return { proxy, implementation, owner, coordinator };
  };

  it("Submit block can't be called by non-owner", async function () {
    const { proxy, implementation } = await loadFixture(proxyDeployFixture);
    const block = Buffer.alloc(32+4);
    block.writeUInt32BE(0x08011220);
    await expect(proxy.submitBlock(block)).to.be.revertedWith("Only the coordinator node can submit blocks");
  });

  it("normal block", async function () {
    const { proxy, implementation, owner, coordinator } = await loadFixture(proxyDeployFixture);
    await expect(await proxy.connect(coordinator).latestBlockHash()).to.equal("0x0000000000000000000000000000000000000000000000000000000000000000");
    const block = Buffer.alloc(32+4);
    block.writeUInt32BE(0x08011220);
    const randomData = crypto.randomBytes(block.length - 36);
    randomData.copy(block, 36);

    await expect(proxy.connect(coordinator).submitBlock(block)).to.not.be.reverted;
  });

  it("1kb block", async function () {
    const { proxy, implementation, owner, coordinator } = await loadFixture(proxyDeployFixture);
    const block = Buffer.alloc(32+4+(1024-32-4));
    block.writeUInt32BE(0x08011220);
    const randomData = crypto.randomBytes(block.length - 36);
    randomData.copy(block, 36);

    await expect(proxy.connect(coordinator).submitBlock(block)).to.not.be.reverted;
  });

  it("4kb block", async function () {
    const { proxy, implementation, owner, coordinator } = await loadFixture(proxyDeployFixture);
    const block = Buffer.alloc(32+4+(4096-32-4));
    block.writeUInt32BE(0x08011220);
    const randomData = crypto.randomBytes(block.length - 36);
    randomData.copy(block, 36);
    await expect(proxy.connect(coordinator).submitBlock(block)).to.not.be.reverted;
  });

  it("8kb block", async function () {
    const { proxy, implementation, owner, coordinator } = await loadFixture(proxyDeployFixture);
    const block = Buffer.alloc(32+4+(8192-32-4));
    block.writeUInt32BE(0x08011220);
    const randomData = crypto.randomBytes(block.length - 36);
    randomData.copy(block, 36);
    await expect(proxy.connect(coordinator).submitBlock(block)).to.not.be.reverted;
  });

  it("16kb block", async function () {
    const { proxy, implementation, owner, coordinator } = await loadFixture(proxyDeployFixture);
    const block = Buffer.alloc(32+4+(16384-32-4));
    block.writeUInt32BE(0x08011220);
    const randomData = crypto.randomBytes(block.length - 36);
    randomData.copy(block, 36);
    await expect(proxy.connect(coordinator).submitBlock(block)).to.not.be.reverted;
  });

  it("32kb block", async function () {
    const { proxy, implementation, owner, coordinator } = await loadFixture(proxyDeployFixture);
    const block = Buffer.alloc(32+4+(32768-32-4));
    block.writeUInt32BE(0x08011220);
    const randomData = crypto.randomBytes(block.length - 36);
    randomData.copy(block, 36);

    await expect(proxy.connect(coordinator).submitBlock(block)).to.not.be.reverted;
  });

  it("64kb block", async function () {
    const { proxy, implementation, owner, coordinator } = await loadFixture(proxyDeployFixture);
    const block = Buffer.alloc(32+4+(65536-32-4));
    block.writeUInt32BE(0x08011220);
    const randomData = crypto.randomBytes(block.length - 36);
    randomData.copy(block, 36);

    await expect(proxy.connect(coordinator).submitBlock(block)).to.not.be.reverted;
  });
  it("128kb block", async function () {
    const { proxy, implementation, owner, coordinator } = await loadFixture(proxyDeployFixture);
    const block = Buffer.alloc(32+4+(131072-32-4));
    block.writeUInt32BE(0x08011220);
    const randomData = crypto.randomBytes(block.length - 36);
    randomData.copy(block, 36);

    await expect(proxy.connect(coordinator).submitBlock(block)).to.not.be.reverted;
  });

  it("256kb block", async function () {
    const { proxy, implementation, owner, coordinator } = await loadFixture(proxyDeployFixture);
    const block = Buffer.alloc(32+4+((256*1024)-32-4));
    block.writeUInt32BE(0x08011220);
    const randomData = crypto.randomBytes(block.length - 36);
    randomData.copy(block, 36);
    await expect(proxy.connect(coordinator).submitBlock(block)).to.not.be.reverted;
  });

  it("512kb block", async function () {
    const { proxy, implementation, owner, coordinator } = await loadFixture(proxyDeployFixture);
    const block = Buffer.alloc(32+4+((512*1024)-32-4));
    block.writeUInt32BE(0x08011220);
    const randomData = crypto.randomBytes(block.length - 36);
    randomData.copy(block, 36);

    await expect(proxy.connect(coordinator).submitBlock(block)).to.be.revertedWith(
      "Block cannot be beyond 256kb",
    );
  });

  it("Can set a new owner as owner", async function () {
    const { proxy, implementation, owner } = await loadFixture(proxyDeployFixture);
    const wallet = ethers.Wallet.createRandom();
    await proxy.connect(owner).transferOwnership(wallet.address);
    expect(await proxy.owner()).to.be.equal(wallet.address);
  });

  it("Can't set a new owner as non-owner", async function () {
    const { proxy, implementation, owner, coordinator } = await loadFixture(proxyDeployFixture);
    const wallet = ethers.Wallet.createRandom();
    await expect(proxy.connect(coordinator).transferOwnership(wallet.address)).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );
  });

  it("Can upgrade and have new impl", async function () {
    const { proxy, implementation, owner, coordinator } = await loadFixture(proxyDeployFixture);
    const DatachainV2exampleFactory = await ethers.getContractFactory("DatachainV2example");
    const upgraded = await upgrades.upgradeProxy(proxy.address, DatachainV2exampleFactory);
    await upgraded.deployed();
    expect(proxy.address).to.equal(upgraded.address);
    expect(await upgrades.erc1967.getImplementationAddress(upgraded.address)).to.not.equal(implementation);
  });

  it("Can upgrade and have new function", async function () {
    const { proxy, implementation, owner, coordinator } = await loadFixture(proxyDeployFixture);
    const DatachainV2exampleFactory = await ethers.getContractFactory("DatachainV2example");
    const upgraded = await upgrades.upgradeProxy(proxy.address, DatachainV2exampleFactory);
    await upgraded.deployed();
    expect(await upgraded.upgraded()).to.equal(true);
  });

  it("Can set a new coordinator as owner", async function () {
    const { proxy, implementation, owner } = await loadFixture(proxyDeployFixture);
    const wallet = ethers.Wallet.createRandom();
    await proxy.connect(owner).setCoordinatorNode(wallet.address);
    expect(await proxy.coordinatorNode()).to.be.equal(wallet.address);
  });

  it("Can't set a new coordinator as non-owner", async function () {
    const { proxy, implementation, owner, coordinator } = await loadFixture(proxyDeployFixture);
    const wallet = ethers.Wallet.createRandom();
    await expect(proxy.connect(coordinator).setCoordinatorNode(wallet.address)).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );
  });
});

const fundWithEth = async (receiver) => {
  const [ethWallet] = await ethers.getSigners();
  await ethWallet.sendTransaction({
    to: receiver,
    value: ethers.utils.parseEther("500.0"),
  });
};
