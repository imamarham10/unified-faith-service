-- AlterTable
ALTER TABLE "hindu_temples" ADD COLUMN     "description" TEXT,
ADD COLUMN     "significance" TEXT,
ADD COLUMN     "state" TEXT;

-- AlterTable
ALTER TABLE "hindu_text_verses" ADD COLUMN     "is_featured" BOOLEAN NOT NULL DEFAULT false;
