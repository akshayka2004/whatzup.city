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
  Utensils, Plane, Dumbbell, Quote
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const STATS = [
  { label: 'Registered Businesses', value: '1,420+', icon: CheckCircle2, color: 'text-emerald-400 bg-emerald-500/10' },
  { label: 'Active Promotions', value: '340+', icon: Tag, color: 'text-amber-400 bg-amber-500/10' },
  { label: 'Verified Invoices', value: '12K+', icon: Receipt, color: 'text-cyan-400 bg-cyan-500/10' },
  { label: 'Local Communities', value: '25+', icon: Globe, color: 'text-violet-400 bg-violet-500/10' },
];

const FEATURES = [
  {
    icon: Search,
    title: 'Precision Directory',
    description: 'Find local providers instantly using refined search criteria, tags, and proximity mapping.',
    gradient: 'from-violet-600/15 via-purple-600/5 to-transparent',
    iconColor: 'text-violet-400',
    bg: 'bg-violet-500/10 border border-violet-500/20',
  },
  {
    icon: Tag,
    title: 'Direct Consumer Offers',
    description: 'Claim geo-targeted discounts, limited-time flash sales, and rewards from neighborhood shops.',
    gradient: 'from-emerald-600/15 via-green-600/5 to-transparent',
    iconColor: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border border-emerald-500/20',
  },
  {
    icon: Shield,
    title: 'Trust & Verification',
    description: 'Avoid spam. Every merchant undergoes rigorous regulatory and business-license verification.',
    gradient: 'from-blue-600/15 via-indigo-600/5 to-transparent',
    iconColor: 'text-blue-400',
    bg: 'bg-blue-500/10 border border-blue-500/20',
  },
  {
    icon: MapPin,
    title: 'Geographic Discovery',
    description: 'Discover verified utility services, artisan spots, and essential shops closest to your coordinates.',
    gradient: 'from-cyan-600/15 via-blue-600/5 to-transparent',
    iconColor: 'text-cyan-400',
    bg: 'bg-cyan-500/10 border border-cyan-500/20',
  },
  {
    icon: Megaphone,
    title: 'Civic Alert Broadcasts',
    description: 'Keep tabs on administrative notices, utility updates, roadworks, and townhall briefs.',
    gradient: 'from-rose-600/15 via-pink-600/5 to-transparent',
    iconColor: 'text-rose-400',
    bg: 'bg-rose-500/10 border border-rose-500/20',
  },
  {
    icon: Star,
    title: 'Invoice-Verified Reviews',
    description: 'Read reviews backed by actual transaction bill uploads, guaranteeing 100% credible feedback.',
    gradient: 'from-amber-600/15 via-yellow-600/5 to-transparent',
    iconColor: 'text-amber-400',
    bg: 'bg-amber-500/10 border border-amber-500/20',
  },
];

const CATEGORIES = [
  { label: 'Restaurants', icon: Utensils, color: 'text-orange-400', bg: 'bg-orange-500/10 hover:border-orange-500/30', slug: 'restaurants' },
  { label: 'Shopping & Retail', icon: ShoppingBag, color: 'text-pink-400', bg: 'bg-pink-500/10 hover:border-pink-500/30', slug: 'shopping' },
  { label: 'Professional Services', icon: Sparkles, color: 'text-violet-400', bg: 'bg-violet-500/10 hover:border-violet-500/30', slug: 'services' },
  { label: 'Medical & Health', icon: Stethoscope, color: 'text-emerald-400', bg: 'bg-emerald-500/10 hover:border-emerald-500/30', slug: 'healthcare' },
  { label: 'Education Hubs', icon: GraduationCap, color: 'text-cyan-400', bg: 'bg-cyan-500/10 hover:border-cyan-500/30', slug: 'education' },
  { label: 'Tech & Agency', icon: Laptop, color: 'text-blue-400', bg: 'bg-blue-500/10 hover:border-blue-500/30', slug: 'technology' },
  { label: 'Logistics & Travel', icon: Plane, color: 'text-amber-400', bg: 'bg-amber-500/10 hover:border-amber-500/30', slug: 'travel' },
  { label: 'Health & Fitness', icon: Dumbbell, color: 'text-rose-400', bg: 'bg-rose-500/10 hover:border-rose-500/30', slug: 'fitness' },
];

