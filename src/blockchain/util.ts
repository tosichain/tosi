import process from "process";
import keccak256 from "keccak256";
import JSONbigint from "json-bigint";

import { WorldState, SignedTransaction, Transaction, ComputeClaim, Staker, Block, TransactionBundle, Account } from "./types";
import { createAccount } from "./transaction";
import {
  serializeBlock,
  serializeComputeClaim,
  serializeSignedTransaction,
  serializeTransaction,
  serializeTransactionBundle,
} from "./serde";

export function createInitialStateFromEnv(): WorldState {
  const minterPubKey = process.env.TOSI_MINTER_PUBKEY as string;
  const stakePoolPubKey = process.env.TOSI_STAKE_POOL_PUBKEY as string;

  const state: WorldState = {
    accounts: {},
    stakePool: stakePoolPubKey,
    stakers: [],
    minter: minterPubKey,
    computeChains: {},
  };
  state.accounts[minterPubKey] = createAccount(0n, 0n);
  state.accounts[stakePoolPubKey] = createAccount(0n, 0n);

  return state;
}

export function hashSignedTransaction(txn: SignedTransaction): string {
  const rawTxn = serializeSignedTransaction(txn);
  const txnHash = keccak256(Buffer.from(rawTxn));
  return Buffer.from(keccak256(txnHash)).toString("hex");
}

export function hashTransaction(txn: Transaction): string {
  const rawTxn = serializeTransaction(txn);
  const txnHash = keccak256(Buffer.from(rawTxn));
  return Buffer.from(keccak256(txnHash)).toString("hex");
}

export function hashBlock(block: Block): string {
  const rawBlock = serializeBlock(block);
  const blockHash = keccak256(Buffer.from(rawBlock));
  return Buffer.from(blockHash).toString("hex");
}

export function hashComputeClaim(claim: ComputeClaim): string {
  const rawClaim = serializeComputeClaim(claim);
  const claimHash = keccak256(Buffer.from(rawClaim));
  return Buffer.from(claimHash).toString("hex");
}

export function hashTransactionBundle(txnBundle: TransactionBundle): string {
  const s = serializeTransactionBundle(txnBundle);
  const hash = keccak256(Buffer.from(s));
  return Buffer.from(hash).toString("hex");
}

export function stringifyTransaction(txn: Transaction): string {
  return JSONbigint.stringify(txn);
}

export function stringifySignedTransaction(txn: SignedTransaction): string {
  return JSONbigint.stringify(txn);
}

export function stringifyAccount(account: Account): string {
  return JSONbigint.stringify(account);
}

export function stringifyStaker(staker: Staker): string {
  return JSONbigint.stringify(staker);
}

export function stringifyComputeClaim(claim: ComputeClaim): string {
  return JSONbigint.stringify(claim);
}
