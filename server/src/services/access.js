import { DailyLog } from "../models/DailyLog.js";
import { Project } from "../models/Project.js";
import { ProjectClient } from "../models/ProjectClient.js";
import { ApiError } from "../utils/ApiError.js";

const id = (value) => value?.toString();

export const loadProjectForUser = async (projectId, user, options = {}) => {
  const { write = false } = options;
  const project = await Project.findById(projectId);
  if (!project) throw new ApiError(404, "Project not found");

  const userId = id(user._id);
  const isOwner = id(project.contractor) === userId;
  const isSupervisor = id(project.supervisor) === userId || project.supervisors?.some((supervisorId) => id(supervisorId) === userId);
  const clientShare = await ProjectClient.findOne({ project: project._id, clientUser: user._id });
  const canRead = isOwner || isSupervisor || Boolean(clientShare);
  const canWrite = isOwner || isSupervisor;

  if (!canRead) throw new ApiError(403, "You do not have access to this project");
  if (write && !canWrite) throw new ApiError(403, "This project is read-only for your account");

  return {
    project,
    access: {
      role: isOwner ? "owner" : isSupervisor ? "supervisor" : "client",
      canWrite,
      canRead
    }
  };
};

export const loadLogForUser = async (logId, user, options = {}) => {
  const log = await DailyLog.findById(logId);
  if (!log) throw new ApiError(404, "Daily log not found");

  const { project, access } = await loadProjectForUser(log.project, user, options);
  return { log, project, access };
};

export const listProjectsForUser = async (user) => {
  if (user.role === "client") {
    const shares = await ProjectClient.find({ clientUser: user._id }).select("project");
    return Project.find({ _id: { $in: shares.map((share) => share.project) } }).sort({ createdAt: -1 });
  }

  if (user.role === "supervisor") {
    return Project.find({ $or: [{ supervisor: user._id }, { supervisors: user._id }] }).sort({ createdAt: -1 });
  }

  return Project.find({ contractor: user._id }).sort({ createdAt: -1 });
};
