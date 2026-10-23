'use client';

import {
  Briefcase,
  Building2,
  Calendar,
  FileText,
  Heart,
  ShieldAlert,
  Sparkles,
  Users,
} from 'lucide-react';
import { planLabel } from '@/lib/subscription-plans';
import { PAYMENTS_ENABLED } from '@/lib/feature-flags';

/** Icon for an entity type in the approvals queue and review sheet. */
export function getRoleIcon(type: string) {
  switch (type) {
    case 'BUSINESS':
      return <Building2 className="h-4 w-4 text-info" />;
    case 'INFLUENCER':
      return <Sparkles className="h-4 w-4 text-primary" />;
    case 'PROFESSIONAL':
      return <Briefcase className="h-4 w-4 text-success-soft-foreground" />;
    case 'ORGANIZATION':
      return <Heart className="h-4 w-4 text-destructive" />;
    case 'GOVERNMENT':
      return <ShieldAlert className="h-4 w-4 text-warning-soft-foreground" />;
    case 'EVENT_ORGANIZER':
      return <Calendar className="h-4 w-4 text-primary" />;
    default:
      return <Users className="h-4 w-4 text-muted-foreground" />;
  }
}
/**
 * Read-only "Profile Specifications" panel of the approvals review sheet: the
 * fields a reviewer checks for each entity type. Extracted from the page so the
 * page keeps the queue and the decisions, and this stays pure rendering.
 */
