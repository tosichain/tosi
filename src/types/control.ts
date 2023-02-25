import { ClaimMessage } from "./claims";

export interface ControlMessage<MessageType, PayloadType = unknown> {
  requestId: string;
  type: MessageType;
  payload: PayloadType;
}

export enum ControlMessageType {
  PING = "ping",
  CREATE_FUNCTION = "create-function",
  TEST_GET_ACTIVE_CLAIMS = "test-get-active-claims",
  QUERY_SEAL = "query_seal",
  SEAL_CLAIM = "seal_claim",
}

export type CreateFunctionMessage = ControlMessage<
  ControlMessageType.CREATE_FUNCTION,
  {
    name: string;
    app: string;
    court: string;
    state: string;
    input: string;
    fakeIt: string | null;
  }
>;

export type ReadFunctionMessage = ControlMessage<ControlMessageType.TEST_GET_ACTIVE_CLAIMS>;

export type QuerySealMessage = ControlMessage<ControlMessageType.QUERY_SEAL, { leaf: string }>;

export type SealClaimMessage = ControlMessage<ControlMessageType.SEAL_CLAIM, { leaf: string }>;
