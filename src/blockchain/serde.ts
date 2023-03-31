import keccak256 from "keccak256";
import MerkleTree from "merkletreejs";

import { BLOCK_HASH_SIZE, BLOCK_VERSION_SIZE } from "./constant";
import { encodeCBOR, decodeCBOR } from "../util";

import {
  SignedTransaction,
  Transaction,
  MintToken,
  TransferToken,
  StakeToken,
  UnstakeToken,
  Account,
  ComputeClaim,
  ComputeChain,
  AddComputeChain,
  AddComputeClaim,
  WorldState,
  Block,
  BlockMetadata,
  DAInfo,
  BlockProof,
  DACheckResult,
  ClaimDACheckResult,
  TransactionBundle,
  StakePool,
} from "./types";
import { hashComputeClaim } from "./util";

/*
1. Sender account key/address.
2. Signature.
3. SerializedTransaction.
*/
export type SerializedSignedTransaction = [string, string, Uint8Array];

export function serializeSignedTransaction(txn: SignedTransaction): Uint8Array {
  const s: SerializedSignedTransaction = [txn.from, txn.signature, serializeTransaction(txn.txn)];
  return encodeCBOR(s);
}

export function deserializeSignedTransaction(rawTxn: Uint8Array): SignedTransaction {
  const s: SerializedSignedTransaction = decodeCBOR(rawTxn);
  const txn: SignedTransaction = {
    from: s[0],
    signature: s[1],
    txn: deserializeTransaction(s[2]),
  };
  return txn;
}

/*
1. SerializedMintToken.
2. SerializeransferToken.
3. SerializedStakeToken.
4. SerializedUnstakeToken.
5. SerializedAddComputeChain.
6. AddSerializedComputeClaim.
5. Nonce.
*/
export type SerializedTransaction = [Uint8Array, Uint8Array, Uint8Array, Uint8Array, Uint8Array, Uint8Array, number];

export function serializeTransaction(txn: Transaction): Uint8Array {
  const s: SerializedTransaction = [
    new Uint8Array(),
    new Uint8Array(),
    new Uint8Array(),
    new Uint8Array(),
    new Uint8Array(),
    new Uint8Array(),
    txn.nonce,
  ];
  if (txn.mint) {
    s[0] = serializeMintToken(txn.mint);
  } else if (txn.transfer) {
    s[1] = serializeTransferToken(txn.transfer);
  } else if (txn.stake) {
    s[2] = serializeStakeToken(txn.stake);
  } else if (txn.unstake) {
    s[3] = serializeUnstakeToken(txn.unstake);
  } else if (txn.addChain) {
    s[4] = serializeAddComputeChain(txn.addChain);
  } else if (txn.addClaim) {
    s[5] = serializeAddComputeClaim(txn.addClaim);
  } else {
    throw new Error("unknown transaction type");
  }
  return encodeCBOR(s);
}

export function deserializeTransaction(rawTxn: Uint8Array): Transaction {
  const s = decodeCBOR(rawTxn) as SerializedTransaction;
  const txn: Transaction = {
    mint: undefined,
    transfer: undefined,
    stake: undefined,
    unstake: undefined,
    addChain: undefined,
    addClaim: undefined,
    nonce: s[6],
  };
  if (s[0].length > 0) {
    txn.mint = deserializeMintToken(s[0]);
  } else if (s[1].length > 0) {
    txn.transfer = deserializeTransferToken(s[1]);
  } else if (s[2].length > 0) {
    txn.stake = deserializeStakeToken(s[2]);
  } else if (s[3].length > 0) {
    txn.unstake = deserializeUnstakeToken(s[3]);
  } else if (s[4].length > 0) {
    txn.addChain = deserializeAddComputeChain(s[4]);
  } else if (s[5].length > 0) {
    txn.addClaim = deserializeAddComputeClaim(s[5]);
  } else {
    throw new Error("unknown transaction type");
  }
  return txn;
}

/*
1. Receiver account key/address.
2. Token amount.
*/
export type SerializedMintToken = [string, bigint];

