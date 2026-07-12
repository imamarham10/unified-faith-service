import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

/**
 * Seeds Hindi narration for the Bhagavad Gita — chapter-level audio of
 * Siraat's OWN सरल हिन्दी अनुवाद (see prisma/data/gita-hindi-siraat.json;
 * original translation, owned by Siraat), synthesized with the
 * hi-IN-MadhurNeural voice (edge-tts) and served same-origin from the web
 * app (`/audio/gita/hi/chNN.mp3`).
 *
 * Idempotent: keyed on (chapter, reciterSlug).
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

const RECITER_SLUG = 'siraat-hindi-anuvad';

async function main() {
  console.log('🔊 Seeding Bhagavad Gita Hindi narration (Siraat anuvad)...');

  const text = await prisma.hinduText.findUnique({
    where: { slug: 'bhagavad-gita' },
    include: { chapters: true },
  });
  if (!text) throw new Error('bhagavad-gita text not found — run prisma:seed:hindu-gita first.');

  let created = 0;
  let updated = 0;

  for (const chapter of text.chapters.sort((a, b) => a.chapterNumber - b.chapterNumber)) {
    const nn = String(chapter.chapterNumber).padStart(2, '0');
    const url = `/audio/gita/hi/ch${nn}.mp3`;

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
    console.log(`  ✅ ch ${nn} → ${url}`);
  }

  console.log(`🎉 Hindi narration seed complete: ${created} created, ${updated} updated.`);
}

main()
  .catch((e) => {
    console.error('❌ Hindi narration seed failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
