'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layouts/admin-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiService } from '@/lib/services/api-service';
import {
  CheckCircle,
  XCircle,
  Eye,
  X,
  FileText,
  Check,
  Loader2,
  ExternalLink,
  Building2,
  Sparkles,
  Briefcase,
  Calendar,
  Heart,
  ShieldAlert,
  Users,
  Award,
  MapPin,
  Clock,
  Phone,
  Mail,
  Globe,
  DollarSign,
} from 'lucide-react';

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<string>('ALL'); // 'ALL' | 'BUSINESS' | 'INFLUENCER' | 'PROFESSIONAL' | 'ORGANIZATION' | 'GOVERNMENT' | 'EVENT_ORGANIZER'

  // Modal Review States
  const [reviewingItem, setReviewingItem] = useState<any>(null);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [rejectingItem, setRejectingItem] = useState<any>(null);
  const [approvingItem, setApprovingItem] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states
  const [rejectReason, setRejectReason] = useState('');
  const [approveNotes, setApproveNotes] = useState('');

  const fetchApprovals = async (entityType: string) => {
    setLoading(true);
    setError('');
    try {
      const typeQuery = entityType !== 'ALL' ? `?type=${entityType}` : '';
      const response = await apiService.get<any>(`/v1/admin/businesses/pending${typeQuery}`);
      if (response.data && !response.error) {
        setApprovals(response.data.data || []);
      } else {
        setApprovals([]);
      }
    } catch (e) {
      setApprovals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals(activeTab);
  }, [activeTab]);

  const handleApprove = async () => {
    if (!approvingItem) return;
    setActionLoading(true);
    setError('');
    try {
      const response = await apiService.post<any>(
        `/v1/admin/businesses/${approvingItem.id}/approve`,
        { notes: approveNotes || 'Approved by dashboard administrator' },
      );
      if (response.error) setError(response.error);
    } catch (_) {}
    setApprovals((prev) => prev.filter((a) => a.id !== approvingItem.id));
    setApprovingItem(null);
    setApproveNotes('');
    setActionLoading(false);
  };

  const handleReject = async () => {
    if (!rejectingItem || !rejectReason) return;
    setActionLoading(true);
    setError('');
    try {
      const response = await apiService.post<any>(
        `/v1/admin/businesses/${rejectingItem.id}/reject`,
        { reason: rejectReason },
      );
      if (response.error) setError(response.error);
    } catch (_) {}
    setApprovals((prev) => prev.filter((a) => a.id !== rejectingItem.id));
    setRejectingItem(null);
    setRejectReason('');
    setActionLoading(false);
  };

  const displayApprovals = approvals.filter((item) => {
    if (activeTab === 'ALL') return true;
    return item.entity?.type === activeTab;
  });

  const getRoleIcon = (type: string) => {
    switch (type) {
      case 'BUSINESS':
        return <Building2 className="h-4 w-4 text-cyan-400" />;
      case 'INFLUENCER':
        return <Sparkles className="h-4 w-4 text-violet-400" />;
      case 'PROFESSIONAL':
        return <Briefcase className="h-4 w-4 text-emerald-400" />;
      case 'ORGANIZATION':
        return <Heart className="h-4 w-4 text-rose-400" />;
      case 'GOVERNMENT':
        return <ShieldAlert className="h-4 w-4 text-amber-400" />;
      case 'EVENT_ORGANIZER':
        return <Calendar className="h-4 w-4 text-fuchsia-400" />;
      default:
        return <Users className="h-4 w-4 text-slate-400" />;
    }
  };

  const tabsList = [
    { label: 'All Requests', val: 'ALL' },
    { label: 'Businesses', val: 'BUSINESS' },
    { label: 'Influencers', val: 'INFLUENCER' },
    { label: 'Professionals', val: 'PROFESSIONAL' },
    { label: 'NGOs / Community', val: 'ORGANIZATION' },
    { label: 'Gov Depts', val: 'GOVERNMENT' },
    { label: 'Event Organizers', val: 'EVENT_ORGANIZER' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8 font-sans pb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-foreground mb-2 tracking-tight">
              Universal Moderation Queue
            </h1>
            <p className="text-slate-400 text-sm">
              Review, verify, and approve onboarding credentials for multi-entity profiles.
            </p>
          </div>
          <div className="h-1 py-1 px-4 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs font-semibold text-violet-400 text-center">
            {displayApprovals.length} pending verification
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-medium">
            {error}
          </div>
        )}

        {/* --- TABS SYSTEM --- */}
        <div className="flex flex-wrap items-center gap-2 border-b border-white/5 pb-2">
          {tabsList.map((t) => {
            const isActive = activeTab === t.val;
            return (
              <button
                key={t.val}
                onClick={() => setActiveTab(t.val)}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-violet-600/20 to-indigo-600/20 border border-violet-500/40 text-violet-300 shadow-md shadow-violet-950/20'
                    : 'bg-white/[0.02] border border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* --- MAIN QUEUE CONTAINER --- */}
        <div className="space-y-4">
          {loading ? (
            <div className="p-16 text-center">
              <Loader2 className="h-10 w-10 text-cyan-400 animate-spin mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Querying pending moderation requests...</p>
            </div>
          ) : displayApprovals.length === 0 ? (
            <Card className="p-12 text-center border border-dashed border-white/10 bg-[#0d0d12]/30 rounded-3xl">
              <Check className="mx-auto h-12 w-12 text-emerald-400 mb-4 bg-emerald-500/10 p-2 rounded-full" />
              <h3 className="text-lg font-bold text-foreground mb-1">Moderation Queue Clean</h3>
              <p className="text-xs text-slate-500">
                No pending verifications for {tabsList.find((t) => t.val === activeTab)?.label.toLowerCase()}.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {displayApprovals.map((req) => {
                const entity = req.entity || {};
                const docCount = (entity.documents || []).length;
                return (
                  <Card
                    key={req.id}
                    className="p-5 rounded-2xl border border-white/5 bg-card/45 backdrop-blur-xl hover:shadow-xl hover:border-white/10 transition-all duration-300 relative overflow-hidden group"
                  >
                    <div className="absolute top-0 right-0 w-48 h-48 bg-violet-600/[0.02] rounded-full blur-3xl pointer-events-none"></div>
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2.5">
                          <span className="p-2 rounded-xl bg-white/[0.03] border border-white/5">
                            {getRoleIcon(entity.type)}
                          </span>
                          <div>
                            <h3 className="font-bold text-slate-100 text-base">
                              {entity.name || 'Unnamed Entity'}
                            </h3>
                            <p className="text-[10px] text-slate-500 font-mono">
                              Request ID: {req.id}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs text-slate-400 pt-1">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5 text-slate-550" />
                            {entity.email || 'No email'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5 text-slate-550" />
                            {entity.phone || 'No phone'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-slate-550" />
                            Submitted: {new Date(req.createdAt).toLocaleDateString()}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-white/[0.04] text-[10px] font-semibold text-slate-300">
                            {docCount} docs uploaded
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 lg:self-center">
                        <Button
                          onClick={() => {
                            setReviewingItem(req);
                            const firstDoc = (entity.documents || [])[0] || null;
                            setSelectedDoc(firstDoc);
                          }}
                          size="sm"
                          className="rounded-xl gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold hover:from-violet-500 hover:to-indigo-500 cursor-pointer shadow-lg shadow-violet-950/20"
                        >
                          <Eye className="h-4 w-4" />
                          Review & Verify
                        </Button>
                        <Button
                          onClick={() => setApprovingItem(req)}
                          size="sm"
                          variant="outline"
                          className="rounded-xl text-emerald-400 hover:text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/10 gap-1 cursor-pointer"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => setRejectingItem(req)}
                          size="sm"
                          variant="outline"
                          className="rounded-xl text-rose-400 hover:text-rose-300 border-rose-500/20 hover:bg-rose-500/10 gap-1 cursor-pointer"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* ============================================================
            ── SIDE-BY-SIDE MODAL PREVIEW FOR SYSTEM VERIFICATION ──
           ============================================================ */}
        {reviewingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
            <Card className="w-full max-w-6xl p-6 rounded-3xl border border-white/10 bg-[#0c0c10] shadow-2xl relative max-h-[90vh] flex flex-col">
              <button
                onClick={() => {
                  setReviewingItem(null);
                  setSelectedDoc(null);
                }}
                className="absolute top-5 right-5 text-slate-500 hover:text-slate-300 cursor-pointer p-1 bg-white/5 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="border-b border-white/5 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className="p-1 px-2.5 rounded-lg bg-violet-600/10 border border-violet-500/20 text-xs font-bold text-violet-400 uppercase tracking-widest">
                    {reviewingItem.entity?.type} VERIFICATION
                  </span>
                  <p className="text-xs text-slate-400 font-mono">
                    Owner Account: {reviewingItem.entity?.user?.name} ({reviewingItem.entity?.user?.email})
                  </p>
                </div>
                <h3 className="text-2xl font-bold text-slate-100 mt-2">
                  Credential Audit: {reviewingItem.entity?.name}
                </h3>
              </div>

              {/* Side by side layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden flex-1 pb-2">
                
                {/* LEFT SIDE (col-span-5): Metadata + Document list */}
                <div className="lg:col-span-5 flex flex-col gap-4 overflow-y-auto pr-1">
                  
                  {/* Dynamic Entity Info Box */}
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                    <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      {getRoleIcon(reviewingItem.entity?.type)}
                      Profile Specifications
                    </h4>

                    {/* DYNAMIC FIELD RENDERING BY ROLE */}
                    {reviewingItem.entity?.type === 'BUSINESS' && reviewingItem.entity?.business && (
                      <div className="space-y-2 text-xs">
                        <div className="grid grid-cols-3 py-1 border-b border-white/5">
                          <span className="text-slate-500">Category</span>
                          <span className="col-span-2 text-slate-200 font-semibold">{reviewingItem.entity.business.category?.name || 'Retail'}</span>
                        </div>
                        <div className="grid grid-cols-3 py-1 border-b border-white/5">
                          <span className="text-slate-500">Owner Name</span>
                          <span className="col-span-2 text-slate-200">{reviewingItem.entity.business.ownerName || 'N/A'}</span>
                        </div>
                        <div className="grid grid-cols-3 py-1 border-b border-white/5">
                          <span className="text-slate-500">Website</span>
                          <a href={reviewingItem.entity.business.website} target="_blank" rel="noreferrer" className="col-span-2 text-cyan-400 hover:underline truncate">
                            {reviewingItem.entity.business.website || 'N/A'}
                          </a>
                        </div>
                        <div className="grid grid-cols-3 py-1 border-b border-white/5">
                          <span className="text-slate-500">Address</span>
                          <span className="col-span-2 text-slate-300 leading-tight">
                            {reviewingItem.entity.business.address}, {reviewingItem.entity.business.city}, {reviewingItem.entity.business.state} - {reviewingItem.entity.business.zipCode}
                          </span>
                        </div>
                        <div className="pt-2 text-slate-350 italic">
                          "{reviewingItem.entity.business.description}"
                        </div>
                      </div>
                    )}

                    {reviewingItem.entity?.type === 'INFLUENCER' && reviewingItem.entity?.influencerProfile && (
                      <div className="space-y-2 text-xs">
                        <div className="grid grid-cols-3 py-1 border-b border-white/5">
                          <span className="text-slate-500">Niche</span>
                          <span className="col-span-2 text-violet-300 font-semibold">{reviewingItem.entity.influencerProfile.niche}</span>
                        </div>
                        <div className="grid grid-cols-3 py-1 border-b border-white/5">
                          <span className="text-slate-500">Followers</span>
                          <span className="col-span-2 text-slate-200 font-bold font-mono">
                            {reviewingItem.entity.influencerProfile.followersCount?.toLocaleString()}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 py-1 border-b border-white/5">
                          <span className="text-slate-500">Engagement</span>
                          <span className="col-span-2 text-slate-200 font-mono">
                            {reviewingItem.entity.influencerProfile.engagementRate}%
                          </span>
                        </div>
                        <div className="grid grid-cols-3 py-1 border-b border-white/5">
                          <span className="text-slate-500">Social Handles</span>
                          <div className="col-span-2 space-y-1">
                            {reviewingItem.entity.influencerProfile.instagram && (
                              <p className="text-slate-300">IG: <a href={`https://instagram.com/${reviewingItem.entity.influencerProfile.instagram.replace('@','')}`} target="_blank" rel="noreferrer" className="font-semibold text-pink-400 hover:underline">{reviewingItem.entity.influencerProfile.instagram}</a></p>
                            )}
                            {reviewingItem.entity.influencerProfile.youtube && (
                              <p className="text-slate-300">YT: <a href={reviewingItem.entity.influencerProfile.youtube.startsWith('http') ? reviewingItem.entity.influencerProfile.youtube : `https://${reviewingItem.entity.influencerProfile.youtube}`} target="_blank" rel="noreferrer" className="text-red-400 hover:underline">{reviewingItem.entity.influencerProfile.youtube}</a></p>
                            )}
                            {reviewingItem.entity.influencerProfile.linkedin && (
                              <p className="text-slate-300">LI: <a href={reviewingItem.entity.influencerProfile.linkedin.startsWith('http') ? reviewingItem.entity.influencerProfile.linkedin : `https://linkedin.com/in/${reviewingItem.entity.influencerProfile.linkedin}`} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline">{reviewingItem.entity.influencerProfile.linkedin}</a></p>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-3 py-1 border-b border-white/5">
                          <span className="text-slate-500">Portfolio</span>
                          <a href={reviewingItem.entity.influencerProfile.portfolioUrl} target="_blank" rel="noreferrer" className="col-span-2 text-cyan-400 hover:underline truncate">
                            {reviewingItem.entity.influencerProfile.portfolioUrl || 'N/A'}
                          </a>
                        </div>
                        {reviewingItem.entity.influencerProfile.mediaKitUrl && (
                          <div className="pt-2 text-slate-400 text-[11px] flex items-center gap-1.5">
                            <FileText className="h-4 w-4 text-violet-400" />
                            <span>Media Kit linked at: </span>
                            <a href={reviewingItem.entity.influencerProfile.mediaKitUrl} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline truncate max-w-[150px]">
                              {reviewingItem.entity.influencerProfile.mediaKitUrl}
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    {reviewingItem.entity?.type === 'PROFESSIONAL' && reviewingItem.entity?.professionalProfile && (
                      <div className="space-y-2 text-xs">
                        <div className="grid grid-cols-3 py-1 border-b border-white/5">
                          <span className="text-slate-500">Practice Field</span>
                          <span className="col-span-2 text-emerald-300 font-semibold">{reviewingItem.entity.professionalProfile.category}</span>
                        </div>
                        <div className="grid grid-cols-3 py-1 border-b border-white/5">
                          <span className="text-slate-500">Experience</span>
                          <span className="col-span-2 text-slate-200">{reviewingItem.entity.professionalProfile.experienceYears} Years</span>
                        </div>
                        <div className="grid grid-cols-3 py-1 border-b border-white/5">
                          <span className="text-slate-500">Fees / Rates</span>
                          <span className="col-span-2 text-slate-200 font-bold font-mono">
                            ₹{reviewingItem.entity.professionalProfile.pricingMin} - ₹{reviewingItem.entity.professionalProfile.pricingMax} / hr
                          </span>
                        </div>
                        <div className="grid grid-cols-3 py-1 border-b border-white/5">
                          <span className="text-slate-500">Service Area</span>
                          <span className="col-span-2 text-slate-350 leading-tight">
                            {Array.isArray(reviewingItem.entity.professionalProfile.serviceAreas)
                              ? reviewingItem.entity.professionalProfile.serviceAreas.join(', ')
                              : 'Local District'}
                          </span>
                        </div>
                        <div className="py-1">
                          <span className="text-slate-500 block mb-1">Certifications:</span>
                          <div className="flex flex-wrap gap-1">
                            {Array.isArray(reviewingItem.entity.professionalProfile.certifications) &&
                              reviewingItem.entity.professionalProfile.certifications.map((c: string, i: number) => (
                                <span key={i} className="px-2 py-0.5 rounded bg-white/[0.04] text-[9px] text-slate-300 border border-white/5">
                                  {c}
                                </span>
                              ))}
                          </div>
                        </div>
                        <div className="py-1 border-t border-white/5 mt-2">
                          <span className="text-slate-500 block mb-1">Weekly Availability:</span>
                          <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-400">
                            {Object.entries(reviewingItem.entity.professionalProfile.availability || {}).map(([day, hrs]: any) => (
                              <div key={day} className="flex justify-between pr-2">
                                <span className="capitalize">{day}:</span>
                                <span className="text-slate-300 font-mono">{hrs}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {reviewingItem.entity?.type === 'ORGANIZATION' && reviewingItem.entity?.organizationProfile && (
                      <div className="space-y-2 text-xs">
                        <div className="grid grid-cols-3 py-1 border-b border-white/5">
                          <span className="text-slate-500">NGO Legal Name</span>
                          <span className="col-span-2 text-rose-300 font-semibold">{reviewingItem.entity.organizationProfile.ngoName}</span>
                        </div>
                        <div className="grid grid-cols-3 py-1 border-b border-white/5">
                          <span className="text-slate-500">Registration #</span>
                          <span className="col-span-2 text-slate-200 font-mono font-bold">{reviewingItem.entity.organizationProfile.registrationNumber}</span>
                        </div>
                        <div className="grid grid-cols-3 py-1 border-b border-white/5">
                          <span className="text-slate-500">Focus Cause</span>
                          <span className="col-span-2 text-slate-300">{reviewingItem.entity.organizationProfile.causeCategory}</span>
                        </div>
                        <div className="grid grid-cols-3 py-1 border-b border-white/5">
                          <span className="text-slate-500">Operational In</span>
                          <span className="col-span-2 text-slate-350">
                            {Array.isArray(reviewingItem.entity.organizationProfile.operationalAreas)
                              ? reviewingItem.entity.organizationProfile.operationalAreas.join(', ')
                              : 'All Districts'}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 py-1 border-b border-white/5">
                          <span className="text-slate-500">Website</span>
                          <a href={reviewingItem.entity.organizationProfile.website} target="_blank" rel="noreferrer" className="col-span-2 text-cyan-400 hover:underline truncate">
                            {reviewingItem.entity.organizationProfile.website || 'N/A'}
                          </a>
                        </div>
                      </div>
                    )}

                    {reviewingItem.entity?.type === 'GOVERNMENT' && reviewingItem.entity?.governmentProfile && (
                      <div className="space-y-2 text-xs">
                        <div className="grid grid-cols-3 py-1 border-b border-white/5">
                          <span className="text-slate-500">Dept Name</span>
                          <span className="col-span-2 text-amber-300 font-semibold">{reviewingItem.entity.governmentProfile.departmentName}</span>
                        </div>
                        <div className="grid grid-cols-3 py-1 border-b border-white/5">
                          <span className="text-slate-500">Official Email</span>
                          <span className="col-span-2 text-slate-200 font-mono">{reviewingItem.entity.governmentProfile.officialEmail}</span>
                        </div>
                        <div className="grid grid-cols-3 py-1 border-b border-white/5">
                          <span className="text-slate-500">Jurisdiction</span>
                          <span className="col-span-2 text-slate-200">{reviewingItem.entity.governmentProfile.departmentType}</span>
                        </div>
                        <div className="grid grid-cols-3 py-1 border-b border-white/5">
                          <span className="text-slate-500">District HQ</span>
                          <span className="col-span-2 text-slate-300">{reviewingItem.entity.governmentProfile.district}</span>
                        </div>
                      </div>
                    )}

                    {reviewingItem.entity?.type === 'EVENT_ORGANIZER' && reviewingItem.entity?.eventOrganizerProfile && (
                      <div className="space-y-2 text-xs">
                        <div className="grid grid-cols-3 py-1 border-b border-white/5">
                          <span className="text-slate-500">Agency Name</span>
                          <span className="col-span-2 text-fuchsia-300 font-semibold">{reviewingItem.entity.eventOrganizerProfile.organizationName}</span>
                        </div>
                        <div className="grid grid-cols-3 py-1 border-b border-white/5">
                          <span className="text-slate-500">Categories</span>
                          <span className="col-span-2 text-slate-300">
                            {Array.isArray(reviewingItem.entity.eventOrganizerProfile.eventCategories)
                              ? reviewingItem.entity.eventOrganizerProfile.eventCategories.join(', ')
                              : 'Festivals & Seminars'}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 py-1 border-b border-white/5">
                          <span className="text-slate-500">Venue Partners</span>
                          <span className="col-span-2 text-slate-300">
                            {Array.isArray(reviewingItem.entity.eventOrganizerProfile.venuePartnerships)
                              ? reviewingItem.entity.eventOrganizerProfile.venuePartnerships.join(', ')
                              : 'None listed'}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 py-1 border-b border-white/5">
                          <span className="text-slate-500">Ticketing Support</span>
                          <span className="col-span-2 text-slate-200 font-semibold">
                            {reviewingItem.entity.eventOrganizerProfile.ticketingSupport ? 'Yes, Integrated APIs' : 'No'}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 py-1 border-b border-white/5">
                          <span className="text-slate-500">Website</span>
                          <a href={reviewingItem.entity.eventOrganizerProfile.website} target="_blank" rel="noreferrer" className="col-span-2 text-cyan-400 hover:underline truncate">
                            {reviewingItem.entity.eventOrganizerProfile.website || 'N/A'}
                          </a>
                        </div>
                        {Array.isArray(reviewingItem.entity.eventOrganizerProfile.previousEvents) && reviewingItem.entity.eventOrganizerProfile.previousEvents.length > 0 && (
                          <div className="pt-2 border-t border-white/5">
                            <span className="text-slate-500 block mb-1">Previous Events Portfolio:</span>
                            <div className="space-y-1.5 max-h-[100px] overflow-y-auto pr-1">
                              {reviewingItem.entity.eventOrganizerProfile.previousEvents.map((ev: any, idx: number) => (
                                <div key={idx} className="bg-white/[0.01] p-1.5 rounded border border-white/5 text-[10px]">
                                  <div className="flex justify-between font-bold text-slate-300">
                                    <span>{ev.name}</span>
                                    <span className="text-slate-500">{ev.date}</span>
                                  </div>
                                  <p className="text-slate-450 text-[9px] mt-0.5 leading-tight">{ev.desc}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Documents Selection Queue */}
                  <div className="space-y-2 flex-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Verification Credentials ({ (reviewingItem.entity?.documents || []).length } files)
                    </label>
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {(reviewingItem.entity?.documents || []).length === 0 ? (
                        <p className="text-xs text-slate-500 italic py-4 text-center">
                          No documents have been uploaded for verification.
                        </p>
                      ) : (
                        reviewingItem.entity.documents.map((doc: any) => {
                          const isSelected = selectedDoc?.id === doc.id;
                          return (
                            <div
                              key={doc.id}
                              onClick={() => setSelectedDoc(doc)}
                              className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-violet-500/10 border-violet-500/40 text-violet-200'
                                  : 'bg-white/[0.02] border-white/5 text-slate-350 hover:bg-white/[0.04]'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <FileText
                                  className={`h-5 w-5 ${isSelected ? 'text-violet-400' : 'text-slate-450'}`}
                                />
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold truncate max-w-[170px]">
                                    {doc.name}
                                  </p>
                                  <p className="text-[9px] text-slate-500">
                                    {doc.documentType || 'PROOF'} {doc.documentNumber ? `(${doc.documentNumber})` : ''}
                                  </p>
                                </div>
                              </div>
                              <a
                                href={doc.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-cyan-400 hover:bg-cyan-500/10 flex items-center gap-1 text-[9px] font-semibold"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* RIGHT SIDE (col-span-7): Live File Viewer */}
                <div className="lg:col-span-7 flex flex-col bg-[#08080c] border border-white/5 rounded-2xl p-4 min-h-[400px] overflow-hidden relative">
                  {selectedDoc ? (
                    <div className="h-full flex flex-col">
                      <div className="border-b border-white/5 pb-2 mb-3 flex items-center justify-between shrink-0">
                        <div>
                          <h4 className="text-xs font-bold text-slate-200 truncate max-w-[320px]">
                            {selectedDoc.name}
                          </h4>
                          <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                            {selectedDoc.documentType || 'VERIFICATION_CREDENTIAL'} {selectedDoc.issuedAuthority ? `• Issued by ${selectedDoc.issuedAuthority}` : ''}
                          </p>
                        </div>
                        {selectedDoc.fileUrl && selectedDoc.fileUrl !== '#' && (
                          <a
                            href={selectedDoc.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1 font-semibold"
                          >
                            Fullscreen <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>

                      <div className="flex-1 overflow-y-auto pr-1 flex items-center justify-center bg-black/40 rounded-xl border border-white/5 p-4 relative">
                        {/* Check document type */}
                        {(() => {
                          const name = selectedDoc.name.toLowerCase();
                          const isPdf = name.endsWith('.pdf') || selectedDoc.documentType;
                          const isImage =
                            name.endsWith('.png') ||
                            name.endsWith('.jpg') ||
                            name.endsWith('.jpeg') ||
                            name.endsWith('.webp');

                          // Real URL preview
                          if (selectedDoc.fileUrl && selectedDoc.fileUrl !== '#') {
                            if (isPdf && !isImage) {
                              return (
                                <iframe
                                  src={selectedDoc.fileUrl}
                                  className="w-full h-full min-h-[300px] rounded-lg border-0 bg-white"
                                  title="PDF Viewer"
                                />
                              );
                            }
                            if (isImage) {
                              return (
                                <img
                                  src={selectedDoc.fileUrl}
                                  alt={selectedDoc.name}
                                  className="max-w-full max-h-full object-contain rounded-lg shadow-md"
                                />
                              );
                            }
                          }

                          // Fallback Mock Preview for Local Development
                          if (isPdf) {
                            return (
                              <div className="w-full h-full min-h-[300px] bg-slate-900 border border-slate-700/50 rounded-lg p-6 flex flex-col justify-between font-serif relative overflow-hidden select-none">
                                {/* Diagonal watermark */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] rotate-[-30deg] text-3xl font-sans font-bold tracking-widest text-white">
                                  VERIFICATION AUDIT ONLY
                                </div>
                                <div className="border-b-2 border-amber-500/20 pb-4 text-center">
                                  <h5 className="text-sm font-bold tracking-wider text-amber-500 uppercase">
                                    State Registry Authority
                                  </h5>
                                  <p className="text-[9px] text-slate-400 uppercase tracking-widest font-sans mt-1">
                                    Official Credential Certificate
                                  </p>
                                </div>

                                <div className="space-y-4 my-4 font-sans text-left text-[11px] text-slate-350">
                                  <div className="grid grid-cols-3 gap-2">
                                    <span className="text-slate-500 font-semibold">
                                      Owner Entity:
                                    </span>
                                    <span className="col-span-2 text-slate-100 font-bold">
                                      {reviewingItem.entity?.name}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2">
                                    <span className="text-slate-500 font-semibold">
                                      License / Document ID:
                                    </span>
                                    <span className="col-span-2 font-mono text-cyan-400 font-bold">
                                      {selectedDoc.documentNumber || `LIC-2026-${reviewingItem.id.substring(0, 8).toUpperCase()}`}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2">
                                    <span className="text-slate-500 font-semibold">
                                      Issuer / Authority:
                                    </span>
                                    <span className="col-span-2 text-slate-200">
                                      {selectedDoc.issuedAuthority || 'Govt Licensing Body'}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2">
                                    <span className="text-slate-500 font-semibold">
                                      Registered On:
                                    </span>
                                    <span className="col-span-2 text-slate-200">
                                      {new Date(reviewingItem.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2">
                                    <span className="text-slate-500 font-semibold">Registry Status:</span>
                                    <span className="col-span-2 text-emerald-400 font-semibold flex items-center gap-1">
                                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                                      ACTIVE & VALID
                                    </span>
                                  </div>
                                </div>

                                <div className="border-t border-slate-700/50 pt-4 flex justify-between items-center text-[8px] font-sans text-slate-500">
                                  <div>
                                    <p>
                                      Authorized Signatory: <i>Registrar of Public Credentials</i>
                                    </p>
                                    <p className="mt-0.5">Hash: {reviewingItem.entity?.id}</p>
                                  </div>
                                  <div className="h-8 w-8 rounded-full border border-amber-500/20 bg-amber-500/5 flex items-center justify-center text-amber-500/45 text-[9px] font-bold">
                                    SEAL
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div className="text-center p-4">
                              <FileText className="h-8 w-8 text-slate-550 mx-auto mb-2 animate-pulse" />
                              <p className="text-xs text-slate-400">
                                Preview template not available for: {selectedDoc.name}
                              </p>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
                      <Eye className="h-12 w-12 text-slate-700 mb-3 animate-pulse" />
                      <p className="text-xs font-bold text-slate-400">
                        No Document Selected
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1 max-w-[240px]">
                        Click any of the credentials on the left list to review its pre-signed URL or mock verification certificate here.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-white/5">
                <Button
                  onClick={() => {
                    setRejectingItem(reviewingItem);
                    setReviewingItem(null);
                  }}
                  variant="outline"
                  className="rounded-xl border-rose-500/20 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 cursor-pointer"
                >
                  Reject Application
                </Button>
                <Button
                  onClick={() => {
                    setApprovingItem(reviewingItem);
                    setReviewingItem(null);
                  }}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer"
                >
                  Approve Application
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* ── APPROVAL CONFIRMATION MODAL ──────────────────────────── */}
        {approvingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-sm p-6 rounded-2xl border border-white/10 bg-[#0c0c10] shadow-2xl relative text-center">
              <button
                onClick={() => setApprovingItem(null)}
                className="absolute top-4 right-4 text-slate-500 hover:text-slate-350 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-4">
                <CheckCircle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-100 mb-2">Approve Verification</h3>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Confirm approval of{' '}
                <span className="font-semibold text-slate-200">"{approvingItem.entity?.name}"</span>.
                The workspace will be fully unlocked immediately.
              </p>

              <div className="space-y-3 mb-6 text-left">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest block">
                  Moderator Notes
                </label>
                <Input
                  placeholder="e.g. Verified license documents against state registry records."
                  value={approveNotes}
                  onChange={(e) => setApproveNotes(e.target.value)}
                  className="rounded-xl border-white/10 bg-white/5 text-xs text-slate-200 focus:border-violet-500"
                />
              </div>

              <div className="flex justify-center gap-3">
                <Button
                  onClick={() => setApprovingItem(null)}
                  variant="outline"
                  className="rounded-xl border-white/10 hover:bg-white/5 text-slate-300 px-4 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-4 cursor-pointer flex items-center gap-1.5"
                >
                  {actionLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                  Confirm Approval
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* ── REJECTION REASON MODAL ────────────────────────────────── */}
        {rejectingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-md p-6 rounded-2xl border border-white/10 bg-[#0c0c10] shadow-2xl relative">
              <button
                onClick={() => setRejectingItem(null)}
                className="absolute top-4 right-4 text-slate-500 hover:text-slate-350 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              <h3 className="text-xl font-bold text-slate-100 mb-2">Reject Submission</h3>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Provide a reason for rejecting{' '}
                <span className="font-semibold text-slate-200">"{rejectingItem.entity?.name}"</span>.
                The owner will see this notification.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest block mb-2">
                    Rejection Reason
                  </label>
                  <Input
                    placeholder="e.g. Uploaded certificate is expired or invalid."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    required
                    className="rounded-xl border-white/10 bg-white/5 text-slate-200 text-xs focus:border-rose-500"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    onClick={() => setRejectingItem(null)}
                    variant="outline"
                    className="rounded-xl border-white/10 hover:bg-white/5 text-slate-350 cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleReject}
                    disabled={!rejectReason || actionLoading}
                    className="rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold cursor-pointer flex items-center gap-1.5"
                  >
                    {actionLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                    Confirm Rejection
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
