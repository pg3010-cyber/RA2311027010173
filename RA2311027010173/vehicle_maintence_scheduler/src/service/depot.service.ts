import { Log } from "campus-logger-kit";
import { requireSchedulerToken, schedulerEnv } from "../config/env.config";
import type { DepotCapacityRecord, DepotEnvelope } from "../domain/types";
import { SchedulerHttpError } from "../domain/types";

export async function fetchDepotRoster(): Promise<DepotCapacityRecord[]> {
  await Log("backend", "info", "service", "Fetching depot capacity roster from protected evaluation API");

  const depotReply = await fetch(`${schedulerEnv.baseUrl}/evaluation-service/depots`, {
    headers: {
      Authorization: `Bearer ${requireSchedulerToken()}`
    }
  });

  if (!depotReply.ok) {
    await Log("backend", "error", "handler", `Depot API rejected the scheduler request with HTTP ${depotReply.status}`);
    throw new SchedulerHttpError(502, `Unable to fetch depots from evaluation API; HTTP ${depotReply.status}`);
  }

  const depotEnvelope = (await depotReply.json()) as DepotEnvelope;
  const depotRoster = Array.isArray(depotEnvelope.depots) ? depotEnvelope.depots : [];

  await Log("backend", "info", "service", `Fetched ${depotRoster.length} depot capacity records from evaluation API`);
  return depotRoster;
}

export async function findDepotCapacity(depotId: number): Promise<DepotCapacityRecord> {
  const depotRoster = await fetchDepotRoster();
  const matchingDepot = depotRoster.find((depotRecord) => depotRecord.ID === depotId);

  if (!matchingDepot) {
    await Log("backend", "warn", "service", `Depot ID ${depotId} was not present in a roster of ${depotRoster.length} depots`);
    throw new SchedulerHttpError(404, `Depot ID ${depotId} was not found.`);
  }

  return matchingDepot;
}

// commit5