import { redirect } from 'next/navigation';

// The old admin settings form had no backend. Personal settings live on the profile page.
export default function AdminSettingsPage() {
  redirect('/admin/profile');
}
