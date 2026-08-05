import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PRIORITIES, type Priority, type RequirementInput } from "@/types";

export function RequirementsEditor({
  value,
  onChange,
  title = "Daily requirements",
}: {
  value: RequirementInput[];
  onChange: (next: RequirementInput[]) => void;
  title?: string;
}) {
  function update(index: number, patch: Partial<RequirementInput>) {
    onChange(value.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function add() {
    onChange([...value, { itemName: "", quantity: "", priority: "MEDIUM" }]);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-primary-800">{title}</p>
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="size-4" aria-hidden="true" />
          Add requirement
        </Button>
      </div>
      {value.length === 0 && <p className="text-sm text-primary-400">No requirements added yet.</p>}
      {value.map((req, index) => (
        <div key={index} className="grid grid-cols-1 gap-2 rounded-lg border border-primary-100 p-3 sm:grid-cols-[2fr_1fr_1fr_auto]">
          <input
            value={req.itemName}
            onChange={(e) => update(index, { itemName: e.target.value })}
            placeholder="Item name"
            aria-label="Item name"
            className="rounded-md border border-primary-200 px-2.5 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
          />
          <input
            value={req.quantity}
            onChange={(e) => update(index, { quantity: e.target.value })}
            placeholder="Quantity"
            aria-label="Quantity"
            className="rounded-md border border-primary-200 px-2.5 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
          />
          <select
            value={req.priority}
            onChange={(e) => update(index, { priority: e.target.value as Priority })}
            aria-label="Priority"
            className="cursor-pointer rounded-md border border-primary-200 px-2.5 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => remove(index)}
            aria-label="Remove requirement"
            className="inline-flex size-9 cursor-pointer items-center justify-center justify-self-end rounded-md text-primary-400 transition-colors hover:bg-danger-50 hover:text-danger-600"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
