import { Pool } from "pg";
import { Log } from "campus-logger-kit";
import { notificationEnv } from "../config/env.config";

export const notificationPool = new Pool({
  host: notificationEnv.db.host,
  port: notificationEnv.db.port,
  database: notificationEnv.db.database,
  user: notificationEnv.db.user,
  password: notificationEnv.db.password,
  max: 12,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000
});

export async function verifyDatabaseConnection(): Promise<void> {
  await Log("backend", "info", "db", `Opening PostgreSQL probe for database ${notificationEnv.db.database}`);
  await notificationPool.query("SELECT 1 AS connection_probe");
  await Log("backend", "info", "db", `PostgreSQL probe succeeded for database ${notificationEnv.db.database}`);
}

export async function prepareNotificationTable(): Promise<void> {
  await Log("backend", "info", "db", "Preparing notifications table and student feed indexes");

  await notificationPool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY,
      student_id TEXT NOT NULL,
      notification_type TEXT NOT NULL CHECK (notification_type IN ('Placement', 'Event', 'Result')),
      message TEXT NOT NULL,
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await notificationPool.query(`
    CREATE INDEX IF NOT EXISTS idx_notifications_student_created
      ON notifications (student_id, created_at DESC);
  `);

  await notificationPool.query(`
    CREATE INDEX IF NOT EXISTS idx_notifications_student_unread_created
      ON notifications (student_id, created_at DESC)
      WHERE is_read = FALSE;
  `);

  await Log("backend", "info", "db", "Notifications table and indexes are ready");
}
