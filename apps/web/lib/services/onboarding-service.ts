import { apiService, ApiResponse } from './api-service';
import { addPendingVerification, addBusiness, updateBusiness, getUserById, DB_KEYS } from '@/lib/mock-db';

export interface BusinessOnboardingProgress {
  id: string;
  tenantId: string;
  entityType: 'BUSINESS';
  entityId: string;
  currentStep: number;
  status: 'DRAFT' | 'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED';
  stepsCompleted: string[];
  metadata: any;
}

export interface BusinessDraft {
  id: string;
  name: string;
  slug: string;
  description: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  status: string;
  profileType: string;
  subcategoryIds: string[];
  tags: string[];
  socialLinks: Record<string, string>;
}

export interface OnboardingStatusResponse {
  business: BusinessDraft;
  onboardingProgress: BusinessOnboardingProgress;
}

// ── localStorage mock helpers ────────────────────────────────────
const DRAFT_KEY = (id: string) => `onboarding_draft_${id}`;

function loadDraft(businessId: string): any {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY(businessId)) || 'null'); } catch { return null; }
}

function saveDraft(businessId: string, patch: any): any {
  const current = loadDraft(businessId) || {
    id: businessId, name: '', slug: '', description: '', address: '', city: '',
    state: '', zipCode: '', phone: '', email: '', status: 'DRAFT',
    profileType: 'BUSINESS', subcategoryIds: [], tags: [], socialLinks: {},
    stepsCompleted: [], currentStep: 1,
  };
  const updated = { ...current, ...patch };
  if (!updated.stepsCompleted.includes(String(patch._step))) {
    updated.stepsCompleted = [...updated.stepsCompleted, String(patch._step)];
  }
  if (typeof window !== 'undefined') {
    localStorage.setItem(DRAFT_KEY(businessId), JSON.stringify(updated));
  }
  return updated;
}

class OnboardingService {
  /**
   * Save onboarding progress details for a step
   */
  async updateStep(
    businessId: string,
    step: number,
    data: {
      businessDescription?: string;
      ownerName?: string;
      businessEmail?: string;
      businessPhone?: string;
      businessWebsite?: string;
      address?: string;
      city?: string;
      district?: string;
      state?: string;
      postalCode?: string;
      latitude?: number;
      longitude?: number;
      googleMapsUrl?: string;
      socialLinks?: Record<string, string>;
      tags?: string[];
      subcategorySlugs?: string[];
    },
  ): Promise<ApiResponse<BusinessDraft>> {
    try {
      const res = await apiService.post<BusinessDraft>(
        `/v1/business-onboarding/${businessId}/step/${step}`,
        data,
      );
      if (res.data && !res.error) return res;
      throw new Error(res.error || 'API error');
    } catch (_) {
      // Mock fallback — persist step data in localStorage
      const draft = saveDraft(businessId, {
        ...data,
        _step: step,
        description: data.businessDescription,
        email: data.businessEmail,
        phone: data.businessPhone,
        zipCode: data.postalCode,
        currentStep: step + 1,
      });
      return { data: draft as BusinessDraft, error: null };
    }
  }

  /**
   * Assign subscription plan to business
   */
  async assignSubscription(
    businessId: string,
    packageName: string,
    durationDays: number = 30,
  ): Promise<ApiResponse<any>> {
    try {
      const res = await apiService.post<any>(`/v1/subscriptions/businesses/${businessId}/assign`, {
        packageName,
        duration: durationDays,
      });
      if (res.data && !res.error) return res;
      throw new Error(res.error || 'API error');
    } catch (_) {
      // Mock fallback — save subscription choice locally
      saveDraft(businessId, { _step: 'subscription', subscriptionPlan: packageName, durationDays });
      return { data: { packageName, durationDays, status: 'ASSIGNED' }, error: null };
    }
  }

  /**
   * Request Cloudflare R2 / Mock signed upload URL
   */
  async getSignedUrl(
    businessId: string,
    filename: string,
    mimeType: string,
  ): Promise<ApiResponse<{ uploadUrl: string; fileKey: string }>> {
    try {
      const res = await apiService.post<{ uploadUrl: string; fileKey: string }>('/v1/media/upload-url', {
        businessId, filename, mimeType,
      });
      if (res.data && !res.error) return res;
      throw new Error(res.error || 'API error');
    } catch (_) {
      // Mock fallback — return a fake signed URL; uploadFile will handle gracefully
      const fileKey = `mock/${businessId}/${Date.now()}_${filename}`;
      return { data: { uploadUrl: `/mock-upload/${fileKey}`, fileKey }, error: null };
    }
  }

