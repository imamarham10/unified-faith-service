-- Database-controlled home-screen placement for curated collections.
--
-- Additive and nullable-safe: NOT NULL with a DEFAULT, so every existing row
-- answers "no" without a backfill and the statement does not rewrite the table
-- in any supported Postgres version.
--
-- DEPLOY ORDER: apply this migration BEFORE deploying code that knows about
-- the column. Prisma emits every scalar of a model in the SELECT list of an
-- unselected findMany, so code-first makes both
-- GET /api/v1/{islam,hindu}/collections return 500 until the column exists —
-- and vercel.json has no migration step to close that window for you.

-- AlterTable
ALTER TABLE "collections" ADD COLUMN     "show_on_home" BOOLEAN NOT NULL DEFAULT false;
