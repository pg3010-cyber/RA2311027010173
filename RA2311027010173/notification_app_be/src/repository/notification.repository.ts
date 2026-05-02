import { randomUUID } from "crypto";
import { Log } from "campus-logger-kit";
import { notificationPool } from "../db/connection";
import type { CreateNotificationPayload, NotificationRecord } from "../domain/notification.types";

function mapNotificationRow(rowPacket: Record<string, unknown>): NotificationRecord {
  return {
    id: String(rowPacket.id),
    studentId: String(rowPacket.student_id),
    notificationType: rowPacket.notification_type as NotificationRecord["notificationType"],
    message: String(rowPacket.message),
    isRead: Boolean(rowPacket.is_read),
    createdAt: new Date(rowPacket.created_at as string).toISOString(),
    updatedAt: new Date(rowPacket.updated_at as string).toISOString()
  };
}

export async function insertNotification(alertPayload: CreateNotificationPayload): Promise<NotificationRecord> {
  const notificationId = randomUUID();
  const queryParameters = [
    notificationId,
    alertPayload.studentId,
    alertPayload.notificationType,
    alertPayload.message
  ];

  await Log("backend", "debug", "repository", `DB insert notification with parameters id=${notificationId}, studentId=${alertPayload.studentId}, type=${alertPayload.notificationType}`);

  const insertedRows = await notificationPool.query(
    `
      INSERT INTO notifications (id, student_id, notification_type, message)
      VALUES ($1, $2, $3, $4)
      RETURNING id, student_id, notification_type, message, is_read, created_at, updated_at;
    `,
    queryParameters
  );

  return mapNotificationRow(insertedRows.rows[0]);
}

export async function selectNotificationsByStudent(studentId: string): Promise<NotificationRecord[]> {
  await Log("backend", "debug", "repository", `DB select all notifications with parameters studentId=${studentId}`);

  const selectedRows = await notificationPool.query(
    `
      SELECT id, student_id, notification_type, message, is_read, created_at, updated_at
      FROM notifications
      WHERE student_id = $1
      ORDER BY created_at DESC;
    `,
    [studentId]
  );

  return selectedRows.rows.map(mapNotificationRow);
}

export async function selectUnreadNotificationsByStudent(studentId: string): Promise<NotificationRecord[]> {
  await Log("backend", "debug", "repository", `DB select unread notifications with parameters studentId=${studentId}`);

  const selectedRows = await notificationPool.query(
    `
      SELECT id, student_id, notification_type, message, is_read, created_at, updated_at
      FROM notifications
      WHERE student_id = $1 AND is_read = FALSE
      ORDER BY created_at DESC;
    `,
    [studentId]
  );

  return selectedRows.rows.map(mapNotificationRow);
}

export async function updateNotificationAsRead(notificationId: string): Promise<NotificationRecord | undefined> {
  await Log("backend", "debug", "repository", `DB mark notification read with parameters id=${notificationId}`);

  const updatedRows = await notificationPool.query(
    `
      UPDATE notifications
      SET is_read = TRUE, updated_at = NOW()
      WHERE id = $1
      RETURNING id, student_id, notification_type, message, is_read, created_at, updated_at;
    `,
    [notificationId]
  );

  return updatedRows.rows[0] ? mapNotificationRow(updatedRows.rows[0]) : undefined;
}

export async function deleteNotificationById(notificationId: string): Promise<NotificationRecord | undefined> {
  await Log("backend", "debug", "repository", `DB delete notification with parameters id=${notificationId}`);

  const deletedRows = await notificationPool.query(
    `
      DELETE FROM notifications
      WHERE id = $1
      RETURNING id, student_id, notification_type, message, is_read, created_at, updated_at;
    `,
    [notificationId]
  );

  return deletedRows.rows[0] ? mapNotificationRow(deletedRows.rows[0]) : undefined;
}

export async function countUnreadNotifications(studentId: string): Promise<number> {
  await Log("backend", "debug", "repository", `DB count unread notifications with parameters studentId=${studentId}`);

  const countedRows = await notificationPool.query(
    `
      SELECT COUNT(*)::INT AS unread_total
      FROM notifications
      WHERE student_id = $1 AND is_read = FALSE;
    `,
    [studentId]
  );

  return Number(countedRows.rows[0]?.unread_total ?? 0);
}
