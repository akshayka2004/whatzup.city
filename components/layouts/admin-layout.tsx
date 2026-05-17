'use client'

import { ReactNode } from 'react'
import { AdminSidebar } from '../sidebar/admin-sidebar'
import { Header } from '../common/header'
import { MobileNav } from '../navigation/mobile-nav'
import { useIsMobile } from '@/hooks/use-mobile'

interface AdminLayoutProps {
  children: ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const isMobile = useIsMobile()

  return (
    <div className="flex h-screen w-full bg-background">
      {/* Sidebar - Hidden on mobile */}
      {!isMobile && <AdminSidebar />}
      
      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        
        {/* Content */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 py-6">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile navigation - Visible only on mobile */}
      {isMobile && <MobileNav />}
    </div>
  )
}
