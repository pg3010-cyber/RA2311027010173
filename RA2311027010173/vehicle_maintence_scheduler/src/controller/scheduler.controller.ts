import type { Request, Response, NextFunction } from "express";
import { Log } from "campus-logger-kit";
import { fetchDepotRoster } from "../service/depot.service";
import { optimizeDepotWork } from "../service/scheduler.service";
import { fetchVehicleTaskPool } from "../service/vehicle.service";

export async function listDepots(_request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    await Log("backend", "debug", "controller", "Entering listDepots controller for depot roster request");
    const depotRoster = await fetchDepotRoster();
    await Log("backend", "debug", "controller", `Exiting listDepots controller with ${depotRoster.length} depots`);
    response.status(200).json({ depots: depotRoster });
  } catch (caughtFailure) {
    next(caughtFailure);
  }
}

export async function listVehicles(_request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    await Log("backend", "debug", "controller", "Entering listVehicles controller for task pool request");
    const vehicleTaskPool = await fetchVehicleTaskPool();
    await Log("backend", "debug", "controller", `Exiting listVehicles controller with ${vehicleTaskPool.length} vehicle tasks`);
    response.status(200).json({ vehicles: vehicleTaskPool });
  } catch (caughtFailure) {
    next(caughtFailure);
  }
}

export async function optimizeSchedule(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const depotId = Number(request.body?.depotId);
    await Log("backend", "debug", "controller", `Entering optimizeSchedule controller for depot ID ${depotId}`);
    const optimizationReport = await optimizeDepotWork(depotId);
    await Log(
      "backend",
      "debug",
      "controller",
      `Exiting optimizeSchedule controller for depot ID ${depotId} with impact ${optimizationReport.totalImpact}`
    );
    response.status(200).json(optimizationReport);
  } catch (caughtFailure) {
    next(caughtFailure);
  }
}
