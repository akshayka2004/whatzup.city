import { redirect } from 'next/navigation';

// Live service status lives on the System health page (this page used to show sample nodes).
export default function InfrastructurePage() {
  redirect('/super-admin/health');
}
