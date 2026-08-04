import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { ListParams } from "@/api/resource";
import type { Paginated } from "@/types";
import { useDebouncedValue } from "./useDebouncedValue";

export function usePaginatedResource<T>(
  queryKey: string,
  fetcher: (params: ListParams) => Promise<Paginated<T>>,
  extraParams: Record<string, string> = {}
) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [district, setDistrict] = useState("");
  const debouncedSearch = useDebouncedValue(search);

  const params: ListParams = {
    page,
    pageSize: 10,
    search: debouncedSearch || undefined,
    district: district || undefined,
    ...extraParams,
  };

  const query = useQuery({
    queryKey: [queryKey, params],
    queryFn: () => fetcher(params),
    placeholderData: keepPreviousData,
  });

  function updateSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function updateDistrict(value: string) {
    setDistrict(value);
    setPage(1);
  }

  return {
    query,
    page,
    setPage,
    search,
    setSearch: updateSearch,
    district,
    setDistrict: updateDistrict,
  };
}
