import * as IpfsHttpClient from "ipfs-http-client";
import winston from "winston";
import * as ethers from "ethers";
import { IPFS } from "../../node/ipfs";
import * as BLS from "@noble/bls12-381";

import { currentUnixTime } from "../../util";

import {
  SignedTransaction,
  Account,
  Block,
  BlockMetadata,
  BlockProof,
  TransactionBundle,
} from "../../blockchain/types";
import { serializeBlock, deserializeBlockMetadata, serializeBlockMetadata } from "../../blockchain/serde";
import { mintNextBlock } from "../../blockchain/block";
import {
  fetchDrandBeacon,
  createBlockRandomnessProof,
  getSeedFromBlockRandomnessProof,
} from "../../blockchain/block_randomness";
import { getDACommiteeSample } from "../../blockchain/block_commitee";
import {
  hashSignedTransaction,
  stringifySignedTransaction,
  hashTransactionBundle,
  hashBlock,
} from "../../blockchain/util";
import { BlockchainStorageConfig, BlockchainStorage } from "../../blockchain/storage";
import { DatachainV1__factory } from "../../contracts/factories/DatachainV1__factory";
import { DatachainV1 } from "../../contracts/DatachainV1";
import { UUPSProxy__factory } from "../../contracts/factories/UUPSProxy__factory";
import { APIServerConfig, APIServer } from "./api_server";
import { DAVerificationManagerConfig, DAVerificationManager } from "./da_verification";
import { COORDINATOR_BLOCK_VERSION } from "./constant";

export type IPFSOptions = IpfsHttpClient.Options;

export interface CoordinatorNodeConfig {
  storage: BlockchainStorageConfig;
  apiServer?: APIServerConfig;
  ipfs: {
    options: IPFSOptions;
    blockchainSyncPeriod: number;
  };
  eth: {
    rpc: string;
    rpcRetryPeriod: number;
    rpcTimeout: number;
    walletSecret: string;
    impersonateAddress?: string;
  };
  chain: {
    blockPeriod: number;
    // TODO: move here from storage config.
    // minterPubKey: string;
    // stakePoolPubKey: string;
    coordinatorSmartContract?: string;
  };
  blsSecKey: string;
  DACommitteeSampleSize: number; // TODO: must be sealed in blockchain.
  DAVerification: DAVerificationManagerConfig;
}

export class CoordinatorNode {
  private readonly config: CoordinatorNodeConfig;
  private readonly blsPubKey: string;

  private readonly log: winston.Logger;

  private readonly storage: BlockchainStorage;
  private readonly ipfs: IPFS;

  private readonly api?: APIServer;

  private ethProvider: ethers.providers.JsonRpcProvider;
  private ethWallet: ethers.Signer | undefined;

  private claimContract: DatachainV1 | null = null;

  private offchainManager: DAVerificationManager;

  constructor(config: CoordinatorNodeConfig, logger: winston.Logger) {
    this.config = config;

    this.log = logger;

    this.blsPubKey = Buffer.from(BLS.getPublicKey(this.config.blsSecKey)).toString("hex");
    this.log.info(`*** BLS Public Key: ${this.blsPubKey}`);

    this.storage = new BlockchainStorage(this.config.storage, this.log);
    this.ipfs = new IPFS(this.config.ipfs.options, this.log);
    if (this.config.apiServer != undefined) {
      this.api = new APIServer(this.config.apiServer, this.log, this);
    }
    this.ethProvider = new ethers.providers.JsonRpcProvider(this.config.eth.rpc);

    this.offchainManager = new DAVerificationManager(this.config.DAVerification, this.log, this.ipfs);
  }

