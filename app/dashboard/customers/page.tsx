'use client'

import { BusinessLayout } from '@/components/layouts/business-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, MoreVertical } from 'lucide-react'

const customers = [
  { id: 1, name: 'John Doe', email: 'john@example.com', purchases: 5, totalSpent: '$450', lastVisit: '2024-05-16' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', purchases: 12, totalSpent: '$1,240', lastVisit: '2024-05-15' },
  { id: 3, name: 'Bob Wilson', email: 'bob@example.com', purchases: 3, totalSpent: '$180', lastVisit: '2024-05-14' },
  { id: 4, name: 'Alice Brown', email: 'alice@example.com', purchases: 8, totalSpent: '$890', lastVisit: '2024-05-13' },
  { id: 5, name: 'Charlie Davis', email: 'charlie@example.com', purchases: 2, totalSpent: '$120', lastVisit: '2024-05-12' },
]

export default function CustomersPage() {
  return (
    <BusinessLayout>
      <div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Customers</h1>
            <p className="text-muted-foreground">Manage and view customer information</p>
          </div>
          <Button className="rounded-lg">Export List</Button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              className="pl-10 rounded-lg"
            />
          </div>
        </div>

        {/* Table */}
        <Card className="rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary">
                  <th className="text-left px-6 py-4 font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-6 py-4 font-medium text-muted-foreground">Email</th>
                  <th className="text-left px-6 py-4 font-medium text-muted-foreground">Purchases</th>
                  <th className="text-left px-6 py-4 font-medium text-muted-foreground">Total Spent</th>
                  <th className="text-left px-6 py-4 font-medium text-muted-foreground">Last Visit</th>
                  <th className="text-left px-6 py-4 font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id} className="border-b border-border last:border-0 hover:bg-secondary/50">
                    <td className="px-6 py-4 font-medium text-foreground">{customer.name}</td>
                    <td className="px-6 py-4 text-muted-foreground">{customer.email}</td>
                    <td className="px-6 py-4 text-foreground">{customer.purchases}</td>
                    <td className="px-6 py-4 text-foreground font-semibold">{customer.totalSpent}</td>
                    <td className="px-6 py-4 text-muted-foreground">{customer.lastVisit}</td>
                    <td className="px-6 py-4">
                      <Button size="icon" variant="ghost" className="rounded-lg">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </BusinessLayout>
  )
}
