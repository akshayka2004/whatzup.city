#!/usr/bin/env node
/*
 * Design-system guard for apps/web. Flags styling that bypasses the tokens:
 * raw Tailwind palette colours, arbitrary hex values, sub-12px text, hand-built
 * modal overlays and native alert()/confirm() dialogs.
 *
 *   node scripts/check-design.js            report counts per rule and worst files
 *   node scripts/check-design.js --strict   exit 1 if anything is found
 *   node scripts/check-design.js --files    list every hit (file:line)
 *
 * Opt a file out (e.g. a print-only invoice) with a `design-lint-disable-file` comment.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'apps', 'web');
const SCAN = ['app', 'components', 'lib'];
// Primitives own their low-level styling.
const EXEMPT_DIRS = [path.join('components', 'ui'), path.join('components', 'system')];

const PALETTE =
  '(?:red|rose|pink|fuchsia|purple|violet|indigo|blue|sky|cyan|teal|emerald|green|lime|yellow|amber|orange|zinc|slate|gray|neutral|stone)';

const RULES = [
  {
    id: 'raw-palette',
    why: 'use semantic tokens (success/warning/danger/info/brand-soft, muted, border…)',
    re: new RegExp(`\\b(?:bg|text|border|from|to|via|ring|fill|stroke|outline|divide|shadow)-${PALETTE}-\\d{2,3}\\b`, 'g'),
  },
  { id: 'hex-arbitrary', why: 'no [#hex] values — add a token', re: /\[#[0-9a-fA-F]{3,8}\]/g },
  { id: 'micro-text', why: 'min UI text is 12px (text-caption / text-xs)', re: /text-\[(?:[0-9]|1[01])px\]/g },
  { id: 'hand-modal', why: 'use <Modal> / ui/dialog / ui/sheet instead of fixed inset-0 overlays', re: /\bfixed inset-0\b/g },
  {
    id: 'native-dialog',
    why: 'use toast() / useConfirm() instead of alert()/confirm()',
    re: /\bwindow\.(?:alert|confirm)\(|(?<![\w.])alert\(|(?<![\w.])confirm\(\s*['"`]/g,
  },
];

const args = new Set(process.argv.slice(2));
const strict = args.has('--strict');
const listAll = args.has('--files');

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      walk(p, out);
    } else if (/\.(tsx|ts)$/.test(entry.name)) {
      out.push(p);
    }
  }
  return out;
}

const files = SCAN.flatMap((d) => (fs.existsSync(path.join(ROOT, d)) ? walk(path.join(ROOT, d), []) : []));
const totals = Object.fromEntries(RULES.map((r) => [r.id, 0]));
const perFile = new Map();
const hits = [];

for (const file of files) {
  const rel = path.relative(ROOT, file);
  if (EXEMPT_DIRS.some((d) => rel.startsWith(d))) continue;
  const src = fs.readFileSync(file, 'utf8');
  if (src.includes('design-lint-disable-file')) continue;
  const lines = src.split('\n');
  lines.forEach((line, i) => {
    for (const rule of RULES) {
      rule.re.lastIndex = 0;
      const m = line.match(rule.re);
      if (!m) continue;
      totals[rule.id] += m.length;
      perFile.set(rel, (perFile.get(rel) || 0) + m.length);
      if (listAll) hits.push(`${rel}:${i + 1}  [${rule.id}]  ${m.join(' ')}`);
    }
  });
}

const total = Object.values(totals).reduce((a, b) => a + b, 0);
console.log('Design guard — apps/web');
for (const r of RULES) console.log(`  ${String(totals[r.id]).padStart(5)}  ${r.id.padEnd(14)} ${r.why}`);
console.log(`  ${String(total).padStart(5)}  total in ${perFile.size} files`);
if (listAll) hits.forEach((h) => console.log('    ' + h));
else if (perFile.size) {
  console.log('\n  Worst files:');
  [...perFile.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([f, n]) => console.log(`    ${String(n).padStart(4)}  ${f}`));
}
if (strict && total > 0) process.exit(1);
