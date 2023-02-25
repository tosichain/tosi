import * as grpc from "@grpc/grpc-js";
import winston from "winston";

import { IpfsClient } from "../../proto/grpcjs/ipfs_grpc_pb";
import { Hash, CacheMerkleRootHashRequest, CacheMerkleRootHashResponse } from "../../proto/grpcjs/ipfs_pb";

export interface IPFSServiceOptions {
  address: string;
}

export class IPFSService {
  private client: IpfsClient;
  private logger: winston.Logger;

  constructor(options: IPFSServiceOptions, logger: winston.Logger) {
    this.client = new IpfsClient(options.address, grpc.credentials.createInsecure());
    this.logger = logger;
  }

  async cacheMerkeRootHash(ipfsPath: string, log2Size: number, hash_data: Uint8Array | string): Promise<void> {
    return new Promise((resolve, reject) => {
      const hash = new Hash();
      hash.setData(hash_data);
      const request = new CacheMerkleRootHashRequest();
      request.setIpfsPath(ipfsPath);
      request.setLog2Size(log2Size);
      request.setMerkleRootHash(hash);

      this.logger.info(`caching merkle root hash for ipfsPath=${ipfsPath} log2Size=${log2Size}`);

      this.client.cacheMerkleRootHash(request, (err, resp: CacheMerkleRootHashResponse) => {
        if (err != null) {
          this.logger.error(`failed to cache merkle root hash for ipfsPath=${ipfsPath} log2Size=${log2Size} - ${err}`);
          reject(err);
          return;
        }
        resolve();
      });
    });
  }
}
