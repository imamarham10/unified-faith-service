-- CreateTable
CREATE TABLE "hindu_deities" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name_english" TEXT NOT NULL,
    "name_sanskrit" TEXT NOT NULL,
    "family" TEXT,
    "color" TEXT,
    "traditions" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hindu_deities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hindu_deity_names" (
    "id" TEXT NOT NULL,
    "deity_id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "sanskrit_name" TEXT NOT NULL,
    "transliteration" TEXT NOT NULL,
    "hindi_name" TEXT,
    "english_meaning" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hindu_deity_names_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hindu_user_favorite_deity_names" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "deity_name_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hindu_user_favorite_deity_names_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hindu_texts" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name_english" TEXT NOT NULL,
    "name_sanskrit" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "total_verses" INTEGER NOT NULL,
    "is_premium" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hindu_texts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hindu_text_chapters" (
    "id" TEXT NOT NULL,
    "text_id" TEXT NOT NULL,
    "chapter_number" INTEGER NOT NULL,
    "name_sanskrit" TEXT,
    "name_english" TEXT,

    CONSTRAINT "hindu_text_chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hindu_text_verses" (
    "id" TEXT NOT NULL,
    "text_id" TEXT NOT NULL,
    "chapter_id" TEXT,
    "verse_number" INTEGER NOT NULL,
    "sanskrit_text" TEXT NOT NULL,
    "transliteration" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hindu_text_verses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hindu_text_translations" (
    "id" TEXT NOT NULL,
    "verse_id" TEXT NOT NULL,
    "language_code" TEXT NOT NULL,
    "author_name" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "is_premium" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hindu_text_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hindu_text_audio" (
    "id" TEXT NOT NULL,
    "text_id" TEXT NOT NULL,
    "chapter_id" TEXT,
    "reciter_slug" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "is_premium" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hindu_text_audio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hindu_scripture_bookmarks" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "verse_id" TEXT NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hindu_scripture_bookmarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hindu_japa_counters" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mantra_sanskrit" TEXT,
    "mantra_english" TEXT,
    "count" INTEGER NOT NULL DEFAULT 0,
    "target_count" INTEGER,
    "deity_key" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hindu_japa_counters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hindu_japa_goals" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "mantra_sanskrit" TEXT NOT NULL,
    "target_count" INTEGER NOT NULL,
    "period" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hindu_japa_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hindu_japa_history" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "mantra" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hindu_japa_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hindu_festivals" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name_english" TEXT NOT NULL,
    "name_sanskrit" TEXT,
    "name_hindi" TEXT,
    "rule_spec" JSONB NOT NULL,
    "deity_key" TEXT,
    "regions" TEXT[],
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hindu_festivals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hindu_puja_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "sandhya" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hindu_puja_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hindu_stotra_categories" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "deity_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hindu_stotra_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hindu_stotras" (
    "id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title_sanskrit" TEXT NOT NULL,
    "title_english" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "deity_key" TEXT,
    "is_premium" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hindu_stotras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hindu_stotra_verses" (
    "id" TEXT NOT NULL,
    "stotra_id" TEXT NOT NULL,
    "verse_number" INTEGER NOT NULL,
    "sanskrit_text" TEXT NOT NULL,
    "transliteration" TEXT,

    CONSTRAINT "hindu_stotra_verses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hindu_stotra_translations" (
    "id" TEXT NOT NULL,
    "verse_id" TEXT NOT NULL,
    "language_code" TEXT NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "hindu_stotra_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hindu_stotra_audio" (
    "id" TEXT NOT NULL,
    "stotra_id" TEXT NOT NULL,
    "reciter_slug" TEXT NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "hindu_stotra_audio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hindu_user_favorite_stotras" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "stotra_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hindu_user_favorite_stotras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hindu_temples" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "deity_key" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT,
    "country" TEXT NOT NULL,
    "photos" TEXT[],
    "google_place_id" TEXT,
    "source" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hindu_temples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hindu_user_favorite_temples" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "temple_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hindu_user_favorite_temples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hindu_emotions" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name_english" TEXT NOT NULL,
    "name_hindi" TEXT,
    "icon" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hindu_emotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hindu_emotion_remedies" (
    "id" TEXT NOT NULL,
    "emotion_id" TEXT NOT NULL,
    "verse_id" TEXT NOT NULL,
    "note" TEXT,
    "sequence" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "hindu_emotion_remedies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hindu_story_collections" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "source_text" TEXT NOT NULL,
    "is_premium" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hindu_story_collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hindu_stories" (
    "id" TEXT NOT NULL,
    "collection_id" TEXT NOT NULL,
    "story_number" INTEGER,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "deity_key" TEXT,
    "characters" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hindu_stories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hindu_story_translations" (
    "id" TEXT NOT NULL,
    "story_id" TEXT NOT NULL,
    "language_code" TEXT NOT NULL,
    "body" TEXT NOT NULL,

    CONSTRAINT "hindu_story_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hindu_user_favorite_stories" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "story_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hindu_user_favorite_stories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hindu_deities_slug_key" ON "hindu_deities"("slug");

-- CreateIndex
CREATE INDEX "hindu_deity_names_deity_id_sequence_idx" ON "hindu_deity_names"("deity_id", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "hindu_user_favorite_deity_names_user_id_deity_name_id_key" ON "hindu_user_favorite_deity_names"("user_id", "deity_name_id");

-- CreateIndex
CREATE UNIQUE INDEX "hindu_texts_slug_key" ON "hindu_texts"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "hindu_text_chapters_text_id_chapter_number_key" ON "hindu_text_chapters"("text_id", "chapter_number");

-- CreateIndex
CREATE INDEX "hindu_text_verses_text_id_chapter_id_verse_number_idx" ON "hindu_text_verses"("text_id", "chapter_id", "verse_number");

-- CreateIndex
CREATE UNIQUE INDEX "hindu_text_translations_verse_id_language_code_author_name_key" ON "hindu_text_translations"("verse_id", "language_code", "author_name");

-- CreateIndex
CREATE UNIQUE INDEX "hindu_scripture_bookmarks_user_id_verse_id_key" ON "hindu_scripture_bookmarks"("user_id", "verse_id");

-- CreateIndex
CREATE INDEX "hindu_japa_history_user_id_date_idx" ON "hindu_japa_history"("user_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "hindu_festivals_slug_key" ON "hindu_festivals"("slug");

-- CreateIndex
CREATE INDEX "hindu_puja_logs_user_id_date_idx" ON "hindu_puja_logs"("user_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "hindu_stotra_categories_slug_key" ON "hindu_stotra_categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "hindu_stotras_slug_key" ON "hindu_stotras"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "hindu_stotra_verses_stotra_id_verse_number_key" ON "hindu_stotra_verses"("stotra_id", "verse_number");

-- CreateIndex
CREATE UNIQUE INDEX "hindu_stotra_translations_verse_id_language_code_key" ON "hindu_stotra_translations"("verse_id", "language_code");

-- CreateIndex
CREATE UNIQUE INDEX "hindu_user_favorite_stotras_user_id_stotra_id_key" ON "hindu_user_favorite_stotras"("user_id", "stotra_id");

-- CreateIndex
CREATE INDEX "hindu_temples_lat_lng_idx" ON "hindu_temples"("lat", "lng");

-- CreateIndex
CREATE UNIQUE INDEX "hindu_user_favorite_temples_user_id_temple_id_key" ON "hindu_user_favorite_temples"("user_id", "temple_id");

-- CreateIndex
CREATE UNIQUE INDEX "hindu_emotions_slug_key" ON "hindu_emotions"("slug");

-- CreateIndex
CREATE INDEX "hindu_emotion_remedies_emotion_id_sequence_idx" ON "hindu_emotion_remedies"("emotion_id", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "hindu_emotion_remedies_emotion_id_verse_id_key" ON "hindu_emotion_remedies"("emotion_id", "verse_id");

-- CreateIndex
CREATE UNIQUE INDEX "hindu_story_collections_slug_key" ON "hindu_story_collections"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "hindu_story_translations_story_id_language_code_key" ON "hindu_story_translations"("story_id", "language_code");

-- CreateIndex
CREATE UNIQUE INDEX "hindu_user_favorite_stories_user_id_story_id_key" ON "hindu_user_favorite_stories"("user_id", "story_id");

-- AddForeignKey
ALTER TABLE "hindu_deity_names" ADD CONSTRAINT "hindu_deity_names_deity_id_fkey" FOREIGN KEY ("deity_id") REFERENCES "hindu_deities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hindu_user_favorite_deity_names" ADD CONSTRAINT "hindu_user_favorite_deity_names_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hindu_user_favorite_deity_names" ADD CONSTRAINT "hindu_user_favorite_deity_names_deity_name_id_fkey" FOREIGN KEY ("deity_name_id") REFERENCES "hindu_deity_names"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hindu_text_chapters" ADD CONSTRAINT "hindu_text_chapters_text_id_fkey" FOREIGN KEY ("text_id") REFERENCES "hindu_texts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hindu_text_verses" ADD CONSTRAINT "hindu_text_verses_text_id_fkey" FOREIGN KEY ("text_id") REFERENCES "hindu_texts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hindu_text_verses" ADD CONSTRAINT "hindu_text_verses_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "hindu_text_chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hindu_text_translations" ADD CONSTRAINT "hindu_text_translations_verse_id_fkey" FOREIGN KEY ("verse_id") REFERENCES "hindu_text_verses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hindu_text_audio" ADD CONSTRAINT "hindu_text_audio_text_id_fkey" FOREIGN KEY ("text_id") REFERENCES "hindu_texts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hindu_text_audio" ADD CONSTRAINT "hindu_text_audio_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "hindu_text_chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hindu_scripture_bookmarks" ADD CONSTRAINT "hindu_scripture_bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hindu_scripture_bookmarks" ADD CONSTRAINT "hindu_scripture_bookmarks_verse_id_fkey" FOREIGN KEY ("verse_id") REFERENCES "hindu_text_verses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hindu_japa_counters" ADD CONSTRAINT "hindu_japa_counters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hindu_japa_goals" ADD CONSTRAINT "hindu_japa_goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hindu_japa_history" ADD CONSTRAINT "hindu_japa_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hindu_puja_logs" ADD CONSTRAINT "hindu_puja_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hindu_stotras" ADD CONSTRAINT "hindu_stotras_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "hindu_stotra_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hindu_stotra_verses" ADD CONSTRAINT "hindu_stotra_verses_stotra_id_fkey" FOREIGN KEY ("stotra_id") REFERENCES "hindu_stotras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hindu_stotra_translations" ADD CONSTRAINT "hindu_stotra_translations_verse_id_fkey" FOREIGN KEY ("verse_id") REFERENCES "hindu_stotra_verses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hindu_stotra_audio" ADD CONSTRAINT "hindu_stotra_audio_stotra_id_fkey" FOREIGN KEY ("stotra_id") REFERENCES "hindu_stotras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hindu_user_favorite_stotras" ADD CONSTRAINT "hindu_user_favorite_stotras_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hindu_user_favorite_stotras" ADD CONSTRAINT "hindu_user_favorite_stotras_stotra_id_fkey" FOREIGN KEY ("stotra_id") REFERENCES "hindu_stotras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hindu_user_favorite_temples" ADD CONSTRAINT "hindu_user_favorite_temples_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hindu_user_favorite_temples" ADD CONSTRAINT "hindu_user_favorite_temples_temple_id_fkey" FOREIGN KEY ("temple_id") REFERENCES "hindu_temples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hindu_emotion_remedies" ADD CONSTRAINT "hindu_emotion_remedies_emotion_id_fkey" FOREIGN KEY ("emotion_id") REFERENCES "hindu_emotions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hindu_emotion_remedies" ADD CONSTRAINT "hindu_emotion_remedies_verse_id_fkey" FOREIGN KEY ("verse_id") REFERENCES "hindu_text_verses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hindu_stories" ADD CONSTRAINT "hindu_stories_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "hindu_story_collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hindu_story_translations" ADD CONSTRAINT "hindu_story_translations_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "hindu_stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hindu_user_favorite_stories" ADD CONSTRAINT "hindu_user_favorite_stories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hindu_user_favorite_stories" ADD CONSTRAINT "hindu_user_favorite_stories_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "hindu_stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
