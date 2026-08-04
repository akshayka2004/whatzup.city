import { Pin, Calendar } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { AlertCategoryBadge, AlertStatusBadge, DistrictBadge } from "@/components/StatusBadges";
import type { Alert } from "@/types";

export function AlertCard({ alert }: { alert: Alert }) {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          <AlertStatusBadge status={alert.status} />
          <AlertCategoryBadge category={alert.category} />
        </div>
        {alert.isPinned && (
          <span className="flex items-center gap-1 text-xs font-semibold text-warning-600">
            <Pin className="size-3.5" aria-hidden="true" />
            Pinned
          </span>
        )}
      </div>
      <h3 className="font-heading text-base font-semibold text-primary-900">{alert.title}</h3>
      <p className="line-clamp-3 text-sm text-primary-600">{alert.description}</p>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-primary-500">
        <DistrictBadge district={alert.district} />
        <span className="flex items-center gap-1.5">
          <Calendar className="size-3.5" aria-hidden="true" />
          {new Date(alert.publishedDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
        </span>
      </div>
    </Card>
  );
}
