import { CID } from "ipfs-http-client";
import { bls12_381 as BLS } from "@noble/curves/bls12-381";

import { IPFS } from "../../p2p/ipfs";
import { Transaction, Account, DAInfo, Block, DataChain, StakeType, DrandBeaconInfo } from "../../blockchain/types";
import { bytesEqual, bytesFromHex } from "../../blockchain/util";
import { CoordinatorRPCConfig, CoordinatorRPC } from "../../coordinator/src/rpc";
import { BlockchainStorageConfig, BlockchainStorage } from "../../blockchain/storage";
import { signTransaction } from "../../blockchain/block";
import { BlockchainClientSync } from "./blockchain_sync";
import { ClientNodeRPCServerConfig, ClientNodeRPCServer } from "./rpc_server";
import { DAVerifierConfig, DAVerifier } from "./da_verifier";
import { VerifierServiceConfig, createDAInfo, prepopulate } from "./verifier_service";
import { DEFAULT_CARTESI_VM_MAX_CYCLES, SWARM_PING_INTERVAL } from "./constant";
import { StateVerifier, StateVerifierConfig } from "./state_verifer";
import Logger from "../../log/logger";

const LOG_NETWORK = "network";

export interface ClientNodeConfig {
  blsSecKey: string;

  chain: {
    minterAddress: string;
    contractAddress: string;
    blockSyncPeriod: number;
    roles: {
      daVerifier?: DAVerifierConfig;
      stateVerifier?: StateVerifierConfig;
    };
  };

  storage: BlockchainStorageConfig;

  ipfs: {
    apiHost: string;
  };

  eth: {
    rpc: {
      address: string;
      retryPeriod: number;
      timeout: number;
    };
  };

  coordinator: {
    blsPubKey: string;
    rpc: CoordinatorRPCConfig;
  };

  verifierService: VerifierServiceConfig;

  rpcServer: ClientNodeRPCServerConfig;
}

export interface CreateDatachainParameters {
  dataContractCID: CID;
  inputCID: CID;
  outputCID: CID;
  outputFileHash: Uint8Array;
}

export interface UpdateDatachainParameters {
  // New claim info.
  dataContractCID: CID;
  inputCID: CID;
  outputCID: CID;
  // Existing chain info.
  rootClaimHash: Uint8Array;
  outputFileHash: Uint8Array;
}

export class ClientNode {
  private readonly config: ClientNodeConfig;
  private readonly blsPubKey: Uint8Array;

  private readonly log: Logger;

  private readonly coordinator: CoordinatorRPC;

  private readonly ipfs: IPFS;

  private readonly storage: BlockchainStorage;
  private readonly blockchainSync: BlockchainClientSync;

  private readonly daVerifier: DAVerifier | undefined;
  private readonly stateVerifier: StateVerifier | undefined;
  private readonly apiServer: ClientNodeRPCServer;

  constructor(config: ClientNodeConfig, log: Logger, drandBeaconInfo: DrandBeaconInfo) {
    this.config = config;
    this.blsPubKey = BLS.getPublicKey(this.config.blsSecKey);

    this.log = log;

    this.coordinator = new CoordinatorRPC(this.config.coordinator.rpc);

    this.ipfs = new IPFS({ host: this.config.ipfs.apiHost }, this.log);

    this.storage = new BlockchainStorage(this.config.storage, this.log);
    this.blockchainSync = new BlockchainClientSync(
      {
        contractAddress: this.config.chain.contractAddress,
        ethRpcAddress: this.config.eth.rpc.address,
        blockSyncPeriod: this.config.chain.blockSyncPeriod,
      },
      this.log,
      this.coordinator,
      this.ipfs,
      this.storage,
      drandBeaconInfo,
    );

    if (this.config.chain.roles.daVerifier) {
      this.daVerifier = new DAVerifier(
        bytesFromHex(this.config.blsSecKey),
        bytesFromHex(this.config.coordinator.blsPubKey),
        this.config.chain.roles.daVerifier,
        this.log,
        this.config.verifierService,
        this.ipfs,
        this.storage,
        drandBeaconInfo,
      );
    }

    if (this.config.chain.roles.stateVerifier) {
      this.stateVerifier = new StateVerifier(
        bytesFromHex(this.config.blsSecKey),
        bytesFromHex(this.config.coordinator.blsPubKey),
        this.config.chain.roles.stateVerifier,
        this.log,
        this.config.verifierService,
        this.ipfs,
        this.storage,
        drandBeaconInfo,
      );
    }

    this.apiServer = new ClientNodeRPCServer(this.config.rpcServer, this.log, this);
  }

  public async start(): Promise<void> {
    await this.ipfs.up();
    const bootstrap = await this.coordinator.getIPFSBootstrap();
    if (bootstrap) {
      for (let i = 0; i < bootstrap.length; i++) {
        this.ipfs
          .getIPFS()
          .swarm.connect(bootstrap[i])
          .catch((err) => {
            this.log.error("failed to connect to bootstrap peer", err, LOG_NETWORK, { address: bootstrap[i] });
          });
      }
    }
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
    await prepopulate(this.config.verifierService, this.ipfs, this.log);
    await this.storage.init(bytesFromHex(this.config.chain.minterAddress));
    await this.blockchainSync.start();
    await this.daVerifier?.start();
    await this.stateVerifier?.start();
    await this.apiServer.start();

    const genesisBlockHash = await this.storage.getGenesisBlockHash();
    await this.ipfs.keepConnectedToSwarm("tosi-" + genesisBlockHash, SWARM_PING_INTERVAL);
  }

  // RPC methods.

  public async getBlock(blockHash: Uint8Array): Promise<Block | undefined> {
    return await this.storage.getBlock(blockHash);
  }

  public async getAccount(address: Uint8Array): Promise<Account | undefined> {
    return await this.storage.getAccount(address);
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
          prevClaimHash: new Uint8Array(),
          dataContract: { cid: params.dataContractCID, ...functionInfo },
          input: { cid: params.inputCID, ...inputInfo },
          output: { cid: params.outputCID, ...outputInfo },
          maxCartesiCycles: DEFAULT_CARTESI_VM_MAX_CYCLES,
          outputFileHash: params.outputFileHash,
        },
      },
      nonce: 0,
    };

    return txn;
  }

  public async generateUpdateDatachainTxn(params: UpdateDatachainParameters): Promise<Transaction> {
    const chain = await this.storage.getDataChain(params.rootClaimHash);
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
          dataContract: { cid: params.dataContractCID, ...functionInfo },
          input: { cid: params.inputCID, ...inputInfo },
          output: { cid: params.outputCID, ...outputInfo },
          maxCartesiCycles: DEFAULT_CARTESI_VM_MAX_CYCLES,
          outputFileHash: params.outputFileHash,
        },
      },
      nonce: 0,
    };

    return txn;
  }

  private async fetchDAInfoNoCache(cid: CID, car: boolean): Promise<DAInfo | undefined> {
    const daInfo = await createDAInfo(this.config.verifierService, this.ipfs, this.log, cid.toString(), 600, car);
    return daInfo;
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
    const signedTxn = await signTransaction(txnWithNonce, bytesFromHex(this.config.blsSecKey));
    await this.coordinator.submitSignedTransaction(signedTxn);

    return;
  }

  public async getSyncStatus(): Promise<boolean> {
    return await this.blockchainSync.isSynced();
  }
}
