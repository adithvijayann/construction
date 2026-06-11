import { AuditLog } from "../models/AuditLog.js";

export const writeAudit = async ({ actor, action, entityType, entityId, metadata = {} }) =>
  AuditLog.create({
    actor,
    action,
    entityType,
    entityId,
    metadata
  });
