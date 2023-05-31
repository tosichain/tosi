import * as IpfsHttpClient from "ipfs-http-client";
import * as ethers from "ethers";
import { IPFS } from "../../p2p/ipfs";
import { bls12_381 as BLS } from "@noble/curves/bls12-381";

import { currentUnixTime } from "../../util";
import Logger from "../../log/logger";

import {
  SignedTransaction,
  Transaction,
  Account,
  StakeType,
  DataChain,
  Block,
  BlockProof,
  BlockMetadata,
  TransactionBundle,
} from "../../blockchain/types";
import { serializeBlock, deserializeBlockMetadata, serializeBlockMetadata } from "../../blockchain/serde";
import { mintNextBlock } from "../../blockchain/block";
import {
  fetchDrandBeacon,
  createBlockRandomnessProof,
  getSeedFromBlockRandomnessProof,
} from "../../blockchain/block_randomness";
import { getVerificationCommitteeSample } from "../../blockchain/block_commitee";
import {
  bytesEqual,
  bytesToHex,
  bytesFromHex,
  hashSignedTransaction,
  hashTransactionBundle,
  hashBlock,
} from "../../blockchain/util";
import { BlockchainStorageConfig, BlockchainStorage } from "../../blockchain/storage";
import { DatachainV2__factory } from "../../contracts/factories/DatachainV2__factory";
import { DatachainV2 } from "../../contracts/DatachainV2";
import { UUPSProxy__factory } from "../../contracts/factories/UUPSProxy__factory";
import { CoordinatorRPCServerConfig, CoordinatorRPCServer } from "./rpc_server";
import { DAVerificationManagerConfig, DAVerificationManager } from "./da_verification";
import { COORDINATOR_BLOCK_VERSION, SWARM_PING_INTERVAL } from "./constant";
import { NULL_HASH } from "../../blockchain/constant";
import { StateVerificationManager, StateVerificationManagerConfig } from "./state_verification";

const LOG_NETWORK = "network";
const LOG_ETH = [LOG_NETWORK, "eth"];
const LOG_STATE = "state";
const LOG_STATE_TRACE = [LOG_STATE, "trace"];

export type IPFSOptions = IpfsHttpClient.Options;

export interface CoordinatorNodeConfig {
  blsSecKey: string;

  chain: {
    minterAddress: string;
    contractAddress?: string;
    blockMintPeriod: number;
    daVerification: DAVerificationManagerConfig;
    stateVerification: StateVerificationManagerConfig;
  };

  storage: BlockchainStorageConfig;

  ipfs: {
    apiHost: string;
    blockUploadPeriod: number;
  };

  eth: {
    rpc: {
      address: string;
      retryPeriod: number;
      timeout: number;
    };
    signer: {
      walletSecret: string;
      impersonateAddress?: string;
    };
  };

  rpcServer?: CoordinatorRPCServerConfig;
}

export class CoordinatorNode {
  private readonly config: CoordinatorNodeConfig;
  private readonly blsPubKey: Uint8Array;

  private readonly log: Logger;

  private readonly storage: BlockchainStorage;
  private readonly ipfs: IPFS;

  private readonly rpc?: CoordinatorRPCServer;

  private ethProvider: ethers.providers.JsonRpcProvider;
  private ethWallet: ethers.Signer | undefined;

  private claimContract: DatachainV2 | null = null;

  private daManager: DAVerificationManager;
  private stateManager: StateVerificationManager;

  constructor(config: CoordinatorNodeConfig, logger: Logger) {
    this.config = config;

    this.log = logger;

    this.blsPubKey = BLS.getPublicKey(this.config.blsSecKey);
    this.log.info("BLS public key is ready", undefined, { key: this.blsPubKey });

    this.storage = new BlockchainStorage(this.config.storage, this.log);
    this.ipfs = new IPFS({ host: this.config.ipfs.apiHost }, this.log);
    if (this.config.rpcServer != undefined) {
      this.rpc = new CoordinatorRPCServer(this.config.rpcServer, this.log, this);
    }
    this.ethProvider = new ethers.providers.JsonRpcProvider(this.config.eth.rpc.address);

    this.daManager = new DAVerificationManager(this.config.chain.daVerification, this.log, this.ipfs, this.blsPubKey);
    this.stateManager = new StateVerificationManager(
      this.config.chain.stateVerification,
      this.log,
      this.ipfs,
      this.blsPubKey,
    );
  }

