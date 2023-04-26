import winston from "winston";

export const LEVELS: { [key: string]: number } = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const COLORS: { [key: string]: string | string[] } = {
  error: "red",
  warn: "yellow",
  info: "green",
  debug: "cyan",
};

winston.addColors(COLORS);

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize({ message: true })),
    }),
  ],
});

export default logger;
