'use client';

import { useState, useMemo } from 'react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, ChevronDown, Eye, Mail, Download, X, ArrowUpDown } from 'lucide-react';

const initialCustomers = [
  {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    purchases: 5,
    totalSpent: 450,
    lastVisit: '2024-05-16',
  },
  {
    id: 2,
    name: 'Jane Smith',
    email: 'jane@example.com',
    purchases: 12,
    totalSpent: 1240,
    lastVisit: '2024-05-15',
  },
  {
    id: 3,
    name: 'Bob Wilson',
    email: 'bob@example.com',
    purchases: 3,
    totalSpent: 180,
    lastVisit: '2024-05-14',
  },
  {
    id: 4,
    name: 'Alice Brown',
    email: 'alice@example.com',
    purchases: 8,
    totalSpent: 890,
    lastVisit: '2024-05-13',
  },
  {
    id: 5,
    name: 'Charlie Davis',
    email: 'charlie@example.com',
    purchases: 2,
    totalSpent: 120,
    lastVisit: '2024-05-12',
  },
  {
    id: 6,
    name: 'Diana Evans',
    email: 'diana@example.com',
    purchases: 15,
    totalSpent: 2100,
    lastVisit: '2024-05-11',
  },
  {
    id: 7,
    name: 'Frank Green',
    email: 'frank@example.com',
    purchases: 1,
    totalSpent: 55,
    lastVisit: '2024-05-10',
  },
];

type SortKey = 'name' | 'totalSpent' | 'purchases' | 'lastVisit';

export default function CustomersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('totalSpent');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [viewingCustomer, setViewingCustomer] = useState<any>(null);
  const [activeActionId, setActiveActionId] = useState<number | null>(null);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortDir('desc');
    }
  };

  const filteredCustomers = useMemo(() => {
    let list = [...initialCustomers];
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
  }, [searchTerm, sortBy, sortDir]);

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
