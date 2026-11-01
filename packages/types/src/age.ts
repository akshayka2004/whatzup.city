/** Youngest age at which someone may create an account. */
export const MIN_SIGNUP_AGE = 13;

/** Today's date in India as YYYY-MM-DD, whatever the server's own time zone is. */
function todayIst(now: Date): string {
  return now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

/**
 * Whole years between a date of birth ("YYYY-MM-DD") and today. Null when the text is not a real
 * calendar date (so 2010-02-31 is rejected rather than rolled into March).
 */
export function ageOn(dob: string, now: Date = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob ?? '');
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const probe = new Date(Date.UTC(y, mo - 1, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== mo - 1 || probe.getUTCDate() !== d) {
    return null;
  }
  const [ty, tm, td] = todayIst(now).split('-').map(Number);
  let age = ty - y;
  if (tm < mo || (tm === mo && td < d)) age -= 1;
  return age;
}

/**
 * Why a date of birth cannot be used to sign up, in words for the person, or null when it is fine.
 * The same check runs in the form and on the server, so they can never disagree.
 */
export function dobProblem(dob: string | null | undefined, now: Date = new Date()): string | null {
  if (!dob) return 'Enter your date of birth.';
  const age = ageOn(dob, now);
  if (age === null) return 'Enter a real date of birth.';
  if (age < 0) return 'Your date of birth cannot be in the future.';
  if (age > 120) return 'Check your date of birth. That year does not look right.';
  if (age < MIN_SIGNUP_AGE) {
    return `You need to be at least ${MIN_SIGNUP_AGE} years old to create an account.`;
  }
  return null;
}
