import path from "node:path";
import { env } from "../config/env.js";
import { Document } from "../models/Document.js";

export const publicFileUrl = (fileName, folder) =>
  `${env.API_PUBLIC_URL.replace(/\/$/, "")}/uploads/${folder}/${fileName}`;

export const createDocumentFromFile = async ({ file, type, project, uploadedBy, folder }) =>
  Document.create({
    project,
    uploadedBy,
    type,
    fileName: file.filename,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    fileUrl: publicFileUrl(file.filename, folder),
    storagePath: path.join(folder, file.filename)
  });
