import { NodeSSH } from "node-ssh";
import { CID } from "ipfs-http-client";

import { IPFS } from "../../p2p/ipfs";

import { DAInfo } from "../../blockchain/types";
import { bytesFromHex } from "../../blockchain/util";
import Logger from "../../log/logger";

const LOG_VERIFIER = "verifier";

export interface VerifierServiceConfig {
  host: string;
  user: string;
  password: string;
}

export async function createDAInfo(
  config: VerifierServiceConfig,
  ipfs: IPFS,
  log: Logger,
  path: string,
  timeout: number,
  car: boolean,
): Promise<DAInfo | undefined> {
  const { host, port } = ipfs.getIPFS().getEndpointConfig();
  const binary = car ? "/app/grab-and-hash" : "/app/grab-dag-as-car-and-hash"; // Updated script paths to binaries
  const command = `IPFS_API=/dns4/${host}/tcp/${port} TIMEOUT=${timeout}s ${binary} ${path}`;
  const result = JSON.parse((await execCommand(config, log, command)).stdout);
  if (result.error) {
    return undefined;
  }
  return {
    size: Number(result.size),
    cartesiMerkleRoot: bytesFromHex(result.cartesi_merkle_root),
  } as DAInfo;
}

export async function prepopulate(config: VerifierServiceConfig, ipfs: IPFS, log: Logger): Promise<void> {
  const { host, port } = ipfs.getIPFS().getEndpointConfig();
  const binary = "/app/prepopulate"; // Updated script path to binary
  const command = `IPFS_API=/dns4/${host}/tcp/${port} ${binary}`;
  await execCommand(config, log, command);
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
  config: VerifierServiceConfig,
  ipfs: IPFS,
  log: Logger,
  functionCID: CID,
  prevOutputCID: CID,
  inputCID: CID,
): Promise<TaskResult> {
  const { host, port } = ipfs.getIPFS().getEndpointConfig();
  const binary = "/app/qemu-run-task"; // Updated script path to binary
  // eslint-disable-next-line prettier/prettier
  const command = `IPFS_API=/dns4/${host}/tcp/${port} ${binary} ${prevOutputCID.toString()} ${inputCID.toString()} ${functionCID.toString()}`;

  const result = await execCommand(config, log, command);
  return { output: JSON.parse(result.stdout), stderr: result.stderr };
}

export interface CommandResult {
  stderr: string;
  stdout: string;
}

export async function execCommand(
  config: VerifierServiceConfig,
  log: Logger,
  command: string,
  env?: NodeJS.ProcessEnv,
): Promise<CommandResult> {
  const ssh = new NodeSSH();
  await ssh.connect({
    host: config.host,
    username: config.user,
    password: config.password,
  });
  log.info("executing command", LOG_VERIFIER, { command: command });
  const result = await ssh.execCommand(command, { execOptions: { env } });
  log.info("command execution finished", LOG_VERIFIER, {
    stdout: result.stdout,
    stderr: result.stderr,
  });

  const stdoutLines = result.stdout.split("\n");
  const jsonResult = stdoutLines[stdoutLines.length - 1];

  return { stdout: jsonResult, stderr: result.stderr };
}
