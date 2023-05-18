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
import { signTransaction, verifyTransactionSignature } from "../../../blockchain/block";
import Logger from "../../../log/logger";

import { Engine } from "./engine";
import { randomAbsAmount, randomRatioAmount, randomStakeType } from "./util";
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

    const amount = randomAbsAmount(
      this.engine.config.transactions.mint.minAmount,
      this.engine.config.transactions.mint.maxAmount,
    );
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
      this.engine.config.transactions.transfer.minRatio,
      this.engine.config.transactions.transfer.maxRatio,
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

  public async generateStake(): Promise<SignedTransaction> {
    const expectedAccount = this.getExpectedAccount();
    const amount = randomRatioAmount(
      expectedAccount.balance,
      this.engine.config.transactions.transfer.minRatio,
      this.engine.config.transactions.transfer.maxRatio,
    );
    const txn: Transaction = {
      nonce: expectedAccount.nonce + 1,
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
        result = applyMint(this.account, txn.mint, txn.nonce);
      } else if (txn.transfer) {
        result = applyTransfer(this.account, txn.transfer, txn.nonce);
      } else if (txn.stake) {
        result = applyStake(this.account, txn.stake, txn.nonce);
      } else if (txn.unstake) {
        result = applyUnstake(this.account, txn.unstake, txn.nonce);
      } else {
        throw new Error("unknown transaction type");
      }
    }
    return result;
  }

  public async confirmMint(txn: SignedTransaction, blockTime: number): Promise<void> {
    const actorTxn = await this.checkConfirmedTxn(txn);
    if (!actorTxn.txn.txn.mint) {
      throw new Error("not MintToken trnansaction");
    }
    this.confirmTxn(actorTxn, blockTime);
  }

  public async confirmTransfer(txn: SignedTransaction, blockTime: number): Promise<void> {
    const actorTxn = await this.checkConfirmedTxn(txn);
    if (!actorTxn.txn.txn.transfer) {
      throw new Error("not TransferToken trnansaction");
    }
    this.account = applyTransfer(this.account, actorTxn.txn.txn.transfer, actorTxn.txn.txn.nonce);
    this.confirmTxn(actorTxn, blockTime);
  }

  public async confirmStake(txn: SignedTransaction, blockTime: number): Promise<void> {
    const actorTxn = await this.checkConfirmedTxn(txn);
    if (!actorTxn.txn.txn.stake) {
      throw new Error("not StakeToken trnansaction");
    }
    this.account = applyStake(this.account, actorTxn.txn.txn.stake, actorTxn.txn.txn.nonce);
    this.confirmTxn(actorTxn, blockTime);
  }

  public async confirmUnstake(txn: SignedTransaction, blockTime: number): Promise<void> {
    const actorTxn = await this.checkConfirmedTxn(txn);
    if (!actorTxn.txn.txn.unstake) {
      throw new Error("not UnstakeToken trnansaction");
    }
    this.account = applyStake(this.account, actorTxn.txn.txn.unstake, actorTxn.txn.txn.nonce);
    this.confirmTxn(actorTxn, blockTime);
  }

  private async checkConfirmedTxn(txn: SignedTransaction): Promise<ActorTransaction> {
    if (!verifyTransactionSignature(txn)) {
      throw new Error("can not confirm transaction with invalid signature");
    }
    if (!bytesEqual(txn.from, this.getAccount().address)) {
      throw new Error("can not confirm transaction from other actor");
    }
    const txnHashHex = bytesToHex(hashSignedTransaction(txn));
    const actorTxn = this.generatedTxns.get(txnHashHex);
    if (!actorTxn) {
      throw new Error("can not confirm transaction, which is not in generated transaction list");
    }
    return actorTxn;
  }

  private confirmTxn(actorTxn: ActorTransaction, blockTime: number): void {
    const txnHashHex = bytesToHex(hashSignedTransaction(actorTxn.txn));
    this.generatedTxns.delete(txnHashHex);
    actorTxn.confirmedAt = blockTime;
    this.confirmedTxns.push(actorTxn);
  }
}

function applyMint(account: Account, txn: MintToken, txnNonce: number): Account {
  return {
    ...account,
    nonce: txnNonce,
  };
}

function applyTransfer(account: Account, txn: TransferToken, txnNonce: number): Account {
  return {
    ...account,
    nonce: txnNonce,
    balance: account.balance - txn.amount,
  };
}

function applyStake(account: Account, txn: StakeToken, txnNonce: number): Account {
  switch (txn.stakeType) {
    case StakeType.DAVerifier:
      return {
        ...account,
        nonce: txnNonce,
        balance: account.balance - txn.amount,
        daVerifierStake: account.daVerifierStake + txn.amount,
      };
    case StakeType.StateVerifier:
      return {
        ...account,
        nonce: txnNonce,
        balance: account.balance - txn.amount,
        stateVerifierStake: account.stateVerifierStake + txn.amount,
      };
    default:
      throw new Error("unknown stake type");
  }
}

function applyUnstake(account: Account, txn: UnstakeToken, txnNonce: number): Account {
  switch (txn.stakeType) {
    case StakeType.DAVerifier:
      return {
        ...account,
        nonce: txnNonce,
        balance: account.balance - txn.amount,
        daVerifierStake: account.daVerifierStake + txn.amount,
      };
    case StakeType.StateVerifier:
      return {
        ...account,
        nonce: txnNonce,
        balance: account.balance - txn.amount,
        stateVerifierStake: account.stateVerifierStake + txn.amount,
      };
    default:
      throw new Error("unknown stake type");
  }
}
