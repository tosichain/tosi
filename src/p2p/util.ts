import winston from "winston";
import { IPFS } from "../node/ipfs";
import JSONbigint from "json-bigint";

import { computeClaimFromPB, daCheckResultFromPB } from "../blockchain/serde";
import { bytesToHex } from "../blockchain/util";
import { IPFSPubSubMessage, StateVerificationResponseMessage, StateVerificationRequestMessage } from "./types";
import { DACheckResult as PBDACheckResult } from "../../src/proto/grpcjs/blockchain_pb";
import { DAVerificationRequest, DAVerificationResponse } from "../../src/proto/grpcjs/p2p_pb";

export async function keepConnectedToSwarm(
  swarmPrefix: string,
  ipfs: IPFS,
  log: winston.Logger,
  interval: number,
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  await ipfs.getIPFSforPubSub().pubsub.subscribe(swarmPrefix, () => {});
  setInterval(async () => {
    await ipfs.getIPFS().pubsub.publish(swarmPrefix, Buffer.alloc(0));
    // this is intentionally on the normal getIPFS()
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
  return stringifyHelper({
    from: msg.from,
    topicIDs: msg.topicIDs,
  });
}

export function stringifyDAVerificationRequest(request: DAVerificationRequest): string {
  const obj = {
    txnBundleHash: request.getTxnBundleHash(),
    claims: request.getClaimsList().map(computeClaimFromPB),
    randomnessProof: request.getRandomnessProof() as Uint8Array,
  };
  return stringifyHelper(obj);
}

export function stringifyDAVerificationResponse(response: DAVerificationResponse): string {
  const obj = {
    result: daCheckResultFromPB(response.getResult() as PBDACheckResult),
  };
  return stringifyHelper(obj);
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
  return stringifyHelper(obj);
}

function stringifyHelper(object: any): string {
  return JSONbigint.stringify(object, (key: string, value: any): any => {
    return value instanceof Uint8Array ? bytesToHex(value) : value;
  });
}
