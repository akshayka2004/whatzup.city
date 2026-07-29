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

/**
 * Isolate the `where:` object so `select: { businessId: true }` can't be
 * mistaken for a filter. Returns '' when the call has no where clause at all
 * (which is itself unscoped).
 */
function extractWhere(call) {
  const m = /\bwhere\s*:\s*\{/.exec(call);
  if (!m) return '';
  const start = m.index + m[0].length - 1;
  let depth = 0;
  for (let i = start; i < call.length; i++) {
    if (call[i] === '{') depth++;
    else if (call[i] === '}') {
      depth--;
      if (depth === 0) return call.slice(start, i + 1);
    }
  }
  return call.slice(start);
}

/**
 * True when the where clause constrains by an ownership key. Matches both
 * `businessId: x` and the ES6 shorthand `{ businessId, ... }`.
 */
function isScoped(where, keys) {
  return keys.some((k) => new RegExp(`\\b${k}\\b`).test(where));
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

        const where = extractWhere(call);
        const scoped = where !== '' && isScoped(where, SCOPE_KEYS);
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
