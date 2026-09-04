-- New role for platform-side data-entry accounts (events, movies,
-- platform offers, announcements). No new tables/columns.
ALTER TYPE "UserRoleEnum" ADD VALUE 'PLATFORM_STAFF';
