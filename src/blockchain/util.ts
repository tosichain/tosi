import process from "process";
import keccak256 from "keccak256";
import JSONbigint from "json-bigint";

import {
  SignedTransaction,
  Transaction,
  WorldState,
  Account,
  StakePool,
  DataChain,
  ComputeClaim,
  Block,
  TransactionBundle,
} from "./types";
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

  const state: WorldState = {
    accounts: {},
    stakePool: {
      daVerifierPool: 0n,
      daVerifiers: [],
      stateVerifierPool: 0n,
      stateVerifiers: [],
    },
    minter: minterPubKey,
    dataChains: {},
  };
  state.accounts[minterPubKey] = createAccount(minterPubKey, 0n, 0n, 0n);

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

export function parseAccount(accountStr: string): Account {
  const account = JSONbigint.parse(accountStr) as Account;
  return {
    ...account,
    balance: BigInt(account.balance),
    daVerifierStake: BigInt(account.daVerifierStake),
    stateVerifierStake: BigInt(account.stateVerifierStake),
  };
}

export function stringifyAccounts(accounts: Account[]): string {
  return JSONbigint.stringify(accounts);
}

export function stringifyStakePool(pool: StakePool): string {
  return JSONbigint.stringify(pool);
}

export function stringifyDataChain(chain: DataChain): string {
  return JSONbigint.stringify(chain);
}

export function stringifyComputeClaim(claim: ComputeClaim): string {
  return JSONbigint.stringify(claim);
}
