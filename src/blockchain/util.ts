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

export function bytesEqual(bytes1: Uint8Array, bytes2: Uint8Array): boolean {
  return Buffer.from(bytes1).compare(bytes2) == 0;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("hex");
}

export function bytesFromHex(hex: string): Uint8Array {
  return Buffer.from(hex, "hex");
}

export function createInitialStateFromEnv(): WorldState {
  const minterAddrHex = process.env.TOSI_MINTER_PUBKEY as string;
  const minterAddr = bytesFromHex(minterAddrHex);

  const state: WorldState = {
    accounts: {},
    stakePool: {
      daVerifierPool: 0n,
      daVerifiers: [],
      stateVerifierPool: 0n,
      stateVerifiers: [],
    },
    minter: minterAddr,
    dataChains: {},
  };
  state.accounts[minterAddrHex] = createAccount(minterAddr, 0n, 0n, 0n);

  return state;
}

export function hashSignedTransaction(txn: SignedTransaction): Uint8Array {
  const rawTxn = serializeSignedTransaction(txn);
  return keccak256(Buffer.from(rawTxn));
}

export function hashTransaction(txn: Transaction): Uint8Array {
  const rawTxn = serializeTransaction(txn);
  return keccak256(Buffer.from(rawTxn));
}

export function hashBlock(block: Block): Uint8Array {
  const rawBlock = serializeBlock(block);
  return keccak256(Buffer.from(rawBlock));
}

export function hashComputeClaim(claim: ComputeClaim): Uint8Array {
  const rawClaim = serializeComputeClaim(claim);
  return keccak256(Buffer.from(rawClaim));
}

export function hashTransactionBundle(txnBundle: TransactionBundle): Uint8Array {
  const rawBundle = serializeTransactionBundle(txnBundle);
  return keccak256(Buffer.from(rawBundle));
}

export function stringifyTransaction(txn: Transaction): string {
  return stringifyHelper(txn);
}

export function stringifySignedTransaction(txn: SignedTransaction): string {
  return stringifyHelper(txn);
}

export function stringifyAccount(account: Account): string {
  return stringifyHelper(account);
}

export function stringifyStakePool(pool: StakePool): string {
  return stringifyHelper(pool);
}

export function stringifyDataChain(chain: DataChain): string {
  return stringifyHelper(chain);
}

export function stringifyComputeClaim(claim: ComputeClaim): string {
  return stringifyHelper(claim);
}

function stringifyHelper(object: any): string {
  return JSONbigint.stringify(object, (key: string, value: any): any => {
    return value instanceof Uint8Array ? bytesToHex(value) : value;
  });
}
