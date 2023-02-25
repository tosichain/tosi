import { CID } from "multiformats";

import { NodeSSH } from "node-ssh";
import JSONbigint from "json-bigint";
import { EndpointConfig, IPFSHTTPClient } from "ipfs-http-client";

import { BuildUponInfo, ClaimData, ClaimMessage, DAInfo, GenesisInfo } from "../types/claims";

import crypto from "crypto";
import winston from "winston";
import { IPFSService } from "./ipfs-service";

const JSONBigIntNative = JSONbigint({ useNativeBigInt: true });

interface CommandResult {
  stderr: string;
  stdout: string;
}

export const execCommand = async (
  command: string,
  logger: winston.Logger,
  env?: NodeJS.ProcessEnv,
): Promise<CommandResult> => {
  const ssh = new NodeSSH();
  await ssh.connect({
    host: process.env.VERIFIER_HOST,
    username: "root",
    password: "Docker!",
  });
  logger.debug("Executing in verifier: " + JSON.stringify(command));
  const result = await ssh.execCommand(command, { execOptions: { env } });
  logger.info("stderr: " + result.stderr);
  logger.info("stdout:" + result.stdout);
  return { stdout: result.stdout, stderr: result.stderr };
};

export interface ExecuteTaskOptions {
  nonce: string;
  verify?: boolean;
  fakeIt?: string | null;
  buildUpon?: boolean;
}

interface TaskResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  output: any;
  stderr: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const execTask = async (
  ep: EndpointConfig,
  preCID: CID,
  inputCID: CID,
  govCID: CID,
  options: ExecuteTaskOptions,
  logger: winston.Logger,
): Promise<TaskResult> => {
  const { host, port } = ep;
  // eslint-disable-next-line prettier/prettier
  let command = `IPFS_API=/dns4/${host}/tcp/${port} /app/qemu-run-task.sh ${preCID.toString()} ${
    options.nonce
  } ${inputCID.toString()} ${govCID.toString()} ${options.buildUpon}`;
  if (options.fakeIt) command = `FAKE_IT=${options.fakeIt} ${command}`;
  if (options.verify) command = `VERIFY_KECCAK=true ${command}`;
  const result = await execCommand(command, logger);
  return { output: JSON.parse(result.stdout), stderr: result.stderr };
};

export const updateDescartesMekrleRootCache = async (
  ipfsService: IPFSService,
  directPath: string | undefined,
  claimPath: string | undefined,
  log2Size: number,
  hash: Uint8Array | string,
): Promise<void> => {
  if (directPath != undefined) {
    await ipfsService.cacheMerkeRootHash(directPath, log2Size, hash);
  }
  if (claimPath != undefined) {
    await ipfsService.cacheMerkeRootHash(claimPath, log2Size, hash);
  }
};

export const checkDA = async (
  ep: EndpointConfig,
  path: string,
  timeout: number,
  noHash: boolean,
  logger: winston.Logger,
): Promise<DAInfo> => {
  const { host, port } = ep;
  const command = `IPFS_API=/dns4/${host}/tcp/${port} TIMEOUT=${timeout}s NO_HASH=${noHash} /app/grab-and-hash.sh ${path}`;
  const result = await execCommand(command, logger);
  return JSON.parse(result.stdout);
};

