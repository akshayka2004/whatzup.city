'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useOwnerBusiness } from '@/hooks/use-owner-business';
import { getNav, type NavArea, type NavSpec } from '@/lib/nav/config';

const isSuperAdminUser = (u: { role?: string; rbacRole?: string } | null) =>
  !!u && (u.role === 'super-admin' || u.rbacRole === 'SUPER_ADMIN');

/**
 * Which navigation a screen shows. The layout passes its area; a super-admin
 * following an /admin/* link keeps the super-admin menu (the viewer's role, not
 * the URL prefix, decides their nav).
 */
export function useNavArea(layoutArea?: NavArea): NavArea {
  const pathname = usePathname();
  const { user } = useAuth();
  if (layoutArea === 'admin' && isSuperAdminUser(user)) return 'super-admin';
  if (layoutArea) return layoutArea;
  if (pathname.startsWith('/dashboard')) return 'business';
  if (pathname.startsWith('/staff')) return 'staff';
  if (pathname.startsWith('/super-admin')) return 'super-admin';
  if (pathname.startsWith('/admin')) return isSuperAdminUser(user) ? 'super-admin' : 'admin';
  return 'public';
}

export function useNavSpec(area: NavArea): NavSpec {
  const { user } = useAuth();
  const moderator = user?.rbacRole === 'BUSINESS_MODERATOR';
  const { business, isFood, brandId } = useOwnerBusiness(area === 'business' && !moderator);

  return useMemo(
    () =>
      getNav(area, {
        signedIn: !!user,
        moderator,
        isFood,
        isBrand: !!brandId,
        businessName: business?.brand?.name || business?.name,
      }),
    [area, user, moderator, isFood, brandId, business?.name, business?.brand?.name],
  );
}
