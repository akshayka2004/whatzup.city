import { SetMetadata } from '@nestjs/common';

export interface AuditOptions {
  action?: string;
  resource?: string;
}

export const AUDIT_METADATA_KEY = 'audit_metadata';

/**
 * Decorator to attach audit logging metadata to controller methods.
 */
export const Audit = (options: AuditOptions) => SetMetadata(AUDIT_METADATA_KEY, options);