  public async start(): Promise<void> {
    if (this.config.eth.signer.impersonateAddress && this.config.chain.contractAddress) {
      await this.ethProvider.send("hardhat_impersonateAccount", [this.config.eth.signer.impersonateAddress]);
      await this.ethProvider.send("hardhat_setBalance", [this.config.eth.signer, "0x50000000000000000"]);
      this.ethWallet = this.ethProvider.getSigner(this.config.eth.signer.impersonateAddress);

      this.log.info("deploying/upgrading smart contracts", LOG_ETH);

      const contractFactory = new DatachainV2__factory(this.ethWallet);
      const deployedContract = await contractFactory.deploy();
      this.claimContract = DatachainV2__factory.connect(this.config.chain.contractAddress, this.ethWallet);

      await this.claimContract.setCoordinatorNode(await this.ethWallet.getAddress());
      await this.claimContract.upgradeTo(deployedContract.address);
      this.log.info("upgraded smart contract", LOG_ETH, {
        corrdinatorAddress: await this.ethWallet.getAddress(),
      });
    } else {
      this.ethWallet = new ethers.Wallet(this.config.eth.signer.walletSecret, this.ethProvider);
      this.log.info("ethereum wallet is ready", LOG_ETH, {
        address: (this.ethWallet as ethers.Wallet).address,
      });
    }

    await this.storage.init(bytesFromHex(this.config.chain.minterAddress));
    await this.ipfs.up();
    while (true) {
      const peers = await this.ipfs.getIPFS().swarm.peers();
      if (peers.length > 0) {
        break;
      }
      this.log.info("IPFS has no peers, waiting a second..", LOG_NETWORK);
      await new Promise((resolve, reject) => {
        setTimeout(resolve, 1000);
      });
    }
    // Need to retry in case eth rpc endpoint is temporarily unavailable.
    let retryCount = 0;
    while (true) {
      if (retryCount >= this.config.eth.rpc.timeout) {
        throw new Error(`failed to connect to eth rpc endpoint`);
      }
      try {
        if (!this.config.chain.contractAddress && !this.claimContract) {
          await this.deployEthContracts();
        } else if (!this.claimContract) {
          await this.connectEthContract();
        }
        break;
      } catch (err: any) {
        if (err.code == "SERVER_ERROR") {
          this.log.error("failed to connect to eth rpc endpoint, waiting for retry..", err, LOG_ETH);
          await new Promise((resolve, _) => {
            setTimeout(resolve, this.config.eth.rpc.retryPeriod);
          });
          retryCount += this.config.eth.rpc.retryPeriod;
        } else {
          throw err;
        }
      }
    }
    if (this.rpc != undefined) {
      await this.rpc.start();
    }
    const genesisBlockHash = await this.storage.getGenesisBlockHash();
    await this.ipfs.keepConnectedToSwarm("tosi-" + genesisBlockHash, SWARM_PING_INTERVAL);
    await this.daManager.start();
    await this.stateManager.start();

    this.createNextBlock();
    await this.uploadBlockchainToIPFS(true);
    this.uploadBlockchainToIPFS(false);
  }

  private async connectEthContract(): Promise<void> {
    if (!this.ethWallet) {
      throw new Error("ethereum wallet is not ready");
    }
    if (!this.config.chain.contractAddress) {
      throw new Error("config.chain.coordinatorSmartContract not set");
    }
    this.claimContract = DatachainV2__factory.connect(this.config.chain.contractAddress, this.ethWallet);
  }

