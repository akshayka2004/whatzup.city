import { AdminListShell } from "@/components/admin/AdminListShell";
import { CollectionCentreForm } from "@/components/admin/forms/CollectionCentreForm";
import { DistrictBadge } from "@/components/StatusBadges";
import type { Column } from "@/components/admin/DataTable";
import { collectionCentresApi } from "@/api/resources";
import type { CollectionCentre } from "@/types";

const columns: Column<CollectionCentre>[] = [
  {
    header: "Name",
    render: (centre) => (
      <div>
        <p className="font-medium text-primary-900">{centre.name}</p>
        <p className="text-xs text-primary-500">{centre.region}</p>
      </div>
    ),
  },
  { header: "District", render: (centre) => <DistrictBadge district={centre.district} /> },
  { header: "Contact", render: (centre) => `${centre.contactName} (${centre.contactPhone})` },
  { header: "Officials", render: (centre) => centre.officials.length },
];

export function CollectionCentresAdminPage() {
  return (
    <AdminListShell
      title="Collection Centres"
      description="Manage flood relief collection centres and their officials."
      searchPlaceholder="Search collection centres..."
      addButtonLabel="Add Centre"
      emptyTitle="No collection centres yet"
      queryKey="admin-collection-centres"
      resourceApi={collectionCentresApi}
      columns={columns}
      getItemLabel={(centre) => centre.name}
      renderForm={({ initialValue, onSubmit, isSubmitting }) => (
        <CollectionCentreForm initialValue={initialValue} onSubmit={onSubmit} isSubmitting={isSubmitting} />
      )}
    />
  );
}
