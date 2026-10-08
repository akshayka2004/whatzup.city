import { redirect } from 'next/navigation';

// One implementation per screen: /admin/audit serves admins and super admins.
export default function Page() {
  redirect('/admin/audit');
}