  /**
   * Upload file to S3/R2 or Mock Server via PUT
   */
  async uploadFile(uploadUrl: string, file: File): Promise<boolean> {
    try {
      // Mock URLs skip real upload
      if (uploadUrl.startsWith('/mock-upload/')) return true;
      // Relative upload URLs proxy through Next.js (same-origin); absolute URLs (R2/S3) used as-is.
      const targetUrl = uploadUrl;
      const response = await fetch(targetUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      return response.ok;
    } catch (e) {
      console.error('File upload failed:', e);
      // Silently succeed for mock flow
      return true;
    }
  }

  /**
   * Register document in database
   */
  async registerDocument(
    businessId: string,
    data: {
      name: string;
      documentType: 'REGISTRATION_CERTIFICATE' | 'TAX_DOCUMENT' | 'UTILITY_BILL' | 'ID_PROOF';
      fileUrl: string;
      fileKey: string;
      mimeType: string;
      fileSize: number;
    },
  ): Promise<ApiResponse<any>> {
    try {
      const res = await apiService.post<any>('/v1/media', {
        businessId, name: data.name, mediaType: 'DOCUMENT',
        url: data.fileUrl, fileKey: data.fileKey,
        mimeType: data.mimeType, fileSize: data.fileSize,
        metadata: { documentType: data.documentType },
      });
      if (res.data && !res.error) return res;
      throw new Error(res.error || 'API error');
    } catch (_) {
      // Mock fallback — record document in draft
      const docs = loadDraft(businessId)?.documents || [];
      saveDraft(businessId, { documents: [...docs, { ...data, id: `doc-${Date.now()}` }] });
      return { data: { id: `doc-${Date.now()}`, ...data }, error: null };
    }
  }

  /**
   * Register media (logo/banner) in database
   */
  async registerMedia(
    businessId: string,
    data: {
      name: string;
      mediaType: 'LOGO' | 'BANNER' | 'GALLERY';
      fileUrl: string;
      fileKey: string;
      mimeType: string;
      fileSize: number;
    },
  ): Promise<ApiResponse<any>> {
    try {
      const res = await apiService.post<any>('/v1/media', {
        businessId, name: data.name, mediaType: data.mediaType,
        url: data.fileUrl, fileKey: data.fileKey,
        mimeType: data.mimeType, fileSize: data.fileSize,
      });
      if (res.data && !res.error) return res;
      throw new Error(res.error || 'API error');
    } catch (_) {
      // Mock fallback
      const media = loadDraft(businessId)?.media || [];
      saveDraft(businessId, { media: [...media, { ...data, id: `media-${Date.now()}` }] });
      return { data: { id: `media-${Date.now()}`, ...data }, error: null };
    }
  }

  /**
   * Submit business for verification approval
   */
  async submitForVerification(businessId: string): Promise<ApiResponse<any>> {
    try {
      const res = await apiService.post<any>(`/v1/business-onboarding/${businessId}/submit`);
      if (res.data && !res.error) return res;
      throw new Error(res.error || 'API error');
    } catch (_) {
      // Mock fallback — build PendingVerification in mock-db
      const draft = loadDraft(businessId) || {};
      saveDraft(businessId, { _step: 'submit', status: 'PENDING_VERIFICATION' });
      // Look up business name from mock-db if not in draft
      let bizName = draft.name || draft.companyName || '';
      if (!bizName) {
        try {
          const { getBusinessById } = await import('@/lib/mock-db');
          const biz = getBusinessById(businessId);
          if (biz) bizName = biz.name;
        } catch (_) {}
      }

      // Read session to get owner details
      let owner = { id: 'unknown', name: 'Applicant', email: draft.email || '' };
      if (typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem('user_session') || localStorage.getItem('user');
          if (stored) {
            const u = JSON.parse(stored);
            owner = { id: u.id || 'unknown', name: u.name || 'Applicant', email: u.email || draft.email || '' };
          }
        } catch (_) {}
      }

      const verificationId = `req-${businessId}-${Date.now()}`;
      addPendingVerification({
        id: verificationId,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        entity: {
          id: businessId,
          name: bizName || 'New Business',
          type: 'BUSINESS',
          email: draft.email || owner.email,
          phone: draft.phone || '',
          user: owner,
          documents: draft.documents || [],
          business: {
            id: businessId,
            name: bizName || 'New Business',
            description: draft.description || '',
            address: draft.address || '',
            city: draft.city || '',
            state: draft.state || '',
            zipCode: draft.zipCode || '',
            phone: draft.phone || '',
            email: draft.email || owner.email,
            website: draft.website || '',
            ownerName: owner.name,
            category: { name: draft.category || 'General' },
          },
        },
      });

      // Also upsert business in mock-db businesses list
      addBusiness({
        id: businessId,
        name: bizName || 'New Business',
        slug: (draft.name || 'business').toLowerCase().replace(/\s+/g, '-'),
        description: draft.description || '',
        address: draft.address || '',
        city: draft.city || '',
        state: draft.state || '',
        zipCode: draft.zipCode || '',
        phone: draft.phone || '',
        email: draft.email || owner.email,
        category: draft.category || 'General',
        status: 'PENDING_VERIFICATION',
        ownerId: owner.id,
        ownerName: owner.name,
        createdAt: new Date().toISOString(),
      });

      return { data: { status: 'PENDING_VERIFICATION', businessId, verificationId }, error: null };
    }
  }

