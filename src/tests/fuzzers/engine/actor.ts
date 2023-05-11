import {
  SignedTransaction,
  Transaction,
  MintToken,
  TransferToken,
  StakeType,
  StakeToken,
  UnstakeToken,
  Account,
} from "../../../blockchain/types";
import { signTransaction } from "../../../blockchain/block";
import Logger from "../../../log/logger";

import { Engine } from "./engine";
import { randomAbsAmount, randomRatioAmount } from "./util";
import { bytesEqual, bytesToHex, hashSignedTransaction } from "../../../blockchain/util";
import { currentUnixTime } from "../../../util";

export type ActorTransaction = {
  txn: SignedTransaction;
  generatedAt: number;
  confirmedAt?: number;
};

export class Actor {
  private readonly privKey: Uint8Array;
  private account: Account;

  private readonly engine: Engine;
  private readonly log: Logger;

  private readonly generatedTxns: Map<string, ActorTransaction>;
  private readonly confirmedTxns: ActorTransaction[];

  constructor(privKey: Uint8Array, account: Account, engine: Engine, log: Logger) {
    this.privKey = privKey;
    this.account = account;

    this.engine = engine;
    this.log = log;

    this.generatedTxns = new Map<string, ActorTransaction>();
    this.confirmedTxns = [];
  }

  public getAccount(): Account {
    return {
      ...this.account,
    };
  }

  public async generateMint(receiverAddr?: Uint8Array): Promise<SignedTransaction> {
    let receiver: Uint8Array;
    if (receiverAddr) {
      receiver = receiverAddr;
    } else {
      receiver = this.engine.getRandomActor().getAccount().address;
    }

    const expectedAccount = this.getExpectedAccount();

    const amount = randomAbsAmount(this.engine.config.txns.mint.minAmount, this.engine.config.txns.mint.maxAmount);
    const txn: Transaction = {
      nonce: expectedAccount.nonce + 1,
      mint: {
        receiver: receiver,
        amount: amount,
      },
    };
    return await this.generateSignedTxn(txn);
  }

  public async generateTransfer(): Promise<SignedTransaction> {
    const receiver = this.engine.getRandomActor().getAccount().address;
    const expectedAccount = this.getExpectedAccount();

    const amount = randomRatioAmount(
      expectedAccount.balance,
      this.engine.config.txns.transfer.minRatio,
      this.engine.config.txns.transfer.maxRatio,
    );
    const txn: Transaction = {
      nonce: expectedAccount.nonce + 1,
      transfer: {
        receiver: receiver,
        amount: amount,
      },
    };
    return await this.generateSignedTxn(txn);
  }

  public async generateStake(stakeType: StakeType): Promise<SignedTransaction> {
    const expectedAccount = this.getExpectedAccount();
    const amount = randomRatioAmount(
      expectedAccount.balance,
      this.engine.config.txns.transfer.minRatio,
      this.engine.config.txns.transfer.maxRatio,
    );
    const txn: Transaction = {
      nonce: expectedAccount.nonce + 1,
      stake: {
        stakeType: stakeType,
        amount: amount,
      },
    };
    return await this.generateSignedTxn(txn);
  }

  public async generateUnstake(stakeType: StakeType): Promise<SignedTransaction> {
    const expectedAccount = this.getExpectedAccount();

    let stake: bigint;
    switch (stakeType) {
      case StakeType.DAVerifier:
        stake = expectedAccount.daVerifierStake;
        break;
      case StakeType.StateVerifier:
        stake = expectedAccount.stateVerifierStake;
        break;
      default:
        throw new Error("unknown stake type");
    }

    const amount = randomRatioAmount(
      stake,
      this.engine.config.txns.transfer.minRatio,
      this.engine.config.txns.transfer.maxRatio,
    );

    const txn: Transaction = {
      nonce: expectedAccount.nonce + 1,
      unstake: {
        stakeType: stakeType,
        amount: amount,
      },
    };
    return await this.generateSignedTxn(txn);
  }

  private async generateSignedTxn(txn: Transaction): Promise<SignedTransaction> {
    const signedTxn = await signTransaction(txn, this.privKey);
    const txnHashHex = bytesToHex(hashSignedTransaction(signedTxn));
    this.generatedTxns.set(txnHashHex, {
      txn: signedTxn,
      generatedAt: currentUnixTime(),
    });
    return signedTxn;
  }

  private getExpectedAccount(): Account {
    let result: Account = this.account;
    for (const actorTxn of this.generatedTxns.values()) {
      const txn = actorTxn.txn.txn;
      if (txn.mint) {
        result = applyMint(this.account, actorTxn.txn.from, txn.nonce, txn.mint);
      } else if (txn.transfer) {
        result = applyTransfer(this.account, actorTxn.txn.from, txn.nonce, txn.transfer);
      } else if (txn.stake) {
        result = applyStake(this.account, actorTxn.txn.from, txn.nonce, txn.stake);
      } else if (txn.unstake) {
        result = applyUnstake(this.account, actorTxn.txn.from, txn.nonce, txn.unstake);
      } else {
        throw new Error("unknown transaction type");
      }
    }
    return result;
  }

