export type IPFSPubSubMessage = {
  from: string;
  seqno: Uint8Array;
  data: Uint8Array;
  topicIDs: Array<string>;
};
