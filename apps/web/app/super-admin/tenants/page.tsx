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
    // TODO: Replace with dedicated /v1/tenants endpoint when available.
    // Using /v1/businesses?page=1 as a proxy for now (each business represents a tenant).
    apiService
      .get<any>('/v1/businesses?page=1')
      .then((res) => {
        if (res.data && !res.error) {
          const list = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
          setTenants(
            list.map((b: any) => ({
              id: b.id,
              name: b.name || b.businessName || 'Unknown',
              plan: b.subscriptionPlan || b.plan || 'Standard',
              users: b.userCount ?? b.staffCount ?? 0,
              status: b.isActive !== false ? 'Active' : 'Suspended',
              signupDate: b.createdAt
                ? new Date(b.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                : '—',
              sales: b.totalRevenue ? `$${b.totalRevenue.toLocaleString()}` : '—',
              offersCount: b.offersCount ?? b._count?.offers ?? 0,
              announcementsCount: b.announcementsCount ?? b._count?.announcements ?? 0,
              convertedSales: b.convertedSales ?? b.billVerificationsCount ?? b._count?.billVerifications ?? 0,
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
          <Card className="p-10 rounded-2xl border-dashed border-white/10 bg-white/5 text-center">
            <Building2 className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-40" />
            <p className="text-foreground font-semibold mb-1">No tenants found</p>
            <p className="text-sm text-muted-foreground">Tenant registrations will appear here.</p>
          </Card>
        )}

        <div className="space-y-4">
          {tenants.map((tenant) => (
            <Card
              key={tenant.id}
              className="p-6 rounded-2xl border-white/5 bg-card/40 backdrop-blur-xl hover:bg-card/50 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="rounded-xl bg-white/5 p-3 border border-white/5 text-muted-foreground">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-lg">{tenant.name}</h3>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                      <span>
                        Plan: <span className="text-primary font-semibold">{tenant.plan}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {tenant.users} users
                      </span>
                      <span className="flex items-center gap-1 text-cyan-400 font-semibold">
                        <Receipt className="h-3.5 w-3.5" />
                        {tenant.convertedSales} converted
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      tenant.status === 'Active'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {tenant.status}
                  </span>
                  <Button
                    onClick={() => setManagingTenant(tenant)}
                    variant="outline"
                    className="rounded-xl border-white/10 text-slate-300 hover:bg-white/5 cursor-pointer"
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
            <Card className="w-full max-w-2xl p-6 rounded-2xl border-white/10 bg-zinc-900 shadow-2xl relative max-h-[90vh] overflow-y-auto">
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
                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                  <div className="flex items-center justify-between text-muted-foreground mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider">
                      Total Sales
                    </span>
                    <BarChart3 className="h-4 w-4 text-emerald-400" />
                  </div>
                  <p className="text-lg font-extrabold text-foreground">{managingTenant.sales}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
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
                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                  <div className="flex items-center justify-between text-muted-foreground mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider">
                      Notices Sent
                    </span>
                    <FileText className="h-4 w-4 text-violet-400" />
                  </div>
                  <p className="text-lg font-extrabold text-foreground">
                    {managingTenant.announcementsCount}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                  <div className="flex items-center justify-between text-muted-foreground mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider">
                      Active Users
                    </span>
                    <Users className="h-4 w-4 text-cyan-400" />
                  </div>
                  <p className="text-lg font-extrabold text-foreground">{managingTenant.users}</p>
                </div>
                <div className="bg-cyan-500/5 p-4 rounded-xl border border-cyan-500/20">
                  <div className="flex items-center justify-between text-muted-foreground mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-400">
                      Converted Sales
                    </span>
                    <TrendingUp className="h-4 w-4 text-cyan-400" />
                  </div>
                  <p className="text-lg font-extrabold text-cyan-400">
                    {managingTenant.convertedSales}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">Verified bill submissions</p>
                </div>
              </div>

              {/* Controls */}
              <div className="space-y-4 border-t border-white/5 pt-4">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Settings2 className="h-4 w-4 text-primary" /> Management Controls
                </h4>

                <div className="flex flex-wrap gap-4 items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
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
                        className={`rounded-lg text-xs h-8 ${managingTenant.plan === plan ? 'bg-primary text-primary-foreground' : 'border-white/10 text-slate-300'}`}
                      >
                        {plan}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
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
                        ? 'bg-rose-600 hover:bg-rose-500'
                        : 'bg-emerald-600 hover:bg-emerald-500'
                    }`}
                  >
                    <ShieldAlert className="h-4 w-4" />
                    {managingTenant.status === 'Active' ? 'Suspend Tenant' : 'Activate Tenant'}
                  </Button>
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t border-white/5 mt-6">
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
