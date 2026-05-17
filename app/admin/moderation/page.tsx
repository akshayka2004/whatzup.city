'use client'

import { AdminLayout } from '@/components/layouts/admin-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { User, Shield, CheckCircle, XCircle } from 'lucide-react'

const violators = [
  { id: 1, name: 'User A', reason: 'Inappropriate Content', severity: 'High', date: '2024-05-16' },
  { id: 2, name: 'User B', reason: 'Spam', severity: 'Medium', date: '2024-05-15' },
  { id: 3, name: 'User C', reason: 'Policy Violation', severity: 'High', date: '2024-05-14' },
]

const severityColors: Record<string, string> = {
  High: 'bg-red-500/10 text-red-700',
  Medium: 'bg-yellow-500/10 text-yellow-700',
  Low: 'bg-blue-500/10 text-blue-700',
}

export default function ModerationPage() {
  return (
    <AdminLayout>
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">User Moderation</h1>
        <p className="text-muted-foreground mb-8">Manage user conduct and violations</p>

        <div className="space-y-4">
          {violators.map((violator) => (
            <Card key={violator.id} className="p-6 rounded-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="rounded-lg bg-secondary p-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{violator.name}</h3>
                    <p className="text-sm text-muted-foreground">{violator.reason}</p>
                    <p className="text-xs text-muted-foreground mt-1">{violator.date}</p>
                  </div>
                  <span className={`ml-auto px-3 py-1 rounded-full text-xs font-medium ${severityColors[violator.severity]}`}>
                    {violator.severity}
                  </span>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button size="icon" variant="outline" className="rounded-lg text-green-600">
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="outline" className="rounded-lg text-red-600">
                    <XCircle className="h-4 w-4" />
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
