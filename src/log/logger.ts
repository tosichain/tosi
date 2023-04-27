import { default as winston, LEVELS } from "./winston";
import { LogRecord, sanitizeLogRecord } from "./record";

const DEFAULT_LEVEL: keyof typeof LEVELS = "info";

export interface LoggerOptions {
  name?: string;
}

export default class Logger {
  private readonly level: number;
  private readonly name: string | undefined;
  private readonly winston = winston;

  constructor(options: LoggerOptions = {}) {
    this.name = options.name;
    this.level = LEVELS[DEFAULT_LEVEL];
  }

  debug(message: string, tags?: string[] | string, details?: any): void {
    this.log("debug", message, tags, details);
  }
  isDebugEnabled(): boolean {
    return this.isLevelEnabled("debug");
  }

  info(message: string, tags?: string[] | string, details?: any): void {
    this.log("info", message, tags, details);
  }
  isInfoEnabled(): boolean {
    return this.isLevelEnabled("info");
  }

  warn(message: string, tags?: string[] | string, details?: any): void {
    this.log("warn", message, tags, details);
  }
  isWarnEnabled(): boolean {
    return this.isLevelEnabled("warn");
  }

  error(message: string, err?: Error, tags?: string[] | string, details?: any): void {
    this.log("error", message, tags, details, err);
  }
  isErrorEnabled(): boolean {
    return this.isLevelEnabled("error");
  }

  log(level: string, message: string, tags?: string[] | string, details?: any, err?: Error): void {
    if (!this.isLevelEnabled(level)) {
      return;
    }

    const record: LogRecord = {
      message: message,
      tags: tags,
      details: details,
      err: err,
    };
    this.winston.log(sanitizeLogRecord(this.name, level, record));
  }

  isLevelEnabled(level: string): boolean {
    const levelNumber = LEVELS[level];
    if (levelNumber === undefined) {
      return false;
    }
    return levelNumber <= this.level;
  }
}
