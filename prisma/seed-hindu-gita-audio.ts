import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

/**
 * Seeds chapter-level narration for the Bhagavad Gita.
 *
 * Source: LibriVox "Bhagavad Gita" (bhagavad_gita_0803_librivox) — Sir Edwin
 * Arnold's "The Song Celestial" translation, read for LibriVox and released
 * into the PUBLIC DOMAIN (explicit license on the archive.org item). Files
 * bhagavadgita_01..18_64kb.mp3 map to chapters 1–18 (00 is the preamble,
 * not seeded). Streamed directly from archive.org (Range requests supported).
 *
 * Idempotent: keyed on (chapter, reciterSlug) — safe to re-run.
 */

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl?.replace('sslmode=require', ''),
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const RECITER_SLUG = 'edwin-arnold-librivox';
const BASE = 'https://archive.org/download/bhagavad_gita_0803_librivox';

async function main() {
  console.log('🔊 Seeding Bhagavad Gita chapter narration (LibriVox, public domain)...');

  const text = await prisma.hinduText.findUnique({
    where: { slug: 'bhagavad-gita' },
    include: { chapters: true },
  });
  if (!text) throw new Error('bhagavad-gita text not found — run prisma:seed:hindu-gita first.');

  let created = 0;
  let updated = 0;

  for (const chapter of text.chapters.sort((a, b) => a.chapterNumber - b.chapterNumber)) {
    const nn = String(chapter.chapterNumber).padStart(2, '0');
    const url = `${BASE}/bhagavadgita_${nn}_64kb.mp3`;

    const existing = await prisma.hinduTextAudio.findFirst({
      where: { textId: text.id, chapterId: chapter.id, reciterSlug: RECITER_SLUG },
    });
    if (existing) {
      if (existing.url !== url) {
        await prisma.hinduTextAudio.update({ where: { id: existing.id }, data: { url } });
        updated++;
      }
    } else {
      await prisma.hinduTextAudio.create({
        data: {
          textId: text.id,
          chapterId: chapter.id,
          reciterSlug: RECITER_SLUG,
          url,
          isPremium: false,
        },
      });
      created++;
    }
    console.log(`  ✅ ch ${nn} → bhagavadgita_${nn}_64kb.mp3`);
  }

  console.log(`🎉 Gita audio seed complete: ${created} created, ${updated} updated.`);
}

main()
  .catch((e) => {
    console.error('❌ Gita audio seed failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
