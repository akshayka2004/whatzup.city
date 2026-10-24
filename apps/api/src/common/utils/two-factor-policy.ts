import { PRIVILEGED_ROLES } from '../alerts/security-alert.service';

/** ADMIN_2FA_REQUIRED=true: platform admins/staff must enrol before using admin routes. */
export function twoFactorRequiredFor(role: string): boolean {
  return process.env.ADMIN_2FA_REQUIRED === 'true' && PRIVILEGED_ROLES.has(role);
}
