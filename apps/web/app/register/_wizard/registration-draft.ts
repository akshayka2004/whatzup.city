/**
 * Local copy of what a person has typed into the registration form, so a refresh, a dropped
 * connection or a closed tab does not lose it. Never holds the password or any file.
 * Everything is best-effort: storage can be blocked, full or empty.
 */

const KEY = 'register_draft_v1';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export interface RegistrationDraft {
  /** Furthest pre-account step reached (1 or 2). Once the account exists the server draft takes over. */
  step?: number;
  role?: string;
  name?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  categorySlug?: string;
  subcategorySlug?: string;
  halalStatus?: string;
  referralCode?: string;
  accountType?: 'SINGLE' | 'BRAND';
  brandNameInput?: string;
  outletLabel?: string;
  billSeriesMode?: 'SHARED' | 'PER_OUTLET' | null;
  sharedPrefix?: string;
  organizationName?: string;
  civicOrgType?: string;
  acceptedTerms?: boolean;
  // Business profile step
  description?: string;
  address?: string;
  city?: string;
  tags?: string[];
  regDetails?: Record<string, unknown>;
}

export function loadDraft(): RegistrationDraft | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at?: number; data?: RegistrationDraft };
    if (!parsed?.data || !parsed.at || Date.now() - parsed.at > MAX_AGE_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

export function saveDraft(data: RegistrationDraft) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), data }));
  } catch {
    /* storage unavailable — the form still works */
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