const FEATURED_BUSINESSES = [
  { id: 1, name: 'Bella Restaurant', category: 'Restaurants', rating: 4.8, reviews: 234, verified: true, tag: 'Trending', image: '/bella_restaurant.png' },
  { id: 2, name: 'Health Plus Clinic', category: 'Healthcare', rating: 4.9, reviews: 342, verified: true, tag: 'Top Rated', image: '/health_plus_clinic.png' },
  { id: 3, name: 'Fashion Hub Boutique', category: 'Shopping & Retail', rating: 4.5, reviews: 89, verified: true, tag: 'Popular', image: '/fashion_hub.png' },
  { id: 4, name: 'Tech Solutions Ltd.', category: 'Professional Services', rating: 4.6, reviews: 156, verified: true, tag: 'Verified Agency', image: '/tech_solutions.png' },
];

const TESTIMONIALS = [
  {
    name: 'Priya Sharma',
    role: 'Local Resident',
    text: 'I discovered multiple verified organic bakeries near me that I didn\'t know existed. Knowing the reviews are backed by actual bill submissions makes all the difference!',
    avatar: 'PS',
    rating: 5,
    gradient: 'from-violet-500 to-indigo-500',
  },
  {
    name: 'Rajan Mehta',
    role: 'Café Owner',
    text: 'Listing our coffee shop here was exceptionally straightforward. We gained massive foot traffic in our first month simply by offering a claimed coupon.',
    avatar: 'RM',
    rating: 5,
    gradient: 'from-emerald-500 to-teal-500',
  },
  {
    name: 'Anita Verma',
    role: 'Ward Moderator',
    text: 'The dashboard makes alerting our neighborhood about street repairs and utility outages extremely simple. Residents stay informed instantly.',
    avatar: 'AV',
    rating: 5,
    gradient: 'from-pink-500 to-rose-500',
  },
];

