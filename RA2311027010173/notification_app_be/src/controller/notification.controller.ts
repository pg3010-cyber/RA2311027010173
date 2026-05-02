import type { Request, Response, NextFunction } from "express";
import { Log } from "campus-logger-kit";
import {
  createNotification,
  getPriorityInbox,
  getStudentNotifications,
  getUnreadCount,
  getUnreadStudentNotifications,
  markNotificationRead,
  removeNotification
} from "../service/notification.service";
import { sendOk, sendRemoved } from "../utils/response.util";
import type { CreateNotificationPayload } from "../domain/notification.types";

export async function createNotificationController(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    await Log("backend", "debug", "controller", `Controller entered createNotification for student ${request.body?.studentId}`);
    const createdNotification = await createNotification(request.body as CreateNotificationPayload);
    sendOk(response, createdNotification, 201);
  } catch (caughtFailure) {
    next(caughtFailure);
  }
}

export async function getStudentNotificationsController(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const studentId = request.params.studentId;
    await Log("backend", "debug", "controller", `Controller entered getStudentNotifications for student ${studentId}`);
    const notificationShelf = await getStudentNotifications(studentId);
    sendOk(response, { notifications: notificationShelf });
  } catch (caughtFailure) {
    next(caughtFailure);
  }
}

export async function getUnreadNotificationsController(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const studentId = request.params.studentId;
    await Log("backend", "debug", "controller", `Controller entered getUnreadNotifications for student ${studentId}`);
    const unreadShelf = await getUnreadStudentNotifications(studentId);
    sendOk(response, { notifications: unreadShelf });
  } catch (caughtFailure) {
    next(caughtFailure);
  }
}

export async function markReadController(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const notificationId = request.params.id;
    await Log("backend", "debug", "controller", `Controller entered markRead for notification ${notificationId}`);
    const updatedNotification = await markNotificationRead(notificationId);
    sendOk(response, updatedNotification);
  } catch (caughtFailure) {
    next(caughtFailure);
  }
}

export async function deleteNotificationController(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const notificationId = request.params.id;
    await Log("backend", "debug", "controller", `Controller entered deleteNotification for notification ${notificationId}`);
    await removeNotification(notificationId);
    sendRemoved(response);
  } catch (caughtFailure) {
    next(caughtFailure);
  }
}

export async function unreadCountController(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const studentId = request.params.studentId;
    await Log("backend", "debug", "controller", `Controller entered unreadCount for student ${studentId}`);
    const unreadCount = await getUnreadCount(studentId);
    sendOk(response, { studentId, unreadCount });
  } catch (caughtFailure) {
    next(caughtFailure);
  }
}

export async function priorityInboxController(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const studentId = request.params.studentId;
    await Log("backend", "debug", "controller", `Controller entered priorityInbox for student ${studentId}`);
    const priorityShelf = await getPriorityInbox(studentId);
    sendOk(response, { notifications: priorityShelf });
  } catch (caughtFailure) {
    next(caughtFailure);
  }
}