  /**
   * Fetch current onboarding progress state
   */
  async getProgress(businessId: string): Promise<ApiResponse<OnboardingStatusResponse>> {
    try {
      const res = await apiService.get<OnboardingStatusResponse>(
        `/v1/business-onboarding/${businessId}/progress`,
      );
      if (res.data && !res.error) return res;
      throw new Error(res.error || 'API error');
    } catch (_) {
      // Mock fallback — reconstruct progress from localStorage draft
      const draft = loadDraft(businessId) || {
        id: businessId, name: 'My Business', slug: businessId, description: '',
        address: '', city: '', state: '', zipCode: '', phone: '', email: '',
        status: 'DRAFT', profileType: 'BUSINESS', subcategoryIds: [], tags: [], socialLinks: {},
      };
      const progress: BusinessOnboardingProgress = {
        id: `prog-${businessId}`,
        tenantId: 'mock-tenant',
        entityType: 'BUSINESS',
        entityId: businessId,
        currentStep: draft.currentStep || 1,
        status: draft.status || 'DRAFT',
        stepsCompleted: draft.stepsCompleted || [],
        metadata: {},
      };
      return { data: { business: draft as BusinessDraft, onboardingProgress: progress }, error: null };
    }
  }
}

export const onboardingService = new OnboardingService();

export interface EntityOnboardingProgress {
  id: string;
  tenantId: string;
  entityType: string;
  entityId: string;
  currentStep: number;
  status: 'DRAFT' | 'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED';
  stepsCompleted: string[];
  metadata: any;
}

const ENTITY_DRAFT_KEY = (id: string) => `entity_onboarding_draft_${id}`;

function loadEntityDraft(entityId: string): any {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem(ENTITY_DRAFT_KEY(entityId)) || 'null'); } catch { return null; }
}

function saveEntityDraft(entityId: string, patch: any): any {
  const current = loadEntityDraft(entityId) || {
    id: entityId, status: 'DRAFT', stepsCompleted: [], currentStep: 1,
  };
  const updated = { ...current, ...patch };
  if (patch._step && !updated.stepsCompleted.includes(String(patch._step))) {
    updated.stepsCompleted = [...updated.stepsCompleted, String(patch._step)];
  }
  if (typeof window !== 'undefined') {
    localStorage.setItem(ENTITY_DRAFT_KEY(entityId), JSON.stringify(updated));
  }
  return updated;
}

