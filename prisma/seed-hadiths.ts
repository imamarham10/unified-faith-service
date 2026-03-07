import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// ── Database setup ──────────────────────────────────────────────────────────
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl.replace("sslmode=require", ""),
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ── CDN base URL ────────────────────────────────────────────────────────────
const CDN_BASE =
  "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions";

// ── Types ───────────────────────────────────────────────────────────────────
interface BookConfig {
  apiKey: string;
  name: string;
  nameArabic: string;
  author: string;
  authorArabic: string;
  isPremium: boolean;
  sortOrder: number;
  defaultGrade: string | null;
  description: string;
}

interface CDNHadith {
  hadithnumber: number;
  arabicnumber: number;
  text: string;
  grades: Array<{ name: string; grade: string }>;
  reference: { book: number; hadith: number };
}

interface CDNEdition {
  metadata: {
    name: string;
    sections: Record<string, string>;
    section_details: Record<
      string,
      {
        hadithnumber_first: number;
        hadithnumber_last: number;
        arabicnumber_first: string | number;
        arabicnumber_last: string | number;
      }
    >;
  };
  hadiths: CDNHadith[];
}

// ── Book configurations ─────────────────────────────────────────────────────
const BOOK_CONFIGS: BookConfig[] = [
  {
    apiKey: "bukhari",
    name: "Sahih al-Bukhari",
    nameArabic: "صحيح البخاري",
    author: "Imam Muhammad al-Bukhari",
    authorArabic: "الإمام محمد بن إسماعيل البخاري",
    isPremium: false,
    sortOrder: 1,
    defaultGrade: "Sahih",
    description:
      "The most authentic collection of hadith, compiled by Imam al-Bukhari (810–870 CE). Contains 7,563 hadiths covering all aspects of Islamic life, jurisprudence, and belief.",
  },
  {
    apiKey: "muslim",
    name: "Sahih Muslim",
    nameArabic: "صحيح مسلم",
    author: "Imam Muslim ibn al-Hajjaj",
    authorArabic: "الإمام مسلم بن الحجاج النيسابوري",
    isPremium: true,
    sortOrder: 2,
    defaultGrade: "Sahih",
    description:
      "The second most authentic hadith collection, compiled by Imam Muslim (815–875 CE). Known for its rigorous methodology and systematic arrangement by topic.",
  },
  {
    apiKey: "abudawud",
    name: "Sunan Abu Dawud",
    nameArabic: "سنن أبي داود",
    author: "Imam Abu Dawud as-Sijistani",
    authorArabic: "الإمام أبو داود السجستاني",
    isPremium: true,
    sortOrder: 3,
    defaultGrade: null,
    description:
      "One of the six canonical collections, compiled by Abu Dawud (817–889 CE). Focuses primarily on hadiths related to Islamic jurisprudence (fiqh) and legal rulings.",
  },
  {
    apiKey: "tirmidhi",
    name: "Jami at-Tirmidhi",
    nameArabic: "جامع الترمذي",
    author: "Imam at-Tirmidhi",
    authorArabic: "الإمام أبو عيسى الترمذي",
    isPremium: true,
    sortOrder: 4,
    defaultGrade: null,
    description:
      "Compiled by Imam at-Tirmidhi (824–892 CE). Unique for including scholarly commentary and grading each hadith. Covers jurisprudence, virtues, and manners.",
  },
  {
    apiKey: "nasai",
    name: "Sunan an-Nasa'i",
    nameArabic: "سنن النسائي",
    author: "Imam an-Nasa'i",
    authorArabic: "الإمام أحمد بن شعيب النسائي",
    isPremium: true,
    sortOrder: 5,
    defaultGrade: null,
    description:
      "Compiled by Imam an-Nasa'i (829–915 CE). Known for its strict criteria of authenticity, second only to the two Sahih collections. Strong focus on fiqh-related narrations.",
  },
  {
    apiKey: "ibnmajah",
    name: "Sunan Ibn Majah",
    nameArabic: "سنن ابن ماجه",
    author: "Imam Ibn Majah",
    authorArabic: "الإمام ابن ماجه القزويني",
    isPremium: true,
    sortOrder: 6,
    defaultGrade: null,
    description:
      "The sixth of the canonical collections, compiled by Ibn Majah (824–887 CE). Contains unique hadiths not found in the other five major collections.",
  },
  {
    apiKey: "malik",
    name: "Muwatta Imam Malik",
    nameArabic: "موطأ الإمام مالك",
    author: "Imam Malik ibn Anas",
    authorArabic: "الإمام مالك بن أنس",
    isPremium: true,
    sortOrder: 7,
    defaultGrade: null,
    description:
      "One of the earliest hadith compilations, written by Imam Malik (711–795 CE), the founder of the Maliki school. Combines hadiths with the practice of the people of Madinah.",
  },
  {
    apiKey: "nawawi",
    name: "40 Hadith Nawawi",
    nameArabic: "الأربعون النووية",
    author: "Imam an-Nawawi",
    authorArabic: "الإمام يحيى بن شرف النووي",
    isPremium: false,
    sortOrder: 8,
    defaultGrade: "Sahih",
    description:
      "A curated collection of 42 hadiths by Imam an-Nawawi (1233–1277 CE). These foundational hadiths cover the core principles of Islam and are widely memorized worldwide.",
  },
  {
    apiKey: "qudsi",
    name: "40 Hadith Qudsi",
    nameArabic: "الأحاديث القدسية",
    author: "Various Compilers",
    authorArabic: "مختلف العلماء",
    isPremium: false,
    sortOrder: 9,
    defaultGrade: null,
    description:
      "Sacred hadiths (Hadith Qudsi) where the Prophet Muhammad (ﷺ) relates words directly from Allah, distinct from the Quran. Compiled from various authentic sources.",
  },
  {
    apiKey: "dehlawi",
    name: "40 Hadith Shah Waliullah",
    nameArabic: "الأربعون حديثاً لشاه ولي الله",
    author: "Shah Waliullah Dehlawi",
    authorArabic: "شاه ولي الله الدهلوي",
    isPremium: false,
    sortOrder: 10,
    defaultGrade: null,
    description:
      "A selection of 40 hadiths compiled by the renowned Indian scholar Shah Waliullah Dehlawi (1703–1762 CE), covering essential teachings of Islam.",
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

async function fetchWithRetry(url: string, retries = 3): Promise<any> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (err: any) {
      console.warn(
        `  Fetch attempt ${attempt}/${retries} failed for ${url}: ${err.message}`
      );
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
}

/**
 * Build a lookup: hadithnumber → section title
 * Uses section_details ranges from metadata
 */
function buildSectionLookup(
  metadata: CDNEdition["metadata"]
): Map<number, string> {
  const lookup = new Map<number, string>();
  const sections = metadata.sections || {};
  const details = metadata.section_details || {};

  for (const [sectionKey, range] of Object.entries(details)) {
    const title = sections[sectionKey] || "";
    if (!title || !range.hadithnumber_first || !range.hadithnumber_last)
      continue;

    for (
      let num = range.hadithnumber_first;
      num <= range.hadithnumber_last;
      num++
    ) {
      lookup.set(num, title);
    }
  }

  return lookup;
}

/**
 * Extract the primary grade from the grades array.
 * Falls back to book-level default if grades array is empty.
 */
function resolveGrade(
  grades: CDNHadith["grades"],
  defaultGrade: string | null
): string | null {
  if (grades && grades.length > 0) {
    return grades[0].grade;
  }
  return defaultGrade;
}

/**
 * Insert hadiths in batches using createMany for performance.
 */
async function batchCreateHadiths(
  bookId: string,
  hadiths: Array<{
    hadithNumber: number;
    chapterTitle: string | null;
    chapterTitleArabic: string | null;
    textArabic: string;
    textEnglish: string;
    grade: string | null;
    reference: string | null;
  }>,
  batchSize: number = 500
) {
  let inserted = 0;
  for (let i = 0; i < hadiths.length; i += batchSize) {
    const batch = hadiths.slice(i, i + batchSize);
    await (prisma as any).hadith.createMany({
      data: batch.map((h) => ({
        bookId,
        hadithNumber: h.hadithNumber,
        chapterTitle: h.chapterTitle,
        chapterTitleArabic: h.chapterTitleArabic,
        textArabic: h.textArabic,
        textEnglish: h.textEnglish,
        narratorChain: null,
        narratorChainArabic: null,
        grade: h.grade,
        reference: h.reference,
      })),
      skipDuplicates: true,
    });
    inserted += batch.length;
    if (hadiths.length > 100) {
      console.log(
        `    Inserted ${inserted}/${hadiths.length} (${Math.round((inserted / hadiths.length) * 100)}%)`
      );
    }
  }
  return inserted;
}

// ── Main seed function ──────────────────────────────────────────────────────

async function seedBook(config: BookConfig) {
  console.log(`\n📖 ${config.name} (${config.apiKey})...`);

  // 1. Fetch English and Arabic editions in parallel
  console.log(`  Fetching from CDN...`);
  const [engData, araData] = await Promise.all([
    fetchWithRetry(`${CDN_BASE}/eng-${config.apiKey}.json`) as Promise<CDNEdition>,
    fetchWithRetry(`${CDN_BASE}/ara-${config.apiKey}.json`) as Promise<CDNEdition>,
  ]);

  const engHadiths = engData.hadiths || [];
  const araHadiths = araData.hadiths || [];

  console.log(
    `  Fetched: ${engHadiths.length} English, ${araHadiths.length} Arabic hadiths`
  );

  // 2. Build Arabic text lookup by hadith number
  const arabicMap = new Map<number, string>();
  for (const h of araHadiths) {
    arabicMap.set(h.hadithnumber, h.text);
  }

  // 3. Build section title lookups for chapter mapping
  const engSectionLookup = buildSectionLookup(engData.metadata);
  const araSectionLookup = buildSectionLookup(araData.metadata);

  // 4. Upsert book record
  const dbBook = await (prisma as any).hadithBook.upsert({
    where: { name: config.name },
    update: {
      nameArabic: config.nameArabic,
      author: config.author,
      authorArabic: config.authorArabic,
      totalHadiths: engHadiths.length,
      isPremium: config.isPremium,
      description: config.description,
      sortOrder: config.sortOrder,
    },
    create: {
      name: config.name,
      nameArabic: config.nameArabic,
      author: config.author,
      authorArabic: config.authorArabic,
      totalHadiths: engHadiths.length,
      isPremium: config.isPremium,
      description: config.description,
      sortOrder: config.sortOrder,
    },
  });

  // 5. Delete existing hadiths for this book (clean slate for re-seeding)
  const deleted = await (prisma as any).hadith.deleteMany({
    where: { bookId: dbBook.id },
  });
  if (deleted.count > 0) {
    console.log(`  Cleared ${deleted.count} existing hadiths`);
  }

  // 6. Merge English + Arabic and prepare records
  const mergedHadiths = engHadiths.map((engH) => {
    const arabicText = arabicMap.get(engH.hadithnumber) || "";
    const chapterTitle = engSectionLookup.get(engH.hadithnumber) || null;
    const chapterTitleArabic = araSectionLookup.get(engH.hadithnumber) || null;
    const grade = resolveGrade(engH.grades, config.defaultGrade);
    const ref = engH.reference
      ? `${config.name} ${engH.hadithnumber}`
      : null;

    return {
      hadithNumber: engH.hadithnumber,
      chapterTitle,
      chapterTitleArabic,
      textArabic: arabicText,
      textEnglish: engH.text,
      grade,
      reference: ref,
    };
  });

  // 7. Batch insert
  console.log(`  Inserting ${mergedHadiths.length} hadiths...`);
  const count = await batchCreateHadiths(dbBook.id, mergedHadiths);
  console.log(`  ✅ ${config.name}: ${count} hadiths seeded`);
}

async function main() {
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║  Hadith Seed — Complete Collections from CDN        ║");
  console.log("║  Source: fawazahmed0/hadith-api (jsdelivr CDN)      ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log(`\nSeeding ${BOOK_CONFIGS.length} collections...\n`);

  const results: Array<{ name: string; status: string; count: number }> = [];

  for (const config of BOOK_CONFIGS) {
    try {
      await seedBook(config);
      const count = await (prisma as any).hadith.count({
        where: {
          book: { name: config.name },
        },
      });
      results.push({ name: config.name, status: "OK", count });
    } catch (err: any) {
      console.error(`  ❌ ERROR seeding ${config.name}:`, err.message);
      results.push({ name: config.name, status: "FAILED", count: 0 });
    }
  }

  // Summary
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║  Summary                                            ║");
  console.log("╠══════════════════════════════════════════════════════╣");

  let totalHadiths = 0;
  for (const r of results) {
    const pad = r.name.padEnd(30);
    const countStr = r.count.toString().padStart(6);
    const status = r.status === "OK" ? "✅" : "❌";
    console.log(`║  ${status} ${pad} ${countStr} hadiths ║`);
    totalHadiths += r.count;
  }

  console.log("╠══════════════════════════════════════════════════════╣");
  console.log(
    `║  Total: ${totalHadiths.toString().padStart(6)} hadiths across ${results.filter((r) => r.status === "OK").length} collections     ║`
  );
  console.log("╚══════════════════════════════════════════════════════╝");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
