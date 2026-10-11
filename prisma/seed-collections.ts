/**
 * seed-collections.ts
 * ---------------------------------------------------------------------------
 * Curated collections — `team/curated-collections-spec.md` §1.2 / §2, Phase 2.
 *
 * Idempotent, standalone, in the same shape as the ~25 other seed scripts in
 * this directory:
 *     npm run prisma:seed:collections
 *
 * ## What this seeds, and what it deliberately does not
 *
 * **Only the collections whose content is already in the database and marked
 * ✅ in §2.** That is two of the fifteen collections the spec lists:
 *
 *   islam / `nightly-recitation`  — §2.1 #1, "✅ in DB (all Qur'an)"
 *   hindu / `gita-daily`          — §2.2 #1, "✅ 100% in DB"
 *
 * Everything else in §2 is ⚠️ partial or ❌ sourcing and is NOT seeded here.
 * Writing the Arabic, transliteration, translation, repeat count, citation and
 * grading for ~45 adhkar items is Phase 3 in §6 and is explicitly gated behind
 * Tier A *and* a paid Tier B review. No content is invented or transcribed in
 * this file; every item below is a *reference* to a row another seed already
 * created.
 *
 * Omitted even inside the two collections seeded:
 *   * `gita-daily`'s closing Shanti path — §2.2 marks it "❌ sourcing (1 item)".
 *   * `gita-daily`'s chapter 15 — §2.2 calls it "the alternate" to chapter 12,
 *     and §1.2's `CollectionItem` has no way to express alternate-to-an-item
 *     (`isOptional` means optional *within* the sequence). Reported as a model
 *     gap rather than approximated. See the comment on that collection below.
 *   * `friday-kahf`'s salawat — the Qur'an half is ✅ but the du'ā is ❌.
 *
 * ## reviewStatus
 *
 * Rows are written as `draft`, and **`draft` is never served** (spec §5.1 and
 * the §8 release gate) — `CollectionsService` filters it at the query level,
 * so these two collections are seeded but NOT yet reachable from the API. That
 * is the correct state: Tier A is a human, per-item checklist with a hard
 * "never merged the same day it was written" rule, and a seed script cannot
 * assert that a human did it.
 *
 * To promote after Tier A has actually been completed:
 *     npm run prisma:seed:collections -- \
 *       --review-status=self_reviewed --reviewed-by="<name of the reviewer>"
 * `--review-status` is refused without `--reviewed-by`, so a promotion always
 * leaves a name in the provenance columns (§5.4).
 *
 * ## Citations
 *
 * Every citation below is transcribed from §2.1 / §2.2, and the spec is
 * explicit that "every citation number and grading in the tables is
 * reconstructed and unverified". Run the gate before trusting any of them:
 *     npm run prisma:verify:collections
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { prismaSchemaOptions } from '../src/common/utils/db-schema';
import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool, prismaSchemaOptions(databaseUrl));
const prisma = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const ARGV = process.argv.slice(2);
const argValue = (name: string): string | undefined => {
  const hit = ARGV.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
};

const REVIEW_STATUS = argValue('review-status') ?? 'draft';
const REVIEWED_BY = argValue('reviewed-by');

if (REVIEW_STATUS !== 'draft' && !REVIEWED_BY) {
  console.error(
    '❌ --review-status may only be raised above "draft" together with ' +
      '--reviewed-by="<name>".\n' +
      '   Tier A is a human checklist (spec §5.1); a promotion must record who did it.',
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Content — references only. No scripture text lives in this file.
// ---------------------------------------------------------------------------

interface ItemSeed {
  sequence: number;
  refType: string;
  surahId?: number;
  ayahStart?: number;
  ayahEnd?: number;
  hinduTextSlug?: string;
  chapterNumber?: number;
  verseStart?: number;
  verseEnd?: number;
  refSlug?: string;
  refId?: string;
  repeatCount: number;
  label: string;
  note?: string;
  citation: string;
  grading?: string;
  translationSource?: string;
  isOptional?: boolean;
}

interface CollectionSeed {
  slug: string;
  faithId: string;
  title: string;
  subtitle?: string;
  description?: string;
  occasionType: string;
  occasionConfig?: Record<string, unknown>;
  orderSemantics?: string;
  provenanceClass: string;
  estimatedMinutes?: number;
  priority?: number;
  sortOrder?: number;
  items: ItemSeed[];
}

const COLLECTIONS: CollectionSeed[] = [
  // -------------------------------------------------------------------------
  // §2.1 #1 — nightly-recitation. transmitted. All six items are Qur'an
  // references to already-seeded rows; nothing here needs new content.
  // -------------------------------------------------------------------------
  {
    slug: 'nightly-recitation',
    faithId: 'islam',
    title: 'Nightly Recitation',
    subtitle: 'Before sleep',
    description:
      'The set recited before sleeping. Each item carries its own attested ' +
      'night-time warrant, and the assembly is the standard bedtime set.',
    occasionType: 'nightly',
    // §3.1 nightly shape. The window is evaluated from the device wall-clock
    // date, never a UTC instant — the client rule, repeated here so the stored
    // config cannot be read as an instruction to do otherwise.
    occasionConfig: { clock: { from: '20:00', to: '03:59' } },
    orderSemantics: 'sequence',
    provenanceClass: 'transmitted',
    estimatedMinutes: 6,
    priority: 10,
    sortOrder: 10,
    items: [
      {
        sequence: 1,
        refType: 'surah',
        surahId: 112,
        repeatCount: 3,
        label: 'Al-Ikhlas',
        note:
          'The ×3 belongs to the form in which the hands are cupped and blown ' +
          'into before wiping over the body. Recited once is also common in ' +
          'the general bedtime set — open reviewer question R1 (spec §5.5).',
        citation: 'Bukhari 5017',
        grading: 'sahih',
      },
      {
        sequence: 2,
        refType: 'surah',
        surahId: 113,
        repeatCount: 3,
        label: 'Al-Falaq',
        note: 'Part of the same cupped-hands form as the preceding item (R1).',
        citation: 'Bukhari 5017',
        grading: 'sahih',
      },
      {
        sequence: 3,
        refType: 'surah',
        surahId: 114,
        repeatCount: 3,
        label: 'An-Nas',
        note: 'Part of the same cupped-hands form as the preceding items (R1).',
        citation: 'Bukhari 5017',
        grading: 'sahih',
      },
      {
        sequence: 4,
        refType: 'ayah_range',
        surahId: 2,
        ayahStart: 255,
        repeatCount: 1,
        label: 'Ayat al-Kursi',
        citation: 'Bukhari 2311',
        grading: 'sahih',
      },
      {
        sequence: 5,
        refType: 'ayah_range',
        surahId: 2,
        ayahStart: 285,
        ayahEnd: 286,
        repeatCount: 1,
        label: 'The last two verses of Al-Baqarah',
        citation: 'Bukhari 5009 · Muslim 807',
        grading: 'sahih',
      },
      {
        sequence: 6,
        refType: 'surah',
        surahId: 67,
        repeatCount: 1,
        label: 'Al-Mulk',
        citation: 'Tirmidhi 2891 · Abu Dawud 1400',
        grading: 'hasan',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // §2.2 #1 — gita-daily. assembled. One item: Bhagavad Gita ch. 12, seeded
  // in full (20 verses, confirmed against the live API).
  //
  // TWO things §2.2 lists for this collection are deliberately NOT here:
  //
  //   * the closing Shanti path — marked "❌ sourcing (1 item)". This script
  //     does not write content.
  //
  //   * chapter 15, Purushottama Yoga. §2.2 names it "the alternate" — a
  //     substitution FOR chapter 12, not a second item after it. The schema
  //     in §1.2 has no way to say that: `isOptional` means "optional WITHIN
  //     this sequence", so encoding ch. 15 as sequence 2 would make a client
  //     render 40 verses back to back against an 8-minute estimate. There is
  //     no `alternateOf` concept on CollectionItem. Omitted rather than
  //     approximated; the gap is reported against §1.2.
  // -------------------------------------------------------------------------
  {
    slug: 'gita-daily',
    faithId: 'hindu',
    title: 'Daily Gita',
    subtitle: 'Bhakti Yoga — a daily reading',
    description:
      'A daily reading from the Bhagavad Gita: the twelfth chapter, Bhakti ' +
      'Yoga, twenty verses.',
    occasionType: 'evergreen',
    occasionConfig: { always: true },
    orderSemantics: 'sequence',
    // "assembled" per §2.2: the verses are canonical, the daily cadence is the
    // app's selection. §5.2 requires this to read as a selection in product
    // copy — never as "the" prescribed daily reading.
    provenanceClass: 'assembled',
    estimatedMinutes: 8,
    priority: 10,
    sortOrder: 10,
    items: [
      {
        sequence: 1,
        refType: 'hindu_verse_range',
        hinduTextSlug: 'bhagavad-gita',
        chapterNumber: 12,
        verseStart: 1,
        verseEnd: 20,
        repeatCount: 1,
        label: 'Bhagavad Gita 12 — Bhakti Yoga',
        citation: 'Bhagavad Gita 12.1–20',
        // Not a hadith-warranted item; §5.3 rule 3 does not apply, and
        // inventing a hadith-style grading for scripture would be worse than
        // leaving it explicit.
        grading: 'not_applicable',
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

async function main() {
  console.log('🌱 Seeding curated collections…');
  if (REVIEW_STATUS !== 'draft') {
    console.log(
      `   review status: ${REVIEW_STATUS} (reviewed by ${REVIEWED_BY})`,
    );
  }

  const now = new Date();
  let collectionCount = 0;
  let itemCount = 0;

  for (const seed of COLLECTIONS) {
    const base = {
      faithId: seed.faithId,
      title: seed.title,
      subtitle: seed.subtitle ?? null,
      description: seed.description ?? null,
      occasionType: seed.occasionType,
      occasionConfig: (seed.occasionConfig ?? null) as any,
      orderSemantics: seed.orderSemantics ?? 'sequence',
      provenanceClass: seed.provenanceClass,
      reviewStatus: REVIEW_STATUS,
      // §5.4 — provenance is real columns now, not a comment in a seed file.
      curatedBy: 'team/curated-collections-spec.md §2',
      curatedAt: now,
      reviewedBy: REVIEWED_BY ?? null,
      reviewedAt: REVIEWED_BY ? now : null,
      estimatedMinutes: seed.estimatedMinutes ?? null,
      priority: seed.priority ?? 0,
      sortOrder: seed.sortOrder ?? 0,
      isActive: true,
    };

    const collection = await prisma.collection.upsert({
      where: { slug: seed.slug },
      update: base,
      create: { slug: seed.slug, ...base },
    });

    // Items are addressed by (collectionId, sequence). Anything beyond the
    // sequences this file declares is removed, so re-running after shortening
    // a collection does not leave an orphan tail behind.
    const sequences = seed.items.map((i) => i.sequence);
    const removed = await prisma.collectionItem.deleteMany({
      where: { collectionId: collection.id, sequence: { notIn: sequences } },
    });
    if (removed.count) {
      console.log(`    - removed ${removed.count} stale item(s)`);
    }

    for (const item of seed.items) {
      const itemBase = {
        refType: item.refType,
        surahId: item.surahId ?? null,
        ayahStart: item.ayahStart ?? null,
        ayahEnd: item.ayahEnd ?? null,
        hinduTextSlug: item.hinduTextSlug ?? null,
        chapterNumber: item.chapterNumber ?? null,
        verseStart: item.verseStart ?? null,
        verseEnd: item.verseEnd ?? null,
        refSlug: item.refSlug ?? null,
        refId: item.refId ?? null,
        repeatCount: item.repeatCount,
        label: item.label,
        note: item.note ?? null,
        citation: item.citation,
        grading: item.grading ?? null,
        translationSource: item.translationSource ?? null,
        isOptional: item.isOptional ?? false,
      };
      await prisma.collectionItem.upsert({
        where: {
          collectionId_sequence: {
            collectionId: collection.id,
            sequence: item.sequence,
          },
        },
        update: itemBase,
        create: {
          collectionId: collection.id,
          sequence: item.sequence,
          ...itemBase,
        },
      });
      itemCount++;
    }

    collectionCount++;
    console.log(
      `  ✅ [${seed.faithId}] ${seed.slug} — ${seed.items.length} items, ` +
        `${seed.provenanceClass}, ${REVIEW_STATUS}`,
    );
  }

  console.log(
    `🎉 Collections seed completed: ${collectionCount} collections, ${itemCount} items.`,
  );
  console.log('');
  console.log('   NOT seeded (content is ⚠️ partial or ❌ sourcing in spec §2):');
  console.log(
    '     islam: friday-kahf, morning-adhkar, evening-adhkar, after-prayer-adhkar,',
  );
  console.log('            ruqyah, travel-duas, last-ten-nights');
  console.log(
    '     hindu: mangalwar-hanuman, somvar-shiva, pratah-smaran, sandhya-deepa,',
  );
  console.log('            ekadashi, navratri');
  console.log('');
  if (REVIEW_STATUS === 'draft') {
    console.log(
      '   ⚠️  Seeded as reviewStatus=draft, which the API never serves (spec §5.1).',
    );
    console.log(
      '      GET /api/v1/{islam,hindu}/collections returns [] until a human',
    );
    console.log('      completes the Tier A checklist and re-runs with:');
    console.log(
      '        npm run prisma:seed:collections -- --review-status=self_reviewed --reviewed-by="<name>"',
    );
  }
  console.log('   Next: npm run prisma:verify:collections');
}

main()
  .catch((e) => {
    console.error('❌ Collections seed failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
