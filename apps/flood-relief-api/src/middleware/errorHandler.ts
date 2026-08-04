import type { NextFunction, Request, Response } from "express";
import { Prisma } from "../../generated/prisma";
import { ZodError } from "zod";
import { ApiError } from "../utils/ApiError";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      details: err.details,
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      details: err.flatten().fieldErrors,
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: `A record with this ${(err.meta?.target as string[])?.join(", ") ?? "value"} already exists`,
      });
    }
    if (err.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Resource not found",
      });
    }
  }

  console.error(err);
  return res.status(500).json({
    success: false,
    message: "Internal server error",
  });
}
