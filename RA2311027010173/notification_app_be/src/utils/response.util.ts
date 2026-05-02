import type { Response } from "express";

export function sendOk<TPayload>(response: Response, payload: TPayload, statusCode = 200): void {
  response.status(statusCode).json({
    success: true,
    payload
  });
}

export function sendRemoved(response: Response): void {
  response.status(204).send();
}
