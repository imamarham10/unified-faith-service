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
 * Twelve collections. Every item is a **reference to a row another seed
 * already created** — no Arabic, no Sanskrit, no translation and no hadith
 * text is written here. Where the spec lists an item that is not in the
 * database, the item is omitted and the omission is recorded in the comment
 * above its collection, with the reason.
 *
 *   islam  nightly-recitation · friday-kahf · after-prayer-adhkar ·
 *          morning-adhkar · evening-adhkar · ruqyah · travel-duas
 *   hindu  gita-daily · mangalwar-hanuman · somvar-shiva · sandhya-deepa ·
 *          navratri
 *
 * NOT built, deliberately:
 *   * `last-ten-nights` — the only item with transmitted warrant for the
 *     night is the "Allahumma innaka 'Afuwwun" du'ā, and there is no `duas`
 *     row for it. The narration carrying it IS seeded (Tirmidhi 3513,
 *     content-checked), but `refType: 'hadith'` serialises the hadith row
 *     whole, so the item would render an isnad ("haddathana Qutaybah ibn
 *     Sa'id, haddathana Ja'far ibn Sulayman…") and a closing grading remark
 *     on what is meant to be a recitation screen. Surah Al-Qadr is seeded
 *     but only NAMES the night; it carries no warrant to be recited on it,
 *     and adding it would quietly demote the collection to `assembled`.
 *     This ships the day that du'ā gets a `duas` row — nothing else is
 *     missing.
 *   * `ekadashi` — the item that makes it an Ekadashi observance is the
 *     Vishnu Sahasranama, and it is not seeded. What IS seeded that could go
 *     in (Madhurashtakam, Bhaja Govindam, Gita 12) carries no Ekadashi
 *     warrant, and Gita 12 is already the whole of `gita-daily`. Three items
 *     that amount to "the Vaishnava stotras we happen to have" is a grouping
 *     claim this app has no basis for (§5.2).
 *   * `pratah-smaran` — all four of its defining items are absent. Gayatri,
 *     "Karagre vasate Lakshmi" and "Samudra vasane devi" are ❌ in §2.2;
 *     Aditya Hridayam IS seeded and resolves cleanly at
 *     `ramayana-yuddha-kanda` sarga 105, verses 1–18 (verified: "आदित्यहृदयं"
 *     appears at 105:2 and nowhere else in the kanda). But one Ramayana
 *     stotra under a "morning remembrance" label is an Aditya Hridayam
 *     collection wearing another name.
 *   * `hindu-bedtime` — §2.4 is explicit: UNCERTAIN, do not ship v1.
 *     Mirroring the Islamic bedtime set for symmetry would be this app
 *     inventing a practice.
 *   * `rabbana-duas`, `mahashivratri` — ❌ sourcing in §2, deferred there.
 *
 * ## Sahih Muslim is never cited here
 *
 * The seeded Sahih Muslim is numbered **sequentially, not canonically**
 * (measured 2026-10-11): corpus "Muslim 807" is a narration about a dead goat
 * where canonical 807 is the hadith the app was citing it for. Such a
 * citation passes the verifier — the number exists — and still sends a reader
 * to the wrong hadith. Bukhari, Tirmidhi, Abu Dawud, Nasa'i, Ibn Majah and
 * the 40-Hadith collections were content-checked and are canonical.
 *
 * Every hadith citation below was found by searching the seeded Arabic of
 * those books for the du'ā or the practice itself and reading the number off
 * the row that matched — not written from recall and then checked for
 * existence. Several differ from the numbers in §2 as a result.
 *
 * ## reviewStatus
 *
 * New collections are written as `draft`, and **`draft` is never served**
 * (spec §5.1 and the §8 release gate) — `CollectionsService` filters it at
 * the query level. Seeding is therefore STAGING FOR REVIEW, not release:
 * nothing new below becomes reachable until a human completes Tier A (and,
 * for `assembled` collections, Tier B) and promotes it by name.
 *
 * `nightly-recitation` and `gita-daily` carry `reviewStatus: 'self_reviewed'`
 * in their seed data because the user authored and approved that content
 * specifically. That value is written on CREATE only; an existing row's
 * review columns are never rewritten by a plain run.
 *
 * To promote one collection after Tier A has actually been completed:
 *     npm run prisma:seed:collections -- --only=ruqyah \
 *       --review-status=self_reviewed --reviewed-by="<name of the reviewer>"
 * `--review-status` is refused without `--reviewed-by`, so a promotion always
 * leaves a name in the provenance columns (§5.4), and `--only` keeps it from
 * promoting collections nobody reviewed.
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
  // Strip sslmode=require, as every other standalone script here does (see
  // seed-quran-scripts.ts). RDS presents a self-signed chain; leaving the
  // mode in the URL makes pg enforce it strictly and the adapter's
  // `rejectUnauthorized: false` never gets a say. The failure surfaces as
  // P1011 "self-signed certificate in certificate chain", which reads like a
  // certificate problem and is not one.
  connectionString: databaseUrl.replace('sslmode=require', ''),
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

/**
 * `--review-status` was PASSED, as distinct from defaulted.
 *
 * This distinction is load-bearing, and getting it wrong once took both live
 * collections off the API. `update: base` with `reviewStatus` in `base` means
 * a plain re-run of this seed rewrites every row's review status to the CLI
 * default — so adding a single new draft collection silently demoted
 * `nightly-recitation` and `gita-daily` from `self_reviewed` to `draft`, and
 * `CollectionsService` filters `draft` at the query level, so BOTH faiths'
 * `GET /collections` endpoints returned `[]` in production.
 *
 * The rule below: review columns are written on **create**, and on update
 * **only** when the operator asked for a promotion explicitly.
 */
const REVIEW_STATUS_PASSED = argValue('review-status') !== undefined;
const REVIEW_STATUS = argValue('review-status') ?? 'draft';
const REVIEWED_BY = argValue('reviewed-by');

/**
 * `--only=slug[,slug]` restricts the run to named collections.
 *
 * Without it a promotion applies to everything in this file, which is never
 * what a Tier A sign-off means: Tier A is per-collection, per-item, by a
 * human. A promotion command should name what was reviewed.
 */
const ONLY = (argValue('only') ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

if (REVIEW_STATUS !== 'draft' && !REVIEWED_BY) {
  console.error(
    '❌ --review-status may only be raised above "draft" together with ' +
      '--reviewed-by="<name>".\n' +
      '   Tier A is a human checklist (spec §5.1); a promotion must record who did it.',
  );
  process.exit(1);
}

if (REVIEW_STATUS_PASSED && ONLY.length === 0) {
  console.error(
    '❌ --review-status requires --only=<slug>[,<slug>].\n' +
      '   Tier A is per-collection and per-item. A bare promotion would move\n' +
      '   every collection in this file at once, which is never what a sign-off\n' +
      '   means — and is the same shape of accident as the update-rewrites-\n' +
      '   reviewStatus bug documented above.',
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
  /** Home-screen placement, controlled from the database. Several may be true
   *  at once; `sortOrder` is what orders them. */
  showOnHome?: boolean;
  /** Review status to write **on create only**. `draft` unless this seed has a
   *  specific warrant for more. Never written on update unless the operator
   *  passes `--review-status` — see the upsert below. */
  reviewStatus?: string;
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
    // On the home screen for Islam. Several collections may be flagged at
    // once; `sortOrder` above is the tie-break between them.
    showOnHome: true,
    // Promoted by hand on 2026-10-11 after the user authored and approved
    // this content specifically. Recorded here so a FRESH database recreates
    // the live state instead of coming up empty; an existing row's status is
    // never touched by a plain re-run (see the upsert).
    reviewStatus: 'self_reviewed',
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
        // Muslim 807 was dropped from this citation on 2026-10-11. The
        // seeded Sahih Muslim is numbered SEQUENTIALLY, not canonically:
        // corpus "Muslim 807" is a narration about a dead goat given in
        // charity, while canonical 807 is the very hadith this item rests on.
        // The citation verifier passed it — the number exists — so this is a
        // citation that is mechanically valid and sends a human reader to the
        // wrong hadith. Bukhari 5009 was checked by content and carries the
        // same warrant correctly, so the item keeps its warrant without it.
        // Do NOT cite Sahih Muslim anywhere until the corpus is re-keyed.
        citation: 'Bukhari 5009',
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
    // On the home screen for Hindu, so each faith has at least one.
    showOnHome: true,
    // Same warrant and same reasoning as `nightly-recitation` above.
    reviewStatus: 'self_reviewed',
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
  // -------------------------------------------------------------------------
  // §2.1 #2 — friday-kahf. Surah 18 is seeded whole (110/110 verses).
  //
  // ONE item, not two. §2.1 lists salawat as item 2 via a du'ā slug
  // `salawat-ibrahimiyya` that DOES NOT EXIST in the `duas` table — the only
  // seeded salawat is `sending-salawat-at-the-mosque`, whose occasion is
  // entering the mosque, not Jumu'ah. Borrowing it would attach a du'ā to an
  // occasion its own narration does not give it, so the item is omitted
  // rather than approximated.
  // -------------------------------------------------------------------------
  {
    slug: 'friday-kahf',
    faithId: 'islam',
    title: 'Al-Kahf on Friday',
    subtitle: 'Read through the day of Jumu‘ah',
    description:
      'The eighteenth surah, read on the day of Jumu‘ah. One hundred ' +
      'and ten verses.',
    occasionType: 'weekday',
    occasionConfig: { weekday: { iso: 5 } },
    orderSemantics: 'sequence',
    provenanceClass: 'transmitted',
    estimatedMinutes: 25,
    priority: 20,
    sortOrder: 20,
    showOnHome: false,
    items: [
      {
        sequence: 1,
        refType: 'surah',
        surahId: 18,
        repeatCount: 1,
        label: 'Al-Kahf',
        note:
          'The Friday cadence rests on a narration carried by al-Hakim and ' +
          'al-Bayhaqi, graded sahih by al-Albani while some hold it hasan. ' +
          'Neither compilation is in this app’s seeded hadith corpus, so ' +
          'unlike every other citation in this file it could not be checked ' +
          'against a primary source here — open item for the Tier B reviewer.',
        citation: 'al-Hakim, al-Mustadrak (2/368) · al-Bayhaqi, Shu‘ab al-Iman',
        grading: 'sahih',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // §2.1 #6 — ruqyah. **assembled** (§5.2): every item is attested for ruqyah
  // on its own, the sequence is this app's compilation.
  //
  // D2 (§7) decided the naming: "Ruqyah — Qur'anic supplication", and
  // §5.3 rule 2 forbids any healing, treatment or cure claim in the title,
  // subtitle, note, notification or store copy. Nothing below medicalises.
  //
  // Qur'an only, and three items rather than §2.1's six. What cut the others
  // was warrant, not seeding. §5.2 defines `assembled` as "every item has
  // independent attested warrant FOR THE OCCASION", so an item that is merely
  // a good thing to recite does not qualify:
  //   * "Allahumma Rabb an-nas" and "Bismillah ×3 + A'udhu bi'izzatillahi" —
  //     neither is in the `duas` table at all (42 rows; audited 2026-10-11).
  //   * 2:285–286 — its warrant (Bukhari 5009) is for the night.
  //   * Ayat al-Kursi — its warrant (Bukhari 2311) is protection on going to
  //     bed. A content search of Bukhari and the five seeded Sunan books
  //     turned up no ruqyah-specific narration for it. Keeping it would have
  //     made the grouping `thematic` (§5.2), which is a heavier review class
  //     and different product copy; dropping it keeps the collection
  //     honestly `assembled`.
  // -------------------------------------------------------------------------
  {
    slug: 'ruqyah',
    faithId: 'islam',
    title: 'Ruqyah — Qur’anic supplication',
    subtitle: 'Recited over oneself',
    description:
      'Passages the Prophet — peace be upon him — and his ' +
      'companions recited as ruqyah. A selection, not a single transmitted ' +
      'sequence.',
    occasionType: 'situational',
    occasionConfig: { always: true },
    orderSemantics: 'sequence',
    provenanceClass: 'assembled',
    estimatedMinutes: 5,
    priority: 0,
    sortOrder: 60,
    showOnHome: false,
    items: [
      {
        sequence: 1,
        refType: 'surah',
        surahId: 1,
        repeatCount: 1,
        label: 'Al-Fatihah',
        note:
          'In the narration a companion recites Al-Fatihah over a man who ' +
          'has been stung, and the Prophet — peace be upon him — ' +
          'calls it a ruqyah.',
        citation: 'Bukhari 5736',
        grading: 'sahih',
      },
      {
        sequence: 2,
        refType: 'surah',
        surahId: 113,
        repeatCount: 3,
        label: 'Al-Falaq',
        note:
          'In the narration the Prophet — peace be upon him — ' +
          'recites the Mu‘awwidhatayn over himself when unwell and ' +
          'blows; ‘A’ishah does the same for him.',
        citation: 'Bukhari 5016',
        grading: 'sahih',
      },
      {
        sequence: 3,
        refType: 'surah',
        surahId: 114,
        repeatCount: 3,
        label: 'An-Nas',
        note: 'The second of the Mu‘awwidhatayn in the same narration.',
        citation: 'Bukhari 5016',
        grading: 'sahih',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // §2.1 #7 — travel-duas. **assembled**. Four of the five seeded Travel
  // du'as; `supplication-when-riding-a-vehicle` is omitted because its
  // Arabic is BYTE-IDENTICAL to `travel-supplication` (both are
  // "Subhana’lladhi sakhkhara lana hadha"), and a collection that
  // renders the same du'ā twice reads as a bug.
  //
  // Not one Sahih Muslim number appears below, although Muslim is the usual
  // reference for three of these four. The seeded Muslim is numbered
  // SEQUENTIALLY, not canonically (measured 2026-10-11), so a Muslim citation
  // passes the verifier and still sends a reader to the wrong hadith. Every
  // citation here was instead found by searching the seeded Arabic text of
  // Bukhari / Tirmidhi / Abu Dawud / Ibn Majah for the du'ā itself and
  // reading the number off the row that matched.
  // -------------------------------------------------------------------------
  {
    slug: 'travel-duas',
    faithId: 'islam',
    title: 'Travel supplications',
    subtitle: 'Setting out, and coming home',
    description:
      'A set of supplications for a journey: the farewell, mounting, the ' +
      'journey itself, and the return.',
    occasionType: 'situational',
    occasionConfig: { always: true },
    orderSemantics: 'sequence',
    provenanceClass: 'assembled',
    estimatedMinutes: 3,
    priority: 0,
    sortOrder: 70,
    showOnHome: false,
    items: [
      {
        sequence: 1,
        refType: 'dua',
        refSlug: 'traveller-entrusting-to-allah',
        repeatCount: 1,
        label: 'Entrusting the traveller to Allah',
        note:
          'Said in farewell. In the narration the Prophet — peace be ' +
          'upon him — says it as he sees Abu Hurayrah off.',
        citation: 'Ibn Majah 2825',
        grading: 'sahih',
      },
      {
        sequence: 2,
        refType: 'dua',
        refSlug: 'travel-supplication',
        repeatCount: 1,
        label: 'On mounting',
        note:
          'Said once settled on the mount — or in the seat. The words ' +
          'are Qur’anic, Az-Zukhruf 43:13–14.',
        citation: 'Abu Dawud 2602 · Tirmidhi 3446',
        grading: 'sahih',
      },
      {
        sequence: 3,
        refType: 'dua',
        refSlug: 'dua-when-starting-a-journey',
        repeatCount: 1,
        label: 'On setting out',
        note:
          'The continuation of the same narration: after the takbir and the ' +
          'verse above, the journey itself is asked for.',
        citation: 'Abu Dawud 2599',
        grading: 'sahih',
      },
      {
        sequence: 4,
        refType: 'dua',
        refSlug: 'supplication-when-returning-from-travel',
        repeatCount: 1,
        label: 'On returning',
        citation: 'Bukhari 3085 · Tirmidhi 3440',
        grading: 'sahih',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // §2.1 #5 — after-prayer-adhkar. **transmitted**: every item below is
  // attested with the words "dubura kulli salah" — after every prayer.
  //
  // Omitted, and why:
  //   * Ayat al-Kursi after each prayer. §2.1 cites Nasa'i, ‘Amal
  //     al-Yawm wa’l-Layla 100. That compilation is NOT the seeded
  //     "Sunan an-Nasa'i", and a text search of all five seeded Sunan books
  //     for the phrase found nothing. No citable warrant → no item.
  //   * Astaghfirullah ×3 and "Allahumma antas-Salam": no `duas` row.
  //   * Al-Ikhlas: Abu Dawud 1523 says "al-Mu‘awwidhat", which Bukhari
  //     5016 glosses as Al-Falaq and An-Nas. Only those two are included.
  // -------------------------------------------------------------------------
  {
    slug: 'after-prayer-adhkar',
    faithId: 'islam',
    title: 'After the prayer',
    subtitle: 'A short set after each fard prayer',
    description:
      'Recited after each obligatory prayer. Two minutes, five times a day.',
    occasionType: 'after_prayer',
    occasionConfig: { anchor: { from: 'fard', to: '+20m' } },
    orderSemantics: 'sequence',
    provenanceClass: 'transmitted',
    estimatedMinutes: 2,
    priority: 15,
    sortOrder: 30,
    showOnHome: false,
    items: [
      {
        sequence: 1,
        refType: 'surah',
        surahId: 113,
        repeatCount: 1,
        label: 'Al-Falaq',
        note:
          '‘Uqbah ibn ‘Amir was commanded to recite the ' +
          'Mu‘awwidhat after every prayer.',
        citation: 'Abu Dawud 1523',
        grading: 'sahih',
      },
      {
        sequence: 2,
        refType: 'surah',
        surahId: 114,
        repeatCount: 1,
        label: 'An-Nas',
        citation: 'Abu Dawud 1523',
        grading: 'sahih',
      },
      {
        sequence: 3,
        refType: 'dua',
        refSlug: 'tasbeeh-after-prayer',
        repeatCount: 1,
        label: 'Tasbih after the prayer',
        note:
          'Thirty-three each of tasbih, tahmid and takbir, completed by the ' +
          'tahlil. The individual counts live inside the du‘ā text ' +
          'rather than in repeatCount — one item cannot carry four ' +
          'different counts (model gap, reported against spec §1.2).',
        citation: 'Abu Dawud 1504',
        grading: 'sahih',
      },
      {
        sequence: 4,
        refType: 'dua',
        refSlug: 'supplication-after-prayer',
        repeatCount: 1,
        label: 'Help me to remember You',
        note:
          'The Prophet — peace be upon him — told Mu‘adh ibn ' +
          'Jabal never to leave this after any prayer.',
        citation: 'Abu Dawud 1522',
        grading: 'sahih',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // §2.1 #3 — morning-adhkar. **transmitted** (Hisn al-Muslim §27 is an
  // accepted classical compilation, §5.2).
  //
  // §2 estimates "4 of ~15 seeded". Five items survived the rules; what cut
  // the rest was not seeding, it was WARRANT:
  //   * Sayyid al-Istighfar — the only morning-labelled row,
  //     `master-of-seeking-forgiveness`, holds a TRUNCATED text (it stops at
  //     "ma’stata‘t", a third of the way in). The complete text is
  //     only in the evening-labelled row. Reported as a `duas` data defect;
  //     shipped in evening-adhkar, omitted here rather than rendering a
  //     du‘ā that stops mid-sentence.
  //   * "A‘udhu bi kalimatillahit-tammat" ×3 — the morning
  //     cadence for it is in Sahih Muslim only. The three seeded non-Muslim
  //     narrations (Abu Dawud 3898, Ibn Majah 3518, Tirmidhi 3437) give the
  //     EVENING form or the alighting-at-a-stopping-place form. Shipped in
  //     evening-adhkar; omitted here.
  //   * "Hasbiyallahu la ilaha illa huwa" ×7 — §2.1 cites Abu Dawud
  //     5081. The seeded row at that number is graded **Mawdu‘**
  //     (fabricated) and is a statement of Abu ad-Darda, not of the Prophet.
  //     §5.3 rule 3 lets a da‘if item ship with its grading disclosed;
  //     mawdu‘ is not in the grading vocabulary at all, and should not
  //     be. Omitted, and flagged.
  //   * "Radhitu billahi rabba" — the morning+evening cadence is Ibn
  //     Majah 3870, graded Da‘if in the corpus; the evening-only form is
  //     Tirmidhi 3389, also Da‘if there. Shipped in evening-adhkar with
  //     grading disclosed; omitted here, where the warrant is weaker still.
  // -------------------------------------------------------------------------
  {
    slug: 'morning-adhkar',
    faithId: 'islam',
    title: 'Morning remembrance',
    subtitle: 'After Fajr',
    description:
      'A short morning set. Every item is attested with a morning cadence of ' +
      'its own.',
    occasionType: 'morning',
    occasionConfig: { anchor: { from: 'fajr', to: 'sunrise+2h' } },
    orderSemantics: 'sequence',
    provenanceClass: 'transmitted',
    estimatedMinutes: 5,
    priority: 25,
    sortOrder: 40,
    showOnHome: false,
    items: [
      {
        sequence: 1,
        refType: 'dua',
        refSlug: 'morning-supplication',
        repeatCount: 1,
        label: 'We have reached the morning',
        citation: 'Abu Dawud 5071 · Tirmidhi 3390',
        grading: 'sahih',
      },
      {
        sequence: 2,
        refType: 'surah',
        surahId: 112,
        repeatCount: 3,
        label: 'Al-Ikhlas',
        note:
          'Al-Ikhlas and the Mu‘awwidhatayn, three times on reaching ' +
          'morning and on reaching evening.',
        citation: 'Abu Dawud 5082',
        grading: 'hasan',
      },
      {
        sequence: 3,
        refType: 'surah',
        surahId: 113,
        repeatCount: 3,
        label: 'Al-Falaq',
        citation: 'Abu Dawud 5082',
        grading: 'hasan',
      },
      {
        sequence: 4,
        refType: 'surah',
        surahId: 114,
        repeatCount: 3,
        label: 'An-Nas',
        citation: 'Abu Dawud 5082',
        grading: 'hasan',
      },
      {
        sequence: 5,
        refType: 'dua',
        refSlug: 'protection-from-all-harm',
        repeatCount: 3,
        label: 'In the name of Allah, with Whose name nothing harms',
        note:
          'Three times in the morning and three times in the evening, in ' +
          'the narration from ‘Uthman ibn ‘Affan.',
        citation: 'Abu Dawud 5088 · Tirmidhi 3388',
        grading: 'sahih',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // §2.1 #4 — evening-adhkar. **transmitted**, same basis as #3.
  //
  // Longer than its morning twin, and the asymmetry is a property of the
  // `duas` table rather than of the tradition: the complete Sayyid
  // al-Istighfar, the "A‘udhu bi kalimatillah" and the "‘afw wa
  // ‘afiyah" rows are all seeded with EVENING labels and no morning
  // counterpart. Reported, not papered over.
  // -------------------------------------------------------------------------
  {
    slug: 'evening-adhkar',
    faithId: 'islam',
    title: 'Evening remembrance',
    subtitle: 'From ‘Asr',
    description:
      'The evening half of the daily remembrance. Every item is attested ' +
      'with an evening cadence of its own.',
    occasionType: 'evening',
    occasionConfig: { anchor: { from: 'asr', to: 'maghrib' } },
    orderSemantics: 'sequence',
    provenanceClass: 'transmitted',
    estimatedMinutes: 7,
    priority: 25,
    sortOrder: 50,
    showOnHome: false,
    items: [
      {
        sequence: 1,
        refType: 'dua',
        refSlug: 'evening-supplication',
        repeatCount: 1,
        label: 'We have reached the evening',
        citation: 'Abu Dawud 5071 · Tirmidhi 3390',
        grading: 'sahih',
      },
      {
        sequence: 2,
        refType: 'surah',
        surahId: 112,
        repeatCount: 3,
        label: 'Al-Ikhlas',
        note:
          'Al-Ikhlas and the Mu‘awwidhatayn, three times on reaching ' +
          'evening and on reaching morning.',
        citation: 'Abu Dawud 5082',
        grading: 'hasan',
      },
      {
        sequence: 3,
        refType: 'surah',
        surahId: 113,
        repeatCount: 3,
        label: 'Al-Falaq',
        citation: 'Abu Dawud 5082',
        grading: 'hasan',
      },
      {
        sequence: 4,
        refType: 'surah',
        surahId: 114,
        repeatCount: 3,
        label: 'An-Nas',
        citation: 'Abu Dawud 5082',
        grading: 'hasan',
      },
      {
        sequence: 5,
        refType: 'dua',
        refSlug: 'protection-from-all-harm',
        repeatCount: 3,
        label: 'In the name of Allah, with Whose name nothing harms',
        citation: 'Abu Dawud 5088 · Tirmidhi 3388',
        grading: 'sahih',
      },
      {
        sequence: 6,
        refType: 'dua',
        refSlug: 'evening-protection-supplication',
        repeatCount: 3,
        label: 'The perfect words of Allah',
        note:
          'In the narration a man stung at night is told that had he said ' +
          'this on reaching evening, nothing would have harmed him.',
        citation: 'Abu Dawud 3898 · Ibn Majah 3518',
        grading: 'sahih',
      },
      {
        sequence: 7,
        refType: 'dua',
        refSlug: 'evening-master-of-seeking-forgiveness',
        repeatCount: 1,
        label: 'Sayyid al-Istighfar',
        note:
          'Abu Dawud 5070 gives it with the morning-or-evening cadence; ' +
          'Bukhari 6306 is where it is named the best way of asking ' +
          'forgiveness.',
        citation: 'Abu Dawud 5070 · Bukhari 6306',
        grading: 'sahih',
      },
      {
        sequence: 8,
        refType: 'dua',
        refSlug: 'evening-dua-for-well-being',
        repeatCount: 1,
        label: 'Pardon and well-being',
        note:
          'Ibn ‘Umar reports that the Prophet — peace be upon him ' +
          '— never left these words morning or evening.',
        citation: 'Ibn Majah 3871',
        grading: 'sahih',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // §2.2 #2 — mangalwar-hanuman. **assembled**, and the cadence is
  // **customary**, which §5.3 rule 4 requires the card to say.
  //
  // One item. Bajrang Baan and Hanuman Ashtak are ❌ in §2.2 and are not in
  // `hindu_stotras` (8 rows; audited 2026-10-11). The Chalisa alone is not a
  // thin version of the practice — reciting the Hanuman Chalisa on a
  // Tuesday IS the practice, and it is 43 verses.
  // -------------------------------------------------------------------------
  {
    slug: 'mangalwar-hanuman',
    faithId: 'hindu',
    title: 'Tuesday — Hanuman Chalisa',
    subtitle: 'A customary weekday devotion',
    description:
      'Tulsidas’s forty verses to Hanuman, kept on Tuesdays. The ' +
      'weekday is custom rather than scripture, and it varies by region.',
    occasionType: 'weekday',
    occasionConfig: { weekday: { iso: 2 } },
    orderSemantics: 'sequence',
    provenanceClass: 'assembled',
    estimatedMinutes: 12,
    priority: 20,
    sortOrder: 20,
    showOnHome: false,
    items: [
      {
        sequence: 1,
        refType: 'stotra',
        refSlug: 'hanuman-chalisa',
        repeatCount: 1,
        label: 'Hanuman Chalisa',
        note:
          'The Tuesday cadence is customary, not scriptural, and it is ' +
          'regional: Tuesday is the North Indian custom, while in much of ' +
          'the South Saturday belongs to Venkateshwara or to Shani.',
        citation: 'Hanuman Chalisa — Tulsidas',
        grading: 'customary',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // §2.2 #3 — somvar-shiva. **assembled**, cadence **customary**.
  //
  // Two of the four items in §2.2. "Om Namah Shivaya" ×108 and the
  // Mahamrityunjaya mantra are both ❌ there, and `refType: 'mantra'` has no
  // content table in this schema at all — the resolver returns
  // "no content table" for it (collections.service.ts). An item that can
  // never render is worse than an absent one.
  // -------------------------------------------------------------------------
  {
    slug: 'somvar-shiva',
    faithId: 'hindu',
    title: 'Monday — Shiva',
    subtitle: 'A customary weekday devotion',
    description:
      'Two stotras to Shiva, kept on Mondays. The weekday is custom rather ' +
      'than scripture.',
    occasionType: 'weekday',
    occasionConfig: { weekday: { iso: 1 } },
    orderSemantics: 'sequence',
    provenanceClass: 'assembled',
    estimatedMinutes: 10,
    priority: 20,
    sortOrder: 25,
    showOnHome: false,
    items: [
      {
        sequence: 1,
        refType: 'stotra',
        refSlug: 'lingashtakam',
        repeatCount: 1,
        label: 'Lingashtakam',
        note:
          'Monday–Shiva is the most broadly kept Hindu weekday ' +
          'observance, but it is custom, not scripture.',
        citation: 'Lingashtakam — traditional Shaiva stotra',
        grading: 'customary',
      },
      {
        sequence: 2,
        refType: 'stotra',
        refSlug: 'shiva-tandava-stotram',
        repeatCount: 1,
        label: 'Shiva Tandava Stotram',
        citation: 'Shiva Tandava Stotram — attributed to Ravana',
        grading: 'customary',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // §2.2 #5 — sandhya-deepa. **assembled**, **customary**.
  //
  // One item. "Shubham karoti kalyanam" and the Shanti path are ❌ in §2.2
  // and absent from the database. What remains is the aarti itself, which is
  // what is actually sung at the evening lamp in most North Indian
  // households — so the collection is named for that and claims nothing
  // more. Deity-specific (Vaishnava); the Ishta-devata personalisation in
  // D4 is where that eventually gets resolved.
  // -------------------------------------------------------------------------
  {
    slug: 'sandhya-deepa',
    faithId: 'hindu',
    title: 'Evening aarti',
    subtitle: 'At the lighting of the lamp',
    description:
      'The aarti commonly sung at the evening lamp. A household custom ' +
      'rather than a prescribed rite, and it varies by family and region.',
    occasionType: 'evening',
    occasionConfig: { clock: { from: '17:30', to: '20:30' } },
    orderSemantics: 'sequence',
    provenanceClass: 'assembled',
    estimatedMinutes: 6,
    priority: 15,
    sortOrder: 30,
    showOnHome: false,
    items: [
      {
        sequence: 1,
        refType: 'stotra',
        refSlug: 'om-jai-jagdish-hare',
        repeatCount: 1,
        label: 'Om Jai Jagdish Hare',
        note:
          'A household aarti, not a scriptural rite; which aarti is sung at ' +
          'the lamp differs by family, region and sampradaya.',
        citation: 'Om Jai Jagdish Hare — Shraddha Ram Phillauri',
        grading: 'customary',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // §2.2 #7 — navratri. **assembled**, **customary**.
  //
  // One item. Durga Saptashati selections and the Devi Kavach are ❌ and
  // large in §2.2, and the day-wise Navadurga notes would be written content.
  // The Mahishasura Mardini Stotram is the Devi stotra actually sung through
  // Navratri, and it is seeded.
  //
  // occasionConfig names `navratri-start`, NOT `navratri`: the seeded
  // `hindu_festivals` table has no row with slug `navratri` (audited
  // 2026-10-11), so the shape §3.1 suggests would have pointed at nothing.
  // The row it does have is a START marker — widening it to the nine
  // nights is work for the festival-window engine in Phase 4.
  // -------------------------------------------------------------------------
  {
    slug: 'navratri',
    faithId: 'hindu',
    title: 'Navratri',
    subtitle: 'Through the nine nights',
    description:
      'The Mahishasura Mardini Stotram, sung to the Devi through Navratri.',
    occasionType: 'festival',
    occasionConfig: { festival: { slug: 'navratri-start' } },
    orderSemantics: 'sequence',
    provenanceClass: 'assembled',
    estimatedMinutes: 6,
    priority: 50,
    sortOrder: 15,
    showOnHome: false,
    items: [
      {
        sequence: 1,
        refType: 'stotra',
        refSlug: 'mahishasura-mardini-stotram',
        repeatCount: 1,
        label: 'Mahishasura Mardini Stotram',
        note:
          'Which texts are kept through Navratri varies by sampradaya and ' +
          'region; this is a widely sung one, not a prescribed sequence.',
        citation: 'Mahishasura Mardini Stotram — attributed to Adi Shankara',
        grading: 'customary',
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

  const targets = ONLY.length
    ? COLLECTIONS.filter((c) => ONLY.includes(c.slug))
    : COLLECTIONS;

  if (ONLY.length) {
    const unknown = ONLY.filter((s) => !COLLECTIONS.some((c) => c.slug === s));
    if (unknown.length) {
      console.error(`❌ --only names unknown slug(s): ${unknown.join(', ')}`);
      process.exitCode = 1;
      return;
    }
    console.log(`   --only: ${targets.map((c) => c.slug).join(', ')}`);
  }

  for (const seed of targets) {
    // Content columns. Safe to rewrite on every run — they are what this file
    // is the source of truth for.
    const content = {
      faithId: seed.faithId,
      title: seed.title,
      subtitle: seed.subtitle ?? null,
      description: seed.description ?? null,
      occasionType: seed.occasionType,
      occasionConfig: (seed.occasionConfig ?? null) as any,
      orderSemantics: seed.orderSemantics ?? 'sequence',
      provenanceClass: seed.provenanceClass,
      curatedBy: 'team/curated-collections-spec.md §2',
      estimatedMinutes: seed.estimatedMinutes ?? null,
      priority: seed.priority ?? 0,
      sortOrder: seed.sortOrder ?? 0,
      // Home-screen placement is content, not review state: the seed owns it
      // on every run, and several collections may carry it at once.
      showOnHome: seed.showOnHome ?? false,
      isActive: true,
    };

    // §5.4 review columns. Written on CREATE from the seed (or from the CLI if
    // a promotion was asked for), and on UPDATE **only** when the operator
    // passed `--review-status`. A plain re-run must never move a reviewed
    // collection back to `draft` — that takes it off the API (see the note on
    // REVIEW_STATUS_PASSED above).
    // `curatedAt` is a provenance column (§5.4): it records when the row was
    // first curated, not when the seed last ran. Leaving it in the shared
    // content block bumped it on every re-run — the same quiet rewrite of
    // provenance that `reviewedAt` is protected from just below.
    const reviewOnCreate = {
      curatedAt: now,
      reviewStatus: REVIEW_STATUS_PASSED
        ? REVIEW_STATUS
        : (seed.reviewStatus ?? 'draft'),
      reviewedBy: REVIEWED_BY ?? null,
      reviewedAt: REVIEWED_BY ? now : null,
    };
    const reviewOnUpdate = REVIEW_STATUS_PASSED
      ? {
          reviewStatus: REVIEW_STATUS,
          reviewedBy: REVIEWED_BY ?? null,
          reviewedAt: REVIEWED_BY ? now : null,
        }
      : {};

    const collection = await prisma.collection.upsert({
      where: { slug: seed.slug },
      update: { ...content, ...reviewOnUpdate },
      create: { slug: seed.slug, ...content, ...reviewOnCreate },
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
        `${seed.provenanceClass}, ${collection.reviewStatus}` +
        `${collection.showOnHome ? ', showOnHome' : ''}`,
    );
  }

  console.log(
    `🎉 Collections seed completed: ${collectionCount} collections, ${itemCount} items.`,
  );
  console.log('');
  console.log('   NOT built (see the header for the reason on each):');
  console.log('     islam: rabbana-duas');
  console.log('     hindu: ekadashi, pratah-smaran, hindu-bedtime, mahashivratri');
  console.log('');
  if (!REVIEW_STATUS_PASSED) {
    console.log(
      '   ⚠️  New collections are written as reviewStatus=draft, which the API',
    );
    console.log(
      '      never serves (spec §5.1). They are STAGED for review, not released.',
    );
    console.log(
      '      After a human completes Tier A, promote ONE collection by name:',
    );
    console.log(
      '        npm run prisma:seed:collections -- --only=<slug> \\',
    );
    console.log(
      '          --review-status=self_reviewed --reviewed-by="<name>"',
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
