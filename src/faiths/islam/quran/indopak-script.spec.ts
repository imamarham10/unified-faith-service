import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * The correctness gate for the IndoPak muṣḥaf — the data the seed writes into
 * `quran_verses.text_indopak`.
 *
 * Modelled on `juz-boundaries.spec.ts`, for the same reason: this is
 * scripture, it is shipped in a monetised app, and the way it goes wrong is
 * silent. Every assertion below is mechanical.
 *
 * ## What is actually being gated
 *
 * **The committed snapshot, not the database.** `prisma/data/quran-indopak.json`
 * is the single input to `seedIndopakScript`, byte-for-byte what will be
 * written. Gating it offline gates the seed, because the seed has no other
 * source — it does not fetch. That is the whole reason the snapshot is
 * committed rather than fetched at seed time; see
 * `docs/quran_script_provenance.md`.
 *
 * ## Why this spec touches no database and no network
 *
 * Same constraint as the juz specs: `DATABASE_URL` points at a shared RDS
 * instance holding live user data and `PrismaService`'s constructor opens a
 * real `pg.Pool` against it, so CI must be able to fail this gate without one.
 * It must also be able to fail it without a network — a gate that re-fetches
 * from quran.com is not reproducible and tells you about today's upstream
 * rather than about what ships.
 *
 * ## The failure mode this exists for
 *
 * A seed that wrote **Uthmani text into the IndoPak column** would pass every
 * structural check — 6,236 rows, no nulls, every verse_key resolved, Arabic in
 * every field — and would reproduce exactly the bug this work was done to fix:
 * the mobile app's script preference defaults to Indo-Pak, names the script
 * the subcontinent reads, and renders a different one. So the encoding itself
 * is asserted, positively and negatively, in
 * `describe('encoding — IndoPak and not Uthmani')` below. If you only keep one
 * group in this file, keep that one.
 *
 * ## That claim was tested, not assumed
 *
 * On 2026-10-10 the snapshot was temporarily replaced with the **Uthmani**
 * text from `api.quran.com/api/v4/quran/verses/uthmani`, re-keyed into
 * `text_indopak` — 6,236 verses, every `verse_key` correct, no empties, i.e.
 * a saboteur that is structurally flawless and encoded wrong.
 *
 *   - All 5 completeness assertions **passed**. Structure alone proves
 *     nothing, exactly as feared.
 *   - All 4 encoding assertions **failed**, along with the 3 reference verses,
 *     the PUA pin and both canonical-form pins — 10 failures in total.
 *
 * If you weaken an assertion here, re-run that experiment.
 *
 * ## The limit of what this proves
 *
 * This gates the **snapshot**, not the write path. It would not catch a seed
 * that read this file correctly and then mangled the text on the way to the
 * database — a stray `.normalize('NFC')` added to the write, say, which would
 * silently recompose 1,605 alef+maddah pairs (see the canonical-form group
 * below). `seedIndopakScript` guards the failure mode that actually matters —
 * alef-wasla, i.e. Uthmani — immediately before writing, but the general
 * claim "what is in the column equals what is in this file" is not asserted
 * anywhere offline, and cannot be without a database.
 */

/** Every verse in the muṣḥaf. Not a target to approach — an exact count. */
const TOTAL_VERSES_IN_QURAN = 6236;

/** Surah number → verse count, for checking the snapshot spans the real muṣḥaf. */
const SURAH_COUNT = 114;

/**
 * U+0671 ARABIC LETTER ALEF WASLA — the discriminator.
 *
 * Uthmani writes the elided alef of the definite article as this character
 * (`ٱلسُّفَهَآءُ`); IndoPak writes a plain U+0627 alef (`السُّفَهَآءُ`) and
 * handles the elision with the surrounding marks instead. It is frequent in
 * Uthmani and occurs **zero** times in genuine IndoPak, which makes "contains
 * no U+0671" a cheap, total proof that the IndoPak column is not holding
 * Uthmani.
 */
const ALEF_WASLA = 'ٱ';

/**
 * U+0615 ARABIC SMALL HIGH TAH — the positive marker.
 *
 * The IndoPak waqf (pause) sign. Uthmani marks the same pauses with
 * U+06DA / U+06D9 / U+06D6. Absence of alef-wasla alone could be satisfied by
 * an empty or Latin-filled column, so the gate also requires this to be
 * *present*, in quantity.
 */
