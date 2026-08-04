import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma";
import { validate } from "../middleware/validate";
import { authenticate, requireRole } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { getPagination, buildPaginatedResponse } from "../utils/pagination";
import { idParamSchema, paginationQuerySchema } from "../utils/zodHelpers";

const router = Router();

const userSelect = { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true } as const;

const createUserSchema = z.object({
  name: z.string().trim().min(2).max(150),
  email: z.string().trim().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(150),
  email: z.string().trim().email(),
  password: z.string().min(8).optional().or(z.literal("").transform(() => undefined)),
});

router.use(authenticate, requireRole("ADMIN"));

router.get(
  "/",
  validate({ query: paginationQuerySchema }),
  asyncHandler(async (req, res) => {
    const pagination = getPagination(req);
    const { search } = req.query as { search?: string };

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: userSelect,
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ success: true, data: buildPaginatedResponse(items, total, pagination) });
  })
);

router.post(
  "/",
  validate({ body: createUserSchema }),
  asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, passwordHash },
      select: userSelect,
    });
    res.status(201).json({ success: true, data: user });
  })
);

router.put(
  "/:id",
  validate({ params: idParamSchema, body: updateUserSchema }),
  asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;

    const user = await prisma.user
      .update({
        where: { id: req.params.id },
        data: {
          name,
          email,
          ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}),
        },
        select: userSelect,
      })
      .catch(() => {
        throw ApiError.notFound("User not found");
      });

    res.json({ success: true, data: user });
  })
);

router.delete(
  "/:id",
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    if (req.params.id === req.user!.id) {
      throw ApiError.badRequest("You cannot delete your own account while signed in");
    }
    await prisma.user.delete({ where: { id: req.params.id } }).catch(() => {
      throw ApiError.notFound("User not found");
    });
    res.status(204).send();
  })
);

export default router;
