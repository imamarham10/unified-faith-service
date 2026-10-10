/**
 * Verses per surah, 1..114 — **test fixture only**.
 *
 * ## Provenance — do not hand-edit
 *
 * Fetched 2026-10-10 from
 * `https://cdn.jsdelivr.net/npm/quran-json@3.1.2/dist/chapters/index.json`,
 * taking `total_verses` per chapter. That CDN artifact is the exact dataset
 * `prisma/seed-islamic-features.ts` seeds `quran_surahs` and `quran_verses`
 * from, so these counts are a faithful offline stand-in for the rows the
 * service counts at runtime.
 *
 * ## Why this is a separate file from the boundaries
 *
 * `docs/contracts/quran-juz-api.md` §"Correctness gate" is explicit: verse
 * counts must not be stored alongside the juz boundaries, or the totals
 * assertion compares the boundary table to itself and proves nothing. The
 * boundaries live in `../juz-boundaries.ts` and come from a different source
 * (Quran.com API v4 `/juzs`). Neither is derived from the other, and that
 * independence is the entire reason the gate has any force.
 *
 * Keep them apart. Do not "simplify" this into `juz-boundaries.ts`, and do not
 * back-fill either from the other.
 *
 * ## Why it is not a `.spec.ts` and not under `src` proper
 *
 * `tsconfig.json` excludes the `__fixtures__` directory as well as spec files,
 * so `npm run build` does not carry this into `dist/`, while ts-jest still
 * compiles it as an import. It is imported by specs only — no runtime
 * code may import it, because the service derives its counts from the
 * database, which is the whole point of the gate.
 */
export const SURAH_VERSE_COUNTS: Readonly<Record<number, number>> = {
  1: 7, 2: 286, 3: 200, 4: 176, 5: 120, 6: 165,
  7: 206, 8: 75, 9: 129, 10: 109, 11: 123, 12: 111,
  13: 43, 14: 52, 15: 99, 16: 128, 17: 111, 18: 110,
  19: 98, 20: 135, 21: 112, 22: 78, 23: 118, 24: 64,
  25: 77, 26: 227, 27: 93, 28: 88, 29: 69, 30: 60,
  31: 34, 32: 30, 33: 73, 34: 54, 35: 45, 36: 83,
  37: 182, 38: 88, 39: 75, 40: 85, 41: 54, 42: 53,
  43: 89, 44: 59, 45: 37, 46: 35, 47: 38, 48: 29,
  49: 18, 50: 45, 51: 60, 52: 49, 53: 62, 54: 55,
  55: 78, 56: 96, 57: 29, 58: 22, 59: 24, 60: 13,
  61: 14, 62: 11, 63: 11, 64: 18, 65: 12, 66: 12,
  67: 30, 68: 52, 69: 52, 70: 44, 71: 28, 72: 28,
  73: 20, 74: 56, 75: 40, 76: 31, 77: 50, 78: 40,
  79: 46, 80: 42, 81: 29, 82: 19, 83: 36, 84: 25,
  85: 22, 86: 17, 87: 19, 88: 26, 89: 30, 90: 20,
  91: 15, 92: 21, 93: 11, 94: 8, 95: 8, 96: 19,
  97: 5, 98: 8, 99: 8, 100: 11, 101: 11, 102: 8,
  103: 3, 104: 9, 105: 5, 106: 4, 107: 7, 108: 3,
  109: 6, 110: 3, 111: 5, 112: 4, 113: 5, 114: 6,};

/** The total the contract pins its first assertion to. */
export const TOTAL_VERSES_IN_QURAN = 6236;
