import type { ReactNode } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { Pagination } from "@/components/ui/Pagination";
import { Spinner, EmptyState, ErrorState } from "@/components/ui/States";
import { usePaginatedResource } from "@/hooks/usePaginatedResource";
import type { ListParams } from "@/api/resource";
import type { Paginated } from "@/types";
import { getApiErrorMessage } from "@/api/client";

interface ListPageShellProps<T> {
  title: string;
  description: string;
  searchPlaceholder: string;
  emptyTitle: string;
  emptyDescription: string;
  queryKey: string;
  fetcher: (params: ListParams) => Promise<Paginated<T>>;
  renderItem: (item: T) => ReactNode;
  gridClassName?: string;
}

export function ListPageShell<T extends { id: string }>({
  title,
  description,
  searchPlaceholder,
  emptyTitle,
  emptyDescription,
  queryKey,
  fetcher,
  renderItem,
  gridClassName = "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3",
}: ListPageShellProps<T>) {
  const { query, search, setSearch, district, setDistrict, setPage } = usePaginatedResource(
    queryKey,
    fetcher
  );

  return (
    <div className="container-page flex flex-col gap-6 py-10">
      <PageHeader title={title} description={description} />
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        district={district}
        onDistrictChange={setDistrict}
        searchPlaceholder={searchPlaceholder}
      />

      {query.isLoading && <Spinner />}

      {query.isError && (
        <ErrorState message={getApiErrorMessage(query.error)} onRetry={() => query.refetch()} />
      )}

      {query.isSuccess && query.data.items.length === 0 && (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      )}

      {query.isSuccess && query.data.items.length > 0 && (
        <>
          <div className={gridClassName}>{query.data.items.map(renderItem)}</div>
          <Pagination pagination={query.data.pagination} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
