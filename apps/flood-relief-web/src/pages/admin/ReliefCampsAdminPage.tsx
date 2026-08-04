import { AdminListShell } from "@/components/admin/AdminListShell";
import { ReliefCampForm } from "@/components/admin/forms/ReliefCampForm";
import { DistrictBadge } from "@/components/StatusBadges";
import type { Column } from "@/components/admin/DataTable";
import { reliefCampsApi } from "@/api/resources";
import type { ReliefCamp } from "@/types";

const columns: Column<ReliefCamp>[] = [
  {
    header: "Name",
    render: (camp) => (
      <div>
        <p className="font-medium text-primary-900">{camp.name}</p>
        <p className="text-xs text-primary-500">{camp.region}</p>
      </div>
    ),
  },
  { header: "District", render: (camp) => <DistrictBadge district={camp.district} /> },
  { header: "Contact", render: (camp) => `${camp.contactName} (${camp.contactPhone})` },
  {
    header: "Requirements",
    render: (camp) => {
      const high = camp.requirements.filter((r) => r.priority === "HIGH").length;
      return `${camp.requirements.length} total${high ? ` · ${high} urgent` : ""}`;
    },
  },
];

export function ReliefCampsAdminPage() {
  return (
    <AdminListShell
      title="Relief Camps"
      description="Manage flood relief camps, officials and daily requirements."
      searchPlaceholder="Search relief camps..."
      addButtonLabel="Add Camp"
      emptyTitle="No relief camps yet"
      queryKey="admin-relief-camps"
      resourceApi={reliefCampsApi}
      columns={columns}
      getItemLabel={(camp) => camp.name}
      renderForm={({ initialValue, onSubmit, isSubmitting }) => (
        <ReliefCampForm initialValue={initialValue} onSubmit={onSubmit} isSubmitting={isSubmitting} />
      )}
    />
  );
}
