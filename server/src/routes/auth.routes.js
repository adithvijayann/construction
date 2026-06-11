import express from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env.js";
import { cookieOptions, protect } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { User } from "../models/User.js";
import { writeAudit } from "../services/audit.service.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { hashToken, signAccessToken, signRefreshToken } from "../utils/tokens.js";

export const authRouter = express.Router();

const authResponse = async (res, user) => {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  user.refreshTokenHash = hashToken(refreshToken);
  await user.save();

  res.cookie("accessToken", accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000
  });
  res.cookie("refreshToken", refreshToken, {
    ...cookieOptions,
    path: "/api/auth",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  return res.json({
    user,
    accessToken
  });
};

authRouter.post(
  "/register",
  asyncHandler(async () => {
    throw new ApiError(403, "Contractor accounts are created by admins only");
  })
);

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1)
  })
});

authRouter.post(
  "/login",
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const user = await User.findOne({ email: req.body.email.toLowerCase() }).select("+passwordHash +refreshTokenHash");
    if (!user) throw new ApiError(401, "Invalid email or password");
    if (user.status !== "active") throw new ApiError(403, "Account is inactive");

    const isValid = await user.comparePassword(req.body.password);
    if (!isValid) throw new ApiError(401, "Invalid email or password");

    return authResponse(res, user);
  })
);

authRouter.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) throw new ApiError(401, "Refresh token required");

    const payload = jwt.verify(token, env.JWT_REFRESH_SECRET);
    const user = await User.findById(payload.sub).select("+refreshTokenHash");
    if (!user || user.refreshTokenHash !== hashToken(token)) {
      throw new ApiError(401, "Refresh token is invalid or expired");
    }

    return authResponse(res, user);
  })
);

authRouter.post(
  "/logout",
  protect,
  asyncHandler(async (req, res) => {
    req.user.refreshTokenHash = undefined;
    req.user.tokenVersion += 1;
    await req.user.save();
    res.clearCookie("accessToken", cookieOptions);
    res.clearCookie("refreshToken", { ...cookieOptions, path: "/api/auth" });
    res.status(204).send();
  })
);

const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters").max(128)
  })
});

authRouter.patch(
  "/password",
  protect,
  validate(changePasswordSchema),
  asyncHandler(async (req, res) => {
    if (req.user.role === "admin") {
      throw new ApiError(403, "Admin password changes are disabled from settings");
    }

    const user = await User.findById(req.user._id).select("+passwordHash");
    if (!user) throw new ApiError(404, "User account not found");

    const isCurrentPasswordValid = await user.comparePassword(req.body.currentPassword);
    if (!isCurrentPasswordValid) throw new ApiError(400, "Current password is incorrect");

    const isSamePassword = await user.comparePassword(req.body.newPassword);
    if (isSamePassword) throw new ApiError(400, "New password must be different from the current password");

    await user.setPassword(req.body.newPassword);
    await user.save();

    writeAudit({
      actor: user._id,
      action: "auth.password_changed",
      entityType: "User",
      entityId: user._id
    }).catch((error) => {
      console.error("Password change audit failed", { userId: user._id, reason: error.message });
    });

    res.json({ message: "Password changed successfully" });
  })
);

authRouter.get("/me", protect, (req, res) => {
  res.json({ user: req.user });
});
