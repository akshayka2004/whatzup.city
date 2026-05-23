'use client';

import { useState } from 'react';
import { PublicLayout } from '@/components/layouts/public-layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Search, MapPin, Star, Zap, Megaphone, Shield,
  ArrowRight, CheckCircle2,
  Receipt, Tag, ChevronRight, Sparkles, Globe,
  ShoppingBag, Stethoscope, Laptop, GraduationCap,
  Utensils, Plane, Dumbbell, Quote, Building2, Bell
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

/* ────────────── DATA ────────────── */
const STATS = [
  { label: 'Registered Businesses', value: '1,420+', icon: Building2 },
  { label: 'Active Promotions',      value: '340+',   icon: Tag },
  { label: 'Verified Invoices',      value: '12K+',   icon: Receipt },
  { label: 'Local Communities',      value: '25+',    icon: Globe },
];

const FEATURES = [
  {
    icon: Search,
    title: 'Precision Directory',
    description: 'Find local providers instantly using refined search criteria, tags, and proximity mapping.',
  },
  {
    icon: Tag,
    title: 'Direct Consumer Offers',
    description: 'Claim geo-targeted discounts, limited-time flash sales, and rewards from neighbourhood shops.',
  },
  {
    icon: Shield,
    title: 'Trust & Verification',
    description: 'Every merchant undergoes rigorous regulatory and business-licence verification.',
  },
  {
    icon: MapPin,
    title: 'Geographic Discovery',
    description: 'Discover verified utility services, artisan spots, and essential shops closest to you.',
  },
  {
    icon: Megaphone,
    title: 'Civic Alert Broadcasts',
    description: 'Keep tabs on administrative notices, utility updates, roadworks, and townhall briefs.',
  },
  {
    icon: Star,
    title: 'Invoice-Verified Reviews',
    description: 'Reviews backed by actual transaction bill uploads — 100% credible feedback guaranteed.',
  },
];

const CATEGORIES = [
  { label: 'Restaurants',          icon: Utensils,       slug: 'restaurants' },
  { label: 'Shopping & Retail',    icon: ShoppingBag,    slug: 'shopping' },
  { label: 'Professional Services',icon: Sparkles,       slug: 'services' },
  { label: 'Medical & Health',     icon: Stethoscope,    slug: 'healthcare' },
  { label: 'Education Hubs',       icon: GraduationCap,  slug: 'education' },
  { label: 'Tech & Agency',        icon: Laptop,         slug: 'technology' },
  { label: 'Logistics & Travel',   icon: Plane,          slug: 'travel' },
  { label: 'Health & Fitness',     icon: Dumbbell,       slug: 'fitness' },
];

const TESTIMONIALS = [
  {
    name: 'Priya Sharma',
    role: 'Local Resident',
    text: "I discovered multiple verified organic bakeries near me I didn't know existed. Reviews backed by real bills make all the difference.",
    avatar: 'PS',
  },
  {
    name: 'Rajan Mehta',
    role: 'Café Owner',
    text: 'Listing our coffee shop here was straightforward. We gained significant foot traffic in the first month simply by offering a claimed coupon.',
    avatar: 'RM',
  },
  {
    name: 'Anita Verma',
    role: 'Ward Moderator',
    text: 'The dashboard makes alerting residents about street repairs and utility outages extremely simple. People stay informed instantly.',
    avatar: 'AV',
  },
];

