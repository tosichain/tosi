import {
  SignedTransaction,
  Transaction,
  TransferToken,
  StakeType,
  StakeToken,
  UnstakeToken,
  Account,
} from "../../../blockchain/types";
import { signTransaction, verifyTransactionSignature } from "../../../blockchain/block";
import Logger from "../../../log/logger";

import { Engine } from "./engine";
import { randomAbsAmount, randomRatioAmount, randomStakeType } from "./util";
import { bytesEqual, bytesToHex, hashSignedTransaction } from "../../../blockchain/util";

export class Actor {
  private readonly privKey: Uint8Array;
  private account: Account;

  private readonly engine: Engine;
  private readonly log: Logger;

  private readonly generatedTxns: Map<string, SignedTransaction>;
  private readonly confirmedTxns: SignedTransaction[];

  constructor(privKey: Uint8Array, account: Account, engine: Engine, log: Logger) {
    this.privKey = privKey;
    this.account = account;

    this.engine = engine;
    this.log = log;

    this.generatedTxns = new Map<string, SignedTransaction>();
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
    const amount = randomAbsAmount(
      this.engine.config.transactions.mint.minAmount,
      this.engine.config.transactions.mint.maxAmount,
    );
    const txn: Transaction = {
      nonce: this.getNextNonce(),
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
      this.engine.config.transactions.transfer.minRatio,
      this.engine.config.transactions.transfer.maxRatio,
    );
    const txn: Transaction = {
      nonce: this.getNextNonce(),
      mint: {
        receiver: receiver,
        amount: amount,
      },
    };
    return await this.generateSignedTxn(txn);
  }

  public async generateStake(): Promise<SignedTransaction> {
    const expectedAccount = this.getExpectedAccount();
    const amount = randomRatioAmount(
      expectedAccount.balance,
      this.engine.config.transactions.transfer.minRatio,
      this.engine.config.transactions.transfer.maxRatio,
    );
    const txn: Transaction = {
      nonce: this.getNextNonce(),
      stake: {
        stakeType: randomStakeType(),
        amount: amount,
      },
    };
    return await this.generateSignedTxn(txn);
  }

  public async generateUnstake(): Promise<SignedTransaction> {
    const expectedAccount = this.getExpectedAccount();

    let stake: bigint;
    const stakeType = randomStakeType();
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
      this.engine.config.transactions.transfer.minRatio,
      this.engine.config.transactions.transfer.maxRatio,
    );

    const txn: Transaction = {
      nonce: this.getNextNonce(),
      unstake: {
        stakeType: stakeType,
        amount: amount,
      },
    };
    return await this.generateSignedTxn(txn);
  }

  private getNextNonce(): number {
    return this.getAccount().nonce + 1;
  }

  private async generateSignedTxn(txn: Transaction): Promise<SignedTransaction> {
    const signedTxn = await signTransaction(txn, this.privKey);
    const txnHashHex = bytesToHex(hashSignedTransaction(signedTxn));
    this.generatedTxns.set(txnHashHex, signedTxn);
    return signedTxn;
  }

  private getExpectedAccount(): Account {
    let result: Account = this.account;
    for (const txn of this.generatedTxns.values()) {
      if (txn.txn.mint) {
      } else if (txn.txn.transfer) {
        result = applyTransfer(this.account, txn.txn.transfer);
      } else if (txn.txn.stake) {
        result = applyStake(this.account, txn.txn.stake);
      } else if (txn.txn.unstake) {
        result = applyUnstake(this.account, txn.txn.unstake);
      } else {
        throw new Error("unknown transaction type");
      }
    }
    return result;
  }

  public async confirmMint(txn: SignedTransaction): Promise<void> {
    await this.checkConfirmedTxn(txn);
    if (!txn.txn.mint) {
      throw new Error("not MintToken trnansaction");
    }
    this.confirmTxn(txn);
  }

  public async confirmTransfer(txn: SignedTransaction): Promise<void> {
    await this.checkConfirmedTxn(txn);
    if (!txn.txn.transfer) {
      throw new Error("not TransferToken trnansaction");
    }
    this.account = applyTransfer(this.account, txn.txn.transfer);
    this.confirmTxn(txn);
  }

  public async confirmStake(txn: SignedTransaction): Promise<void> {
    await this.checkConfirmedTxn(txn);
    if (!txn.txn.stake) {
      throw new Error("not StakeToken trnansaction");
    }
    this.account = applyStake(this.account, txn.txn.stake);
    this.confirmTxn(txn);
  }

  public async confirmUnstake(txn: SignedTransaction): Promise<void> {
    await this.checkConfirmedTxn(txn);
    if (!txn.txn.unstake) {
      throw new Error("not UnstakeToken trnansaction");
    }
    this.account = applyStake(this.account, txn.txn.unstake);
    this.confirmTxn(txn);
  }

  private async checkConfirmedTxn(txn: SignedTransaction): Promise<void> {
    if (!verifyTransactionSignature(txn)) {
      throw new Error("can not confirm transaction with invalid signature");
    }
    if (!bytesEqual(txn.from, this.getAccount().address)) {
      throw new Error("can not confirm transaction from other actor");
    }
    const txnHashHex = bytesToHex(hashSignedTransaction(txn));
    if (!this.generatedTxns.get(txnHashHex)) {
      throw new Error("can not confirm transaction, which is not in generated transaction list");
    }
  }

  private confirmTxn(txn: SignedTransaction): void {
    const txnHashHex = bytesToHex(hashSignedTransaction(txn));
    this.generatedTxns.delete(txnHashHex);
    this.confirmedTxns.push(txn);
  }
}

function applyTransfer(account: Account, txn: TransferToken): Account {
  return {
    ...account,
    balance: account.balance - txn.amount,
  };
}

function applyStake(account: Account, txn: StakeToken): Account {
  switch (txn.stakeType) {
    case StakeType.DAVerifier:
      return {
        ...account,
        balance: account.balance - txn.amount,
        daVerifierStake: account.daVerifierStake + txn.amount,
      };
    case StakeType.StateVerifier:
      return {
        ...account,
        balance: account.balance - txn.amount,
        stateVerifierStake: account.stateVerifierStake + txn.amount,
      };
    default:
      throw new Error("unknown stake type");
  }
}

function applyUnstake(account: Account, txn: UnstakeToken): Account {
  switch (txn.stakeType) {
    case StakeType.DAVerifier:
      return {
        ...account,
        balance: account.balance - txn.amount,
        daVerifierStake: account.daVerifierStake + txn.amount,
      };
    case StakeType.StateVerifier:
      return {
        ...account,
        balance: account.balance - txn.amount,
        stateVerifierStake: account.stateVerifierStake + txn.amount,
      };
    default:
      throw new Error("unknown stake type");
  }
}