export function serializeMintToken(txn: MintToken): Uint8Array {
  const s: SerializedMintToken = [txn.receiver, txn.amount];
  return encodeCBOR(s);
}

export function deserializeMintToken(rawTx: Uint8Array): MintToken {
  const s = decodeCBOR(rawTx) as SerializedMintToken;
  const txn: MintToken = {
    receiver: s[0],
    amount: s[1],
  };
  return txn;
}

/*
1. Receiver account key/address.
2. Token amount.
*/
export type SerializedTransferToken = [string, bigint];

export function serializeTransferToken(txn: TransferToken): Uint8Array {
  const s: SerializedTransferToken = [txn.receiver, txn.amount];
  return encodeCBOR(s);
}

export function deserializeTransferToken(rawTxn: Uint8Array): TransferToken {
  const s = decodeCBOR(rawTxn) as SerializedTransferToken;
  const txn: TransferToken = {
    receiver: s[0],
    amount: s[1],
  };
  return txn;
}

/*
1. Stake type.
2. Token amount.
*/
export type SerializedStakeToken = [number, bigint];

export function serializeStakeToken(txn: StakeToken): Uint8Array {
  const s: SerializedStakeToken = [txn.stakeType, txn.amount];
  return encodeCBOR(s);
}

export function deserializeStakeToken(rawTxn: Uint8Array): StakeToken {
  const s = decodeCBOR(rawTxn) as SerializedStakeToken;
  const txn: StakeToken = {
    stakeType: s[0],
    amount: s[1],
  };
  return txn;
}

/*
1. Stake type.
2. Token amount.
*/
export type SerializedUnstakeToken = [number, bigint];

export function serializeUnstakeToken(txn: UnstakeToken): Uint8Array {
  const s: SerializedUnstakeToken = [txn.stakeType, txn.amount];
  return encodeCBOR(s);
}

export function deserializeUnstakeToken(rawTxn: Uint8Array): UnstakeToken {
  const s = decodeCBOR(rawTxn) as SerializedUnstakeToken;
  const txn: UnstakeToken = {
    stakeType: s[0],
    amount: s[1],
  };
  return txn;
}

/*
1. Chain root claim.
*/
export type SerializedAddComputeChain = [Uint8Array];

export function serializeAddComputeChain(txn: AddComputeChain): Uint8Array {
  const rootClaim = serializeComputeClaim(txn.rootClaim);
  const s: SerializedAddComputeChain = [rootClaim];
  return encodeCBOR(s);
}

export function deserializeAddComputeChain(rawTxn: Uint8Array): AddComputeChain {
  const s: SerializedAddComputeChain = decodeCBOR(rawTxn);
  const txn: AddComputeChain = {
    rootClaim: deserializeComputeClaim(s[0]),
  };
  return txn;
}

/*
1. Root claim of existing chain.
2. Compute claim.
*/
export type SerializedAddComputeClaim = [string, Uint8Array];

export function serializeAddComputeClaim(txn: AddComputeClaim): Uint8Array {
  const claim: Uint8Array = serializeComputeClaim(txn.claim);
  const s: SerializedAddComputeClaim = [txn.rootClaimHash, claim];
  return encodeCBOR(s);
}

export function deserializeAddComputeClaim(rawTxn: Uint8Array): AddComputeClaim {
  const s: SerializedAddComputeClaim = decodeCBOR(rawTxn);
  const txn: AddComputeClaim = {
    rootClaimHash: s[0],
    claim: deserializeComputeClaim(s[1]),
  };
  return txn;
}

/*
1. Key/address
2. Nonce.
3. Token balance.
4. DA verifier stake.
5. State verifier stake.
*/
export type SerializedAccount = [string, number, bigint, bigint, bigint];

export function serializeAccount(acc: Account): Uint8Array {
  const s: SerializedAccount = [acc.address, acc.nonce, acc.balance, acc.daVerifierStake, acc.stateVerifierStake];
  return encodeCBOR(s);
}

