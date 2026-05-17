'use client'

import { BusinessLayout } from '@/components/layouts/business-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Edit, MapPin, Phone } from 'lucide-react'

const branches = [
  {
    id: 1,
    name: 'Downtown Branch',
    address: '123 Main St, City',
    phone: '(555) 123-4567',
    status: 'Active',
  },
  {
    id: 2,
    name: 'Airport Branch',
    address: '456 Airport Ave, City',
    phone: '(555) 987-6543',
    status: 'Active',
  },
  {
    id: 3,
    name: 'Mall Branch',
    address: '789 Mall Rd, City',
    phone: '(555) 456-7890',
    status: 'Inactive',
  },
]

export default function BranchesPage() {
  return (
    <BusinessLayout>
      <div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Branches</h1>
            <p className="text-muted-foreground">Manage your business locations</p>
          </div>
          <Button className="rounded-lg gap-2">
            <Plus className="h-4 w-4" />
            Add Branch
          </Button>
        </div>

        <div className="grid gap-6">
          {branches.map((branch) => (
            <Card key={branch.id} className="p-6 rounded-2xl">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-3">{branch.name}</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{branch.address}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{branch.phone}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    branch.status === 'Active'
                      ? 'bg-green-500/10 text-green-700'
                      : 'bg-gray-500/10 text-gray-700'
                  }`}>
                    {branch.status}
                  </span>
                  <Button variant="outline" className="w-full rounded-lg mt-4" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </BusinessLayout>
  )
}
