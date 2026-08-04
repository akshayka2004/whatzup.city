import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Megaphone, Tent, ShieldAlert, ClipboardList } from "lucide-react";
import { HomeSection } from "@/components/public/HomeSection";
import { AlertCard } from "@/components/public/AlertCard";
import { CollectionCentreCard } from "@/components/public/CollectionCentreCard";
import { ReliefCampCard } from "@/components/public/ReliefCampCard";
import { VolunteerGroupCard } from "@/components/public/VolunteerGroupCard";
import { EmergencyContactCard } from "@/components/public/EmergencyContactCard";
import { PriorityBadge, DistrictBadge } from "@/components/StatusBadges";
import { Spinner, EmptyState } from "@/components/ui/States";
import { Button } from "@/components/ui/Button";
import { alertsApi, collectionCentresApi, reliefCampsApi, volunteerGroupsApi, emergencyContactsApi } from "@/api/resources";

const PREVIEW_SIZE = 3;

export function HomePage() {
  const alerts = useQuery({
    queryKey: ["home-alerts"],
    queryFn: () => alertsApi.list({ page: 1, pageSize: 4 }),
  });
  const centres = useQuery({
    queryKey: ["home-centres"],
    queryFn: () => collectionCentresApi.list({ page: 1, pageSize: PREVIEW_SIZE }),
  });
  const camps = useQuery({
    queryKey: ["home-camps"],
    queryFn: () => reliefCampsApi.list({ page: 1, pageSize: 6 }),
  });
  const groups = useQuery({
    queryKey: ["home-groups"],
    queryFn: () => volunteerGroupsApi.list({ page: 1, pageSize: PREVIEW_SIZE }),
  });
  const contacts = useQuery({
    queryKey: ["home-contacts"],
    queryFn: () => emergencyContactsApi.list({ page: 1, pageSize: PREVIEW_SIZE }),
  });

  const topRequirements = (camps.data?.items ?? [])
    .flatMap((camp) => camp.requirements.map((req) => ({ req, camp })))
    .sort((a, b) => priorityRank(a.req.priority) - priorityRank(b.req.priority))
    .slice(0, 6);

  return (
    <div>
      <section className="border-b border-border-subtle bg-gradient-to-b from-primary-900 to-primary-950 text-white">
        <div className="container-page flex flex-col items-start gap-6 py-16 sm:py-20">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-accent-200">
            <ShieldAlert className="size-4" aria-hidden="true" />
            Official Government Information Portal
          </span>
          <h1 className="max-w-3xl font-heading text-3xl font-bold leading-tight sm:text-5xl">
            Kerala Flood Relief Portal
          </h1>
          <p className="max-w-2xl text-base text-primary-200 sm:text-lg">
            Verified alerts, relief camps, collection centres, volunteer groups and emergency contacts —
            all in one place for the public.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/alerts">
              <Button size="lg" variant="secondary">
                <Megaphone className="size-4.5" aria-hidden="true" />
                View Latest Alerts
              </Button>
            </Link>
            <Link to="/relief-camps">
              <Button size="lg" variant="outlineInverse">
                <Tent className="size-4.5" aria-hidden="true" />
                Find a Relief Camp
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <HomeSection title="Latest Alerts" description="Recent official alerts and advisories." viewAllHref="/alerts">
        {alerts.isLoading && <Spinner />}
        {alerts.isSuccess && alerts.data.items.length === 0 && (
          <EmptyState title="No alerts published yet" />
        )}
        {alerts.isSuccess && alerts.data.items.length > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {alerts.data.items.map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        )}
      </HomeSection>

      <HomeSection
        title="Flood Relief Collection Centres"
        description="Drop off donations at these verified centres."
        viewAllHref="/collection-centres"
      >
        <PreviewGrid
          isLoading={centres.isLoading}
          items={centres.data?.items}
          emptyLabel="No collection centres published yet"
          render={(centre) => <CollectionCentreCard key={centre.id} centre={centre} />}
        />
      </HomeSection>

      <HomeSection title="Flood Relief Camps" description="Active shelters for displaced residents." viewAllHref="/relief-camps">
        <PreviewGrid
          isLoading={camps.isLoading}
          items={camps.data?.items.slice(0, PREVIEW_SIZE)}
          emptyLabel="No relief camps published yet"
          render={(camp) => <ReliefCampCard key={camp.id} camp={camp} />}
        />
      </HomeSection>

      <HomeSection
        title="Daily Requirements"
        description="Most urgent supplies needed across active relief camps."
        viewAllHref="/relief-camps"
      >
        {camps.isLoading && <Spinner />}
        {camps.isSuccess && topRequirements.length === 0 && (
          <EmptyState title="No outstanding requirements" icon={ClipboardList} />
        )}
        {topRequirements.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-border-subtle bg-white">
            <ul className="divide-y divide-border-subtle">
              {topRequirements.map(({ req, camp }) => (
                <li key={req.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                  <div>
                    <p className="font-medium text-primary-900">
                      {req.itemName} <span className="text-primary-400">× {req.quantity}</span>
                    </p>
                    <p className="text-xs text-primary-500">{camp.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <DistrictBadge district={camp.district} />
                    <PriorityBadge priority={req.priority} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </HomeSection>

      <HomeSection title="Volunteer Groups" description="Independent groups coordinating relief efforts." viewAllHref="/volunteer-groups">
        <PreviewGrid
          isLoading={groups.isLoading}
          items={groups.data?.items}
          emptyLabel="No volunteer groups published yet"
          render={(group) => <VolunteerGroupCard key={group.id} group={group} />}
        />
      </HomeSection>

      <HomeSection
        title="Emergency Contacts"
        description="Key department contacts for flood-related emergencies."
        viewAllHref="/emergency-contacts"
      >
        <PreviewGrid
          isLoading={contacts.isLoading}
          items={contacts.data?.items}
          emptyLabel="No emergency contacts published yet"
          render={(contact) => <EmergencyContactCard key={contact.id} contact={contact} />}
          gridClassName="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        />
      </HomeSection>
    </div>
  );
}

function priorityRank(priority: "HIGH" | "MEDIUM" | "LOW") {
  return priority === "HIGH" ? 0 : priority === "MEDIUM" ? 1 : 2;
}

function PreviewGrid<T>({
  isLoading,
  items,
  emptyLabel,
  render,
  gridClassName = "grid grid-cols-1 gap-4 md:grid-cols-3",
}: {
  isLoading: boolean;
  items?: T[];
  emptyLabel: string;
  render: (item: T) => ReactNode;
  gridClassName?: string;
}) {
  if (isLoading) return <Spinner />;
  if (!items || items.length === 0) return <EmptyState title={emptyLabel} />;
  return <div className={gridClassName}>{items.map(render)}</div>;
}
