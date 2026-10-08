import { redirect } from 'next/navigation';

// Security events are recorded in the audit log (this page used to show sample threats).
export default function SecurityPage() {
  redirect('/admin/audit');
}
