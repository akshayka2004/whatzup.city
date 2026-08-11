import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "../../generated/prisma";
import { prisma } from "../config/prisma";
import { validate } from "../middleware/validate";
import { authenticate, requireRole } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { getPagination, buildPaginatedResponse } from "../utils/pagination";
import { idParamSchema, paginationQuerySchema, phoneSchema } from "../utils/zodHelpers";
import { DISTRICTS, PRIORITIES, CENTRE_STATUSES } from "../constants";

const router = Router();

const officialSchema = z.object({
  name: z.string().trim().min(2).max(150),
  designation: z.string().trim().min(2).max(150),
  contactNumber: phoneSchema,
});

const requirementSchema = z.object({
  itemName: z.string().trim().min(2).max(150),
  quantity: z.string().trim().min(1).max(100),
  priority: z.enum(PRIORITIES).default("MEDIUM"),
});

const centreBodySchema = z.object({
  name: z.string().trim().min(2).max(200),
  district: z.enum(DISTRICTS),
  region: z.string().trim().min(1).max(150),
  address: z.string().trim().min(3),
  mapLink: z.string().trim().url().optional().or(z.literal("").transform(() => undefined)),
  contactName: z.string().trim().min(2).max(150),
  contactDesignation: z.string().trim().min(2).max(150),
  contactPhone: phoneSchema,
  contactAltPhone: phoneSchema.optional().or(z.literal("").transform(() => undefined)),
  workingHours: z.string().trim().max(150).optional().or(z.literal("").transform(() => undefined)),
  remarks: z.string().trim().max(2000).optional().or(z.literal("").transform(() => undefined)),
  status: z.enum(CENTRE_STATUSES).default("OPEN"),
  officials: z.array(officialSchema).default([]),
  requirements: z.array(requirementSchema).default([]),
});

const include = { officials: true, requirements: true } satisfies Prisma.CollectionCentreInclude;

router.get(
  "/",
  validate({ query: paginationQuerySchema }),
  asyncHandler(async (req, res) => {
    const pagination = getPagination(req);
    const { search, district } = req.query as { search?: string; district?: string };

    const where: Prisma.CollectionCentreWhereInput = {
      ...(district ? { district: district as never } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { region: { contains: search, mode: "insensitive" } },
              { address: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.collectionCentre.findMany({
        where,
        include,
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.collectionCentre.count({ where }),
    ]);

    res.json({ success: true, data: buildPaginatedResponse(items, total, pagination) });
  })
);

router.get(
  "/:id",
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const centre = await prisma.collectionCentre.findUnique({
      where: { id: req.params.id },
      include,
    });
    if (!centre) throw ApiError.notFound("Collection centre not found");
    res.json({ success: true, data: centre });
  })
);

router.post(
  "/",
  authenticate,
  requireRole("ADMIN"),
  validate({ body: centreBodySchema }),
  asyncHandler(async (req, res) => {
    const { officials, requirements, ...data } = req.body;
    const centre = await prisma.collectionCentre.create({
      data: { ...data, officials: { create: officials }, requirements: { create: requirements } },
      include,
    });
    res.status(201).json({ success: true, data: centre });
  })
);

router.put(
  "/:id",
  authenticate,
  requireRole("ADMIN"),
  validate({ params: idParamSchema, body: centreBodySchema }),
  asyncHandler(async (req, res) => {
    const { officials, requirements, ...data } = req.body;
    const existing = await prisma.collectionCentre.findUnique({ where: { id: req.params.id } });
    if (!existing) throw ApiError.notFound("Collection centre not found");

    const centre = await prisma.$transaction(async (tx) => {
      await tx.collectionCentreOfficial.deleteMany({ where: { centreId: req.params.id } });
      await tx.collectionCentreRequirement.deleteMany({ where: { centreId: req.params.id } });
      return tx.collectionCentre.update({
        where: { id: req.params.id },
        data: { ...data, officials: { create: officials }, requirements: { create: requirements } },
        include,
      });
    });

    res.json({ success: true, data: centre });
  })
);

router.delete(
  "/:id",
  authenticate,
  requireRole("ADMIN"),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    await prisma.collectionCentre.delete({ where: { id: req.params.id } }).catch(() => {
      throw ApiError.notFound("Collection centre not found");
    });
    res.status(204).send();
  })
);

export default router;
