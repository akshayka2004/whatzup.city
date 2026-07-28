import { redirect } from 'next/navigation';

/**
 * The standalone business wizard is retired — registration, plan selection and
 * payment are one continuous flow at /register, which resumes an unfinished
 * draft on its own. This redirect keeps old links (and any bookmarked
 * ?id=... URLs) working instead of 404ing with "Business not found".
 */
export default function RegisterBusinessRedirect() {
  redirect('/register');
}
