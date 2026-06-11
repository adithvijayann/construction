import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverEnvPath = path.resolve(__dirname, "../../.env");

dotenv.config();
dotenv.config({ path: serverEnvPath, override: process.env.NODE_ENV !== "production" });

const toBoolean = (value, fallback = false) => {
  if (value === undefined || value === "") return fallback;
  return ["true", "1", "yes"].includes(String(value).toLowerCase());
};

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeAppPassword = (value = "") => value.replace(/\s+/g, "");

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: toNumber(process.env.PORT, 5000),
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:5173",
  API_PUBLIC_URL: process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`,
  MONGO_URI: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/construction_daily_log",
  JWT_SECRET: process.env.JWT_SECRET || "development-access-secret-change-me",
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "development-refresh-secret-change-me",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "15m",
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  UPLOAD_DIR: process.env.UPLOAD_DIR || "uploads",
  MAX_UPLOAD_MB: toNumber(process.env.MAX_UPLOAD_MB, 8),
  ENABLE_EMAIL_NOTIFICATIONS: toBoolean(process.env.ENABLE_EMAIL_NOTIFICATIONS, false),
  EMAIL_USER: process.env.EMAIL_USER || "",
  EMAIL_PASS: normalizeAppPassword(process.env.EMAIL_PASS || ""),
  EMAIL_SEND_TIMEOUT_MS: toNumber(process.env.EMAIL_SEND_TIMEOUT_MS, 15000)
};

export const isProduction = env.NODE_ENV === "production";

if (isProduction) {
  const missing = ["MONGO_URI", "JWT_SECRET", "JWT_REFRESH_SECRET"].filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing required production environment variables: ${missing.join(", ")}`);
  }
}
