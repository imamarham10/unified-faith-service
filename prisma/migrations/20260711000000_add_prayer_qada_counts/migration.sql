-- CreateTable
CREATE TABLE "prayer_qada_counts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "prayer_name" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prayer_qada_counts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "prayer_qada_counts_user_id_idx" ON "prayer_qada_counts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "prayer_qada_counts_user_id_prayer_name_key" ON "prayer_qada_counts"("user_id", "prayer_name");
