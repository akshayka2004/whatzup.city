import { ListPageShell } from "@/components/public/ListPageShell";
import { CollectionCentreCard } from "@/components/public/CollectionCentreCard";
import { collectionCentresApi } from "@/api/resources";

export function CollectionCentresPage() {
  return (
    <ListPageShell
      title="Flood Relief Collection Centres"
      description="Locations accepting donations of food, clothing and essential supplies for flood relief."
      searchPlaceholder="Search collection centres..."
      emptyTitle="No collection centres found"
      emptyDescription="Try a different search term or district filter."
      queryKey="public-collection-centres"
      fetcher={collectionCentresApi.list}
      renderItem={(centre) => <CollectionCentreCard key={centre.id} centre={centre} />}
    />
  );
}
