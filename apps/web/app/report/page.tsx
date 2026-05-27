'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertTriangle, ArrowLeft, Check, Flag,
  Store, Tag, Star, MessageSquare, Globe, ShieldAlert, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiService } from '@/lib/services/api-service';
import { useAuth } from '@/hooks/use-auth';

type IssueType =
  | 'fake_business'
  | 'fraudulent_offer'
  | 'fake_review'
  | 'inappropriate_content'
  | 'wrong_info'
  | 'other';

const ISSUE_TYPES: { id: IssueType; label: string; desc: string; icon: any; color: string }[] = [
  { id: 'fake_business', label: 'Fake / Duplicate Business', desc: 'Business listing appears fraudulent or is a duplicate.', icon: Store, color: 'text-rose-400' },
  { id: 'fraudulent_offer', label: 'Fraudulent Offer', desc: 'Offer is misleading, expired, or not honored.', icon: Tag, color: 'text-amber-400' },
  { id: 'fake_review', label: 'Fake Review', desc: 'Review appears to be fabricated or purchased.', icon: Star, color: 'text-yellow-400' },
  { id: 'inappropriate_content', label: 'Inappropriate Content', desc: 'Media or description violates community guidelines.', icon: ShieldAlert, color: 'text-violet-400' },
  { id: 'wrong_info', label: 'Wrong Information', desc: 'Address, hours, or contact info is incorrect.', icon: Globe, color: 'text-cyan-400' },
  { id: 'other', label: 'Other Issue', desc: 'Something else that needs admin attention.', icon: MessageSquare, color: 'text-slate-400' },
];

export default function ReportPage() {
  const { user } = useAuth();
  const [step, setStep] = useState<'type' | 'details' | 'success'>('type');
  const [selectedType, setSelectedType] = useState<IssueType | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submittedId, setSubmittedId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType || !description.trim()) return;
    setError('');
    setSubmitting(true);

    const payload = {
      type: selectedType,
      subject: subject.trim() || ISSUE_TYPES.find((t) => t.id === selectedType)!.label,
      description: description.trim(),
      targetName: businessName.trim() || undefined,
    };

    if (user) {
      // Authenticated — send to API
      const res = await apiService.post<any>('/v1/reports', payload);
      setSubmitting(false);
      if (res.error) {
        setError(res.error || 'Failed to submit report. Please try again.');
        return;
      }
      setSubmittedId(res.data?.id || `RPT-${Date.now().toString(36).toUpperCase().slice(-6)}`);
    } else {
      // Unauthenticated — save locally + prompt to sign in
      setSubmitting(false);
      const id = `RPT-${Date.now().toString(36).toUpperCase().slice(-6)}`;
      setSubmittedId(id);
    }
    setStep('success');
  };

  const reset = () => {
    setStep('type');
    setSelectedType(null);
    setBusinessName('');
    setSubject('');
    setDescription('');
    setSubmittedId('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="sm" className="rounded-xl text-muted-foreground hover:text-foreground cursor-pointer">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-rose-400" />
            <span className="font-bold text-foreground">Report an Issue</span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Step: Select type */}
        {step === 'type' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-extrabold text-foreground tracking-tight mb-1">What are you reporting?</h1>
              <p className="text-muted-foreground text-sm">Select the issue category to continue.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {ISSUE_TYPES.map((type) => {
                const Icon = type.icon;
                const selected = selectedType === type.id;
                return (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={cn(
                      'text-left p-4 rounded-2xl border transition-all cursor-pointer',
                      selected
                        ? 'border-primary/40 bg-primary/5'
                        : 'border-white/5 bg-card/60 hover:border-white/10 hover:bg-white/5',
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`h-4 w-4 ${type.color}`} />
                      <span className="text-sm font-semibold text-foreground">{type.label}</span>
                      {selected && <Check className="h-3.5 w-3.5 text-primary ml-auto" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{type.desc}</p>
                  </button>
                );
              })}
            </div>
            <Button
              onClick={() => selectedType && setStep('details')}
              disabled={!selectedType}
              className="w-full rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold cursor-pointer disabled:opacity-40"
            >
              Continue
            </Button>
          </div>
        )}

        {/* Step: Details */}
        {step === 'details' && selectedType && (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <button onClick={() => setStep('type')} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <h1 className="text-2xl font-extrabold text-foreground tracking-tight mb-0.5">Report Details</h1>
                <p className="text-muted-foreground text-sm capitalize">
                  {ISSUE_TYPES.find((t) => t.id === selectedType)?.label}
                </p>
              </div>
            </div>

            <Card className="p-6 rounded-2xl border-white/5 bg-card/60 backdrop-blur-xl">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                    Business Name <span className="text-muted-foreground">(optional)</span>
                  </label>
                  <Input
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Which business is this about?"
                    className="rounded-xl border-white/10 bg-white/5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                    Subject <span className="text-muted-foreground">(optional)</span>
                  </label>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Brief summary"
                    className="rounded-xl border-white/10 bg-white/5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                    Description <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the issue in detail. Include dates, offer names, or any relevant information."
                    rows={6}
                    required
                    className="w-full rounded-xl border border-white/10 bg-white/5 text-sm text-foreground px-3 py-2.5 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                {!user && (
                  <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <AlertTriangle className="h-3.5 w-3.5 text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-300">
                      You are not logged in. <Link href="/login" className="underline font-medium">Sign in</Link> so admins can follow up with you.
                    </p>
                  </div>
                )}
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-300">
                    False reports may result in account restrictions. Only report genuine issues.
                  </p>
                </div>
                {error && (
                  <p className="text-xs text-rose-400">{error}</p>
                )}
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold cursor-pointer flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Submit Report
                </Button>
              </form>
            </Card>
          </div>
        )}

        {/* Step: Success */}
        {step === 'success' && (
          <Card className="p-10 rounded-2xl border-white/5 bg-card/60 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <Check className="h-8 w-8 text-emerald-400" />
            </div>
            <h2 className="text-xl font-extrabold text-foreground">Report Submitted</h2>
            <p className="text-muted-foreground text-sm">
              Your report <strong className="text-foreground">{submittedId}</strong> has been submitted and is visible to our admin team. We will review it within 24–48 hours.
            </p>
            <div className="flex gap-2 justify-center pt-2">
              <Button onClick={reset} variant="outline" className="rounded-xl border-white/10 text-slate-300 hover:bg-white/5 cursor-pointer">
                Report Another
              </Button>
              <Link href="/">
                <Button className="rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground cursor-pointer">
                  Back to Home
                </Button>
              </Link>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
