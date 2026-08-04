import { useQuery } from "@tanstack/react-query";
import { Megaphone, Warehouse, Tent, HeartHandshake, History } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { Spinner, ErrorState, EmptyState } from "@/components/ui/States";
import { fetchDashboardSummary } from "@/api/dashboard";
import { getApiErrorMessage } from "@/api/client";

export function DashboardPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-dashboard-summary"],
    queryFn: fetchDashboardSummary,
  });

  if (isLoading) return <Spinner label="Loading dashboard..." />;
  if (isError) return <ErrorState message={getApiErrorMessage(error)} onRetry={() => refetch()} />;
  if (!data) return null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Dashboard" description="Overview of relief operations across Kerala." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Alerts" value={data.totals.alerts} icon={Megaphone} tone="danger" />
        <StatCard label="Collection Centres" value={data.totals.collectionCentres} icon={Warehouse} tone="accent" />
        <StatCard label="Relief Camps" value={data.totals.reliefCamps} icon={Tent} tone="warning" />
        <StatCard label="Volunteer Groups" value={data.totals.volunteerGroups} icon={HeartHandshake} tone="success" />
      </div>

      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <History className="size-5 text-primary-500" aria-hidden="true" />
          <h2 className="font-heading text-lg font-semibold text-primary-900">Recent Activity</h2>
        </div>
        {data.recentActivity.length === 0 ? (
          <EmptyState title="No activity yet" description="Newly created or updated records will appear here." />
        ) : (
          <ul className="flex flex-col divide-y divide-border-subtle">
            {data.recentActivity.map((item, index) => (
              <li key={index} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium text-primary-900">
                    {item.title}
                  </p>
                  <p className="text-xs text-primary-500">
                    {item.type} · {item.action}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-primary-400">
                  {new Date(item.timestamp).toLocaleString("en-IN", {
                    day: "numeric",
                    month: "short",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
