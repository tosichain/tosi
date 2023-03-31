import winston from "winston";
import * as IpfsHttpClient from "ipfs-http-client";
import { CID } from "ipfs-http-client";
import * as BLS from "@noble/bls12-381";

import { IPFS } from "../../node/ipfs";
import { Transaction, Account, DAInfo, Block, DataChain, StakeType } from "../../blockchain/types";
import { CoordinatorRPCConfig, CoordinatorRPC } from "../../coordinator/src/rpc";
import { BlockchainStorageConfig, BlockchainStorage } from "../../blockchain/storage";
import { signTransaction } from "../../blockchain/block";
import { BlockchainClientSyncConfig, BlockchainClientSync } from "./blockchain_sync";
import { ClientNodeAPIServerConfig, ClientNodeAPIServer } from "./api_server";
import { DAVerifierConfig, DAVerifier } from "./da_verifier";
import { createDAInfo } from "./util";
import { DEFAULT_CARTESI_VM_MAX_CYCLES, SWARM_PING_INTERVAL } from "./constant";
import { keepConnectedToSwarm } from "../../p2p/util";
import { StateVerifier, StateVerifierConfig } from "./state_verifer";

export interface ClientNodeConfig {
  coordinator: CoordinatorRPCConfig;
  ipfs: IpfsHttpClient.Options;
  storage: BlockchainStorageConfig;
  blokchainSync: BlockchainClientSyncConfig;
  api: ClientNodeAPIServerConfig;
  blsSecKey: string;
  coordinatorPubKey: string;
  DACommitteeSampleSize: number; // TODO: must be sealed in blockchain.
  stateCommitteeSampleSize: number; // TODO: must be sealed in blockchain.
  roles: {
    daVerifier: DAVerifierConfig | undefined;
    stateVerifier: StateVerifierConfig | undefined;
  };
}

export interface CreateDatachainParameters {
  dataContractCID: CID;
  inputCID: CID;
  outputCID: CID;
}

export interface UpdateDatachainParameters {
  // New claim info.
  dataContractCID: CID;
  inputCID: CID;
  outputCID: CID;
  // Existing chain info.
  rootClaimHash: string;
}

export class ClientNode {
  private readonly config: ClientNodeConfig;
  private readonly blsPubKey: string;

  private readonly log: winston.Logger;

  private readonly coordinator: CoordinatorRPC;

  private readonly ipfs: IPFS;

  private readonly storage: BlockchainStorage;
  private readonly blockchainSync: BlockchainClientSync;

  private readonly daVerifier: DAVerifier | undefined;
  private readonly stateVerifier: StateVerifier | undefined;
  private readonly apiServer: ClientNodeAPIServer;

  constructor(config: ClientNodeConfig, log: winston.Logger) {
    this.config = config;
    this.blsPubKey = Buffer.from(BLS.getPublicKey(this.config.blsSecKey)).toString("hex");

    this.log = log;

    this.coordinator = new CoordinatorRPC(this.config.coordinator);

    this.ipfs = new IPFS(this.config.ipfs, this.log);

    this.storage = new BlockchainStorage(this.config.storage, this.log);
    this.blockchainSync = new BlockchainClientSync(
      this.config.DACommitteeSampleSize,
      this.config.blokchainSync,
      this.log,
      this.coordinator,
      this.ipfs,
      this.storage,
    );

    if (this.config.roles.daVerifier) {
      this.daVerifier = new DAVerifier(
        this.config.blsSecKey,
        this.config.coordinatorPubKey,
        this.config.DACommitteeSampleSize,
        this.config.roles.daVerifier,
        this.log,
        this.ipfs,
        this.storage,
      );
    }

    if (this.config.roles.stateVerifier) {
      this.stateVerifier = new StateVerifier(
        this.config.blsSecKey,
        this.config.coordinatorPubKey,
        this.config.stateCommitteeSampleSize,
        this.config.roles.stateVerifier,
        this.log,
        this.ipfs,
        this.storage,
      );
    }

    this.apiServer = new ClientNodeAPIServer(this.config.api, this.log, this);
  }

  public async start(): Promise<void> {
    await this.ipfs.up(this.log);
    const bootstrap = await this.coordinator.getIPFSBootstrap();
    if (bootstrap) {
      for (let i = 0; i < bootstrap.length; i++) {
        this.ipfs
          .getIPFS()
          .swarm.connect(bootstrap[i])
          .catch((err) => {
            this.log.info("failed to connect to bootstrap peer: " + bootstrap[i]);
          });
      }
    }
    while (true) {
      const peers = await this.ipfs.getIPFS().swarm.peers();
      if (peers.length > 0) {
        break;
      }
      this.log.info("IPFS has no peers, waiting a second..");
      await new Promise((resolve, reject) => {
        setTimeout(resolve, 1000);
      });
    }
    await this.storage.init();
    await this.blockchainSync.start();
    await this.daVerifier?.start();
    await this.stateVerifier?.start();
    await this.apiServer.start();

    const genesisBlockHash = await this.storage.getGenesisBlockHash();
    await keepConnectedToSwarm("tosi-" + genesisBlockHash, this.ipfs, this.log, SWARM_PING_INTERVAL);
  }

