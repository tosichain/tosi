export interface LogRecord {
  "@timestamp"?: string;
  message: string;
  tags?: string[] | string;
  details?: any;
  err?: Error;
}

// Fields, allowed in log record.
export const ALLOWED_FIELDS = ["@timestamp", "message", "tags", "details", "err"];

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
      try {
        result.details = JSON.stringify(record.details);
      } catch (err: any) {
        result.details = `Logger could not stringify: ${err.toString()}`;
      }
    }
  }

  if (record.err) {
    result.err = record.err;
  }

  return result;
}

function sanitizeTags(tags: string | string[]): string[] {
  let result: string[] = [];
  if (Array.isArray(tags)) {
    result = tags;
  } else if (typeof (tags === "string")) {
    result = [tags];
  }

  return result;
}
