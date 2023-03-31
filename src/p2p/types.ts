import { ComputeClaim, DACheckResult, StateCheckResult } from "../blockchain/types";

export type IPFSPubSubMessage = { from: string; seqno: Uint8Array; data: Uint8Array; topicIDs: Array<string> };

export interface DAVerificationRequestMessage {
  code: string;
  txnBundleHash: string;
  claims: ComputeClaim[];
  randomnessProof: Uint8Array;
}

export interface DAVerificationResponseMessage {
  code: string;
  result: DACheckResult;
}

export interface StateVerificationRequestMessage {
  code: string;
  txnBundleHash: string;
  claims: ComputeClaim[];
  randomnessProof: Uint8Array;
}

export interface StateVerificationResponseMessage {
  code: string;
  result: StateCheckResult;
}
