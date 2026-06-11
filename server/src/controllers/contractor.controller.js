import { Client } from "../models/Client.js";
import { Expense } from "../models/Expense.js";
import { MaterialLog } from "../models/MaterialLog.js";
import { ProgressUpdate } from "../models/ProgressUpdate.js";
import { Project } from "../models/Project.js";
import { Supervisor } from "../models/Supervisor.js";
import { WorkerLog } from "../models/WorkerLog.js";
import { writeAudit } from "../services/audit.service.js";
import { assertClientBelongsToContractor, assertSupervisorBelongsToContractor, loadProjectForRole } from "../services/domainAccess.service.js";
import { createDocumentFromFile } from "../services/document.service.js";
import { sendClientInviteEmail, sendMailInBackground, sendUserCredentialsEmail } from "../services/email.js";
import { expenseSummaryForContractor } from "../services/expense.service.js";
import { createUserWithTemporaryPassword } from "../services/user.service.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const backgroundAudit = (payload) => {
  writeAudit(payload).catch((error) => {
    console.error("Audit write failed", { action: payload.action, entityId: payload.entityId, reason: error.message });
  });
};

const clientResponse = (client, user) => ({
  ...client.toJSON(),
  user: user.toJSON()
});

const supervisorResponse = (supervisor, user, assignedProjects = []) => ({
  ...supervisor.toJSON(),
  user: user.toJSON(),
  assignedProjects: assignedProjects.map((project) => ({
    id: project._id.toString(),
    name: project.name,
    workLocation: project.workLocation,
    location: project.location,
    progressStatus: project.progressStatus
  }))
});

export const listClients = asyncHandler(async (req, res) => {
  const clients = await Client.find({ contractor: req.user._id }).populate("user", "name email status").sort({ createdAt: -1 });
  res.json({ clients });
});

export const createClient = asyncHandler(async (req, res) => {
  const { user, temporaryPassword } = await createUserWithTemporaryPassword({
    name: req.body.name,
    email: req.body.email,
    role: "client",
    contractor: req.user._id
  });

  const client = await Client.create({
    user: user._id,
    contractor: req.user._id,
    phone: req.body.phone || "",
    address: req.body.address || ""
  });

  const email = sendMailInBackground({
    to: user.email,
    subject: "Construction log access: Project portal",
    label: "Client invite email",
    send: () =>
      sendClientInviteEmail({
        email: user.email,
        name: user.name,
        temporaryPassword,
        loginUrl: req.body.loginUrl || req.get("origin") || ""
      })
  });

  backgroundAudit({
    actor: req.user._id,
    action: "client.created",
    entityType: "Client",
    entityId: client._id,
    metadata: { email: user.email, emailSending: email.sending || false }
  });

  res.status(201).json({
    client: clientResponse(client, user),
    email,
    temporaryPassword
  });
});

export const listSupervisors = asyncHandler(async (req, res) => {
  const supervisors = await Supervisor.find({ contractor: req.user._id })
    .populate("user", "name email status")
    .populate("assignedProjects", "name workLocation location progressStatus")
    .sort({ createdAt: -1 });
  res.json({ supervisors });
});

export const createSupervisor = asyncHandler(async (req, res) => {
  const projectIds = [...new Set(req.body.projectIds || [])];
  const assignedProjects = projectIds.length ? await Project.find({ _id: { $in: projectIds }, contractor: req.user._id }) : [];

  if (assignedProjects.length !== projectIds.length) {
    throw new ApiError(404, "One or more selected projects were not found under this contractor");
  }

  const { user, temporaryPassword } = await createUserWithTemporaryPassword({
    name: req.body.name,
    email: req.body.email,
    role: "supervisor",
    contractor: req.user._id
  });

  const supervisor = await Supervisor.create({
    user: user._id,
    contractor: req.user._id,
    phone: req.body.phone || "",
    address: req.body.address || "",
    qualification: req.body.qualification || "",
    specialty: req.body.qualification || "",
    assignedProjects: assignedProjects.map((project) => project._id)
  });

  const assignedProjectIds = assignedProjects.map((project) => project._id);
  if (assignedProjectIds.length) {
    await Promise.all([
      Project.updateMany({ _id: { $in: assignedProjectIds } }, { $addToSet: { supervisors: user._id } }),
      Project.updateMany({ _id: { $in: assignedProjectIds }, supervisor: null }, { $set: { supervisor: user._id } })
    ]);
  }

  const email = sendMailInBackground({
    to: user.email,
    subject: "Construction log supervisor account",
    label: "Supervisor credential email",
    send: () =>
      sendUserCredentialsEmail({
        name: user.name,
        email: user.email,
        role: "supervisor",
        temporaryPassword,
        loginUrl: req.body.loginUrl || req.get("origin") || ""
      })
  });

  backgroundAudit({
    actor: req.user._id,
    action: "supervisor.created",
    entityType: "Supervisor",
    entityId: supervisor._id,
    metadata: { email: user.email, emailSending: email.sending || false, projectCount: assignedProjects.length }
  });

  res.status(201).json({
    supervisor: supervisorResponse(supervisor, user, assignedProjects),
    email,
    temporaryPassword
  });
});

