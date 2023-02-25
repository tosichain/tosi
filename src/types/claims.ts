import { CID } from "multiformats/cid";
import { PubSubDASResponseMessage } from "./p2pmessages";

// name, size, size log2, keccak256, merkle root
export type ClaimData = [string, number, number, Uint8Array, Uint8Array];

export interface DrandBeaconInfo {
  public_key: string;
  period: number;
  genesis_time: number;
  hash: string;
}

export interface StakingNode {
  public_key: Uint8Array;
  stake: bigint;
  isDASampler: boolean;
  isVerifier: boolean;
}

export interface StakingNodesInfo {
  nodes: StakingNode[];
  cid: CID;
  log2: number;
  cartesiMerkle: Uint8Array;
}

export interface DrandBeacon {
  round: number;
  randomness: string;
  signature: string;
  previous_signature: string;
}

export interface ClaimState {
  status: string;
  claim?: ClaimMessage;
  randomnessProof?: Uint8Array;
  leaf?: string;
  dasResponses?: PubSubDASResponseMessage[];
  name?: string;
}

export interface ClaimMessage {
  rootCID: string | null;
  claimCID: string;
  preCID: string;
  inputCID: string;
  govCID: string;
  daInfo: ClaimData[];
  claimerBlsPublicKey: Uint8Array;
  returnCode: number;
  maxCartesiCycles: bigint;
  nonce: Uint8Array;
  submitterDescartesAddress: string;
}

export interface DAInfo {
  log2: number;
  keccak256: string;
  cartesi_merkle_root: string;
  size: string;
  resolve?: string;
}

export interface GenesisInfo {
  appCID: string;
  courtCID: string;
  stateCID: string;
  inputCID: string;
  fakeIt: string | null;
}

export interface BuildUponInfo {
  appCID: string;
  courtCID: string;
  stateCID: string;
  inputCID: string;
  fakeIt: string | null;
}
