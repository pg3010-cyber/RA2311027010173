import cors from "cors";
import express from "express";
import { Log } from "campus-logger-kit";
import { announceNotificationConfig, notificationEnv } from "./config/env.config";
import { prepareNotificationTable, verifyDatabaseConnection } from "./db/connection";
import { notificationErrorMiddleware } from "./middleware/error.middleware";
import { notificationRouter } from "./route/notification.route";

const notificationApp = express();

notificationApp.use(cors());
notificationApp.use(express.json({ limit: "1mb" }));

notificationApp.get("/", (_request, response) => {
  response.status(200).json({
    service: "notification-app-be",
    status: "running",
    routes: {
      create: "POST /api/notifications",
      allForStudent: "GET /api/notifications/:studentId",
      unreadForStudent: "GET /api/notifications/:studentId/unread",
      markRead: "PATCH /api/notifications/:id/read",
      remove: "DELETE /api/notifications/:id",
      unreadCount: "GET /api/notifications/unread/count/:studentId",
      priorityInbox: "GET /api/notifications/priority/:studentId"
    }
  });
});

notificationApp.get("/health", (_request, response) => {
  response.status(200).json({
    service: "notification-app-be",
    healthy: true,
    checkedAt: new Date().toISOString()
  });
});

notificationApp.use("/api/notifications", notificationRouter);
notificationApp.use(notificationErrorMiddleware);

async function startNotificationServer(): Promise<void> {
  await announceNotificationConfig();
  await verifyDatabaseConnection();
  await prepareNotificationTable();

  notificationApp.listen(notificationEnv.port, async () => {
    await Log("backend", "info", "config", `Notification API is listening on port ${notificationEnv.port}`);
  });
}

void startNotificationServer().catch(async (startupFailure) => {
  const failureMessage = startupFailure instanceof Error ? startupFailure.message : "unknown startup failure";
  await Log("backend", "fatal", "handler", `Notification API could not start: ${failureMessage}`);
  process.exit(1);
});

export { notificationApp };
