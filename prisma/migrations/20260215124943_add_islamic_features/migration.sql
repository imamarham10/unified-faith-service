-- CreateTable
CREATE TABLE "user_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "avatar_url" TEXT,
    "bio" TEXT,
    "date_of_birth" TIMESTAMP(3),
    "gender" TEXT,
    "address" JSONB,
    "social_links" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "faith" TEXT,
    "language" TEXT,
    "country_code" TEXT,
    "timezone" TEXT,
    "notification_preferences" JSONB DEFAULT '{}',
    "content_preferences" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "device_id" TEXT,
    "device_name" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prayer_times" (
    "id" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "date" DATE NOT NULL,
    "method_id" TEXT NOT NULL,
    "fajr" TIMESTAMP(3) NOT NULL,
    "sunrise" TIMESTAMP(3) NOT NULL,
    "dhuhr" TIMESTAMP(3) NOT NULL,
    "asr" TIMESTAMP(3) NOT NULL,
    "maghrib" TIMESTAMP(3) NOT NULL,
    "isha" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prayer_times_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prayer_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "prayer_name" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "logged_at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prayer_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calculation_methods" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "fajr_angle" DOUBLE PRECISION NOT NULL,
    "isha_angle" DOUBLE PRECISION NOT NULL,
    "description" TEXT,

    CONSTRAINT "calculation_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_locations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "location_name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "timezone" TEXT NOT NULL,
    "calculation_method_id" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quran_surahs" (
    "id" INTEGER NOT NULL,
    "name_arabic" TEXT NOT NULL,
    "name_english" TEXT NOT NULL,
    "name_transliteration" TEXT NOT NULL,
    "revelation_place" TEXT NOT NULL,
    "verse_count" INTEGER NOT NULL,

    CONSTRAINT "quran_surahs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quran_verses" (
    "id" TEXT NOT NULL,
    "surah_id" INTEGER NOT NULL,
    "verse_number" INTEGER NOT NULL,
    "text_arabic" TEXT NOT NULL,
    "text_simple" TEXT NOT NULL,

    CONSTRAINT "quran_verses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quran_translations" (
    "id" TEXT NOT NULL,
    "verse_id" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "author_name" TEXT NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "quran_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_quran_bookmarks" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "surah_id" INTEGER NOT NULL,
    "verse_number" INTEGER NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_quran_bookmarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_quran_progress" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "last_surah_id" INTEGER,
    "last_verse_number" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_quran_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dhikr_counters" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phrase" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "target_count" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dhikr_counters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dhikr_goals" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "phrase" TEXT NOT NULL,
    "target_count" INTEGER NOT NULL,
    "period" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dhikr_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dhikr_history" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "phrase" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dhikr_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hijri_dates" (
    "id" TEXT NOT NULL,
    "gregorianDate" DATE NOT NULL,
    "hijri_day" INTEGER NOT NULL,
    "hijri_month" INTEGER NOT NULL,
    "hijri_year" INTEGER NOT NULL,

    CONSTRAINT "hijri_dates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "islamic_events" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_arabic" TEXT,
    "description" TEXT,
    "hijri_month" INTEGER NOT NULL,
    "hijri_day" INTEGER NOT NULL,
    "importance" TEXT NOT NULL,

    CONSTRAINT "islamic_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "duas" (
    "id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "title_arabic" TEXT NOT NULL,
    "title_english" TEXT NOT NULL,
    "text_arabic" TEXT NOT NULL,
    "text_transliteration" TEXT,
    "text_english" TEXT NOT NULL,
    "reference" TEXT,
    "audio_url" TEXT,

    CONSTRAINT "duas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dua_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_arabic" TEXT,
    "description" TEXT,

    CONSTRAINT "dua_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_custom_duas" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_custom_duas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_favorite_duas" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "dua_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_favorite_duas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "allah_names" (
    "id" INTEGER NOT NULL,
    "name_arabic" TEXT NOT NULL,
    "name_transliteration" TEXT NOT NULL,
    "name_english" TEXT NOT NULL,
    "meaning" TEXT NOT NULL,
    "description" TEXT,
    "audio_url" TEXT,

    CONSTRAINT "allah_names_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_favorite_allah_names" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_favorite_allah_names_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qibla_cache" (
    "id" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "direction" DOUBLE PRECISION NOT NULL,
    "distance" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qibla_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_user_id_key" ON "user_profiles"("user_id");

-- CreateIndex
CREATE INDEX "user_profiles_user_id_idx" ON "user_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_user_id_key" ON "user_preferences"("user_id");

-- CreateIndex
CREATE INDEX "user_preferences_user_id_idx" ON "user_preferences"("user_id");

-- CreateIndex
CREATE INDEX "user_preferences_faith_idx" ON "user_preferences"("faith");

-- CreateIndex
CREATE INDEX "user_preferences_language_idx" ON "user_preferences"("language");

-- CreateIndex
CREATE INDEX "user_preferences_country_code_idx" ON "user_preferences"("country_code");

-- CreateIndex
CREATE INDEX "device_tokens_user_id_idx" ON "device_tokens"("user_id");

-- CreateIndex
CREATE INDEX "device_tokens_user_id_is_active_idx" ON "device_tokens"("user_id", "is_active");

-- CreateIndex
CREATE INDEX "device_tokens_token_idx" ON "device_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "device_tokens_user_id_token_key" ON "device_tokens"("user_id", "token");

-- CreateIndex
CREATE INDEX "prayer_times_latitude_longitude_date_idx" ON "prayer_times"("latitude", "longitude", "date");

-- CreateIndex
CREATE UNIQUE INDEX "prayer_times_latitude_longitude_date_method_id_key" ON "prayer_times"("latitude", "longitude", "date", "method_id");

-- CreateIndex
CREATE INDEX "prayer_logs_user_id_date_idx" ON "prayer_logs"("user_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "prayer_logs_user_id_prayer_name_date_key" ON "prayer_logs"("user_id", "prayer_name", "date");

-- CreateIndex
CREATE UNIQUE INDEX "calculation_methods_name_key" ON "calculation_methods"("name");

-- CreateIndex
CREATE UNIQUE INDEX "calculation_methods_slug_key" ON "calculation_methods"("slug");

-- CreateIndex
CREATE INDEX "user_locations_user_id_idx" ON "user_locations"("user_id");

-- CreateIndex
CREATE INDEX "quran_verses_surah_id_idx" ON "quran_verses"("surah_id");

-- CreateIndex
CREATE UNIQUE INDEX "quran_verses_surah_id_verse_number_key" ON "quran_verses"("surah_id", "verse_number");

-- CreateIndex
CREATE INDEX "quran_translations_verse_id_language_idx" ON "quran_translations"("verse_id", "language");

-- CreateIndex
CREATE INDEX "user_quran_bookmarks_user_id_idx" ON "user_quran_bookmarks"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_quran_progress_user_id_key" ON "user_quran_progress"("user_id");

-- CreateIndex
CREATE INDEX "dhikr_counters_user_id_is_active_idx" ON "dhikr_counters"("user_id", "is_active");

-- CreateIndex
CREATE INDEX "dhikr_goals_user_id_idx" ON "dhikr_goals"("user_id");

-- CreateIndex
CREATE INDEX "dhikr_history_user_id_date_idx" ON "dhikr_history"("user_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "dhikr_history_user_id_phrase_date_key" ON "dhikr_history"("user_id", "phrase", "date");

-- CreateIndex
CREATE UNIQUE INDEX "hijri_dates_gregorianDate_key" ON "hijri_dates"("gregorianDate");

-- CreateIndex
CREATE INDEX "hijri_dates_hijri_year_hijri_month_hijri_day_idx" ON "hijri_dates"("hijri_year", "hijri_month", "hijri_day");

-- CreateIndex
CREATE INDEX "islamic_events_hijri_month_hijri_day_idx" ON "islamic_events"("hijri_month", "hijri_day");

-- CreateIndex
CREATE INDEX "duas_category_id_idx" ON "duas"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "dua_categories_name_key" ON "dua_categories"("name");

-- CreateIndex
CREATE INDEX "user_custom_duas_user_id_idx" ON "user_custom_duas"("user_id");

-- CreateIndex
CREATE INDEX "user_favorite_duas_user_id_idx" ON "user_favorite_duas"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_favorite_duas_user_id_dua_id_key" ON "user_favorite_duas"("user_id", "dua_id");

-- CreateIndex
CREATE INDEX "user_favorite_allah_names_user_id_idx" ON "user_favorite_allah_names"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_favorite_allah_names_user_id_name_id_key" ON "user_favorite_allah_names"("user_id", "name_id");

-- CreateIndex
CREATE UNIQUE INDEX "qibla_cache_latitude_longitude_key" ON "qibla_cache"("latitude", "longitude");

-- AddForeignKey
ALTER TABLE "quran_verses" ADD CONSTRAINT "quran_verses_surah_id_fkey" FOREIGN KEY ("surah_id") REFERENCES "quran_surahs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quran_translations" ADD CONSTRAINT "quran_translations_verse_id_fkey" FOREIGN KEY ("verse_id") REFERENCES "quran_verses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duas" ADD CONSTRAINT "duas_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "dua_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
