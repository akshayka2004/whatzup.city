import { apiService, ApiResponse } from './api-service';

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
  ownerName?: string;
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

// ─────────────────────────────────────────────────────────────────────
// Business Onboarding — all calls hit real API, no mock fallback.
// Errors propagate to caller for UI display.
// ─────────────────────────────────────────────────────────────────────

class OnboardingService {
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
    return apiService.put<BusinessDraft>(
      `/v1/business-onboarding/${businessId}/step/${step}`,
      data,
    );
  }

  async assignSubscription(
    businessId: string,
    packageName: string,
    durationDays: number = 30,
  ): Promise<ApiResponse<any>> {
    return apiService.post<any>(`/v1/subscriptions/businesses/${businessId}/assign`, {
      packageName,
      duration: durationDays,
    });
  }

  async getSignedUrl(
    businessId: string,
    filename: string,
    mimeType: string,
    category: string = 'gallery',
  ): Promise<ApiResponse<{ uploadUrl: string; fileKey: string }>> {
    return apiService.post<{ uploadUrl: string; fileKey: string }>(
      '/v1/storage/upload-url',
      { entityId: businessId, filename, mimeType, category },
    );
  }

  async getBusinessDocumentUploadUrl(
    businessId: string,
    data: {
      documentType: string;
      filename: string;
      mimeType: string;
      documentNumber?: string;
      issuedAuthority?: string;
      expiryDate?: string;
    },
  ): Promise<ApiResponse<{ uploadUrl: string; fileKey: string; documentId: string }>> {
    return apiService.post<{ uploadUrl: string; fileKey: string; documentId: string }>(
      `/v1/businesses/${businessId}/documents`,
      data,
    );
  }

  /**
   * Server-side document upload — sends the raw file to the API which stores it
   * in the verification-documents bucket and records a BusinessDocument. This
   * is the reliable path (no browser→Supabase signed-URL PUT, no bucket guess).
   */
  async uploadBusinessDocument(
    businessId: string,
    file: File,
    documentType: string = 'REGISTRATION_CERTIFICATE',
    extra?: { documentNumber?: string; issuedAuthority?: string },
  ): Promise<ApiResponse<{ documentId: string; bucket: string; path: string; status: string }>> {
    const form = new FormData();
    form.append('file', file);
    form.append('documentType', documentType);
    if (extra?.documentNumber) form.append('documentNumber', extra.documentNumber);
    if (extra?.issuedAuthority) form.append('issuedAuthority', extra.issuedAuthority);
    return apiService.upload(`/v1/businesses/${businessId}/documents/upload`, form);
  }

  async uploadFile(uploadUrl: string, file: File): Promise<boolean> {
    try {
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      return response.ok;
    } catch (e) {
      console.error('File upload failed:', e);
      return false;
    }
  }

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
    return apiService.post<any>('/v1/media', {
      businessId,
      name: data.name,
      mediaType: 'DOCUMENT',
      url: data.fileUrl,
      fileKey: data.fileKey,
      mimeType: data.mimeType,
      fileSize: data.fileSize,
      metadata: { documentType: data.documentType },
    });
  }

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
    return apiService.post<any>('/v1/media', {
      businessId,
      name: data.name,
      mediaType: data.mediaType,
      url: data.fileUrl,
      fileKey: data.fileKey,
      mimeType: data.mimeType,
      fileSize: data.fileSize,
    });
  }

  /**
   * Submit business for admin verification.
   * MUST hit real API — failure here means business won't appear in admin queue.
   */
  async submitForVerification(businessId: string): Promise<ApiResponse<any>> {
    return apiService.post<any>(`/v1/business-onboarding/${businessId}/submit`);
  }

  async getProgress(businessId: string): Promise<ApiResponse<OnboardingStatusResponse>> {
    return apiService.get<OnboardingStatusResponse>(
      `/v1/business-onboarding/${businessId}/progress`,
    );
  }
}

export const onboardingService = new OnboardingService();

// ─────────────────────────────────────────────────────────────────────
// Universal Entity Onboarding (Government, Influencer, etc.)
// ─────────────────────────────────────────────────────────────────────

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

class EntityOnboardingService {
  async getProgress(
    entityId: string,
  ): Promise<ApiResponse<{ entity: any; onboardingProgress: EntityOnboardingProgress }>> {
    return apiService.get(`/v1/entity-onboarding/${entityId}/progress`);
  }

  async updateStep(entityId: string, step: number, data: any): Promise<ApiResponse<any>> {
    return apiService.put<any>(`/v1/entity-onboarding/${entityId}/step/${step}`, data);
  }

  async getSignedUrl(
    entityId: string,
    filename: string,
    mimeType: string,
  ): Promise<ApiResponse<{ uploadUrl: string; fileKey: string }>> {
    return apiService.post<{ uploadUrl: string; fileKey: string }>(
      `/v1/entity-onboarding/${entityId}/document/upload-url`,
      { filename, mimeType },
    );
  }

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
    return apiService.post<any>(`/v1/entity-onboarding/${entityId}/document`, data);
  }

  async getDocuments(entityId: string): Promise<ApiResponse<any[]>> {
    return apiService.get<any[]>(`/v1/entity-onboarding/${entityId}/document`);
  }

  async deleteDocument(entityId: string, documentId: string): Promise<ApiResponse<any>> {
    return apiService.delete<any>(`/v1/entity-onboarding/${entityId}/document/${documentId}`);
  }

  async submitForVerification(entityId: string): Promise<ApiResponse<any>> {
    return apiService.post<any>(`/v1/entity-onboarding/${entityId}/submit`);
  }
}

export const universalOnboardingService = new EntityOnboardingService();
