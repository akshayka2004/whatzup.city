'use client';

import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { COMPANY_TYPES, CONTACT_PREFERENCES } from '@/lib/constants';
import { getCategoryAttributes } from '@/lib/category-attributes';
import { cn } from '@/lib/utils';

/** Shape persisted to Business (compliance/contacts/attributes JSON + scalars). */
export type RegistrationDetails = {
  brandName?: string;
  companyName?: string;
  companyType?: string;
  billSeriesPrefix?: string;
  compliance?: {
    pan?: { has?: boolean; number?: string; nameAsPerPan?: string };
    gst?: { has?: boolean; gstin?: string; legalName?: string; tradeName?: string; regType?: string };
  };
  ownerContact?: { email?: string; phone?: string; preference?: string[] };
  billingContact?: Contact;
  supportContact?: Contact;
  branchHead?: Contact;
  categoryAttributes?: Record<string, any>;
};
type Contact = { fullName?: string; designation?: string; email?: string; phone?: string };

const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="text-sm font-bold text-foreground">{title}</h3>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">
        {label}{required && <span className="text-destructive"> *</span>}
      </span>
      {children}
    </label>
  );
}

function YesNo({ value, onChange }: { value?: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="inline-flex rounded-xl border border-border p-0.5">
      {[{ l: 'Yes', v: true }, { l: 'No', v: false }].map((o) => (
        <button
          key={o.l}
          type="button"
          onClick={() => onChange(o.v)}
          className={cn(
            'rounded-lg px-4 py-1.5 text-sm font-medium transition-colors',
            value === o.v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

function ContactBlock({
  value, onChange, required,
}: { value?: Contact; onChange: (c: Contact) => void; required?: boolean }) {
  const v = value || {};
  const set = (k: keyof Contact, val: string) => onChange({ ...v, [k]: val });
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Full name" required={required}>
        <Input value={v.fullName || ''} onChange={(e) => set('fullName', e.target.value)} />
      </Field>
      <Field label="Designation">
        <Input value={v.designation || ''} onChange={(e) => set('designation', e.target.value)} />
      </Field>
      <Field label="Email" required={required}>
        <Input type="email" value={v.email || ''} onChange={(e) => set('email', e.target.value)} />
      </Field>
      <Field label="Phone" required={required}>
        <Input value={v.phone || ''} onChange={(e) => set('phone', e.target.value)} />
      </Field>
    </div>
  );
}

export function RegistrationDetailsForm({
  value,
  onChange,
  categorySlug,
}: {
  value: RegistrationDetails;
  onChange: (next: RegistrationDetails) => void;
  categorySlug?: string | null;
}) {
  const v = value || {};
  const merge = (patch: Partial<RegistrationDetails>) => onChange({ ...v, ...patch });
  const pan = v.compliance?.pan || {};
  const gst = v.compliance?.gst || {};
  const setPan = (p: any) => merge({ compliance: { ...v.compliance, pan: { ...pan, ...p } } });
  const setGst = (g: any) => merge({ compliance: { ...v.compliance, gst: { ...gst, ...g } } });
  const owner = v.ownerContact || {};
  const prefs = owner.preference || [];
  const togglePref = (p: string) =>
    merge({
      ownerContact: {
        ...owner,
        preference: prefs.includes(p) ? prefs.filter((x) => x !== p) : [...prefs, p],
      },
    });

  const attrs = getCategoryAttributes(categorySlug);
  const attrVals = v.categoryAttributes || {};
  const setAttr = (k: string, val: any) => merge({ categoryAttributes: { ...attrVals, [k]: val } });

  const panValid = !pan.number || PAN_RE.test((pan.number || '').toUpperCase());
  const gstValid = !gst.gstin || GSTIN_RE.test((gst.gstin || '').toUpperCase());

  return (
    <div className="space-y-5">
      {/* Company */}
      <Section title="Company details">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Brand name">
            <Input value={v.brandName || ''} onChange={(e) => merge({ brandName: e.target.value })} placeholder="Public-facing brand" />
          </Field>
          <Field label="Company name (legal)">
            <Input value={v.companyName || ''} onChange={(e) => merge({ companyName: e.target.value })} />
          </Field>
          <Field label="Company type">
            <Select value={v.companyType || ''} onValueChange={(val) => merge({ companyType: val })}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                {COMPANY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field
            label="Bill series prefix"
          >
            <Input
              value={v.billSeriesPrefix || ''}
              onChange={(e) => merge({ billSeriesPrefix: e.target.value })}
              placeholder="e.g. INV- or SC/2026/"
            />
          </Field>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Optional. If your own bills always start with a fixed prefix, entering it here lets us
          auto-flag matching customer-submitted bills during review — you can also set this later
          from Settings.
        </p>
      </Section>

      {/* PAN */}
      <Section title="PAN">
        <Field label="Do you have a PAN?">
          <YesNo value={pan.has} onChange={(has) => setPan({ has })} />
        </Field>
        {pan.has && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="PAN number">
              <Input
                value={pan.number || ''}
                onChange={(e) => setPan({ number: e.target.value.toUpperCase() })}
                placeholder="ABCDE1234F"
                maxLength={10}
                className={cn(!panValid && 'border-destructive')}
              />
              {!panValid && <span className="text-[11px] text-destructive">Format: 5 letters, 4 digits, 1 letter</span>}
            </Field>
            <Field label="Name as per PAN">
              <Input value={pan.nameAsPerPan || ''} onChange={(e) => setPan({ nameAsPerPan: e.target.value })} />
            </Field>
          </div>
        )}
      </Section>

      {/* GST */}
      <Section title="GST registration">
        <Field label="Do you have GST registration?">
          <YesNo value={gst.has} onChange={(has) => setGst({ has })} />
        </Field>
        {gst.has && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="GSTIN">
              <Input
                value={gst.gstin || ''}
                onChange={(e) => setGst({ gstin: e.target.value.toUpperCase() })}
                placeholder="22ABCDE1234F1Z5"
                maxLength={15}
                className={cn(!gstValid && 'border-destructive')}
              />
              {!gstValid && <span className="text-[11px] text-destructive">Enter a valid 15-character GSTIN</span>}
            </Field>
            <Field label="Registration type">
              <Select value={gst.regType || ''} onValueChange={(val) => setGst({ regType: val })}>
                <SelectTrigger><SelectValue placeholder="Regular / Composition" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Regular">Regular</SelectItem>
                  <SelectItem value="Composition">Composition</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Legal name (as per PAN)">
              <Input value={gst.legalName || ''} onChange={(e) => setGst({ legalName: e.target.value })} />
            </Field>
            <Field label="Trade name">
              <Input value={gst.tradeName || ''} onChange={(e) => setGst({ tradeName: e.target.value })} />
            </Field>
          </div>
        )}
      </Section>

      {/* Owner contact */}
      <Section title="Owner contact">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Owner email">
            <Input type="email" value={owner.email || ''} onChange={(e) => merge({ ownerContact: { ...owner, email: e.target.value } })} />
          </Field>
          <Field label="Owner phone">
            <Input value={owner.phone || ''} onChange={(e) => merge({ ownerContact: { ...owner, phone: e.target.value } })} />
          </Field>
        </div>
        <Field label="Preferred contact (choose any or all)">
          <div className="flex flex-wrap gap-2">
            {CONTACT_PREFERENCES.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => togglePref(p)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                  prefs.includes(p)
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </Field>
      </Section>

      {/* Contacts */}
      <Section title="Billing contact" hint="Required — used for invoices and billing.">
        <ContactBlock value={v.billingContact} onChange={(c) => merge({ billingContact: c })} required />
      </Section>
      <Section title="Support contact" hint="Optional — day-to-day point of contact.">
        <ContactBlock value={v.supportContact} onChange={(c) => merge({ supportContact: c })} />
      </Section>
      <Section title="Branch head" hint="Optional.">
        <ContactBlock value={v.branchHead} onChange={(c) => merge({ branchHead: c })} />
      </Section>

      {/* Category attributes */}
      {attrs.length > 0 && (
        <Section title="Business status & amenities" hint="Details specific to your category.">
          <div className="grid gap-4 sm:grid-cols-2">
            {attrs.map((a) => (
              <Field key={a.key} label={a.label}>
                {a.type === 'boolean' ? (
                  <YesNo value={attrVals[a.key]} onChange={(val) => setAttr(a.key, val)} />
                ) : a.type === 'single' ? (
                  <Select value={attrVals[a.key] || ''} onValueChange={(val) => setAttr(a.key, val)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {a.options!.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {a.options!.map((o) => {
                      const arr: string[] = Array.isArray(attrVals[a.key]) ? attrVals[a.key] : [];
                      const on = arr.includes(o);
                      return (
                        <button
                          key={o}
                          type="button"
                          onClick={() => setAttr(a.key, on ? arr.filter((x) => x !== o) : [...arr, o])}
                          className={cn(
                            'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                            on ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground',
                          )}
                        >
                          {o}
                        </button>
                      );
                    })}
                  </div>
                )}
              </Field>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
