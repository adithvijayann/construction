import express from "express";
import { z } from "zod";
import { downloadFile } from "../controllers/files.controller.js";
import { protect } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { objectId } from "../validators/common.js";

export const filesRouter = express.Router();

filesRouter.use(protect);

filesRouter.get("/:documentId/download", validate(z.object({ params: z.object({ documentId: objectId }) })), downloadFile);
