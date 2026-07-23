'use client';

import React, { useState, useEffect } from 'react';
import { SuperAdminLayout } from '@/components/layouts/super-admin-layout';
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

export default function SuperAdminApprovalsPage() {
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<string>('ALL');

  const [reviewingItem, setReviewingItem] = useState<any>(null);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [rejectingItem, setRejectingItem] = useState<any>(null);
  const [approvingItem, setApprovingItem] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

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
        { notes: approveNotes || 'Approved by super administrator' },
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
      case 'BUSINESS': return <Building2 className="h-4 w-4 text-info" />;
      case 'INFLUENCER': return <Sparkles className="h-4 w-4 text-primary" />;
      case 'PROFESSIONAL': return <Briefcase className="h-4 w-4 text-success" />;
      case 'ORGANIZATION': return <Heart className="h-4 w-4 text-destructive" />;
      case 'GOVERNMENT': return <ShieldAlert className="h-4 w-4 text-warning" />;
      case 'EVENT_ORGANIZER': return <Calendar className="h-4 w-4 text-primary" />;
      default: return <Users className="h-4 w-4 text-muted-foreground" />;
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
    <SuperAdminLayout>
      <div className="space-y-8 font-sans pb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-foreground mb-2 tracking-tight">
              Universal Moderation Queue
            </h1>
            <p className="text-muted-foreground text-sm">
              Review, verify, and approve onboarding credentials for multi-entity profiles.
            </p>
          </div>
          <div className="h-1 py-1 px-4 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary text-center">
            {displayApprovals.length} pending verification
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
            {error}
          </div>
        )}

        {/* TABS */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border pb-2">
          {tabsList.map((t) => {
            const isActive = activeTab === t.val;
            return (
              <button
                key={t.val}
                onClick={() => setActiveTab(t.val)}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-primary/20 to-info/20 border border-primary/40 text-primary shadow-md shadow-violet-950/20'
                    : 'bg-secondary border border-border text-muted-foreground hover:text-muted-foreground hover:bg-foreground/[0.04]'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* QUEUE */}
        <div className="space-y-4">
          {loading ? (
            <div className="p-16 text-center">
              <Loader2 className="h-10 w-10 text-info animate-spin mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Querying pending moderation requests...</p>
            </div>
          ) : displayApprovals.length === 0 ? (
            <Card className="p-12 text-center border border-dashed border-border bg-[#0d0d12]/30 rounded-3xl">
              <Check className="mx-auto h-12 w-12 text-success mb-4 bg-success/10 p-2 rounded-full" />
              <h3 className="text-lg font-bold text-foreground mb-1">Moderation Queue Clean</h3>
              <p className="text-xs text-muted-foreground">
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
                    className="p-5 rounded-2xl border border-border bg-card/45 backdrop-blur-xl hover:shadow-xl hover:border-border transition-all duration-300 relative overflow-hidden group"
                  >
                    <div className="absolute top-0 right-0 w-48 h-48 bg-primary/[0.02] rounded-full blur-3xl pointer-events-none"></div>
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2.5">
                          <span className="p-2 rounded-xl bg-secondary border border-border">
                            {getRoleIcon(entity.type)}
                          </span>
                          <div>
                            <h3 className="font-bold text-muted-foreground text-base">
                              {entity.name || 'Unnamed Entity'}
                            </h3>
                            <p className="text-[10px] text-muted-foreground font-mono">Request ID: {req.id}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs text-muted-foreground pt-1">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5" />{entity.email || 'No email'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5" />{entity.phone || 'No phone'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            Submitted: {new Date(req.createdAt).toLocaleDateString()}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-secondary text-[10px] font-semibold text-foreground">
                            {docCount} docs uploaded
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 lg:self-center">
                        <Button
                          onClick={() => { setReviewingItem(req); setSelectedDoc((entity.documents || [])[0] || null); }}
                          size="sm"
                          className="rounded-xl gap-1.5 bg-gradient-to-r from-primary to-info text-white font-semibold hover:from-primary hover:to-info cursor-pointer shadow-lg shadow-violet-950/20"
                        >
                          <Eye className="h-4 w-4" /> Review & Verify
                        </Button>
                        <Button
                          onClick={() => setApprovingItem(req)}
                          size="sm"
                          variant="outline"
                          className="rounded-xl text-success hover:text-success border-success/20 hover:bg-success/10 gap-1 cursor-pointer"
                        >
                          <CheckCircle className="h-4 w-4" /> Approve
                        </Button>
                        <Button
                          onClick={() => setRejectingItem(req)}
                          size="sm"
                          variant="outline"
                          className="rounded-xl text-destructive hover:text-destructive border-destructive/20 hover:bg-destructive/10 gap-1 cursor-pointer"
                        >
                          <XCircle className="h-4 w-4" /> Reject
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* REVIEW MODAL */}
        {reviewingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
            <Card className="w-full max-w-6xl p-6 rounded-3xl border border-border bg-[#0c0c10] shadow-2xl relative max-h-[90vh] flex flex-col">
              <button
                onClick={() => { setReviewingItem(null); setSelectedDoc(null); }}
                className="absolute top-5 right-5 text-muted-foreground hover:text-foreground cursor-pointer p-1 bg-secondary rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="border-b border-border pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className="p-1 px-2.5 rounded-lg bg-primary/10 border border-primary/20 text-xs font-bold text-primary uppercase tracking-widest">
                    {reviewingItem.entity?.type} VERIFICATION
                  </span>
                  <p className="text-xs text-muted-foreground font-mono">
                    Owner: {reviewingItem.entity?.user?.name} ({reviewingItem.entity?.user?.email})
                  </p>
                </div>
                <h3 className="text-2xl font-bold text-muted-foreground mt-2">
                  Credential Audit: {reviewingItem.entity?.name}
                </h3>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden flex-1 pb-2">
                {/* LEFT */}
                <div className="lg:col-span-5 flex flex-col gap-4 overflow-y-auto pr-1">
                  <div className="p-4 rounded-2xl bg-secondary border border-border space-y-3">
                    <h4 className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      {getRoleIcon(reviewingItem.entity?.type)} Profile Specifications
                    </h4>

                    {reviewingItem.entity?.type === 'BUSINESS' && reviewingItem.entity?.business && (
                      <div className="space-y-2 text-xs">
                        {[
                          ['Category', reviewingItem.entity.business.category?.name || 'Retail'],
                          ['Owner Name', reviewingItem.entity.business.ownerName || 'N/A'],
                          ['Address', `${reviewingItem.entity.business.address}, ${reviewingItem.entity.business.city}, ${reviewingItem.entity.business.state}`],
                        ].map(([label, val]) => (
                          <div key={label} className="grid grid-cols-3 py-1 border-b border-border">
                            <span className="text-muted-foreground">{label}</span>
                            <span className="col-span-2 text-muted-foreground font-semibold">{val}</span>
                          </div>
                        ))}
                        <div className="grid grid-cols-3 py-1 border-b border-border">
                          <span className="text-muted-foreground">Website</span>
                          <a href={reviewingItem.entity.business.website} target="_blank" rel="noreferrer" className="col-span-2 text-info hover:underline truncate">
                            {reviewingItem.entity.business.website || 'N/A'}
                          </a>
                        </div>
                        <div className="pt-2 text-slate-350 italic">"{reviewingItem.entity.business.description}"</div>
                      </div>
                    )}

                    {reviewingItem.entity?.type === 'INFLUENCER' && reviewingItem.entity?.influencerProfile && (
                      <div className="space-y-2 text-xs">
                        {[
                          ['Niche', reviewingItem.entity.influencerProfile.niche],
                          ['Followers', reviewingItem.entity.influencerProfile.followersCount?.toLocaleString()],
                          ['Engagement', `${reviewingItem.entity.influencerProfile.engagementRate}%`],
                        ].map(([label, val]) => (
                          <div key={label} className="grid grid-cols-3 py-1 border-b border-border">
                            <span className="text-muted-foreground">{label}</span>
                            <span className="col-span-2 text-muted-foreground font-semibold">{val}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {reviewingItem.entity?.type === 'PROFESSIONAL' && reviewingItem.entity?.professionalProfile && (
                      <div className="space-y-2 text-xs">
                        {[
                          ['Practice Field', reviewingItem.entity.professionalProfile.category],
                          ['Experience', `${reviewingItem.entity.professionalProfile.experienceYears} Years`],
                          ['Fees', `₹${reviewingItem.entity.professionalProfile.pricingMin} - ₹${reviewingItem.entity.professionalProfile.pricingMax} / hr`],
                        ].map(([label, val]) => (
                          <div key={label} className="grid grid-cols-3 py-1 border-b border-border">
                            <span className="text-muted-foreground">{label}</span>
                            <span className="col-span-2 text-muted-foreground font-semibold">{val}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {reviewingItem.entity?.type === 'ORGANIZATION' && reviewingItem.entity?.organizationProfile && (
                      <div className="space-y-2 text-xs">
                        {[
                          ['NGO Legal Name', reviewingItem.entity.organizationProfile.ngoName],
                          ['Registration #', reviewingItem.entity.organizationProfile.registrationNumber],
                          ['Focus Cause', reviewingItem.entity.organizationProfile.causeCategory],
                        ].map(([label, val]) => (
                          <div key={label} className="grid grid-cols-3 py-1 border-b border-border">
                            <span className="text-muted-foreground">{label}</span>
                            <span className="col-span-2 text-muted-foreground font-semibold">{val}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {reviewingItem.entity?.type === 'GOVERNMENT' && reviewingItem.entity?.governmentProfile && (
                      <div className="space-y-2 text-xs">
                        {[
                          ['Dept Name', reviewingItem.entity.governmentProfile.departmentName],
                          ['Official Email', reviewingItem.entity.governmentProfile.officialEmail],
                          ['Jurisdiction', reviewingItem.entity.governmentProfile.departmentType],
                          ['District HQ', reviewingItem.entity.governmentProfile.district],
                        ].map(([label, val]) => (
                          <div key={label} className="grid grid-cols-3 py-1 border-b border-border">
                            <span className="text-muted-foreground">{label}</span>
                            <span className="col-span-2 text-muted-foreground font-semibold">{val}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {reviewingItem.entity?.type === 'EVENT_ORGANIZER' && reviewingItem.entity?.eventOrganizerProfile && (
                      <div className="space-y-2 text-xs">
                        {[
                          ['Agency Name', reviewingItem.entity.eventOrganizerProfile.organizationName],
                          ['Ticketing', reviewingItem.entity.eventOrganizerProfile.ticketingSupport ? 'Yes, Integrated' : 'No'],
                        ].map(([label, val]) => (
                          <div key={label} className="grid grid-cols-3 py-1 border-b border-border">
                            <span className="text-muted-foreground">{label}</span>
                            <span className="col-span-2 text-muted-foreground font-semibold">{val}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Documents list */}
                  <div className="space-y-2 flex-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Verification Credentials ({(reviewingItem.entity?.documents || []).length} files)
                    </label>
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {(reviewingItem.entity?.documents || []).length === 0 ? (
                        <p className="text-xs text-muted-foreground italic py-4 text-center">No documents uploaded.</p>
                      ) : (
                        reviewingItem.entity.documents.map((doc: any) => {
                          const isSelected = selectedDoc?.id === doc.id;
                          return (
                            <div
                              key={doc.id}
                              onClick={() => setSelectedDoc(doc)}
                              className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-primary/10 border-primary/40 text-primary'
                                  : 'bg-secondary border-border text-slate-350 hover:bg-foreground/[0.04]'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <FileText className={`h-5 w-5 ${isSelected ? 'text-primary' : 'text-slate-450'}`} />
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold truncate max-w-[170px]">{doc.name}</p>
                                  <p className="text-[9px] text-muted-foreground">{doc.documentType || 'PROOF'}</p>
                                </div>
                              </div>
                              <a
                                href={doc.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-1.5 rounded-lg bg-secondary border border-border text-info hover:bg-info/10"
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

                {/* RIGHT - File Viewer */}
                <div className="lg:col-span-7 flex flex-col bg-[#08080c] border border-border rounded-2xl p-4 min-h-[400px] overflow-hidden relative">
                  {selectedDoc ? (
                    <div className="h-full flex flex-col">
                      <div className="border-b border-border pb-2 mb-3 flex items-center justify-between shrink-0">
                        <div>
                          <h4 className="text-xs font-bold text-muted-foreground truncate max-w-[320px]">{selectedDoc.name}</h4>
                          <p className="text-[9px] text-muted-foreground font-mono mt-0.5">{selectedDoc.documentType || 'VERIFICATION_CREDENTIAL'}</p>
                        </div>
                        {selectedDoc.fileUrl && selectedDoc.fileUrl !== '#' && (
                          <a href={selectedDoc.fileUrl} target="_blank" rel="noreferrer" className="text-[10px] text-info hover:underline flex items-center gap-1 font-semibold">
                            Fullscreen <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                      <div className="flex-1 overflow-y-auto pr-1 flex items-center justify-center bg-black/40 rounded-xl border border-border p-4">
                        {(() => {
                          const name = selectedDoc.name.toLowerCase();
                          const isImage = name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.webp');
                          const isPdf = name.endsWith('.pdf') || selectedDoc.documentType;
                          if (selectedDoc.fileUrl && selectedDoc.fileUrl !== '#') {
                            if (isPdf && !isImage) return <iframe src={selectedDoc.fileUrl} className="w-full h-full min-h-[300px] rounded-lg border-0 bg-white" title="PDF Viewer" />;
                            if (isImage) return <img src={selectedDoc.fileUrl} alt={selectedDoc.name} className="max-w-full max-h-full object-contain rounded-lg shadow-md" />;
                          }
                          return (
                            <div className="w-full h-full min-h-[300px] bg-slate-900 border border-border rounded-lg p-6 flex flex-col justify-between font-serif relative overflow-hidden select-none">
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] rotate-[-30deg] text-3xl font-sans font-bold tracking-widest text-white">
                                VERIFICATION AUDIT ONLY
                              </div>
                              <div className="border-b-2 border-warning/20 pb-4 text-center">
                                <h5 className="text-sm font-bold tracking-wider text-warning uppercase">State Registry Authority</h5>
                                <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-sans mt-1">Official Credential Certificate</p>
                              </div>
                              <div className="space-y-4 my-4 font-sans text-left text-[11px] text-slate-350">
                                <div className="grid grid-cols-3 gap-2">
                                  <span className="text-muted-foreground font-semibold">Owner Entity:</span>
                                  <span className="col-span-2 text-muted-foreground font-bold">{reviewingItem.entity?.name}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                  <span className="text-muted-foreground font-semibold">License / Document ID:</span>
                                  <span className="col-span-2 font-mono text-info font-bold">
                                    {selectedDoc.documentNumber || `LIC-2026-${reviewingItem.id.substring(0, 8).toUpperCase()}`}
                                  </span>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                  <span className="text-muted-foreground font-semibold">Registered On:</span>
                                  <span className="col-span-2 text-muted-foreground">{new Date(reviewingItem.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                  <span className="text-muted-foreground font-semibold">Registry Status:</span>
                                  <span className="col-span-2 text-success font-semibold flex items-center gap-1">
                                    <span className="h-1.5 w-1.5 rounded-full bg-success animate-ping"></span>
                                    ACTIVE & VALID
                                  </span>
                                </div>
                              </div>
                              <div className="border-t border-border pt-4 flex justify-between items-center text-[8px] font-sans text-muted-foreground">
                                <div>
                                  <p>Authorized Signatory: <i>Registrar of Public Credentials</i></p>
                                  <p className="mt-0.5">Hash: {reviewingItem.entity?.id}</p>
                                </div>
                                <div className="h-8 w-8 rounded-full border border-warning/20 bg-warning/5 flex items-center justify-center text-warning/45 text-[9px] font-bold">SEAL</div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                      <Eye className="h-12 w-12 text-muted-foreground mb-3 animate-pulse" />
                      <p className="text-xs font-bold text-muted-foreground">No Document Selected</p>
                      <p className="text-[10px] text-muted-foreground mt-1 max-w-[240px]">Click any credential on the left to preview it here.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-border">
                <Button
                  onClick={() => { setRejectingItem(reviewingItem); setReviewingItem(null); }}
                  variant="outline"
                  className="rounded-xl border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                >
                  Reject Application
                </Button>
                <Button
                  onClick={() => { setApprovingItem(reviewingItem); setReviewingItem(null); }}
                  className="rounded-xl bg-success hover:bg-success text-white font-semibold cursor-pointer"
                >
                  Approve Application
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* APPROVE MODAL */}
        {approvingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-sm p-6 rounded-2xl border border-border bg-[#0c0c10] shadow-2xl relative text-center">
              <button onClick={() => setApprovingItem(null)} className="absolute top-4 right-4 text-muted-foreground hover:text-slate-350 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
              <div className="mx-auto w-12 h-12 rounded-full bg-success/10 flex items-center justify-center text-success mb-4">
                <CheckCircle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-muted-foreground mb-2">Approve Verification</h3>
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                Confirm approval of <span className="font-semibold text-muted-foreground">"{approvingItem.entity?.name}"</span>.
              </p>
              <div className="space-y-3 mb-6 text-left">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest block">Moderator Notes</label>
                <Input
                  placeholder="e.g. Verified license documents against state registry records."
                  value={approveNotes}
                  onChange={(e) => setApproveNotes(e.target.value)}
                  className="rounded-xl border-border bg-secondary text-xs text-muted-foreground focus:border-primary"
                />
              </div>
              <div className="flex justify-center gap-3">
                <Button onClick={() => setApprovingItem(null)} variant="outline" className="rounded-xl border-border hover:bg-secondary text-foreground px-4 cursor-pointer">
                  Cancel
                </Button>
                <Button onClick={handleApprove} disabled={actionLoading} className="rounded-xl bg-success hover:bg-success text-white px-4 cursor-pointer flex items-center gap-1.5">
                  {actionLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                  Confirm Approval
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* REJECT MODAL */}
        {rejectingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-md p-6 rounded-2xl border border-border bg-[#0c0c10] shadow-2xl relative">
              <button onClick={() => setRejectingItem(null)} className="absolute top-4 right-4 text-muted-foreground hover:text-slate-350 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
              <h3 className="text-xl font-bold text-muted-foreground mb-2">Reject Submission</h3>
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                Provide a reason for rejecting <span className="font-semibold text-muted-foreground">"{rejectingItem.entity?.name}"</span>.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest block mb-2">Rejection Reason</label>
                  <Input
                    placeholder="e.g. Uploaded certificate is expired or invalid."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    required
                    className="rounded-xl border-border bg-secondary text-muted-foreground text-xs focus:border-destructive"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button onClick={() => setRejectingItem(null)} variant="outline" className="rounded-xl border-border hover:bg-secondary text-slate-350 cursor-pointer">
                    Cancel
                  </Button>
                  <Button onClick={handleReject} disabled={!rejectReason || actionLoading} className="rounded-xl bg-destructive hover:bg-destructive text-white font-semibold cursor-pointer flex items-center gap-1.5">
                    {actionLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                    Confirm Rejection
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
}
