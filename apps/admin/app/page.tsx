'use client';

import React, { useState } from 'react';
import {
  LayoutDashboard,
  ShieldAlert,
  Users,
  Store,
  Settings,
  FileText,
  BellRing,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Activity,
} from 'lucide-react';
import { Button, Card } from '@saas/ui';
import { UserRole, BusinessStatus } from '@saas/types';

// Mock data to display on the dashboard
const mockStats = [
  { label: 'Active Users', value: '1,248', change: '+12.3%', icon: Users, color: '#3b82f6' },
  { label: 'Verified Businesses', value: '342', change: '+8.4%', icon: Store, color: '#10b981' },
  {
    label: 'Pending Approvals',
    value: '12',
    change: '-15.2%',
    icon: ShieldAlert,
    color: '#f59e0b',
  },
  { label: 'System Load', value: '98.8%', change: 'Healthy', icon: Activity, color: '#8b5cf6' },
];

const mockPendingBusinesses = [
  {
    id: '1',
    name: 'Green Valley Organics',
    owner: 'John Doe',
    category: 'Retail',
    date: '2026-05-18',
  },
  {
    id: '2',
    name: 'Cyberdyne Systems',
    owner: 'Sarah Connor',
    category: 'Technology',
    date: '2026-05-19',
  },
  {
    id: '3',
    name: 'GovLink Solutions',
    owner: 'Mayor Higgins',
    category: 'Public Sector',
    date: '2026-05-19',
  },
];

export default function AdminDashboard() {
  const [pendingList, setPendingList] = useState(mockPendingBusinesses);
  const [activeTab, setActiveTab] = useState('dashboard');

  const handleAction = (id: string, action: 'approve' | 'reject') => {
    setPendingList((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="flex min-h-screen bg-[#09090b]">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/5 bg-[#0c0c0e] p-6 hidden md:block">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg">
            S
          </div>
          <div>
            <h1 className="font-semibold text-white text-sm">SaaS Core</h1>
            <span className="text-xs text-neutral-500 font-mono">v0-foundation</span>
          </div>
        </div>

        <nav className="space-y-1">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'users', label: 'Users & Roles', icon: Users },
            { id: 'businesses', label: 'Businesses', icon: Store },
            { id: 'reports', label: 'Moderation Queue', icon: ShieldAlert },
            { id: 'announcements', label: 'Civic Notices', icon: BellRing },
            { id: 'settings', label: 'System Config', icon: Settings },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white/5 text-white border border-white/5 shadow-inner'
                    : 'text-neutral-400 hover:text-white hover:bg-white/[0.02]'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-indigo-500' : ''}`} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Admin Control Panel</h2>
            <p className="text-neutral-400 text-sm">
              Real-time system health and moderation workflow
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs text-neutral-400 font-mono">Master Admin Mode</span>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {mockStats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <Card key={i} className="p-6" glowColor={stat.color + '15'}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                      {stat.label}
                    </p>
                    <h3 className="text-2xl font-bold text-white mt-2 font-mono">{stat.value}</h3>
                  </div>
                  <div
                    className="p-3 rounded-xl bg-white/[0.02] border border-white/5"
                    style={{ color: stat.color }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-xs text-emerald-400 font-medium">{stat.change}</span>
                  <span className="text-xs text-neutral-500">from last week</span>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Workflow & Approval Queue */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Business Approval Queue */}
          <Card className="p-6 lg:col-span-2" glowColor="#4f46e510">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-semibold text-white text-base">Business Approval Queue</h3>
                <p className="text-xs text-neutral-400">
                  Verifying merchant legitimacy before public listing
                </p>
              </div>
              <span className="bg-indigo-950 text-indigo-400 text-xs px-2.5 py-1 rounded-full border border-indigo-900 font-mono font-medium">
                {pendingList.length} Pending
              </span>
            </div>

            {pendingList.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-white/5 rounded-xl bg-white/[0.01]">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-3" />
                <h4 className="font-medium text-white text-sm">All Caught Up!</h4>
                <p className="text-xs text-neutral-500 mt-1">
                  There are no pending business submissions to verify.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingList.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.02] transition-colors gap-4"
                  >
                    <div>
                      <h4 className="font-semibold text-white text-sm">{item.name}</h4>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="text-xs text-neutral-400">Owner: {item.owner}</span>
                        <span className="h-1 w-1 rounded-full bg-neutral-600"></span>
                        <span className="text-xs text-neutral-400">{item.category}</span>
                        <span className="h-1 w-1 rounded-full bg-neutral-600"></span>
                        <span className="text-xs text-neutral-500 font-mono">{item.date}</span>
                      </div>
                    </div>
                    <div className="flex gap-2.5 self-end sm:self-auto">
                      <Button
                        variant="secondary"
                        className="px-3.5 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/20 border border-red-900/30 font-medium flex items-center gap-1.5 rounded-lg"
                        onClick={() => handleAction(item.id, 'reject')}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Reject
                      </Button>
                      <Button
                        variant="primary"
                        className="px-3.5 py-1.5 text-xs bg-emerald-600 text-white shadow-[0_4px_12px_rgba(16,185,129,0.2)] hover:bg-emerald-500 font-medium flex items-center gap-1.5 rounded-lg border-0"
                        onClick={() => handleAction(item.id, 'approve')}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Approve
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* System Health / Operations */}
          <Card className="p-6" glowColor="#8b5cf610">
            <h3 className="font-semibold text-white text-base mb-6">Real-Time Core Status</h3>

            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-neutral-400">Database Connection Pools</span>
                  <span className="text-emerald-400 font-mono">18/20 Active</span>
                </div>
                <div className="h-1.5 w-full bg-neutral-900 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '90%' }} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-neutral-400">Redis Cache Hit Rate</span>
                  <span className="text-indigo-400 font-mono">94.2%</span>
                </div>
                <div className="h-1.5 w-full bg-neutral-900 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: '94.2%' }} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-neutral-400">Search Engine Sync (Typesense)</span>
                  <span className="text-emerald-400 font-mono">In Sync</span>
                </div>
                <div className="h-1.5 w-full bg-neutral-900 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '100%' }} />
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-500">API Gateway Latency</span>
                  <span className="text-neutral-300 font-mono">12ms</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-500">Job Worker Queue</span>
                  <span className="text-neutral-300 font-mono">0 jobs</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-500">Memory Allocation</span>
                  <span className="text-neutral-300 font-mono">342MB / 1.5GB</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
