import { Router } from "express";
import { Log } from "campus-logger-kit";
import { listDepots, listVehicles, optimizeSchedule } from "../controller/scheduler.controller";

export const schedulerRouter = Router();

schedulerRouter.use(async (request, _response, next) => {
  await Log("backend", "info", "route", `Scheduler route hit: ${request.method} ${request.originalUrl}`);
  next();
});

schedulerRouter.get("/depots", listDepots);
schedulerRouter.get("/vehicles", listVehicles);
schedulerRouter.post("/optimize", optimizeSchedule);