/* ────────────── COMPONENT ────────────── */
export default function HomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = () => {
    router.push(searchQuery.trim() ? `/search?q=${encodeURIComponent(searchQuery)}` : '/search');
  };

  return (
    <PublicLayout>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="relative mb-10 md:mb-14 rounded-2xl overflow-hidden border border-border bg-card">
        {/* Subtle gradient wash */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-transparent pointer-events-none" />

        <div className="relative grid lg:grid-cols-12 gap-6 lg:gap-0 items-stretch min-h-[440px]">

          {/* Left content */}
          <div className="lg:col-span-7 flex flex-col justify-center px-6 py-10 lg:px-10 lg:py-14 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold w-fit">
              <Sparkles className="h-3.5 w-3.5" />
              Kerala's Local Business & Civic Platform
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-foreground leading-tight tracking-tight">
                Discover Local<br />
                <span className="text-primary">Businesses & Offers</span>
              </h1>
              <p className="text-sm md:text-base text-muted-foreground max-w-md leading-relaxed">
                Find verified local businesses, claim exclusive deals, verify bills, and stay informed with real-time official civic updates in your neighbourhood.
              </p>
            </div>

            {/* Search */}
            <div className="flex flex-col sm:flex-row gap-3 max-w-lg">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Restaurants, doctors, shops…"
                  className="pl-10 h-11 text-sm rounded-xl border-border bg-background focus:border-primary"
                />
              </div>
              <Button
                onClick={handleSearch}
                className="h-11 px-5 rounded-xl font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 cursor-pointer"
              >
                Search
              </Button>
            </div>

            {/* Trending tags */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                Trending:
              </span>
              {['Restaurants', 'Healthcare', 'Shopping', 'Services'].map((cat) => (
                <Link
                  key={cat}
                  href={`/category?type=${cat.toLowerCase()}`}
                  className="px-3 py-1 rounded-lg bg-secondary border border-border text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
                >
                  {cat}
                </Link>
              ))}
            </div>
          </div>

          {/* Right panel — hidden on mobile */}
          <div className="hidden lg:flex lg:col-span-5 bg-secondary/60 border-l border-border items-center justify-center relative p-8 overflow-hidden">
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-primary/8 rounded-full blur-2xl" />

            <div className="relative space-y-4 w-full max-w-xs">
              {/* Business preview card */}
              <Card className="p-4 rounded-xl border-border bg-card shadow-md">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0">
                    <Utensils className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <h4 className="font-bold text-foreground text-sm truncate">Bella Restaurant</h4>
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                    </div>
                    <p className="text-xs text-muted-foreground">Authentic Italian Cuisine</p>
                    <div className="flex items-center gap-1 mt-2">
                      <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                      <span className="text-xs font-bold text-foreground">4.8</span>
                      <span className="text-xs text-muted-foreground">(234 reviews)</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20 shrink-0">
                    Open
                  </span>
                </div>
              </Card>

              {/* Offer card */}
              <Card className="p-4 rounded-xl border-border bg-card shadow-md">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/15 border border-primary/20">
                    <Tag className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Fashion Hub Boutique</p>
                    <p className="text-sm font-bold text-foreground">Flat 20% Off Storewide</p>
                  </div>
                  <span className="text-[10px] font-extrabold text-primary bg-primary/10 border border-primary/20 px-2 py-1 rounded-lg font-mono">
                    FASHION20
                  </span>
                </div>
              </Card>

              {/* Civic notice */}
              <Card className="p-3 rounded-xl border-border bg-card shadow-md">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Civic Notice</p>
                    <p className="text-xs text-foreground font-semibold">MG Road Maintenance: Alternate Route</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10 md:mb-14">
        {STATS.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="p-5 rounded-xl border-border bg-card text-center hover:border-primary/30 transition-colors">
              <div className="flex justify-center mb-2">
                <div className="p-2 rounded-lg bg-primary/12 border border-primary/20">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
              </div>
              <span className="text-2xl font-black text-foreground block">{stat.value}</span>
              <p className="text-xs text-muted-foreground font-medium mt-1">{stat.label}</p>
            </Card>
          );
        })}
      </section>

      {/* ── CATEGORIES ───────────────────────────────────────────────── */}
      <section className="mb-10 md:mb-14">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-black text-foreground">Browse Categories</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Explore services and listings filtered by sector</p>
          </div>
          <Link href="/category" className="flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
            View all <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {CATEGORIES.map(({ label, icon: Icon, slug }) => (
            <Link key={label} href={`/category?type=${slug}`}>
              <Card className="p-4 rounded-xl border-border bg-card hover:border-primary/30 hover:bg-secondary/50 transition-all cursor-pointer group h-[120px] flex flex-col justify-between">
                <div className="w-10 h-10 rounded-lg bg-primary/12 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-foreground text-sm leading-tight">{label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-0.5 group-hover:text-primary transition-colors">
                    Explore <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────── */}
      <section className="mb-10 md:mb-14">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-black text-foreground mb-2">Platform Capabilities</h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto leading-relaxed">
            A complete trust-oriented suite serving local customers, verified sellers, and civic administrators.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="p-6 rounded-xl border-border bg-card hover:border-primary/30 transition-all group">
                <div className="w-11 h-11 rounded-xl bg-primary/12 border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-bold text-foreground mb-2 text-sm">{feature.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────────────── */}
      <section className="mb-10 md:mb-14">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-black text-foreground mb-2">Community Voices</h2>
          <p className="text-muted-foreground text-sm">Insights from members utilising our ecosystem daily</p>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {TESTIMONIALS.map((t) => (
            <Card key={t.name} className="p-6 rounded-xl border-border bg-card relative hover:border-primary/30 transition-all">
              <Quote className="absolute top-5 right-5 h-7 w-7 text-border pointer-events-none" />
              <div className="flex items-center gap-1 mb-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-primary text-primary" />
                ))}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-5 italic">"{t.text}"</p>
              <div className="flex items-center gap-3 pt-4 border-t border-border">
                <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary text-xs font-black shrink-0">
                  {t.avatar}
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">{t.name}</p>
                  <p className="text-[11px] text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="relative rounded-2xl overflow-hidden border border-primary/20 bg-primary/8 mb-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative px-6 py-10 md:px-10 md:py-14 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/15 border border-primary/25 mb-4">
            <Globe className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-foreground mb-3">
            Expand Your Local Reach Today
          </h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto text-sm leading-relaxed">
            Join thousands discovering businesses, claiming deals, verifying invoices, and staying informed on Whtzup.city — Kerala's trusted local directory.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link href="/search">
              <Button className="rounded-xl h-11 px-6 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer">
                <Search className="h-4 w-4 mr-2" />
                Explore Listings
              </Button>
            </Link>
            <Link href="/register">
              <Button
                variant="outline"
                className="rounded-xl h-11 px-6 font-semibold border-primary/30 text-foreground hover:bg-primary/10 cursor-pointer"
              >
                Get Started Free
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

    </PublicLayout>
  );
}
