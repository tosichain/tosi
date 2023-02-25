import * as IpfsHttpClient from "ipfs-http-client";
import { CID } from "multiformats";
import { encode, decode } from "@ipld/dag-cbor";
import winston from "winston";

export type IPFSOptions = IpfsHttpClient.Options;
export type PubSubMessage = { from: string; seqno: Uint8Array; data: Uint8Array; topicIDs: Array<string> };

export class IPFS {
  private ipfs: IpfsHttpClient.IPFSHTTPClient;
  private logger: winston.Logger;
  id: string | undefined;

  constructor(options: IpfsHttpClient.Options, logger: winston.Logger) {
    this.ipfs = IpfsHttpClient.create(options);
    this.logger = logger;
  }

  async getFromIPFS(cid: string): Promise<Buffer> {
    this.logger.debug("getting from IPFS: " + cid);
    const chunks = [];

    for await (const buf of this.ipfs.cat(cid)) {
      chunks.push(buf);
    }

    return Buffer.concat(chunks);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getDAGfromIPFS(cid: CID): Promise<any> {
    this.logger.debug("getting DAG from IPFS: " + cid);
    return (await this.ipfs.dag.get(cid)).value;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
  static encodeDagCbor(obj: any): Uint8Array {
    return encode(obj);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static decodeDagCbor(cbor: Uint8Array): any {
    return decode(cbor);
  }

  getIPFS(): IpfsHttpClient.IPFSHTTPClient {
    return this.ipfs;
  }

  async up(logger: winston.Logger): Promise<void> {
    logger.info("Waiting for IPFS..");
    while (true) {
      try {
        this.id = (await this.ipfs.id()).id;
        break;
      } catch (err) {}
    }
    await this.ipfs.config.set("Pubsub.Enabled", true);
    await this.ipfs.config.set("Swarm.DisableBandwidthMetrics", true);
    return;
  }
}
