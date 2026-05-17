'use client'

import { SuperAdminLayout } from '@/components/layouts/super-admin-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Building2, Users, BarChart3 } from 'lucide-react'

const tenants = [
  {
    id: 1,
    name: 'Tenant A',
    plan: 'Premium',
    users: 450,
    status: 'Active',
    signupDate: '2024-01-15',
  },
  {
    id: 2,
    name: 'Tenant B',
    plan: 'Standard',
    users: 120,
    status: 'Active',
    signupDate: '2024-02-20',
  },
  {
    id: 3,
    name: 'Tenant C',
    plan: 'Trial',
    users: 45,
    status: 'Active',
    signupDate: '2024-04-10',
  },
]

export default function TenantsPage() {
  return (
    <SuperAdminLayout>
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Tenants</h1>
        <p className="text-muted-foreground mb-8">Manage platform tenants</p>

        <div className="space-y-4">
          {tenants.map((tenant) => (
            <Card key={tenant.id} className="p-6 rounded-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="rounded-lg bg-secondary p-3">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{tenant.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span>Plan: {tenant.plan}</span>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {tenant.users} users
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-700">
                    {tenant.status}
                  </span>
                  <p className="text-xs text-muted-foreground mt-2">{tenant.signupDate}</p>
                  <Button variant="outline" className="w-full rounded-lg mt-3" size="sm">
                    Manage
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </SuperAdminLayout>
  )
}