  public async start(): Promise<void> {
    if (this.config.eth.impersonateAddress) {
      await this.ethProvider.send("hardhat_impersonateAccount", [this.config.eth.impersonateAddress]);
      this.ethWallet = this.ethProvider.getSigner(this.config.eth.impersonateAddress);
    } else {
      this.ethWallet = new ethers.Wallet(this.config.eth.walletSecret, this.ethProvider);
      this.log.info("*** Ethereum wallet: " + (this.ethWallet as ethers.Wallet).address);
    }

    await this.storage.init();
    await this.ipfs.up(this.log);

    if (this.api != undefined) {
      await this.api.start();
    }

    // Need to retry in case eth rpc endpoint is temporarily unavailable.
    let retryCount = 0;
    while (true) {
      if (retryCount >= this.config.eth.rpcTimeout) {
        throw new Error(`failed to connect to eth rpc endpoint`);
      }
      try {
        if (!this.config.chain.coordinatorSmartContract) {
          this.log.info(`deploying smart contracts`);
          await this.deployEthContracts();
          this.log.info(`smart contracts successfully deployed`);
        } else {
          await this.connectEthContract();
        }
        break;
      } catch (err: any) {
        if (err.code == "SERVER_ERROR") {
          this.log.error(`failed to connect to eth rpc endpoint, waiting for retry`);
          await new Promise((resolve, _) => {
            setTimeout(resolve, this.config.eth.rpcRetryPeriod);
          });
          retryCount += this.config.eth.rpcRetryPeriod;
        } else {
          throw err;
        }
      }
    }

    await this.offchainManager.start();

    this.createNextBlock();
    await this.uploadBlockchainToIPFS(true);
    this.uploadBlockchainToIPFS(false);
  }

  private async connectEthContract(): Promise<void> {
    if (!this.ethWallet) {
      throw new Error("ethWallet not connected");
    }
    if (!this.config.chain.coordinatorSmartContract) {
      throw new Error("No smart contract address");
    }
    this.claimContract = DatachainV1__factory.connect(this.config.chain.coordinatorSmartContract, this.ethWallet);
    if (this.config.eth.impersonateAddress) {
      await this.claimContract.setCoordinatorNode(await this.ethWallet.getAddress());
    }
  }

  private async deployEthContracts(): Promise<void> {
    if (!this.ethWallet) {
      throw new Error("ethWallet not connected");
    }
    await this.ethProvider.send("hardhat_setBalance", [await this.ethWallet.getAddress(), "0x50000000000000000"]);
    await this.ethProvider.send("evm_setIntervalMining", [5000]);

    // Deploy DatachainV1 contract to 0x78e875422BEDeD0655d5f4d3B80043639bf3da8C.
    const contractFactory = new DatachainV1__factory(this.ethWallet);
    const deployedContract = await contractFactory.deploy();
    this.log.info("Deployed DatachainV1 contract at: " + deployedContract.address);

    // Deploy UUPSProxy contract to 0xB249f874F74B8d873b3252759Caed4388cfe2492.
    const proxyFactory = new UUPSProxy__factory(this.ethWallet);
    const deployedProxy = await proxyFactory.deploy(deployedContract.address, "0x");
    this.log.info("Deployed UUPSProxy contract at: " + deployedProxy.address);

    // DatachainV1 client.
    this.claimContract = DatachainV1__factory.connect(deployedProxy.address, this.ethWallet);

    // UUPSProxy client.
    const proxyAsDatachainV1 = DatachainV1__factory.connect(deployedProxy.address, this.ethWallet);
    await proxyAsDatachainV1.initialize(await this.ethWallet.getAddress());
  }

