import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import { env, isProduction } from "./config/env.js";
import { errorHandler, notFound } from "./middleware/error.js";
import { adminRouter } from "./routes/admin.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import { clientRouter } from "./routes/client.routes.js";
import { contractorRouter } from "./routes/contractor.routes.js";
import { filesRouter } from "./routes/files.routes.js";
import { logsRouter } from "./routes/logs.routes.js";
import { photosRouter } from "./routes/photos.routes.js";
import { projectsRouter } from "./routes/projects.routes.js";
import { supervisorRouter } from "./routes/supervisor.routes.js";
import { workersRouter } from "./routes/workers.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

const defaultAllowedOrigins = [
  "https://construction-1-3qus.onrender.com",
  "https://construction-ou63.onrender.com",
  "http://localhost:5173",
  "http://127.0.0.1:5173"
];
const normalizeOrigin = (origin = "") => origin.trim().replace(/\/+$/, "");
const allowedOrigins = new Set(
  [...env.CLIENT_URL.split(","), ...defaultAllowedOrigins]
    .map(normalizeOrigin)
    .filter(Boolean)
);
const allowedOriginList = [...allowedOrigins].join(", ");

const isLocalDevOrigin = (origin) => {
  if (isProduction || !origin) return false;
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin);
};

const getCorsOrigin = (origin) => {
  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin || allowedOrigins.has(normalizedOrigin) || isLocalDevOrigin(normalizedOrigin)) {
    return true;
  }
  return false;
};

console.log(`Allowed CORS origins: ${allowedOriginList}`);

app.set("trust proxy", 1);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);
app.use(compression());
app.use(morgan(isProduction ? "combined" : "dev"));
app.use(cookieParser());
app.use(
  cors({
    origin(origin, callback) {
      return callback(null, getCorsOrigin(origin));
    },
    credentials: true
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: "draft-7",
    legacyHeaders: false
  })
);

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "construction-site-daily-log",
    timestamp: new Date().toISOString()
  });
});

app.use("/uploads", express.static(path.resolve(process.cwd(), env.UPLOAD_DIR)));

app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/contractor", contractorRouter);
app.use("/api/supervisor", supervisorRouter);
app.use("/api/client", clientRouter);
app.use("/api/files", filesRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/logs", logsRouter);
app.use("/api/workers", workersRouter);
app.use("/api/photos", photosRouter);

const clientDist = path.resolve(__dirname, "../../client/dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) return next();
    return res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.use(notFound);
app.use(errorHandler);
