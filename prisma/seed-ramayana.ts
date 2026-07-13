import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Seeds the complete Valmiki Ramayana: 7 kandas as HinduText rows, sargas as
 * chapters, 19,371 shlokas as verses with M.N. Dutt's public-domain English
 * translation (1891-94), verse-aligned via the Itihasa dataset.
 *
 * Data file: prisma/data/ramayana.json (built by scripts/build-ramayana-dataset.py).
 * Known source gaps: Aranya sargas 13 & 58, Sundara sarga 24.
 *
 * Idempotent gap-fill: existing verses/translations are never touched, so the
 * script is safe to re-run after a partial failure.
 */

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl?.replace('sslmode=require', ''),
  ssl: { rejectUnauthorized: false },
  max: 4,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const AUTHOR = 'M.N. Dutt (1891–94, public domain)';
const CHUNK = 1000;

interface VerseRow {
  n: number;
  sa: string;
  iast: string;
  en: string;
}
interface Sarga {
  number: number;
  verses: VerseRow[];
}
interface Kanda {
  slug: string;
  nameEnglish: string;
  nameSanskrit: string;
  order: number;
  sargaCount: number;
  verseCount: number;
  sargas: Sarga[];
}

function chunks<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function seedKanda(kanda: Kanda) {
  const text = await prisma.hinduText.upsert({
    where: { slug: kanda.slug },
    update: { totalVerses: kanda.verseCount },
    create: {
      slug: kanda.slug,
      nameEnglish: `Valmiki Ramayana — ${kanda.nameEnglish}`,
      nameSanskrit: kanda.nameSanskrit,
      type: 'ramayana',
      totalVerses: kanda.verseCount,
      isPremium: false,
    },
  });

  // Chapters (sargas)
  const chapterByNumber = new Map<number, string>();
  for (const sarga of kanda.sargas) {
    const ch = await prisma.hinduTextChapter.upsert({
      where: { textId_chapterNumber: { textId: text.id, chapterNumber: sarga.number } },
      update: {},
      create: {
        textId: text.id,
        chapterNumber: sarga.number,
        nameSanskrit: `${kanda.nameSanskrit} सर्गः ${sarga.number}`,
        nameEnglish: `${kanda.nameEnglish}, Sarga ${sarga.number}`,
      },
    });
    chapterByNumber.set(sarga.number, ch.id);
  }

  // Existing verses (gap-fill: never touched)
  const existing = await prisma.hinduTextVerse.findMany({
    where: { textId: text.id },
    select: { verseNumber: true, chapter: { select: { chapterNumber: true } } },
  });
  const existingKeys = new Set(existing.map((v) => `${v.chapter?.chapterNumber}:${v.verseNumber}`));

  const verseRows: {
    textId: string;
    chapterId: string;
    verseNumber: number;
    sanskritText: string;
    transliteration: string;
  }[] = [];
  for (const sarga of kanda.sargas) {
    const chapterId = chapterByNumber.get(sarga.number)!;
    for (const v of sarga.verses) {
      if (existingKeys.has(`${sarga.number}:${v.n}`)) continue;
      if (!v.sa || !v.en) throw new Error(`Empty content at ${kanda.slug} ${sarga.number}.${v.n}`);
      verseRows.push({
        textId: text.id,
        chapterId,
        verseNumber: v.n,
        sanskritText: v.sa,
        transliteration: v.iast,
      });
    }
  }
  for (const batch of chunks(verseRows, CHUNK)) {
    await prisma.hinduTextVerse.createMany({ data: batch });
  }

  // Map (chapterId, verseNumber) -> verseId for translations
  const allVerses = await prisma.hinduTextVerse.findMany({
    where: { textId: text.id },
    select: { id: true, chapterId: true, verseNumber: true },
  });
  const verseId = new Map(allVerses.map((v) => [`${v.chapterId}:${v.verseNumber}`, v.id]));

  const existingTr = await prisma.hinduTextTranslation.findMany({
    where: { verse: { textId: text.id }, languageCode: 'en' },
    select: { verseId: true },
  });
  const hasTr = new Set(existingTr.map((t) => t.verseId));

  const trRows: { verseId: string; languageCode: string; authorName: string; text: string }[] = [];
  for (const sarga of kanda.sargas) {
    const chapterId = chapterByNumber.get(sarga.number)!;
    for (const v of sarga.verses) {
      const id = verseId.get(`${chapterId}:${v.n}`);
      if (!id || hasTr.has(id)) continue;
      trRows.push({ verseId: id, languageCode: 'en', authorName: AUTHOR, text: v.en });
    }
  }
  for (const batch of chunks(trRows, CHUNK)) {
    await prisma.hinduTextTranslation.createMany({ data: batch, skipDuplicates: true });
  }

  console.log(
    `✅ ${kanda.slug}: ${kanda.sargas.length} sargas | +${verseRows.length} verses | +${trRows.length} translations`,
  );
}

async function main() {
  console.log('🏹 Seeding Valmiki Ramayana (7 kandas, 19,371 shlokas)...');
  const dataPath = path.join(__dirname, 'data', 'ramayana.json');
  const data: { kandas: Kanda[] } = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  for (const kanda of data.kandas) {
    await seedKanda(kanda);
  }

  const totals = await prisma.hinduTextVerse.count({
    where: { text: { type: 'ramayana' } },
  });
  console.log(`🏁 Ramayana verses in DB: ${totals}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
