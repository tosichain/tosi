import { IPFS } from "../node/ipfs";
import JSONbigint from "json-bigint";

import { computeClaimFromPB, daCheckResultFromPB, stateCheckResultFromPB } from "../blockchain/serde";
import { bytesToHex } from "../blockchain/util";
import { IPFSPubSubMessage } from "./types";
import {
  DACheckResult as PBDACheckResult,
  StateCheckResult as PBStateCheckResult,
} from "../../src/proto/grpcjs/blockchain_pb";
import {
  DAVerificationRequest,
  DAVerificationResponse,
  StateVerificationResponse,
  StateVerificationRequest,
} from "../../src/proto/grpcjs/p2p_pb";
import Logger from "../log/logger";

export async function keepConnectedToSwarm(
  swarmPrefix: string,
  ipfs: IPFS,
  log: Logger,
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
    randomnessProof: request.getRandomnessProof(),
  };
  return stringifyHelper(obj);
}

export function stringifyDAVerificationResponse(response: DAVerificationResponse): string {
  const obj = {
    result: daCheckResultFromPB(response.getResult() as PBDACheckResult),
  };
  return stringifyHelper(obj);
}

export function stringifyStateVerificationRequest(request: StateVerificationRequest): string {
  const obj = {
    txnBundleHash: request.getTxnBundleHash(),
    claims: request.getClaimsList().map(computeClaimFromPB),
    randomnessProof: request.getRandomnessProof(),
  };
  return JSONbigint.stringify(obj);
}

export function stringifyStateVerificationResponse(response: StateVerificationResponse): string {
  const obj = {
    result: stateCheckResultFromPB(response.getResult() as PBStateCheckResult),
  };
  return stringifyHelper(obj);
}

function stringifyHelper(object: any): string {
  return JSONbigint.stringify(object, (key: string, value: any): any => {
    return value instanceof Uint8Array ? bytesToHex(value) : value;
  });
}
