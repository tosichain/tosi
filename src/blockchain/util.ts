import process from "process";
import keccak256 from "keccak256";

import { SignedTransaction, Transaction, WorldState, ComputeClaim, Block, TransactionBundle } from "./types";
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
  return Uint8Array.from(Buffer.from(hex, "hex"));
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
    offchainComputation: {
      DACommitteeSampleSize: 3,
      stateCommitteeSampleSize: 3,
    },
  };
  state.accounts[minterAddrHex] = createAccount(minterAddr, 0n, 0n, 0n);

  return state;
}

export function hashSignedTransaction(txn: SignedTransaction): Uint8Array {
  const rawTxn = serializeSignedTransaction(txn);
  return Uint8Array.from(keccak256(Buffer.from(rawTxn)));
}

export function hashTransaction(txn: Transaction): Uint8Array {
  const rawTxn = serializeTransaction(txn);
  return Uint8Array.from(keccak256(Buffer.from(rawTxn)));
}

export function hashBlock(block: Block): Uint8Array {
  const rawBlock = serializeBlock(block);
  return Uint8Array.from(keccak256(Buffer.from(rawBlock)));
}

export function hashComputeClaim(claim: ComputeClaim): Uint8Array {
  const rawClaim = serializeComputeClaim(claim);
  return Uint8Array.from(keccak256(Buffer.from(rawClaim)));
}

export function hashTransactionBundle(txnBundle: TransactionBundle): Uint8Array {
  const rawBundle = serializeTransactionBundle(txnBundle);
  return Uint8Array.from(keccak256(Buffer.from(rawBundle)));
}
