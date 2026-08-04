import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PaginationInfo } from "@/types";

export function Pagination({
  pagination,
  onPageChange,
}: {
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
}) {
  const { page, totalPages, total, pageSize } = pagination;
  if (total === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-border-subtle px-4 py-3.5 sm:flex-row">
      <p className="text-sm text-primary-500">
        Showing <span className="font-medium text-primary-800">{from}–{to}</span> of{" "}
        <span className="font-medium text-primary-800">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg border border-primary-200 text-primary-700 transition-colors hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="min-w-[5.5rem] text-center text-sm font-medium text-primary-700">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg border border-primary-200 text-primary-700 transition-colors hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
