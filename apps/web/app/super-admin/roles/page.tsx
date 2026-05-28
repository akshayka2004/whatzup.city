'use client';

import { useState } from 'react';
import { SuperAdminLayout } from '@/components/layouts/super-admin-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Settings,
  Plus,
  Shield,
  UserCheck,
  X,
  Check,
  Trash2,
  Edit2,
  ShieldAlert,
} from 'lucide-react';

const initialRoles = [
  {
    name: 'SUPER_ADMIN',
    level: 'Level 5 (Platform Owner)',
    users: 2,
    writeAccess: true,
    permissions: ['Audit Log', 'Moderation', 'Billing', 'System Config'],
  },
  {
    name: 'MASTER_ADMIN',
    level: 'Level 4 (Regional Operator)',
    users: 8,
    writeAccess: true,
    permissions: ['Audit Log', 'Moderation', 'Billing'],
  },
  {
    name: 'GOVERNMENT_ADMIN',
    level: 'Level 3 (Public Official)',
    users: 15,
    writeAccess: true,
    permissions: ['Audit Log', 'Moderation'],
  },
  {
    name: 'BUSINESS_ADMIN',
    level: 'Level 2 (Merchant Owner)',
    users: 1204,
    writeAccess: true,
    permissions: ['Billing'],
  },
  { name: 'USER', level: 'Level 1 (Consumer)', users: 34100, writeAccess: false, permissions: [] },
];

