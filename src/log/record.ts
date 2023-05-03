import { configure } from "safe-stable-stringify";
import MerkleTree from "merkletreejs";
import { CID } from "ipfs-http-client";

import { bytesToHex } from "../blockchain/util";

const stringify = configure({
  bigint: true,
  deterministic: true,
});

export interface LogRecord {
  message: string;
  tags?: string[] | string;
  details?: any;
  err?: Error;
}

export interface SanitizedLogRecord extends LogRecord {
  level: string;
  name?: string;
}

export function sanitizeLogRecord(
  loggerName: string | undefined,
  level: string,
  record: LogRecord,
): SanitizedLogRecord {
  const result: SanitizedLogRecord = {
    level,
    message: record.message as string,
  };

  if (loggerName) {
    result.name = loggerName;
  }

  if (record.tags) {
    const tags = sanitizeTags(record.tags);
    if (tags && tags.length) {
      result.tags = tags;
    }
  }

  if (record.details) {
    if (typeof record.details === "string") {
      result.details = record.details;
    } else {
      result.details = stringifyObject(record.details);
    }
  }

  if (record.err) {
    result.err = record.err;
  }

  return result;
}

function sanitizeTags(tags: string | string[]): string {
  let result: string[] = [];
  if (Array.isArray(tags)) {
    result = tags;
  } else if (typeof (tags == "string")) {
    result = [tags];
  }
  return JSON.stringify(result);
}

function stringifyObject(object: any): string | undefined {
  return stringify(object, (key: string, value: any): any => {
    if (value instanceof Buffer) {
      return bytesToHex(Uint8Array.from(value));
    } else if (value instanceof Uint8Array) {
      return bytesToHex(value);
    } else if (value instanceof MerkleTree) {
      return value.getHexRoot();
    } else if (value instanceof CID) {
      return value.toString();
    }
    return value;
  });
}
