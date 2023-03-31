import JSONbigint from "json-bigint";
import winston from "winston";
import { IPFS } from "../node/ipfs";

import {
  IPFSPubSubMessage,
  DAVerificationRequestMessage,
  DAVerificationResponseMessage,
  StateVerificationResponseMessage,
  StateVerificationRequestMessage,
} from "./types";

const JSONBigIntNative = JSONbigint({ useNativeBigInt: true });

export async function keepConnectedToSwarm(
  swarmPrefix: string,
  ipfs: IPFS,
  log: winston.Logger,
  interval: number,
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  await ipfs.getIPFS().pubsub.subscribe(swarmPrefix, () => {});
  setInterval(async () => {
    await ipfs.getIPFS().pubsub.publish(swarmPrefix, Buffer.alloc(0));
    const peers = await ipfs.getIPFS().pubsub.peers(swarmPrefix);
    for (let i = 0; i < peers.length; i++) {
      log.info("peer seen on pubsub: " + peers[i]);
      ipfs
        .getIPFS()
        .swarm.connect("/p2p/" + peers[i])
        .catch(() => {
          log.error("error connecting to " + peers[i]);
        });
    }
  }, interval);
}

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

export function stringifyStateVerificationRequest(msg: StateVerificationRequestMessage): string {
  const obj = {
    ...msg,
    randomnessProof: Buffer.from(msg.randomnessProof).toString("hex"),
  };
  return JSONbigint.stringify(obj);
}

export function stringifyStateVerificationResponse(msg: StateVerificationResponseMessage): string {
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