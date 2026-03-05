import { PrismaClient } from '@prisma/client';

const BATCH_SIZE = 500;

// ─── Reciters ────────────────────────────────────────────────────────
const reciters = [
  {
    name: 'Mishary Alafasy',
    slug: 'ar.alafasy',
    nameArabic: 'مشاري العفاسي',
    style: 'Murattal',
    audioBaseUrl:
      'https://cdn.islamic.network/quran/audio/128/ar.alafasy/',
    isPremium: true,
    sortOrder: 1,
  },
  {
    name: 'Abdul Rahman Al-Sudais',
    slug: 'ar.abdurrahmaansudais',
    nameArabic: 'عبد الرحمن السديس',
    style: 'Murattal',
    audioBaseUrl:
      'https://cdn.islamic.network/quran/audio/128/ar.abdurrahmaansudais/',
    isPremium: true,
    sortOrder: 2,
  },
  {
    name: 'Mohamed Siddiq El-Minshawi',
    slug: 'ar.minshawi',
    nameArabic: 'محمد صديق المنشاوي',
    style: 'Murattal',
    audioBaseUrl:
      'https://cdn.islamic.network/quran/audio/128/ar.minshawi/',
    isPremium: true,
    sortOrder: 3,
  },
  {
    name: 'Mahmoud Khalil Al-Husary',
    slug: 'ar.husary',
    nameArabic: 'محمود خليل الحصري',
    style: 'Murattal',
    audioBaseUrl:
      'https://cdn.islamic.network/quran/audio/128/ar.husary/',
    isPremium: true,
    sortOrder: 4,
  },
];

// ─── Premium translation editions ───────────────────────────────────
const premiumEditions = [
  { edition: 'en.pickthall', authorName: 'Pickthall' },
  { edition: 'en.yusufali', authorName: 'Yusuf Ali' },
  { edition: 'en.hilali', authorName: 'Muhsin Khan' },
  { edition: 'en.clearquran', authorName: 'Dr. Mustafa Khattab' },
];

// ─── Helpers ─────────────────────────────────────────────────────────

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`);
  }
  return res.json();
}

/**
 * Build a lookup map  verseKey ("surahId:verseNumber") -> verseId
 * for ALL verses in the database. Loaded once and reused.
 */
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

// ─── Seed Reciters ───────────────────────────────────────────────────

async function seedReciters(prisma: PrismaClient): Promise<void> {
  console.log('🎙️  Seeding Quran reciters...');

  for (const reciter of reciters) {
    await prisma.quranReciter.upsert({
      where: { slug: reciter.slug },
      update: {
        name: reciter.name,
        nameArabic: reciter.nameArabic,
        style: reciter.style,
        audioBaseUrl: reciter.audioBaseUrl,
        isPremium: reciter.isPremium,
        sortOrder: reciter.sortOrder,
      },
      create: reciter,
    });
  }

  console.log(`   Seeded ${reciters.length} reciters.`);
}

// ─── Seed Premium Translations ───────────────────────────────────────

async function seedPremiumTranslations(
  prisma: PrismaClient,
  verseMap: Map<string, string>,
): Promise<void> {
  console.log('📖 Seeding premium Quran translations...');

  // Mark existing Saheeh International translations as non-premium
  const updated = await prisma.quranTranslation.updateMany({
    where: { authorName: 'Saheeh International' },
    data: { isPremium: false },
  });
  console.log(
    `   Marked ${updated.count} Saheeh International translations as isPremium=false.`,
  );

  for (const { edition, authorName } of premiumEditions) {
    // Check if already seeded
    const existingCount = await prisma.quranTranslation.count({
      where: { authorName },
    });
    if (existingCount > 0) {
      console.log(
        `   ${authorName} already seeded (${existingCount} records). Skipping.`,
      );
      continue;
    }

    console.log(`   Fetching ${edition} (${authorName})...`);
    try {
      const apiUrl = `https://api.alquran.cloud/v1/quran/${edition}`;
      const response = await fetchJson(apiUrl);
      const surahs = response?.data?.surahs;

      if (!surahs || !Array.isArray(surahs)) {
        console.warn(`   Warning: Invalid response for ${edition}. Skipping.`);
        continue;
      }

      const translationRows: {
        verseId: string;
        language: string;
        authorName: string;
        text: string;
        isPremium: boolean;
      }[] = [];

      for (const surah of surahs) {
        for (const ayah of surah.ayahs) {
          const verseId = verseMap.get(
            `${surah.number}:${ayah.numberInSurah}`,
          );
          if (verseId) {
            translationRows.push({
              verseId,
              language: 'en',
              authorName,
              text: ayah.text,
              isPremium: true,
            });
          }
        }
      }

      // Batch insert
      let inserted = 0;
      for (let i = 0; i < translationRows.length; i += BATCH_SIZE) {
        const batch = translationRows.slice(i, i + BATCH_SIZE);
        const result = await prisma.quranTranslation.createMany({
          data: batch,
          skipDuplicates: true,
        });
        inserted += result.count;
      }

      console.log(
        `   Inserted ${inserted} translations for ${authorName}.`,
      );
    } catch (error) {
      console.warn(
        `   Warning: Failed to fetch/seed ${edition} (${authorName}). Skipping.`,
      );
      console.error(error);
    }
  }
}

