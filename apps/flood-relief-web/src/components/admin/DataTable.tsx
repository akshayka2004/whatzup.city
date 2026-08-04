import type { ReactNode } from "react";
import { Pencil, Trash2 } from "lucide-react";

export interface Column<T> {
  header: string;
  render: (item: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  items: T[];
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
  getRowKey: (item: T) => string;
}

export function DataTable<T>({ columns, items, onEdit, onDelete, getRowKey }: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-border-subtle text-xs font-semibold uppercase tracking-wide text-primary-400">
            {columns.map((col) => (
              <th key={col.header} className={`px-4 py-3 ${col.className ?? ""}`}>
                {col.header}
              </th>
            ))}
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {items.map((item) => (
            <tr key={getRowKey(item)} className="transition-colors hover:bg-primary-50/60">
              {columns.map((col) => (
                <td key={col.header} className={`px-4 py-3.5 align-top text-primary-700 ${col.className ?? ""}`}>
                  {col.render(item)}
                </td>
              ))}
              <td className="px-4 py-3.5 text-right">
                <div className="inline-flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onEdit(item)}
                    aria-label="Edit"
                    className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-primary-500 transition-colors hover:bg-primary-100 hover:text-primary-900"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(item)}
                    aria-label="Delete"
                    className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-primary-500 transition-colors hover:bg-danger-50 hover:text-danger-600"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
