'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Moon,
  Sun,
  Search,
  Bell,
  Settings,
  LogIn,
  Sparkles,
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
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [searchVal, setSearchVal] = useState('');
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const handleSearchSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchVal.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchVal)}`);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const roleColors: Record<string, string> = {
    user: 'bg-blue-600/20 text-blue-400 border-blue-500/20',
    business: 'bg-purple-600/20 text-purple-400 border-purple-500/20',
    admin: 'bg-amber-600/20 text-amber-400 border-amber-500/20',
    'super-admin': 'bg-rose-600/20 text-rose-400 border-rose-500/20',
    government: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/20',
  };

  const roleLabels: Record<string, string> = {
    user: 'Public User',
    business: 'Business Owner',
    admin: 'Admin Moderator',
    'super-admin': 'Super Admin',
    government: 'Government',
  };

  // Profile destination based on role
  const getProfileHref = () => {
    if (!user) return '/login';
    switch (user.role) {
      case 'business': return '/dashboard/settings';
      case 'admin': return '/admin';
      case 'super-admin': return '/super-admin/tenants';
      case 'government': return '/government/dashboard';
      default: return '/profile';
    }
  };
  const profileHref = getProfileHref();

  return (
    <header className="border-b border-border bg-card px-4 py-3 md:px-6 md:py-4 shadow-sm flex items-center justify-between h-16">
      {/* Mobile Logo Fallback */}
      <div className="flex items-center gap-2 md:hidden">
        <Link href="/">
          <img src="/logo.png" alt="Whtzup.city Logo" className="h-8 w-auto object-contain cursor-pointer" />
        </Link>
      </div>

      {/* Desktop Search Input */}
      <div className="hidden md:flex items-center gap-4 flex-1 max-w-lg">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="pl-10 rounded-lg border-input bg-secondary"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            onKeyDown={handleSearchSubmit}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {/* Active Role Indicator */}
        {user && (
          <div
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${roleColors[user.role]}`}
          >
            <Sparkles className="h-3 w-3" />
            {roleLabels[user.role]}
          </div>
        )}

        {/* Theme toggle — mounted guard prevents hydration mismatch */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className="rounded-lg h-11 w-11 md:h-9 md:w-9 flex items-center justify-center cursor-pointer"
          suppressHydrationWarning
        >
          {mounted && resolvedTheme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="rounded-lg h-11 w-11 md:h-9 md:w-9 flex items-center justify-center cursor-pointer">
          <Bell className="h-5 w-5" />
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-lg hover:bg-white/5 h-11 w-11 md:h-9 md:w-9 flex items-center justify-center cursor-pointer">
              <Settings className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 rounded-xl border-white/5 bg-card/95 backdrop-blur-xl"
          >
            <DropdownMenuLabel className="font-semibold text-xs text-muted-foreground">
              Account Actions
            </DropdownMenuLabel>
            {user ? (
              <>
                <Link href={profileHref}>
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
          <Link href={profileHref}>
            <div className="h-10 w-10 md:h-9 md:w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shadow-md cursor-pointer hover:opacity-80 transition-opacity">
              {getInitials(user.name)}
            </div>
          </Link>
        ) : (
          <Link href="/login">
            <Button
              size="sm"
              className="rounded-xl gap-2 font-medium bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-sm h-10 px-4 md:h-9 md:px-3 cursor-pointer"
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
