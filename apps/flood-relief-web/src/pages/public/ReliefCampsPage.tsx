import { ListPageShell } from "@/components/public/ListPageShell";
import { ReliefCampCard } from "@/components/public/ReliefCampCard";
import { reliefCampsApi } from "@/api/resources";

export function ReliefCampsPage() {
  return (
    <ListPageShell
      title="Flood Relief Camps"
      description="Active relief camps sheltering displaced residents, along with their daily requirements."
      searchPlaceholder="Search relief camps..."
      emptyTitle="No relief camps found"
      emptyDescription="Try a different search term or district filter."
      queryKey="public-relief-camps"
      fetcher={reliefCampsApi.list}
      renderItem={(camp) => <ReliefCampCard key={camp.id} camp={camp} />}
    />
  );
}
