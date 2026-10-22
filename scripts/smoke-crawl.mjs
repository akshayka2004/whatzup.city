#!/usr/bin/env node
/*
 * Smoke crawl: opens every page of the built web app in Chromium, as a visitor and
 * as each signed-in role, and fails on any error screen or uncaught page error.
 *
 * No API or database is needed: every /api call is answered by a mock (empty lists,
 * a fake signed-in user per role), and writes are refused. That keeps the crawl
 * deterministic in CI and means it can never touch real data.
 *
 *   pnpm --filter @saas/web build && node apps/web/.next/standalone/apps/web/server.js &
 *   node scripts/smoke-crawl.mjs [--base http://127.0.0.1:3000]
 */
import { chromium } from 'playwright';

const argBase = process.argv.indexOf('--base');
const BASE =
  argBase > -1 ? process.argv[argBase + 1] : process.env.SMOKE_BASE || 'http://127.0.0.1:3000';

const PUBLIC = [
  '/',
  '/search',
  '/search?q=cafe',
  '/search?view=map',
  '/category',
  '/nearby',
  '/offers',
  '/events',
  '/spin-it',
  '/favorites',
  '/government',
  '/report',
  '/support',
  '/terms-of-service',
  '/privacy-policy',
  '/login',
  '/register',
  '/register/select-role',
  '/forgot-password',
  '/reset-password',
  '/business/00000000-0000-4000-8000-000000000001',
  '/notifications',
  '/design',
];
const ROLES = {
  user: { rbac: 'USER', role: 'user', routes: ['/profile', '/favorites', '/notifications'] },
  business: {
    rbac: 'BUSINESS_OWNER',
    role: 'business',
    routes: [
      '/dashboard',
      '/dashboard/analytics',
      '/dashboard/bills',
      '/dashboard/offers',
      '/dashboard/vouchers',
      '/dashboard/customers',
      '/dashboard/reviews',
      '/dashboard/products',
      '/dashboard/menu',
      '/dashboard/events',
      '/dashboard/team',
      '/dashboard/settings',
      '/dashboard/subscriptions',
      '/dashboard/support',
      '/dashboard/qr-code',
      '/dashboard/outlets',
    ],
  },
  admin: {
    rbac: 'MASTER_ADMIN',
    role: 'admin',
    routes: [
      '/admin',
      '/admin/approvals',
      '/admin/bills',
      '/admin/categories',
      '/admin/payments',
      '/admin/reports',
      '/admin/subscriptions',
      '/admin/support',
      '/admin/notices',
      '/admin/audit',
    ],
  },
  'super-admin': {
    rbac: 'SUPER_ADMIN',
    role: 'super-admin',
    routes: [
      '/super-admin',
      '/super-admin/businesses',
      '/super-admin/users',
      '/super-admin/brands',
      '/super-admin/offers',
      '/super-admin/events',
      '/super-admin/health',
      '/super-admin/tenants',
    ],
  },
  staff: {
    rbac: 'PLATFORM_STAFF',
    role: 'platform_staff',
    routes: ['/staff', '/staff/businesses', '/staff/events'],
  },
  government: { rbac: 'GOVERNMENT_ADMIN', role: 'government', routes: ['/government/dashboard'] },
};

const BIZ_ID = '00000000-0000-4000-8000-000000000001';
const ERROR_SCREEN =
  /Something went wrong|Application error|Unhandled Runtime Error|having a moment/i;

function mockApi(user) {
  return async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (req.method() !== 'GET' && req.method() !== 'HEAD') {
      if (url.pathname.includes('/analytics/track'))
        return route.fulfill({ status: 204, body: '' });
      return route.fulfill({
        status: 403,
        json: { message: 'Writes are disabled in the smoke crawl' },
      });
    }
    if (url.pathname.endsWith('/auth/me')) {
      return user
        ? route.fulfill({
            json: {
              id: 'smoke-user',
              email: 'smoke@example.test',
              name: 'Smoke',
              role: user.rbac,
              entity: user.entity ?? null,
              businessId: user.entity?.id,
            },
          })
        : route.fulfill({ status: 401, json: { message: 'Unauthorized' } });
    }
    // Everything else: an empty, well-formed answer.
    return route.fulfill({ json: { data: [], items: [], meta: { total: 0, page: 1, limit: 20 } } });
  };
}

async function crawl(browser, label, routes, user) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  if (user) {
    const stored = {
      id: 'smoke-user',
      email: 'smoke@example.test',
      name: 'Smoke',
      role: user.role,
      rbacRole: user.rbac,
      createdAt: new Date().toISOString(),
      businessId: user.entity?.id,
      entity: user.entity ?? null,
    };
    await ctx.addInitScript((u) => {
      localStorage.setItem('user_session', JSON.stringify(u));
      localStorage.setItem('user', JSON.stringify(u));
    }, stored);
  }
  await ctx.route('**/api/**', mockApi(user));
  const page = await ctx.newPage();
  const failures = [];
  let errors = [];
  page.on('pageerror', (e) => errors.push(e.message.split('\n')[0].slice(0, 160)));
  for (const r of routes) {
    errors = [];
    try {
      await page.goto(BASE + r, { waitUntil: 'networkidle', timeout: 45_000 });
    } catch (e) {
      errors.push('navigation: ' + e.message.split('\n')[0]);
    }
    await page.waitForTimeout(500);
    const text = await page.evaluate(() => document.body?.innerText || '').catch(() => '');
    if (ERROR_SCREEN.test(text)) errors.push('error screen shown');
    if (errors.length) failures.push(`${label} ${r}\n    ${[...new Set(errors)].join('\n    ')}`);
  }
  await ctx.close();
  return failures;
}

const browser = await chromium.launch();
const failures = [];
failures.push(...(await crawl(browser, 'guest', PUBLIC, null)));
for (const [label, cfg] of Object.entries(ROLES)) {
  const entity =
    label === 'business'
      ? { id: BIZ_ID, type: 'BUSINESS', status: 'APPROVED', name: 'Smoke Cafe' }
      : null;
  failures.push(...(await crawl(browser, label, cfg.routes, { ...cfg, entity })));
}
await browser.close();

const total = PUBLIC.length + Object.values(ROLES).reduce((n, r) => n + r.routes.length, 0);
if (failures.length) {
  console.error(
    `Smoke crawl: ${failures.length} of ${total} pages failed\n  ${failures.join('\n  ')}`,
  );
  process.exit(1);
}
console.log(`Smoke crawl: all ${total} pages rendered without errors.`);
