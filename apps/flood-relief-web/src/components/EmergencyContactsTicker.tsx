import { useQuery } from "@tanstack/react-query";
import { Phone, TriangleAlert } from "lucide-react";
import { emergencyContactsApi } from "@/api/resources";
import { DISTRICT_LABELS } from "@/types";

export function EmergencyContactsTicker() {
  const { data } = useQuery({
    queryKey: ["emergency-contacts-ticker"],
    queryFn: () => emergencyContactsApi.list({ page: 1, pageSize: 20 }),
    staleTime: 5 * 60 * 1000,
  });

  const contacts = data?.items ?? [];
  if (contacts.length === 0) return null;

  return (
    <div className="group flex items-stretch bg-primary-900 text-white" role="region" aria-label="Emergency contact numbers">
      <div className="flex shrink-0 items-center gap-2 bg-danger-600 px-4 py-2 text-sm font-bold tracking-wide">
        <TriangleAlert className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">EMERGENCY</span>
      </div>
      <div className="relative flex-1 overflow-hidden">
        <div className="flex w-max animate-marquee gap-10 py-2 pl-6 group-hover:[animation-play-state:paused] motion-reduce:animate-none">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0 gap-10" aria-hidden={copy === 1}>
              {contacts.map((contact) => (
                <a
                  key={`${copy}-${contact.id}`}
                  href={`tel:${contact.phoneNumber}`}
                  className="flex shrink-0 items-center gap-2 text-sm font-medium text-primary-100 transition-colors hover:text-white"
                >
                  <Phone className="size-3.5 text-accent-400" aria-hidden="true" />
                  <span className="font-semibold text-white">{contact.department}</span>
                  <span className="text-primary-300">({DISTRICT_LABELS[contact.district]})</span>
                  <span className="font-mono tabular-nums text-accent-300">{contact.phoneNumber}</span>
                </a>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
