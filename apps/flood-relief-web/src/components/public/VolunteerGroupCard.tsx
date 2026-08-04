import { Phone, MessageCircle, Send, Globe, User } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { DistrictBadge } from "@/components/StatusBadges";
import type { VolunteerGroup } from "@/types";

export function VolunteerGroupCard({ group }: { group: VolunteerGroup }) {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <DistrictBadge district={group.district} />
      <h3 className="font-heading text-base font-semibold text-primary-900">{group.name}</h3>
      <p className="text-sm text-primary-500">{group.region}</p>
      <div className="flex flex-col gap-1.5 text-sm text-primary-600">
        <p className="flex items-center gap-1.5">
          <User className="size-4 shrink-0 text-primary-400" aria-hidden="true" />
          {group.coordinatorName}
        </p>
        <a href={`tel:${group.coordinatorPhone}`} className="flex items-center gap-1.5 font-medium text-accent-700 hover:underline">
          <Phone className="size-4 shrink-0" aria-hidden="true" />
          {group.coordinatorPhone}
        </a>
      </div>
      <div className="flex flex-wrap gap-2 pt-1">
        {group.whatsappLink && (
          <a
            href={group.whatsappLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary-200 px-2.5 py-1.5 text-xs font-semibold text-primary-700 transition-colors hover:bg-primary-50"
          >
            <MessageCircle className="size-3.5" aria-hidden="true" /> WhatsApp
          </a>
        )}
        {group.telegramLink && (
          <a
            href={group.telegramLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary-200 px-2.5 py-1.5 text-xs font-semibold text-primary-700 transition-colors hover:bg-primary-50"
          >
            <Send className="size-3.5" aria-hidden="true" /> Telegram
          </a>
        )}
        {group.website && (
          <a
            href={group.website}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary-200 px-2.5 py-1.5 text-xs font-semibold text-primary-700 transition-colors hover:bg-primary-50"
          >
            <Globe className="size-3.5" aria-hidden="true" /> Website
          </a>
        )}
      </div>
      {group.officials.length > 0 && (
        <div className="border-t border-border-subtle pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-400">Officials</p>
          <ul className="mt-1.5 flex flex-col gap-1 text-sm text-primary-600">
            {group.officials.map((o) => (
              <li key={o.id}>
                {o.name} — {o.designation}, {o.department} ({o.contactNumber})
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
