import { Log } from "campus-logger-kit";
import type { NotificationRecord } from "../domain/notification.types";

interface CachePocket {
  expiresAt: number;
  hitCount: number;
  notificationShelf: NotificationRecord[];
}

const notificationCache = new Map<string, CachePocket>();
const baseTtlMs = 45_000;
const hotFeedBonusMs = 15_000;

export async function readStudentNotificationCache(studentId: string): Promise<NotificationRecord[] | undefined> {
  const cachePocket = notificationCache.get(studentId);

  if (!cachePocket) {
    await Log("backend", "debug", "cache", `Notification cache miss for student ${studentId}: no entry`);
    return undefined;
  }

  if (Date.now() > cachePocket.expiresAt) {
    notificationCache.delete(studentId);
    await Log("backend", "debug", "cache", `Notification cache miss for student ${studentId}: entry expired after ${cachePocket.hitCount} hits`);
    return undefined;
  }

  cachePocket.hitCount += 1;
  if (cachePocket.hitCount % 3 === 0) {
    cachePocket.expiresAt += hotFeedBonusMs;
  }

  await Log("backend", "debug", "cache", `Notification cache hit for student ${studentId}: ${cachePocket.notificationShelf.length} rows, hit ${cachePocket.hitCount}`);
  return cachePocket.notificationShelf;
}

export async function writeStudentNotificationCache(studentId: string, notificationShelf: NotificationRecord[]): Promise<void> {
  notificationCache.set(studentId, {
    expiresAt: Date.now() + baseTtlMs,
    hitCount: 0,
    notificationShelf
  });

  await Log("backend", "debug", "cache", `Notification cache stored ${notificationShelf.length} rows for student ${studentId}`);
}

export async function evictStudentNotificationCache(studentId: string): Promise<void> {
  const existedBefore = notificationCache.delete(studentId);
  await Log("backend", "debug", "cache", `Notification cache invalidation for student ${studentId}; existed=${existedBefore}`);
}
