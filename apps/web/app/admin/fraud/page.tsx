import { redirect } from 'next/navigation';

// The old fraud screen showed sample data. Fraud work happens in the bill escalation queue.
export default function FraudPage() {
  redirect('/admin/bills');
}
