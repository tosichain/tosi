import keccak256 from "keccak256";
import MerkleTree from "merkletreejs";
import { bls12_381 as BLS } from "@noble/curves/bls12-381";

import { SignedTransaction, Transaction, WorldState, Block, BlockProof } from "./types";
import { applyTransaction } from "./transaction";
import { serializeAccount } from "./serde";
import { bytesToHex, bytesFromHex, hashBlock, hashTransaction } from "./util";

export async function mintNextBlock(
  state: WorldState,
  headBlock: Block,
  blockVersion: number,
  blockTxns: readonly SignedTransaction[],
  blockProof: BlockProof,
  blockTime: number,
): Promise<[Block, SignedTransaction[], [SignedTransaction, any][]]> {
  const acceptedTxns: SignedTransaction[] = [];
  const rejectedTxns: [SignedTransaction, any][] = [];

  // Transactions must be in some determinstic order (equal nonces must be tie breaked...)
  const sortedTxns = blockTxns.slice(0, blockTxns.length);
  sortedTxns.sort((txn1, txn2) => txn1.txn.nonce - txn2.txn.nonce);

  // TODO: state must be deep copied, probably.
  for (const txn of sortedTxns) {
    if (!(await verifyTransactionSignature(txn))) {
      rejectedTxns.push([txn, new Error("invalid transaction signature")]);
      continue;
    }
    try {
      // TODO: where txID should be used except of logging?
      // const txid = crypto.createHash("sha256").update(rawTx).digest("hex");
      applyTransaction(state, txn.from, txn.txn);
      acceptedTxns.push(txn);
    } catch (err) {
      rejectedTxns.push([txn, err]);
    }
  }

  const nextBlock: Block = {
    version: blockVersion,
    prevBlockHash: hashBlock(headBlock),
    accountsMerkle: accountsMerkleTree(state),
    transactions: acceptedTxns,
    proof: blockProof,
    time: blockTime,
  };

  return [nextBlock, acceptedTxns, rejectedTxns];
}

export function accountsMerkleTree(state: WorldState): MerkleTree {
  const accountsData = Object.keys(state.accounts).map((accountKey) => {
    return accountToMerkleLeaf(state, bytesFromHex(accountKey));
  });
  return new MerkleTree(accountsData, keccak256, { sort: true });
}

export function accountToMerkleLeaf(state: WorldState, accountAddr: Uint8Array): Uint8Array {
  const accountAddrHex = bytesToHex(accountAddr);
  const account = state.accounts[accountAddrHex];
  if (!account) {
    throw new Error("account does not exist");
  }
  const serialized = serializeAccount(state.accounts[accountAddrHex]);
  return keccak256(Buffer.from(serialized));
}

export function accountsMerkeProof(state: WorldState, accountAddr: Uint8Array): [Uint8Array, Uint8Array, Uint8Array[]] {
  const leaf = accountToMerkleLeaf(state, accountAddr);
  const tree = accountsMerkleTree(state);
  return [tree.getRoot(), leaf, tree.getProof(Buffer.from(leaf))];
}

export async function signTransaction(txn: Transaction, privKey: Uint8Array): Promise<SignedTransaction> {
  const txnHash = hashTransaction(txn);
  const txnSig = await BLS.sign(txnHash, privKey);
  const pubKey = BLS.getPublicKey(privKey);

  const signedTxn: SignedTransaction = {
    from: pubKey,
    signature: txnSig,
    txn: txn,
  };

  return signedTxn;
}

export async function verifyTransactionSignature(txn: SignedTransaction): Promise<boolean> {
  const txnHash = hashTransaction(txn.txn);
  return await BLS.verify(txn.signature, txnHash, txn.from);
}