export function deserializeAccount(rawAcc: Uint8Array): Account {
  const s = decodeCBOR(rawAcc) as SerializedAccount;
  const acc: Account = {
    address: s[0],
    nonce: s[1],
    balance: s[2],
    daVerifierStake: s[3],
    stateVerifierStake: s[4],
  };
  return acc;
}

/*
1. name
2. size
3. log2
4. keccak256
5. cartesiMerkleRoot
*/
export type SerializedDAInfo = [string, number, number, string, string];

export function serializeDAInfo(info: DAInfo): Uint8Array {
  const s: SerializedDAInfo = [info.name, info.size, info.log2, info.keccak256, info.cartesiMerkleRoot];
  return encodeCBOR(s);
}

export function deserializeDAInfo(rawInfo: Uint8Array): DAInfo {
  const s = decodeCBOR(rawInfo) as SerializedDAInfo;
  const info: DAInfo = {
    name: s[0],
    size: s[1],
    log2: s[2],
    keccak256: s[3],
    cartesiMerkleRoot: s[4],
  };
  return info;
}

/*
1. Claim creator.
2. Hash of previous claim in chain.
3. CID of court environment.
4. CID of applciation.
5. CID of computation input.
6. CID of computation outptut.
7. Data availability info (???)
8. Program return code.
9. Max number of cycles for Cartesi VM.
*/
export type SerializedComputeClaim = [string, string, string, string, string, string, Uint8Array[], number, bigint];

export function serializeComputeClaim(claim: ComputeClaim): Uint8Array {
  const daInfo = claim.daInfo.map(serializeDAInfo);
  const s: SerializedComputeClaim = [
    claim.claimer,
    claim.prevClaimHash,
    claim.courtCID,
    claim.appCID,
    claim.inputCID,
    claim.outputCID,
    daInfo,
    claim.returnCode,
    claim.maxCartesiCycles,
  ];
  return encodeCBOR(s);
}

export function deserializeComputeClaim(rawClaim: Uint8Array): ComputeClaim {
  const s: SerializedComputeClaim = decodeCBOR(rawClaim);
  const daInfo = s[6].map(deserializeDAInfo);
  const claim: ComputeClaim = {
    claimer: s[0],
    prevClaimHash: s[1],
    courtCID: s[2],
    appCID: s[3],
    inputCID: s[4],
    outputCID: s[5],
    daInfo: daInfo,
    returnCode: s[7],
    maxCartesiCycles: s[8],
  };
  return claim;
}

/*
1. List of chained compute claims.
2. Hash of root claim;
3. Hash or head claim;
*/
export type SerializedComputeChain = [Uint8Array[], string, string];

export function serializeComputeChain(chain: ComputeChain): Uint8Array {
  const claims = Object.keys(chain.claims).map((key) => {
    return serializeComputeClaim(chain.claims[key]);
  });
  const s: SerializedComputeChain = [claims, chain.rootClaimHash, chain.headClaimHash];
  return encodeCBOR(s);
}

export function deserializeComputeChain(rawChain: Uint8Array): ComputeChain {
  const s: SerializedComputeChain = decodeCBOR(rawChain);
  const chain: ComputeChain = {
    claims: {},
    rootClaimHash: s[1],
    headClaimHash: s[2],
  };
  s[0].forEach((rawClaim) => {
    const claim = deserializeComputeClaim(rawClaim);
    const claimHash = hashComputeClaim(claim);
    chain.claims[claimHash] = claim;
  });
  return chain;
}

/*
1. Stake pool for DA verifiers.
2. List of stakers, running DA verifiers.
3. Stake pool for state verifiers.
4. List of stakers, running state verifiers.
*/
export type SerializedStakePool = [bigint, string[], bigint, string[]];

export function serializeStakePool(pool: StakePool): Uint8Array {
  const s: SerializedStakePool = [
    pool.daVerifierPool,
    pool.daVerifiers,
    pool.stateVerifierPool,
    pool.daVerifiers,
  ];
  return encodeCBOR(s);
}

