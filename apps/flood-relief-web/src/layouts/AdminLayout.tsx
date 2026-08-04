import { useState } from "react";
import { Outlet, Navigate } from "react-router-dom";
import { Menu, LogOut } from "lucide-react";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Spinner } from "@/components/ui/States";
import { useAuth } from "@/hooks/useAuth";

export function AdminLayout() {
  const { user, isLoading, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface">
        <Spinner label="Checking your session..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="flex min-h-dvh bg-surface">
      <aside className="hidden lg:block">
        <AdminSidebar />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-primary-950/60" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <div className="relative">
            <AdminSidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between gap-4 border-b border-border-subtle bg-white px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="cursor-pointer rounded-lg p-2 text-primary-600 hover:bg-primary-50 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
          <div className="ml-auto flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-semibold text-primary-900">{user.name}</p>
              <p className="text-xs text-primary-500">{user.email}</p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-primary-200 px-3 py-2 text-sm font-semibold text-primary-700 transition-[transform,background-color] duration-150 hover:bg-primary-50 active:scale-[0.97]"
            >
              <LogOut className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
