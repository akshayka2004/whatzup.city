'use client';

import { ReactNode, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { canOpenPath, isPlatformStaff } from '@/lib/access';
import { AppShell, AppShellSkeleton } from './app-shell';
import { NoAccess } from './no-access';

export function AdminLayout({ children }: { children: ReactNode }) {
  // MASTER_ADMIN and SUPER_ADMIN use the admin panel. Platform staff may open the pages they
  // were granted (and no others), inside their own menu.
  const { user, loading } = useRequireAuth([
    'admin',
    'super-admin',
    'MASTER_ADMIN',
    'SUPER_ADMIN',
    'PLATFORM_STAFF',
  ]);
  const pathname = usePathname();
  const router = useRouter();
  const staff = isPlatformStaff(user);

  // Staff have no dashboard here; their overview lives under /staff.
  useEffect(() => {
    if (staff && pathname === '/admin') router.replace('/staff');
  }, [staff, pathname, router]);

  if (loading || !user) return <AppShellSkeleton />;
  return (
    <AppShell area={staff ? 'staff' : 'admin'} wide>
      {canOpenPath(user, pathname) ? children : <NoAccess home={staff ? '/staff' : '/admin'} />}
    </AppShell>
  );
}