export function EntitySpecs({ item }: { item: any }) {
  return (
    <div className="p-4 rounded-2xl bg-secondary border border-border space-y-3">
      <h4 className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        {getRoleIcon(item.entity?.type)}
        Profile Specifications
      </h4>

      {/* DYNAMIC FIELD RENDERING BY ROLE */}
      {item.entity?.type === 'BUSINESS' && item.entity?.business && (
        <div className="space-y-2 text-xs">
          <div className="grid grid-cols-3 py-1 border-b border-border">
            <span className="text-muted-foreground">Category</span>
            <span className="col-span-2 text-muted-foreground font-semibold">
              {item.entity.business.category?.name || 'Retail'}
            </span>
          </div>
          <div className="grid grid-cols-3 py-1 border-b border-border">
            <span className="text-muted-foreground">Owner Name</span>
            <span className="col-span-2 text-muted-foreground">
              {item.entity.business.ownerName || 'N/A'}
            </span>
          </div>
          <div className="grid grid-cols-3 py-1 border-b border-border">
            <span className="text-muted-foreground">Website</span>
            <a
              href={item.entity.business.website}
              target="_blank"
              rel="noreferrer"
              className="col-span-2 text-info hover:underline truncate"
            >
              {item.entity.business.website || 'N/A'}
            </a>
          </div>
          <div className="grid grid-cols-3 py-1 border-b border-border">
            <span className="text-muted-foreground">Address</span>
            <span className="col-span-2 text-foreground leading-tight">
              {item.entity.business.address}, {item.entity.business.city},{' '}
              {item.entity.business.state} - {item.entity.business.zipCode}
            </span>
          </div>
          <div className="pt-2 text-muted-foreground italic">
            "{item.entity.business.description}"
          </div>

          {/* Plan opted + payment submitted — live from the DB so the
                approver can confirm both before approving. */}
          {PAYMENTS_ENABLED &&
            (() => {
              const sub = item.entity.business.subscriptions?.[0];
              const pay = item.entity.business.payments?.[0];
              if (!sub && !pay) {
                return (
                  <div className="mt-3 p-3 rounded-lg border border-warning/20 bg-warning-soft text-warning-soft-foreground">
                    No plan selected and no payment submitted yet.
                  </div>
                );
              }
              return (
                <div className="mt-3 space-y-2 p-3 rounded-lg border border-border bg-muted/30">
                  <div className="font-semibold text-foreground">Plan &amp; Payment</div>
                  {sub && (
                    <>
                      <div className="grid grid-cols-3 py-1 border-b border-border">
                        <span className="text-muted-foreground">Plan opted</span>
                        <span className="col-span-2 text-foreground font-semibold">
                          {planLabel(sub.packageName)}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 py-1 border-b border-border">
                        <span className="text-muted-foreground">Plan amount</span>
                        <span className="col-span-2 text-foreground font-semibold">
                          ₹{Number(sub.pricing || 0).toLocaleString('en-IN')}
                          <span className="text-muted-foreground font-normal">
                            {' '}
                            · {sub.duration} days · {sub.status}
                          </span>
                        </span>
                      </div>
                    </>
                  )}
                  {pay ? (
                    <>
                      <div className="grid grid-cols-3 py-1 border-b border-border">
                        <span className="text-muted-foreground">Paid</span>
                        <span className="col-span-2 text-foreground font-semibold">
                          ₹{Number(pay.amount || 0).toLocaleString('en-IN')}
                          <span className="text-muted-foreground font-normal"> · {pay.method}</span>
                        </span>
                      </div>
                      <div className="grid grid-cols-3 py-1 border-b border-border">
                        <span className="text-muted-foreground">Payment status</span>
                        <span
                          className={`col-span-2 font-semibold ${
                            pay.status === 'SUCCESS'
                              ? 'text-success-soft-foreground'
                              : pay.status === 'FAILED'
                                ? 'text-destructive'
                                : 'text-warning-soft-foreground'
                          }`}
                        >
                          {pay.status}
                          {pay.status === 'PENDING' && ' — verify in Payments'}
                        </span>
                      </div>
                      {pay.transactionRef && (
                        <div className="grid grid-cols-3 py-1">
                          <span className="text-muted-foreground">UPI ref</span>
                          <span className="col-span-2 text-foreground">{pay.transactionRef}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-warning-soft-foreground">No payment submitted yet.</div>
                  )}
                </div>
              );
            })()}
        </div>
      )}

      {item.entity?.type === 'INFLUENCER' && item.entity?.influencerProfile && (
        <div className="space-y-2 text-xs">
          <div className="grid grid-cols-3 py-1 border-b border-border">
            <span className="text-muted-foreground">Niche</span>
            <span className="col-span-2 text-primary font-semibold">
              {item.entity.influencerProfile.niche}
            </span>
          </div>
          <div className="grid grid-cols-3 py-1 border-b border-border">
            <span className="text-muted-foreground">Followers</span>
            <span className="col-span-2 text-muted-foreground font-bold font-mono">
              {item.entity.influencerProfile.followersCount?.toLocaleString()}
            </span>
          </div>
          <div className="grid grid-cols-3 py-1 border-b border-border">
            <span className="text-muted-foreground">Engagement</span>
            <span className="col-span-2 text-muted-foreground font-mono">
              {item.entity.influencerProfile.engagementRate}%
            </span>
          </div>
          <div className="grid grid-cols-3 py-1 border-b border-border">
            <span className="text-muted-foreground">Social Handles</span>
            <div className="col-span-2 space-y-1">
              {item.entity.influencerProfile.instagram && (
                <p className="text-foreground">
                  IG:{' '}
                  <a
                    href={`https://instagram.com/${item.entity.influencerProfile.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-primary hover:underline"
                  >
                    {item.entity.influencerProfile.instagram}
                  </a>
                </p>
              )}
              {item.entity.influencerProfile.youtube && (
                <p className="text-foreground">
                  YT:{' '}
                  <a
                    href={
                      item.entity.influencerProfile.youtube.startsWith('http')
                        ? item.entity.influencerProfile.youtube
                        : `https://${item.entity.influencerProfile.youtube}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="text-destructive hover:underline"
                  >
                    {item.entity.influencerProfile.youtube}
                  </a>
                </p>
              )}
              {item.entity.influencerProfile.linkedin && (
                <p className="text-foreground">
                  LI:{' '}
                  <a
                    href={
                      item.entity.influencerProfile.linkedin.startsWith('http')
                        ? item.entity.influencerProfile.linkedin
                        : `https://linkedin.com/in/${item.entity.influencerProfile.linkedin}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="text-info hover:underline"
                  >
                    {item.entity.influencerProfile.linkedin}
                  </a>
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-3 py-1 border-b border-border">
            <span className="text-muted-foreground">Portfolio</span>
            <a
              href={item.entity.influencerProfile.portfolioUrl}
              target="_blank"
              rel="noreferrer"
              className="col-span-2 text-info hover:underline truncate"
            >
              {item.entity.influencerProfile.portfolioUrl || 'N/A'}
            </a>
          </div>
          {item.entity.influencerProfile.mediaKitUrl && (
            <div className="pt-2 text-muted-foreground text-xs flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-primary" />
              <span>Media Kit linked at: </span>
              <a
                href={item.entity.influencerProfile.mediaKitUrl}
                target="_blank"
                rel="noreferrer"
                className="text-info hover:underline truncate max-w-[150px]"
              >
                {item.entity.influencerProfile.mediaKitUrl}
              </a>
            </div>
          )}
        </div>
      )}

      {item.entity?.type === 'PROFESSIONAL' && item.entity?.professionalProfile && (
        <div className="space-y-2 text-xs">
          <div className="grid grid-cols-3 py-1 border-b border-border">
            <span className="text-muted-foreground">Practice Field</span>
            <span className="col-span-2 text-success-soft-foreground font-semibold">
              {item.entity.professionalProfile.category}
            </span>
          </div>
          <div className="grid grid-cols-3 py-1 border-b border-border">
            <span className="text-muted-foreground">Experience</span>
            <span className="col-span-2 text-muted-foreground">
              {item.entity.professionalProfile.experienceYears} Years
            </span>
          </div>
          <div className="grid grid-cols-3 py-1 border-b border-border">
            <span className="text-muted-foreground">Fees / Rates</span>
            <span className="col-span-2 text-muted-foreground font-bold font-mono">
              ₹{item.entity.professionalProfile.pricingMin} - ₹
              {item.entity.professionalProfile.pricingMax} / hr
            </span>
          </div>
          <div className="grid grid-cols-3 py-1 border-b border-border">
            <span className="text-muted-foreground">Service Area</span>
            <span className="col-span-2 text-muted-foreground leading-tight">
              {Array.isArray(item.entity.professionalProfile.serviceAreas)
                ? item.entity.professionalProfile.serviceAreas.join(', ')
                : 'Local District'}
            </span>
          </div>
          <div className="py-1">
            <span className="text-muted-foreground block mb-1">Certifications:</span>
            <div className="flex flex-wrap gap-1">
              {Array.isArray(item.entity.professionalProfile.certifications) &&
                item.entity.professionalProfile.certifications.map((c: string, i: number) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded bg-secondary text-xs text-foreground border border-border"
                  >
                    {c}
                  </span>
                ))}
            </div>
          </div>
          <div className="py-1 border-t border-border mt-2">
            <span className="text-muted-foreground block mb-1">Weekly Availability:</span>
            <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
              {Object.entries(item.entity.professionalProfile.availability || {}).map(
                ([day, hrs]: any) => (
                  <div key={day} className="flex justify-between pr-2">
                    <span className="capitalize">{day}:</span>
                    <span className="text-foreground font-mono">{hrs}</span>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      )}

      {item.entity?.type === 'ORGANIZATION' && item.entity?.organizationProfile && (
        <div className="space-y-2 text-xs">
          <div className="grid grid-cols-3 py-1 border-b border-border">
            <span className="text-muted-foreground">NGO Legal Name</span>
            <span className="col-span-2 text-destructive font-semibold">
              {item.entity.organizationProfile.ngoName}
            </span>
          </div>
          <div className="grid grid-cols-3 py-1 border-b border-border">
            <span className="text-muted-foreground">Registration #</span>
            <span className="col-span-2 text-muted-foreground font-mono font-bold">
              {item.entity.organizationProfile.registrationNumber}
            </span>
          </div>
          <div className="grid grid-cols-3 py-1 border-b border-border">
            <span className="text-muted-foreground">Focus Cause</span>
            <span className="col-span-2 text-foreground">
              {item.entity.organizationProfile.causeCategory}
            </span>
          </div>
          <div className="grid grid-cols-3 py-1 border-b border-border">
            <span className="text-muted-foreground">Operational In</span>
            <span className="col-span-2 text-muted-foreground">
              {Array.isArray(item.entity.organizationProfile.operationalAreas)
                ? item.entity.organizationProfile.operationalAreas.join(', ')
                : 'All Districts'}
            </span>
          </div>
          <div className="grid grid-cols-3 py-1 border-b border-border">
            <span className="text-muted-foreground">Website</span>
            <a
              href={item.entity.organizationProfile.website}
              target="_blank"
              rel="noreferrer"
              className="col-span-2 text-info hover:underline truncate"
            >
              {item.entity.organizationProfile.website || 'N/A'}
            </a>
          </div>
        </div>
      )}

      {item.entity?.type === 'GOVERNMENT' && item.entity?.governmentProfile && (
        <div className="space-y-2 text-xs">
          <div className="grid grid-cols-3 py-1 border-b border-border">
            <span className="text-muted-foreground">Dept Name</span>
            <span className="col-span-2 text-warning-soft-foreground font-semibold">
              {item.entity.governmentProfile.departmentName}
            </span>
          </div>
          <div className="grid grid-cols-3 py-1 border-b border-border">
            <span className="text-muted-foreground">Official Email</span>
            <span className="col-span-2 text-muted-foreground font-mono">
              {item.entity.governmentProfile.officialEmail}
            </span>
          </div>
          <div className="grid grid-cols-3 py-1 border-b border-border">
            <span className="text-muted-foreground">Jurisdiction</span>
            <span className="col-span-2 text-muted-foreground">
              {item.entity.governmentProfile.departmentType}
            </span>
          </div>
          <div className="grid grid-cols-3 py-1 border-b border-border">
            <span className="text-muted-foreground">District HQ</span>
            <span className="col-span-2 text-foreground">
              {item.entity.governmentProfile.district}
            </span>
          </div>
        </div>
      )}

      {item.entity?.type === 'EVENT_ORGANIZER' && item.entity?.eventOrganizerProfile && (
        <div className="space-y-2 text-xs">
          <div className="grid grid-cols-3 py-1 border-b border-border">
            <span className="text-muted-foreground">Agency Name</span>
            <span className="col-span-2 text-primary font-semibold">
              {item.entity.eventOrganizerProfile.organizationName}
            </span>
          </div>
          <div className="grid grid-cols-3 py-1 border-b border-border">
            <span className="text-muted-foreground">Categories</span>
            <span className="col-span-2 text-foreground">
              {Array.isArray(item.entity.eventOrganizerProfile.eventCategories)
                ? item.entity.eventOrganizerProfile.eventCategories.join(', ')
                : 'Festivals & Seminars'}
            </span>
          </div>
          <div className="grid grid-cols-3 py-1 border-b border-border">
            <span className="text-muted-foreground">Venue Partners</span>
            <span className="col-span-2 text-foreground">
              {Array.isArray(item.entity.eventOrganizerProfile.venuePartnerships)
                ? item.entity.eventOrganizerProfile.venuePartnerships.join(', ')
                : 'None listed'}
            </span>
          </div>
          <div className="grid grid-cols-3 py-1 border-b border-border">
            <span className="text-muted-foreground">Ticketing Support</span>
            <span className="col-span-2 text-muted-foreground font-semibold">
              {item.entity.eventOrganizerProfile.ticketingSupport ? 'Yes, Integrated APIs' : 'No'}
            </span>
          </div>
          <div className="grid grid-cols-3 py-1 border-b border-border">
            <span className="text-muted-foreground">Website</span>
            <a
              href={item.entity.eventOrganizerProfile.website}
              target="_blank"
              rel="noreferrer"
              className="col-span-2 text-info hover:underline truncate"
            >
              {item.entity.eventOrganizerProfile.website || 'N/A'}
            </a>
          </div>
          {Array.isArray(item.entity.eventOrganizerProfile.previousEvents) &&
            item.entity.eventOrganizerProfile.previousEvents.length > 0 && (
              <div className="pt-2 border-t border-border">
                <span className="text-muted-foreground block mb-1">Previous Events Portfolio:</span>
                <div className="space-y-1.5 max-h-[100px] overflow-y-auto pr-1">
                  {item.entity.eventOrganizerProfile.previousEvents.map((ev: any, idx: number) => (
                    <div
                      key={idx}
                      className="bg-secondary p-1.5 rounded border border-border text-xs"
                    >
                      <div className="flex justify-between font-bold text-foreground">
                        <span>{ev.name}</span>
                        <span className="text-muted-foreground">{ev.date}</span>
                      </div>
                      <p className="text-muted-foreground text-xs mt-0.5 leading-tight">
                        {ev.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>
      )}
    </div>
  );
}