export const listProjects = asyncHandler(async (req, res) => {
  const projects = await Project.find({ contractor: req.user._id })
    .populate("client supervisor agreementFile plotPhoto", "name email fileUrl originalName")
    .sort({ createdAt: -1 });
  res.json({ projects });
});

export const createProject = asyncHandler(async (req, res) => {
  await assertClientBelongsToContractor(req.body.clientId, req.user._id);
  if (req.body.supervisorId) {
    await assertSupervisorBelongsToContractor(req.body.supervisorId, req.user._id);
  }

  const project = await Project.create({
    contractor: req.user._id,
    client: req.body.clientId,
    supervisor: req.body.supervisorId || undefined,
    supervisors: req.body.supervisorId ? [req.body.supervisorId] : [],
    name: req.body.name,
    location: req.body.workLocation,
    workLocation: req.body.workLocation,
    address: req.body.address,
    clientName: req.body.clientName,
    clientEmail: req.body.clientEmail,
    startDate: req.body.startDate,
    endDate: req.body.endDate,
    estimatedCost: Number(req.body.estimatedCost || 0),
    progressStatus: req.body.progressStatus || "planning",
    status: req.body.projectStatus || "active",
    notes: req.body.notes || ""
  });

  const agreement = req.files?.agreementFile?.[0]
    ? await createDocumentFromFile({
        file: req.files.agreementFile[0],
        type: "agreement",
        project: project._id,
        uploadedBy: req.user._id,
        folder: "agreements"
      })
    : null;

  const plotPhoto = req.files?.plotPhoto?.[0]
    ? await createDocumentFromFile({
        file: req.files.plotPhoto[0],
        type: "plot_photo",
        project: project._id,
        uploadedBy: req.user._id,
        folder: "plot-photos"
      })
    : null;

  project.agreementFile = agreement?._id;
  project.plotPhoto = plotPhoto?._id;
  await project.save();

  if (req.body.supervisorId) {
    await Supervisor.findOneAndUpdate({ user: req.body.supervisorId }, { $addToSet: { assignedProjects: project._id } });
  }

  await writeAudit({
    actor: req.user._id,
    action: "project.created",
    entityType: "Project",
    entityId: project._id
  });

  res.status(201).json({
    project: await project.populate("client supervisor agreementFile plotPhoto", "name email fileUrl originalName")
  });
});

export const getProject = asyncHandler(async (req, res) => {
  const project = await loadProjectForRole(req.params.projectId, req.user);
  const [workerLogs, materialLogs, expenses, progressUpdates] = await Promise.all([
    WorkerLog.find({ project: project._id }).sort({ date: -1 }),
    MaterialLog.find({ project: project._id }).sort({ date: -1 }),
    Expense.find({ project: project._id }).sort({ expenseDate: -1 }),
    ProgressUpdate.find({ project: project._id }).populate("photos supervisor", "fileUrl originalName name email").sort({ updateDate: -1 })
  ]);
  res.json({ project, workerLogs, materialLogs, expenses, progressUpdates });
});

export const expenseSummary = asyncHandler(async (req, res) => {
  const summary = await expenseSummaryForContractor(req.user._id);
  const expenses = await Expense.find({ contractor: req.user._id }).populate("project", "name").sort({ expenseDate: -1 }).limit(100);
  res.json({ summary, expenses });
});
