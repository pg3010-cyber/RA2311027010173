import { loggerConfig } from "./config";
import type { LogLevel, LogPackage, LogResponse, LogStack } from "./types";

const acceptedStacks = new Set<LogStack>(["backend", "frontend"]);
const acceptedLevels = new Set<LogLevel>(["debug", "info", "warn", "error", "fatal"]);
const backendOnlyPackages = new Set<LogPackage>([
  "cache",
  "controller",
  "cron_job",
  "db",
  "domain",
  "handler",
  "repository",
  "route",
  "service"
]);
const crossStackPackages = new Set<LogPackage>(["auth", "config", "middleware", "utils"]);

const levelPaint: Record<LogLevel, string> = {
  debug: "\x1b[36m",
  info: "\x1b[32m",
  warn: "\x1b[33m",
  error: "\x1b[31m",
  fatal: "\x1b[35m"
};

const paintReset = "\x1b[0m";

const pause = (delayMs: number) =>
  new Promise<void>((wakeUp) => {
    setTimeout(wakeUp, delayMs);
  });

function validateLogShape(stack: LogStack, level: LogLevel, packageName: LogPackage, message: string): void {
  if (!acceptedStacks.has(stack)) {
    throw new Error(`Log stack "${stack}" is not allowed. Use backend or frontend in lowercase.`);
  }

  if (!acceptedLevels.has(level)) {
    throw new Error(`Log level "${level}" is not allowed. Use debug, info, warn, error, or fatal.`);
  }

  const packageAllowed = crossStackPackages.has(packageName) || (stack === "backend" && backendOnlyPackages.has(packageName));
  if (!packageAllowed) {
    throw new Error(`Log package "${packageName}" cannot be used for ${stack} logs.`);
  }

  if (typeof message !== "string" || message.trim().length === 0) {
    throw new Error("Log message must be a non-empty string that says what actually happened.");
  }
}

function printLocalLine(stack: LogStack, level: LogLevel, packageName: LogPackage, message: string): void {
  const stampedLine = `${new Date().toISOString()} ${stack}/${packageName} ${level.toUpperCase()} ${message}`;
  process.stdout.write(`${levelPaint[level]}${stampedLine}${paintReset}\n`);
}

async function sendLogOnce(stack: LogStack, level: LogLevel, packageName: LogPackage, message: string): Promise<LogResponse> {
  if (!loggerConfig.token) {
    return {
      logID: `local-${Date.now()}`,
      message: "log kept locally because EVALUATION_API_TOKEN is not configured"
    };
  }

  const loggingReply = await fetch(`${loggerConfig.baseUrl}/evaluation-service/logs`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${loggerConfig.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      stack,
      level,
      package: packageName,
      message
    })
  });

  if (!loggingReply.ok) {
    return {
      logID: `remote-rejected-${loggingReply.status}-${Date.now()}`,
      message: `remote logger returned HTTP ${loggingReply.status}`
    };
  }

  return (await loggingReply.json()) as LogResponse;
}

export async function Log(
  stack: LogStack,
  level: LogLevel,
  packageName: LogPackage,
  message: string
): Promise<LogResponse> {
  validateLogShape(stack, level, packageName, message);
  printLocalLine(stack, level, packageName, message);

  for (let attemptOrdinal = 0; attemptOrdinal <= loggerConfig.retryLimit; attemptOrdinal += 1) {
    try {
      return await sendLogOnce(stack, level, packageName, message);
    } catch (networkFailure) {
      const shouldRetry = attemptOrdinal < loggerConfig.retryLimit;
      if (shouldRetry) {
        await pause(loggerConfig.retryDelayMs);
        continue;
      }

      const failureLabel = networkFailure instanceof Error ? networkFailure.message : "unknown network failure";
      return {
        logID: `local-network-fallback-${Date.now()}`,
        message: `remote log failed after retries: ${failureLabel}`
      };
    }
  }

  return {
    logID: `local-unreachable-${Date.now()}`,
    message: "log stayed local after retry loop completed"
  };
}

export default Log;
