import PDFDocument from "pdfkit";
import { Attendance } from "../models/Attendance.js";
import { DailyLog } from "../models/DailyLog.js";
import { LogPhoto } from "../models/LogPhoto.js";
import { MaterialUsage } from "../models/MaterialUsage.js";
import { formatDate } from "../utils/date.js";
import { formatMoney } from "../utils/money.js";
import { getProjectSummary, getWorkerAttendanceSummary } from "./summary.js";

const row = (doc, label, value) => {
  doc.font("Helvetica-Bold").text(label, { continued: true });
  doc.font("Helvetica").text(` ${value}`);
};

export const streamProjectReport = async ({ res, project, range }) => {
  const logs = await DailyLog.find({
    project: project._id,
    ...(range.from || range.to
      ? {
          logDate: {
            ...(range.from ? { $gte: range.from } : {}),
            ...(range.to ? { $lte: range.to } : {})
          }
        }
      : {})
  }).sort({ logDate: 1 });

  const logIds = logs.map((log) => log._id);
  const [summary, workerSummary, attendanceRows, materialRows, photos] = await Promise.all([
    getProjectSummary(project._id, range),
    getWorkerAttendanceSummary(logIds),
    Attendance.find({ dailyLog: { $in: logIds } }).populate("worker").populate("dailyLog").sort({ createdAt: 1 }),
    MaterialUsage.find({ dailyLog: { $in: logIds } }).populate("material").populate("dailyLog").sort({ createdAt: 1 }),
    LogPhoto.find({ dailyLog: { $in: logIds } }).populate("dailyLog").sort({ uploadedAt: 1 })
  ]);

  const fileName = `${project.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-report.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

  const doc = new PDFDocument({ margin: 48, size: "A4" });
  doc.pipe(res);

  doc.fontSize(20).font("Helvetica-Bold").text("Construction Site Daily Log Report");
  doc.moveDown(0.4);
  doc.fontSize(11).font("Helvetica").fillColor("#4b5563").text(`Generated on ${formatDate(new Date())}`);
  doc.fillColor("#111827").moveDown();

  doc.fontSize(14).font("Helvetica-Bold").text(project.name);
  doc.fontSize(10).font("Helvetica");
  row(doc, "Location:", project.location);
  row(doc, "Client:", project.clientName || "Not set");
  row(doc, "Report range:", `${range.from ? formatDate(range.from) : "Start"} to ${range.to ? formatDate(range.to) : "Today"}`);
  doc.moveDown();

  doc.fontSize(13).font("Helvetica-Bold").text("Cost Summary");
  doc.fontSize(10).font("Helvetica");
  row(doc, "Labour:", formatMoney(summary.labourCost));
  row(doc, "Materials:", formatMoney(summary.materialCost));
  row(doc, "Combined:", formatMoney(summary.combinedCost));
  row(doc, "Daily logs:", `${summary.submittedLogCount}/${summary.logCount} submitted`);
  doc.moveDown();

  doc.fontSize(13).font("Helvetica-Bold").text("Worker Attendance");
  doc.fontSize(9).font("Helvetica");
  if (!workerSummary.length) {
    doc.text("No attendance recorded for this range.");
  } else {
    workerSummary.forEach((item) => {
      doc.text(`${item.worker.name} (${item.worker.trade}) - Present: ${item.daysPresent}, Half days: ${item.halfDays}, Wages: ${formatMoney(item.totalWage)}`);
    });
  }
  doc.moveDown();

  doc.fontSize(13).font("Helvetica-Bold").text("Materials Consumed vs Ordered");
  doc.fontSize(9).font("Helvetica");
  if (!summary.materialBreakdown.length) {
    doc.text("No project materials configured.");
  } else {
    summary.materialBreakdown.forEach((material) => {
      doc.text(`${material.name}: ${material.qtyUsed}/${material.orderedQty} ${material.unit} used (${material.utilizationPercent}%) - ${formatMoney(material.totalCost)}`);
    });
  }
  doc.moveDown();

  doc.fontSize(13).font("Helvetica-Bold").text("Daily Log Timeline");
  doc.fontSize(9).font("Helvetica");
  logs.forEach((log) => {
    const attendanceTotal = attendanceRows
      .filter((item) => item.dailyLog._id.equals(log._id))
      .reduce((sum, item) => sum + item.wageForDay, 0);
    const materialTotal = materialRows
      .filter((item) => item.dailyLog._id.equals(log._id))
      .reduce((sum, item) => sum + item.totalCost, 0);
    const photoCount = photos.filter((photo) => photo.dailyLog._id.equals(log._id)).length;

    doc.moveDown(0.4);
    doc.font("Helvetica-Bold").text(`${formatDate(log.logDate)} - ${log.status.replace("_", " ")}`);
    doc.font("Helvetica").text(`Weather: ${log.weather || "Not recorded"}`);
    doc.text(`Progress: ${log.progressPercent || 0}% | Labour: ${formatMoney(attendanceTotal)} | Materials: ${formatMoney(materialTotal)} | Photos: ${photoCount}`);
    if (log.siteNotes) doc.text(`Notes: ${log.siteNotes}`);
  });

  doc.end();
};
