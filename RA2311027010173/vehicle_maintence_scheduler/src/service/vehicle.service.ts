import { Log } from "campus-logger-kit";
import { requireSchedulerToken, schedulerEnv } from "../config/env.config";
import type { VehicleEnvelope, VehicleMaintenanceTask } from "../domain/types";
import { SchedulerHttpError } from "../domain/types";

export async function fetchVehicleTaskPool(): Promise<VehicleMaintenanceTask[]> {
  await Log("backend", "info", "service", "Fetching vehicle maintenance task pool from protected evaluation API");

  const vehicleReply = await fetch(`${schedulerEnv.baseUrl}/evaluation-service/vehicles`, {
    headers: {
      Authorization: `Bearer ${requireSchedulerToken()}`
    }
  });

  if (!vehicleReply.ok) {
    await Log("backend", "error", "handler", `Vehicle API rejected the scheduler request with HTTP ${vehicleReply.status}`);
    throw new SchedulerHttpError(502, `Unable to fetch vehicle tasks from evaluation API; HTTP ${vehicleReply.status}`);
  }

  const vehicleEnvelope = (await vehicleReply.json()) as VehicleEnvelope;
  const vehicleTaskPool = Array.isArray(vehicleEnvelope.vehicles) ? vehicleEnvelope.vehicles : [];

  await Log("backend", "info", "service", `Fetched ${vehicleTaskPool.length} vehicle maintenance tasks from evaluation API`);
  return vehicleTaskPool;
}

// commit 6