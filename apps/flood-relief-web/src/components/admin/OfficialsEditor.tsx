import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { OfficialInput } from "@/types";

export function OfficialsEditor({
  value,
  onChange,
}: {
  value: OfficialInput[];
  onChange: (next: OfficialInput[]) => void;
}) {
  function update(index: number, patch: Partial<OfficialInput>) {
    onChange(value.map((o, i) => (i === index ? { ...o, ...patch } : o)));
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function add() {
    onChange([...value, { name: "", designation: "", contactNumber: "" }]);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-primary-800">Officials</p>
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="size-4" aria-hidden="true" />
          Add official
        </Button>
      </div>
      {value.length === 0 && <p className="text-sm text-primary-400">No officials added yet.</p>}
      {value.map((official, index) => (
        <div key={index} className="grid grid-cols-1 gap-2 rounded-lg border border-primary-100 p-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <input
            value={official.name}
            onChange={(e) => update(index, { name: e.target.value })}
            placeholder="Name"
            aria-label="Official name"
            className="rounded-md border border-primary-200 px-2.5 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
          />
          <input
            value={official.designation}
            onChange={(e) => update(index, { designation: e.target.value })}
            placeholder="Designation"
            aria-label="Official designation"
            className="rounded-md border border-primary-200 px-2.5 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
          />
          <input
            value={official.contactNumber}
            onChange={(e) => update(index, { contactNumber: e.target.value })}
            placeholder="Contact number"
            aria-label="Official contact number"
            className="rounded-md border border-primary-200 px-2.5 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
          />
          <button
            type="button"
            onClick={() => remove(index)}
            aria-label="Remove official"
            className="inline-flex size-9 cursor-pointer items-center justify-center justify-self-end rounded-md text-primary-400 transition-colors hover:bg-danger-50 hover:text-danger-600"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
