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
import { DISTRICTS } from "../constants";

const router = Router();

const contactBodySchema = z.object({
  department: z.string().trim().min(2).max(150),
  officialName: z.string().trim().min(2).max(150),
  designation: z.string().trim().min(2).max(150),
  district: z.enum(DISTRICTS),
  phoneNumber: phoneSchema,
});

router.get(
  "/",
  validate({ query: paginationQuerySchema }),
  asyncHandler(async (req, res) => {
    const pagination = getPagination(req);
    const { search, district } = req.query as { search?: string; district?: string };

    const where: Prisma.EmergencyContactWhereInput = {
      ...(district ? { district: district as never } : {}),
      ...(search
        ? {
            OR: [
              { department: { contains: search, mode: "insensitive" } },
              { officialName: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.emergencyContact.findMany({
        where,
        orderBy: { department: "asc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.emergencyContact.count({ where }),
    ]);

    res.json({ success: true, data: buildPaginatedResponse(items, total, pagination) });
  })
);

router.get(
  "/:id",
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const contact = await prisma.emergencyContact.findUnique({ where: { id: req.params.id } });
    if (!contact) throw ApiError.notFound("Emergency contact not found");
    res.json({ success: true, data: contact });
  })
);

router.post(
  "/",
  authenticate,
  requireRole("ADMIN"),
  validate({ body: contactBodySchema }),
  asyncHandler(async (req, res) => {
    const contact = await prisma.emergencyContact.create({ data: req.body });
    res.status(201).json({ success: true, data: contact });
  })
);

router.put(
  "/:id",
  authenticate,
  requireRole("ADMIN"),
  validate({ params: idParamSchema, body: contactBodySchema }),
  asyncHandler(async (req, res) => {
    const contact = await prisma.emergencyContact
      .update({ where: { id: req.params.id }, data: req.body })
      .catch(() => {
        throw ApiError.notFound("Emergency contact not found");
      });
    res.json({ success: true, data: contact });
  })
);

router.delete(
  "/:id",
  authenticate,
  requireRole("ADMIN"),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    await prisma.emergencyContact.delete({ where: { id: req.params.id } }).catch(() => {
      throw ApiError.notFound("Emergency contact not found");
    });
    res.status(204).send();
  })
);

export default router;
