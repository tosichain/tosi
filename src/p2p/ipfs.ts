import * as IpfsHttpClient from "ipfs-http-client";
import { CID } from "multiformats";
import { encode, decode } from "@ipld/dag-cbor";

import Logger from "../log/logger";

const LOG_NETWORK = ["network", "ipfs"];

export type IPFSOptions = IpfsHttpClient.Options;

export class IPFS {
  private ipfs: IpfsHttpClient.IPFSHTTPClient;
  private ipfsForPubSub: IpfsHttpClient.IPFSHTTPClient;

  private log: Logger;

  id: string | undefined;

  constructor(options: IpfsHttpClient.Options, log: Logger) {
    this.ipfs = IpfsHttpClient.create(options);
    this.ipfsForPubSub = IpfsHttpClient.create(options);

    this.log = log;
  }

  async getFromIPFS(cid: string): Promise<Buffer> {
    this.log.debug("getting from IPFS: " + cid);
    const chunks = [];

    for await (const buf of this.ipfs.cat(cid)) {
      chunks.push(buf);
    }

    return Buffer.concat(chunks);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getDAGfromIPFS(cid: CID): Promise<any> {
    this.log.debug("getting DAG from IPFS: " + cid);
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

  getIPFSforPubSub(): IpfsHttpClient.IPFSHTTPClient {
    return this.ipfsForPubSub;
  }

  async up(): Promise<void> {
    this.log.info("waiting for IPFS..", LOG_NETWORK);
    while (true) {
      try {
        this.id = (await this.ipfs.id()).id;
        break;
      } catch (err) {}
    }
    await this.ipfs.config.set("Pubsub.Enabled", true);
    await this.ipfs.config.set("Swarm.DisableBandwidthMetrics", true);

    this.log.info("waiting for IPFS pubsub connection..", LOG_NETWORK);
    while (true) {
      try {
        await this.ipfsForPubSub.id();
        break;
      } catch (err) {}
    }
    await this.ipfsForPubSub.config.set("Pubsub.Enabled", true);
    await this.ipfsForPubSub.config.set("Swarm.DisableBandwidthMetrics", true);
    return;
  }

  async keepConnectedToSwarm(swarmPrefix: string, interval: number): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    await this.getIPFSforPubSub().pubsub.subscribe(swarmPrefix, () => {});
    setInterval(async () => {
      await this.ipfsForPubSub.pubsub.publish(swarmPrefix, Buffer.alloc(0));
      // this is intentionally on the normal getIPFS()
      const peers = await this.ipfs.pubsub.peers(swarmPrefix);
      for (let i = 0; i < peers.length; i++) {
        this.log.info("peer seen on pubsub", LOG_NETWORK, { address: peers[i] });
        this.ipfs.swarm.connect("/p2p/" + peers[i]).catch((err: any) => {
          this.log.error("failed to connect to peer", err, LOG_NETWORK, { address: peers[i] });
        });
      }
    }, interval);
  }
}
