import { Log } from "campus-logger-kit";
import {
  evictStudentNotificationCache,
  readStudentNotificationCache,
  writeStudentNotificationCache
} from "../cache/notification.cache";
import {
  countUnreadNotifications,
  deleteNotificationById,
  insertNotification,
  selectNotificationsByStudent,
  selectUnreadNotificationsByStudent,
  updateNotificationAsRead
} from "../repository/notification.repository";
import {
  CreateNotificationPayload,
  NotificationHttpError,
  NotificationRecord,
  NotificationType,
  PriorityNotification
} from "../domain/notification.types";
import { rankPriorityInbox } from "./priority.service";

function assertStudentId(studentId: string): void {
  if (!studentId || studentId.trim().length < 2) {
    throw new NotificationHttpError(400, "studentId must contain at least two visible characters.");
  }
}

function assertNotificationId(notificationId: string): void {
  const uuidShape = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidShape.test(notificationId)) {
    throw new NotificationHttpError(400, "notification id must be a valid UUID.");
  }
}

function validateCreatePayload(alertPayload: CreateNotificationPayload): void {
  assertStudentId(alertPayload.studentId);

  if (!Object.values(NotificationType).includes(alertPayload.notificationType)) {
    throw new NotificationHttpError(400, "notificationType must be Placement, Event, or Result.");
  }

  if (!alertPayload.message || alertPayload.message.trim().length < 3) {
    throw new NotificationHttpError(400, "message must contain at least three visible characters.");
  }
}

export async function createNotification(alertPayload: CreateNotificationPayload): Promise<NotificationRecord> {
  try {
    validateCreatePayload(alertPayload);
  } catch (validationFailure) {
    const failureMessage = validationFailure instanceof Error ? validationFailure.message : "invalid notification payload";
    await Log("backend", "warn", "service", `Create notification validation failed: ${failureMessage}`);
    throw validationFailure;
  }

  await Log("backend", "info", "service", `Creating ${alertPayload.notificationType} notification for student ${alertPayload.studentId}`);
  const createdNotification = await insertNotification(alertPayload);
  await evictStudentNotificationCache(alertPayload.studentId);
  await Log("backend", "info", "service", `Created notification ${createdNotification.id} for student ${createdNotification.studentId}`);
  return createdNotification;
}

export async function getStudentNotifications(studentId: string): Promise<NotificationRecord[]> {
  assertStudentId(studentId);
  await Log("backend", "info", "service", `Loading all notifications for student ${studentId}`);

  const cachedShelf = await readStudentNotificationCache(studentId);
  if (cachedShelf) {
    return cachedShelf;
  }

  const notificationShelf = await selectNotificationsByStudent(studentId);
  await writeStudentNotificationCache(studentId, notificationShelf);
  await Log("backend", "info", "service", `Loaded ${notificationShelf.length} notifications for student ${studentId}`);
  return notificationShelf;
}

export async function getUnreadStudentNotifications(studentId: string): Promise<NotificationRecord[]> {
  assertStudentId(studentId);
  await Log("backend", "info", "service", `Loading unread notifications for student ${studentId}`);
  const unreadShelf = await selectUnreadNotificationsByStudent(studentId);
  await Log("backend", "info", "service", `Loaded ${unreadShelf.length} unread notifications for student ${studentId}`);
  return unreadShelf;
}

export async function markNotificationRead(notificationId: string): Promise<NotificationRecord> {
  assertNotificationId(notificationId);
  await Log("backend", "info", "service", `Marking notification ${notificationId} as read`);

  const updatedNotification = await updateNotificationAsRead(notificationId);
  if (!updatedNotification) {
    throw new NotificationHttpError(404, `Notification ${notificationId} was not found.`);
  }

  await evictStudentNotificationCache(updatedNotification.studentId);
  await Log("backend", "info", "service", `Marked notification ${notificationId} as read for student ${updatedNotification.studentId}`);
  return updatedNotification;
}

export async function removeNotification(notificationId: string): Promise<void> {
  assertNotificationId(notificationId);
  await Log("backend", "info", "service", `Deleting notification ${notificationId}`);

  const deletedNotification = await deleteNotificationById(notificationId);
  if (!deletedNotification) {
    throw new NotificationHttpError(404, `Notification ${notificationId} was not found.`);
  }

  await evictStudentNotificationCache(deletedNotification.studentId);
  await Log("backend", "info", "service", `Deleted notification ${notificationId} for student ${deletedNotification.studentId}`);
}

export async function getUnreadCount(studentId: string): Promise<number> {
  assertStudentId(studentId);
  await Log("backend", "info", "service", `Counting unread notifications for student ${studentId}`);
  const unreadTotal = await countUnreadNotifications(studentId);
  await Log("backend", "info", "service", `Unread count for student ${studentId} is ${unreadTotal}`);
  return unreadTotal;
}

export async function getPriorityInbox(studentId: string): Promise<PriorityNotification[]> {
  assertStudentId(studentId);
  await Log("backend", "info", "service", `Building priority inbox for student ${studentId}`);
  const unreadShelf = await selectUnreadNotificationsByStudent(studentId);
  const priorityShelf = rankPriorityInbox(unreadShelf, 10);
  await Log("backend", "info", "service", `Priority inbox for student ${studentId} contains ${priorityShelf.length} notifications`);
  return priorityShelf;
}
