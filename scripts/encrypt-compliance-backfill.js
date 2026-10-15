#!/usr/bin/env node
/*
 * One-off: encrypt PAN numbers and GSTINs already stored in Business.compliance.
 * New writes are encrypted by the API; rows written before that stay readable
 * (decrypt passes plaintext through), so this is optional hardening.
 *
 *   ENCRYPTION_KEY=... DATABASE_URL=... node scripts/encrypt-compliance-backfill.js           # dry run
 *   ENCRYPTION_KEY=... DATABASE_URL=... node scripts/encrypt-compliance-backfill.js --apply
 *
 * Uses the same key and v1 format as apps/api CryptoService. Take a DB backup first.
 */
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const apply = process.argv.includes('--apply');
const raw = process.env.ENCRYPTION_KEY;
if (!raw) {
  console.error('ENCRYPTION_KEY is required (same value as the API).');
  process.exit(1);
}
const key = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64');
if (key.length !== 32) {
  console.error('ENCRYPTION_KEY must decode to 32 bytes.');
  process.exit(1);
}

function encrypt(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), enc.toString('base64')].join(':');
}

const PATHS = [
  ['pan', 'number'],
  ['gst', 'gstin'],
];

(async () => {
  const db = new PrismaClient();
  const rows = await db.business.findMany({ select: { id: true, compliance: true } });
  let changed = 0;
  for (const row of rows) {
    const c = row.compliance;
    if (!c || typeof c !== 'object') continue;
    let dirty = false;
    const next = { ...c };
    for (const [section, k] of PATHS) {
      const s = next[section];
      if (s && typeof s[k] === 'string' && s[k] && !s[k].startsWith('v1:')) {
        next[section] = { ...s, [k]: encrypt(s[k]) };
        dirty = true;
      }
    }
    if (!dirty) continue;
    changed++;
    if (apply) await db.business.update({ where: { id: row.id }, data: { compliance: next } });
  }
  console.log(`${rows.length} businesses scanned, ${changed} ${apply ? 'encrypted' : 'would be encrypted (dry run)'}.`);
  await db.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
