import mongoose from "mongoose";
import { z } from "zod";

export const objectId = z.string().refine((value) => mongoose.isValidObjectId(value), "Invalid MongoDB id");

export const dateOnly = z.coerce.date();

export const paginationQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25)
});

export const optionalDateRangeQuery = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional()
});
