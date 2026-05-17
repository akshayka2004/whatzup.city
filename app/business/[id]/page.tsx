'use client'

import { PublicLayout } from '@/components/layouts/public-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Star, MapPin, Clock, Phone, Share2, Heart, MessageCircle } from 'lucide-react'

export default function BusinessDetailPage({ params }: { params: { id: string } }) {
  return (
    <PublicLayout>
      <div>
        {/* Hero Image */}
        <div className="w-full h-96 rounded-2xl bg-secondary mb-8 flex items-center justify-center">
          <p className="text-muted-foreground">Business Cover Image</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="md:col-span-2">
            {/* Business Info */}
            <Card className="p-6 rounded-2xl mb-8">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-foreground mb-2">Business Name</h1>
                  <p className="text-muted-foreground mb-4">Category • Location</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" className="rounded-lg">
                    <Share2 className="h-5 w-5" />
                  </Button>
                  <Button variant="outline" size="icon" className="rounded-lg">
                    <Heart className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-6 mb-6">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-bold text-lg">4.8</span>
                  <span className="text-muted-foreground">(234 reviews)</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 text-foreground">
                  <MapPin className="h-5 w-5 text-primary" />
                  <span>123 Main Street, City, State 12345</span>
                </div>
                <div className="flex items-center gap-3 text-foreground">
                  <Phone className="h-5 w-5 text-primary" />
                  <span>(555) 123-4567</span>
                </div>
                <div className="flex items-center gap-3 text-foreground">
                  <Clock className="h-5 w-5 text-primary" />
                  <span>Open • Closes at 9:00 PM</span>
                </div>
              </div>
            </Card>

            {/* About */}
            <Card className="p-6 rounded-2xl mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">About</h2>
              <p className="text-muted-foreground mb-4">
                This is a detailed description of the business and its services. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
              </p>
              <div className="flex gap-3 flex-wrap">
                <span className="px-3 py-1 bg-secondary rounded-full text-sm">Tag 1</span>
                <span className="px-3 py-1 bg-secondary rounded-full text-sm">Tag 2</span>
                <span className="px-3 py-1 bg-secondary rounded-full text-sm">Tag 3</span>
              </div>
            </Card>

            {/* Reviews */}
            <Card className="p-6 rounded-2xl mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">Reviews</h2>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="pb-4 border-b border-border last:border-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-foreground">Reviewer Name</p>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            {[...Array(5)].map((_, j) => (
                              <Star key={j} className={`h-4 w-4 ${j < 5 ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                            ))}
                          </div>
                          <span className="text-sm text-muted-foreground">2 days ago</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-muted-foreground">Great place! Would definitely recommend to friends and family.</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div>
            {/* Offers */}
            <Card className="p-6 rounded-2xl mb-6 sticky top-8">
              <h3 className="font-bold text-foreground mb-4">Active Offers</h3>
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="p-3 bg-accent/10 rounded-xl">
                    <p className="font-semibold text-foreground mb-1">50% Off</p>
                    <p className="text-xs text-muted-foreground mb-2">Expires in 5 days</p>
                    <Button variant="outline" className="w-full rounded-lg" size="sm">
                      Claim Offer
                    </Button>
                  </div>
                ))}
              </div>
            </Card>

            {/* Action Buttons */}
            <Card className="p-6 rounded-2xl">
              <Button className="w-full rounded-lg mb-3">
                <MessageCircle className="mr-2 h-4 w-4" />
                Contact
              </Button>
              <Button variant="outline" className="w-full rounded-lg">
                Visit Website
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </PublicLayout>
  )
}
