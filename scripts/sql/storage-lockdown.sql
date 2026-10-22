-- Storage lockdown (October 2026 security audit).
--
-- Why: Supabase Auth email sign-up is open on this project, and these policies let
-- ANY Supabase-authenticated user read every object in the private buckets
-- (verification-documents = KYC files, bill-uploads = receipts, temp-uploads) and
-- overwrite or delete media in the public ones.
--
-- The app never uses Supabase Auth: the API uses the service-role key and issues
-- signed upload/download URLs, which do not depend on these policies. Dropping them
-- removes the exposure without changing app behaviour. Public-bucket READ policies
-- are kept (public buckets are readable by URL anyway).
--
-- Run once in the Supabase SQL editor (or psql as postgres). Re-creating a policy
-- later is a single CREATE POLICY if ever needed.

begin;

drop policy if exists "bill_uploads_authenticated_read"           on storage.objects;
drop policy if exists "bill_uploads_authenticated_upload"         on storage.objects;
drop policy if exists "bill_uploads_authenticated_update"         on storage.objects;
drop policy if exists "bill_uploads_authenticated_delete"         on storage.objects;

drop policy if exists "verification_documents_authenticated_read"   on storage.objects;
drop policy if exists "verification_documents_authenticated_upload" on storage.objects;
drop policy if exists "verification_documents_authenticated_update" on storage.objects;
drop policy if exists "verification_documents_authenticated_delete" on storage.objects;

drop policy if exists "temp_uploads_authenticated_read"   on storage.objects;
drop policy if exists "temp_uploads_authenticated_upload" on storage.objects;
drop policy if exists "temp_uploads_authenticated_update" on storage.objects;
drop policy if exists "temp_uploads_authenticated_delete" on storage.objects;

drop policy if exists "business_media_authenticated_upload"        on storage.objects;
drop policy if exists "business_media_authenticated_update"        on storage.objects;
drop policy if exists "business_media_authenticated_delete"        on storage.objects;
drop policy if exists "authenticated_upload_business_media f4d3mf_0" on storage.objects;

drop policy if exists "branch_media_authenticated_upload" on storage.objects;
drop policy if exists "branch_media_authenticated_update" on storage.objects;
drop policy if exists "branch_media_authenticated_delete" on storage.objects;

drop policy if exists "notification_media_authenticated_upload" on storage.objects;
drop policy if exists "notification_media_authenticated_update" on storage.objects;
drop policy if exists "notification_media_authenticated_delete" on storage.objects;

drop policy if exists "profile_media_authenticated_upload" on storage.objects;
drop policy if exists "profile_media_authenticated_update" on storage.objects;
drop policy if exists "profile_media_authenticated_delete" on storage.objects;

-- The legacy public 'civic' bucket had no type or size limit.
update storage.buckets
   set allowed_mime_types = array['image/jpeg','image/png','image/webp'],
       file_size_limit = 5242880
 where id = 'civic';

commit;

-- Check: should list only the public *_read policies.
-- select policyname, roles, cmd from pg_policies where schemaname = 'storage' order by 1;