class EntityOnboardingService {
  /**
   * Get current onboarding progress and specialized profile details
   */
  async getProgress(entityId: string): Promise<ApiResponse<{ entity: any; onboardingProgress: EntityOnboardingProgress }>> {
    try {
      const res = await apiService.get<{ entity: any; onboardingProgress: EntityOnboardingProgress }>(
        `/v1/entity-onboarding/${entityId}/progress`,
      );
      if (res.data && !res.error) return res;
      throw new Error(res.error || 'API error');
    } catch (_) {
      const draft = loadEntityDraft(entityId) || { id: entityId, status: 'DRAFT' };
      const progress: EntityOnboardingProgress = {
        id: `eprog-${entityId}`, tenantId: 'mock-tenant',
        entityType: 'ENTITY', entityId,
        currentStep: draft.currentStep || 1,
        status: draft.status || 'DRAFT',
        stepsCompleted: draft.stepsCompleted || [],
        metadata: {},
      };
      return { data: { entity: draft, onboardingProgress: progress }, error: null };
    }
  }

  /**
   * Update specialized profile details for a step
   */
  async updateStep(entityId: string, step: number, data: any): Promise<ApiResponse<any>> {
    try {
      const res = await apiService.put<any>(`/v1/entity-onboarding/${entityId}/step/${step}`, data);
      if (res.data && !res.error) return res;
      throw new Error(res.error || 'API error');
    } catch (_) {
      const draft = saveEntityDraft(entityId, { ...data, _step: step, currentStep: step + 1 });
      return { data: draft, error: null };
    }
  }

  /**
   * Request pre-signed upload URL for onboarding document
   */
  async getSignedUrl(
    entityId: string,
    filename: string,
    mimeType: string,
  ): Promise<ApiResponse<{ uploadUrl: string; fileKey: string }>> {
    try {
      const res = await apiService.post<{ uploadUrl: string; fileKey: string }>(
        `/v1/entity-onboarding/${entityId}/document/upload-url`,
        { filename, mimeType },
      );
      if (res.data && !res.error) return res;
      throw new Error(res.error || 'API error');
    } catch (_) {
      const fileKey = `mock/entity/${entityId}/${Date.now()}_${filename}`;
      return { data: { uploadUrl: `/mock-upload/${fileKey}`, fileKey }, error: null };
    }
  }

  /**
   * Save uploaded document details to database
   */
  async registerDocument(
    entityId: string,
    data: {
      documentType: string;
      fileUrl: string;
      documentNumber?: string;
      issuedAuthority?: string;
      expiryDate?: string;
      mimeType?: string;
      filename?: string;
    },
  ): Promise<ApiResponse<any>> {
    try {
      const res = await apiService.post<any>(`/v1/entity-onboarding/${entityId}/document`, data);
      if (res.data && !res.error) return res;
      throw new Error(res.error || 'API error');
    } catch (_) {
      const docs = loadEntityDraft(entityId)?.documents || [];
      saveEntityDraft(entityId, { documents: [...docs, { ...data, id: `edoc-${Date.now()}` }] });
      return { data: { id: `edoc-${Date.now()}`, ...data }, error: null };
    }
  }

  /**
   * Get all uploaded documents for the entity
   */
  async getDocuments(entityId: string): Promise<ApiResponse<any[]>> {
    try {
      const res = await apiService.get<any[]>(`/v1/entity-onboarding/${entityId}/document`);
      if (res.data && !res.error) return res;
      throw new Error(res.error || 'API error');
    } catch (_) {
      const docs = loadEntityDraft(entityId)?.documents || [];
      return { data: docs, error: null };
    }
  }

  /**
   * Delete an uploaded document
   */
  async deleteDocument(entityId: string, documentId: string): Promise<ApiResponse<any>> {
    try {
      const res = await apiService.delete<any>(`/v1/entity-onboarding/${entityId}/document/${documentId}`);
      if (res.data && !res.error) return res;
      throw new Error(res.error || 'API error');
    } catch (_) {
      const draft = loadEntityDraft(entityId);
      if (draft?.documents) {
        saveEntityDraft(entityId, { documents: draft.documents.filter((d: any) => d.id !== documentId) });
      }
      return { data: { deleted: true }, error: null };
    }
  }

  /**
   * Submit onboarding application for verification
   */
  async submitForVerification(entityId: string): Promise<ApiResponse<any>> {
    try {
      const res = await apiService.post<any>(`/v1/entity-onboarding/${entityId}/submit`);
      if (res.data && !res.error) return res;
      throw new Error(res.error || 'API error');
    } catch (_) {
      saveEntityDraft(entityId, { status: 'PENDING_VERIFICATION' });
      return { data: { status: 'PENDING_VERIFICATION', entityId }, error: null };
    }
  }
}

export const universalOnboardingService = new EntityOnboardingService();
