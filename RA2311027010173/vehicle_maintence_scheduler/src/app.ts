import cors from "cors";
import express from "express";
import { Log } from "campus-logger-kit";
import { schedulerEnv, announceSchedulerConfig } from "./config/env.config";
import { schedulerErrorMiddleware } from "./middleware/error.middleware";
import { schedulerRouter } from "./route/scheduler.route";

const schedulerApp = express();

schedulerApp.use(cors());
schedulerApp.use(express.json({ limit: "1mb" }));

schedulerApp.get("/", (_request, response) => {
  response.status(200).json({
    notifications: [
      {
        ID: "d146095a-9d86-4a34-9e69-3900a14576bc",
        Type: "Result",
        Message: "mid-sem",
        Timestamp: "2026-04-22 17:51:30"
      },
      {
        ID: "b283218f-ea5a-4b7c-93a9-1f2f240d64b0",
        Type: "Placement",
        Message: "CSX Corporation hiring",
        Timestamp: "2026-04-22 17:51:18"
      },
      {
        ID: "81589ada-0ad3-4f77-9554-f52fb558e09d",
        Type: "Event",
        Message: "farewell",
        Timestamp: "2026-04-22 17:51:06"
      },
      {
        ID: "0005513a-142b-4bbc-8678-eefec65e1ede",
        Type: "Result",
        Message: "mid-sem",
        Timestamp: "2026-04-22 17:50:54"
      },
      {
        ID: "ea836726-c25e-4f21-a72f-544a6af8a37f",
        Type: "Result",
        Message: "external",
        Timestamp: "2026-04-22 17:50:30"
      }
    ]
  });
});

schedulerApp.get("/health", (_request, response) => {
  response.status(200).json({
    service: "vehicle-maintence-scheduler",
    healthy: true,
    checkedAt: new Date().toISOString()
  });
});

schedulerApp.use("/api/scheduler", schedulerRouter);
schedulerApp.use(schedulerErrorMiddleware);

async function startSchedulerServer(): Promise<void> {
  await announceSchedulerConfig();

  schedulerApp.listen(schedulerEnv.port, async () => {
    await Log("backend", "info", "config", `Vehicle scheduler API is listening on port ${schedulerEnv.port}`);
  });
}

void startSchedulerServer().catch(async (startupFailure) => {
  const failureMessage = startupFailure instanceof Error ? startupFailure.message : "unknown startup failure";
  await Log("backend", "fatal", "handler", `Vehicle scheduler could not start: ${failureMessage}`);
  process.exit(1);
});

export { schedulerApp };
