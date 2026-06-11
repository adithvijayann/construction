import express from "express";
import { z } from "zod";
import { env } from "../config/env.js";
import { permit, protect } from "../middleware/auth.js";
import { uploadPhotos } from "../middleware/upload.js";
import { validate } from "../middleware/validate.js";
import { Attendance, ATTENDANCE_STATUSES } from "../models/Attendance.js";
import { DailyLog, DAILY_LOG_STATUSES } from "../models/DailyLog.js";
import { LogPhoto } from "../models/LogPhoto.js";
import { Material } from "../models/Material.js";
import { MaterialUsage } from "../models/MaterialUsage.js";
import { ProjectClient } from "../models/ProjectClient.js";
import { Worker } from "../models/Worker.js";
import { loadLogForUser } from "../services/access.js";
import { sendLogSubmittedEmail } from "../services/email.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { normalizeDateOnly } from "../utils/date.js";
import { roundMoney } from "../utils/money.js";
import { dateOnly, objectId } from "../validators/common.js";

export const logsRouter = express.Router();

logsRouter.use(protect);

const logIdParams = z.object({
  params: z.object({
    logId: objectId
  })
});

const assertDraft = (log) => {
  if (log.status !== "draft") {
    throw new ApiError(409, "Submitted logs are locked and cannot be edited");
  }
};

logsRouter.get(
  "/:logId",
  validate(logIdParams),
  asyncHandler(async (req, res) => {
    const { log, project, access } = await loadLogForUser(req.params.logId, req.user);

    if (access.role === "client" && log.status === "submitted") {
      log.status = "client_viewed";
      log.clientViewedAt = new Date();
      await log.save();
    }

    const [attendance, materialUsage, photos] = await Promise.all([
      Attendance.find({ dailyLog: log._id }).populate("worker").sort({ createdAt: 1 }),
      MaterialUsage.find({ dailyLog: log._id }).populate("material").sort({ createdAt: 1 }),
      LogPhoto.find({ dailyLog: log._id }).sort({ uploadedAt: -1 })
    ]);

    res.json({ log, project, access, attendance, materialUsage, photos });
  })
);

const logUpdateSchema = z.object({
  params: z.object({
    logId: objectId
  }),
  body: z.object({
    logDate: dateOnly.optional(),
    weather: z.string().max(160).optional(),
    siteNotes: z.string().max(4000).optional(),
    progressPercent: z.coerce.number().min(0).max(100).optional(),
    status: z.enum(DAILY_LOG_STATUSES).optional()
  })
});

logsRouter.put(
  "/:logId",
  permit("contractor", "supervisor"),
  validate(logUpdateSchema),
  asyncHandler(async (req, res) => {
    const { log } = await loadLogForUser(req.params.logId, req.user, { write: true });
    assertDraft(log);

    if (req.body.logDate) {
      req.body.logDate = normalizeDateOnly(req.body.logDate);
    }
    Object.assign(log, req.body);
    await log.save();
    res.json({ log });
  })
);

logsRouter.post(
  "/:logId/submit",
  permit("contractor", "supervisor"),
  validate(logIdParams),
  asyncHandler(async (req, res) => {
    const { log, project } = await loadLogForUser(req.params.logId, req.user, { write: true });
    if (log.status !== "draft") {
      throw new ApiError(409, "This daily log has already been submitted");
    }

    log.status = "submitted";
    log.submittedAt = new Date();
    await log.save();

    const shares = await ProjectClient.find({ project: project._id }).populate("clientUser", "email");
    const recipients = new Set(shares.map((share) => share.clientUser?.email).filter(Boolean));
    if (project.clientEmail) recipients.add(project.clientEmail);

    const emailResults = [];
    for (const email of recipients) {
      emailResults.push(await sendLogSubmittedEmail({ email, project, log }));
    }

    res.json({ log, emails: emailResults });
  })
);

