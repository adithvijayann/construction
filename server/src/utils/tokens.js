import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export const signAccessToken = (user) =>
  jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      email: user.email
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );

export const signRefreshToken = (user) =>
  jwt.sign({ sub: user._id.toString(), tokenVersion: user.tokenVersion || 0 }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN
  });

export const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

export const randomPassword = () => crypto.randomBytes(9).toString("base64url");
