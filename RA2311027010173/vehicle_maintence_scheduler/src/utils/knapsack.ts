import type { VehicleMaintenanceTask } from "../domain/types";

export interface KnapsackLedger {
  selectedTasks: VehicleMaintenanceTask[];
  totalDuration: number;
  totalImpact: number;
}

export function chooseMaintenancePortfolio(vehicleTaskPool: VehicleMaintenanceTask[], mechanicHourBudget: number): KnapsackLedger {
  const depotCapacity = Math.max(0, Math.trunc(mechanicHourBudget));
  const impactLedger = new Int32Array(depotCapacity + 1);
  const keptTaskGrid: Uint8Array[] = [];

  for (const taskCandidate of vehicleTaskPool) {
    const taskDuration = Math.trunc(taskCandidate.Duration);
    const taskImpact = Math.trunc(taskCandidate.Impact);
    const rowMemory = new Uint8Array(depotCapacity + 1);

    if (taskDuration <= 0 || taskImpact < 0 || taskDuration > depotCapacity) {
      keptTaskGrid.push(rowMemory);
      continue;
    }

    for (let hoursCursor = depotCapacity; hoursCursor >= taskDuration; hoursCursor -= 1) {
      const impactIfParked = impactLedger[hoursCursor];
      const impactIfChosen = impactLedger[hoursCursor - taskDuration] + taskImpact;

      if (impactIfChosen > impactIfParked) {
        impactLedger[hoursCursor] = impactIfChosen;
        rowMemory[hoursCursor] = 1;
      }
    }

    keptTaskGrid.push(rowMemory);
  }

  const selectedTasks: VehicleMaintenanceTask[] = [];
  let remainingHours = depotCapacity;

  for (let taskIndex = vehicleTaskPool.length - 1; taskIndex >= 0; taskIndex -= 1) {
    const taskCandidate = vehicleTaskPool[taskIndex];
    const taskDuration = Math.trunc(taskCandidate.Duration);

    if (remainingHours >= 0 && keptTaskGrid[taskIndex]?.[remainingHours] === 1) {
      selectedTasks.push(taskCandidate);
      remainingHours -= taskDuration;
    }
  }

  selectedTasks.reverse();

  return {
    selectedTasks,
    totalDuration: selectedTasks.reduce((durationSum, chosenTask) => durationSum + chosenTask.Duration, 0),
    totalImpact: selectedTasks.reduce((impactSum, chosenTask) => impactSum + chosenTask.Impact, 0)
  };
}

// commit3