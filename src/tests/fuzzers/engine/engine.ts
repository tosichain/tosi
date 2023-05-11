import { bls12_381 as BLS } from "@noble/curves/bls12-381";
import Sampler from "weighted-reservoir-sampler";
import { pickRandomItems, randomStakeType } from "./util";

import { SignedTransaction, StakeType } from "../../../blockchain/types";
import { bytesEqual, bytesToHex, hashSignedTransaction } from "../../../blockchain/util";
import { createAccount } from "../../../blockchain/transaction";
import Logger from "../../../log/logger";

import { Actor } from "./actor";

export type EngineConfig = {
  minter: Uint8Array; // private key of minter account
  verifiers: Uint8Array[]; // private keys of accounts, running verifiers
  userCount: number;
  txns: TransactionConfig;
};

export type TransactionConfig = {
  airdrop: AirdropConfig;
  mint: MintConfig;
  transfer: TransferConfig;
  stake: StakeConifg;
  unstake: UnstakeConfig;
};

export type AirdropConfig = {
  minAmount: bigint;
  maxAmount: bigint;
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

export type TransactionStats = {
  totalGenerated: number;
  totalConfirmed: number;
  confirmTimeMin: number;
  confirmTimeMax: number;
  confirmTimeAvg: number;
};

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
    this.txnWeights.set(TransactionType.Mint, this.config.txns.mint.weight);
    this.txnWeights.set(TransactionType.Transfer, this.config.txns.transfer.weight);
    this.txnWeights.set(TransactionType.Stake, this.config.txns.stake.weight);
    this.txnWeights.set(TransactionType.Unstake, this.config.txns.unstake.weight);
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
    for (const receiver of this.actors.values()) {
      txns.push(await this.minter.generateMint(receiver.getAccount().address));
    }

    for (const txn of txns) {
      this.log.debug("airdrop transaction generated", "engine", {
        txn: txn,
        txnHash: hashSignedTransaction(txn),
      });
    }

    return txns;
  }

  public async generateTxns(count: number): Promise<SignedTransaction[]> {
    // Only actors without uncofirmed transactions can generate new transactions.
    const usersCandidates = Array.from(this.actors.values()).filter((a) => {
      return a.allTransactionConfirmed();
    });
    const verifierCandidates = this.verifiers.filter((v) => {
      return v.allTransactionConfirmed();
    });

    // Sample transaction types.
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

    // Generate transactions.
    const txns: SignedTransaction[] = [];
    for (const txnType of txnsTypes) {
      let txn: SignedTransaction | undefined;
      switch (txnType) {
        case TransactionType.Mint:
          txn = await this.generateMint();
          break;
        case TransactionType.Transfer:
          txn = await this.generateTransfer(usersCandidates);
          break;
        case TransactionType.Stake:
          txn = await this.generateStake(verifierCandidates);
          break;
        case TransactionType.Unstake:
          txn = await this.generateUnstake(verifierCandidates);
          break;
      }
      if (txn) {
        txns.push(txn);
        this.log.debug("transaction generated", "engine", {
          txn: txn,
          txnHash: hashSignedTransaction(txn),
        });
      }
    }

    return txns;
  }

  private async generateMint(): Promise<SignedTransaction | undefined> {
    if (this.minter.allTransactionConfirmed()) {
      return await this.minter.generateMint();
    } else {
      this.log.debug("failed to generate MintToken transaction", "engine", {
        reason: "minter has unconfirmed trnansactions",
      });
      return undefined;
    }
  }

  private async generateTransfer(candidates: Actor[]): Promise<SignedTransaction | undefined> {
    const usersWithBalance = getActorsWithBalance(candidates);
    if (usersWithBalance.length > 0) {
      const user = pickRandomItems(candidates, 1)[0];
      return await user.generateTransfer();
    } else {
      this.log.debug("failed to generate TransferToken transaction", "engine", {
        reason: "no users with non-zero balance",
      });
      return undefined;
    }
  }

  private async generateStake(candidates: Actor[]): Promise<SignedTransaction | undefined> {
    const stakeType = randomStakeType();
    const verifiersWithBalance = getActorsWithBalance(candidates);
    if (verifiersWithBalance.length > 0) {
      const verifier = pickRandomItems(candidates, 1)[0];
      return await verifier.generateStake(stakeType);
    } else {
      this.log.debug("failed to generate StakeToken transaction", "engine", {
        reason: "no verifier accounts with non-zero balance",
        stakeType: stakeType,
      });
      return undefined;
    }
  }

  private async generateUnstake(candidates: Actor[]): Promise<SignedTransaction | undefined> {
    const stakeType = randomStakeType();
    const verifiersWithBalance = getVerifiersWithStake(candidates, stakeType);
    if (verifiersWithBalance.length > 0) {
      const verifier = pickRandomItems(candidates, 1)[0];
      return await verifier.generateUnstake(stakeType);
    } else {
      this.log.debug("failed to generate UnstakeToken transaction", "engine", {
        reason: "no verifier accounts with non-zero stake",
        stakeType: stakeType,
      });
      return undefined;
    }
  }

  public async confirmTxns(txns: SignedTransaction[], blockTime: number): Promise<void> {
    for (const txn of txns) {
      if (txn.txn.mint) {
        await this.minter.confirmMint(txn, blockTime);
        if (!bytesEqual(txn.from, txn.txn.mint.receiver)) {
          const receiver = this.actors.get(bytesToHex(txn.txn.mint.receiver));
          await receiver?.confirmMint(txn, blockTime);
        }
      } else if (txn.txn.transfer) {
        const sender = this.actors.get(bytesToHex(txn.from));
        await sender?.confirmTransfer(txn, blockTime);
        if (!bytesEqual(txn.from, txn.txn.transfer.receiver)) {
          const receiver = this.actors.get(bytesToHex(txn.txn.transfer.receiver));
          await receiver?.confirmTransfer(txn, blockTime);
        }
      } else if (txn.txn.stake) {
        await this.actors.get(bytesToHex(txn.from))?.confirmStake(txn, blockTime);
      } else if (txn.txn.unstake) {
        await this.actors.get(bytesToHex(txn.from))?.confirmUnstake(txn, blockTime);
      } else {
        throw new Error("unknown transaction type");
      }
      this.log.debug("transaction confirmed", "engine", {
        txn: txn,
        txnHash: hashSignedTransaction(txn),
      });
    }
  }

  public getRandomActor(): Actor {
    const actors = Array.from(this.actors.values()).filter((a) => {
      const account = a.getAccount();
      return !bytesEqual(account.address, this.minter.getAccount().address);
    });
    return pickRandomItems(actors, 1)[0];
  }

  public getTransactionStats(): TransactionStats {
    const stats: TransactionStats = {
      totalGenerated: 0,
      totalConfirmed: 0,
      confirmTimeMin: Number.MAX_SAFE_INTEGER,
      confirmTimeMax: Number.MIN_SAFE_INTEGER,
      confirmTimeAvg: 0,
    };
    let confirmTimeTotal = 0;

    for (const actor of this.actors.values()) {
      const generated = actor.getGeneratedTransactions();
      const confirmed = actor.getConfirmedTransactions();

      stats.totalGenerated += generated.length;
      stats.totalConfirmed += confirmed.length;

      for (const txn of confirmed) {
        const confirmTme = (txn.confirmedAt as number) - txn.generatedAt;
        if (confirmTme < stats.confirmTimeMin) {
          stats.confirmTimeMin = confirmTme;
        }
        if (confirmTme > stats.confirmTimeMax) {
          stats.confirmTimeMax = confirmTme;
        }
        confirmTimeTotal += confirmTme;
      }
    }

    stats.confirmTimeAvg = confirmTimeTotal / stats.totalConfirmed;

    return stats;
  }
}

function getActorsWithBalance(actors: Actor[]): Actor[] {
  return actors.filter((a) => {
    return a.getAccount().balance > 0;
  });
}

function getVerifiersWithStake(actors: Actor[], stakeType: StakeType): Actor[] {
  switch (stakeType) {
    case StakeType.DAVerifier:
      return actors.filter((a) => {
        return a.getAccount().daVerifierStake > 0;
      });
    case StakeType.StateVerifier:
      return actors.filter((a) => {
        return a.getAccount().stateVerifierStake > 0;
      });
    default:
      throw new Error("unknown stake type");
  }
}
