/**
 * The real enumerations behind the `String` columns on `Collection` and
 * `CollectionItem`.
 *
 * House convention (`team/curated-collections-spec.md` §1.2): the Prisma
 * schema declares **zero** enums — every vocabulary is a `String` with a `//`
 * comment listing legal values, and the enumeration lives here as a TypeScript
 * const. This file is the single place a value is added, and both the read
 * service and `prisma/verify-collection-citations.ts` validate against it.
 *
 * Nothing here touches the database, which is why the verification script can
 * import it and still run with `--self-test` offline.
 */

export const FAITH_IDS = ['islam', 'hindu'] as const;
export type FaithId = (typeof FAITH_IDS)[number];

/** `CollectionItem.refType` — spec §1.2. */
export const REF_TYPES = [
  'surah',
  'ayah_range',
  'dua',
  'dhikr',
  'allah_name',
  'hadith',
  'hindu_verse_range',
  'stotra',
  'mantra',
  'text',
] as const;
export type RefType = (typeof REF_TYPES)[number];

/** `Collection.occasionType` — spec §1.2 / §3.1. */
export const OCCASION_TYPES = [
  'nightly',
  'morning',
  'evening',
  'after_prayer',
  'weekday',
  'hijri',
  'panchang',
  'festival',
  'situational',
  'evergreen',
] as const;
export type OccasionType = (typeof OCCASION_TYPES)[number];

/** `Collection.orderSemantics`. Order is meaningful either way; `set` only
 *  means the items are not a single recitation run. There is no `shuffle`. */
export const ORDER_SEMANTICS = ['sequence', 'set'] as const;
export type OrderSemantics = (typeof ORDER_SEMANTICS)[number];

/** `Collection.provenanceClass` — spec §5.2. */
export const PROVENANCE_CLASSES = [
  'transmitted',
  'assembled',
  'thematic',
] as const;
export type ProvenanceClass = (typeof PROVENANCE_CLASSES)[number];

/** `Collection.reviewStatus` — spec §5.1. */
export const REVIEW_STATUSES = [
  'draft',
  'self_reviewed',
  'scholar_approved',
  'flagged',
  'retired',
] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

/**
 * Review statuses that may be served to a client.
 *
 * **`draft` is never served** — spec §5.1 states it as a hard rule, and §8's
 * release gate repeats it ("No collection with `reviewStatus: draft` is
 * reachable in any environment"). `retired` is excluded for the same reason it
 * exists: §5.1 Tier C wants the ability to pull one collection without a
 * release. `flagged` is excluded because a flag is an open report.
 *
 * This is enforced as a query predicate in `CollectionsService`, not as a
 * post-filter, so a draft row never leaves Postgres.
 */
export const SERVABLE_REVIEW_STATUSES: ReviewStatus[] = [
  'self_reviewed',
  'scholar_approved',
];

/** `CollectionItem.grading` — spec §1.2. `null` is legal only for items whose
 *  warrant is not a hadith (a Qur'an reference carries no grading). */
export const GRADINGS = [
  'sahih',
  'hasan',
  'daif',
  'customary',
  'not_applicable',
] as const;
export type Grading = (typeof GRADINGS)[number];

/**
 * Gradings too weak to supply a collection's title or subtitle — spec §5.3
 * rule 3 and §8. A `daif` item may still ship as an *item*, with its grading
 * disclosed; it may not be what the card is named after.
 */
export const WEAK_GRADINGS: Grading[] = ['daif'];

/**
 * Which stored columns each `refType` is addressed by. Used by the resolver to
 * group items into batches, and by the verifier to reject an item that carries
 * the wrong fields (a `surah` item with a `hinduTextSlug` is a seed bug, not a
 * rendering problem).
 */
export const REF_TYPE_FIELDS: Record<
  RefType,
  { required: readonly string[]; forbidden: readonly string[] }
> = {
  surah: {
    required: ['surahId'],
    forbidden: ['ayahStart', 'ayahEnd', 'hinduTextSlug', 'chapterNumber', 'verseStart', 'verseEnd'],
  },
  ayah_range: {
    required: ['surahId', 'ayahStart'],
    forbidden: ['hinduTextSlug', 'chapterNumber', 'verseStart', 'verseEnd'],
  },
  dua: { required: ['refSlug'], forbidden: ['surahId', 'hinduTextSlug'] },
  dhikr: { required: ['refSlug'], forbidden: ['surahId', 'hinduTextSlug'] },
  allah_name: { required: ['refId'], forbidden: ['surahId', 'hinduTextSlug'] },
  hadith: { required: ['refSlug'], forbidden: ['surahId', 'hinduTextSlug'] },
  hindu_verse_range: {
    required: ['hinduTextSlug', 'chapterNumber', 'verseStart'],
    forbidden: ['surahId', 'ayahStart', 'ayahEnd'],
  },
  stotra: { required: ['refSlug'], forbidden: ['surahId', 'hinduTextSlug'] },
  mantra: { required: ['refSlug'], forbidden: ['surahId', 'hinduTextSlug'] },
  text: { required: [], forbidden: ['surahId', 'hinduTextSlug'] },
};

/**
 * Which faith each refType belongs to. A Hindu collection holding a `surah`
 * item is a seed bug; the verifier catches it.
 */
export const REF_TYPE_FAITH: Record<RefType, FaithId | 'any'> = {
  surah: 'islam',
  ayah_range: 'islam',
  dua: 'islam',
  dhikr: 'islam',
  allah_name: 'islam',
  hadith: 'islam',
  hindu_verse_range: 'hindu',
  stotra: 'hindu',
  mantra: 'hindu',
  text: 'any',
};

export const isRefType = (v: string): v is RefType =>
  (REF_TYPES as readonly string[]).includes(v);
export const isOccasionType = (v: string): v is OccasionType =>
  (OCCASION_TYPES as readonly string[]).includes(v);
export const isProvenanceClass = (v: string): v is ProvenanceClass =>
  (PROVENANCE_CLASSES as readonly string[]).includes(v);
export const isReviewStatus = (v: string): v is ReviewStatus =>
  (REVIEW_STATUSES as readonly string[]).includes(v);
export const isGrading = (v: string): v is Grading =>
  (GRADINGS as readonly string[]).includes(v);
export const isFaithId = (v: string): v is FaithId =>
  (FAITH_IDS as readonly string[]).includes(v);
