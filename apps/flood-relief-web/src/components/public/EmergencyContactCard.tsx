import { Phone } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { DistrictBadge } from "@/components/StatusBadges";
import type { EmergencyContact } from "@/types";

export function EmergencyContactCard({ contact }: { contact: EmergencyContact }) {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <DistrictBadge district={contact.district} />
      <h3 className="font-heading text-base font-semibold text-primary-900">{contact.department}</h3>
      <p className="text-sm text-primary-600">{contact.officialName} · {contact.designation}</p>
      <a
        href={`tel:${contact.phoneNumber}`}
        className="mt-auto inline-flex w-fit items-center gap-2 rounded-lg bg-primary-900 px-3.5 py-2 text-sm font-semibold text-white transition-[transform] duration-150 active:scale-[0.97]"
      >
        <Phone className="size-4" aria-hidden="true" />
        {contact.phoneNumber}
      </a>
    </Card>
  );
}
