'use client'

import { BusinessLayout } from '@/components/layouts/business-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Edit, Trash2, Eye } from 'lucide-react'

const products = [
  { id: 1, name: 'Product A', category: 'Electronics', price: '$99.99', stock: 45, sales: 234 },
  { id: 2, name: 'Product B', category: 'Clothing', price: '$29.99', stock: 120, sales: 567 },
  { id: 3, name: 'Product C', category: 'Home', price: '$149.99', stock: 23, sales: 89 },
  { id: 4, name: 'Product D', category: 'Electronics', price: '$199.99', stock: 8, sales: 456 },
]

export default function ProductsPage() {
  return (
    <BusinessLayout>
      <div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Products</h1>
            <p className="text-muted-foreground">Manage your product catalog</p>
          </div>
          <Button className="rounded-lg gap-2">
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </div>

        <div className="space-y-4">
          {products.map((product) => (
            <Card key={product.id} className="p-6 rounded-2xl">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground text-lg mb-2">{product.name}</h3>
                  <div className="flex items-center gap-6 text-sm">
                    <div>
                      <p className="text-muted-foreground">Category</p>
                      <p className="font-medium text-foreground">{product.category}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Price</p>
                      <p className="font-medium text-foreground">{product.price}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Stock</p>
                      <p className="font-medium text-foreground">{product.stock} units</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Sales</p>
                      <p className="font-medium text-foreground">{product.sales}</p>
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
