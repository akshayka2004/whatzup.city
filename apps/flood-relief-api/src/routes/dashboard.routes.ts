import { Router } from "express";
import { prisma } from "../config/prisma";
import { authenticate, requireRole } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.use(authenticate, requireRole("ADMIN"));

interface ActivityItem {
  type: "Alert" | "Collection Centre" | "Relief Camp" | "Volunteer Group" | "Emergency Contact";
  title: string;
  action: "created" | "updated";
  timestamp: Date;
}

router.get(
  "/summary",
  asyncHandler(async (_req, res) => {
    const [totalAlerts, totalCentres, totalCamps, totalGroups] = await Promise.all([
      prisma.notification.count(),
      prisma.collectionCentre.count(),
      prisma.reliefCamp.count(),
      prisma.volunteerGroup.count(),
    ]);

    const RECENT_LIMIT = 5;
    const [alerts, centres, camps, groups, contacts] = await Promise.all([
      prisma.notification.findMany({
        orderBy: { updatedAt: "desc" },
        take: RECENT_LIMIT,
        select: { title: true, createdAt: true, updatedAt: true },
      }),
      prisma.collectionCentre.findMany({
        orderBy: { updatedAt: "desc" },
        take: RECENT_LIMIT,
        select: { name: true, createdAt: true, updatedAt: true },
      }),
      prisma.reliefCamp.findMany({
        orderBy: { updatedAt: "desc" },
        take: RECENT_LIMIT,
        select: { name: true, createdAt: true, updatedAt: true },
      }),
      prisma.volunteerGroup.findMany({
        orderBy: { updatedAt: "desc" },
        take: RECENT_LIMIT,
        select: { name: true, createdAt: true, updatedAt: true },
      }),
      prisma.emergencyContact.findMany({
        orderBy: { updatedAt: "desc" },
        take: RECENT_LIMIT,
        select: { department: true, officialName: true, createdAt: true, updatedAt: true },
      }),
    ]);

    const activity: ActivityItem[] = [
      ...alerts.map((a) => toActivity("Alert", a.title, a.createdAt, a.updatedAt)),
      ...centres.map((c) => toActivity("Collection Centre", c.name, c.createdAt, c.updatedAt)),
      ...camps.map((c) => toActivity("Relief Camp", c.name, c.createdAt, c.updatedAt)),
      ...groups.map((g) => toActivity("Volunteer Group", g.name, g.createdAt, g.updatedAt)),
      ...contacts.map((c) =>
        toActivity("Emergency Contact", `${c.department} — ${c.officialName}`, c.createdAt, c.updatedAt)
      ),
    ]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);

    res.json({
      success: true,
      data: {
        totals: {
          alerts: totalAlerts,
          collectionCentres: totalCentres,
          reliefCamps: totalCamps,
          volunteerGroups: totalGroups,
        },
        recentActivity: activity,
      },
    });
  })
);

function toActivity(
  type: ActivityItem["type"],
  title: string,
  createdAt: Date,
  updatedAt: Date
): ActivityItem {
  const wasUpdated = updatedAt.getTime() - createdAt.getTime() > 1000;
  return {
    type,
    title,
    action: wasUpdated ? "updated" : "created",
    timestamp: updatedAt,
  };
}

export default router;
