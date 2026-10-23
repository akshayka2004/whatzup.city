/**
 * Phone OTP login is dormant until an SMS provider is configured. Set OTP_LOGIN_ENABLED=true
 * (and NEXT_PUBLIC_OTP_LOGIN_ENABLED=true at web build time) to turn it on.
 */
export const otpLoginEnabled = () => process.env.OTP_LOGIN_ENABLED === 'true';
