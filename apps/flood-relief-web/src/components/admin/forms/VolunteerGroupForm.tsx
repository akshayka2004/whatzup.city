import { useState, type FormEvent } from "react";
import { Input, Select, Textarea } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { DepartmentOfficialsEditor } from "@/components/admin/DepartmentOfficialsEditor";
import { DISTRICTS, DISTRICT_LABELS, type VolunteerGroup, type VolunteerGroupInput, type District } from "@/types";

export type VolunteerGroupFormValues = VolunteerGroupInput;

function toFormValues(group: VolunteerGroup | null): VolunteerGroupFormValues {
  return {
    name: group?.name ?? "",
    district: group?.district ?? "THIRUVANANTHAPURAM",
    region: group?.region ?? "",
    coordinatorName: group?.coordinatorName ?? "",
    coordinatorPhone: group?.coordinatorPhone ?? "",
    whatsappLink: group?.whatsappLink ?? "",
    telegramLink: group?.telegramLink ?? "",
    website: group?.website ?? "",
    remarks: group?.remarks ?? "",
    officials:
      group?.officials.map((o) => ({
        name: o.name,
        designation: o.designation,
        department: o.department,
        contactNumber: o.contactNumber,
      })) ?? [],
  };
}

export function VolunteerGroupForm({
  initialValue,
  onSubmit,
  isSubmitting,
}: {
  initialValue: VolunteerGroup | null;
  onSubmit: (input: VolunteerGroupFormValues) => void;
  isSubmitting: boolean;
}) {
  const [values, setValues] = useState<VolunteerGroupFormValues>(() => toFormValues(initialValue));

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Group name" required value={values.name} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} />
        <Select
          label="District"
          required
          value={values.district}
          onChange={(e) => setValues((v) => ({ ...v, district: e.target.value as District }))}
        >
          {DISTRICTS.map((d) => (
            <option key={d} value={d}>
              {DISTRICT_LABELS[d]}
            </option>
          ))}
        </Select>
        <Input label="Region" required value={values.region} onChange={(e) => setValues((v) => ({ ...v, region: e.target.value }))} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Coordinator name"
          required
          value={values.coordinatorName}
          onChange={(e) => setValues((v) => ({ ...v, coordinatorName: e.target.value }))}
        />
        <Input
          label="Coordinator phone"
          required
          value={values.coordinatorPhone}
          onChange={(e) => setValues((v) => ({ ...v, coordinatorPhone: e.target.value }))}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Input label="WhatsApp link" type="url" value={values.whatsappLink} onChange={(e) => setValues((v) => ({ ...v, whatsappLink: e.target.value }))} />
        <Input label="Telegram link" type="url" value={values.telegramLink} onChange={(e) => setValues((v) => ({ ...v, telegramLink: e.target.value }))} />
        <Input label="Website" type="url" value={values.website} onChange={(e) => setValues((v) => ({ ...v, website: e.target.value }))} />
      </div>
      <Textarea label="Remarks" value={values.remarks} onChange={(e) => setValues((v) => ({ ...v, remarks: e.target.value }))} />

      <DepartmentOfficialsEditor value={values.officials} onChange={(officials) => setValues((v) => ({ ...v, officials }))} />

      <div className="mt-2 flex justify-end gap-3 border-t border-border-subtle pt-4">
        <Button type="submit" isLoading={isSubmitting}>
          {initialValue ? "Save changes" : "Create group"}
        </Button>
      </div>
    </form>
  );
}
