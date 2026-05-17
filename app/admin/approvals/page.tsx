'use client'

import { AdminLayout } from '@/components/layouts/admin-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, Eye } from 'lucide-react'

const pendingApprovals = [
  { id: 1, name: 'Restaurant ABC', type: 'Business', submittedDate: '2024-05-16', documents: 5 },
  { id: 2, name: 'Tech Solutions Ltd', type: 'Service', submittedDate: '2024-05-15', documents: 3 },
  { id: 3, name: 'Fashion Store XYZ', type: 'Retail', submittedDate: '2024-05-14', documents: 4 },
  { id: 4, name: 'Health Clinic', type: 'Healthcare', submittedDate: '2024-05-13', documents: 6 },
]

export default function ApprovalsPage() {
  return (
    <AdminLayout>
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Pending Approvals</h1>
        <p className="text-muted-foreground mb-8">Review and approve pending business registrations</p>

        <div className="space-y-4">
          {pendingApprovals.map((approval) => (
            <Card key={approval.id} className="p-6 rounded-2xl">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground text-lg mb-2">{approval.name}</h3>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <span>Type: {approval.type}</span>
                    <span>Submitted: {approval.submittedDate}</span>
                    <span>Documents: {approval.documents}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="rounded-lg gap-2">
                    <Eye className="h-4 w-4" />
                    Review
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-lg text-green-600 border-green-200">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-lg text-red-600 border-red-200">
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  )
}
