import express from "express";
import { z } from "zod";
import {
  adminOverview,
  adminReports,
  createContractor,
  deactivateContractor,
  deleteContractor,
  listContractors,
  updateContractor
} from "../controllers/admin.controller.js";
import { permit, protect } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { objectId } from "../validators/common.js";

export const adminRouter = express.Router();

adminRouter.use(protect, permit("admin"));

const contractorBody = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  companyName: z.string().min(2).max(160),
  phone: z.string().max(40).optional().default(""),
  address: z.string().max(500).optional().default(""),
  loginUrl: z.string().url().optional().or(z.literal(""))
});

adminRouter.get("/overview", adminOverview);
adminRouter.get("/reports", adminReports);
adminRouter.get("/contractors", listContractors);
adminRouter.post("/contractors", validate(z.object({ body: contractorBody })), createContractor);
adminRouter.put(
  "/contractors/:contractorId",
  validate(
    z.object({
      params: z.object({ contractorId: objectId }),
      body: contractorBody.partial().extend({ isActive: z.boolean().optional() })
    })
  ),
  updateContractor
);
adminRouter.patch(
  "/contractors/:contractorId/deactivate",
  validate(z.object({ params: z.object({ contractorId: objectId }) })),
  deactivateContractor
);
adminRouter.delete(
  "/contractors/:contractorId",
  validate(z.object({ params: z.object({ contractorId: objectId }) })),
  deleteContractor
);
