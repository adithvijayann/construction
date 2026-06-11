import { Client } from "../models/Client.js";
import { Project } from "../models/Project.js";
import { Supervisor } from "../models/Supervisor.js";
import { ApiError } from "../utils/ApiError.js";

const sameId = (a, b) => a?.toString() === b?.toString();

export const loadProjectForRole = async (projectId, user, { write = false } = {}) => {
  const project = await Project.findById(projectId);
  if (!project) throw new ApiError(404, "Project not found");

  if (user.role === "admin") return project;
  if (user.role === "contractor" && sameId(project.contractor, user._id)) return project;
  if (
    user.role === "supervisor" &&
    (sameId(project.supervisor, user._id) || project.supervisors?.some((supervisorId) => sameId(supervisorId, user._id)))
  ) {
    return project;
  }
  if (user.role === "client" && !write && sameId(project.client, user._id)) return project;

  throw new ApiError(403, "You do not have access to this project");
};

export const assertClientBelongsToContractor = async (clientUserId, contractorUserId) => {
  const client = await Client.findOne({ user: clientUserId, contractor: contractorUserId, isActive: true });
  if (!client) throw new ApiError(404, "Client not found under this contractor");
  return client;
};

export const assertSupervisorBelongsToContractor = async (supervisorUserId, contractorUserId) => {
  const supervisor = await Supervisor.findOne({ user: supervisorUserId, contractor: contractorUserId, isActive: true });
  if (!supervisor) throw new ApiError(404, "Supervisor not found under this contractor");
  return supervisor;
};
