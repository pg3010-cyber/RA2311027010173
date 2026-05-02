import { Log } from "campus-logger-kit";
import type { OptimizationReport } from "../domain/types";
import { SchedulerHttpError } from "../domain/types";
import { chooseMaintenancePortfolio } from "../utils/knapsack";
import { findDepotCapacity } from "./depot.service";
import { fetchVehicleTaskPool } from "./vehicle.service";

export async function optimizeDepotWork(depotId: number): Promise<OptimizationReport> {
  if (!Number.isInteger(depotId) || depotId <= 0) {
    await Log("backend", "warn", "service", `Optimization rejected invalid depotId value ${depotId}`);
    throw new SchedulerHttpError(400, "depotId must be a positive integer.");
  }

  const depotCapacity = await findDepotCapacity(depotId);
  const vehicleTaskPool = await fetchVehicleTaskPool();

  await Log(
    "backend",
    "info",
    "service",
    `Knapsack optimizer received ${vehicleTaskPool.length} tasks, budget ${depotCapacity.MechanicHours} hours for depot ID ${depotId}`
  );

  const impactLedger = chooseMaintenancePortfolio(vehicleTaskPool, depotCapacity.MechanicHours);

  await Log(
    "backend",
    "info",
    "service",
    `Knapsack optimizer finished depot ID ${depotId}: selected ${impactLedger.selectedTasks.length} tasks, duration ${impactLedger.totalDuration}, impact ${impactLedger.totalImpact}`
  );

  return {
    depotId,
    budget: depotCapacity.MechanicHours,
    selectedTasks: impactLedger.selectedTasks,
    totalDuration: impactLedger.totalDuration,
    totalImpact: impactLedger.totalImpact,
    tasksCount: impactLedger.selectedTasks.length
  };
}
