import { ListPageShell } from "@/components/public/ListPageShell";
import { VolunteerGroupCard } from "@/components/public/VolunteerGroupCard";
import { volunteerGroupsApi } from "@/api/resources";

export function VolunteerGroupsPage() {
  return (
    <ListPageShell
      title="Volunteer Groups"
      description="Independent volunteer collectives coordinating rescue, relief and distribution efforts."
      searchPlaceholder="Search volunteer groups..."
      emptyTitle="No volunteer groups found"
      emptyDescription="Try a different search term or district filter."
      queryKey="public-volunteer-groups"
      fetcher={volunteerGroupsApi.list}
      renderItem={(group) => <VolunteerGroupCard key={group.id} group={group} />}
    />
  );
}
