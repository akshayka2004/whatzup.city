'use client';

import { useState, useMemo, useEffect } from 'react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, ChevronDown, Eye, Mail, Download, X, ArrowUpDown, Loader2, Users } from 'lucide-react';
import { apiService } from '@/lib/services/api-service';
import { useAuth } from '@/hooks/use-auth';

type SortKey = 'name' | 'totalSpent' | 'purchases' | 'lastVisit';

export default function CustomersPage() {
  const { user } = useAuth();
  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('totalSpent');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [viewingCustomer, setViewingCustomer] = useState<any>(null);
  const [activeActionId, setActiveActionId] = useState<any>(null);

  const businessId = user?.businessId || user?.entity?.id;

  useEffect(() => {
    if (!businessId) return;
    setLoading(true);
    // NOTE: This uses the admin customers endpoint scoped to businessId via query param.
    // TODO: Replace with a business-scoped customers endpoint when available.
    apiService
      .get<any>(`/v1/customers?businessId=${businessId}&page=1`)
      .then((res) => {
        if (res.data && !res.error) {
          const list = Array.isArray(res.data) ? res.data : res.data?.data ?? res.data?.customers ?? [];
          setAllCustomers(
            list.map((c: any) => ({
              id: c.id,
              name: c.name || c.fullName || `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || 'Unknown',
              email: c.email || '—',
              purchases: c.purchaseCount ?? c.purchases ?? 0,
              totalSpent: c.totalSpent ?? 0,
              lastVisit: c.lastVisit ?? c.lastPurchaseAt ?? c.updatedAt ?? '—',
            })),
          );
        }
      })
      .finally(() => setLoading(false));
  }, [businessId]);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortDir('desc');
    }
  };

  const filteredCustomers = useMemo(() => {
    let list = [...allCustomers];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (c) => c.name.toLowerCase().includes(term) || c.email.toLowerCase().includes(term),
      );
    }
    list.sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1;
      if (sortBy === 'name') return a.name.localeCompare(b.name) * mul;
      if (sortBy === 'totalSpent') return (a.totalSpent - b.totalSpent) * mul;
      if (sortBy === 'purchases') return (a.purchases - b.purchases) * mul;
      if (sortBy === 'lastVisit')
        return (new Date(a.lastVisit).getTime() - new Date(b.lastVisit).getTime()) * mul;
      return 0;
    });
    return list;
  }, [allCustomers, searchTerm, sortBy, sortDir]);

  const handleExport = () => {
    const csv = [
      'Name,Email,Purchases,Total Spent,Last Visit',
      ...filteredCustomers.map(
        (c) => `${c.name},${c.email},${c.purchases},$${c.totalSpent},${c.lastVisit}`,
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customers.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const SortHeader = ({ label, sortKey }: { label: string; sortKey: SortKey }) => (
    <th
      onClick={() => toggleSort(sortKey)}
      className="text-left px-6 py-4 font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors"
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown
          className={`h-3.5 w-3.5 ${sortBy === sortKey ? 'text-primary' : 'opacity-40'}`}
        />
      </div>
    </th>
  );

  return (
    <BusinessLayout>
      <div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Customers</h1>
            <p className="text-muted-foreground">Manage and view customer information</p>
          </div>
          <Button
            onClick={handleExport}
            className="rounded-xl gap-2 font-medium bg-gradient-to-r from-primary to-accent text-primary-foreground"
          >
            <Download className="h-4 w-4" />
            Export List
          </Button>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-xl border-white/10 bg-white/5"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : allCustomers.length === 0 ? (
          <Card className="p-10 rounded-2xl border-dashed border-white/10 bg-white/5 text-center">
            <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-40" />
            <p className="text-foreground font-semibold mb-1">No customers yet</p>
            <p className="text-sm text-muted-foreground">Customer data will appear once purchases are recorded.</p>
          </Card>
        ) : (
        <Card className="rounded-2xl overflow-hidden border-white/5 bg-card/40 backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <SortHeader label="Name" sortKey="name" />
                  <th className="text-left px-6 py-4 font-medium text-muted-foreground">Email</th>
                  <SortHeader label="Purchases" sortKey="purchases" />
                  <SortHeader label="Total Spent" sortKey="totalSpent" />
                  <SortHeader label="Last Visit" sortKey="lastVisit" />
                  <th className="text-left px-6 py-4 font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-foreground">{customer.name}</td>
                    <td className="px-6 py-4 text-muted-foreground">{customer.email}</td>
                    <td className="px-6 py-4 text-foreground">{customer.purchases}</td>
                    <td className="px-6 py-4 text-foreground font-semibold">
                      ${customer.totalSpent.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{customer.lastVisit}</td>
                    <td className="px-6 py-4 relative">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setActiveActionId(activeActionId === customer.id ? null : customer.id)
                        }
                        className="rounded-lg border-white/10 text-slate-300 gap-1 h-8"
                      >
                        Actions <ChevronDown className="h-3 w-3" />
                      </Button>
                      {activeActionId === customer.id && (
                        <div className="absolute right-6 top-12 z-20 w-44 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl py-1">
                          <button
                            onClick={() => {
                              setViewingCustomer(customer);
                              setActiveActionId(null);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
                          >
                            <Eye className="h-4 w-4" /> View Profile
                          </button>
                          <button
                            onClick={() => {
                              window.open(`mailto:${customer.email}`);
                              setActiveActionId(null);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
                          >
                            <Mail className="h-4 w-4" /> Send Email
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        )} {/* end allCustomers.length > 0 */}

        {/* ── VIEW CUSTOMER MODAL ──────────────────────────── */}
        {viewingCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-md p-6 rounded-2xl border-white/10 bg-zinc-900 shadow-2xl relative">
              <button
                onClick={() => setViewingCustomer(null)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary to-accent text-primary-foreground flex items-center justify-center text-xl font-extrabold">
                  {viewingCustomer.name
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">{viewingCustomer.name}</h3>
                  <p className="text-xs text-muted-foreground">{viewingCustomer.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white/5 p-4 rounded-xl text-center border border-white/5">
                  <p className="text-xs text-muted-foreground mb-1">Purchases</p>
                  <p className="text-xl font-extrabold text-foreground">
                    {viewingCustomer.purchases}
                  </p>
                </div>
                <div className="bg-white/5 p-4 rounded-xl text-center border border-white/5">
                  <p className="text-xs text-muted-foreground mb-1">Total Spent</p>
                  <p className="text-xl font-extrabold text-foreground">
                    ${viewingCustomer.totalSpent}
                  </p>
                </div>
                <div className="bg-white/5 p-4 rounded-xl text-center border border-white/5">
                  <p className="text-xs text-muted-foreground mb-1">Last Visit</p>
                  <p className="text-sm font-bold text-foreground">{viewingCustomer.lastVisit}</p>
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={() => setViewingCustomer(null)}
                  className="rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold"
                >
                  Close
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </BusinessLayout>
  );
}
