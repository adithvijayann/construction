import fs from "node:fs/promises";
import path from "node:path";
import express from "express";
import { z } from "zod";
import { env } from "../config/env.js";
import { permit, protect } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { LogPhoto } from "../models/LogPhoto.js";
import { loadLogForUser } from "../services/access.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { objectId } from "../validators/common.js";

export const photosRouter = express.Router();

photosRouter.use(protect);

const photoParams = z.object({
  params: z.object({
    photoId: objectId
  })
});

photosRouter.delete(
  "/:photoId",
  permit("contractor", "supervisor"),
  validate(photoParams),
  asyncHandler(async (req, res) => {
    const photo = await LogPhoto.findById(req.params.photoId);
    if (!photo) throw new ApiError(404, "Photo not found");

    await loadLogForUser(photo.dailyLog, req.user, { write: true });
    await photo.deleteOne();

    const safeFileName = path.basename(photo.fileName);
    const filePath = path.resolve(process.cwd(), env.UPLOAD_DIR, safeFileName);
    await fs.unlink(filePath).catch(() => {});

    res.status(204).send();
  })
);
