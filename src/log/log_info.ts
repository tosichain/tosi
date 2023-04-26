export interface LogInfo {
  "@timestamp"?: string;
  message?: string;
  tags?: string[];
  details?: any;
  err?: Error;
}

// Fields allowed in LogInfo
export const ALLOWED_FIELDS = ["@timestamp", "message", "tags", "details", "err"];

export interface SanitizedLogInfo extends LogInfo {
  level: string;
  message: string;
  name?: string;
  droppedFields?: string[];
}

/**
 * Validate a LogInfo object.
 * @param info - The object to validate.
 * @returns - Undefined if object is OK, otherwise a list of bad fields.
 */
export function findExtraFields(info: unknown): string[] | undefined {
  let result: string[] | undefined;

  if (!info || typeof info !== "object") {
    return undefined;
  }

  for (const key of Object.keys(info as any)) {
    if (!ALLOWED_FIELDS.includes(key)) {
      result = result || [];
      result.push(key);
    }
  }

  return result;
}

function sanitizeTags(tags: string | string[] | undefined) {
  let result: string[] | undefined;

  if (tags) {
    if (Array.isArray(tags)) {
      result = tags;
    } else if (typeof (tags === "string")) {
      result = [tags];
    }
  }

  return result;
}

export function sanitizeLogInfo(
  loggerName: string | undefined,
  level: string,
  message: string,
  info: LogInfo,
  loggerTags: string[] | undefined,
): SanitizedLogInfo {
  const result: SanitizedLogInfo = {
    level,
    message: info.message || message,
  };

  if (loggerName) {
    result.name = loggerName;
  }
  const tags = sanitizeTags(info.tags || loggerTags);
  if (tags && tags.length) {
    result.tags = tags;
  }
  if (info.err) {
    result.err = info.err;
  }
  const droppedFields = findExtraFields(info);
  if (droppedFields) {
    result.droppedFields = droppedFields;
  }

  if (info.details) {
    if (typeof info.details === "string") {
      result.details = info.details;
    } else {
      try {
        result.details = JSON.stringify(info.details);
      } catch (err: any) {
        result.details = `Logger could not stringify: ${err.toString()}`;
      }
    }
  }

  return result;
}
