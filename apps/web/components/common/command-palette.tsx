'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import {
  Search,
  MapPin,
  Grid,
  Ticket,
  CalendarDays,
  FileText,
  Heart,
  Bell,
  Store,
  User,
  Clock,
  TrendingUp,
  ArrowRight,
  Utensils,
  HeartPulse,
  ShoppingBag,
  Wrench,
  GraduationCap,
} from 'lucide-react';
import { apiService } from '@/lib/services/api-service';
import { useAuth } from '@/hooks/use-auth';
import { useNavArea, useNavSpec } from '@/hooks/use-nav';
import { allItems, type NavArea } from '@/lib/nav/config';

const RECENTS_KEY = 'recent_searches';

const QUICK_ACTIONS = [
  { label: 'List your business', href: '/register', icon: Store },
  { label: 'Nearby', href: '/nearby', icon: MapPin },
  { label: 'Offers', href: '/offers', icon: Ticket },
  { label: 'Events', href: '/events', icon: CalendarDays },
  { label: 'Notifications', href: '/notifications', icon: Bell },
];

const NAVIGATE = [
  { label: 'Browse businesses', href: '/category', icon: Grid },
  { label: 'Search', href: '/search', icon: Search },
  { label: 'Announcements', href: '/government', icon: FileText },
  { label: 'Favorites', href: '/favorites', icon: Heart },
  { label: 'Profile', href: '/profile', icon: User },
];

const CATEGORIES = [
  { label: 'Food & Dining', icon: Utensils },
  { label: 'Health & Wellness', icon: HeartPulse },
  { label: 'Shopping', icon: ShoppingBag },
  { label: 'Services', icon: Wrench },
  { label: 'Education', icon: GraduationCap },
];

/** The workspace a signed-in role lives in, so its pages are searchable from anywhere. */
function homeAreaOf(u: { role?: string; rbacRole?: string } | null): NavArea | null {
  if (!u) return null;
  if (u.role === 'super-admin' || u.rbacRole === 'SUPER_ADMIN') return 'super-admin';
  if (u.role === 'admin' || u.rbacRole === 'MASTER_ADMIN') return 'admin';
  if (u.role === 'government' || u.rbacRole === 'GOVERNMENT_ADMIN') return 'government';
  if (u.role === 'platform_staff' || u.rbacRole === 'PLATFORM_STAFF') return 'staff';
  if (u.role === 'civic') return 'civic';
  if (u.role === 'business' || u.rbacRole?.startsWith('BUSINESS_')) return 'business';
  return null;
}

