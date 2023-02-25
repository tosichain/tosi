import JSONbigint from "json-bigint";

import { IPFSPubSubMessage, DAVerificationRequestMessage, DAVerificationResponseMessage } from "./types";

const JSONBigIntNative = JSONbigint({ useNativeBigInt: true });

export function stringifyPubSubMessage(msg: IPFSPubSubMessage): string {
  return JSONBigIntNative.stringify({
    from: msg.from,
    topicIDs: msg.topicIDs,
  });
}

export function stringifyDAVerificationRequest(msg: DAVerificationRequestMessage): string {
  const obj = {
    ...msg,
    randomnessProof: Buffer.from(msg.randomnessProof).toString("hex"),
  };
  return JSONbigint.stringify(obj);
}

export function stringifyDAVerificationResponse(msg: DAVerificationResponseMessage): string {
  const obj = {
    ...msg,
    result: {
      txnBundleHash: msg.result.txnBundleHash,
      randomnessProof: Buffer.from(msg.result.randomnessProof).toString("hex"),
      signature: Buffer.from(msg.result.signature).toString("hex"),
      signer: msg.result.signer,
      claims: msg.result.claims,
    },
  };
  return JSON.stringify(obj);
}
