import type { Request, Response, NextFunction } from "express";
import { Log } from "campus-logger-kit";
import { NotificationHttpError } from "../domain/notification.types";

export async function notificationErrorMiddleware(
  caughtFailure: unknown,
  request: Request,
  response: Response,
  _next: NextFunction
): Promise<void> {
  const statusCode = caughtFailure instanceof NotificationHttpError ? caughtFailure.statusCode : 500;
  const failureMessage = caughtFailure instanceof Error ? caughtFailure.message : "Unexpected notification service failure.";

  await Log(
    "backend",
    "error",
    "handler",
    `Notification error on ${request.method} ${request.originalUrl}: ${failureMessage}`
  );

  response.status(statusCode).json({
    success: false,
    error: {
      message: failureMessage,
      statusCode
    }
  });
}
