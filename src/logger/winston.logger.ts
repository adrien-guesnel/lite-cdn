import { createLogger, format, transports } from 'winston';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const LokiTransport = require('winston-loki');

// custom log display format
const customFormat = format.printf(({ timestamp, level, stack, message }) => {
  return `${timestamp} - [${level.toUpperCase().padEnd(7)}] - ${message} ${
    stack ? `\n${stack}` : ''
  }`;
});

const options = {
  file: {
    filename: 'logs/error.log',
    level: 'error',
  },
  console: {
    level: 'silly',
  },
};

// for development environment
const devLogger = {
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    customFormat,
    format.colorize({ all: true }),
  ),
  transports: [new transports.Console(options.console)],
};

// for production environment
const prodLogger = {
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json(),
  ),
  transports: [
    new transports.File(options.file),
    new transports.File({
      filename: 'logs/combine.log',
      level: 'info',
    }),
  ],
};

if (process.env.LOKI_URL) {
  prodLogger.transports.push(
    new LokiTransport({
      host: process.env.LOKI_URL,
      labels: { app: 'lite-cdn' },
      json: true,
      format: format.json(),
    }),
  );
}

// export log instance based on the current environment
const instanceLogger =
  process.env.NODE_ENV === 'production' ? prodLogger : devLogger;

export const instance = createLogger(instanceLogger);
