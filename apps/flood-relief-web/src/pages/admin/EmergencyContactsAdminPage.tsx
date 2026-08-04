import { AdminListShell } from "@/components/admin/AdminListShell";
import { EmergencyContactForm } from "@/components/admin/forms/EmergencyContactForm";
import { DistrictBadge } from "@/components/StatusBadges";
import type { Column } from "@/components/admin/DataTable";
import { emergencyContactsApi } from "@/api/resources";
import type { EmergencyContact } from "@/types";

const columns: Column<EmergencyContact>[] = [
  { header: "Department", render: (c) => <span className="font-medium text-primary-900">{c.department}</span> },
  { header: "Official", render: (c) => `${c.officialName} · ${c.designation}` },
  { header: "District", render: (c) => <DistrictBadge district={c.district} /> },
  { header: "Phone", render: (c) => c.phoneNumber },
];

export function EmergencyContactsAdminPage() {
  return (
    <AdminListShell
      title="Emergency Contacts"
      description="Manage department and official emergency contact numbers."
      searchPlaceholder="Search emergency contacts..."
      addButtonLabel="Add Contact"
      emptyTitle="No emergency contacts yet"
      queryKey="admin-emergency-contacts"
      resourceApi={emergencyContactsApi}
      columns={columns}
      getItemLabel={(contact) => contact.department}
      renderForm={({ initialValue, onSubmit, isSubmitting }) => (
        <EmergencyContactForm initialValue={initialValue} onSubmit={onSubmit} isSubmitting={isSubmitting} />
      )}
    />
  );
}
