import dotenv from "dotenv";

dotenv.config();

const DEFAULT_BASE_URL = "http://20.207.122.201";

export interface LoggerRuntimeConfig {
  baseUrl: string;
  token?: string;
  retryLimit: number;
  retryDelayMs: number;
}

export const loggerConfig: LoggerRuntimeConfig = {
  baseUrl: process.env.EVALUATION_BASE_URL ?? DEFAULT_BASE_URL,
  token: process.env.EVALUATION_API_TOKEN,
  retryLimit: 2,
  retryDelayMs: 500
};

// commit2