  private async deployEthContracts(): Promise<void> {
    if (!this.ethWallet) {
      throw new Error("ethereum wallet is not ready");
    }
    await this.ethProvider.send("hardhat_setBalance", [await this.ethWallet.getAddress(), "0x50000000000000000"]);
    await this.ethProvider.send("evm_setIntervalMining", [5000]);

    // Deploy DatachainV2 contract to 0x78e875422BEDeD0655d5f4d3B80043639bf3da8C.
    const contractFactory = new DatachainV2__factory(this.ethWallet);
    const deployedContract = await contractFactory.deploy();
    this.log.info("Deployed DatachainV2 contract", LOG_ETH, { address: deployedContract.address });

    // Deploy UUPSProxy contract to 0xB249f874F74B8d873b3252759Caed4388cfe2492.
    const proxyFactory = new UUPSProxy__factory(this.ethWallet);
    const deployedProxy = await proxyFactory.deploy(deployedContract.address, "0x");
    this.log.info("Deployed UUPSProxy contract", LOG_ETH, { address: deployedProxy.address });

    // DatachainV2 client.
    this.claimContract = DatachainV2__factory.connect(deployedProxy.address, this.ethWallet);

    // UUPSProxy client.
    const proxyAsDatachainV2 = DatachainV2__factory.connect(deployedProxy.address, this.ethWallet);
    await proxyAsDatachainV2.initialize(await this.ethWallet.getAddress());
  }

  private async createNextBlock(): Promise<void> {
    while (true) {
      try {
        await new Promise((resolve, _) => {
          setTimeout(resolve, this.config.chain.blockMintPeriod);
        });

        const blockTime = currentUnixTime(); // Note: must align with drand beacon time.

        // Create transaction bundle.
        const [state, headBlock, nextBlockTxns] = await this.storage.getNextBlockInput();
        if (nextBlockTxns.length == 0) {
          continue;
        }
        const txnBundle: TransactionBundle = {
          headBlockHash: await this.storage.getHeadBlockHash(),
          transactions: nextBlockTxns,
        };
        const bundleHash = hashTransactionBundle(txnBundle);
        const bundleTxnHashes = txnBundle.transactions.map(hashSignedTransaction).map(bytesToHex);
        this.log.info("created new transaction bundle", LOG_STATE, {
          txnBundeHash: bundleHash,
          txns: bundleTxnHashes,
        });

        // Generate randomness proof for block.
        this.log.info("fetching drand beacon", LOG_NETWORK);
        const blockRandBeacon = await fetchDrandBeacon();
        this.log.info("fetched drand beacon", LOG_NETWORK, { beacon: blockRandBeacon });
        const blockRandProof = await createBlockRandomnessProof(
          bundleHash,
          bytesFromHex(this.config.blsSecKey),
          blockRandBeacon,
        );
        const blockRandSeed = getSeedFromBlockRandomnessProof(blockRandProof);

        // Check transaction data availability.
        const daCommittee = await getVerificationCommitteeSample(this.storage, StakeType.DAVerifier, blockRandSeed);
        const daCheckResult = await this.daManager.checkTxnBundleDA(txnBundle, blockRandProof, daCommittee);
        for (const txn of daCheckResult.rejectedTxns) {
          await this.storage.removePendingTransaction(txn);
        }
        if (daCheckResult.acceptedTxns.length == 0) {
          this.log.info("failed to mint next block", LOG_STATE, {
            txnBundleHash: bundleHash,
            reason: "all transactions have failed DA verification",
          });
          continue;
        }

        // Check state.
        const stateCommittee = await getVerificationCommitteeSample(
          this.storage,
          StakeType.StateVerifier,
          blockRandSeed,
        );
        const stateCheckResult = await this.stateManager.checkTxnBundleState(txnBundle, blockRandProof, stateCommittee);
        for (const txn of stateCheckResult.rejectedTxns) {
          await this.storage.removePendingTransaction(txn);
        }
        if (stateCheckResult.acceptedTxns.length == 0) {
          this.log.info("failed to mint next block", LOG_STATE, {
            txnBundleHash: bundleHash,
            reason: "all transactions have failed state verification",
          });
          continue;
        }

        // Mint block.
        this.log.info("veryfing transactions and minting next block", LOG_STATE, { txnBundleHash: bundleHash });
        const nextBlockProof: BlockProof = {
          txnBundleHash: bundleHash,
          txnBundleProposer: this.blsPubKey,
          DACheckResults: daCheckResult.responses,
          randomnessProof: blockRandProof,
          aggDACheckResultSignature: daCheckResult.aggSignature,
          stateCheckResults: stateCheckResult.responses,
          aggStateCheckResultSignature: stateCheckResult.aggSignature,
        };
        const [nextBlock, acceptedTxns, rejectedTxns] = await mintNextBlock(
          state,
          headBlock,
          COORDINATOR_BLOCK_VERSION,
          daCheckResult.acceptedTxns,
          nextBlockProof,
          blockTime,
        );
        for (const txn of acceptedTxns) {
          const txnHash = hashSignedTransaction(txn);
          this.log.info("transaction applied", LOG_STATE_TRACE, { txn: txn, txnHash: txnHash });
        }
        for (const [txn, err] of rejectedTxns) {
          const txnHash = hashSignedTransaction(txn);
          this.log.info(`transaction rejected`, LOG_STATE, { txn: txn, txnHash: txnHash, reason: err.message });
          await this.storage.removePendingTransaction(txn);
        }
        if (acceptedTxns.length == 0) {
          this.log.info("failed to mint next block", LOG_STATE, { reason: "no valid transactions" });
          continue;
        }

        this.log.debug("new world state", LOG_STATE_TRACE, { state: state });

        // Commit minted block;
        const blockHash = hashBlock(nextBlock);
        const rawBlock = serializeBlock(nextBlock);
        await this.claimContract?.submitBlock(rawBlock);
        this.log.info("block committed to smart contract", LOG_ETH, { blockHash: blockHash });

        await this.storage.commitNextBlock(state, nextBlock);
      } catch (err: any) {
        this.log.error("failed to mint next block", err, LOG_STATE);
      }
    }
  }

