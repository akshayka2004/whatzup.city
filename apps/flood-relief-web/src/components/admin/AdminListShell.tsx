import { useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { Pagination } from "@/components/ui/Pagination";
import { Spinner, EmptyState, ErrorState } from "@/components/ui/States";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { usePaginatedResource } from "@/hooks/usePaginatedResource";
import { getApiErrorMessage } from "@/api/client";
import type { ListParams } from "@/api/resource";
import type { Paginated } from "@/types";

interface ResourceApi<T, TInput> {
  list: (params: ListParams) => Promise<Paginated<T>>;
  create: (input: TInput) => Promise<T>;
  update: (id: string, input: TInput) => Promise<T>;
  remove: (id: string) => Promise<void>;
}

interface AdminListShellProps<T extends { id: string }, TInput> {
  title: string;
  description: string;
  searchPlaceholder: string;
  addButtonLabel: string;
  emptyTitle: string;
  queryKey: string;
  resourceApi: ResourceApi<T, TInput>;
  columns: Column<T>[];
  showDistrictFilter?: boolean;
  getItemLabel: (item: T) => string;
  renderForm: (args: {
    initialValue: T | null;
    onSubmit: (input: TInput) => void;
    isSubmitting: boolean;
  }) => ReactNode;
}

export function AdminListShell<T extends { id: string }, TInput>({
  title,
  description,
  searchPlaceholder,
  addButtonLabel,
  emptyTitle,
  queryKey,
  resourceApi,
  columns,
  showDistrictFilter = true,
  getItemLabel,
  renderForm,
}: AdminListShellProps<T, TInput>) {
  const queryClient = useQueryClient();
  const { query, search, setSearch, district, setDistrict, setPage } = usePaginatedResource(
    queryKey,
    resourceApi.list
  );

  const [formState, setFormState] = useState<{ open: boolean; item: T | null }>({ open: false, item: null });
  const [deletingItem, setDeletingItem] = useState<T | null>(null);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: [queryKey] });
  }

  const createMutation = useMutation({
    mutationFn: (input: TInput) => resourceApi.create(input),
    onSuccess: () => {
      toast.success("Created successfully");
      setFormState({ open: false, item: null });
      invalidate();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: TInput }) => resourceApi.update(id, input),
    onSuccess: () => {
      toast.success("Updated successfully");
      setFormState({ open: false, item: null });
      invalidate();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => resourceApi.remove(id),
    onSuccess: () => {
      toast.success("Deleted successfully");
      setDeletingItem(null);
      invalidate();
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
      setDeletingItem(null);
    },
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  function handleSubmit(input: TInput) {
    if (formState.item) {
      updateMutation.mutate({ id: formState.item.id, input });
    } else {
      createMutation.mutate(input);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={title}
        description={description}
        action={
          <Button onClick={() => setFormState({ open: true, item: null })}>
            <Plus className="size-4.5" aria-hidden="true" />
            {addButtonLabel}
          </Button>
        }
      />

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        district={district}
        onDistrictChange={setDistrict}
        searchPlaceholder={searchPlaceholder}
        showDistrictFilter={showDistrictFilter}
      />

      <div className="rounded-xl border border-border-subtle bg-white">
        {query.isLoading && <Spinner />}
        {query.isError && <ErrorState message={getApiErrorMessage(query.error)} onRetry={() => query.refetch()} />}
        {query.isSuccess && query.data.items.length === 0 && (
          <EmptyState
            title={emptyTitle}
            action={
              <Button variant="outline" size="sm" onClick={() => setFormState({ open: true, item: null })}>
                <Plus className="size-4" aria-hidden="true" />
                {addButtonLabel}
              </Button>
            }
          />
        )}
        {query.isSuccess && query.data.items.length > 0 && (
          <>
            <DataTable
              columns={columns}
              items={query.data.items}
              getRowKey={(item) => item.id}
              onEdit={(item) => setFormState({ open: true, item })}
              onDelete={(item) => setDeletingItem(item)}
            />
            <Pagination pagination={query.data.pagination} onPageChange={setPage} />
          </>
        )}
      </div>

      <Modal
        open={formState.open}
        onClose={() => setFormState({ open: false, item: null })}
        title={formState.item ? `Edit ${title.replace(/s$/, "")}` : addButtonLabel}
        size="lg"
      >
        {renderForm({ initialValue: formState.item, onSubmit: handleSubmit, isSubmitting })}
      </Modal>

      <ConfirmDialog
        open={Boolean(deletingItem)}
        title={`Delete ${title.replace(/s$/, "")}`}
        description={
          deletingItem ? `Are you sure you want to delete "${getItemLabel(deletingItem)}"? This cannot be undone.` : ""
        }
        isLoading={deleteMutation.isPending}
        onConfirm={() => deletingItem && deleteMutation.mutate(deletingItem.id)}
        onCancel={() => setDeletingItem(null)}
      />
    </div>
  );
}
