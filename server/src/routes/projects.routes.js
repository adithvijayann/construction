import express from "express";
import { z } from "zod";
import { permit, protect } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { DailyLog, DAILY_LOG_STATUSES } from "../models/DailyLog.js";
import { Expense } from "../models/Expense.js";
import { Material } from "../models/Material.js";
import { MaterialLog } from "../models/MaterialLog.js";
import { ProgressUpdate } from "../models/ProgressUpdate.js";
import { Project, PROJECT_STATUSES } from "../models/Project.js";
import { ProjectClient } from "../models/ProjectClient.js";
import { User } from "../models/User.js";
import { Worker } from "../models/Worker.js";
import { WorkerLog } from "../models/WorkerLog.js";
import { loadProjectForUser, listProjectsForUser } from "../services/access.js";
import { sendClientInviteEmail, sendMailInBackground } from "../services/email.js";
import { streamProjectReport } from "../services/report.js";
import { getProjectSummary } from "../services/summary.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { normalizeDateOnly } from "../utils/date.js";
import { randomPassword } from "../utils/tokens.js";
import { dateOnly, objectId, optionalDateRangeQuery } from "../validators/common.js";

export const projectsRouter = express.Router();

projectsRouter.use(protect);

const projectIdParams = z.object({
  params: z.object({
    id: objectId
  })
});

const projectCreateSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(160),
    location: z.string().min(2).max(220),
    clientName: z.string().max(120).optional().default(""),
    clientEmail: z.string().email().optional().or(z.literal("")).default(""),
    startDate: dateOnly.optional(),
    endDate: dateOnly.optional(),
    status: z.enum(PROJECT_STATUSES).default("active")
  })
});

projectsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const projects = await listProjectsForUser(req.user);
    const enriched = await Promise.all(
      projects.map(async (project) => ({
        project,
        summary: await getProjectSummary(project._id)
      }))
    );

    res.json({ projects: enriched });
  })
);

projectsRouter.post(
  "/",
  permit("contractor"),
  validate(projectCreateSchema),
  asyncHandler(async (req, res) => {
    const project = await Project.create({
      ...req.body,
      contractor: req.user._id
    });

    res.status(201).json({ project, summary: await getProjectSummary(project._id) });
  })
);

projectsRouter.get(
  "/:id",
  validate(projectIdParams),
  asyncHandler(async (req, res) => {
    const { project, access } = await loadProjectForUser(req.params.id, req.user);
    const [clients, progressUpdates, workerLogs, materialLogs, expenses] = await Promise.all([
      ProjectClient.find({ project: project._id }).populate("clientUser", "name email role"),
      ProgressUpdate.find({ project: project._id }).populate("photos supervisor", "fileUrl originalName name email").sort({ updateDate: -1 }),
      access.role === "client" ? [] : WorkerLog.find({ project: project._id }).populate("supervisor", "name email").sort({ date: -1 }).limit(50),
      access.role === "client" ? [] : MaterialLog.find({ project: project._id }).populate("supervisor", "name email").sort({ date: -1 }).limit(50),
      access.role === "owner" ? Expense.find({ project: project._id }).sort({ expenseDate: -1 }).limit(50) : []
    ]);
    res.json({
      project,
      access,
      clients,
      progressUpdates,
      workerLogs,
      materialLogs,
      expenses,
      summary: await getProjectSummary(project._id)
    });
  })
);

projectsRouter.put(
  "/:id",
  permit("contractor"),
  validate(
    projectIdParams.extend({
      body: projectCreateSchema.shape.body.partial()
    })
  ),
  asyncHandler(async (req, res) => {
    const { project } = await loadProjectForUser(req.params.id, req.user, { write: true });
    Object.assign(project, req.body);
    await project.save();
    res.json({ project });
  })
);

const inviteSchema = z.object({
  params: z.object({
    id: objectId
  }),
  body: z.object({
    name: z.string().min(2).max(120).optional(),
    email: z.string().email(),
    loginUrl: z.string().url().optional().or(z.literal(""))
  })
});