  private async uploadBlockchainToIPFS(force = false): Promise<void> {
    while (true) {
      try {
        await new Promise((resolve, _) => {
          setTimeout(resolve, this.config.ipfs.blockUploadPeriod);
        });
        // TODO: handle exceptions in background process (or fail fast?).

        // Starting form head block, upload all blocks until already uploaded block is found.
        let blockHash = await this.storage.getHeadBlockHash();
        if (blockHash == undefined) {
          throw new Error("can not fetch hash of head block from storage");
        }
        while (true) {
          if (bytesEqual(blockHash, NULL_HASH)) {
            throw new Error("Should never try to upload null hash");
          }
          const uploadedBlock: Block | undefined = await this.uploadBlockToIPFS(blockHash, force);
          // Сurrent block and all previous blocks are already uploaded.
          if (uploadedBlock == undefined) {
            break;
          }
          // Genesis block does not have previous block.
          if (bytesEqual(uploadedBlock.prevBlockHash, NULL_HASH)) {
            this.log.info("genesis block uploaded to IPFS", LOG_NETWORK, { blockHash: blockHash });
            break;
          }
          blockHash = uploadedBlock.prevBlockHash;
        }
        if (force) {
          break;
        }
      } catch (err: any) {
        this.log.error("failed to upload blocks to IPFS", err, LOG_NETWORK);
      }
    }
  }