export function deserializeStakePool(rawPool: Uint8Array): StakePool {
  const s: SerializedStakePool = decodeCBOR(rawPool);
  const pool: StakePool = {
    daVerifierPool: s[0],
    daVerifiers: s[1],
    stateVerifierPool: s[2],
    stateVerifiers: s[3],
  };
  return pool;
}

/*
1. List of accounts.
2. Stake pool.
3. Token minter.
4. List of compute chains
*/
export type SerializedWorldState = [Uint8Array[], Uint8Array, string, Uint8Array[]];

export function serializeWorldState(state: WorldState): Uint8Array {
  const accs = Object.values(state.accounts).map((account) => {
    return serializeAccount(account);
  });
  const stakePool = serializeStakePool(state.stakePool);
  const chains = Object.keys(state.computeChains).map((key) => {
    return serializeComputeChain(state.computeChains[key]);
  });
  const s: SerializedWorldState = [accs, stakePool, state.minter, chains];
  return encodeCBOR(s);
}

export function deserializeWorldState(rawState: Uint8Array): WorldState {
  const s = decodeCBOR(rawState) as SerializedWorldState;
  const state: WorldState = {
    accounts: {},
    stakePool: deserializeStakePool(s[1]),
    minter: s[2],
    computeChains: {},
  };
  s[0].forEach((rawAcc) => {
    const acc = deserializeAccount(rawAcc);
    state.accounts[acc.address] = acc;
  });
  s[3].forEach((rawChain) => {
    const chain = deserializeComputeChain(rawChain);
    state.computeChains[chain.rootClaimHash] = chain;
  });
  return state;
}

/*
1. Leaves of accounts merkle tree.
2. List of serialized transactions.
3. Serialized block proof.
4. Block generation time.
*/
export type SerializedBlock = [Uint8Array[], Uint8Array[], Uint8Array, number];

export function serializeBlock(block: Block): Uint8Array {
  const merkleLeaves = block.accountsMerkle.getLeaves().map((b: Iterable<number>) => new Uint8Array(b));
  const txns = block.transactions.map(serializeSignedTransaction);
  const proof = serializeBlockProof(block.proof);
  const serializedBlock: SerializedBlock = [merkleLeaves, txns, proof, block.time];
  const cborBlock = encodeCBOR(serializedBlock);

  const prevBlockHash = Buffer.from(block.prevBlockHash, "hex");
  const serializedVersionAndPrevBlockHash = Buffer.alloc(BLOCK_VERSION_SIZE + BLOCK_HASH_SIZE);

  // XXX hacky protobuf
  serializedVersionAndPrevBlockHash.writeUint32BE(0x08011220);
  prevBlockHash.copy(serializedVersionAndPrevBlockHash, BLOCK_VERSION_SIZE);
  const blockWithVersion = Buffer.concat([serializedVersionAndPrevBlockHash, cborBlock]);

  return blockWithVersion;
}

export function deserializeBlock(rawBlock: Uint8Array): Block {
  const [blockVersion, prevBlockHash, cborBlock] = splitVersionFromBlockContent(rawBlock);
  const s = decodeCBOR(cborBlock) as SerializedBlock;
  const block: Block = {
    // XXX hacky protobuf
    version: blockVersion == 0x08011220 ? 1 : 0,
    prevBlockHash: prevBlockHash,
    accountsMerkle: new MerkleTree(s[0], keccak256, { sort: true }),
    transactions: s[1].map(deserializeSignedTransaction),
    proof: deserializeBlockProof(s[2]),
    time: s[3],
  };
  return block;
}

export function splitVersionFromBlockContent(rawBlock: Uint8Array): [number, string, Uint8Array] {
  const serializedVersion = Buffer.from(rawBlock.slice(0, BLOCK_VERSION_SIZE));
  const prevBlockHash = Buffer.from(rawBlock.slice(BLOCK_VERSION_SIZE, BLOCK_VERSION_SIZE + BLOCK_HASH_SIZE)).toString(
    "hex",
  );
  const cborBlock = rawBlock.slice(BLOCK_VERSION_SIZE + BLOCK_HASH_SIZE);
  return [serializedVersion.readInt32BE(), prevBlockHash, cborBlock];
}

