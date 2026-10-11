-- Curated collections, phase 2. team/curated-collections-spec.md §1.2 / §1.3.
--
-- SAFE HALF. Everything here is additive and cannot fail on populated tables:
--   * duas.slug is added NULLable, so the 44 existing rows are untouched.
--     Postgres unique indexes treat NULLs as distinct, so duas_slug_key is
--     satisfied by 44 NULLs. prisma/seed-duas-complete.ts back-fills it.
--   * the two collections tables are new.
--
-- The RISKY half -- the unique index on hindu_text_verses, which fails if the
-- table holds duplicates -- is deliberately a SEPARATE later migration
-- (20261011121000_add_hindu_text_verse_unique) so that a dirty Ramayana import
-- cannot block this one. Nothing in the collections feature depends on it.
--
-- DEPLOY ORDER: this migration must be applied BEFORE the code that knows
-- about Dua.slug is deployed. vercel.json has no migration step, so a code
-- deploy that lands first makes Prisma SELECT duas.slug on every dua read and
-- 500s /api/v1/islam/duas until the migration catches up.

-- AlterTable
ALTER TABLE "duas" ADD COLUMN     "slug" TEXT;

-- CreateTable
CREATE TABLE "collections" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "faith_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "occasion_type" TEXT NOT NULL,
    "occasion_config" JSONB,
    "order_semantics" TEXT NOT NULL DEFAULT 'sequence',
    "provenance_class" TEXT NOT NULL,
    "review_status" TEXT NOT NULL DEFAULT 'draft',
    "curated_by" TEXT,
    "curated_at" TIMESTAMP(3),
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "artwork_key" TEXT,
    "estimated_minutes" INTEGER,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_items" (
    "id" TEXT NOT NULL,
    "collection_id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "ref_type" TEXT NOT NULL,
    "surah_id" INTEGER,
    "ayah_start" INTEGER,
    "ayah_end" INTEGER,
    "hindu_text_slug" TEXT,
    "chapter_number" INTEGER,
    "verse_start" INTEGER,
    "verse_end" INTEGER,
    "ref_slug" TEXT,
    "ref_id" TEXT,
    "repeat_count" INTEGER NOT NULL DEFAULT 1,
    "label" TEXT NOT NULL,
    "note" TEXT,
    "citation" TEXT NOT NULL,
    "grading" TEXT,
    "translation_source" TEXT,
    "is_optional" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "collection_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "collections_slug_key" ON "collections"("slug");

-- CreateIndex
CREATE INDEX "collections_faith_id_is_active_occasion_type_idx" ON "collections"("faith_id", "is_active", "occasion_type");

-- CreateIndex
CREATE INDEX "collection_items_collection_id_idx" ON "collection_items"("collection_id");

-- CreateIndex
CREATE UNIQUE INDEX "collection_items_collection_id_sequence_key" ON "collection_items"("collection_id", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "duas_slug_key" ON "duas"("slug");

-- AddForeignKey
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
