import jwt from "jsonwebtoken";
import { env, isProduction } from "../config/env.js";
import { User } from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getBearerToken = (req) => {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  return req.cookies?.accessToken;
};

export const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax"
};

export const protect = asyncHandler(async (req, _res, next) => {
  const token = getBearerToken(req);
  if (!token) throw new ApiError(401, "Authentication required");

  const payload = jwt.verify(token, env.JWT_SECRET);
  const user = await User.findById(payload.sub);
  if (!user) throw new ApiError(401, "User no longer exists");
  if (user.status !== "active") throw new ApiError(403, "Account is inactive");

  req.user = user;
  next();
});

export const permit = (...roles) => (req, _res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(new ApiError(403, "You do not have permission to perform this action"));
  }
  return next();
};