const INDOPAK_WAQF_TAH = 'ؕ';

/** U+06E1 ARABIC SMALL HIGH DOTLESS HEAD OF KHAH — IndoPak's sukun over long vowels. */
const INDOPAK_SUKUN = 'ۡ';

/** U+066E ARABIC LETTER DOTLESS BEH — IndoPak's dotless ya in e.g. `وَلّٰٮهُمۡ`. */
const DOTLESS_BEH = 'ٮ';

/**
 * Formatting codepoints the upstream payload carries inside the Arabic:
 * RLM, ZWSP and a BOM used mid-string. They are invisible and they are not
 * part of the reading, but they *are* part of what ships, so they are stripped
 * only for comparison against hand-quoted reference text — never from the data
 * itself. See the provenance doc, §"Invisible formatting characters".
 */
const INVISIBLES = /[​‏﻿  ]/g;

/**
 * Normalise for comparison against hand-quoted reference text — **only** for
 * that. Two things are removed, and neither is removed from the data.
 *
 * 1. The invisible formatting codepoints above.
 * 2. Combining-mark *order*, via NFC.
 *
 * (2) is the one that matters, and it is a genuine property of this dataset:
 * the upstream writes **shadda before the vowel** (`U+0651 U+064F`), where
 * Unicode canonical order puts the vowel first (fatha/damma are combining
 * class 30/31, shadda is 33). 5,703 of the 6,236 verses are affected. The two
 * orderings render identically and are canonically equivalent, so a human
 * transcribing a verse into this file has no way to know which order their
 * editor produced — comparing without NFC would make the reference assertions
 * below a test of the transcriber's keyboard rather than of the scripture.
 *
 * The ordering itself is pinned as a fact in
 * `describe('canonical form — pinned, not corrected')` below.
 */
function strip(text: string): string {
  return text
    .replace(INVISIBLES, '')
    .replace(/\s+/g, ' ')
    .trim()
    .normalize('NFC');
}

interface SnapshotVerse {
  verse_key: string;
  text_indopak: string;
}

const SNAPSHOT_PATH = join(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'prisma',
  'data',
  'quran-indopak.json',
);

/**
 * Read with `fs`, not `import … from '*.json'`: `tsconfig.json` does not set
 * `resolveJsonModule`, and a 1.7 MB JSON import would be compiled in anyway.
 */
const VERSES: SnapshotVerse[] = JSON.parse(
  readFileSync(SNAPSHOT_PATH, 'utf8'),
).verses;

describe('IndoPak snapshot — completeness', () => {
  it('holds exactly 6236 verses', () => {
    expect(VERSES).toHaveLength(TOTAL_VERSES_IN_QURAN);
  });

  it('has no verse missing its text', () => {
    const missing = VERSES.filter(
      (v) => typeof v.text_indopak !== 'string' || v.text_indopak.trim() === '',
    ).map((v) => v.verse_key);
    // Report the keys, not just the count — a seed that "skipped a few" must
    // say which few.
    expect(missing).toEqual([]);
  });

  /**
   * The seed resolves `verse_key` → `(surahId, verseNumber)` and then to a row
   * id via `@@unique([surahId, verseNumber])`. Any key that is malformed, out
   * of range, duplicated or missing is a key that cannot resolve, so the gate
   * checks the key space itself rather than waiting for the seed to discover
   * it against a live database.
   */
  it('every verse_key is well-formed, unique, and in the real muṣḥaf', () => {
    const malformed = VERSES.map((v) => v.verse_key).filter(
      (k) => !/^\d{1,3}:\d{1,3}$/.test(k),
    );
    expect(malformed).toEqual([]);

    const keys = VERSES.map((v) => v.verse_key);
    expect(new Set(keys).size).toBe(TOTAL_VERSES_IN_QURAN);

    const outOfRange = keys.filter((k) => {
      const [surah, verse] = k.split(':').map(Number);
      return surah < 1 || surah > SURAH_COUNT || verse < 1;
    });
    expect(outOfRange).toEqual([]);
  });

  it('covers all 114 surahs, each numbered 1..n with no gap', () => {
    const bySurah = new Map<number, number[]>();
    for (const v of VERSES) {
      const [surah, verse] = v.verse_key.split(':').map(Number);
      if (!bySurah.has(surah)) bySurah.set(surah, []);
      bySurah.get(surah)!.push(verse);
    }

    expect(bySurah.size).toBe(SURAH_COUNT);

    const broken: string[] = [];
    for (const [surah, verses] of bySurah) {
      const sorted = [...verses].sort((a, b) => a - b);
      const contiguous = sorted.every((n, i) => n === i + 1);
      if (!contiguous) broken.push(`surah ${surah}`);
    }
    expect(broken).toEqual([]);
  });
});

