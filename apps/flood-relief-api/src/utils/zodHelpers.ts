import { z } from "zod";

export const idParamSchema = z.object({
  id: z.string().uuid("Invalid id"),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().optional(),
  district: z.string().optional(),
});

export const phoneSchema = z
  .string()
  .trim()
  .min(6, "Phone number is too short")
  .max(20, "Phone number is too long");

export const optionalUrl = z
  .string()
  .trim()
  .url("Must be a valid URL")
  .optional()
  .or(z.literal("").transform(() => undefined));
