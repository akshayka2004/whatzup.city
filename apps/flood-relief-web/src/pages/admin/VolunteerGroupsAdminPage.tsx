import { AdminListShell } from "@/components/admin/AdminListShell";
import { VolunteerGroupForm } from "@/components/admin/forms/VolunteerGroupForm";
import { DistrictBadge } from "@/components/StatusBadges";
import type { Column } from "@/components/admin/DataTable";
import { volunteerGroupsApi } from "@/api/resources";
import type { VolunteerGroup } from "@/types";

const columns: Column<VolunteerGroup>[] = [
  {
    header: "Name",
    render: (group) => (
      <div>
        <p className="font-medium text-primary-900">{group.name}</p>
        <p className="text-xs text-primary-500">{group.region}</p>
      </div>
    ),
  },
  { header: "District", render: (group) => <DistrictBadge district={group.district} /> },
  { header: "Coordinator", render: (group) => `${group.coordinatorName} (${group.coordinatorPhone})` },
  { header: "Officials", render: (group) => group.officials.length },
];

export function VolunteerGroupsAdminPage() {
  return (
    <AdminListShell
      title="Volunteer Groups"
      description="Manage independent volunteer groups coordinating relief efforts."
      searchPlaceholder="Search volunteer groups..."
      addButtonLabel="Add Group"
      emptyTitle="No volunteer groups yet"
      queryKey="admin-volunteer-groups"
      resourceApi={volunteerGroupsApi}
      columns={columns}
      getItemLabel={(group) => group.name}
      renderForm={({ initialValue, onSubmit, isSubmitting }) => (
        <VolunteerGroupForm initialValue={initialValue} onSubmit={onSubmit} isSubmitting={isSubmitting} />
      )}
    />
  );
}
