import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Seeds Siraat's own सरल हिन्दी अनुवाद as `hi` translations for every
 * Bhagavad Gita verse. Source: prisma/data/gita-hindi-siraat.json — an
 * ORIGINAL translation composed for Siraat (clean-room, from the Sanskrit
 * and public-domain English renderings). Siraat owns this text outright.
 *
 * The scriptures API already accepts ?lang=hi, so seeding these rows gives
 * the reader Hindi text with no code changes.
 *
 * Idempotent: upsert-equivalent on (verseId, languageCode='hi').
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

const AUTHOR = 'Siraat — सरल हिन्दी अनुवाद';

async function main() {
  console.log('🕉️  Seeding Siraat Hindi anuvad (text translations, lang=hi)...');

  const dataPath = path.join(__dirname, 'data', 'gita-hindi-siraat.json');
  const { anuvad } = JSON.parse(fs.readFileSync(dataPath, 'utf8')) as {
    anuvad: Record<string, string>;
  };
  const entries = Object.entries(anuvad);
  console.log(`📄 Loaded ${entries.length} Hindi verses`);

  const text = await prisma.hinduText.findUnique({ where: { slug: 'bhagavad-gita' } });
  if (!text) throw new Error('bhagavad-gita not found — run prisma:seed:hindu-gita first.');

  const verses = await prisma.hinduTextVerse.findMany({
    where: { textId: text.id },
    select: { id: true, verseNumber: true, chapter: { select: { chapterNumber: true } } },
  });
  const verseIdByKey = new Map(
    verses.map((v) => [`${v.chapter?.chapterNumber}.${v.verseNumber}`, v.id]),
  );

  let created = 0;
  let updated = 0;
  let missing = 0;

  for (const [key, hindi] of entries) {
    const verseId = verseIdByKey.get(key);
    if (!verseId) {
      console.warn(`  ⚠️ no verse in DB for ${key}`);
      missing++;
      continue;
    }
    const existing = await prisma.hinduTextTranslation.findFirst({
      where: { verseId, languageCode: 'hi' },
    });
    if (existing) {
      if (existing.text !== hindi || existing.authorName !== AUTHOR) {
        await prisma.hinduTextTranslation.update({
          where: { id: existing.id },
          data: { text: hindi, authorName: AUTHOR },
        });
        updated++;
      }
    } else {
      await prisma.hinduTextTranslation.create({
        data: { verseId, languageCode: 'hi', authorName: AUTHOR, text: hindi },
      });
      created++;
    }
  }

  console.log(`🎉 Hindi text seed complete: ${created} created, ${updated} updated, ${missing} missing.`);
  if (missing > 0) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error('❌ Hindi text seed failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
