-- CreateTable
CREATE TABLE "emotions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icon" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emotion_remedies" (
    "id" TEXT NOT NULL,
    "arabic_text" TEXT NOT NULL,
    "transliteration" TEXT,
    "translation" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "emotion_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emotion_remedies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "emotions_name_key" ON "emotions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "emotions_slug_key" ON "emotions"("slug");

-- CreateIndex
CREATE INDEX "emotion_remedies_emotion_id_idx" ON "emotion_remedies"("emotion_id");

-- AddForeignKey
ALTER TABLE "emotion_remedies" ADD CONSTRAINT "emotion_remedies_emotion_id_fkey" FOREIGN KEY ("emotion_id") REFERENCES "emotions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
