import express from "express";
import { z } from "zod";
import {
  createMaterialLog,
  createProgressUpdate,
  createWorkLog,
  listMaterialLogs,
  listProgressUpdates,
  listWorkLogs,
  supervisorProjects
} from "../controllers/supervisor.controller.js";
import { permit, protect } from "../middleware/auth.js";
import { progressPhotoUpload } from "../middleware/domainUpload.js";
import { validate } from "../middleware/validate.js";
import { MATERIAL_LOG_PERIODS } from "../models/MaterialLog.js";
import { PROGRESS_UPDATE_STATUSES } from "../models/ProgressUpdate.js";
import { LOG_PERIODS } from "../models/WorkerLog.js";
import { dateOnly, objectId } from "../validators/common.js";

export const supervisorRouter = express.Router();

supervisorRouter.use(protect, permit("supervisor"));

supervisorRouter.get("/projects", supervisorProjects);

const workLogBody = z.object({
  projectId: objectId,
  workerName: z.string().min(2).max(120),
  salary: z.coerce.number().min(0),
  date: dateOnly,
  paymentType: z.enum(LOG_PERIODS),
  logPeriod: z.enum(LOG_PERIODS).default("daily"),
  notes: z.string().max(1000).optional().default("")
});

supervisorRouter.get("/work-logs", listWorkLogs);
supervisorRouter.post("/work-logs", validate(z.object({ body: workLogBody })), createWorkLog);

const materialLogBody = z.object({
  projectId: objectId,
  materialName: z.string().min(2).max(120),
  quantity: z.coerce.number().min(0),
  unit: z.string().min(1).max(40),
  cost: z.coerce.number().min(0),
  date: dateOnly,
  usagePeriod: z.enum(MATERIAL_LOG_PERIODS).default("daily"),
  notes: z.string().max(1000).optional().default("")
});

supervisorRouter.get("/material-logs", listMaterialLogs);
supervisorRouter.post("/material-logs", validate(z.object({ body: materialLogBody })), createMaterialLog);

const progressBody = z.object({
  projectId: objectId,
  status: z.enum(PROGRESS_UPDATE_STATUSES).default("in_progress"),
  notes: z.string().max(3000).optional().default(""),
  updateDate: z.preprocess((value) => (value === "" ? undefined : value), dateOnly.optional())
});

supervisorRouter.get("/progress-updates", listProgressUpdates);
supervisorRouter.post("/progress-updates", progressPhotoUpload, validate(z.object({ body: progressBody })), createProgressUpdate);
