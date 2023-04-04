import winston from "winston";
import { NodeSSH } from "node-ssh";
import { CID } from "ipfs-http-client";

import { IPFS } from "../../node/ipfs";

import { DAInfo } from "../../blockchain/types";

export async function createDAInfo(
  ipfs: IPFS,
  log: winston.Logger,
  path: string,
  noHash: boolean,
  timeout: number,
): Promise<DAInfo | undefined> {
  const { host, port } = ipfs.getIPFS().getEndpointConfig();
  const command = `IPFS_API=/dns4/${host}/tcp/${port} TIMEOUT=${timeout}s NO_HASH=${noHash} /app/grab-and-hash.sh ${path}`;
  const result = JSON.parse((await execCommand(log, command)).stdout);
  if (result.error) {
    return undefined;
  }
  return {
    name: "",
    size: Number(result.size),
    log2: Number(result.log2),
    keccak256: result.keccak256,
    cartesiMerkleRoot: result.cartesi_merkle_root,
  } as DAInfo;
}

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
export async function execTask(
  ipfs: IPFS,
  log: winston.Logger,
  preCID: CID,
  inputCID: CID,
  govCID: CID,
  options: ExecuteTaskOptions,
): Promise<TaskResult> {
  const { host, port } = ipfs.getIPFS().getEndpointConfig();
  // eslint-disable-next-line prettier/prettier
  let command = `IPFS_API=/dns4/${host}/tcp/${port} /app/qemu-run-task.sh ${preCID.toString()} ${
    options.nonce
  } ${inputCID.toString()} ${govCID.toString()} ${options.buildUpon}`;
  if (options.fakeIt) command = `FAKE_IT=${options.fakeIt} ${command}`;
  if (options.verify) command = `VERIFY_KECCAK=true ${command}`;
  const result = await execCommand(log, command);
  return { output: JSON.parse(result.stdout), stderr: result.stderr };
}

export interface CommandResult {
  stderr: string;
  stdout: string;
}

export async function execCommand(
  log: winston.Logger,
  command: string,
  env?: NodeJS.ProcessEnv,
): Promise<CommandResult> {
  const ssh = new NodeSSH();
  await ssh.connect({
    host: process.env.VERIFIER_HOST,
    username: "root",
    password: "Docker!",
  });
  log.info("Executing in verifier: " + JSON.stringify(command));
  const result = await ssh.execCommand(command, { execOptions: { env } });
  log.info("stderr: " + result.stderr);
  log.info("stdout:" + result.stdout);
  return { stdout: result.stdout, stderr: result.stderr };
}