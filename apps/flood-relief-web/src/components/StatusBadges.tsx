import { Badge } from "@/components/ui/Badge";
import {
  ALERT_CATEGORY_LABELS,
  DISTRICT_LABELS,
  type AlertCategory,
  type AlertStatus,
  type District,
  type Priority,
} from "@/types";

export function DistrictBadge({ district }: { district: District }) {
  return <Badge tone="neutral">{DISTRICT_LABELS[district]}</Badge>;
}

export function AlertCategoryBadge({ category }: { category: AlertCategory }) {
  return <Badge tone="accent">{ALERT_CATEGORY_LABELS[category]}</Badge>;
}

export function AlertStatusBadge({ status }: { status: AlertStatus }) {
  const tone = status === "ACTIVE" ? "danger" : status === "RESOLVED" ? "success" : "neutral";
  const label = status === "ACTIVE" ? "Active" : status === "RESOLVED" ? "Resolved" : "Inactive";
  return <Badge tone={tone}>{label}</Badge>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const tone = priority === "HIGH" ? "danger" : priority === "MEDIUM" ? "warning" : "neutral";
  return <Badge tone={tone}>{priority}</Badge>;
}
