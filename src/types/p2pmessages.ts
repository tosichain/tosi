import { ClaimMessage } from "./claims";

export interface DasResponse {
  type: string;
  claimHash: Uint8Array;
  randomnessProof: Uint8Array;
}

export interface PubSubDASRequestMessage {
  type: string;
  claim: ClaimMessage;
  randomnessProof: Uint8Array;
}

export interface PubSubDASResponseMessage {
  type: string;
  claimHash: Uint8Array;
  sig: Uint8Array;
  signer: Uint8Array;
  randomnessProof: Uint8Array;
}
