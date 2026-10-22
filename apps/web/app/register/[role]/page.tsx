import { redirect } from 'next/navigation';

/**
 * Old per-role onboarding URL (/register/business, /register/user, ...). Every role
 * now signs up through the single wizard at /register, so old bookmarks land there
 * instead of on a second, unmaintained sign-up flow.
 */
export default function LegacyRoleRegister() {
  redirect('/register');
}
