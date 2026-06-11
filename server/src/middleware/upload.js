import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

const uploadRoot = path.resolve(process.cwd(), env.UPLOAD_DIR);
fs.mkdirSync(uploadRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadRoot),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = path
      .basename(file.originalname, ext)
      .replace(/[^a-z0-9-_]+/gi, "-")
      .slice(0, 50);
    cb(null, `${Date.now()}-${safeName}${ext}`);
  }
});

const fileFilter = (_req, file, cb) => {
  if (file.mimetype.startsWith("image/")) return cb(null, true);
  return cb(new ApiError(400, "Only image uploads are allowed"));
};

export const uploadPhotos = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.MAX_UPLOAD_MB * 1024 * 1024,
    files: 12
  }
});
