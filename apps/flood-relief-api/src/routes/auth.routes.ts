import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma";
import { validate } from "../middleware/validate";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { signToken } from "../utils/jwt";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post(
  "/login",
  validate({ body: loginSchema }),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw ApiError.unauthorized("Invalid email or password");
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw ApiError.unauthorized("Invalid email or password");
    }

    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    } as const;

    const token = signToken(payload);

    res.json({
      success: true,
      data: { token, user: payload },
    });
  })
);

router.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    res.json({ success: true, data: req.user });
  })
);

export default router;
