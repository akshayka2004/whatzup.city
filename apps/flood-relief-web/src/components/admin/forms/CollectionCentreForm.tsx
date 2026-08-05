import { useState, type FormEvent } from "react";
import { Input, Select, Textarea } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { OfficialsEditor } from "@/components/admin/OfficialsEditor";
import { RequirementsEditor } from "@/components/admin/RequirementsEditor";
import {
  DISTRICTS,
  DISTRICT_LABELS,
  type CollectionCentre,
  type CollectionCentreInput,
  type District,
} from "@/types";

export type CollectionCentreFormValues = CollectionCentreInput;

function toFormValues(centre: CollectionCentre | null): CollectionCentreFormValues {
  return {
    name: centre?.name ?? "",
    district: centre?.district ?? "THIRUVANANTHAPURAM",
    region: centre?.region ?? "",
    address: centre?.address ?? "",
    mapLink: centre?.mapLink ?? "",
    contactName: centre?.contactName ?? "",
    contactDesignation: centre?.contactDesignation ?? "",
    contactPhone: centre?.contactPhone ?? "",
    contactAltPhone: centre?.contactAltPhone ?? "",
    workingHours: centre?.workingHours ?? "",
    remarks: centre?.remarks ?? "",
    officials: centre?.officials.map((o) => ({ name: o.name, designation: o.designation, contactNumber: o.contactNumber })) ?? [],
    requirements: centre?.requirements.map((r) => ({ itemName: r.itemName, quantity: r.quantity, priority: r.priority })) ?? [],
  };
}

export function CollectionCentreForm({
  initialValue,
  onSubmit,
  isSubmitting,
}: {
  initialValue: CollectionCentre | null;
  onSubmit: (input: CollectionCentreFormValues) => void;
  isSubmitting: boolean;
}) {
  const [values, setValues] = useState<CollectionCentreFormValues>(() => toFormValues(initialValue));

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Centre name" required value={values.name} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} />
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
        <Input label="Region / Taluk" required value={values.region} onChange={(e) => setValues((v) => ({ ...v, region: e.target.value }))} />
        <Input label="Google Maps link" type="url" value={values.mapLink} onChange={(e) => setValues((v) => ({ ...v, mapLink: e.target.value }))} />
      </div>
      <Textarea label="Address" required value={values.address} onChange={(e) => setValues((v) => ({ ...v, address: e.target.value }))} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Contact name" required value={values.contactName} onChange={(e) => setValues((v) => ({ ...v, contactName: e.target.value }))} />
        <Input
          label="Contact designation"
          required
          value={values.contactDesignation}
          onChange={(e) => setValues((v) => ({ ...v, contactDesignation: e.target.value }))}
        />
        <Input label="Phone number" required value={values.contactPhone} onChange={(e) => setValues((v) => ({ ...v, contactPhone: e.target.value }))} />
        <Input
          label="Alternate number"
          value={values.contactAltPhone}
          onChange={(e) => setValues((v) => ({ ...v, contactAltPhone: e.target.value }))}
        />
        <Input label="Working hours" value={values.workingHours} onChange={(e) => setValues((v) => ({ ...v, workingHours: e.target.value }))} />
      </div>
      <Textarea label="Remarks" value={values.remarks} onChange={(e) => setValues((v) => ({ ...v, remarks: e.target.value }))} />

      <OfficialsEditor value={values.officials} onChange={(officials) => setValues((v) => ({ ...v, officials }))} />
      <RequirementsEditor
        title="Immediate requirements"
        value={values.requirements}
        onChange={(requirements) => setValues((v) => ({ ...v, requirements }))}
      />

      <div className="mt-2 flex justify-end gap-3 border-t border-border-subtle pt-4">
        <Button type="submit" isLoading={isSubmitting}>
          {initialValue ? "Save changes" : "Create centre"}
        </Button>
      </div>
    </form>
  );
}
