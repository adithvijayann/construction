import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

const folders = {
  agreementFile: "agreements",
  plotPhoto: "plot-photos",
  photos: "progress-photos"
};

const uploadRoot = path.resolve(process.cwd(), env.UPLOAD_DIR);
Object.values(folders).forEach((folder) => fs.mkdirSync(path.join(uploadRoot, folder), { recursive: true }));

const ext = (file) => path.extname(file.originalname).toLowerCase();

const isJpg = (file) => [".jpg", ".jpeg"].includes(ext(file)) && ["image/jpeg", "image/pjpeg"].includes(file.mimetype);
const isPdf = (file) => ext(file) === ".pdf" && file.mimetype === "application/pdf";

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const folder = folders[file.fieldname];
    if (!folder) return cb(new ApiError(400, "Unsupported upload field"));
    req.uploadFolders = { ...(req.uploadFolders || {}), [file.fieldname]: folder };
    return cb(null, path.join(uploadRoot, folder));
  },
  filename(_req, file, cb) {
    const safeName = path
      .basename(file.originalname, ext(file))
      .replace(/[^a-z0-9-_]+/gi, "-")
      .slice(0, 60);
    cb(null, `${Date.now()}-${safeName}${ext(file)}`);
  }
});

const fileFilter = (_req, file, cb) => {
  if (file.fieldname === "agreementFile" && (isJpg(file) || isPdf(file))) return cb(null, true);
  if ((file.fieldname === "plotPhoto" || file.fieldname === "photos") && isJpg(file)) return cb(null, true);
  if (file.fieldname === "agreementFile") return cb(new ApiError(400, "Agreement file must be JPG or PDF only"));
  return cb(new ApiError(400, "Project and progress photos must be JPG only"));
};

const uploader = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.MAX_UPLOAD_MB * 1024 * 1024,
    files: 12
  }
});

export const projectFileUpload = uploader.fields([
  { name: "agreementFile", maxCount: 1 },
  { name: "plotPhoto", maxCount: 1 }
]);

export const progressPhotoUpload = uploader.array("photos", 10);