  // API methods.

  public async generateCreateDatachainTxn(params: CreateDatachainParameters): Promise<Transaction> {
    const functionDataPromise = this.fetchDAInfoNoCache(params.dataContractCID, false);
    const inputDataPromise = this.fetchDAInfoNoCache(params.inputCID, true);
    const outputDataPromise = this.fetchDAInfoNoCache(params.outputCID, true);

    // wait for them to settle
    const functionInfo = await functionDataPromise;
    const inputInfo = await inputDataPromise;
    const outputInfo = await outputDataPromise;

    if (!functionInfo || !inputInfo || !outputInfo) {
      throw new Error("Missing DA: " + JSON.stringify({ functionInfo, inputInfo, outputInfo }));
    }

    const txn: Transaction = {
      createChain: {
        rootClaim: {
          claimer: this.blsPubKey,
          prevClaimHash: "",
          dataContract: { cid: params.dataContractCID.toString(), ...functionInfo },
          input: { cid: params.inputCID.toString(), ...inputInfo },
          output: { cid: params.outputCID.toString(), ...outputInfo },
          maxCartesiCycles: DEFAULT_CARTESI_VM_MAX_CYCLES,
        },
      },
      nonce: 0,
    };

    return txn;
  }

  private async fetchDAInfoNoCache(cid: CID, car: boolean): Promise<DAInfo | undefined> {
    const daInfo = await createDAInfo(this.ipfs, this.log, cid.toString(), 600, car);
    return daInfo;
  }

  public async generateUpdateDatachainTxn(params: UpdateDatachainParameters): Promise<Transaction> {
    const chain = await this.storage.getComputeChain(params.rootClaimHash);
    if (chain == undefined) {
      throw new Error(`can not find datachain with root claim ${params.rootClaimHash}`);
    }

    const functionDataPromise = this.fetchDAInfoNoCache(params.dataContractCID, false);
    const inputDataPromise = this.fetchDAInfoNoCache(params.inputCID, true);
    const outputDataPromise = this.fetchDAInfoNoCache(params.outputCID, true);

    // wait for them to settle
    const functionInfo = await functionDataPromise;
    const inputInfo = await inputDataPromise;
    const outputInfo = await outputDataPromise;

    if (!functionInfo || !inputInfo || !outputInfo) {
      throw new Error("Missing DA");
    }

    const txn: Transaction = {
      updateChain: {
        rootClaimHash: chain.rootClaimHash,
        claim: {
          claimer: this.blsPubKey,
          prevClaimHash: chain.headClaimHash,
          dataContract: { cid: params.dataContractCID.toString(), ...functionInfo },
          input: { cid: params.inputCID.toString(), ...inputInfo },
          output: { cid: params.outputCID.toString(), ...outputInfo },
          maxCartesiCycles: DEFAULT_CARTESI_VM_MAX_CYCLES,
        },
      },
      nonce: 0,
    };

    return txn;
  }

  public async submitTransaction(txn: Transaction): Promise<void> {
    // Do not rely on nonce, provided by client.
    const account = await this.storage.getAccount(this.blsPubKey);
    if (account == undefined) {
      throw new Error("can not find transaction sender account");
    }
    const txnWithNonce: Transaction = {
      ...txn,
      nonce: account.nonce + 1,
    };

    // Sign transaction and send it.
    const signedTxn = await signTransaction(txnWithNonce, this.config.blsSecKey);
    await this.coordinator.submitSignedTransaction(signedTxn);

    return;
  }

  public async getBlock(blockHash: string): Promise<Block | undefined> {
    return await this.storage.getBlock(blockHash);
  }

  public async getAccount(pubKey: string): Promise<Account | undefined> {
    return await this.storage.getAccount(pubKey);
  }

  public async getStakerList(stakeType: StakeType): Promise<Account[]> {
    const stakePool = await this.storage.getStakePool();

    let stakerPubKeys: string[];
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

  public async getDataChain(rootClaimHash: string): Promise<DataChain | undefined> {
    return await this.storage.getComputeChain(rootClaimHash);
  }

  public async getSyncStatus() {
    return await this.blockchainSync.isSynced();
  }

  public async getLatestBlockHash() {
    return await this.blockchainSync.latestHash();
  }

  public async getLatestLocalHash() {
    const latestLocalHash = await this.storage.getHeadBlockHash();
    return "0x" + latestLocalHash;
  }

  public async getBlsPubKeyInHex() {
    const blsPubKeyInHex = this.blsPubKey;
    return blsPubKeyInHex;
  }

  public async getDatachains() {
    return await this.storage.getDataChainList();
  }

  public async getAccountHistory(pubkey: string) {
    let headBlockHash = await this.storage.getHeadBlockHash();
    const history: Transaction[] = [];

    while (true) {
      const block = await this.storage.getBlock(headBlockHash);

      if (block == undefined) {
        break;
      }

      block.transactions.forEach((transaction) => {
        if (transaction.from == pubkey) {
          history.push(transaction.txn);
        }
      });

      headBlockHash = block.prevBlockHash;
      if (headBlockHash == "") {
        break;
      }
    }

    return history;
  }
}
