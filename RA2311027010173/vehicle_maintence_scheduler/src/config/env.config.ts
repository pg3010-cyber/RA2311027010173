import dotenv from "dotenv";
import { Log } from "campus-logger-kit";

dotenv.config();

const portCandidate = Number(process.env.PORT ?? 3001);

export const schedulerEnv = {
  port: Number.isFinite(portCandidate) ? portCandidate : 3001,
  baseUrl: process.env.EVALUATION_BASE_URL ?? "http://20.207.122.201",
  token: process.env.EVALUATION_API_TOKEN
};

export function requireSchedulerToken(): string {
  if (!schedulerEnv.token) {
    throw new Error("EVALUATION_API_TOKEN is required before the scheduler can call protected evaluation APIs.");
  }

  return schedulerEnv.token;
}

export async function announceSchedulerConfig(): Promise<void> {
  await Log(
    "backend",
    "info",
    "config",
    `Vehicle scheduler booted with base URL ${schedulerEnv.baseUrl} and port ${schedulerEnv.port}`
  );
}
