import express from "express";
import { z } from "zod";
import { createClient, createProject, createSupervisor, expenseSummary, getProject, listClients, listProjects, listSupervisors } from "../controllers/contractor.controller.js";
import { permit, protect } from "../middleware/auth.js";
import { projectFileUpload } from "../middleware/domainUpload.js";
import { validate } from "../middleware/validate.js";
import { PROJECT_PROGRESS_STATUSES, PROJECT_STATUSES } from "../models/Project.js";
import { dateOnly, objectId } from "../validators/common.js";

export const contractorRouter = express.Router();

contractorRouter.use(protect, permit("contractor"));

const personBody = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().max(40).optional().default(""),
  address: z.string().max(500).optional().default(""),
  qualification: z.string().max(160).optional().default(""),
  projectIds: z.array(objectId).optional().default([]),
  loginUrl: z.string().url().optional().or(z.literal(""))
});

contractorRouter.get("/clients", listClients);
contractorRouter.post("/clients", validate(z.object({ body: personBody.omit({ qualification: true, projectIds: true }) })), createClient);
contractorRouter.get("/supervisors", listSupervisors);
contractorRouter.post("/supervisors", validate(z.object({ body: personBody })), createSupervisor);

const projectBody = z.object({
  clientId: objectId,
  supervisorId: objectId.optional().or(z.literal("")),
  name: z.string().min(2).max(160),
  clientName: z.string().min(2).max(120),
  clientEmail: z.string().email(),
  address: z.string().min(2).max(500),
  workLocation: z.string().min(2).max(220),
  startDate: dateOnly,
  endDate: z.preprocess((value) => (value === "" ? undefined : value), dateOnly.optional()),
  estimatedCost: z.coerce.number().min(0),
  projectStatus: z.enum(PROJECT_STATUSES).default("active"),
  progressStatus: z.enum(PROJECT_PROGRESS_STATUSES).default("planning"),
  notes: z.string().max(4000).optional().default("")
});

contractorRouter.get("/projects", listProjects);
contractorRouter.post("/projects", projectFileUpload, validate(z.object({ body: projectBody })), createProject);
contractorRouter.get("/projects/:projectId", validate(z.object({ params: z.object({ projectId: objectId }) })), getProject);
contractorRouter.get("/expenses", expenseSummary);
