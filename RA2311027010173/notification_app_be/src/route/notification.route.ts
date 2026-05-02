import { Router } from "express";
import { Log } from "campus-logger-kit";
import {
  createNotificationController,
  deleteNotificationController,
  getStudentNotificationsController,
  getUnreadNotificationsController,
  markReadController,
  priorityInboxController,
  unreadCountController
} from "../controller/notification.controller";

export const notificationRouter = Router();

notificationRouter.use(async (request, _response, next) => {
  const routeKey = request.params.studentId ?? request.params.id ?? request.originalUrl;
  await Log("backend", "info", "route", `Notification route hit: ${request.method} ${request.originalUrl}; key=${routeKey}`);
  next();
});

notificationRouter.post("/", createNotificationController);
notificationRouter.get("/unread/count/:studentId", unreadCountController);
notificationRouter.get("/priority/:studentId", priorityInboxController);
notificationRouter.get("/:studentId/unread", getUnreadNotificationsController);
notificationRouter.get("/:studentId", getStudentNotificationsController);
notificationRouter.patch("/:id/read", markReadController);
notificationRouter.delete("/:id", deleteNotificationController);
