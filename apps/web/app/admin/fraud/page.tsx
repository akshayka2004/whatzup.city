'use client';

import { AdminLayout } from '@/components/layouts/admin-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldAlert, AlertTriangle, Check, ArrowUpRight } from 'lucide-react';

const flaggedAccounts = [
  {
    id: 1,
    type: 'USER',
    identifier: 'John Doe (User ID #9822)',
    reason: 'High-frequency bill uploads (>6 in 5 mins)',
    riskLevel: 'HIGH',
    score: '82%',
  },
  {
    id: 2,
    type: 'BUSINESS',
    identifier: 'Fast Food Express',
    reason: 'Duplicate invoice number match detected',
    riskLevel: 'MEDIUM',
    score: '60%',
  },
  {
    id: 3,
    type: 'REVIEW',
    identifier: 'Review ID #239401',
    reason: 'Non-verified review posting abuse profile',
    riskLevel: 'LOW',
    score: '35%',
  },
];

export default function AdminFraudPage() {
  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Fraud & Abuse Prevention</h1>
          <p className="text-muted-foreground">
            Monitor platform abuse warning logs and auto-triggered system flags
          </p>
        </div>

        <div className="space-y-4">
          {flaggedAccounts.map((item) => (
            <Card
              key={item.id}
              className="p-6 rounded-2xl border-border bg-card/40 backdrop-blur-xl hover:bg-card/50 transition-colors"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div
                    className={`p-3 rounded-xl h-11 w-11 flex items-center justify-center flex-shrink-0 ${
                      item.riskLevel === 'HIGH'
                        ? 'bg-destructive/10 text-destructive'
                        : item.riskLevel === 'MEDIUM'
                          ? 'bg-warning/10 text-warning'
                          : 'bg-info/10 text-info'
                    }`}
                  >
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-foreground text-lg">{item.identifier}</h3>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          item.riskLevel === 'HIGH'
                            ? 'bg-destructive/10 text-destructive border border-destructive/20'
                            : item.riskLevel === 'MEDIUM'
                              ? 'bg-warning/10 text-warning border border-warning/20'
                              : 'bg-info/10 text-info border border-info/20'
                        }`}
                      >
                        {item.riskLevel} Risk
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Reason: {item.reason}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-sm border-t md:border-t-0 pt-4 md:pt-0 border-border">
                  <div>
                    <p className="text-xs text-muted-foreground">Confidence Score</p>
                    <p className="font-bold text-foreground text-base mt-0.5">{item.score}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="rounded-lg bg-destructive hover:bg-destructive text-white gap-1 px-3 py-1.5 h-8"
                    >
                      <AlertTriangle className="h-4 w-4" />
                      Ban Resource
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-lg border-border text-foreground hover:bg-secondary gap-1 px-3 py-1.5 h-8"
                    >
                      <Check className="h-4 w-4" />
                      Dismiss
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
