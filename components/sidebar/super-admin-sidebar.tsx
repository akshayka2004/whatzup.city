'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Users,
  Lock,
  Activity,
  Settings,
  Flag,
  Database,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const menuItems = [
  { label: 'Tenants', href: '/super-admin', icon: Users },
  { label: 'Security', href: '/super-admin/security', icon: Lock },
  { label: 'System Health', href: '/super-admin/health', icon: Activity },
  { label: 'Roles', href: '/super-admin/roles', icon: Settings },
  { label: 'Feature Flags', href: '/super-admin/flags', icon: Flag },
  { label: 'Infrastructure', href: '/super-admin/infrastructure', icon: Database },
]

const bottomItems = [
  { label: 'Settings', href: '/super-admin/settings', icon: Settings },
  { label: 'Sign Out', href: '#', icon: LogOut, action: true },
]

export function SuperAdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 border-r border-border bg-sidebar text-sidebar-foreground flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2 border-b border-sidebar-border px-6 py-4">
        <div className="h-8 w-8 rounded-lg bg-primary"></div>
        <span className="text-lg font-semibold text-sidebar-primary">Super Admin</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive ? 'default' : 'ghost'}
                className={cn(
                  'w-full justify-start gap-3 rounded-xl',
                  isActive && 'bg-sidebar-primary text-sidebar-primary-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Button>
            </Link>
          )
        })}
      </nav>

      {/* Bottom items */}
      <div className="border-t border-sidebar-border space-y-2 px-4 py-4">
        {bottomItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link key={item.label} href={item.href}>
              <Button
                variant={isActive ? 'default' : 'ghost'}
                className={cn(
                  'w-full justify-start gap-3 rounded-xl',
                  isActive && 'bg-sidebar-primary text-sidebar-primary-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Button>
            </Link>
          )
        })}
      </div>
    </aside>
  )
}
