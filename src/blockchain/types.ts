import MerkleTree from "merkletreejs";

// TODO:
// "hex" means hex-encoded byte data.
// Must be chnage to UInt8Array.

export interface SignedTransaction {
  from: string; // hex
  signature: string; // hex
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
  readonly receiver: string; // hex
  readonly amount: bigint;
}

export interface TransferToken {
  readonly receiver: string; // hex
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
  readonly rootClaimHash: string; // hex
  readonly claim: ComputeClaim;
}

export interface WorldState {
  readonly accounts: Record<string /*hex*/, Account>;
  readonly stakePool: StakePool;
  readonly minter: string; // hex
  readonly dataChains: Record<string, DataChain>;
}

export interface Account {
  readonly address: string; // hex, BLS public key
  readonly nonce: number;
  readonly balance: bigint;
  readonly daVerifierStake: bigint;
  readonly stateVerifierStake: bigint;
}

export interface StakePool {
  readonly daVerifierPool: bigint;
  readonly daVerifiers: string[]; // hex
  readonly stateVerifierPool: bigint;
  readonly stateVerifiers: string[]; // hex
}

export interface DataChain {
  claims: Record<string, ComputeClaim>;
  rootClaimHash: string; // hex
  headClaimHash: string; // hex
}

export interface DAInfo {
  size: number;
  cartesiMerkleRoot: string; // hex
}

// ComputeClaim defines result of execution of risc-v program on particular input.
// Output of such risc-v program is "part os the update of TOSI world state" and:
// 1. Ouptut of, provided  by transaction sender directly is never trusted
//   (it is always re-checked by network validators).
// 2. Output is always computed offchain, hence a bunch of proofs, proving correctness
//    of offhchain computation, is neccessary. (see BlockProof)

export interface ClaimDataRef {
  readonly cid: string;
  readonly size: number;
  readonly cartesiMerkleRoot: string; // hex
}

export interface ComputeClaim {
  readonly claimer: string; // hex
  // Claims are "chained" akin to blocks in blockchain.
  readonly prevClaimHash: string; // hex
  // References to data, stored in IPFS.
  readonly dataContract: ClaimDataRef; // Data "contract" environment.
  readonly input: ClaimDataRef; // Computation input.
  readonly output: ClaimDataRef; // Computation output.

  // "Parameters" of computation.
  readonly maxCartesiCycles: bigint;
}

export interface DAInfo {
  name: string;
  size: number;
  log2: number;
  keccak256: string; // hex
  cartesiMerkleRoot: string; // hex
}

export interface Block {
  readonly version: number;
  readonly prevBlockHash: string; // hex
  readonly accountsMerkle: MerkleTree;
  readonly transactions: SignedTransaction[];
  readonly proof: BlockProof;
  readonly time: number; // UNIX timestamp
}

export interface BlockProof {
  readonly txnBundleHash: string; // hex
  readonly txnBundleProposer: string; // hex
  readonly randomnessProof: Uint8Array;
  readonly DACheckResults: DACheckResult[];
  readonly aggDACheckResultSignature: Uint8Array;
  readonly stateCheckResults: StateCheckResult[];
  readonly aggStateCheckResultSignature: Uint8Array;
}

export interface DACheckResult {
  readonly txnBundleHash: string; // hex
  readonly randomnessProof: Uint8Array;
  readonly signature: Uint8Array;
  readonly signer: string; // hex
  readonly claims: ClaimDACheckResult[];
}

export interface StateCheckResult {
  readonly txnBundleHash: string; // hex
  readonly randomnessProof: Uint8Array;
  readonly signature: Uint8Array;
  readonly signer: string; // hex
  readonly claims: ClaimStateCheckResult[];
}

export interface ClaimDACheckResult {
  readonly claimHash: string; // hex
  readonly dataAvailable: boolean;
}

export interface ClaimStateCheckResult {
  readonly claimHash: string; // hex
  readonly stateCorrect: boolean;
}

export interface TransactionBundle {
  headBlockHash: string;
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
