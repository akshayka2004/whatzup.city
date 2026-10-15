import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { CryptoService } from './crypto.service';
import { decryptComplianceDeep } from './compliance-fields';

/**
 * PAN and GSTIN numbers are stored encrypted inside Business.compliance. Owner and
 * admin screens read them through many endpoints, so they are decrypted once here
 * on the way out. Public business reads never include `compliance` at all
 * (see toPublicBusiness), so only authenticated responses carry it.
 */
@Injectable()
export class ComplianceDecryptInterceptor implements NestInterceptor {
  constructor(private readonly crypto: CryptoService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http' || !this.crypto.enabled) return next.handle();
    return next.handle().pipe(map((body) => decryptComplianceDeep(body, this.crypto)));
  }
}
