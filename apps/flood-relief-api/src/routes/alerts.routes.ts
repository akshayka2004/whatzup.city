import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "../../generated/prisma";
import { prisma } from "../config/prisma";
import { validate } from "../middleware/validate";
import { authenticate, optionalAuthenticate, requireRole } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { getPagination, buildPaginatedResponse } from "../utils/pagination";
import { idParamSchema, paginationQuerySchema } from "../utils/zodHelpers";
import { ALERT_CATEGORIES, ALERT_STATUSES, DISTRICTS } from "../constants";

const router = Router();

const alertBodySchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(3),
  category: z.enum(ALERT_CATEGORIES),
  district: z.enum(DISTRICTS),
  publishedDate: z.coerce.date(),
  status: z.enum(ALERT_STATUSES).default("ACTIVE"),
  isPinned: z.boolean().default(false),
});

router.get(
  "/",
  optionalAuthenticate,
  validate({ query: paginationQuerySchema }),
  asyncHandler(async (req, res) => {
    const pagination = getPagination(req);
    const { search, district } = req.query as { search?: string; district?: string };
    const isAdmin = Boolean(req.user);

    const where: Prisma.NotificationWhereInput = {
      ...(isAdmin ? {} : { status: { in: ["ACTIVE", "RESOLVED"] } }),
      ...(district ? { district: district as never } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: [{ isPinned: "desc" }, { publishedDate: "desc" }],
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.notification.count({ where }),
    ]);

    res.json({ success: true, data: buildPaginatedResponse(items, total, pagination) });
  })
);

router.get(
  "/:id",
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const alert = await prisma.notification.findUnique({ where: { id: req.params.id } });
    if (!alert) throw ApiError.notFound("Alert not found");
    res.json({ success: true, data: alert });
  })
);

router.post(
  "/",
  authenticate,
  requireRole("ADMIN"),
  validate({ body: alertBodySchema }),
  asyncHandler(async (req, res) => {
    const alert = await prisma.notification.create({ data: req.body });
    res.status(201).json({ success: true, data: alert });
  })
);

router.put(
  "/:id",
  authenticate,
  requireRole("ADMIN"),
  validate({ params: idParamSchema, body: alertBodySchema }),
  asyncHandler(async (req, res) => {
    const alert = await prisma.notification
      .update({ where: { id: req.params.id }, data: req.body })
      .catch(() => {
        throw ApiError.notFound("Alert not found");
      });
    res.json({ success: true, data: alert });
  })
);

router.delete(
  "/:id",
  authenticate,
  requireRole("ADMIN"),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    await prisma.notification.delete({ where: { id: req.params.id } }).catch(() => {
      throw ApiError.notFound("Alert not found");
    });
    res.status(204).send();
  })
);

export default router;