export default function SuperAdminRolesPage() {
  const [roles, setRoles] = useState(initialRoles);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [configuringRole, setConfiguringRole] = useState<any>(null);

  // Create role state
  const [name, setName] = useState('');
  const [level, setLevel] = useState('');
  const [writeAccess, setWriteAccess] = useState(true);

  const handleAddRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    const newRole = {
      name: name.toUpperCase().replace(/\s+/g, '_'),
      level: level || 'Level 1',
      users: 0,
      writeAccess,
      permissions: [],
    };
    setRoles([...roles, newRole]);
    setIsAddOpen(false);
    setName('');
    setLevel('');
  };

  const handleTogglePermission = (roleName: string, perm: string) => {
    setRoles(
      roles.map((r) => {
        if (r.name === roleName) {
          const nextPerms = r.permissions.includes(perm)
            ? r.permissions.filter((p) => p !== perm)
            : [...r.permissions, perm];
          if (configuringRole && configuringRole.name === roleName) {
            setConfiguringRole({ ...configuringRole, permissions: nextPerms });
          }
          return { ...r, permissions: nextPerms };
        }
        return r;
      }),
    );
  };

  const handleToggleWriteAccess = (roleName: string) => {
    setRoles(
      roles.map((r) => {
        if (r.name === roleName) {
          const nextWrite = !r.writeAccess;
          if (configuringRole && configuringRole.name === roleName) {
            setConfiguringRole({ ...configuringRole, writeAccess: nextWrite });
          }
          return { ...r, writeAccess: nextWrite };
        }
        return r;
      }),
    );
  };

  const handleDeleteRole = (roleName: string) => {
    setRoles(roles.filter((r) => r.name !== roleName));
    setConfiguringRole(null);
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Role Permissions (RBAC)</h1>
            <p className="text-muted-foreground">
              Adjust system role hierarchies, access levels, and user distributions
            </p>
          </div>
          <Button
            onClick={() => setIsAddOpen(true)}
            className="rounded-xl gap-2 font-medium bg-gradient-to-r from-primary to-accent text-primary-foreground"
          >
            <Plus className="h-4 w-4" /> Add Role
          </Button>
        </div>

        <div className="space-y-4">
          {roles.map((role) => (
            <Card
              key={role.name}
              className="p-6 rounded-2xl border-border bg-card/40 backdrop-blur-xl hover:bg-card/50 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-violet-500/10 text-violet-400 rounded-xl h-11 w-11 flex items-center justify-center border border-violet-500/20">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-base">{role.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{role.level}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-sm border-t sm:border-t-0 pt-4 sm:pt-0 border-border">
                  <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                    <UserCheck className="h-4 w-4" />
                    {role.users.toLocaleString()} accounts
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      role.writeAccess
                        ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                        : 'bg-secondary/40 text-muted-foreground border border-border'
                    }`}
                  >
                    {role.writeAccess ? 'Write Access' : 'Read Only'}
                  </span>
                  <Button
                    onClick={() => setConfiguringRole(role)}
                    size="sm"
                    variant="ghost"
                    className="rounded-lg h-8 text-xs font-semibold hover:bg-muted"
                  >
                    Configure
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* ── ADD ROLE MODAL ─────────────────────────────── */}
        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-md p-6 rounded-2xl border-border bg-card shadow-2xl relative">
              <button
                onClick={() => setIsAddOpen(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              <h3 className="text-xl font-bold text-foreground mb-4">Add Custom Role</h3>
              <form onSubmit={handleAddRole} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-2">
                    Role ID Name
                  </label>
                  <Input
                    placeholder="e.g. MARKETING_AGENT"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="rounded-xl border-input bg-background focus:border-primary text-foreground"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-2">
                    Role Level Description
                  </label>
                  <Input
                    placeholder="e.g. Level 2 (Promotional Access)"
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="rounded-xl border-input bg-background focus:border-primary text-foreground"
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-secondary/40 rounded-xl border border-border">
                  <div>
                    <p className="text-xs font-semibold text-foreground">Write Access Allowed</p>
                    <p className="text-[10px] text-muted-foreground">
                      Allows mutation requests like creation, update, and deletions
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setWriteAccess(!writeAccess)}
                    variant={writeAccess ? 'default' : 'outline'}
                    className="h-7 text-xs rounded-lg"
                  >
                    {writeAccess ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddOpen(false)}
                    className="rounded-xl border-border hover:bg-muted text-foreground"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold"
                  >
                    Create Role
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* ── CONFIGURE ROLE MODAL ───────────────────────── */}
        {configuringRole && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-lg p-6 rounded-2xl border-border bg-card shadow-2xl relative max-h-[85vh] overflow-y-auto">
              <button
                onClick={() => setConfiguringRole(null)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-primary/10 text-primary rounded-xl">
                  <Settings className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">
                    Configure {configuringRole.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">{configuringRole.level}</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <h4 className="text-sm font-semibold text-foreground">Modify Write Privileges</h4>
                <div className="flex items-center justify-between p-4 bg-secondary/40 rounded-xl border border-border">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Global Mutate Permission
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Allows database create/update/delete operations
                    </p>
                  </div>
                  <Button
                    onClick={() => handleToggleWriteAccess(configuringRole.name)}
                    variant={configuringRole.writeAccess ? 'default' : 'outline'}
                    className="rounded-xl font-semibold"
                  >
                    {configuringRole.writeAccess ? 'Write Access Active' : 'Read Only Active'}
                  </Button>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <h4 className="text-sm font-semibold text-foreground">
                  Feature Access Permissions
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {['Audit Log', 'Moderation', 'Billing', 'System Config'].map((perm) => {
                    const hasPerm = configuringRole.permissions.includes(perm);
                    return (
                      <div
                        key={perm}
                        onClick={() => handleTogglePermission(configuringRole.name, perm)}
                        className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-colors ${
                          hasPerm
                            ? 'bg-primary/10 border-primary text-foreground'
                            : 'bg-secondary/40 border-border text-muted-foreground hover:bg-secondary/80'
                        }`}
                      >
                        <span className="text-xs font-semibold">{perm}</span>
                        {hasPerm && <Check className="h-4 w-4 text-primary" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-between items-center border-t border-border pt-6 mt-6">
                <Button
                  onClick={() => handleDeleteRole(configuringRole.name)}
                  variant="outline"
                  className="rounded-xl border-rose-500/20 text-rose-400 hover:bg-rose-500/10 gap-1"
                >
                  <Trash2 className="h-4 w-4" /> Delete Role
                </Button>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setConfiguringRole(null)}
                    variant="outline"
                    className="rounded-xl border-border hover:bg-muted text-foreground"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => setConfiguringRole(null)}
                    className="rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold"
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
}
