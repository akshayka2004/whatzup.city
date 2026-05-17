'use client'

import { BusinessLayout } from '@/components/layouts/business-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, Edit, Eye } from 'lucide-react'

const offers = [
  { id: 1, title: 'Summer Special', discount: 50, active: true, views: 1234, clicks: 456 },
  { id: 2, title: 'Member Exclusive', discount: 30, active: true, views: 987, clicks: 234 },
  { id: 3, title: 'Bundle Deal', discount: 25, active: false, views: 654, clicks: 123 },
  { id: 4, title: 'Weekend Offer', discount: 40, active: true, views: 2341, clicks: 789 },
]

export default function OffersPage() {
  return (
    <BusinessLayout>
      <div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Offers</h1>
            <p className="text-muted-foreground">Manage your exclusive offers and deals</p>
          </div>
          <Button className="rounded-lg gap-2">
            <Plus className="h-4 w-4" />
            Create Offer
          </Button>
        </div>

        <div className="space-y-4">
          {offers.map((offer) => (
            <Card key={offer.id} className="p-6 rounded-2xl">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-foreground text-lg">{offer.title}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      offer.active ? 'bg-green-500/10 text-green-700' : 'bg-muted text-muted-foreground'
                    }`}>
                      {offer.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div>
                      <p className="text-muted-foreground">Discount</p>
                      <p className="font-semibold text-foreground">{offer.discount}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Views</p>
                      <p className="font-semibold text-foreground">{offer.views}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Clicks</p>
                      <p className="font-semibold text-foreground">{offer.clicks}</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="icon" variant="outline" className="rounded-lg">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="outline" className="rounded-lg">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="outline" className="rounded-lg text-destructive">
                    <Trash2 className="h-4 w-4" />
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
