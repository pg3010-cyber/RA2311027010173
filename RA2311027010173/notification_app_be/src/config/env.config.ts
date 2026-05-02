import dotenv from "dotenv";
import { Log } from "campus-logger-kit";

dotenv.config();

const portCandidate = Number(process.env.PORT ?? 3000);
const dbPortCandidate = Number(process.env.DB_PORT ?? 5432);

export const notificationEnv = {
  port: Number.isFinite(portCandidate) ? portCandidate : 3000,
  baseUrl: process.env.EVALUATION_BASE_URL ?? "http://20.207.122.201",
  token: process.env.EVALUATION_API_TOKEN,
  db: {
    host: process.env.DB_HOST ?? "localhost",
    port: Number.isFinite(dbPortCandidate) ? dbPortCandidate : 5432,
    database: process.env.DB_NAME ?? "campus_notifications",
    user: process.env.DB_USER ?? "postgres",
    password: process.env.DB_PASSWORD ?? "postgres"
  }
};

export async function announceNotificationConfig(): Promise<void> {
  await Log(
    "backend",
    "info",
    "config",
    `Notification API booted on port ${notificationEnv.port} with database ${notificationEnv.db.database}@${notificationEnv.db.host}`
  );
}