describe('encoding — IndoPak and not Uthmani', () => {
  /**
   * The assertion this whole file exists for. Zero tolerance, not a threshold:
   * genuine IndoPak contains no alef-wasla at all, so even one occurrence
   * means Uthmani has leaked in.
   */
  it('contains no U+0671 alef-wasla anywhere — the Uthmani tell', () => {
    const contaminated = VERSES.filter((v) =>
      v.text_indopak.includes(ALEF_WASLA),
    ).map((v) => v.verse_key);
    expect(contaminated).toEqual([]);
  });

  it('carries the IndoPak waqf mark U+0615, in quantity', () => {
    const withTah = VERSES.filter((v) =>
      v.text_indopak.includes(INDOPAK_WAQF_TAH),
    );
    // ~2,900 verses carry at least one in this snapshot. A floor well below
    // that catches "replaced wholesale" without breaking on a legitimate
    // upstream re-edition.
    expect(withTah.length).toBeGreaterThan(1000);
  });

  it('writes the definite article as plain alef-lam, not alef-wasla', () => {
    // `النَّاسِ` in 2:142 — the exact word Uthmani renders `ٱلنَّاسِ`.
    const v = byKey('2:142');
    expect(v).toContain('الن'); // ا ل ن
    expect(v).not.toContain(ALEF_WASLA);
  });

  it('uses IndoPak long-vowel sukun (U+06E1) and dotless beh (U+066E)', () => {
    const sukun = VERSES.filter((v) => v.text_indopak.includes(INDOPAK_SUKUN));
    expect(sukun.length).toBeGreaterThan(3000);

    const dotless = VERSES.filter((v) => v.text_indopak.includes(DOTLESS_BEH));
    // U+066E is rare but is a strong IndoPak signature; 2:142's `وَلّٰٮهُمۡ`
    // is one of them.
    expect(dotless.length).toBeGreaterThan(100);
    expect(byKey('2:142')).toContain(DOTLESS_BEH);
  });
});

describe('reference verses — character by character', () => {
  /**
   * The two verses checked against text quoted by hand from the IndoPak
   * muṣḥaf, rather than against anything derived from the snapshot.
   *
   * ## Why a prefix, and why stripped
   *
   * The reference for 2:142 is the opening clause only — quoting a whole verse
   * by hand invites a transcription error in the gate itself. And the payload
   * threads U+200B / U+200F / U+FEFF through the Arabic (see the provenance
   * doc), which a hand-quoted reference does not carry. `strip` removes those
   * for the comparison only; `encoding` above asserts over the raw text.
   */
  const REFERENCE_2_142 =
    'سَيَقُوۡلُ السُّفَهَآءُ مِنَ النَّاسِ مَا وَلّٰٮهُمۡ عَنۡ قِبۡلَتِهِمُ الَّتِىۡ كَانُوۡا عَلَيۡهَا';

  it('2:142 opens exactly as the IndoPak muṣḥaf writes it', () => {
    const actual = strip(byKey('2:142'));
    const expected = strip(REFERENCE_2_142);

    // Fail on the first differing character with its codepoint, rather than
    // on a wall of indistinguishable Arabic.
    for (let i = 0; i < expected.length; i++) {
      if (actual[i] !== expected[i]) {
        throw new Error(
          `2:142 diverges at index ${i}: expected U+${expected
            .charCodeAt(i)
            .toString(16)
            .toUpperCase()
            .padStart(4, '0')}, got U+${(actual.charCodeAt(i) || 0)
            .toString(16)
            .toUpperCase()
            .padStart(4, '0')}`,
        );
      }
    }
    expect(actual.startsWith(expected)).toBe(true);
  });

  it('1:1 is the basmala in IndoPak orthography', () => {
    // Note `اللهِ` here — a plain lam-lam-heh with no superscript alef, which
    // is how the IndoPak basmala is set. Uthmani writes `ٱللَّهِ`.
    expect(strip(byKey('1:1'))).toBe(
      strip('بِسۡمِ اللهِ الرَّحۡمٰنِ الرَّحِيۡمِ'),
    );
  });

  it('114:6 — the last verse — is present and IndoPak', () => {
    const last = byKey('114:6');
    expect(last.trim().length).toBeGreaterThan(0);
    expect(last).not.toContain(ALEF_WASLA);
    expect(strip(last)).toContain('النَّاسِ');
  });
});

