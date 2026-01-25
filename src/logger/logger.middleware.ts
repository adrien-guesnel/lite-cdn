import { Logger } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

function getDurationInMilliseconds(start) {
  const NS_PER_SEC = 1e9;
  const NS_TO_MS = 1e6;
  const diff = process.hrtime(start);

  return (diff[0] * NS_PER_SEC + diff[1]) / NS_TO_MS;
}

export function loggerMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const logger = new Logger();
  const start = process.hrtime();

  logger.debug(`${req.method} - ${req.originalUrl} - start`);

  res.on("finish", () => {
    const durationInMilliseconds = getDurationInMilliseconds(start);
    logger.log(
      `${req.method} ${
        req.originalUrl
      } ${durationInMilliseconds.toLocaleString()} ms`
    );
  });

  next();
}
