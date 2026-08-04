import { api } from "./client";
import type { Paginated } from "@/types";

export interface ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  district?: string;
}

export function createResourceApi<TItem, TInput = Partial<TItem>>(basePath: string) {
  return {
    list: async (params: ListParams = {}) => {
      const { data } = await api.get<{ success: true; data: Paginated<TItem> }>(basePath, {
        params,
      });
      return data.data;
    },
    get: async (id: string) => {
      const { data } = await api.get<{ success: true; data: TItem }>(`${basePath}/${id}`);
      return data.data;
    },
    create: async (input: TInput) => {
      const { data } = await api.post<{ success: true; data: TItem }>(basePath, input);
      return data.data;
    },
    update: async (id: string, input: TInput) => {
      const { data } = await api.put<{ success: true; data: TItem }>(`${basePath}/${id}`, input);
      return data.data;
    },
    remove: async (id: string) => {
      await api.delete(`${basePath}/${id}`);
    },
  };
}
