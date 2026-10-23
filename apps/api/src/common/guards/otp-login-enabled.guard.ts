import { CanActivate, Injectable, NotFoundException } from '@nestjs/common';
import { otpLoginEnabled } from '../utils/otp-login-flag';

/** OTP login endpoints 404 while the feature is off (see otp-login-flag.ts). */
@Injectable()
export class OtpLoginEnabledGuard implements CanActivate {
  canActivate(): boolean {
    if (otpLoginEnabled()) return true;
    throw new NotFoundException('Not found');
  }
}
