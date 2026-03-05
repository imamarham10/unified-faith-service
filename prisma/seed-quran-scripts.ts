import { PrismaClient } from '@prisma/client';

const BATCH_SIZE = 500;

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`);
  }
  return res.json();
}

async function buildVerseMap(
  prisma: PrismaClient,
): Promise<Map<string, string>> {
  console.log('   Building verse lookup map...');
  const verses = await prisma.quranVerse.findMany({
    select: { id: true, surahId: true, verseNumber: true },
  });
  const map = new Map<string, string>();
  for (const v of verses) {
    map.set(`${v.surahId}:${v.verseNumber}`, v.id);
  }
  console.log(`   Loaded ${map.size} verses into lookup map.`);
  return map;
}

async function seedUthmaniScript(
  prisma: PrismaClient,
  verseMap: Map<string, string>,
): Promise<void> {
  console.log('📜 Seeding Uthmani script...');

  // Check if already seeded
  const sample = await prisma.quranVerse.findFirst({
    where: { textUthmani: { not: null } },
    select: { id: true },
  });
  if (sample) {
    console.log('   Uthmani script already seeded. Skipping.');
    return;
  }

  console.log('   Fetching quran-uthmani from Al Quran Cloud API...');
  const response = await fetchJson(
    'https://api.alquran.cloud/v1/quran/quran-uthmani',
  );
  const surahs = response?.data?.surahs;

  if (!surahs || !Array.isArray(surahs)) {
    console.warn('   Warning: Invalid response for quran-uthmani. Skipping.');
    return;
  }

  // Build update rows
  const rows: { id: string; textUthmani: string }[] = [];
  for (const surah of surahs) {
    for (const ayah of surah.ayahs) {
      const verseId = verseMap.get(`${surah.number}:${ayah.numberInSurah}`);
      if (verseId) {
        rows.push({ id: verseId, textUthmani: ayah.text });
      }
    }
  }

  console.log(`   Updating ${rows.length} verses with Uthmani text...`);

  // Batch update
  let updated = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map((row) =>
        prisma.quranVerse.update({
          where: { id: row.id },
          data: { textUthmani: row.textUthmani },
        }),
      ),
    );
    updated += batch.length;
    if (updated % 2000 === 0 || updated === rows.length) {
      console.log(`   Updated ${updated}/${rows.length} verses.`);
    }
  }

  console.log(`   Uthmani script seeded (${updated} verses).`);
}

export async function seedQuranScripts(
  prisma: PrismaClient,
): Promise<void> {
  console.log('\n📜 Starting Quran script data seed...');

  const verseMap = await buildVerseMap(prisma);

  if (verseMap.size === 0) {
    console.warn(
      '   No QuranVerse records found. Make sure the base Quran seed has run first. Skipping.',
    );
    return;
  }

  await seedUthmaniScript(prisma, verseMap);

  console.log('📜 Quran script data seed completed!\n');
}
