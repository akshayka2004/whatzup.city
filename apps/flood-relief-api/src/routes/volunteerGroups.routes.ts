import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "../../generated/prisma";
import { prisma } from "../config/prisma";
import { validate } from "../middleware/validate";
import { authenticate, requireRole } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { getPagination, buildPaginatedResponse } from "../utils/pagination";
import { idParamSchema, paginationQuerySchema, phoneSchema, optionalUrl } from "../utils/zodHelpers";
import { DISTRICTS } from "../constants";

const router = Router();

const officialSchema = z.object({
  name: z.string().trim().min(2).max(150),
  designation: z.string().trim().min(2).max(150),
  department: z.string().trim().min(2).max(150),
  contactNumber: phoneSchema,
});

const groupBodySchema = z.object({
  name: z.string().trim().min(2).max(200),
  district: z.enum(DISTRICTS),
  region: z.string().trim().min(1).max(150),
  coordinatorName: z.string().trim().min(2).max(150),
  coordinatorPhone: phoneSchema,
  whatsappLink: optionalUrl,
  telegramLink: optionalUrl,
  website: optionalUrl,
  remarks: z.string().trim().max(2000).optional().or(z.literal("").transform(() => undefined)),
  officials: z.array(officialSchema).default([]),
});

const include = { officials: true } satisfies Prisma.VolunteerGroupInclude;

router.get(
  "/",
  validate({ query: paginationQuerySchema }),
  asyncHandler(async (req, res) => {
    const pagination = getPagination(req);
    const { search, district } = req.query as { search?: string; district?: string };

    const where: Prisma.VolunteerGroupWhereInput = {
      ...(district ? { district: district as never } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { region: { contains: search, mode: "insensitive" } },
              { coordinatorName: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.volunteerGroup.findMany({
        where,
        include,
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.volunteerGroup.count({ where }),
    ]);

    res.json({ success: true, data: buildPaginatedResponse(items, total, pagination) });
  })
);

router.get(
  "/:id",
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const group = await prisma.volunteerGroup.findUnique({ where: { id: req.params.id }, include });
    if (!group) throw ApiError.notFound("Volunteer group not found");
    res.json({ success: true, data: group });
  })
);

router.post(
  "/",
  authenticate,
  requireRole("ADMIN"),
  validate({ body: groupBodySchema }),
  asyncHandler(async (req, res) => {
    const { officials, ...data } = req.body;
    const group = await prisma.volunteerGroup.create({
      data: { ...data, officials: { create: officials } },
      include,
    });
    res.status(201).json({ success: true, data: group });
  })
);

router.put(
  "/:id",
  authenticate,
  requireRole("ADMIN"),
  validate({ params: idParamSchema, body: groupBodySchema }),
  asyncHandler(async (req, res) => {
    const { officials, ...data } = req.body;
    const existing = await prisma.volunteerGroup.findUnique({ where: { id: req.params.id } });
    if (!existing) throw ApiError.notFound("Volunteer group not found");

    const group = await prisma.$transaction(async (tx) => {
      await tx.volunteerGroupOfficial.deleteMany({ where: { groupId: req.params.id } });
      return tx.volunteerGroup.update({
        where: { id: req.params.id },
        data: { ...data, officials: { create: officials } },
        include,
      });
    });

    res.json({ success: true, data: group });
  })
);

router.delete(
  "/:id",
  authenticate,
  requireRole("ADMIN"),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    await prisma.volunteerGroup.delete({ where: { id: req.params.id } }).catch(() => {
      throw ApiError.notFound("Volunteer group not found");
    });
    res.status(204).send();
  })
);

export default router;
