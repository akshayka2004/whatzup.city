'use client';

import { BusinessLayout } from '@/components/layouts/business-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TrendingUp, Download } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <BusinessLayout>
      <div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Analytics</h1>
            <p className="text-muted-foreground">Track your business performance</p>
          </div>
          <Button className="rounded-lg gap-2">
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>

        {/* Date Range Filter */}
        <div className="flex gap-4 mb-8">
          <Select>
            <SelectTrigger className="w-40 rounded-lg">
              <SelectValue placeholder="Last 30 days" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="p-6 rounded-2xl">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Views & Clicks
            </h3>
            <div className="h-64 bg-secondary rounded-xl flex items-center justify-center">
              <p className="text-muted-foreground">Chart Placeholder</p>
            </div>
          </Card>

          <Card className="p-6 rounded-2xl">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-4" />
              Customer Acquisition
            </h3>
            <div className="h-64 bg-secondary rounded-xl flex items-center justify-center">
              <p className="text-muted-foreground">Chart Placeholder</p>
            </div>
          </Card>
        </div>

        {/* Metrics Table */}
        <Card className="p-6 rounded-2xl">
          <h3 className="font-semibold text-foreground mb-4">Top Metrics</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 font-medium text-muted-foreground">Metric</th>
                  <th className="text-left py-3 font-medium text-muted-foreground">Value</th>
                  <th className="text-left py-3 font-medium text-muted-foreground">Change</th>
                </tr>
              </thead>
              <tbody>
                {['Total Views', 'Total Clicks', 'CTR', 'Avg Rating', 'New Customers'].map(
                  (metric, i) => (
                    <tr key={metric} className="border-b border-border last:border-0">
                      <td className="py-3">{metric}</td>
                      <td className="py-3 font-semibold">{12000 + i * 1000}</td>
                      <td className="py-3 text-green-600">
                        +{Math.floor(5 + Math.random() * 20)}%
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </BusinessLayout>
  );
}
