import mongoose from "mongoose";
import { connectDatabase } from "./config/db.js";
import { Attendance } from "./models/Attendance.js";
import { AuditLog } from "./models/AuditLog.js";
import { Client } from "./models/Client.js";
import { Contractor } from "./models/Contractor.js";
import { DailyLog } from "./models/DailyLog.js";
import { Document } from "./models/Document.js";
import { Expense } from "./models/Expense.js";
import { LogPhoto } from "./models/LogPhoto.js";
import { Material } from "./models/Material.js";
import { MaterialLog } from "./models/MaterialLog.js";
import { MaterialUsage } from "./models/MaterialUsage.js";
import { ProgressUpdate } from "./models/ProgressUpdate.js";
import { Project } from "./models/Project.js";
import { ProjectClient } from "./models/ProjectClient.js";
import { Supervisor } from "./models/Supervisor.js";
import { User } from "./models/User.js";
import { Worker } from "./models/Worker.js";
import { WorkerLog } from "./models/WorkerLog.js";

const adminEmail = "admin@gmail.com";
const adminPassword = "Admin@123";

const run = async () => {
  await connectDatabase();

  await Promise.all([
    Attendance.deleteMany({}),
    MaterialUsage.deleteMany({}),
    LogPhoto.deleteMany({}),
    DailyLog.deleteMany({}),
    Worker.deleteMany({}),
    Material.deleteMany({}),
    WorkerLog.deleteMany({}),
    MaterialLog.deleteMany({}),
    ProgressUpdate.deleteMany({}),
    Expense.deleteMany({}),
    Document.deleteMany({}),
    ProjectClient.deleteMany({}),
    Project.deleteMany({}),
    Client.deleteMany({}),
    Supervisor.deleteMany({}),
    Contractor.deleteMany({}),
    AuditLog.deleteMany({}),
    User.deleteMany({})
  ]);

  const admin = new User({
    name: "Admin User",
    email: adminEmail,
    role: "admin",
    status: "active"
  });
  await admin.setPassword(adminPassword);
  await admin.save();

  console.log("Seed complete");
  console.log(`Admin login: ${adminEmail} / ${adminPassword}`);

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
