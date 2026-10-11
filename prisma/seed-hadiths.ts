import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { prismaSchemaOptions } from "../src/common/utils/db-schema";
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
const adapter = new PrismaPg(pool, prismaSchemaOptions());
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
  /** Sequential index over the whole edition, 1..n. NOT the citation number. */
  hadithnumber: number;
  /**
   * The canonical number, as a string: "807" or "807.02". For Sahih Muslim
   * this is Abd al-Baqi numbering and differs completely from `hadithnumber`
   * (which runs 1..7563 over narrations, while Abd al-Baqi runs 1..3033 over
   * hadiths). Absent on rows the edition does not number — Muslim's Muqaddima,
   * and a few stragglers.
   */
  arabicnumber?: string | number | null;
  text: string;
  grades: Array<{ name: string; grade: string }>;
  /** `book` indexes `metadata.sections` directly — the only reliable chapter key. */
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
 * Resolve a hadith's chapter title from its own `reference.book`.
 *
 * This replaces a range-scan over `metadata.section_details`, which was
 * wrong. Those ranges overlap: in eng-muslim, section 43 ("The Book of
 * Virtues") declares 384–6168 while section 16 ("The Book of Marriage")
 * declares 388–3567, and 58 such overlaps exist in that edition alone.
 * Filling a Map range by range in key order meant the highest-numbered
 * overlapping section simply overwrote every section beneath it, so 5,785 of
 * Muslim's 7,563 rows (76%) ended up labelled "The Book of Virtues" and only
 * 16 of the edition's 57 sections survived. Tirmidhi (13 overlaps), Ibn Majah
 * (10) and Bukhari (boundary gaps) were mislabelled the same way, less
 * visibly.
 *
 * `reference.book` is a direct index into `metadata.sections` and is present
 * and resolvable on 100% of rows in all ten seeded editions, recovering the
 * full declared section list for each. Per-row assignment makes the broken
 * ranges irrelevant.
 */
function sectionTitleFor(
  hadith: CDNHadith,
  metadata: CDNEdition["metadata"]
): string | null {
  const sections = metadata.sections || {};
  const key = hadith?.reference?.book;
  if (key === undefined || key === null) return null;
  const title = sections[String(key)];
  return title && title.trim() ? title.trim() : null;
}

/**
 * Split the upstream `arabicnumber` into its canonical number and sub-index.
 *
 * "807"    -> { number: 807, suffix: 1 }
 * "807.02" -> { number: 807, suffix: 2 }
 * absent   -> null  (never guessed — an absent citation beats a wrong one)
 */
export function parseCanonicalNumber(
  raw: string | number | null | undefined
): { number: number; suffix: number } | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (!s) return null;

  const m = /^(\d+)(?:\.(\d+))?$/.exec(s);
  if (!m) return null;

  const number = parseInt(m[1], 10);
  if (!Number.isFinite(number) || number <= 0) return null;

  // "807.02" -> 2; an unsuffixed canonical number is the primary narration.
  const suffix = m[2] === undefined ? 1 : parseInt(m[2], 10);
  if (!Number.isFinite(suffix) || suffix <= 0) return null;

  return { number, suffix };
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
    canonicalNumber: number | null;
    canonicalSuffix: number | null;
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
    const res = await (prisma as any).hadith.createMany({
      data: batch.map((h) => ({
        bookId,
        hadithNumber: h.hadithNumber,
        canonicalNumber: h.canonicalNumber,
        canonicalSuffix: h.canonicalSuffix,
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
    // createMany reports what it actually wrote; `skipDuplicates` means that
    // is not always batch.length, and counting the input is how totalHadiths
    // came to overstate four of the ten books.
    inserted += typeof res?.count === "number" ? res.count : batch.length;
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

  // 3. Index the Arabic edition by sequential number, so the Arabic chapter
  //    title comes from the Arabic row's OWN reference.book rather than from
  //    the English row's — the two editions do not share section indices.
  const araBySeq = new Map<number, CDNHadith>();
  for (const h of araHadiths) araBySeq.set(h.hadithnumber, h);

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
  let missingCanonical = 0;
  const mergedHadiths = engHadiths.map((engH) => {
    const arabicText = arabicMap.get(engH.hadithnumber) || "";
    const araH = araBySeq.get(engH.hadithnumber);

    const chapterTitle = sectionTitleFor(engH, engData.metadata);
    const chapterTitleArabic = araH
      ? sectionTitleFor(araH, araData.metadata)
      : null;

    const grade = resolveGrade(engH.grades, config.defaultGrade);

    // The citation is the canonical number where the edition supplies one.
    // Falling back to the sequential index is what shipped the Sahih Muslim
    // mis-numbering, so there is no fallback: an unnumbered row gets no
    // citation string rather than a confidently wrong one.
    const canonical = parseCanonicalNumber(engH.arabicnumber);
    if (!canonical) missingCanonical++;
    const ref = canonical ? `${config.name} ${canonical.number}` : null;

    return {
      hadithNumber: engH.hadithnumber,
      canonicalNumber: canonical ? canonical.number : null,
      canonicalSuffix: canonical ? canonical.suffix : null,
      chapterTitle,
      chapterTitleArabic,
      textArabic: arabicText,
      textEnglish: engH.text,
      grade,
      reference: ref,
    };
  });

  const distinctChapters = new Set(
    mergedHadiths.map((h) => h.chapterTitle).filter(Boolean)
  ).size;
  const declaredSections = Object.keys(engData.metadata.sections || {}).length;
  console.log(
    `  Chapters: ${distinctChapters} distinct / ${declaredSections} declared sections`
  );
  if (missingCanonical > 0) {
    console.log(
      `  Note: ${missingCanonical} rows carry no canonical number upstream (left NULL, not citable)`
    );
  }

  // 7. Batch insert
  console.log(`  Inserting ${mergedHadiths.length} hadiths...`);
  const count = await batchCreateHadiths(dbBook.id, mergedHadiths);

  // 8. Record what was actually stored, not what was fetched. `totalHadiths`
  //    is shown to readers as the size of the collection; seeding it from the
  //    fetched array left Bukhari, Tirmidhi, Nasa'i and Ibn Majah overstating
  //    their own contents by the rows skipDuplicates had dropped.
  if (count !== engHadiths.length) {
    console.log(
      `  totalHadiths: ${engHadiths.length} fetched -> ${count} stored`
    );
  }
  await (prisma as any).hadithBook.update({
    where: { id: dbBook.id },
    data: { totalHadiths: count },
  });

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
