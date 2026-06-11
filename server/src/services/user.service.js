import { User } from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { randomPassword } from "../utils/tokens.js";

export const createUserWithTemporaryPassword = async ({ name, email, role, contractor }) => {
  const normalizedEmail = email.toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) throw new ApiError(409, "An account already exists for this email");

  const temporaryPassword = randomPassword();
  const user = new User({
    name,
    email: normalizedEmail,
    role,
    contractor
  });
  await user.setPassword(temporaryPassword);
  await user.save();

  return { user, temporaryPassword };
};
