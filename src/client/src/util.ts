import { NodeSSH } from "node-ssh";
import { CID } from "ipfs-http-client";

import { IPFS } from "../../p2p/ipfs";

import { DAInfo } from "../../blockchain/types";
import { bytesFromHex } from "../../blockchain/util";
import Logger from "../../log/logger";

const LOG_VERIFIER = "verifier";

export async function createDAInfo(
  ipfs: IPFS,
  log: Logger,
  path: string,
  timeout: number,
  car: boolean,
): Promise<DAInfo | undefined> {
  const { host, port } = ipfs.getIPFS().getEndpointConfig();
  const script = car ? "/app/grab-dag-as-car-and-hash.sh" : "/app/grab-and-hash.sh";
  const command = `IPFS_API=/dns4/${host}/tcp/${port} TIMEOUT=${timeout}s ${script} ${path}`;
  const result = JSON.parse((await execCommand(log, command)).stdout);
  if (result.error) {
    return undefined;
  }
  return {
    size: Number(result.size),
    cartesiMerkleRoot: bytesFromHex(result.cartesi_merkle_root),
  } as DAInfo;
}

export async function prepopulate(ipfs: IPFS, log: Logger): Promise<void> {
  const { host, port } = ipfs.getIPFS().getEndpointConfig();
  const script = "/app/prepopulate.sh";
  const command = `IPFS_API=/dns4/${host}/tcp/${port} ${script}`;
  await execCommand(log, command);
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
  log: Logger,
  functionCID: CID,
  prevOutputCID: CID,
  inputCID: CID,
): Promise<TaskResult> {
  const { host, port } = ipfs.getIPFS().getEndpointConfig();
  // eslint-disable-next-line prettier/prettier
  const command = `IPFS_API=/dns4/${host}/tcp/${port} /app/qemu-run-task.sh ${prevOutputCID.toString()} ${inputCID.toString()} ${functionCID.toString()}`;

  const result = await execCommand(log, command);
  return { output: JSON.parse(result.stdout), stderr: result.stderr };
}

export interface CommandResult {
  stderr: string;
  stdout: string;
}

export async function execCommand(log: Logger, command: string, env?: NodeJS.ProcessEnv): Promise<CommandResult> {
  const ssh = new NodeSSH();
  await ssh.connect({
    host: process.env.VERIFIER_HOST,
    username: "root",
    password: "Docker!",
  });
  log.info("executing command", LOG_VERIFIER, { command: command });
  const result = await ssh.execCommand(command, { execOptions: { env } });
  log.info("command execution finished", LOG_VERIFIER, {
    stdout: result.stdout,
    stderr: result.stderr,
  });
  return { stdout: result.stdout, stderr: result.stderr };
}