/*
1. Hash of transaction bundle.
2. Public key of transaction bundle proposer.
3. Randomness proof.
4. Responses from all members of DA committee sample.
5. Aggregated signature of responses.
*/
export type SerializedBlockProof = [string, string, Uint8Array, Uint8Array[], Uint8Array];

export function serializeBlockProof(proof: BlockProof): Uint8Array {
  const daResults = proof.DACheckResults.map(serializeDACheckResult);
  const s: SerializedBlockProof = [
    proof.txnBundleHash,
    proof.txnBundleProposer,
    proof.randomnessProof,
    daResults,
    proof.aggDACheckResultSignature,
  ];
  return encodeCBOR(s);
}

export function deserializeBlockProof(rawProof: Uint8Array): BlockProof {
  const s = decodeCBOR(rawProof) as SerializedBlockProof;
  const daResults = s[3].map(deseiralizeDACheckResult);
  const proof: BlockProof = {
    txnBundleHash: s[0],
    txnBundleProposer: s[1],
    randomnessProof: s[2],
    DACheckResults: daResults,
    aggDACheckResultSignature: s[4],
  };
  return proof;
}

/*
1. Hash of transaction bundle.
2. Block randomness proof.
2. Signature.
3. DA checker public key.
5. List of serialized results of DA check for each claim.
*/
export type SerializedDACheckResult = [string, Uint8Array, Uint8Array, string, Uint8Array[]];

export function serializeDACheckResult(result: DACheckResult): Uint8Array {
  const claimResulsts = result.claims.map(serializeClaimDACheckResult);
  const s: SerializedDACheckResult = [
    result.txnBundleHash,
    result.randomnessProof,
    result.signature,
    result.signer,
    claimResulsts,
  ];
  return encodeCBOR(s);
}

export function deseiralizeDACheckResult(rawResult: Uint8Array): DACheckResult {
  const s = decodeCBOR(rawResult) as SerializedDACheckResult;
  const claimResults = s[4].map(deserializeClaimDAChekcResult);
  const result: DACheckResult = {
    txnBundleHash: s[0],
    randomnessProof: s[1],
    signature: s[2],
    signer: s[3],
    claims: claimResults,
  };
  return result;
}

/*
1. Hash of compute claim.
2. Status of data availability for compute claim;
*/
export type SerializedClaimDACheckResult = [string, boolean];

export function serializeClaimDACheckResult(result: ClaimDACheckResult): Uint8Array {
  const s: SerializedClaimDACheckResult = [result.claimHash, result.dataAvailable];
  return encodeCBOR(s);
}

export function deserializeClaimDAChekcResult(rawResult: Uint8Array): ClaimDACheckResult {
  const s = decodeCBOR(rawResult) as SerializedClaimDACheckResult;
  const result: ClaimDACheckResult = {
    claimHash: s[0],
    dataAvailable: s[1],
  };
  return result;
}

/*
1. Hash of head block.
2. List of serialized transactions.
*/
export type SerializedTransactionBundle = [string, Uint8Array[]];

export function serializeTransactionBundle(txnBundle: TransactionBundle): Uint8Array {
  const txns = txnBundle.transactions.map(serializeSignedTransaction);
  const s: SerializedTransactionBundle = [txnBundle.headBlockHash, txns];
  return encodeCBOR(s);
}

/*
1. IPFS CID.
*/
export type SerializeBlockMetadata = [string];

export function serializeBlockMetadata(meta: BlockMetadata): Uint8Array {
  const s: SerializeBlockMetadata = [meta.CID];
  return encodeCBOR(s);
}

export function deserializeBlockMetadata(rawMeta: Uint8Array): BlockMetadata {
  const s = decodeCBOR(rawMeta) as SerializeBlockMetadata;
  const meta: BlockMetadata = {
    CID: s[0],
  };
  return meta;
}