export default function HomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    } else {
      router.push('/search');
    }
  };

  return (
    <PublicLayout>
      {/* ── Hero Split Layout ─────────────────────────────────────────── */}
      <div className="relative mb-16 rounded-3xl overflow-hidden border border-white/5 bg-card/25 backdrop-blur-xl">
        {/* Decorative background blurs */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent pointer-events-none" />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/25 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-accent/15 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '10s' }} />

        <div className="relative grid lg:grid-cols-12 gap-12 items-center px-6 py-16 md:py-24 max-w-7xl mx-auto z-10">
          {/* Left Column: Headline and Search */}
          <div className="lg:col-span-7 text-left space-y-6">
            {/* Animated Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold select-none shadow-sm shadow-primary/5">
              <Sparkles className="h-3.5 w-3.5 animate-pulse text-indigo-400" />
              <span>India's #1 Business Discovery Platform</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-black text-foreground leading-tight tracking-tight">
              Discover Local <br />
              <span className="bg-gradient-to-r from-primary via-indigo-400 to-accent bg-clip-text text-transparent">
                Businesses & Offers
              </span>
            </h1>
            
            <p className="text-base md:text-lg text-muted-foreground max-w-xl leading-relaxed">
              Find verified local businesses, claim exclusive deals, verify bills, and stay informed with real-time official civic updates in your neighborhood.
            </p>

            {/* Stylized Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3 max-w-xl">
              <div className="relative flex-1 group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search restaurants, doctors, shops..."
                  className="pl-11 pr-4 py-3 rounded-xl border-white/10 bg-white/5 text-base focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all h-12 shadow-inner"
                />
              </div>
              <Button
                onClick={handleSearch}
                className="rounded-xl px-6 h-12 font-bold bg-gradient-to-r from-primary to-accent hover:brightness-110 active:scale-95 text-primary-foreground shrink-0 shadow-lg shadow-primary/20 transition-all cursor-pointer"
              >
                Search Directory
              </Button>
            </div>

            {/* Trending tags */}
            <div className="flex items-center gap-2 flex-wrap text-sm text-muted-foreground pt-2">
              <span className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/60">Trending:</span>
              {['Restaurants', 'Healthcare', 'Shopping', 'Services'].map((cat) => (
                <Link
                  key={cat}
                  href={`/category?type=${cat.toLowerCase()}`}
                  className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-primary/5 transition-all"
                >
                  {cat}
                </Link>
              ))}
            </div>
          </div>

          {/* Right Column: Floating Glassmorphic Cards (Visual Showcase) */}
          <div className="lg:col-span-5 relative w-full h-[400px] lg:h-[450px] flex items-center justify-center">
            {/* Main Listing Preview Card */}
            <Card className="absolute top-4 left-4 w-72 p-4 rounded-2xl border-white/10 bg-card/75 backdrop-blur-xl shadow-2xl transition-all hover:-translate-y-1 hover:scale-[1.02] duration-300 z-20 group">
              <div className="relative w-full h-32 rounded-xl overflow-hidden mb-3">
                <img
                  src="/bella_restaurant.png"
                  alt="Bella Restaurant Preview"
                  className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[9px] font-bold text-amber-400 border border-white/10">
                  ★ 4.8
                </div>
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-emerald-500/90 text-[9px] font-bold text-white shadow-md">
                  Active Deal
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-foreground text-sm">Bella Restaurant</h4>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 fill-emerald-950/20 shrink-0" />
                </div>
                <p className="text-xs text-muted-foreground">Authentic Italian Cuisine</p>
                <div className="pt-2 flex items-center justify-between text-[11px] border-t border-white/5">
                  <span className="text-muted-foreground">Colaba, Mumbai</span>
                  <span className="font-semibold text-primary">Open Now</span>
                </div>
              </div>
            </Card>

            {/* Overlapping Offer Card */}
            <Card className="absolute bottom-6 right-4 w-60 p-4 rounded-2xl border-white/10 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 backdrop-blur-xl shadow-2xl transition-all hover:translate-y-[-2px] hover:scale-[1.02] duration-300 z-30">
              <div className="flex items-start justify-between mb-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Tag className="h-4 w-4" />
                </div>
                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/20">
                  OFFER CLAIMED
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Fashion Hub boutique</p>
              <h5 className="font-bold text-foreground text-sm mt-0.5">Flat 20% Off Storewide</h5>
              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="bg-black/20 border border-white/5 rounded-lg px-2 py-1 text-[10px] font-mono text-emerald-400 font-bold tracking-wider">
                  FASHION20
                </div>
                <button className="text-[10px] font-extrabold text-white bg-emerald-500 hover:bg-emerald-600 px-3 py-1.5 rounded-lg transition-colors cursor-pointer">
                  Claim
                </button>
              </div>
            </Card>

            {/* Overlapping Civic Notice Badge */}
            <Card className="absolute top-12 right-2 p-3 rounded-xl border-white/10 bg-amber-500/10 backdrop-blur-md shadow-xl flex items-center gap-3 z-10 transition-all hover:scale-[1.02] duration-300 animate-bounce">
              <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </div>
              <div className="text-left">
                <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Civic Notice</p>
                <p className="text-xs text-foreground font-semibold">MG Road Maintenance: Alternate Route</p>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* ── Stats Bar ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
        {STATS.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="p-5 rounded-2xl border-white/5 bg-card/40 backdrop-blur-md text-center hover:border-white/10 transition-all hover:-translate-y-0.5 duration-300">
              <div className="flex justify-center mb-2">
                <div className={`p-2 rounded-xl ${stat.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <span className="text-2xl font-black text-foreground block">{stat.value}</span>
              <p className="text-xs text-muted-foreground font-semibold mt-1">{stat.label}</p>
            </Card>
          );
        })}
      </div>

      {/* ── Categories ───────────────────────────────────────────── */}
      <div className="mb-16">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black text-foreground">Browse Categories</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Explore services and listings filtered by sector</p>
          </div>
          <Link href="/category" className="flex items-center gap-1 text-sm font-semibold text-primary hover:text-indigo-400 transition-colors">
            View all <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {CATEGORIES.map(({ label, icon: Icon, color, bg, slug }) => (
            <Link key={label} href={`/category?type=${slug}`}>
              <Card className="p-5 rounded-2xl border-white/5 bg-card/30 hover:bg-card/65 hover:border-primary/30 hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between h-36">
                <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <div>
                  <p className="font-bold text-foreground text-sm leading-tight">{label}</p>
                  <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1 group-hover:text-primary transition-colors">
                    Explore Directory <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Featured Businesses ───────────────────────────────────── */}
      <div className="mb-16">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black text-foreground">Featured Businesses</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Handpicked premium and verified services</p>
          </div>
          <Link href="/search" className="flex items-center gap-1 text-sm font-semibold text-primary hover:text-indigo-400 transition-colors">
            View all <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURED_BUSINESSES.map((biz) => (
            <Link key={biz.id} href={`/business/${biz.id}`}>
              <Card className="p-4 rounded-2xl border-white/5 bg-card/30 hover:bg-card/65 hover:border-primary/20 hover:shadow-xl transition-all cursor-pointer group relative overflow-hidden flex flex-col h-full justify-between">
                <div>
                  {/* Image Cover */}
                  <div className="relative w-full h-40 rounded-xl overflow-hidden mb-4 border border-white/5 bg-muted">
                    <img
                      src={biz.image}
                      alt={biz.name}
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    {/* Tag */}
                    <span className="absolute top-2.5 right-2.5 text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-primary border border-primary/20">
                      {biz.tag}
                    </span>
                  </div>
                  <h3 className="font-bold text-foreground text-sm mb-0.5 truncate group-hover:text-primary transition-colors">{biz.name}</h3>
                  <p className="text-xs text-muted-foreground mb-3">{biz.category}</p>
                </div>
                <div className="flex items-center gap-1 text-xs pt-3 border-t border-white/5 mt-auto">
                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  <span className="font-bold text-foreground">{biz.rating}</span>
                  <span className="text-muted-foreground">({biz.reviews})</span>
                  {biz.verified && (
                    <span className="ml-auto flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                    </span>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Features ─────────────────────────────────────────────── */}
      <div className="mb-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black text-foreground mb-2">Platform Capabilities</h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto leading-relaxed">
            A complete trust-oriented software suite serving local customers, verified sellers, and local administrators.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.title}
                className={`p-6 rounded-2xl border-white/5 bg-gradient-to-br ${feature.gradient} backdrop-blur-xl group hover:border-white/10 transition-all hover:shadow-lg`}
              >
                <div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className={`h-6 w-6 ${feature.iconColor}`} />
                </div>
                <h3 className="font-bold text-foreground mb-2 text-base">{feature.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ── Testimonials ─────────────────────────────────────────── */}
      <div className="mb-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black text-foreground mb-2">Community Voices</h2>
          <p className="text-muted-foreground text-sm">Read insights from members utilizing our ecosystem daily</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <Card key={t.name} className="p-6 rounded-2xl border-white/5 bg-card/30 backdrop-blur-md relative hover:border-white/10 transition-all duration-300">
              <Quote className="absolute top-6 right-6 h-8 w-8 text-white/5 pointer-events-none" />
              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-6 italic">"{t.text}"</p>
              <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                <div className={`w-9 h-9 rounded-full bg-gradient-to-tr ${t.gradient} flex items-center justify-center text-white text-xs font-black shadow-sm`}>
                  {t.avatar}
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">{t.name}</p>
                  <p className="text-[10px] text-muted-foreground font-semibold">{t.role}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* ── Final CTA ────────────────────────────────────────────── */}
      <div className="relative rounded-3xl overflow-hidden border border-white/5 mb-6">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-accent/80 backdrop-blur-sm pointer-events-none" />
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative px-8 py-16 text-center text-primary-foreground">
          <Globe className="h-12 w-12 mx-auto mb-4 opacity-90 text-indigo-200 animate-pulse" />
          <h2 className="text-3xl font-black mb-3 text-white tracking-tight">Expand Your Local Reach Today</h2>
          <p className="text-white/80 mb-8 max-w-md mx-auto text-sm leading-relaxed">
            Join thousands of local users discovering, claiming, reviewing, and communicating on India's premier neighborhood SaaS listing network.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/search">
              <Button
                className="rounded-xl bg-white text-primary hover:bg-white/95 hover:shadow-lg font-bold px-6 py-2.5 transition-all cursor-pointer"
                size="lg"
              >
                <Search className="h-4 w-4 mr-2" />
                Explore Listings
              </Button>
            </Link>
            <Link href="/login">
              <Button
                variant="outline"
                className="rounded-xl border-white/30 text-white hover:bg-white/10 font-bold px-6 py-2.5 transition-all cursor-pointer"
                size="lg"
              >
                Get Started Free
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