export async function generateBasedUponClaimMsg(
  ipfs: IPFSHTTPClient,
  ipfsService: IPFSService,
  task: BuildUponInfo,
  cache: Record<string, DAInfo>,
  myAddress: string,
  logger: winston.Logger,
  pre: CID,
  root: CID,
  nonce: Buffer,
  claimerBlsPublicKey: Uint8Array,
): Promise<ClaimMessage> {
  const ep = ipfs.getEndpointConfig();
  logger.debug(JSON.stringify(task));

  const availability: [string, CID, DAInfo, string][] = await Promise.all(
    (
      [
        ["app.img", CID.parse(task.appCID), "/prev/gov/app.img"],
        ["court.img", CID.parse(task.courtCID), "/prev/gov/court.img"],
        ["input", CID.parse(task.inputCID), "/input"],
        ["state.squashfs", CID.parse(task.stateCID), "/prev/state.squashfs"],
      ] as [string, CID, string][]
    ).map(async ([path, cid, loc]): Promise<[string, CID, DAInfo, string]> => {
      let dainfo = cache[cid.toString()];

      if (dainfo) {
        await checkDA(ep, cid.toString(), 120, true, logger);
      } else {
        dainfo = await checkDA(ep, cid.toString(), 120, false, logger);
      }
      logger.debug("DA RESULT: " + JSON.stringify([path, cid, dainfo, loc]));
      return [path, cid, dainfo, loc];
    }),
  );
  logger.debug(JSON.stringify(availability, null, 2));
  logger.debug(JSON.stringify({ appCID: task.appCID, courtCID: task.courtCID }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const govNode: any = {};

  availability.filter((x) => x[0] == "court.img").forEach(([path, cid, dainfo, loc]) => (govNode[path] = cid));
  availability.filter((x) => x[0] == "app.img").forEach(([path, cid, dainfo, loc]) => (govNode[path] = cid));

  logger.debug("gov node: " + JSON.stringify(govNode, null, 2));
  const govCID = await ipfs.dag.put(govNode, { pin: true });

  const output = await execTask(
    ipfs.getEndpointConfig(),
    pre,
    CID.parse(task.inputCID),
    govCID,
    { nonce: nonce.toString("hex"), fakeIt: task.fakeIt, buildUpon: true },
    logger,
  );
  logger.debug("output of task: ", output);
  if (task.fakeIt ? Number(task.fakeIt) != output.output.returnCode : output.output.returnCode !== 0) {
    throw new Error(
      "Task returned different from " + (task.fakeIt ? task.fakeIt : 0) + " return code. Log: \n" + output.stderr,
    );
  }

  availability.forEach(
    async ([_, cid, dainfo, loc]): Promise<void> =>
      await updateDescartesMekrleRootCache(
        ipfsService,
        cid.toString(),
        `${output.output.claimCID}${loc}`,
        dainfo.log2,
        dainfo.cartesi_merkle_root,
      ),
  );

  // name, size, size log2, keccak256, merkle root
  // export type ClaimData = [string, number, number, Uint8Array, Uint8Array];
  // printf '{"log2":%s,"keccak256":"%s","cartesi_merkle_root":"%s","size":"%s"}' $LOG2 $KECCAK256 $CARTESI_MERKLE_ROOT $SIZE

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const metadata: ClaimData[] = availability.map(([path, _cid, info, loc]) => [
    loc,
    parseInt(info.size),
    info.log2,
    Buffer.from(info.keccak256, "hex"),
    Buffer.from(info.cartesi_merkle_root, "hex"),
  ]);

  metadata.push([
    "/state.squashfs",
    parseInt(output.output.stateSize),
    output.output.log2State,
    Buffer.alloc(0),
    Buffer.from(output.output.stateMerkle, "hex"),
  ]);
  // XXX no hash here feels bad
  metadata.push(["/output.file", 0, 0, Buffer.from(output.output.outputFileKeccak, "hex"), Buffer.alloc(0)]);
  logger.debug("metadata: " + JSON.stringify(metadata));
  const claim: ClaimMessage = {
    preCID: pre.toString(),
    rootCID: root.toString(),
    claimCID: output.output.claimCID,
    nonce: nonce,
    inputCID: task.inputCID,
    govCID: govCID.toString(),
    daInfo: metadata,
    returnCode: output.output.returnCode,
    maxCartesiCycles: 30000000000n,
    claimerBlsPublicKey,
    submitterDescartesAddress: myAddress,
  };
  return claim;
}

export async function generateGenesisClaimMsg(
  ipfs: IPFSHTTPClient,
  ipfsService: IPFSService,
  task: GenesisInfo,
  cache: Record<string, DAInfo>,
  myAddress: string,
  claimerBlsPublicKey: Uint8Array,
  logger: winston.Logger,
): Promise<ClaimMessage> {
  const ep = ipfs.getEndpointConfig();
  logger.debug(JSON.stringify(task));

  const availability: [string, CID, DAInfo, string][] = await Promise.all(
    (
      [
        ["app.img", CID.parse(task.appCID), "/prev/gov/app.img"],
        ["court.img", CID.parse(task.courtCID), "/prev/gov/court.img"],
        ["input", CID.parse(task.inputCID), "/input"],
        ["state.squashfs", CID.parse(task.stateCID), "/prev/state.squashfs"],
      ] as [string, CID, string][]
    ).map(async ([path, cid, loc]): Promise<[string, CID, DAInfo, string]> => {
      let dainfo = cache[cid.toString()];

      if (dainfo) {
        await checkDA(ep, cid.toString(), 120, true, logger);
      } else {
        dainfo = await checkDA(ep, cid.toString(), 120, false, logger);
      }
      logger.debug("DA RESULT: " + JSON.stringify([path, cid, dainfo, loc]));
      return [path, cid, dainfo, loc];
    }),
  );
  logger.debug(JSON.stringify(availability, null, 2));
  logger.debug(JSON.stringify({ appCID: task.appCID, courtCID: task.courtCID }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const govNode: any = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const preNode: any = {};
  availability.filter((x) => x[0] == "court.img").forEach(([path, cid, dainfo, loc]) => (govNode[path] = cid));
  availability.filter((x) => x[0] == "app.img").forEach(([path, cid, dainfo, loc]) => (govNode[path] = cid));

  const nonce = crypto.randomBytes(32);
  availability.filter((x) => x[0] == "input").forEach(([path, cid, dainfo, loc]) => (preNode[path] = cid));
  availability.filter((x) => x[0] == "state.squashfs").forEach(([path, cid, dainfo, loc]) => (preNode[path] = cid));
  preNode["nonce"] = nonce.toString("hex");

  logger.debug("gov node: " + JSON.stringify(govNode, null, 2));
  const govCID = await ipfs.dag.put(govNode, { pin: true });
  preNode["gov"] = govCID;

  logger.debug("pre node: " + JSON.stringify(preNode, null, 2));
  const pre = await ipfs.dag.put(preNode, { pin: true });
  const output = await execTask(
    ipfs.getEndpointConfig(),
    pre,
    CID.parse(task.inputCID),
    govCID,
    { nonce: preNode["nonce"], fakeIt: task.fakeIt, buildUpon: false },
    logger,
  );
  logger.debug("output of task: ", output);
  if (task.fakeIt ? Number(task.fakeIt) != output.output.returnCode : output.output.returnCode !== 0) {
    throw new Error(
      "Task returned different from " + (task.fakeIt ? task.fakeIt : 0) + " return code. Log: \n" + output.stderr,
    );
  }

  availability.forEach(
    async ([_, cid, dainfo, loc]): Promise<void> =>
      await updateDescartesMekrleRootCache(
        ipfsService,
        cid.toString(),
        `${output.output.claimCID}${loc}`,
        dainfo.log2,
        dainfo.cartesi_merkle_root,
      ),
  );

  // name, size, size log2, keccak256, merkle root
  // export type ClaimData = [string, number, number, Uint8Array, Uint8Array];
  // printf '{"log2":%s,"keccak256":"%s","cartesi_merkle_root":"%s","size":"%s"}' $LOG2 $KECCAK256 $CARTESI_MERKLE_ROOT $SIZE

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const daInfo: ClaimData[] = availability.map(([path, _cid, info, loc]) => [
    loc,
    parseInt(info.size),
    info.log2,
    Buffer.from(info.keccak256, "hex"),
    Buffer.from(info.cartesi_merkle_root, "hex"),
  ]);

  daInfo.push([
    "/state.squashfs",
    parseInt(output.output.stateSize),
    output.output.log2State,
    Buffer.alloc(0),
    Buffer.from(output.output.stateMerkle, "hex"),
  ]);
  // XXX no hash here feels bad
  daInfo.push(["/output.file", 0, 0, Buffer.from(output.output.outputFileKeccak, "hex"), Buffer.alloc(0)]);
  logger.debug("metadata: " + JSON.stringify(daInfo));
  const claim: ClaimMessage = {
    preCID: pre.toString(),
    rootCID: output.output.claimCID,
    claimCID: output.output.claimCID,
    nonce: nonce,
    inputCID: task.inputCID,
    govCID: govCID.toString(),
    daInfo: daInfo,
    returnCode: output.output.returnCode,
    claimerBlsPublicKey,
    maxCartesiCycles: 30000000000n,
    submitterDescartesAddress: myAddress,
  };
  return claim;
}

export async function verifyComputationClaim(
  ipfs: IPFSHTTPClient,
  claim: ClaimMessage,
  cache: Record<string, DAInfo>,
  logger: winston.Logger,
): Promise<boolean> {
  const ep = ipfs.getEndpointConfig();

  const claimCID = CID.parse(claim.claimCID);
  const preCID = CID.parse(claim.preCID);
  const inputCID = CID.parse(claim.inputCID);
  const govCID = CID.parse(claim.govCID);

  logger.debug("claim CID: ", claimCID.toString());
  logger.debug("claim: " + JSONbigint.stringify(claim));
  await ipfs.dag.get(preCID, { timeout: 12000 });
  const preDAG = await ipfs.dag.get(preCID, { timeout: 12000 });
  const claimDAG = await ipfs.dag.get(claimCID, { timeout: 12000 });

  if (!claimDAG.value.prev.equals(preCID)) {
    throw new Error("Pre CID does not match");
  }

  if (!claimDAG.value.input.equals(inputCID)) {
    throw new Error("Input CID does not match");
  }
  // XXX check if gov is OK too
  const output = await execTask(
    ep,
    claimDAG.value.prev,
    inputCID,
    govCID,
    { nonce: preDAG.value.nonce, buildUpon: true },
    logger,
  );
  logger.debug(output);

  let verificationPassed = true;

  const newClaimCID = CID.parse(output.output.claimCID);
  if (!newClaimCID.equals(claimCID)) {
    logger.debug("claimCID " + claimCID.toString() + " versus result " + newClaimCID.toString());
    verificationPassed = false;
  } else if (output.output.returnCode !== claim.returnCode) {
    logger.debug(
      "claimCID " +
        claimCID.toString() +
        " claimed returnCode " +
        claim.returnCode +
        " got " +
        output.output.returnCode,
    );
    verificationPassed = false;
  }
  /* export interface ClaimMessage {
  claimCID: Uint8Array;
  preCID: Uint8Array;
  metadata: ClaimData[];
  returnCode: number;
  maxRealTime: number;
  maxCartesiCycles: bigint;
  } */

  if (!verificationPassed) {
    logger.debug("*** VERIFICATION FAIL");

    return false;
  } else {
    logger.debug("*** VERIFICATION OK");
    return true;
  }
}

export async function verifyDAClaim(
  ipfs: IPFSHTTPClient,
  ipfsService: IPFSService,
  claim: ClaimMessage,
  cache: Record<string, DAInfo>,
  logger: winston.Logger,
): Promise<boolean> {
  const ep = ipfs.getEndpointConfig();

  const claimCID = CID.parse(claim.claimCID);
  const preCID = CID.parse(claim.preCID);
  logger.debug("claim CID: ", claimCID.toString());
  logger.debug("claim: " + JSONbigint.stringify(claim));
  await ipfs.dag.get(preCID, { timeout: 12000 });
  logger.debug("got pre CID");
  const claimDAG = await ipfs.dag.get(claimCID, { timeout: 12000 });
  logger.debug("got claim CID: " + JSON.stringify(claimDAG));
  if (!claimDAG.value.prev.equals(preCID)) {
    logger.debug("claim pre does not match that in claim message");
    throw new Error("Pre CID does not match");
  }
  // XXX check that pre and gov matches claim
  logger.debug("checking DA");
  const results = await Promise.all(
    // XXX what about output.zip?
    ["/prev/state.squashfs", "/prev/gov/app.img", "/prev/gov/court.img", "/input"].map(async (it) => {
      const resolveResult = await ipfs.dag.resolve(claimCID, { path: it }); // XXX needs timeout
      if (!resolveResult) {
        logger.debug("Did not resolve: " + it);
        throw new Error("CID did not resolve?!");
      }
      if (cache[resolveResult.cid.toString()]) {
        logger.debug("cache hit: " + resolveResult.cid.toString());
        await checkDA(ep, `${claimCID.toString()}${it}`, 120, true, logger);
        return cache[resolveResult.cid.toString()];
      }

      const result = await checkDA(ep, `${claimCID.toString()}${it}`, 120, false, logger);
      logger.debug("checkDA of " + it + " returned " + JSON.stringify(result));
      cache[resolveResult.cid.toString()] = result;

      await updateDescartesMekrleRootCache(
        ipfsService,
        resolveResult.cid.toString(),
        `${claimCID.toString()}${it}`,
        result.log2,
        result.cartesi_merkle_root,
      );

      return result;
    }),
  );

  // XXX we should validate the metadata actually matches before handing out DA proof
  const [stateInfo, appInfo, courtInfo, inputInfo, newStateInfo, outputInfo] = results;

  const appInfoInClaim = claim.daInfo.find((x) => {
    return x[0] == "/prev/gov/app.img";
  });

  const stateInfoInClaim = claim.daInfo.find((x) => {
    return x[0] == "/prev/state.squashfs";
  });
  const courtInfoInClaim = claim.daInfo.find((x) => {
    return x[0] == "/prev/gov/court.img";
  });
  const inputInfoInClaim = claim.daInfo.find((x) => {
    return x[0] == "/input";
  });

  function daInfo2ClaimData(a: DAInfo, name: string): ClaimData {
    return [name, Number(a.size), a.log2, Buffer.from(a.keccak256, "hex"), Buffer.from(a.cartesi_merkle_root, "hex")];
  }
  // name, size, size log2, keccak256, merkle root
  // export type ClaimData = [string, number, number, Uint8Array, Uint8Array];
  function compareClaimData(a: ClaimData, b: ClaimData, ignoreSizes: boolean, ignoreKeccak: boolean): boolean {
    return (
      a[0] === b[0] &&
      (ignoreSizes || a[1] === b[1]) &&
      (ignoreSizes || a[2] === b[2]) &&
      (ignoreKeccak || Buffer.from(a[3]).equals(Buffer.from(b[3]))) &&
      Buffer.from(a[4]).equals(Buffer.from(b[4]))
    );
  }

  logger.debug(JSON.stringify({ stateInfo, appInfo, courtInfo, inputInfo, outputInfo, newStateInfo }));

  if (
    !stateInfoInClaim ||
    !compareClaimData(daInfo2ClaimData(stateInfo, "/prev/state.squashfs"), stateInfoInClaim, false, false)
  ) {
    logger.debug(
      "State data fail: " +
        JSON.stringify(stateInfoInClaim) +
        " / in stateInfo / " +
        JSON.stringify(daInfo2ClaimData(stateInfo, "/prev/state.squashfs")),
    );
    return false;
  }
  if (
    !courtInfoInClaim ||
    !compareClaimData(daInfo2ClaimData(courtInfo, "/prev/gov/court.img"), courtInfoInClaim, false, false)
  ) {
    logger.debug("Court data fail");
    return false;
  }
  if (!inputInfoInClaim || !compareClaimData(daInfo2ClaimData(inputInfo, "/input"), inputInfoInClaim, false, false)) {
    logger.debug("Input data fail");
    return false;
  }
  if (
    !appInfoInClaim ||
    !compareClaimData(daInfo2ClaimData(appInfo, "/prev/gov/app.img"), appInfoInClaim, false, false)
  ) {
    logger.debug("App data fail");
    return false;
  }
  return true;
}
