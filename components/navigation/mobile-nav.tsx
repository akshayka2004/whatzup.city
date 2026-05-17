'use client'

import { Home, Search, Plus, Heart, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

const navItems = [
  { icon: Home, label: 'Home', href: '/' },
  { icon: Search, label: 'Search', href: '/search' },
  { icon: Plus, label: 'Create', href: '#' },
  { icon: Heart, label: 'Saved', href: '/favorites' },
  { icon: Menu, label: 'Menu', href: '#' },
]

export function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-card px-4 py-2 flex items-center justify-around">
      {navItems.map((item) => {
        const Icon = item.icon
        return (
          <Link key={item.label} href={item.href}>
            <Button variant="ghost" size="sm" className="flex flex-col gap-1 rounded-lg" >
              <Icon className="h-6 w-6" />
              <span className="text-xs">{item.label}</span>
            </Button>
          </Link>
        )
      })}
    </nav>
  )
}
