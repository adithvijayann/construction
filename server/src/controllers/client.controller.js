import { MaterialLog } from "../models/MaterialLog.js";
import { ProgressUpdate } from "../models/ProgressUpdate.js";
import { Project } from "../models/Project.js";
import { WorkerLog } from "../models/WorkerLog.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const clientProjectDetails = asyncHandler(async (req, res) => {
  const project = await Project.findOne({ client: req.user._id })
    .populate("contractor supervisor agreementFile plotPhoto", "name email fileUrl originalName")
    .sort({ createdAt: -1 });

  if (!project) return res.json({ project: null, workerLogs: [], materialLogs: [], progressUpdates: [] });

  const [workerLogs, materialLogs, progressUpdates] = await Promise.all([
    WorkerLog.find({ project: project._id }).sort({ date: -1 }).limit(50),
    MaterialLog.find({ project: project._id }).sort({ date: -1 }).limit(50),
    ProgressUpdate.find({ project: project._id }).populate("photos supervisor", "fileUrl originalName name email").sort({ updateDate: -1 })
  ]);

  res.json({ project, workerLogs, materialLogs, progressUpdates });
});

export const clientProgress = asyncHandler(async (req, res) => {
  const project = await Project.findOne({ client: req.user._id }).sort({ createdAt: -1 });
  if (!project) return res.json({ progressUpdates: [] });
  const progressUpdates = await ProgressUpdate.find({ project: project._id })
    .populate("photos supervisor", "fileUrl originalName name email")
    .sort({ updateDate: -1 });
  res.json({ progressUpdates });
});
