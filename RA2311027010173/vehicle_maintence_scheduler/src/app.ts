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
    service: "vehicle-maintence-scheduler",
    status: "running",
    routes: {
      depots: "GET /api/scheduler/depots",
      vehicles: "GET /api/scheduler/vehicles",
      optimize: "POST /api/scheduler/optimize"
    }
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