projectsRouter.post(
  "/:id/invite",
  permit("contractor"),
  validate(inviteSchema),
  asyncHandler(async (req, res) => {
    const { project } = await loadProjectForUser(req.params.id, req.user, { write: true });
    const email = req.body.email.toLowerCase();
    let temporaryPassword = null;
    let client = await User.findOne({ email });

    if (!client) {
      temporaryPassword = randomPassword();
      client = new User({
        name: req.body.name || email.split("@")[0],
        email,
        role: "client"
      });
      await client.setPassword(temporaryPassword);
      await client.save();
    }

    if (client.role !== "client") {
      throw new ApiError(409, "That email belongs to a non-client account");
    }

    const share = await ProjectClient.findOneAndUpdate(
      { project: project._id, clientUser: client._id },
      { $setOnInsert: { invitedBy: req.user._id, invitedAt: new Date() } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).populate("clientUser", "name email role");

    project.clientName = project.clientName || client.name;
    project.clientEmail = project.clientEmail || client.email;
    await project.save();

    const emailResult = sendMailInBackground({
      to: email,
      subject: `Construction log access: ${project?.name || "Project portal"}`,
      label: "Project client invite email",
      send: () =>
        sendClientInviteEmail({
          email,
          project,
          temporaryPassword,
          loginUrl: req.body.loginUrl || req.get("origin") || ""
        })
    });

    res.status(201).json({
      share,
      email: emailResult,
      temporaryPassword
    });
  })
);

const logCreateSchema = z.object({
  params: z.object({
    id: objectId
  }),
  body: z.object({
    logDate: dateOnly.default(() => new Date()),
    weather: z.string().max(160).optional().default(""),
    siteNotes: z.string().max(4000).optional().default(""),
    progressPercent: z.coerce.number().min(0).max(100).default(0),
    status: z.enum(DAILY_LOG_STATUSES).default("draft")
  })
});

projectsRouter.get(
  "/:id/logs",
  validate(projectIdParams),
  asyncHandler(async (req, res) => {
    const { project } = await loadProjectForUser(req.params.id, req.user);
    const logs = await DailyLog.find({ project: project._id }).sort({ logDate: -1 });
    res.json({ logs });
  })
);

projectsRouter.post(
  "/:id/logs",
  permit("contractor", "supervisor"),
  validate(logCreateSchema),
  asyncHandler(async (req, res) => {
    const { project } = await loadProjectForUser(req.params.id, req.user, { write: true });
    const logDate = normalizeDateOnly(req.body.logDate);
    if (!logDate) throw new ApiError(400, "Invalid log date");

    const log = await DailyLog.create({
      project: project._id,
      createdBy: req.user._id,
      logDate,
      weather: req.body.weather,
      siteNotes: req.body.siteNotes,
      progressPercent: req.body.progressPercent,
      status: req.body.status
    });

    res.status(201).json({ log });
  })
);

const workerCreateSchema = z.object({
  params: z.object({
    id: objectId
  }),
  body: z.object({
    name: z.string().min(2).max(120),
    trade: z.string().min(2).max(80),
    dailyWage: z.coerce.number().min(0),
    phone: z.string().max(40).optional().default("")
  })
});

projectsRouter.get(
  "/:id/workers",
  permit("contractor", "supervisor"),
  validate(projectIdParams),
  asyncHandler(async (req, res) => {
    const { project } = await loadProjectForUser(req.params.id, req.user, { write: true });
    const workers = await Worker.find({ project: project._id }).sort({ isActive: -1, name: 1 });
    res.json({ workers });
  })
);

projectsRouter.post(
  "/:id/workers",
  permit("contractor", "supervisor"),
  validate(workerCreateSchema),
  asyncHandler(async (req, res) => {
    const { project } = await loadProjectForUser(req.params.id, req.user, { write: true });
    const worker = await Worker.create({
      ...req.body,
      project: project._id
    });
    res.status(201).json({ worker });
  })
);

const materialCreateSchema = z.object({
  params: z.object({
    id: objectId
  }),
  body: z.object({
    name: z.string().min(2).max(120),
    unit: z.string().min(1).max(40),
    unitCost: z.coerce.number().min(0),
    orderedQty: z.coerce.number().min(0).default(0)
  })
});

projectsRouter.get(
  "/:id/materials",
  validate(projectIdParams),
  asyncHandler(async (req, res) => {
    const { project } = await loadProjectForUser(req.params.id, req.user);
    const materials = await Material.find({ project: project._id }).sort({ isActive: -1, name: 1 });
    res.json({ materials });
  })
);

projectsRouter.post(
  "/:id/materials",
  permit("contractor", "supervisor"),
  validate(materialCreateSchema),
  asyncHandler(async (req, res) => {
    const { project } = await loadProjectForUser(req.params.id, req.user, { write: true });
    const material = await Material.create({
      ...req.body,
      project: project._id
    });
    res.status(201).json({ material });
  })
);

projectsRouter.get(
  "/:id/summary",
  validate(
    z.object({
      params: z.object({ id: objectId }),
      query: optionalDateRangeQuery
    })
  ),
  asyncHandler(async (req, res) => {
    const { project } = await loadProjectForUser(req.params.id, req.user);
    res.json({ summary: await getProjectSummary(project._id, req.query) });
  })
);

projectsRouter.get(
  "/:id/report",
  validate(
    z.object({
      params: z.object({ id: objectId }),
      query: optionalDateRangeQuery
    })
  ),
  asyncHandler(async (req, res) => {
    const { project } = await loadProjectForUser(req.params.id, req.user);
    await streamProjectReport({ res, project, range: req.query });
  })
);
