import { AdminListShell } from "@/components/admin/AdminListShell";
import { AlertForm } from "@/components/admin/forms/AlertForm";
import { AlertCategoryBadge, AlertStatusBadge, DistrictBadge } from "@/components/StatusBadges";
import { Pin } from "lucide-react";
import type { Column } from "@/components/admin/DataTable";
import { alertsApi } from "@/api/resources";
import type { Alert } from "@/types";

const columns: Column<Alert>[] = [
  {
    header: "Title",
    render: (alert) => (
      <div className="flex items-start gap-1.5">
        {alert.isPinned && <Pin className="mt-0.5 size-3.5 shrink-0 text-warning-600" aria-hidden="true" />}
        <div>
          <p className="font-medium text-primary-900">{alert.title}</p>
          <p className="line-clamp-1 text-xs text-primary-500">{alert.description}</p>
        </div>
      </div>
    ),
  },
  { header: "Category", render: (alert) => <AlertCategoryBadge category={alert.category} /> },
  { header: "District", render: (alert) => <DistrictBadge district={alert.district} /> },
  { header: "Status", render: (alert) => <AlertStatusBadge status={alert.status} /> },
  {
    header: "Published",
    render: (alert) => new Date(alert.publishedDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
  },
];

export function AlertsAdminPage() {
  return (
    <AdminListShell
      title="Alerts"
      description="Publish and manage flood relief alerts and notifications."
      searchPlaceholder="Search alerts..."
      addButtonLabel="Add Alert"
      emptyTitle="No alerts yet"
      queryKey="admin-alerts"
      resourceApi={alertsApi}
      columns={columns}
      getItemLabel={(alert) => alert.title}
      renderForm={({ initialValue, onSubmit, isSubmitting }) => (
        <AlertForm initialValue={initialValue} onSubmit={onSubmit} isSubmitting={isSubmitting} />
      )}
    />
  );
}