/**
 * Private Use Area codepoints shipped by the upstream as font-specific waqf
 * glyphs. They are NOT stripped — see the provenance doc, §"Private Use Area
 * codepoints" — but they are pinned here so that the set cannot change
 * without somebody noticing, and so the mobile side has a committed list of
 * exactly what needs a font that maps them.
 */
describe('Private Use Area codepoints — known and pinned', () => {
  const KNOWN_PUA = [
    0xe003, 0xe004, 0xe01a, 0xe01b, 0xe01c, 0xe01e, 0xe01f, 0xe021, 0xe022,
  ];

  it('contains only the nine documented PUA codepoints', () => {
    const found = new Set<number>();
    for (const v of VERSES) {
      for (const ch of v.text_indopak) {
        const cp = ch.codePointAt(0)!;
        if (cp >= 0xe000 && cp <= 0xf8ff) found.add(cp);
      }
    }
    expect([...found].sort((a, b) => a - b)).toEqual(KNOWN_PUA);
  });
});

/**
 * The dataset is **not** in Unicode canonical (NFC) form, and is stored that
 * way on purpose.
 *
 * Running `String.prototype.normalize('NFC')` over it would reorder combining
 * marks in 5,703 of the 6,236 verses — visually identical output, different
 * bytes, and a silent divergence from the muṣḥaf as published. Scripture is
 * stored as received. This group exists so the fact is visible rather than
 * discovered, and so that an upstream re-edition which *does* normalise is
 * caught here instead of surfacing later as a mysterious diff.
 */
describe('canonical form — pinned, not corrected', () => {
  it('is stored as received: most verses are not in NFC form', () => {
    const notNfc = VERSES.filter(
      (v) => v.text_indopak.normalize('NFC') !== v.text_indopak,
    );
    expect(notNfc.length).toBe(5703);
  });

  /**
   * And normalising would not merely reorder. In 1,242 verses it **composes
   * characters that are not there**: 1,605 occurrences of
   * `U+0627 ALEF` + `U+0653 MADDAH ABOVE` become a single
   * `U+0622 ALEF WITH MADDA ABOVE`.
   *
   * That is a defensible Unicode transformation and still the wrong thing to
   * do to a muṣḥaf without saying so: the stored text would no longer be the
   * text that was published, searching for the sequence would stop matching,
   * and a later diff against a re-fetch would show 1,242 changed verses with
   * no explanation. Pinned, so the choice is on the record.
   */
  it('NFC would compose alef + maddah into U+0622 — 1605 times', () => {
    let alefMaddah = 0;
    const affected: string[] = [];
    for (const v of VERSES) {
      const before = (v.text_indopak.match(/آ/g) ?? []).length;
      const after = (v.text_indopak.normalize('NFC').match(/آ/g) ?? [])
        .length;
      if (after > before) {
        alefMaddah += after - before;
        affected.push(v.verse_key);
      }
    }
    expect(alefMaddah).toBe(1605);
    expect(affected).toHaveLength(1242);
  });

  it('that composition is the only thing NFC changes beyond mark order', () => {
    // Everything else must be a pure reordering. If some *other* substitution
    // ever appeared, "store it as received" would need re-examining rather
    // than quietly continuing.
    const sorted = (t: string) => [...t].sort().join('');
    const unexplained = VERSES.filter((v) => {
      // Undo the one known composition, then the multisets must match.
      const nfc = v.text_indopak.normalize('NFC').replace(/آ/g, 'آ');
      const raw = v.text_indopak.replace(/آ/g, 'آ');
      return sorted(nfc) !== sorted(raw);
    }).map((v) => v.verse_key);
    expect(unexplained).toEqual([]);
  });
});

function byKey(key: string): string {
  const verse = VERSES.find((v) => v.verse_key === key);
  if (!verse) throw new Error(`verse ${key} missing from the IndoPak snapshot`);
  return verse.text_indopak;
}
