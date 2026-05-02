export interface DepotCapacityRecord {
  ID: number;
  MechanicHours: number;
}

export interface VehicleMaintenanceTask {
  TaskID: string;
  Duration: number;
  Impact: number;
}

export interface DepotEnvelope {
  depots: DepotCapacityRecord[];
}

export interface VehicleEnvelope {
  vehicles: VehicleMaintenanceTask[];
}

export interface OptimizationRequestBody {
  depotId: number;
}

export interface OptimizationReport {
  depotId: number;
  budget: number;
  selectedTasks: VehicleMaintenanceTask[];
  totalDuration: number;
  totalImpact: number;
  tasksCount: number;
}

export class SchedulerHttpError extends Error {
  public readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}
