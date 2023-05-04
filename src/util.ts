import os from "os";
import child_process from "child_process";
import util from "util";
import * as cborg from "cborg";
import { bigIntEncoder, bigIntDecoder, bigNegIntDecoder } from "cborg/taglib";

export const hexToTypedArray = (hex: string): Uint8Array => {
  const b = Buffer.from(hex, "hex");
  return new Uint8Array(b.buffer, b.byteOffset, b.byteLength);
};

export const getLocalAddress = (): string => {
  const [ip] = os.networkInterfaces().eth0 || [];
  return ip.address;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
export function merge(target: any, source: any): any {
  const isObject = (obj: unknown) => obj && typeof obj === "object";

  if (!isObject(target) || !isObject(source)) {
    return source;
  }

  Object.keys(source).forEach((key) => {
    const targetValue = target[key];
    const sourceValue = source[key];

    if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
      // eslint-disable-next-line no-param-reassign
      target[key] = targetValue.concat(sourceValue);
    } else if (isObject(targetValue) && isObject(sourceValue)) {
      // eslint-disable-next-line no-param-reassign
      target[key] = merge({ ...targetValue }, sourceValue);
    } else {
      // eslint-disable-next-line no-param-reassign
      target[key] = sourceValue;
    }
  });

  return target;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
export function encodeCBOR(obj: any): Uint8Array {
  return cborg.encode(obj, { typeEncoders: { bigint: bigIntEncoder } });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function decodeCBOR(cbor: Uint8Array): any {
  try {
    const tags = [];
    tags[2] = bigIntDecoder;
    tags[3] = bigNegIntDecoder;
    return cborg.decode(cbor, { tags });
  } catch (err) {
    console.log("**** Encountered error: ", err);
    console.log(Buffer.from(cbor).toString("hex"));
    throw new Error("Error decoding");
  }
}

// https://stackoverflow.com/questions/58570325/how-to-turn-child-process-spawns-promise-syntax-to-async-await-syntax
export async function spawnChildProcess(
  cmd: string,
  args: string[],
  stdin: Buffer | undefined = undefined,
): Promise<Buffer> {
  const child = child_process.spawn(cmd, args);

  // Handle stdin.
  // https://github.com/sindresorhus/execa/issues/474
  if (stdin != undefined) {
    await child.stdin.write(stdin);
  }

  // Handle stdout.
  let stdout_chunks = Array<Buffer>();
  for await (const chunk of child.stdout) {
    stdout_chunks.push(chunk);
  }

  // Handle stderr.
  let stderr_chunks = Array<Buffer>();
  for await (const chunk of child.stderr) {
    stderr_chunks.push(chunk);
  }

  // Handle exit code.
  const exitCode = await new Promise((resolve, reject) => {
    child.on("close", resolve);
  });
  if (exitCode) {
    const stderr = Buffer.concat(stderr_chunks).toString();
    throw new Error(`subprocess error exit ${exitCode}, ${stderr}`);
  }

  return Buffer.concat(stdout_chunks);
}

export async function execChildProcess(shell_cmd: string): Promise<Buffer | string> {
  const exec = util.promisify(child_process.exec);
  const { stdout, stderr } = await exec(shell_cmd);
  return stdout;
}

export function removeCarriageReturn(str: string): string {
  const new_str = str.replace("\n", "").replace("\r", "").trim();
  return new_str;
}

export function currentUnixTime(): number {
  return Math.floor(Date.now() / 1000);
}
