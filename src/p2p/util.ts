import { IPFS } from "../node/ipfs";

import { computeClaimFromPB, daCheckResultFromPB, stateCheckResultFromPB } from "../blockchain/serde";
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

const LOG_NETWORK = "network";

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
      log.info("peer seen on pubsub", LOG_NETWORK, { address: peers[i] });
      ipfs
        .getIPFS()
        .swarm.connect("/p2p/" + peers[i])
        .catch((err: any) => {
          log.error("failed to connect to peer", err, LOG_NETWORK, { address: peers[i] });
        });
    }
  }, interval);
}

export function logPubSubMessage(msg: IPFSPubSubMessage): any {
  return {
    from: msg.from,
    topicIDs: msg.topicIDs,
  };
}

export function logDAVerificationRequest(request: DAVerificationRequest): any {
  return {
    txnBundleHash: request.getTxnBundleHash(),
    claims: request.getClaimsList().map(computeClaimFromPB),
    randomnessProof: request.getRandomnessProof(),
  };
}

export function logDAVerificationResponse(response: DAVerificationResponse): any {
  return {
    result: daCheckResultFromPB(response.getResult() as PBDACheckResult),
  };
}

export function logStateVerificationRequest(request: StateVerificationRequest): any {
  return {
    txnBundleHash: request.getTxnBundleHash(),
    claims: request.getClaimsList().map(computeClaimFromPB),
    randomnessProof: request.getRandomnessProof(),
  };
}

export function logStateVerificationResponse(response: StateVerificationResponse): any {
  return {
    result: stateCheckResultFromPB(response.getResult() as PBStateCheckResult),
  };
}
