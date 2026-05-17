'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  Users,
  Tag,
  Star,
  Store,
  Image,
  Megaphone,
  FileText,
  LifeBuoy,
  Settings,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const menuItems = [
  { label: 'Dashboard', href: '/business', icon: BarChart3 },
  { label: 'Analytics', href: '/business/analytics', icon: BarChart3 },
  { label: 'Customers', href: '/business/customers', icon: Users },
  { label: 'Offers', href: '/business/offers', icon: Tag },
  { label: 'Products', href: '/business/products', icon: Store },
  { label: 'Reviews', href: '/business/reviews', icon: Star },
  { label: 'Branches', href: '/business/branches', icon: Store },
  { label: 'Media', href: '/business/media', icon: Image },
  { label: 'Campaigns', href: '/business/campaigns', icon: Megaphone },
  { label: 'Bills', href: '/business/bills', icon: FileText },
  { label: 'Support', href: '/business/support', icon: LifeBuoy },
]

const bottomItems = [
  { label: 'Settings', href: '/business/profile', icon: Settings },
  { label: 'Sign Out', href: '#', icon: LogOut, action: true },
]

export function BusinessSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 border-r border-border bg-sidebar text-sidebar-foreground flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2 border-b border-sidebar-border px-6 py-4">
        <div className="h-8 w-8 rounded-lg bg-primary"></div>
        <span className="text-lg font-semibold text-sidebar-primary">Dashboard</span>
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