  private async uploadBlockToIPFS(blockHash: Uint8Array, force = false): Promise<Block | undefined> {
    // Check if block is already uploaded.
    const blockMetaExists = await this.storage.getBlockMetadata(blockHash);
    if (blockMetaExists != undefined && !force) {
      return undefined;
    }

    // Get block content and upload it to IPFS.
    this.log.info("uploading block to IPFS", LOG_NETWORK, { blockHash: blockHash, force: force });
    const block = await this.storage.getBlock(blockHash);
    if (block == undefined) {
      throw Error("block metadata exists in db while block itself is missing");
    }
    const rawBlock = serializeBlock(block);
    if (rawBlock.length > 256 * 1024) {
      throw new Error("Serialized block too big");
    }
    const blockCID = await this.ipfs
      .getIPFS()
      .block.put(rawBlock, { pin: true, mhtype: "keccak-256", format: "raw", version: 1 });

    // Mark block as uploaded in storage.
    const blockMeta: BlockMetadata = {
      CID: blockCID.toString(),
    };
    const rawBlockMeta = serializeBlockMetadata(blockMeta);
    await this.storage.setBlockMetadata(blockHash, rawBlockMeta);
    this.log.info("block uploaded to IPFS", LOG_NETWORK, { blockHash: blockHash, force: force });

    return block;
  }

  // RPC methods.

  public async getBlock(blockHash: Uint8Array): Promise<Block | undefined> {
    return await this.storage.getBlock(blockHash);
  }

  public async getAccount(address: Uint8Array): Promise<Account | undefined> {
    return this.storage.getAccount(address);
  }

  public async getAccountTransactions(address: Uint8Array): Promise<Transaction[] | undefined> {
    if (!(await this.storage.getAccount(address))) {
      return undefined;
    }

    const transactions: Transaction[] = [];
    let lastBlockHash = await this.storage.getHeadBlockHash();
    while (true) {
      const block = await this.storage.getBlock(lastBlockHash);
      if (block == undefined) {
        break;
      }
      block.transactions.forEach((transaction) => {
        if (bytesEqual(transaction.from, address)) {
          transactions.push(transaction.txn);
        }
      });
      lastBlockHash = block.prevBlockHash;
      if (lastBlockHash.length == 0) {
        break;
      }
    }

    return transactions;
  }

  public async getStakerList(stakeType: StakeType): Promise<Account[]> {
    const stakePool = await this.storage.getStakePool();

    let stakerPubKeys: Uint8Array[];
    switch (stakeType) {
      case StakeType.DAVerifier:
        stakerPubKeys = stakePool.daVerifiers;
        break;
      case StakeType.StateVerifier:
        stakerPubKeys = stakePool.stateVerifiers;
        break;
      default:
        throw new Error("invalid stake type");
    }

    const stakers: Account[] = [];
    for (const pubKey of stakerPubKeys) {
      const staker = await this.storage.getAccount(pubKey);
      if (staker != undefined) {
        stakers.push(staker);
      } else {
        // TODO: this means error in storage.
      }
    }

    return stakers;
  }

  public async getDataChain(rootClaimHash: Uint8Array): Promise<DataChain | undefined> {
    return await this.storage.getDataChain(rootClaimHash);
  }

  public async getDataChainList(): Promise<DataChain[]> {
    return await this.storage.getDataChainList();
  }

  public async getHeadBlockHash(): Promise<Uint8Array> {
    return await this.storage.getHeadBlockHash();
  }

  public async getBLSPublicKey(): Promise<Uint8Array> {
    return this.blsPubKey;
  }

  public async getIPFSBootstrap(): Promise<string[]> {
    return (await this.ipfs.getIPFS().id()).addresses.map((x) => x.toString());
  }

  public async submitSignedTransaction(txn: SignedTransaction): Promise<void> {
    await this.storage.submitTransaction(txn);
  }

  public async getBlockMetadata(blockHash: Uint8Array): Promise<BlockMetadata | undefined> {
    const rawMeta = await this.storage.getBlockMetadata(blockHash);
    if (rawMeta == undefined) {
      return undefined;
    }
    const meta = deserializeBlockMetadata(rawMeta);
    return meta;
  }
}
