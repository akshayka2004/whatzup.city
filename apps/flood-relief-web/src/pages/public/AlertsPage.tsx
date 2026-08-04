import { ListPageShell } from "@/components/public/ListPageShell";
import { AlertCard } from "@/components/public/AlertCard";
import { alertsApi } from "@/api/resources";

export function AlertsPage() {
  return (
    <ListPageShell
      title="Alerts & Notifications"
      description="Official flood alerts, warnings and advisories published by relief authorities across Kerala."
      searchPlaceholder="Search alerts by title or description..."
      emptyTitle="No alerts found"
      emptyDescription="Try a different search term or district filter."
      queryKey="public-alerts"
      fetcher={alertsApi.list}
      renderItem={(alert) => <AlertCard key={alert.id} alert={alert} />}
    />
  );
}
