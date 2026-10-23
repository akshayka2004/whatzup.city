import { CanActivate, Injectable, NotFoundException } from '@nestjs/common';
import { paymentsEnabled } from '../utils/payments-flag';

/** Payment, plan and billing endpoints 404 while payments are dormant (see payments-flag.ts). */
@Injectable()
export class PaymentsEnabledGuard implements CanActivate {
  canActivate(): boolean {
    if (paymentsEnabled()) return true;
    throw new NotFoundException('Not found');
  }
}
