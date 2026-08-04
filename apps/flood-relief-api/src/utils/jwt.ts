import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import type { AuthPayload } from "../middleware/auth";

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"],
  });
}
