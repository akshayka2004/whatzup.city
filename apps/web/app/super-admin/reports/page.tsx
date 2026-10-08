import { redirect } from 'next/navigation';

// One implementation per screen: /admin/reports serves admins and super admins.
export default function Page() {
  redirect('/admin/reports');
}
