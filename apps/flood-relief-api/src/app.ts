import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

import authRoutes from "./routes/auth.routes";
import alertsRoutes from "./routes/alerts.routes";
import collectionCentresRoutes from "./routes/collectionCentres.routes";
import reliefCampsRoutes from "./routes/reliefCamps.routes";
import volunteerGroupsRoutes from "./routes/volunteerGroups.routes";
import emergencyContactsRoutes from "./routes/emergencyContacts.routes";
import usersRoutes from "./routes/users.routes";
import dashboardRoutes from "./routes/dashboard.routes";

export const app = express();

app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json({ limit: "1mb" }));
if (env.nodeEnv !== "test") {
  app.use(morgan(env.nodeEnv === "development" ? "dev" : "combined"));
}

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many login attempts. Please try again later." },
});

// express-rate-limit's shipped .d.ts imports `express`'s types by bare specifier;
// in this pnpm workspace that resolution walks up to a different hoisted
// @types/express-serve-static-core copy than this package's own, making its
// RequestHandler structurally incompatible at the type level only — both are the
// real `express` RequestHandler at runtime.
app.use("/api", apiLimiter as unknown as express.RequestHandler);

app.get("/api/health", (_req, res) => {
  res.json({ success: true, message: "Kerala Flood Relief Portal API is running" });
});

app.use("/api/auth", authLimiter as unknown as express.RequestHandler, authRoutes);
app.use("/api/alerts", alertsRoutes);
app.use("/api/collection-centres", collectionCentresRoutes);
app.use("/api/relief-camps", reliefCampsRoutes);
app.use("/api/volunteer-groups", volunteerGroupsRoutes);
app.use("/api/emergency-contacts", emergencyContactsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
