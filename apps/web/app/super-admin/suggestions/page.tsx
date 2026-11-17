import { redirect } from 'next/navigation';

// One implementation per screen: /admin/suggestions serves admins and super admins.
export default function Page() {
  redirect('/admin/suggestions');
}
