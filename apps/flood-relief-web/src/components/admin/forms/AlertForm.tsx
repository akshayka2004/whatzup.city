import { useState, type FormEvent } from "react";
import { Input, Select, Textarea } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import {
  ALERT_CATEGORIES,
  ALERT_CATEGORY_LABELS,
  ALERT_STATUSES,
  DISTRICTS,
  DISTRICT_LABELS,
  type Alert,
  type AlertCategory,
  type AlertStatus,
  type District,
} from "@/types";

export interface AlertFormValues {
  title: string;
  description: string;
  category: AlertCategory;
  district: District;
  publishedDate: string;
  status: AlertStatus;
  isPinned: boolean;
}

function toFormValues(alert: Alert | null): AlertFormValues {
  return {
    title: alert?.title ?? "",
    description: alert?.description ?? "",
    category: alert?.category ?? "GENERAL",
    district: alert?.district ?? "THIRUVANANTHAPURAM",
    publishedDate: alert ? alert.publishedDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
    status: alert?.status ?? "ACTIVE",
    isPinned: alert?.isPinned ?? false,
  };
}

export function AlertForm({
  initialValue,
  onSubmit,
  isSubmitting,
}: {
  initialValue: Alert | null;
  onSubmit: (input: AlertFormValues) => void;
  isSubmitting: boolean;
}) {
  const [values, setValues] = useState<AlertFormValues>(() => toFormValues(initialValue));

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Title"
        required
        value={values.title}
        onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
      />
      <Textarea
        label="Description"
        required
        rows={4}
        value={values.description}
        onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select
          label="Category"
          required
          value={values.category}
          onChange={(e) => setValues((v) => ({ ...v, category: e.target.value as AlertCategory }))}
        >
          {ALERT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {ALERT_CATEGORY_LABELS[c]}
            </option>
          ))}
        </Select>
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
          label="Published date"
          type="date"
          required
          value={values.publishedDate}
          onChange={(e) => setValues((v) => ({ ...v, publishedDate: e.target.value }))}
        />
        <Select
          label="Status"
          required
          value={values.status}
          onChange={(e) => setValues((v) => ({ ...v, status: e.target.value as AlertStatus }))}
        >
          {ALERT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </option>
          ))}
        </Select>
      </div>

      <label className="flex w-fit cursor-pointer items-center gap-2.5 text-sm font-medium text-primary-800">
        <input
          type="checkbox"
          checked={values.isPinned}
          onChange={(e) => setValues((v) => ({ ...v, isPinned: e.target.checked }))}
          className="size-4 cursor-pointer rounded border-primary-300 text-accent-600 focus:ring-2 focus:ring-accent-500/40"
        />
        Pin this alert to the top of the list
      </label>

      <div className="mt-2 flex justify-end gap-3 border-t border-border-subtle pt-4">
        <Button type="submit" isLoading={isSubmitting}>
          {initialValue ? "Save changes" : "Create alert"}
        </Button>
      </div>
    </form>
  );
}
