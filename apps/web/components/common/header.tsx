'use client';

import {
  Moon,
  Sun,
  Search,
  Bell,
  Settings,
  LogIn,
  Sparkles,
  User as UserIcon,
  Building2,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';

export function Header() {
  const { theme, setTheme } = useTheme();
  const { user, signOut, switchRole } = useAuth();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const roleColors = {
    user: 'bg-blue-600/20 text-blue-400 border-blue-500/20',
    business: 'bg-purple-600/20 text-purple-400 border-purple-500/20',
    admin: 'bg-amber-600/20 text-amber-400 border-amber-500/20',
    'super-admin': 'bg-rose-600/20 text-rose-400 border-rose-500/20',
  };

  const roleLabels = {
    user: 'Public User',
    business: 'Business Owner',
    admin: 'Admin Moderator',
    'super-admin': 'Super Admin',
  };

  return (
    <header className="border-b border-border bg-card px-6 py-4 shadow-sm flex items-center justify-between">
      <div className="flex items-center gap-4 flex-1 max-w-lg">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search..." className="pl-10 rounded-lg border-input bg-secondary" />
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Active Role Indicator */}
        {user && (
          <div
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${roleColors[user.role]}`}
          >
            <Sparkles className="h-3 w-3" />
            {roleLabels[user.role]}
          </div>
        )}

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="rounded-lg"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="rounded-lg">
          <Bell className="h-5 w-5" />
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-lg hover:bg-white/5">
              <Settings className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 rounded-xl border-white/5 bg-card/95 backdrop-blur-xl"
          >
            <DropdownMenuLabel className="font-semibold text-xs text-muted-foreground">
              Demo Role Switcher
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => switchRole('user')}
              className="gap-2 cursor-pointer rounded-lg"
            >
              <UserIcon className="h-4 w-4 text-blue-400" />
              <span>Log in as Public</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => switchRole('business')}
              className="gap-2 cursor-pointer rounded-lg"
            >
              <Building2 className="h-4 w-4 text-purple-400" />
              <span>Log in as Business</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => switchRole('admin')}
              className="gap-2 cursor-pointer rounded-lg"
            >
              <ShieldAlert className="h-4 w-4 text-amber-400" />
              <span>Log in as Admin</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => switchRole('super-admin')}
              className="gap-2 cursor-pointer rounded-lg"
            >
              <ShieldCheck className="h-4 w-4 text-rose-400" />
              <span>Log in as Super Admin</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-white/5" />

            <DropdownMenuLabel className="font-semibold text-xs text-muted-foreground">
              Account Actions
            </DropdownMenuLabel>
            {user ? (
              <>
                <Link href="/profile">
                  <DropdownMenuItem className="cursor-pointer rounded-lg">
                    Profile Settings
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuItem
                  onClick={() => signOut()}
                  className="text-destructive cursor-pointer rounded-lg"
                >
                  Sign Out
                </DropdownMenuItem>
              </>
            ) : (
              <Link href="/login">
                <DropdownMenuItem className="text-primary font-semibold cursor-pointer rounded-lg gap-2">
                  <LogIn className="h-4 w-4" />
                  Sign In
                </DropdownMenuItem>
              </Link>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User avatar */}
        {user ? (
          <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shadow-md">
            {getInitials(user.name)}
          </div>
        ) : (
          <Link href="/login">
            <Button
              size="sm"
              className="rounded-xl gap-2 font-medium bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-sm"
            >
              <LogIn className="h-4 w-4" />
              Sign In
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
}
