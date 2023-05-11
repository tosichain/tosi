import { bls12_381 as BLS } from "@noble/curves/bls12-381";
import Sampler from "weighted-reservoir-sampler";
import { pickRandomItems } from "./util";

import { SignedTransaction } from "../../../blockchain/types";
import { bytesToHex } from "../../../blockchain/util";
import { createAccount } from "../../../blockchain/transaction";
import Logger from "../../../log/logger";

import { Actor } from "./actor";

export type EngineConfig = {
  minter: Uint8Array; // private key of minter account
  verifiers: Uint8Array[]; // private keys of accounts, running verifiers
  userCount: number;
  transactions: TransactionConfig;
};

export type TransactionConfig = {
  airdrop: AirdropConfig;
  mint: MintConfig;
  transfer: TransferConfig;
  stake: StakeConifg;
  unstake: UnstakeConfig;
};

export type AirdropConfig = {
  maxAmount: bigint;
  minAmount: bigint;
  receiverCount: number;
};

export type MintConfig = {
  weight: number;
  minAmount: bigint;
  maxAmount: bigint;
};

export type TransferConfig = {
  weight: number;
  minRatio: number;
  maxRatio: number;
};

export type StakeConifg = {
  weight: number;
  minRatio: number;
  maxRatio: number;
};

export type UnstakeConfig = {
  weight: number;
  minRatio: number;
  maxRatio: number;
};

export enum TransactionType {
  Mint = "mint",
  Transfer = "transfer",
  Stake = "stake",
  Unstake = "unstake",
}

export class Engine {
  public readonly config: EngineConfig;
  private readonly log: Logger;

  private readonly txnWeights: Map<TransactionType, number>;

  private readonly minter: Actor;
  private readonly verifiers: Actor[];
  private readonly actors: Map<string, Actor>;

  constructor(config: EngineConfig, log: Logger) {
    this.config = config;
    this.log = log;

    this.verifiers = [];
    this.actors = new Map<string, Actor>();

    // Check transaction config.
    this.txnWeights = new Map<TransactionType, number>();
    this.txnWeights.set(TransactionType.Mint, this.config.transactions.mint.weight);
    this.txnWeights.set(TransactionType.Transfer, this.config.transactions.transfer.weight);
    this.txnWeights.set(TransactionType.Stake, this.config.transactions.stake.weight);
    this.txnWeights.set(TransactionType.Unstake, this.config.transactions.unstake.weight);
    let totalWeight = 0.0;
    for (const weight of this.txnWeights.values()) {
      totalWeight += weight;
    }
    if (totalWeight > 1) {
      throw Error("sum of transaction weights must be less than 1");
    }

    // Initialize actors.
    this.minter = this.createActor(this.config.minter);
    for (const pirvKey of this.config.verifiers) {
      const verifier = this.createActor(pirvKey);
      this.verifiers.push(verifier);
    }
    for (let i = 0; i < this.config.userCount; i++) {
      this.createActor();
    }
  }

  private createActor(privKey?: Uint8Array): Actor {
    let accountPrivKey: Uint8Array;
    if (privKey) {
      accountPrivKey = privKey;
    } else {
      accountPrivKey = BLS.utils.randomPrivateKey();
    }

    const accountAddr = BLS.getPublicKey(accountPrivKey);
    const accountAddrHex = bytesToHex(accountAddr);

    const account = createAccount(accountAddr, 0n, 0n, 0n);
    const actor = new Actor(accountPrivKey, account, this, this.log);
    this.actors.set(accountAddrHex, actor);

    return actor;
  }

  public async generateAirdropTxns(): Promise<SignedTransaction[]> {
    const txns: SignedTransaction[] = [];
    for (const verifier of this.config.verifiers) {
      txns.push(await this.minter.generateMint(verifier));
    }
    const receivers = pickRandomItems(Array.from(this.actors.values()), this.config.transactions.airdrop.receiverCount);
    for (const receiver of receivers) {
      txns.push(await this.minter.generateMint(receiver.getAccount().address));
    }
    return txns;
  }

  public async generateTxns(count: number): Promise<SignedTransaction[]> {
    const txnWeights = this.txnWeights;
    const txnSampler = new Sampler({
      sampleSize: count,
      weightFunction: function (txnType: TransactionType) {
        return txnWeights.get(txnType);
      },
    });
    for (const txnType of this.txnWeights.keys()) {
      txnSampler.push(txnType);
    }
    const txnsTypes: TransactionType[] = txnSampler.end();

    const txns: SignedTransaction[] = [];
    for (const txnType of txnsTypes) {
      switch (txnType) {
        case TransactionType.Mint:
          txns.push(await this.generateMint());
        case TransactionType.Transfer:
          txns.push(await this.generateTransfer());
        case TransactionType.Stake:
          txns.push(await this.generateStake());
        case TransactionType.Unstake:
          txns.push(await this.generateUnstake());
      }
    }

    return txns;
  }

  private async generateMint(): Promise<SignedTransaction> {
    return await this.minter.generateMint();
  }

  private async generateTransfer(): Promise<SignedTransaction> {
    return this.getRandomActor().generateTransfer();
  }

  private async generateStake(): Promise<SignedTransaction> {
    return this.getRandomVerifier().generateStake();
  }

  private async generateUnstake(): Promise<SignedTransaction> {
    return this.getRandomVerifier().generateUnstake();
  }

  public async confirmTxns(txns: SignedTransaction[]): Promise<void> {
    for (const actor of this.actors.values()) {
      for (const txn of txns) {
        if (txn.txn.mint) {
          await actor.confirmMint(txn);
        } else if (txn.txn.transfer) {
          await actor.confirmTransfer(txn);
        } else if (txn.txn.stake) {
          await actor.confirmStake(txn);
        } else if (txn.txn.unstake) {
          await actor.confirmUnstake(txn);
        } else {
          throw new Error("unknown transaction type");
        }
      }
    }
  }

  public getRandomActor(): Actor {
    return pickRandomItems(Array.from(this.actors.values()), 1)[0];
  }

  public getRandomVerifier(): Actor {
    return pickRandomItems(this.verifiers, 1)[0];
  }
}
