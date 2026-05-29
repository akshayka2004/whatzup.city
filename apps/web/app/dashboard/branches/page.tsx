'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus, Edit, Trash2, MapPin, Phone, X, AlertTriangle,
  BarChart3, User, Clock, Navigation, CheckCircle2, Loader2,
  Mail, KeyRound,
} from 'lucide-react';
import { apiService } from '@/lib/services/api-service';
import { useAuth } from '@/hooks/use-auth';

interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  status: 'Active' | 'Inactive';
  managerName: string;
  managerPhone: string;
  managerEmail: string;
  hours: string;
  geoCoords: string;
}

const EMPTY_FORM: Omit<Branch, 'id' | 'status'> & { adminEmail: string; adminPassword: string } = {
  name: '', address: '', phone: '',
  managerName: '', managerPhone: '', managerEmail: '',
  hours: '', geoCoords: '',
  adminEmail: '', adminPassword: '',
};

type BranchForm = typeof EMPTY_FORM;
type BranchFormKey = keyof BranchForm;

// ── FormFields component (hoisted OUT of parent to prevent focus loss) ──────
function BranchFormFields({
  form,
  setField,
  isEdit = false,
}: {
  form: BranchForm;
  setField: (key: BranchFormKey, val: string) => void;
  isEdit?: boolean;
}) {
  return (
    <>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-slate-300 block mb-1.5">Branch Name *</label>
          <Input
            value={form.name}
            onChange={(e) => setField('name', e.target.value)}
            placeholder="Downtown Branch"
            required
            className="rounded-xl border-white/10 bg-white/5"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-300 block mb-1.5">Phone Number *</label>
          <Input
            value={form.phone}
            onChange={(e) => setField('phone', e.target.value)}
            placeholder="+91 98765 43210"
            required
            className="rounded-xl border-white/10 bg-white/5"
          />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-slate-300 block mb-1.5">Address *</label>
        <Input
          value={form.address}
          onChange={(e) => setField('address', e.target.value)}
          placeholder="123 Main St, City 400001"
          required
          className="rounded-xl border-white/10 bg-white/5"
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-slate-300 block mb-1.5">Operating Hours</label>
          <Input
            value={form.hours}
            onChange={(e) => setField('hours', e.target.value)}
            placeholder="Mon-Sat 9AM-9PM"
            className="rounded-xl border-white/10 bg-white/5"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-300 block mb-1.5">Geo Coordinates</label>
          <Input
            value={form.geoCoords}
            onChange={(e) => setField('geoCoords', e.target.value)}
            placeholder="19.0760, 72.8777"
            className="rounded-xl border-white/10 bg-white/5"
          />
        </div>
      </div>
      <div className="pt-2 border-t border-white/5">
        <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Branch Manager</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1.5">Manager Name</label>
            <Input
              value={form.managerName}
              onChange={(e) => setField('managerName', e.target.value)}
              placeholder="Ravi Kumar"
              className="rounded-xl border-white/10 bg-white/5"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1.5">Manager Phone</label>
            <Input
              value={form.managerPhone}
              onChange={(e) => setField('managerPhone', e.target.value)}
              placeholder="+91 91234 56789"
              className="rounded-xl border-white/10 bg-white/5"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-slate-300 block mb-1.5">Manager Email</label>
            <Input
              type="email"
              value={form.managerEmail}
              onChange={(e) => setField('managerEmail', e.target.value)}
              placeholder="manager@business.com"
              className="rounded-xl border-white/10 bg-white/5"
            />
          </div>
        </div>
      </div>
      {/* Branch Admin Login Credentials — only shown when creating */}
      {!isEdit && (
        <div className="pt-2 border-t border-white/5">
          <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Branch Admin Account</p>
          <p className="text-[11px] text-muted-foreground/60 mb-3">
            Optional — creates a staff login account for this branch admin so they can access the dashboard immediately.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5 flex items-center gap-1">
                <Mail className="h-3 w-3" /> Login Email
              </label>
              <Input
                type="email"
                value={form.adminEmail}
                onChange={(e) => setField('adminEmail', e.target.value)}
                placeholder="branch@yourbusiness.com"
                className="rounded-xl border-white/10 bg-white/5"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5 flex items-center gap-1">
                <KeyRound className="h-3 w-3" /> Password
              </label>
              <Input
                type="password"
                value={form.adminPassword}
                onChange={(e) => setField('adminPassword', e.target.value)}
                placeholder="Min 8 characters"
                className="rounded-xl border-white/10 bg-white/5"
                autoComplete="new-password"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function mapBranchFromApi(b: any): Branch {
  return {
    id: b.id,
    name: b.name || '',
    address: b.address || '',
    phone: b.phone || '',
    status: b.isActive === false ? 'Inactive' : 'Active',
    managerName: b.managerName || '',
    managerPhone: b.managerPhone || '',
    managerEmail: b.managerEmail || '',
    hours: b.operatingHours || '',
    geoCoords: b.latitude != null && b.longitude != null ? `${b.latitude}, ${b.longitude}` : '',
  };
}

export default function BranchesPage() {
  const { user } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [deletingBranch, setDeletingBranch] = useState<Branch | null>(null);
  const [form, setForm] = useState<BranchForm>(EMPTY_FORM);

  const businessId = user?.businessId || user?.entity?.id;

  const setField = (key: BranchFormKey, val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const fetchBranches = async () => {
    if (!businessId) return;
    setLoading(true);
    const res = await apiService.get<any>(`/v1/businesses/${businessId}/branches`);
    if (res.data && !res.error) {
      const list = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      setBranches(list.map(mapBranchFromApi));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBranches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  const handleOpenAdd = () => {
    setForm(EMPTY_FORM);
    setError('');
    setIsAddOpen(true);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !businessId) return;
    setSaving(true);
    setError('');
    const payload: any = {
      name: form.name,
      address: form.address,
      phone: form.phone,
      managerName: form.managerName,
      managerPhone: form.managerPhone,
      managerEmail: form.managerEmail,
      operatingHours: form.hours,
      geoCoords: form.geoCoords,
    };
    // Only include admin credentials if both fields are filled
    if (form.adminEmail.trim() && form.adminPassword.trim()) {
      payload.adminEmail = form.adminEmail.trim();
      payload.adminPassword = form.adminPassword;
      payload.adminName = form.managerName || undefined;
      payload.adminPhone = form.managerPhone || undefined;
    }
    const res = await apiService.post<any>(`/v1/businesses/${businessId}/branches`, payload);
    setSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setBranches([mapBranchFromApi(res.data), ...branches]);
    setIsAddOpen(false);
  };

  const handleOpenEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setForm({
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
      managerName: branch.managerName,
      managerPhone: branch.managerPhone,
      managerEmail: branch.managerEmail,
      hours: branch.hours,
      geoCoords: branch.geoCoords,
      adminEmail: '',
      adminPassword: '',
    });
    setError('');
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !editingBranch) return;
    setSaving(true);
    setError('');
    const res = await apiService.patch<any>(`/v1/branches/${editingBranch.id}`, {
      name: form.name,
      address: form.address,
      phone: form.phone,
      managerName: form.managerName,
      managerPhone: form.managerPhone,
      managerEmail: form.managerEmail,
      operatingHours: form.hours,
      geoCoords: form.geoCoords,
    });
    setSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setBranches(branches.map((b) => (b.id === editingBranch.id ? mapBranchFromApi(res.data) : b)));
    setEditingBranch(null);
  };

  const handleDelete = async () => {
    if (!deletingBranch) return;
    setSaving(true);
    const res = await apiService.delete<any>(`/v1/branches/${deletingBranch.id}`);
    setSaving(false);
    if (!res.error) {
      setBranches(branches.filter((b) => b.id !== deletingBranch.id));
      setDeletingBranch(null);
    }
  };

  const toggleStatus = async (id: string) => {
    const branch = branches.find((b) => b.id === id);
    if (!branch) return;
    const newActive = branch.status !== 'Active';
    // Optimistic
    setBranches(branches.map((b) =>
      b.id === id ? { ...b, status: newActive ? 'Active' : 'Inactive' } : b,
    ));
    const res = await apiService.patch<any>(`/v1/branches/${id}`, { isActive: newActive });
    if (res.error) {
      // Revert
      setBranches(branches.map((b) =>
        b.id === id ? { ...b, status: branch.status } : b,
      ));
    }
  };

  return (
    <BusinessLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Branches</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Manage all your business locations.</p>
          </div>
          <Button
            onClick={handleOpenAdd}
            className="rounded-xl gap-2 font-semibold bg-gradient-to-r from-primary to-accent text-primary-foreground cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add Branch
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : branches.length === 0 ? (
          <Card className="p-10 rounded-2xl border-dashed border-white/10 bg-white/5 text-center">
            <MapPin className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-40" />
            <p className="text-foreground font-semibold mb-1">No branches yet</p>
            <p className="text-sm text-muted-foreground">Add your first branch location to get started.</p>
          </Card>
        ) : null}

        <div className="grid gap-4">
          {branches.map((branch) => (
            <Card
              key={branch.id}
              className="p-6 rounded-2xl border-white/5 bg-card/40 backdrop-blur-xl hover:shadow-md transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />

              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <h3 className="text-lg font-bold text-foreground">{branch.name}</h3>
                    <button
                      onClick={() => toggleStatus(branch.id)}
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold cursor-pointer transition-opacity hover:opacity-75 ${
                        branch.status === 'Active'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-white/5 text-muted-foreground border border-white/10'
                      }`}
                    >
                      {branch.status === 'Active' && <CheckCircle2 className="h-3 w-3 inline mr-0.5" />}
                      {branch.status}
                    </button>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-y-1.5 gap-x-6 text-sm">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                      <span className="truncate">{branch.address}</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                      {branch.phone}
                    </span>
                    {branch.hours && (
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                        {branch.hours}
                      </span>
                    )}
                    {branch.managerName && (
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <User className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        {branch.managerName}
                      </span>
                    )}
                    {branch.managerPhone && (
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Phone className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        {branch.managerPhone}
                      </span>
                    )}
                    {branch.geoCoords && (
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Navigation className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                        {branch.geoCoords}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap shrink-0">
                  <Link href={`/dashboard/branches/${branch.id}/performance`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl border-primary/30 text-primary hover:bg-primary/10 gap-1.5 cursor-pointer"
                    >
                      <BarChart3 className="h-3.5 w-3.5" />
                      Performance
                    </Button>
                  </Link>
                  <Button
                    onClick={() => handleOpenEdit(branch)}
                    variant="outline"
                    size="sm"
                    className="rounded-xl border-white/10 text-slate-300 hover:bg-white/5 gap-1.5 cursor-pointer"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    onClick={() => setDeletingBranch(branch)}
                    variant="outline"
                    size="sm"
                    className="rounded-xl border-rose-500/20 text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Add modal */}
        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-xl p-6 rounded-2xl border-white/10 bg-zinc-900 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-foreground">Add Branch Location</h3>
                <button onClick={() => setIsAddOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                  <X className="h-5 w-5" />
                </button>
              </div>
              {error && (
                <p className="mb-3 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{error}</p>
              )}
              <form onSubmit={handleAdd} className="space-y-4">
                <BranchFormFields form={form} setField={setField} isEdit={false} />
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} className="flex-1 rounded-xl border-white/10 text-slate-300 hover:bg-white/5 cursor-pointer">Cancel</Button>
                  <Button type="submit" disabled={saving} className="flex-1 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold cursor-pointer">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Branch'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* Edit modal */}
        {editingBranch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-xl p-6 rounded-2xl border-white/10 bg-zinc-900 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-foreground">Edit Branch</h3>
                <button onClick={() => setEditingBranch(null)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                  <X className="h-5 w-5" />
                </button>
              </div>
              {error && (
                <p className="mb-3 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{error}</p>
              )}
              <form onSubmit={handleEdit} className="space-y-4">
                <BranchFormFields form={form} setField={setField} isEdit={true} />
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setEditingBranch(null)} className="flex-1 rounded-xl border-white/10 text-slate-300 hover:bg-white/5 cursor-pointer">Cancel</Button>
                  <Button type="submit" disabled={saving} className="flex-1 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold cursor-pointer">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* Delete confirm */}
        {deletingBranch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-sm p-6 rounded-2xl border-white/10 bg-zinc-900 shadow-2xl text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 mb-4">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-foreground mb-2">Delete Branch?</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Permanently delete <span className="font-bold text-foreground">&quot;{deletingBranch.name}&quot;</span>?
              </p>
              <div className="flex gap-3">
                <Button onClick={() => setDeletingBranch(null)} variant="outline" className="flex-1 rounded-xl border-white/10 text-slate-300 cursor-pointer hover:bg-white/5">Cancel</Button>
                <Button onClick={handleDelete} disabled={saving} className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white cursor-pointer">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </BusinessLayout>
  );
}
