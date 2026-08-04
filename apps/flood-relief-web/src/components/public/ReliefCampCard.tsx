import { MapPin, Phone, User } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { DistrictBadge, PriorityBadge } from "@/components/StatusBadges";
import type { ReliefCamp } from "@/types";

export function ReliefCampCard({ camp }: { camp: ReliefCamp }) {
  const highPriorityCount = camp.requirements.filter((r) => r.priority === "HIGH").length;

  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-2">
        <DistrictBadge district={camp.district} />
        {highPriorityCount > 0 && (
          <span className="text-xs font-semibold text-danger-600">
            {highPriorityCount} urgent requirement{highPriorityCount > 1 ? "s" : ""}
          </span>
        )}
      </div>
      <h3 className="font-heading text-base font-semibold text-primary-900">{camp.name}</h3>
      <p className="flex items-start gap-1.5 text-sm text-primary-600">
        <MapPin className="mt-0.5 size-4 shrink-0 text-primary-400" aria-hidden="true" />
        <span>{camp.address}</span>
      </p>
      <div className="flex flex-col gap-1.5 text-sm text-primary-600">
        <p className="flex items-center gap-1.5">
          <User className="size-4 shrink-0 text-primary-400" aria-hidden="true" />
          {camp.contactName} · {camp.contactDesignation}
        </p>
        <a href={`tel:${camp.contactPhone}`} className="flex items-center gap-1.5 font-medium text-accent-700 hover:underline">
          <Phone className="size-4 shrink-0" aria-hidden="true" />
          {camp.contactPhone}
        </a>
      </div>

      {camp.requirements.length > 0 && (
        <div className="border-t border-border-subtle pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-400">Daily requirements</p>
          <ul className="mt-1.5 flex flex-col gap-1.5">
            {camp.requirements.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 text-sm text-primary-600">
                <span>{r.itemName} <span className="text-primary-400">× {r.quantity}</span></span>
                <PriorityBadge priority={r.priority} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {camp.mapLink && (
        <a
          href={camp.mapLink}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-lg border border-primary-200 px-3 py-1.5 text-xs font-semibold text-primary-700 transition-colors hover:bg-primary-50"
        >
          <MapPin className="size-3.5" aria-hidden="true" />
          View on map
        </a>
      )}
    </Card>
  );
}
