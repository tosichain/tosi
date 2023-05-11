import { IPFS } from "./ipfs";

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