  public async confirmMint(txn: SignedTransaction, blockTime: number): Promise<void> {
    const mint = txn.txn.mint;
    if (!mint) {
      throw new Error("not MintToken trnansaction");
    }
    this.account = applyMint(this.account, txn.from, txn.txn.nonce, mint);
    this.confirmGeneratedTxn(txn, blockTime);
  }

  public async confirmTransfer(txn: SignedTransaction, blockTime: number): Promise<void> {
    const transfer = txn.txn.transfer;
    if (!transfer) {
      throw new Error("not TransferToken trnansaction");
    }
    if (!bytesEqual(txn.from, this.account.address) && !bytesEqual(transfer.receiver, this.account.address)) {
      throw new Error("transaction does not reference account");
    }
    this.account = applyTransfer(this.account, txn.from, txn.txn.nonce, transfer);
    this.confirmGeneratedTxn(txn, blockTime);
  }

  public async confirmStake(txn: SignedTransaction, blockTime: number): Promise<void> {
    const stake = txn.txn.stake;
    if (!stake) {
      throw new Error("not StakeToken trnansaction");
    }
    if (!bytesEqual(txn.from, this.account.address)) {
      throw new Error("transaction does not reference account");
    }
    this.account = applyStake(this.account, txn.from, txn.txn.nonce, stake);
    this.confirmGeneratedTxn(txn, blockTime);
  }

  public async confirmUnstake(txn: SignedTransaction, blockTime: number): Promise<void> {
    const unstake = txn.txn.unstake;
    if (!unstake) {
      throw new Error("not UnstakeToken trnansaction");
    }
    if (!bytesEqual(txn.from, this.account.address)) {
      throw new Error("transaction does not reference account");
    }
    this.account = applyUnstake(this.account, txn.from, txn.txn.nonce, unstake);
    this.confirmGeneratedTxn(txn, blockTime);
  }

  private confirmGeneratedTxn(txn: SignedTransaction, blockTime: number): void {
    const txnHashHex = bytesToHex(hashSignedTransaction(txn));
    const actorTxn = this.generatedTxns.get(txnHashHex);
    if (actorTxn) {
      actorTxn.confirmedAt = blockTime;
      this.confirmedTxns.push(actorTxn);
    }
  }

  public getGeneratedTransactions(): ActorTransaction[] {
    return Array.from(this.generatedTxns.values());
  }

  public getConfirmedTransactions(): ActorTransaction[] {
    return Array.from(this.confirmedTxns);
  }

  public allTransactionConfirmed(): boolean {
    return Array.from(this.generatedTxns.values()).length == this.confirmedTxns.length;
  }
}

function applyMint(account: Account, from: Uint8Array, txNonce: number, mint: MintToken): Account {
  if (!bytesEqual(from, account.address) && !bytesEqual(mint.receiver, account.address)) {
    throw new Error("transaction does not reference account");
  }

  let nonce = account.nonce;
  let balance = account.balance;

  if (bytesEqual(account.address, from)) {
    nonce = txNonce;
  }
  if (bytesEqual(account.address, mint.receiver)) {
    balance += mint.amount;
  }

  return {
    ...account,
    nonce: nonce,
    balance: balance,
  };
}

function applyTransfer(account: Account, from: Uint8Array, txNonce: number, transfer: TransferToken): Account {
  if (!bytesEqual(from, account.address) && !bytesEqual(transfer.receiver, account.address)) {
    throw new Error("transaction does not reference account");
  }

  let nonce = account.nonce;
  let balance = account.balance;

  if (bytesEqual(account.address, from)) {
    nonce = txNonce;
    balance -= transfer.amount;
  }
  if (bytesEqual(account.address, transfer.receiver)) {
    balance += transfer.amount;
  }

  return {
    ...account,
    nonce: nonce,
    balance: balance,
  };
}

function applyStake(account: Account, from: Uint8Array, nonce: number, stake: StakeToken): Account {
  if (!bytesEqual(account.address, from)) {
    throw Error("transaction does not reference account");
  }
  switch (stake.stakeType) {
    case StakeType.DAVerifier:
      return {
        ...account,
        nonce: nonce,
        balance: account.balance - stake.amount,
        daVerifierStake: account.daVerifierStake + stake.amount,
      };
    case StakeType.StateVerifier:
      return {
        ...account,
        nonce: nonce,
        balance: account.balance - stake.amount,
        stateVerifierStake: account.stateVerifierStake + stake.amount,
      };
    default:
      throw new Error("unknown stake type");
  }
}

function applyUnstake(account: Account, from: Uint8Array, nonce: number, unstake: UnstakeToken): Account {
  if (!bytesEqual(account.address, from)) {
    throw Error("transaction does not reference account");
  }
  switch (unstake.stakeType) {
    case StakeType.DAVerifier:
      return {
        ...account,
        nonce: nonce,
        balance: account.balance + unstake.amount,
        daVerifierStake: account.daVerifierStake - unstake.amount,
      };
    case StakeType.StateVerifier:
      return {
        ...account,
        nonce: nonce,
        balance: account.balance + unstake.amount,
        stateVerifierStake: account.stateVerifierStake - unstake.amount,
      };
    default:
      throw new Error("unknown stake type");
  }
}
