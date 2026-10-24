#!/usr/bin/env node
/*
 * One-off: fill in latitude/longitude for approved businesses that have none,
 * using OpenStreetMap Nominatim (1 request per second, per its usage policy).
 * New approvals are geocoded by the API automatically.
 *
 *   DATABASE_URL=... node scripts/geocode-backfill.js            # dry run: look up, don't write
 *   DATABASE_URL=... node scripts/geocode-backfill.js --apply    # write coordinates
 *   ... --limit 50                                               # cap the run
 */
const path = require('path');
// pnpm keeps @prisma/client inside the database package, not at the repo root.
const { PrismaClient } = require(
  require.resolve('@prisma/client', { paths: [path.join(__dirname, '../packages/database')] }),
);

const apply = process.argv.includes('--apply');
const limitArg = process.argv.indexOf('--limit');
const limit = limitArg > -1 ? Number(process.argv[limitArg + 1]) || 100 : 1000;
const UA = process.env.GEOCODING_USER_AGENT || 'whtzup.city/1.0 (backfill)';

const inKerala = (lat, lng) => lat >= 8 && lat <= 12.9 && lng >= 74.7 && lng <= 77.6;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function query(b) {
  if (!b.address && !b.city) return null;
  const parts = [b.address, b.city, b.district, b.zipCode, b.state || 'Kerala', 'India']
    .map((p) => (p || '').trim())
    .filter(Boolean);
  return [...new Set(parts)].join(', ');
}

(async () => {
  const db = new PrismaClient();
  const rows = await db.business.findMany({
    where: { status: 'APPROVED', deletedAt: null, OR: [{ latitude: null }, { longitude: null }] },
    select: {
      id: true,
      name: true,
      address: true,
      district: true,
      city: true,
      state: true,
      zipCode: true,
    },
    take: limit,
  });
  let found = 0;
  for (const b of rows) {
    const q = query(b);
    if (!q) continue;
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=in&q=${encodeURIComponent(q)}`;
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en' } });
      const hits = res.ok ? await res.json() : [];
      const lat = Number(hits?.[0]?.lat);
      const lng = Number(hits?.[0]?.lon);
      if (Number.isFinite(lat) && Number.isFinite(lng) && inKerala(lat, lng)) {
        found++;
        console.log(
          `${apply ? 'set ' : 'would set'} ${b.id}  ${lat.toFixed(5)},${lng.toFixed(5)}  (${b.name})`,
        );
        if (apply)
          await db.business.update({
            where: { id: b.id },
            data: { latitude: lat, longitude: lng },
          });
      } else {
        console.log(`no match  ${b.id}  (${b.name})`);
      }
    } catch (e) {
      console.log(`error     ${b.id}  ${e.message}`);
    }
    await sleep(1100);
  }
  console.log(
    `${rows.length} without coordinates, ${found} located${apply ? ' and saved' : ' (dry run)'}.`,
  );
  await db.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
