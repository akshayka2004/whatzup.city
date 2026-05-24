'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './use-auth';

/**
 * Layout-level auth guard.
 * - While auth is still loading: caller should render a spinner.
 * - When loaded & no user: redirect to /login (preserving return URL).
 * - When loaded & wrong role: redirect to '/' (lets the home page pick the
 *   right destination via its own logic).
 *
 * Returns { user, loading } so the caller can render its own loading state
 * and skip rendering protected content until user is established.
 */
export function useRequireAuth(allowedRoles?: string[]) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return; // wait for auth to settle

    if (!user) {
      const from = typeof window !== 'undefined' ? window.location.pathname : '/';
      router.replace(`/login?from=${encodeURIComponent(from)}`);
      return;
    }

    const normalizedUserRole = 
      user.role === 'MASTER_ADMIN' || user.role === 'admin' ? 'admin' :
      user.role === 'SUPER_ADMIN' || user.role === 'super-admin' ? 'super-admin' :
      user.role === 'GOVERNMENT_ADMIN' || user.role === 'government' ? 'government' :
      user.role.toLowerCase();

    const normalizedAllowedRoles = allowedRoles?.map(role => 
      role === 'MASTER_ADMIN' || role === 'admin' ? 'admin' :
      role === 'SUPER_ADMIN' || role === 'super-admin' ? 'super-admin' :
      role === 'GOVERNMENT_ADMIN' || role === 'government' ? 'government' :
      role.toLowerCase()
    );

    if (normalizedAllowedRoles && normalizedAllowedRoles.length > 0 && !normalizedAllowedRoles.includes(normalizedUserRole)) {
      router.replace('/');
    }
  }, [user, loading, allowedRoles, router]);

  return { user, loading };
}
