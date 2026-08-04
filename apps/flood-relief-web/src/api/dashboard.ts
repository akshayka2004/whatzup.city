import { api } from "./client";
import type { DashboardSummary } from "@/types";

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const { data } = await api.get<{ success: true; data: DashboardSummary }>("/dashboard/summary");
  return data.data;
}
