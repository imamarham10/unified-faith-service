import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Completes the Bhagavad Gita to all 701 verses (the standard recension our
 * chapter metadata already encodes; "700" is the traditional round count).
 *
 * Data source: prisma/data/gita-full.json, generated from the MIT-licensed
 * open dataset at github.com/gita/gita — Devanagari + transliteration, with
 * the public-domain English translation of Shri Purohit Swami (1935).
 *
 * GAP-FILL ONLY: verses that already exist (the 149 hand-verified ones seeded
 * by seed-hindu-gita.ts, translated by Swami Swarupananda, incl. isFeatured
 * flags) are left completely untouched. Run seed-hindu-gita.ts FIRST.
 * Idempotent: re-running skips everything that exists.
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

interface Row {
  c: number; // chapter number
  v: number; // verse number
  sk: string; // sanskrit (Devanagari)
  tr: string; // transliteration
  en: string; // English translation (Shri Purohit Swami)
}

const AUTHOR = 'Shri Purohit Swami';

async function main() {
  console.log('🕉️  Completing the Bhagavad Gita (gap-fill to full text)...');

  const dataPath = path.join(__dirname, 'data', 'gita-full.json');
  const rows: Row[] = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  console.log(`📄 Loaded ${rows.length} verses from gita-full.json`);

  const text = await prisma.hinduText.findUnique({
    where: { slug: 'bhagavad-gita' },
    include: { chapters: true },
  });
  if (!text) {
    throw new Error('HinduText "bhagavad-gita" not found — run prisma:seed:hindu-gita first.');
  }

  const chapterByNumber = new Map(text.chapters.map((ch) => [ch.chapterNumber, ch]));

  // Existing verses — never touched.
  const existing = await prisma.hinduTextVerse.findMany({
    where: { textId: text.id },
    select: { id: true, verseNumber: true, chapter: { select: { chapterNumber: true } } },
  });
  const existingKeys = new Set(
    existing.map((v) => `${v.chapter?.chapterNumber}:${v.verseNumber}`),
  );
  console.log(`🔒 ${existingKeys.size} verses already seeded (kept as-is, Swarupananda translations preserved)`);

  let created = 0;
  let skipped = 0;
  const perChapter = new Map<number, number>();

  for (const row of rows) {
    if (existingKeys.has(`${row.c}:${row.v}`)) {
      skipped++;
      continue;
    }
    const chapter = chapterByNumber.get(row.c);
    if (!chapter) throw new Error(`Chapter ${row.c} missing — seed order problem.`);
    if (!row.sk || !row.en) throw new Error(`Empty content at ${row.c}.${row.v} — refusing to seed blanks.`);

    const verse = await prisma.hinduTextVerse.create({
      data: {
        textId: text.id,
        chapterId: chapter.id,
        verseNumber: row.v,
        sanskritText: row.sk,
        transliteration: row.tr || null,
        isFeatured: false,
      },
    });
    await prisma.hinduTextTranslation.create({
      data: {
        verseId: verse.id,
        languageCode: 'en',
        authorName: AUTHOR,
        text: row.en,
      },
    });
    created++;
    perChapter.set(row.c, (perChapter.get(row.c) ?? 0) + 1);
  }

  console.log(`✅ Created ${created} verses (+ translations by ${AUTHOR}); skipped ${skipped} existing.`);

  // Final per-chapter report
  const final = await prisma.hinduTextChapter.findMany({
    where: { textId: text.id },
    orderBy: { chapterNumber: 'asc' },
    include: { _count: { select: { verses: true } } },
  });
  let total = 0;
  for (const ch of final) {
    total += ch._count.verses;
    console.log(`   ch ${String(ch.chapterNumber).padStart(2)} ${ch.nameEnglish}: ${ch._count.verses} verses`);
  }
  console.log(`🎉 Bhagavad Gita now has ${total} verses.`);
}

main()
  .catch((e) => {
    console.error('❌ Gita full seed failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
