import { User } from "../models/User.js";

const DEFAULT_ADMIN = {
  name: "Admin User",
  email: "admin@gmail.com",
  password: "Admin@123"
};

export const ensureDefaultAdmin = async () => {
  const existing = await User.findOne({ email: DEFAULT_ADMIN.email });

  if (existing) {
    let changed = false;
    if (existing.role !== "admin") {
      existing.role = "admin";
      changed = true;
    }
    if (existing.status !== "active") {
      existing.status = "active";
      changed = true;
    }
    if (changed) await existing.save();
    return existing;
  }

  const admin = new User({
    name: DEFAULT_ADMIN.name,
    email: DEFAULT_ADMIN.email,
    role: "admin",
    status: "active"
  });
  await admin.setPassword(DEFAULT_ADMIN.password);
  await admin.save();
  console.log(`Default admin created: ${DEFAULT_ADMIN.email}`);
  return admin;
};
