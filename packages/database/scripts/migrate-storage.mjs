// ============================================================
// Copy every storage object from the OLD Supabase project's buckets to the NEW
// project. Idempotent (upsert). Run once during the region migration BEFORE
// deleting the old project. `pg_dump` moves the database only — NOT storage —
// so without this, all logos / bill receipts / verification docs 404.
//
// Needs BOTH projects' SERVICE ROLE keys (full storage access).
//
// Run from a dir that has @supabase/supabase-js installed (e.g. apps/api):
//   cd apps/api
//   OLD_SUPABASE_URL="https://zavtnuywvpwchmdqndli.supabase.co" \
//   OLD_KEY="<OLD service_role JWT>" \
//   NEW_SUPABASE_URL="https://cvsvlobscbvirunfwhru.supabase.co" \
//   NEW_KEY="<NEW service_role JWT>" \
//   node ../../packages/database/scripts/migrate-storage.mjs
// ============================================================
import { createClient } from '@supabase/supabase-js';

const { OLD_SUPABASE_URL, OLD_KEY, NEW_SUPABASE_URL, NEW_KEY } = process.env;
if (!OLD_SUPABASE_URL || !OLD_KEY || !NEW_SUPABASE_URL || !NEW_KEY) {
  console.error('Set OLD_SUPABASE_URL, OLD_KEY, NEW_SUPABASE_URL, NEW_KEY.');
  process.exit(1);
}

const OLD = createClient(OLD_SUPABASE_URL, OLD_KEY, { auth: { persistSession: false } });
const NEW = createClient(NEW_SUPABASE_URL, NEW_KEY, { auth: { persistSession: false } });

// Bucket name -> public flag (matches storage.service REQUIRED_BUCKETS).
const BUCKETS = {
  'verification-documents': false,
  'business-media': true,
  civic: true,
  'bill-uploads': false,
  'profile-media': true,
  'notification-media': true,
};

const PAGE = 100;

// Recursively yield every file path under a bucket prefix.
async function* walk(client, bucket, prefix = '') {
  let offset = 0;
  for (;;) {
    const { data, error } = await client.storage
      .from(bucket)
      .list(prefix, { limit: PAGE, offset, sortBy: { column: 'name', order: 'asc' } });
    if (error) throw new Error(`list ${bucket}/${prefix}: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      // Folders come back with id === null; recurse into them.
      if (entry.id === null) {
        yield* walk(client, bucket, path);
      } else {
        yield { path, contentType: entry.metadata?.mimetype };
      }
    }
    if (data.length < PAGE) break;
    offset += PAGE;
  }
}

async function ensureNewBucket(bucket, isPublic) {
  const { error } = await NEW.storage.createBucket(bucket, { public: isPublic });
  if (error && !/exist/i.test(error.message)) {
    console.warn(`  createBucket("${bucket}") warn: ${error.message}`);
  }
}

async function copyBucket(bucket, isPublic) {
  console.log(`\n=== ${bucket} ===`);
  await ensureNewBucket(bucket, isPublic);
  let copied = 0, failed = 0, skipped = 0;
  for await (const { path, contentType } of walk(OLD, bucket)) {
    try {
      const { data: blob, error: dErr } = await OLD.storage.from(bucket).download(path);
      if (dErr || !blob) { failed++; console.warn(`  DL fail ${path}: ${dErr?.message}`); continue; }
      const buf = Buffer.from(await blob.arrayBuffer());
      const { error: uErr } = await NEW.storage
        .from(bucket)
        .upload(path, buf, { upsert: true, contentType: contentType || blob.type || undefined });
      if (uErr) {
        if (/exist/i.test(uErr.message)) { skipped++; }
        else { failed++; console.warn(`  UL fail ${path}: ${uErr.message}`); }
        continue;
      }
      copied++;
      if (copied % 25 === 0) console.log(`  …${copied} copied`);
    } catch (e) {
      failed++; console.warn(`  ERR ${path}: ${e.message}`);
    }
  }
  console.log(`  done: copied=${copied} skipped=${skipped} failed=${failed}`);
}

(async () => {
  for (const [bucket, isPublic] of Object.entries(BUCKETS)) {
    try { await copyBucket(bucket, isPublic); }
    catch (e) { console.error(`bucket ${bucket} aborted: ${e.message}`); }
  }
  console.log('\nStorage copy complete.');
})();