export function CommandPalette({ autoOpen = false }: { autoOpen?: boolean } = {}) {
  const router = useRouter();
  const { user } = useAuth();
  // Pages of the area being viewed, plus the signed-in role's own workspace (so an admin can
  // jump to "Payments" while browsing the public site).
  const viewedArea = useNavArea();
  const homeArea = homeAreaOf(user) ?? viewedArea;
  const viewedPages = allItems(useNavSpec(viewedArea));
  const homePages = allItems(useNavSpec(homeArea));
  const workspacePages = [...homePages, ...viewedPages].filter(
    (p, i, all) => all.findIndex((x) => x.href === p.href) === i,
  );
  // autoOpen: mounted by CommandPaletteLoader in response to the first open request.
  const [open, setOpen] = useState(autoOpen);
  const [query, setQuery] = useState('');
  const [recents, setRecents] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<{ id?: string; label: string }[]>([]);
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ⌘K / Ctrl+K toggle + external open event (header search dispatches this)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e instanceof KeyboardEvent &&
        (e.metaKey || e.ctrlKey) &&
        typeof e.key === 'string' &&
        e.key.toLowerCase() === 'k'
      ) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    document.addEventListener('keydown', onKey);
    window.addEventListener('open-command-palette', onOpen);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('open-command-palette', onOpen);
    };
  }, []);

  // Load recents when opened
  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem(RECENTS_KEY);
      setRecents(raw ? JSON.parse(raw).slice(0, 5) : []);
    } catch {
      setRecents([]);
    }
  }, [open]);

  // Debounced live suggestions
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    debounce.current = setTimeout(async () => {
      try {
        const res = await apiService.get<any>(`/v1/search/suggestions?q=${encodeURIComponent(q)}`);
        const raw = Array.isArray(res.data)
          ? res.data
          : (res.data?.data ?? res.data?.suggestions ?? []);
        setSuggestions(
          raw
            .map((s: any) =>
              typeof s === 'string'
                ? { label: s }
                : { id: s.id ?? s.businessId, label: s.name ?? s.title ?? s.label ?? s.text },
            )
            .filter((s: any) => s.label)
            .slice(0, 6),
        );
      } catch {
        setSuggestions([]);
      }
    }, 220);
    return () => debounce.current && clearTimeout(debounce.current);
  }, [query]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      setQuery('');
      router.push(href);
    },
    [router],
  );

  const runSearch = useCallback(
    (term: string) => {
      const q = term.trim();
      if (!q) return;
      try {
        const next = [q, ...recents.filter((r) => r.toLowerCase() !== q.toLowerCase())].slice(0, 5);
        localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      go(`/search?q=${encodeURIComponent(q)}`);
    },
    [recents, go],
  );

  const clearRecents = () => {
    try {
      localStorage.removeItem(RECENTS_KEY);
    } catch {
      /* ignore */
    }
    setRecents([]);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      className="max-w-xl"
      title="Search Whtzup.city"
      description="Search businesses, offers, events, and civic services, or jump to a page."
    >
      <CommandInput
        placeholder="Search everything…"
        value={query}
        onValueChange={setQuery}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && query.trim() && suggestions.length === 0) {
            e.preventDefault();
            runSearch(query);
          }
        }}
      />
      <CommandList>
        <CommandEmpty>No matches — press Enter to search for “{query}”.</CommandEmpty>

        {query.trim() && (
          <CommandGroup heading="Search">
            <CommandItem value={`search ${query}`} onSelect={() => runSearch(query)}>
              <Search />
              <span>Search for “{query.trim()}”</span>
              <ArrowRight className="ml-auto opacity-50" />
            </CommandItem>
            {suggestions.map((s, i) => (
              <CommandItem
                key={s.id ?? `${s.label}-${i}`}
                value={`sugg ${s.label}`}
                onSelect={() => (s.id ? go(`/business/${s.id}`) : runSearch(s.label))}
              >
                <TrendingUp />
                <span>{s.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {!query.trim() && recents.length > 0 && (
          <CommandGroup heading="Recent searches">
            {recents.map((r) => (
              <CommandItem key={r} value={`recent ${r}`} onSelect={() => runSearch(r)}>
                <Clock />
                <span>{r}</span>
              </CommandItem>
            ))}
            <CommandItem
              value="clear-recents"
              onSelect={clearRecents}
              className="text-muted-foreground"
            >
              <span className="pl-7 text-xs">Clear recent searches</span>
            </CommandItem>
          </CommandGroup>
        )}

        <CommandGroup heading="Quick actions">
          {QUICK_ACTIONS.map((a) => {
            const Icon = a.icon;
            return (
              <CommandItem key={a.href} value={`action ${a.label}`} onSelect={() => go(a.href)}>
                <Icon />
                <span>{a.label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandGroup heading="Popular categories">
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            return (
              <CommandItem
                key={c.label}
                value={`cat ${c.label}`}
                onSelect={() => runSearch(c.label)}
              >
                <Icon />
                <span>{c.label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>

        {user && workspacePages.length > 0 && (
          <CommandGroup heading="Your pages">
            {workspacePages.map((p) => {
              const Icon = p.icon;
              return (
                <CommandItem
                  key={p.href}
                  value={`page ${p.label} ${p.href}`}
                  onSelect={() => go(p.href)}
                >
                  <Icon />
                  <span>{p.label}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        <CommandGroup heading="Go to">
          {NAVIGATE.map((n) => {
            const Icon = n.icon;
            return (
              <CommandItem key={n.href} value={`nav ${n.label}`} onSelect={() => go(n.href)}>
                <Icon />
                <span>{n.label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
