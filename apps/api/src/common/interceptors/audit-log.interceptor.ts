// ============================================================
// Audit Log Interceptor — Automatic action logging
// ============================================================

import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { DatabaseService } from '../database/database.service';
import { AUDIT_METADATA_KEY, AuditOptions } from '../decorators/audit.decorator';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, ip, headers } = request;
    const startTime = Date.now();

    const auditMeta = this.reflector.getAllAndOverride<AuditOptions>(AUDIT_METADATA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    return next.handle().pipe(
      tap({
        next: async () => {
          // Only audit mutating operations or routes explicitly decorated with @Audit
          if ((['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) || auditMeta) && user) {
            try {
              const action = auditMeta?.action || this.methodToAction(method);
              const resource = auditMeta?.resource || this.extractResource(url);
              const resourceId = this.extractResourceId(url);

              await this.db.auditLog.create({
                data: {
                  tenantId: user.tenantId,
                  userId: user.id,
                  action,
                  resource,
                  resourceId: resourceId || undefined,
                  metadata: {
                    method,
                    url,
                    duration: Date.now() - startTime,
                  },
                  ipAddress: ip,
                  userAgent: headers['user-agent'],
                },
              });
            } catch (error) {
              this.logger.error('Failed to create audit log', error);
            }
          }
        },
      }),
    );
  }

  private methodToAction(method: string): string {
    const map: Record<string, string> = {
      POST: 'CREATE',
      PUT: 'UPDATE',
      PATCH: 'UPDATE',
      DELETE: 'DELETE',
    };
    return map[method] || 'UNKNOWN';
  }

  private extractResource(url: string): string {
    const parts = url.split('/').filter(Boolean);
    // e.g., /api/v1/businesses/123 → "businesses"
    return parts[2] || 'unknown';
  }

  private extractResourceId(url: string): string | null {
    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const match = url.match(uuidRegex);
    return match ? match[0] : null;
  }
}
