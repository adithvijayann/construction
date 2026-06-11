import path from "node:path";
import { env } from "../config/env.js";
import { Document } from "../models/Document.js";
import { loadProjectForRole } from "../services/domainAccess.service.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const downloadFile = asyncHandler(async (req, res) => {
  const document = await Document.findById(req.params.documentId);
  if (!document) throw new ApiError(404, "File not found");
  if (document.project) await loadProjectForRole(document.project, req.user);

  const filePath = path.resolve(process.cwd(), env.UPLOAD_DIR, document.storagePath);
  res.download(filePath, document.originalName);
});
