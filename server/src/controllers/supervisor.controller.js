import { MaterialLog } from "../models/MaterialLog.js";
import { ProgressUpdate } from "../models/ProgressUpdate.js";
import { Project } from "../models/Project.js";
import { WorkerLog } from "../models/WorkerLog.js";
import { loadProjectForRole } from "../services/domainAccess.service.js";
import { createDocumentFromFile } from "../services/document.service.js";
import { createExpenseFromLog } from "../services/expense.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const supervisorProjectQuery = (userId) => ({ $or: [{ supervisor: userId }, { supervisors: userId }] });

export const supervisorProjects = asyncHandler(async (req, res) => {
  const projects = await Project.find(supervisorProjectQuery(req.user._id))
    .populate("client contractor plotPhoto agreementFile", "name email fileUrl originalName")
    .sort({ createdAt: -1 });
  res.json({ projects });
});

export const listWorkLogs = asyncHandler(async (req, res) => {
  const projects = await Project.find(supervisorProjectQuery(req.user._id)).select("_id");
  const workerLogs = await WorkerLog.find({ project: { $in: projects.map((project) => project._id) } })
    .populate("project", "name")
    .sort({ date: -1 });
  res.json({ workerLogs });
});

export const createWorkLog = asyncHandler(async (req, res) => {
  const project = await loadProjectForRole(req.body.projectId, req.user, { write: true });
  const workerLog = await WorkerLog.create({
    project: project._id,
    supervisor: req.user._id,
    workerName: req.body.workerName,
    salary: Number(req.body.salary),
    date: req.body.date,
    paymentType: req.body.paymentType,
    logPeriod: req.body.logPeriod || "daily",
    notes: req.body.notes || ""
  });

  await createExpenseFromLog({
    project: project._id,
    contractor: project.contractor,
    type: "worker",
    amount: workerLog.salary,
    description: `${workerLog.workerName} (${workerLog.logPeriod})`,
    expenseDate: workerLog.date,
    sourceModel: "WorkerLog",
    sourceId: workerLog._id
  });

  res.status(201).json({ workerLog });
});

export const listMaterialLogs = asyncHandler(async (req, res) => {
  const projects = await Project.find(supervisorProjectQuery(req.user._id)).select("_id");
  const materialLogs = await MaterialLog.find({ project: { $in: projects.map((project) => project._id) } })
    .populate("project", "name")
    .sort({ date: -1 });
  res.json({ materialLogs });
});

export const createMaterialLog = asyncHandler(async (req, res) => {
  const project = await loadProjectForRole(req.body.projectId, req.user, { write: true });
  const materialLog = await MaterialLog.create({
    project: project._id,
    supervisor: req.user._id,
    materialName: req.body.materialName,
    quantity: Number(req.body.quantity),
    unit: req.body.unit,
    cost: Number(req.body.cost),
    date: req.body.date,
    usagePeriod: req.body.usagePeriod || "daily",
    notes: req.body.notes || ""
  });

  await createExpenseFromLog({
    project: project._id,
    contractor: project.contractor,
    type: "material",
    amount: materialLog.cost,
    description: `${materialLog.materialName} ${materialLog.quantity} ${materialLog.unit} (${materialLog.usagePeriod})`,
    expenseDate: materialLog.date,
    sourceModel: "MaterialLog",
    sourceId: materialLog._id
  });

  res.status(201).json({ materialLog });
});

export const listProgressUpdates = asyncHandler(async (req, res) => {
  const projects = await Project.find(supervisorProjectQuery(req.user._id)).select("_id");
  const progressUpdates = await ProgressUpdate.find({ project: { $in: projects.map((project) => project._id) } })
    .populate("project photos", "name fileUrl originalName")
    .sort({ updateDate: -1 });
  res.json({ progressUpdates });
});

export const createProgressUpdate = asyncHandler(async (req, res) => {
  const project = await loadProjectForRole(req.body.projectId, req.user, { write: true });

  const documents = await Promise.all(
    (req.files || []).map((file) =>
      createDocumentFromFile({
        file,
        type: "progress_photo",
        project: project._id,
        uploadedBy: req.user._id,
        folder: "progress-photos"
      })
    )
  );

  const progressUpdate = await ProgressUpdate.create({
    project: project._id,
    supervisor: req.user._id,
    status: req.body.status || "in_progress",
    notes: req.body.notes || "",
    updateDate: req.body.updateDate || new Date(),
    photos: documents.map((doc) => doc._id)
  });

  project.progressStatus = req.body.status === "completed" ? "completed" : "in_progress";
  await project.save();

  res.status(201).json({ progressUpdate: await progressUpdate.populate("photos project", "fileUrl originalName name") });
});
