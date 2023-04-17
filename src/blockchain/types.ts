import MerkleTree from "merkletreejs";

export interface SignedTransaction {
  from: Uint8Array;
  signature: Uint8Array;
  txn: Transaction;
}

export interface Transaction {
  mint?: MintToken;
  transfer?: TransferToken;
  stake?: StakeToken;
  unstake?: UnstakeToken;
  createChain?: CreateDataChain;
  updateChain?: UpdateDataChain;
  nonce: number;
}

export interface MintToken {
  readonly receiver: Uint8Array;
  readonly amount: bigint;
}

export interface TransferToken {
  readonly receiver: Uint8Array;
  readonly amount: bigint;
}

export enum StakeType {
  DAVerifier = 0,
  StateVerifier,
}

export interface StakeToken {
  readonly stakeType: StakeType;
  readonly amount: bigint;
}

export interface UnstakeToken {
  readonly stakeType: StakeType;
  readonly amount: bigint;
}

export interface CreateDataChain {
  readonly rootClaim: ComputeClaim;
}

export interface UpdateDataChain {
  readonly rootClaimHash: Uint8Array;
  readonly claim: ComputeClaim;
}

export interface WorldState {
  readonly accounts: Record<string, Account>; // acounts by hex encoded address
  readonly stakePool: StakePool;
  readonly minter: Uint8Array; // account address
  readonly dataChains: Record<string, DataChain>; // data chains by hex encoded hash of root claim
}

export interface Account {
  readonly address: Uint8Array; // BLS public key
  readonly nonce: number;
  readonly balance: bigint;
  readonly daVerifierStake: bigint;
  readonly stateVerifierStake: bigint;
}

export interface StakePool {
  readonly daVerifierPool: bigint;
  readonly daVerifiers: Uint8Array[]; // account addresses
  readonly stateVerifierPool: bigint;
  readonly stateVerifiers: Uint8Array[]; // account addresses
}

export interface DataChain {
  claims: Record<string, ComputeClaim>; // compute claims by hex encoded hash
  rootClaimHash: Uint8Array;
  headClaimHash: Uint8Array;
}

// ComputeClaim defines result of execution of risc-v program on particular input.
// Output of such risc-v program is "part os the update of TOSI world state" and:
// 1. Ouptut of, provided  by transaction sender directly is never trusted
//   (it is always re-checked by network validators).
// 2. Output is always computed offchain, hence a bunch of proofs, proving correctness
//    of offhchain computation, is neccessary. (see BlockProof)

export interface ComputeClaim {
  readonly claimer: Uint8Array;
  // Claims are "chained" akin to blocks in blockchain.
  readonly prevClaimHash: Uint8Array;
  // References to data, stored in IPFS.
  readonly dataContract: ClaimDataRef; // Data "contract" environment.
  readonly input: ClaimDataRef; // Computation input.
  readonly output: ClaimDataRef; // Computation output.

  // "Parameters" of computation.
  readonly maxCartesiCycles: bigint;
}

export interface ClaimDataRef {
  readonly cid: string;
  readonly size: number;
  readonly cartesiMerkleRoot: Uint8Array;
}

export interface DAInfo {
  size: number;
  cartesiMerkleRoot: Uint8Array;
}

export interface Block {
  readonly version: number;
  readonly prevBlockHash: Uint8Array;
  readonly accountsMerkle: MerkleTree;
  readonly transactions: SignedTransaction[];
  readonly proof: BlockProof;
  readonly time: number; // UNIX timestamp
}

export interface BlockProof {
  readonly txnBundleHash: Uint8Array;
  readonly txnBundleProposer: Uint8Array;
  readonly randomnessProof: Uint8Array;
  readonly DACheckResults: DACheckResult[];
  readonly aggDACheckResultSignature: Uint8Array;
  readonly stateCheckResults: StateCheckResult[];
  readonly aggStateCheckResultSignature: Uint8Array;
}

export interface DACheckResult {
  readonly txnBundleHash: Uint8Array;
  readonly randomnessProof: Uint8Array;
  readonly signature: Uint8Array;
  readonly signer: Uint8Array;
  readonly claims: ClaimDACheckResult[];
}

export interface StateCheckResult {
  readonly txnBundleHash: Uint8Array;
  readonly randomnessProof: Uint8Array;
  readonly signature: Uint8Array;
  readonly signer: Uint8Array;
  readonly claims: ClaimStateCheckResult[];
}

export interface ClaimDACheckResult {
  readonly claimHash: Uint8Array;
  readonly dataAvailable: boolean;
}

export interface ClaimStateCheckResult {
  readonly claimHash: Uint8Array;
  readonly stateCorrect: boolean;
}

export interface TransactionBundle {
  headBlockHash: Uint8Array;
  transactions: SignedTransaction[];
}

export interface BlockMetadata {
  readonly CID: string;
}

export interface DrandBeacon {
  round: number;
  randomness: string;
  signature: string;
  prevSignature: string;
}

export interface DrandBeaconInfo {
  publicKey: string;
  period: number;
  genesisTime: number;
  hash: string;
}
