import { ListPageShell } from "@/components/public/ListPageShell";
import { EmergencyContactCard } from "@/components/public/EmergencyContactCard";
import { emergencyContactsApi } from "@/api/resources";

export function EmergencyContactsPage() {
  return (
    <ListPageShell
      title="Emergency Contacts"
      description="Department and official contact numbers for flood-related emergencies across Kerala."
      searchPlaceholder="Search by department or official name..."
      emptyTitle="No emergency contacts found"
      emptyDescription="Try a different search term or district filter."
      queryKey="public-emergency-contacts"
      fetcher={emergencyContactsApi.list}
      gridClassName="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      renderItem={(contact) => <EmergencyContactCard key={contact.id} contact={contact} />}
    />
  );
}
