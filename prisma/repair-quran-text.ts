/**
 * Repair script: fixes corrupted Arabic text in Quran verses.
 *
 * The original seed used `data += chunk` on raw Buffers, which corrupts
 * multi-byte UTF-8 characters that span chunk boundaries (produces U+FFFD).
 *
 * This script fetches the correct text from the CDN and updates any verse
 * whose textArabic contains U+FFFD replacement characters.
 *
 * Usage:  npx tsx prisma/repair-quran-text.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as https from 'https';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const connectionString = databaseUrl.replace('sslmode=require', '');
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function fetchJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      res.setEncoding('utf-8');
      let data = '';
      res.on('data', (chunk: string) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', (err) => reject(err));
  });
}

async function main() {
  console.log('Fetching correct Quran text from CDN...');
  const arabicData = await fetchJson(
    'https://cdn.jsdelivr.net/npm/quran-json@3.1.2/dist/quran.json',
  );

  // Build lookup: (surahId, verseNumber) -> correct Arabic text
  const correctText = new Map<string, string>();
  for (const surah of arabicData) {
    for (const verse of surah.verses) {
      correctText.set(`${surah.id}:${verse.id}`, verse.text);
    }
  }

  // Find all corrupted verses (containing U+FFFD)
  const allVerses = await prisma.quranVerse.findMany({
    select: { id: true, surahId: true, verseNumber: true, textArabic: true },
  });

  const corrupted = allVerses.filter((v) => v.textArabic.includes('\uFFFD'));
  console.log(`Found ${corrupted.length} corrupted verses.`);

  let fixed = 0;
  for (const v of corrupted) {
    const key = `${v.surahId}:${v.verseNumber}`;
    const correct = correctText.get(key);
    if (!correct) {
      console.warn(`  No CDN match for ${key}, skipping`);
      continue;
    }

    await prisma.quranVerse.update({
      where: { id: v.id },
      data: { textArabic: correct, textSimple: correct },
    });
    fixed++;
    console.log(`  Fixed Surah ${v.surahId}:${v.verseNumber}`);
  }

  console.log(`\nDone. Repaired ${fixed}/${corrupted.length} verses.`);
  await prisma.$disconnect();
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
