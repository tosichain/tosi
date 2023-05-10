import winston from "winston";
const { combine, printf, colorize } = winston.format;

import { LogRecord, sanitizeLogRecord } from "./record";

winston.addColors({
  error: "red",
  warn: "yellow",
  info: "green",
  debug: "cyan",
});

export interface LoggerOptions {
  name?: string;
  level?: string;
}

export default class Logger {
  private readonly name: string;
  private readonly winston: winston.Logger;

  constructor(name: string, level: string) {
    this.name = name;

    this.winston = winston.createLogger({
      level: level,
      transports: [
        new winston.transports.Console({
          format: combine(colorize({ level: true }), printf(formatter)),
        }),
      ],
    });
  }

  debug(message: string, tags?: string[] | string, details?: any): void {
    this.log("debug", message, tags, details);
  }

  info(message: string, tags?: string[] | string, details?: any): void {
    this.log("info", message, tags, details);
  }

  warn(message: string, tags?: string[] | string, details?: any): void {
    this.log("warn", message, tags, details);
  }

  error(message: string, err?: Error, tags?: string[] | string, details?: any): void {
    this.log("error", message, tags, details, err);
  }

  log(level: string, message: string, tags?: string[] | string, details?: any, err?: Error): void {
    const record: LogRecord = {
      message: message,
      tags: tags,
      details: details,
      err: err,
    };
    this.winston.log(sanitizeLogRecord(this.name, level, record));
  }
}

function formatter(info: winston.Logform.TransformableInfo) {
  let str = `${info.level}: ${info.message}`;
  if (info.err) {
    str = str.concat(`\n${info.err.stack}`);
  }
  if (info.tags) {
    str = str.concat(` | tags: ${info.tags}`);
  }
  if (info.details) {
    str = str.concat(` | details : ${info.details}`);
  }
  return str;
}
