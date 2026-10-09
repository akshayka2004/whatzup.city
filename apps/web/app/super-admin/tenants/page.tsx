import { redirect } from 'next/navigation';

// Every business is its own tenant, so the tenant list was the business list with
// unsaved suspend/plan toggles. The real controls live on /super-admin/businesses.
export default function Page() {
  redirect('/super-admin/businesses');
}
