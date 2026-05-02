import type { Request, Response, NextFunction } from "express";
import { Log } from "campus-logger-kit";
import { SchedulerHttpError } from "../domain/types";

export async function schedulerErrorMiddleware(
  caughtFailure: unknown,
  request: Request,
  response: Response,
  _next: NextFunction
): Promise<void> {
  const statusCode = caughtFailure instanceof SchedulerHttpError ? caughtFailure.statusCode : 500;
  const failureMessage = caughtFailure instanceof Error ? caughtFailure.message : "Unexpected scheduler failure.";

  await Log(
    "backend",
    "error",
    "handler",
    `Scheduler error on ${request.method} ${request.originalUrl}: ${failureMessage}`
  );

  response.status(statusCode).json({
    error: {
      message: failureMessage,
      statusCode
    }
  });
}
