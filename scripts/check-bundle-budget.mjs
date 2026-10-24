#!/usr/bin/env node
// Fails CI when a key public page ships more gzipped JavaScript than its budget.
// Reads the prerendered HTML from `next build` and sums every script it loads.
// Run after `pnpm --filter @saas/web build`:  node scripts/check-bundle-budget.mjs
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const NEXT = 'apps/web/.next';
// gzipped KB. Measured 2026-10-23 after the deep-review cuts; raise only on purpose.
// (index 313, login 220, events 298, search 321 at that point.)
const BUDGETS = {
  index: 325,
  login: 230,
  events: 310,
  search: 335,
};

let failed = false;
for (const [page, budgetKb] of Object.entries(BUDGETS)) {
  const htmlPath = join(NEXT, 'server/app', `${page}.html`);
  if (!existsSync(htmlPath)) {
    console.log(`skip ${page}: not prerendered`);
    continue;
  }
  const html = readFileSync(htmlPath, 'utf8');
  const scripts = [
    ...new Set([...html.matchAll(/\/_next\/static\/chunks\/[^"' ]+\.js/g)].map((m) => m[0])),
  ];
  let gz = 0;
  for (const src of scripts) {
    const file = join(NEXT, 'static/chunks', src.split('/chunks/')[1]);
    gz += gzipSync(readFileSync(file)).length;
  }
  const kb = Math.round(gz / 1024);
  const ok = kb <= budgetKb;
  if (!ok) failed = true;
  console.log(
    `${ok ? 'ok  ' : 'FAIL'} ${page}: ${kb} KB gz JS (${scripts.length} files), budget ${budgetKb} KB`,
  );
}
process.exit(failed ? 1 : 0);
