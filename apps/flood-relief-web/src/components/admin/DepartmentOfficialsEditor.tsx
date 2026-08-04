import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { DepartmentOfficialInput } from "@/types";

export function DepartmentOfficialsEditor({
  value,
  onChange,
}: {
  value: DepartmentOfficialInput[];
  onChange: (next: DepartmentOfficialInput[]) => void;
}) {
  function update(index: number, patch: Partial<DepartmentOfficialInput>) {
    onChange(value.map((o, i) => (i === index ? { ...o, ...patch } : o)));
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function add() {
    onChange([...value, { name: "", designation: "", department: "", contactNumber: "" }]);
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
        <div key={index} className="grid grid-cols-1 gap-2 rounded-lg border border-primary-100 p-3 sm:grid-cols-2">
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
            value={official.department}
            onChange={(e) => update(index, { department: e.target.value })}
            placeholder="Department"
            aria-label="Official department"
            className="rounded-md border border-primary-200 px-2.5 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
          />
          <div className="flex gap-2">
            <input
              value={official.contactNumber}
              onChange={(e) => update(index, { contactNumber: e.target.value })}
              placeholder="Contact number"
              aria-label="Official contact number"
              className="flex-1 rounded-md border border-primary-200 px-2.5 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
            />
            <button
              type="button"
              onClick={() => remove(index)}
              aria-label="Remove official"
              className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md text-primary-400 transition-colors hover:bg-danger-50 hover:text-danger-600"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
