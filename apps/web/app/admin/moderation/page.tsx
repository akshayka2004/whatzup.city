import { redirect } from 'next/navigation';

// The old moderation screen showed sample data. Content reports are handled on /admin/reports.
export default function ModerationPage() {
  redirect('/admin/reports');
}