// ─── Seed Transliteration ────────────────────────────────────────────

async function seedTransliteration(
  prisma: PrismaClient,
  verseMap: Map<string, string>,
): Promise<void> {
  console.log('✍️  Seeding Quran transliteration...');

  const existingCount = await prisma.quranTransliteration.count();
  if (existingCount > 0) {
    console.log(
      `   Transliteration already seeded (${existingCount} records). Skipping.`,
    );
    return;
  }

  console.log('   Fetching en.transliteration from API...');
  try {
    const apiUrl = 'https://api.alquran.cloud/v1/quran/en.transliteration';
    const response = await fetchJson(apiUrl);
    const surahs = response?.data?.surahs;

    if (!surahs || !Array.isArray(surahs)) {
      console.warn(
        '   Warning: Invalid response for transliteration. Skipping.',
      );
      return;
    }

    const translitRows: { verseId: string; text: string }[] = [];

    for (const surah of surahs) {
      for (const ayah of surah.ayahs) {
        const verseId = verseMap.get(
          `${surah.number}:${ayah.numberInSurah}`,
        );
        if (verseId) {
          translitRows.push({
            verseId,
            text: ayah.text,
          });
        }
      }
    }

    // Batch insert
    let inserted = 0;
    for (let i = 0; i < translitRows.length; i += BATCH_SIZE) {
      const batch = translitRows.slice(i, i + BATCH_SIZE);
      const result = await prisma.quranTransliteration.createMany({
        data: batch,
        skipDuplicates: true,
      });
      inserted += result.count;
    }

    console.log(`   Inserted ${inserted} transliteration records.`);
  } catch (error) {
    console.warn(
      '   Warning: Failed to fetch/seed transliteration. Skipping.',
    );
    console.error(error);
  }
}

// ─── Main export ─────────────────────────────────────────────────────

export async function seedQuranPremium(prisma: PrismaClient): Promise<void> {
  console.log('\n🌟 Starting Quran premium data seed...');

  // 1. Reciters (static, no API call needed)
  await seedReciters(prisma);

  // 2 & 3. Translations and transliteration need the verse lookup map
  const verseMap = await buildVerseMap(prisma);

  if (verseMap.size === 0) {
    console.warn(
      '   No QuranVerse records found in the database. ' +
        'Make sure the base Quran seed has run first. Skipping translations & transliteration.',
    );
    return;
  }

  // 2. Premium translations
  await seedPremiumTranslations(prisma, verseMap);

  // 3. Transliteration
  await seedTransliteration(prisma, verseMap);

  console.log('🌟 Quran premium data seed completed!\n');
}
