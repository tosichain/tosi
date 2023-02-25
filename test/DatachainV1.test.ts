/* eslint-disable no-console */
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
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
    const block = ethers.utils.randomBytes(1024);
    await expect(proxy.submitBlock(block)).to.be.revertedWith("Only the coordinator node can submit blocks");
  });

  it("1kb block", async function () {
    const { proxy, implementation, owner, coordinator } = await loadFixture(proxyDeployFixture);
    const block = ethers.utils.randomBytes(1 * 1024);
    await expect(proxy.connect(coordinator).submitBlock(block)).to.not.be.reverted;
  });

  it("1kb block", async function () {
    const { proxy, implementation, owner, coordinator } = await loadFixture(proxyDeployFixture);
    const block = ethers.utils.randomBytes(2 * 1024);
    await expect(proxy.connect(coordinator).submitBlock(block)).to.not.be.reverted;
  });

  it("4kb block", async function () {
    const { proxy, implementation, owner, coordinator } = await loadFixture(proxyDeployFixture);
    const block = ethers.utils.randomBytes(4 * 1024);
    await expect(proxy.connect(coordinator).submitBlock(block)).to.not.be.reverted;
  });

  it("8kb block", async function () {
    const { proxy, implementation, owner, coordinator } = await loadFixture(proxyDeployFixture);
    const block = ethers.utils.randomBytes(8 * 1024);
    await expect(proxy.connect(coordinator).submitBlock(block)).to.not.be.reverted;
  });

  it("16kb block", async function () {
    const { proxy, implementation, owner, coordinator } = await loadFixture(proxyDeployFixture);
    const block = ethers.utils.randomBytes(16 * 1024);
    await expect(proxy.connect(coordinator).submitBlock(block)).to.not.be.reverted;
  });

  it("32kb block", async function () {
    const { proxy, implementation, owner, coordinator } = await loadFixture(proxyDeployFixture);
    const block = ethers.utils.randomBytes(32 * 1024);
    await expect(proxy.connect(coordinator).submitBlock(block)).to.not.be.reverted;
  });

  it("64kb block", async function () {
    const { proxy, implementation, owner, coordinator } = await loadFixture(proxyDeployFixture);
    const block = ethers.utils.randomBytes(64 * 1024);
    await expect(proxy.connect(coordinator).submitBlock(block)).to.not.be.reverted;
  });

  it("128kb block", async function () {
    const { proxy, implementation, owner, coordinator } = await loadFixture(proxyDeployFixture);
    const block = ethers.utils.randomBytes(128 * 1024);
    await expect(proxy.connect(coordinator).submitBlock(block)).to.not.be.reverted;
  });

  it("256kb block", async function () {
    const { proxy, implementation, owner, coordinator } = await loadFixture(proxyDeployFixture);
    const block = ethers.utils.randomBytes(256 * 1024);
    await expect(proxy.connect(coordinator).submitBlock(block)).to.not.be.reverted;
  });

  it("512kb block", async function () {
    const { proxy, implementation, owner, coordinator } = await loadFixture(proxyDeployFixture);
    const block = ethers.utils.randomBytes(512 * 1024);
    await expect(proxy.connect(coordinator).submitBlock(block)).to.not.be.reverted;
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
    const DatachainV2Factory = await ethers.getContractFactory("DatachainV2");
    const upgraded = await upgrades.upgradeProxy(proxy.address, DatachainV2Factory);
    await upgraded.deployed();
    expect(proxy.address).to.equal(upgraded.address);
    expect(await upgrades.erc1967.getImplementationAddress(upgraded.address)).to.not.equal(implementation);
  });

  it("Can upgrade and have new function", async function () {
    const { proxy, implementation, owner, coordinator } = await loadFixture(proxyDeployFixture);
    const DatachainV2Factory = await ethers.getContractFactory("DatachainV2");
    const upgraded = await upgrades.upgradeProxy(proxy.address, DatachainV2Factory);
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
    value: ethers.utils.parseEther("1.0"),
  });
};
