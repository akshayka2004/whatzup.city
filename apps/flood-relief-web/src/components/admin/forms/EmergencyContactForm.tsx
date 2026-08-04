import { useState, type FormEvent } from "react";
import { Input, Select } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { DISTRICTS, DISTRICT_LABELS, type EmergencyContact, type District } from "@/types";

export interface EmergencyContactFormValues {
  department: string;
  officialName: string;
  designation: string;
  district: District;
  phoneNumber: string;
}

function toFormValues(contact: EmergencyContact | null): EmergencyContactFormValues {
  return {
    department: contact?.department ?? "",
    officialName: contact?.officialName ?? "",
    designation: contact?.designation ?? "",
    district: contact?.district ?? "THIRUVANANTHAPURAM",
    phoneNumber: contact?.phoneNumber ?? "",
  };
}

export function EmergencyContactForm({
  initialValue,
  onSubmit,
  isSubmitting,
}: {
  initialValue: EmergencyContact | null;
  onSubmit: (input: EmergencyContactFormValues) => void;
  isSubmitting: boolean;
}) {
  const [values, setValues] = useState<EmergencyContactFormValues>(() => toFormValues(initialValue));

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input label="Department" required value={values.department} onChange={(e) => setValues((v) => ({ ...v, department: e.target.value }))} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Official name"
          required
          value={values.officialName}
          onChange={(e) => setValues((v) => ({ ...v, officialName: e.target.value }))}
        />
        <Input
          label="Designation"
          required
          value={values.designation}
          onChange={(e) => setValues((v) => ({ ...v, designation: e.target.value }))}
        />
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
        <Input
          label="Phone number"
          required
          value={values.phoneNumber}
          onChange={(e) => setValues((v) => ({ ...v, phoneNumber: e.target.value }))}
        />
      </div>

      <div className="mt-2 flex justify-end gap-3 border-t border-border-subtle pt-4">
        <Button type="submit" isLoading={isSubmitting}>
          {initialValue ? "Save changes" : "Create contact"}
        </Button>
      </div>
    </form>
  );
}
