#!/usr/bin/env node
/**
 * Cross-tenant read scanner.
 *
 * RLS is not enabled — the API connects as the table owner, which bypasses it —
 * so application code is the only barrier between tenants. A single missing
 * filter is a full cross-tenant data leak, and that bug has already shipped
 * here more than once.
 *
 * This flags reads on tenant-owned models that carry no tenantId / businessId /
 * userId / id filter. It is deliberately simple: it reads source text, so it
 * can produce false positives. Annotate a reviewed, intentionally-global query
 * with `// tenant-scope-ok: <reason>` on the preceding line to silence it.
 *
 * Usage:  node scripts/check-tenant-scope.js [--strict]
 *         --strict exits non-zero on findings (use in CI).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'apps', 'api', 'src');
const STRICT = process.argv.includes('--strict');

const GUARDED_MODELS = [
  'business', 'payment', 'transaction', 'billingProfile', 'subscription',
  'bill', 'verifiedPurchase', 'voucher', 'voucherClaim', 'offer',
  'review', 'businessDocument', 'businessStaff',
];
const READ_OPS = ['findMany', 'findFirst', 'findFirstOrThrow', 'count', 'aggregate', 'groupBy'];
const SCOPE_KEYS = [
  'tenantId', 'businessId', 'userId', 'customerId', 'ownerId', 'id', 'entityId', 'slug',
];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) out.push(full);
  }
  return out;
}

/** Grab the balanced argument text following `db.model.op(` */
function extractCall(src, startIdx) {
  let depth = 0;
  for (let i = startIdx; i < src.length && i < startIdx + 4000; i++) {
    const c = src[i];
    if (c === '(') depth++;
    else if (c === ')') {
      depth--;
      if (depth === 0) return src.slice(startIdx, i + 1);
    }
  }
  return src.slice(startIdx, startIdx + 400);
}

const findings = [];

for (const file of walk(ROOT)) {
  const src = fs.readFileSync(file, 'utf8');
  const lines = src.split(/\r?\n/);

  for (const model of GUARDED_MODELS) {
    for (const op of READ_OPS) {
      const needle = `.${model}.${op}(`;
      let idx = src.indexOf(needle);
      while (idx !== -1) {
        const callStart = idx + needle.length - 1;
        const call = extractCall(src, callStart);
        const lineNo = src.slice(0, idx).split('\n').length;
        const prevLine = lines[lineNo - 2] || '';

        const scoped = SCOPE_KEYS.some((k) => call.includes(`${k}:`));
        const acknowledged = prevLine.includes('tenant-scope-ok');

        if (!scoped && !acknowledged) {
          findings.push({
            file: path.relative(path.join(__dirname, '..'), file).replace(/\\/g, '/'),
            line: lineNo,
            model,
            op,
          });
        }
        idx = src.indexOf(needle, idx + 1);
      }
    }
  }
}

if (findings.length === 0) {
  console.log('tenant-scope: no unscoped reads found on guarded models.');
  process.exit(0);
}

console.log(`tenant-scope: ${findings.length} unscoped read(s) on tenant-owned models:\n`);
for (const f of findings) {
  console.log(`  ${f.file}:${f.line}  ${f.model}.${f.op}() has no tenant/owner filter`);
}
console.log(
  '\nEach one either needs a tenantId/businessId/userId filter, or a ' +
    '`// tenant-scope-ok: <reason>` comment on the line above if it is intentionally global.',
);

process.exit(STRICT ? 1 : 0);
