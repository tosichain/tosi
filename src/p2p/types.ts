import { ComputeClaim, StateCheckResult } from "../blockchain/types";

export type IPFSPubSubMessage = { from: string; seqno: Uint8Array; data: Uint8Array; topicIDs: Array<string> };

export interface StateVerificationRequestMessage {
  code: string;
  txnBundleHash: Uint8Array;
  claims: ComputeClaim[];
  randomnessProof: Uint8Array;
}

export interface StateVerificationResponseMessage {
  code: string;
  result: StateCheckResult;
}
