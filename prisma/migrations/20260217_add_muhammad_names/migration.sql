-- Add Muhammad Names feature
-- Creates tables for 99 Names of Muhammad (saw) with user favorites support

-- Create MuhammadName table
CREATE TABLE IF NOT EXISTS "muhammad_names" (
  "id" INTEGER NOT NULL PRIMARY KEY,
  "name_arabic" TEXT NOT NULL,
  "name_transliteration" TEXT NOT NULL,
  "name_english" TEXT NOT NULL,
  "meaning" TEXT NOT NULL,
  "description" TEXT,
  "audio_url" TEXT
);

-- Create UserFavoriteMuhammadName table
CREATE TABLE IF NOT EXISTS "user_favorite_muhammad_names" (
  "id" UUID NOT NULL PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "name_id" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_favorite_muhammad_names_user_id_name_id_key" UNIQUE("user_id", "name_id")
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "user_favorite_muhammad_names_user_id_idx" ON "user_favorite_muhammad_names"("user_id");
