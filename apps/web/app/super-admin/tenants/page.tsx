'use client';

import { useState, useEffect } from 'react';
import { SuperAdminLayout } from '@/components/layouts/super-admin-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Building2,
  Users,
  BarChart3,
  X,
  Tag,
  FileText,
  Settings2,
  ShieldAlert,
  Receipt,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import { apiService } from '@/lib/services/api-service';

export default function TenantsPage() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [managingTenant, setManagingTenant] = useState<any>(null);

  useEffect(() => {
    setLoading(true);
    // Live cross-tenant data from the admin endpoint (real _count + billed total).
    apiService
      .get<any>('/v1/businesses/admin/all?limit=100&sortBy=createdAt&sortOrder=desc')
      .then((res) => {
        if (res.data && !res.error) {
          const list = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
          setTenants(
            list.map((b: any) => ({
              id: b.id,
              name: b.name || b.businessName || 'Unknown',
              plan: b.subscriptionPlan || b.plan || 'Standard',
              status: b.status === 'SUSPENDED' ? 'Suspended' : b.isActive === false ? 'Suspended' : 'Active',
              signupDate: b.createdAt
                ? new Date(b.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                : '—',
              sales: `₹${Number(b.totalBillAmount || 0).toLocaleString('en-IN')}`,
              offersCount: b._count?.offers ?? 0,
              eventsCount: b._count?.events ?? 0,
              totalReceived: Number(b.totalBillAmount || 0),
              city: b.city || '—',
              category: b.category?.name || '—',
            })),
          );
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleToggleStatus = (id: number) => {
    setTenants(
      tenants.map((t) => {
        if (t.id === id) {
          const nextStatus = t.status === 'Active' ? 'Suspended' : 'Active';
          if (managingTenant && managingTenant.id === id) {
            setManagingTenant({ ...managingTenant, status: nextStatus });
          }
          return { ...t, status: nextStatus };
        }
        return t;
      }),
    );
  };

  const handleChangePlan = (id: number, plan: string) => {
    setTenants(
      tenants.map((t) => {
        if (t.id === id) {
          if (managingTenant && managingTenant.id === id) {
            setManagingTenant({ ...managingTenant, plan });
          }
          return { ...t, plan };
        }
        return t;
      }),
    );
  };

  return (
    <SuperAdminLayout>
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Tenants</h1>
        <p className="text-muted-foreground mb-8">
          Manage platform tenants, review sales performance, and adjust subscriptions
        </p>

        {loading && (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && tenants.length === 0 && (
          <Card className="p-10 rounded-2xl border-dashed border-border bg-secondary/20 text-center">
            <Building2 className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-40" />
            <p className="text-foreground font-semibold mb-1">No tenants found</p>
            <p className="text-sm text-muted-foreground">Tenant registrations will appear here.</p>
          </Card>
        )}

        <div className="space-y-4">
          {tenants.map((tenant) => (
            <Card
              key={tenant.id}
              className="p-6 rounded-2xl border-border bg-card/40 backdrop-blur-xl hover:bg-card/50 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="rounded-xl bg-secondary/40 p-3 border border-border text-muted-foreground">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-lg">{tenant.name}</h3>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1 flex-wrap">
                      <span>
                        Plan: <span className="text-primary font-semibold">{tenant.plan}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Tag className="h-3.5 w-3.5" />
                        {tenant.offersCount} offers
                      </span>
                      <span className="flex items-center gap-1 text-success font-semibold">
                        <Receipt className="h-3.5 w-3.5" />
                        {tenant.sales}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      tenant.status === 'Active'
                        ? 'bg-success/10 text-success border border-success/20'
                        : 'bg-destructive/10 text-destructive border border-destructive/20'
                    }`}
                  >
                    {tenant.status}
                  </span>
                  <Button
                    onClick={() => setManagingTenant(tenant)}
                    variant="outline"
                    className="rounded-xl border-border text-foreground hover:bg-secondary cursor-pointer"
                    size="sm"
                  >
                    Manage
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* ── TENANT DEEP DIVE MODAL ───────────────────────── */}
        {managingTenant && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-2xl p-6 rounded-2xl border-border bg-card shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setManagingTenant(null)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-primary/10 text-primary rounded-xl">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">{managingTenant.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    Signed Up: {managingTenant.signupDate}
                  </p>
                </div>
              </div>

              {/* Stats Deep Dive */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-secondary/50 p-4 rounded-xl border border-border">
                  <div className="flex items-center justify-between text-muted-foreground mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider">
                      Total Sales
                    </span>
                    <BarChart3 className="h-4 w-4 text-success" />
                  </div>
                  <p className="text-lg font-extrabold text-foreground">{managingTenant.sales}</p>
                </div>
                <div className="bg-secondary/50 p-4 rounded-xl border border-border">
                  <div className="flex items-center justify-between text-muted-foreground mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider">
                      Active Offers
                    </span>
                    <Tag className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-lg font-extrabold text-foreground">
                    {managingTenant.offersCount}
                  </p>
                </div>
                <div className="bg-secondary/50 p-4 rounded-xl border border-border">
                  <div className="flex items-center justify-between text-muted-foreground mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider">
                      Events Published
                    </span>
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-lg font-extrabold text-foreground">
                    {managingTenant.eventsCount}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-secondary/50 p-4 rounded-xl border border-border">
                  <div className="flex items-center justify-between text-muted-foreground mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider">
                      Location
                    </span>
                    <Building2 className="h-4 w-4 text-info" />
                  </div>
                  <p className="text-lg font-extrabold text-foreground">{managingTenant.city}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{managingTenant.category}</p>
                </div>
                <div className="bg-success/5 p-4 rounded-xl border border-success/20">
                  <div className="flex items-center justify-between text-muted-foreground mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-success">
                      Total Received
                    </span>
                    <TrendingUp className="h-4 w-4 text-success" />
                  </div>
                  <p className="text-lg font-extrabold text-success">
                    ₹{Number(managingTenant.totalReceived || 0).toLocaleString('en-IN')}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">Verified bill total</p>
                </div>
              </div>

              {/* Controls */}
              <div className="space-y-4 border-t border-border pt-4">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Settings2 className="h-4 w-4 text-primary" /> Management Controls
                </h4>

                <div className="flex flex-wrap gap-4 items-center justify-between p-4 bg-secondary/40 rounded-xl border border-border">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Subscription Plan</p>
                    <p className="text-xs text-muted-foreground">
                      Adjust maximum user limits and premium features
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {['Trial', 'Standard', 'Premium'].map((plan) => (
                      <Button
                        key={plan}
                        onClick={() => handleChangePlan(managingTenant.id, plan)}
                        variant={managingTenant.plan === plan ? 'default' : 'outline'}
                        className={`rounded-lg text-xs h-8 ${managingTenant.plan === plan ? 'bg-primary text-primary-foreground' : 'border-border text-foreground hover:bg-muted'}`}
                      >
                        {plan}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-secondary/40 rounded-xl border border-border">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Tenant Access State</p>
                    <p className="text-xs text-muted-foreground">
                      Toggle login and storefront search indexing access
                    </p>
                  </div>
                  <Button
                    onClick={() => handleToggleStatus(managingTenant.id)}
                    className={`rounded-xl font-semibold gap-1 text-white text-xs ${
                      managingTenant.status === 'Active'
                        ? 'bg-destructive hover:bg-destructive'
                        : 'bg-success hover:bg-success'
                    }`}
                  >
                    <ShieldAlert className="h-4 w-4" />
                    {managingTenant.status === 'Active' ? 'Suspend Tenant' : 'Activate Tenant'}
                  </Button>
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t border-border mt-6">
                <Button
                  onClick={() => setManagingTenant(null)}
                  className="rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold cursor-pointer"
                >
                  Close Deep Dive
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
}