logsRouter.get(
  "/:logId/attendance",
  validate(logIdParams),
  asyncHandler(async (req, res) => {
    const { log } = await loadLogForUser(req.params.logId, req.user);
    const attendance = await Attendance.find({ dailyLog: log._id }).populate("worker").sort({ createdAt: 1 });
    res.json({ attendance });
  })
);

const attendanceSchema = z.object({
  params: z.object({
    logId: objectId
  }),
  body: z.object({
    records: z
      .array(
        z.object({
          workerId: objectId,
          status: z.enum(ATTENDANCE_STATUSES),
          hoursWorked: z.coerce.number().min(0).max(24).optional()
        })
      )
      .min(1)
  })
});

logsRouter.post(
  "/:logId/attendance",
  permit("contractor", "supervisor"),
  validate(attendanceSchema),
  asyncHandler(async (req, res) => {
    const { log, project } = await loadLogForUser(req.params.logId, req.user, { write: true });
    assertDraft(log);

    const results = [];
    for (const record of req.body.records) {
      const worker = await Worker.findOne({ _id: record.workerId, project: project._id });
      if (!worker) throw new ApiError(404, "Worker not found in this project");

      const defaultHours = record.status === "absent" ? 0 : record.status === "half_day" ? 4 : 8;
      const hoursWorked = record.hoursWorked ?? defaultHours;
      const wageForDay = record.status === "absent" ? 0 : roundMoney(worker.dailyWage * (hoursWorked / 8));

      const attendance = await Attendance.findOneAndUpdate(
        { dailyLog: log._id, worker: worker._id },
        {
          status: record.status,
          hoursWorked,
          wageForDay
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).populate("worker");

      results.push(attendance);
    }

    res.json({ attendance: results });
  })
);

logsRouter.get(
  "/:logId/materials",
  validate(logIdParams),
  asyncHandler(async (req, res) => {
    const { log } = await loadLogForUser(req.params.logId, req.user);
    const materialUsage = await MaterialUsage.find({ dailyLog: log._id }).populate("material").sort({ createdAt: 1 });
    res.json({ materialUsage });
  })
);

const materialUsageSchema = z.object({
  params: z.object({
    logId: objectId
  }),
  body: z.object({
    records: z
      .array(
        z.object({
          materialId: objectId,
          qtyUsed: z.coerce.number().min(0),
          notes: z.string().max(1000).optional().default("")
        })
      )
      .min(1)
  })
});

logsRouter.post(
  "/:logId/materials",
  permit("contractor", "supervisor"),
  validate(materialUsageSchema),
  asyncHandler(async (req, res) => {
    const { log, project } = await loadLogForUser(req.params.logId, req.user, { write: true });
    assertDraft(log);

    const results = [];
    for (const record of req.body.records) {
      const material = await Material.findOne({ _id: record.materialId, project: project._id });
      if (!material) throw new ApiError(404, "Material not found in this project");

      const usage = await MaterialUsage.findOneAndUpdate(
        { dailyLog: log._id, material: material._id },
        {
          qtyUsed: record.qtyUsed,
          totalCost: roundMoney(record.qtyUsed * material.unitCost),
          notes: record.notes
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).populate("material");

      results.push(usage);
    }

    res.json({ materialUsage: results });
  })
);

logsRouter.post(
  "/:logId/photos",
  permit("contractor", "supervisor"),
  validate(logIdParams),
  uploadPhotos.array("photos", 12),
  asyncHandler(async (req, res) => {
    const { log } = await loadLogForUser(req.params.logId, req.user, { write: true });
    assertDraft(log);
    if (!req.files?.length) throw new ApiError(400, "Upload at least one photo");

    const captions = Array.isArray(req.body.caption) ? req.body.caption : [req.body.caption || ""];
    const photos = await Promise.all(
      req.files.map((file, index) =>
        LogPhoto.create({
          dailyLog: log._id,
          fileName: file.filename,
          fileUrl: `${env.API_PUBLIC_URL.replace(/\/$/, "")}/uploads/${file.filename}`,
          caption: captions[index] || "",
          uploadedBy: req.user._id
        })
      )
    );

    res.status(201).json({ photos });
  })
);
