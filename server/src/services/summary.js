import mongoose from "mongoose";
import { Attendance } from "../models/Attendance.js";
import { DailyLog } from "../models/DailyLog.js";
import { Material } from "../models/Material.js";
import { MaterialUsage } from "../models/MaterialUsage.js";
import { Worker } from "../models/Worker.js";
import { roundMoney } from "../utils/money.js";

const buildLogMatch = (projectId, range = {}) => {
  const match = {
    project: new mongoose.Types.ObjectId(projectId)
  };

  if (range.from || range.to) {
    match.logDate = {};
    if (range.from) match.logDate.$gte = range.from;
    if (range.to) match.logDate.$lte = range.to;
  }

  return match;
};

export const getProjectSummary = async (projectId, range = {}) => {
  const logMatch = buildLogMatch(projectId, range);
  const logs = await DailyLog.find(logMatch).select("_id status logDate progressPercent").sort({ logDate: 1 });
  const logIds = logs.map((log) => log._id);

  const [labourTotals] = await Attendance.aggregate([
    { $match: { dailyLog: { $in: logIds } } },
    {
      $group: {
        _id: null,
        labourCost: { $sum: "$wageForDay" },
        attendanceRows: { $sum: 1 },
        presentCount: {
          $sum: {
            $cond: [{ $eq: ["$status", "present"] }, 1, 0]
          }
        },
        halfDayCount: {
          $sum: {
            $cond: [{ $eq: ["$status", "half_day"] }, 1, 0]
          }
        }
      }
    }
  ]);

  const usageTotals = await MaterialUsage.aggregate([
    { $match: { dailyLog: { $in: logIds } } },
    {
      $group: {
        _id: "$material",
        qtyUsed: { $sum: "$qtyUsed" },
        totalCost: { $sum: "$totalCost" }
      }
    }
  ]);

  const materials = await Material.find({ project: projectId, isActive: true }).sort({ name: 1 });
  const usageMap = new Map(usageTotals.map((item) => [item._id.toString(), item]));

  const materialBreakdown = materials.map((material) => {
    const usage = usageMap.get(material._id.toString());
    const qtyUsed = usage?.qtyUsed || 0;
    const totalCost = usage?.totalCost || 0;
    const orderedQty = material.orderedQty || 0;
    return {
      id: material._id.toString(),
      name: material.name,
      unit: material.unit,
      orderedQty,
      qtyUsed,
      remainingQty: Math.max(orderedQty - qtyUsed, 0),
      utilizationPercent: orderedQty ? Math.min(Math.round((qtyUsed / orderedQty) * 100), 999) : 0,
      totalCost: roundMoney(totalCost)
    };
  });

  const activeWorkers = await Worker.countDocuments({ project: projectId, isActive: true });
  const materialCost = materialBreakdown.reduce((sum, material) => sum + material.totalCost, 0);

  return {
    logCount: logs.length,
    submittedLogCount: logs.filter((log) => log.status !== "draft").length,
    latestProgressPercent: logs.at(-1)?.progressPercent || 0,
    activeWorkers,
    attendanceRows: labourTotals?.attendanceRows || 0,
    presentCount: labourTotals?.presentCount || 0,
    halfDayCount: labourTotals?.halfDayCount || 0,
    labourCost: roundMoney(labourTotals?.labourCost || 0),
    materialCost: roundMoney(materialCost),
    combinedCost: roundMoney((labourTotals?.labourCost || 0) + materialCost),
    materialBreakdown
  };
};

export const getWorkerAttendanceSummary = async (logIds) =>
  Attendance.aggregate([
    { $match: { dailyLog: { $in: logIds } } },
    {
      $group: {
        _id: "$worker",
        totalWage: { $sum: "$wageForDay" },
        daysPresent: {
          $sum: {
            $cond: [{ $eq: ["$status", "present"] }, 1, 0]
          }
        },
        halfDays: {
          $sum: {
            $cond: [{ $eq: ["$status", "half_day"] }, 1, 0]
          }
        }
      }
    },
    {
      $lookup: {
        from: "workers",
        localField: "_id",
        foreignField: "_id",
        as: "worker"
      }
    },
    { $unwind: "$worker" },
    { $sort: { "worker.name": 1 } }
  ]);
