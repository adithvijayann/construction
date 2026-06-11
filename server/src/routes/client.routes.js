import express from "express";
import { clientProgress, clientProjectDetails } from "../controllers/client.controller.js";
import { permit, protect } from "../middleware/auth.js";

export const clientRouter = express.Router();

clientRouter.use(protect, permit("client"));

clientRouter.get("/project-details", clientProjectDetails);
clientRouter.get("/progress", clientProgress);
