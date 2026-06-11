import express from "express";
import { z } from "zod";
import { permit, protect } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { Worker } from "../models/Worker.js";
import { loadProjectForUser } from "../services/access.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { objectId } from "../validators/common.js";

export const workersRouter = express.Router();

workersRouter.use(protect);

const updateWorkerSchema = z.object({
  params: z.object({
    workerId: objectId
  }),
  body: z.object({
    name: z.string().min(2).max(120).optional(),
    trade: z.string().min(2).max(80).optional(),
    dailyWage: z.coerce.number().min(0).optional(),
    phone: z.string().max(40).optional(),
    isActive: z.boolean().optional()
  })
});

workersRouter.put(
  "/:workerId",
  permit("contractor", "supervisor"),
  validate(updateWorkerSchema),
  asyncHandler(async (req, res) => {
    const worker = await Worker.findById(req.params.workerId);
    if (!worker) throw new ApiError(404, "Worker not found");

    await loadProjectForUser(worker.project, req.user, { write: true });
    Object.assign(worker, req.body);
    await worker.save();

    res.json({ worker });
  })
);