  private async createNextBlock(): Promise<void> {
    while (true) {
      try {
        await new Promise((resolve, _) => {
          setTimeout(resolve, this.config.chain.blockPeriod);
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
        const bundleTxnHashes = txnBundle.transactions.map(hashSignedTransaction);
        this.log.info(`created transaction bundle ${bundleHash} with transactions: ${JSON.stringify(bundleTxnHashes)}`);

        // Generate randomness proof for block.
        this.log.info(`fetching drand beacon`);
        const blockRandBeacon = await fetchDrandBeacon();
        this.log.info(`fetched drand beacon: ${JSON.stringify(blockRandBeacon)}`);
        const blockRandProof = await createBlockRandomnessProof(bundleHash, this.config.blsSecKey, blockRandBeacon);
        const blockRandSeed = getSeedFromBlockRandomnessProof(blockRandProof);

        // Check transaction data availability.
        const daCommittee = await getDACommiteeSample(
          this.storage,
          this.config.DACommitteeSampleSize,
          blockRandSeed,
          this.blsPubKey,
        );
        const daCheckResult = await this.offchainManager.checkTxnBundleDA(txnBundle, blockRandProof, daCommittee);
        for (const txn of daCheckResult.rejectedTxns) {
          await this.storage.removePendingTransaction(txn);
        }
        if (daCheckResult.acceptedTxns.length == 0) {
          this.log.error(`failed to mint next block - all transactions have failed DA verification`);
          continue;
        }

        // Mint block.
        this.log.info(`minting next block from ${daCheckResult.acceptedTxns.length} new transactions`);
        const nextBlockProof: BlockProof = {
          txnBundleHash: bundleHash,
          txnBundleProposer: this.blsPubKey,
          DACheckResults: daCheckResult.responses,
          randomnessProof: blockRandProof,
          aggDACheckResultSignature: daCheckResult.aggSignature,
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
          this.log.info(`transaction ${stringifySignedTransaction(txn)} accepted`);
        }
        for (const [txn, err] of rejectedTxns) {
          this.log.info(`transaction ${stringifySignedTransaction(txn)} rejected - ${err.message}`);
          await this.storage.removePendingTransaction(txn);
        }

        // Commit minted block;
        const blockHash = hashBlock(nextBlock);
        const rawBlock = serializeBlock(nextBlock);
        await this.claimContract?.submitBlock(rawBlock);
        this.log.info(`block ${blockHash} committed to smart contract`);

        await this.storage.commitNextBlock(state, nextBlock);
      } catch (err: any) {
        this.log.error(`failed to mint next block - ${err.message}`);
      }
    }
  }

  private async uploadBlockchainToIPFS(force: boolean = false): Promise<void> {
    while (true) {
      try {
        await new Promise((resolve, _) => {
          setTimeout(resolve, this.config.ipfs.blockchainSyncPeriod);
        });
        // TODO: handle exceptions in background process (or fail fast?).

        // Starting form head block, upload all blocks until already uploaded block is found.
        let blockHash = await this.storage.getHeadBlockHash();
        if (blockHash == undefined) {
          throw new Error("can not fetch hash of head block from storage");
        }
        while (true) {
          const uploadedBlock: Block | undefined = await this.uploadBlockToIPFS(blockHash, force);
          // Сurrent block and all previous blocks are already uploaded.
          if (uploadedBlock == undefined) {
            // this.log.info(`block ${blockHash} is already uploaded to ipfs`);
            break;
          }
          // Genesis block does not have previous block.
          if (uploadedBlock.prevBlockHash == "") {
            this.log.info(`genesis block ${blockHash} is uploaded to ipfs`);
            break;
          }
          blockHash = uploadedBlock.prevBlockHash;
        }
        if (force) {
          break;
        }
      } catch (err: any) {
        this.log.error(`failed to upload blockchain to IPFS - ${err.message}`);
      }
    }
  }

  private async uploadBlockToIPFS(blockHash: string, force: boolean = false): Promise<Block | undefined> {
    // Check if block is already uploaded.
    const blockMetaExists = await this.storage.getBlockMetadata(blockHash);
    if (blockMetaExists != undefined && !force) {
      return undefined;
    }

    // Get block content and upload it to IPFS.
    this.log.info(`uploading block ${blockHash} to ipfs: force ` + force);
    const block = await this.storage.getBlock(blockHash);
    if (block == undefined) {
      throw Error("block metadata exists in db while block itself is missing");
    }
    const rawBlock = await serializeBlock(block);
    const blockCID = await this.ipfs.getIPFS().dag.put(rawBlock, { pin: true });

    // Mark block as uploaded in storage.
    const blockMeta: BlockMetadata = {
      CID: blockCID.toString(),
    };
    const rawBlockMeta = serializeBlockMetadata(blockMeta);
    await this.storage.setBlockMetadata(blockHash, rawBlockMeta);

    return block;
  }

  // API methods.

  public async submitTransaction(txn: SignedTransaction): Promise<void> {
    this.storage.submitTransaction(txn);
  }

  public async getAccount(pubKey: string): Promise<Account | undefined> {
    return this.storage.getAccount(pubKey);
  }

  public async getStakerList(): Promise<Record<string, Account>> {
    const stakers: Record<string, Account> = {};
    const stakerPubKeys = await this.storage.getStakersList();
    for (const pubKey of stakerPubKeys) {
      const staker = await this.storage.getAccount(pubKey);
      if (staker != undefined) {
        stakers[pubKey] = staker;
      } else {
        // TODO: this means error in storage.
      }
    }
    return stakers;
  }

  public async getHeadBblockHash(): Promise<string> {
    return await this.storage.getHeadBlockHash();
  }

  public async getBlockMetadata(blockHash: string): Promise<BlockMetadata | undefined> {
    const rawMeta = await this.storage.getBlockMetadata(blockHash);
    if (rawMeta == undefined) {
      return undefined;
    }
    const meta = deserializeBlockMetadata(rawMeta);
    return meta;
  }

  public async getBlock(blockHash: string): Promise<Block | undefined> {
    return await this.storage.getBlock(blockHash);
  }
}
