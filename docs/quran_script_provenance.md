# Qur'an script provenance

Where the Arabic text shipped in `quran_verses` came from, when it was
fetched, and what is known — and not known — about its licensing.

This file exists for the same reason `docs/artwork_provenance.md` does: Siraat
is monetised, and this is scripture. If provenance is ever questioned it has to
be answerable from a committed file rather than reconstructed from memory. The
discipline is the same one that file sets — **record what was checked, never
what was assumed**, and say "not established" where that is the honest answer.

---

## Why there is more than one Arabic column

`QuranVerse` holds four Arabic texts and they are not interchangeable:

| Column | What it is |
|---|---|
| `text_simple` | Undotted/unvowelled simple text — what `searchVerses` matches against |
| `text_arabic` | The base seeded Arabic |
| `text_uthmani` | The **Uthmani** encoding |
| `text_indopak` | The **IndoPak** encoding (added 2026-10-10) |

**IndoPak is an encoding, not a typeface.** This is the whole point and it was
the bug. The mobile app's Arabic-script preference defaults to "Indo-Pak" and
its own dartdoc admitted the problem — *"Controls the font choice; the
underlying Unicode is unchanged across selections"* — while the backend's
`?script=indopak` was a literal alias for `uthmani` in
`QuranService.resolveArabicText`. Both sides were swapping **fonts** over one
Uthmani Unicode string.

No font can bridge the two, because the characters differ. 2:142:

```
Uthmani   ۞سَيَقُولُ ٱلسُّفَهَآءُ مِنَ ٱلنَّاسِ مَا وَلَّىٰهُمۡ عَن قِبۡلَتِهِمُ ٱلَّتِي كَانُواْ عَلَيۡهَا
IndoPak    سَيَقُوۡلُ السُّفَهَآءُ مِنَ النَّاسِ مَا وَلّٰٮهُمۡ عَنۡ قِبۡلَتِهِمُ الَّتِىۡ كَانُوۡا عَلَيۡهَا ؕ
```

Alef-wasla `ٱ` (U+0671) against plain `ال`; dotless ya (U+066E); explicit
sukun-like marks over long vowels (U+06E1); `ؕ` (U+0615) waqf marks instead of
`ۚ`. **India is this app's primary market**, so the default setting named the
script people actually read and then showed them a different one.

---

## Source of record — IndoPak

| | |
|---|---|
| **Endpoint** | `https://api.quran.com/api/v4/quran/verses/indopak` |
| **Field taken** | `text_indopak`, keyed by `verse_key` (`"2:142"`) |
| **Fetched** | 2026-10-10 |
| **Response** | HTTP 200, 1,721,053 bytes, 6,236 verses |
| **Committed snapshot** | `prisma/data/quran-indopak.json` — the response body, **verbatim and unmodified** |
| **SHA-256** | `d6002981e4a55393dd65ac2ea45904bb43d652819a7d6096651b0446444a04a6` |
| **Publisher** | Quran.com (Tarteel/Quran Foundation), the same project behind `api.quran.com` v4 |

### Why the snapshot is committed rather than fetched at seed time

`prisma/seed-quran-scripts.ts` seeds Uthmani by fetching
`api.alquran.cloud` live. The IndoPak seeder deliberately does **not** follow
that part of the convention, and reads the committed file instead.

Scripture shipped in a paid app should be byte-reproducible. A seed that
fetches at run time writes whatever the upstream served that morning; nobody
can later tell what was written, or audit it, without a network and without
hoping the upstream has not changed. The snapshot *is* the audit artifact —
and it is what makes the correctness gate
(`src/faiths/islam/quran/indopak-script.spec.ts`) able to run offline in CI,
which it could not do against a live fetch.

To refresh it deliberately:

```bash
curl -s https://api.quran.com/api/v4/quran/verses/indopak \
  -o prisma/data/quran-indopak.json
shasum -a 256 prisma/data/quran-indopak.json   # record the new digest here
npx jest src/faiths/islam/quran/indopak-script.spec.ts
```

The gate must pass **before** the new snapshot is committed, and this table's
fetch date and digest updated in the same commit.

---

## Licensing position — stated, not inferred

**The Qur'anic Arabic text itself carries no copyright.** It is a received
text roughly fourteen centuries old with no author who could hold rights in
it. Nothing about reproducing it requires a licence, and no claim to the
contrary would be tenable.

**The licence of this particular *digitisation* is NOT ESTABLISHED.** What is
potentially protectable in a digital muṣḥaf is the editorial and encoding work
— the specific codepoint choices, the waqf-mark placement, and the Private Use
Area glyph assignments catalogued below — not the scripture. On that:

* The endpoint response carries no licence field. Its `meta` object is
  `{"filters": {}}` and nothing else.
* `https://quran.com/api` returns **HTTP 404** — there is no licence page at
  the obvious location.
* `https://raw.githubusercontent.com/quran/quran.com-frontend-next/main/LICENSE`
  returns **HTTP 404**.
* No licence statement for the IndoPak text was located and verified from a
  primary source on 2026-10-10.

That is the complete set of checks performed. **Do not upgrade this to a
licence claim without a primary source**, and do not read "the API is public
and returned 200" as permission — availability is not a licence, the same way
the Art Institute's collection-level CC0 in `artwork_provenance.md` covered
its *metadata* and not its images.

Practical read: the risk here is low and it is not zero. The underlying
scripture is unambiguously free; the exposure, if any, is to the encoding
work, and it is plainly attributable to Quran.com. If this ever needs to be
firmer, the action is to ask Quran.com directly and record the answer here —
not to reason about it again from scratch.

### Uthmani, for completeness

`text_uthmani` was seeded earlier from
`https://api.alquran.cloud/v1/quran/quran-uthmani` (Al Quran Cloud). It
predates this file; its fetch date was not recorded at the time and cannot now
be reconstructed. Its licensing position is **likewise not established**, on
the same reasoning. Recorded as a known gap rather than left silent.

---

## What is in the IndoPak text that will surprise you

All counts are over the committed snapshot and are asserted in
`src/faiths/islam/quran/indopak-script.spec.ts`.

### Private Use Area codepoints — 1,383 occurrences, 9 distinct

The text carries font-specific waqf/pause glyphs in the Unicode Private Use
Area. **These render as tofu (`􏿽`) in any font that does not map them**, which
includes every system Arabic font and everything `google_fonts` serves.

| Codepoint | Occurrences | Verses |
|---|---|---|
| U+E022 | 553 | 553 |
| U+E01A | 242 | 229 |
| U+E01B | 166 | 160 |
| U+E01C | 145 | 134 |
| U+E01E | 131 | 123 |
| U+E021 | 121 | 116 |
| U+E01F | 20 | 18 |
| U+E003 | 4 | 4 |
| U+E004 | 1 | 1 |
| **Total** | **1,383** | — |

**They are stored verbatim and not stripped.** Silently deleting marks from a
muṣḥaf in a seed script is the wrong place to make that decision: it is
invisible, irreversible without a re-fetch, and it is editing scripture. The
fix belongs at render time, where it is visible and reversible — either bundle
an IndoPak font that maps these (Al Qalam / Noorehuda / PDMS Saleem Quran
family), or filter the PUA range in the client where the choice can be seen
and changed.

**This is an open item for the mobile side.** The Flutter app currently
bundles no Arabic font at all (`pubspec.yaml` has no `fonts:` section; it uses
`google_fonts`), so rendering `textIndopak` as-is today will show tofu in
roughly 1,300 places across the muṣḥaf. Switching the app from font-swapping
to this field is not complete until one of those two things is done.

### The text is not in Unicode NFC form — deliberately

5,703 of the 6,236 verses change under `String.normalize('NFC')`.

1. **Combining-mark order.** The upstream writes shadda *before* the vowel
   (`U+0651 U+064F`); canonical order puts the vowel first (fatha/damma are
   combining class 30/31, shadda is 33). Visually identical, different bytes.
2. **Character composition.** In 1,242 verses, NFC composes
   `U+0627 ALEF` + `U+0653 MADDAH ABOVE` into a single
   `U+0622 ALEF WITH MADDA ABOVE` — **1,605 times**. This changes the
   characters present, not merely their order.

Stored as received. Normalising would make the stored text no longer the text
that was published, would break exact-sequence search, and would make any
future diff against a re-fetch show 1,242 changed verses with no explanation.
Both facts are pinned by tests so an upstream re-edition that normalises is
caught rather than discovered.

**Consequence for callers:** comparing `textIndopak` against text from
anywhere else requires normalising *both sides*. Do not normalise the column.

### Invisible formatting characters

Threaded through the Arabic, inside the verse text:

| Codepoint | Occurrences | Verses |
|---|---|---|
| U+200F RIGHT-TO-LEFT MARK | 6,247 | 6,235 |
| U+200B ZERO WIDTH SPACE | 4,747 | 2,860 |
| U+FEFF ZERO WIDTH NO-BREAK SPACE | 1,614 | 807 |
| U+2002 EN SPACE | 599 | 479 |
| U+2003 EM SPACE | 26 | 24 |

A U+FEFF **inside** a string is not a byte-order mark; here it is being used
as a zero-width no-break space. Also stored verbatim. Any assertion comparing
this text against hand-typed Arabic must strip these first — the gate's
`strip()` helper does exactly that, and only for comparison.

### Stray oddities, each occurring once

* **U+FE8E ARABIC LETTER ALEF FINAL FORM** — a presentation form, not a normal
  letter. One occurrence. NFC does not touch it (NFKC would); left as received.
* **U+06D2 ARABIC LETTER YEH BARREE** — an Urdu letter, one occurrence.
* **U+06A9 KEHEH** (149) and **U+06CC FARSI YEH** (35) appear alongside the
  Arabic **U+0643 KAF** (10,332) and **U+064A YEH** (18,194). The Perso-Urdu
  forms are normal in an IndoPak muṣḥaf; the mixture is not an error, but a
  caller doing letter-level matching must treat U+0643/U+06A9 and
  U+064A/U+06CC/U+0649 as equivalent or it will miss verses.

### The positive IndoPak markers

Used by the correctness gate to prove the column holds IndoPak and not
Uthmani:

| Codepoint | Occurrences | Verses | Role |
|---|---|---|---|
| U+0615 ARABIC SMALL HIGH TAH | 3,542 | 2,531 | IndoPak waqf mark (Uthmani uses U+06DA/U+06D9/U+06D6) |
| U+06E1 SMALL HIGH DOTLESS HEAD OF KHAH | 62,026 | 6,141 | IndoPak sukun over long vowels |
| U+066E ARABIC LETTER DOTLESS BEH | 1,029 | 887 | IndoPak dotless ya, e.g. `وَلّٰٮهُمۡ` in 2:142 |
| **U+0671 ARABIC LETTER ALEF WASLA** | **0** | **0** | **The Uthmani tell — must stay 0** |

### The gate was tested against a saboteur

On 2026-10-10 the snapshot was temporarily replaced with the **Uthmani** text
from `api.quran.com/api/v4/quran/verses/uthmani`, re-keyed into
`text_indopak`: 6,236 verses, every `verse_key` correct, no empties — a
forgery that is structurally flawless and encoded wrong, which is precisely
the mistake a careless seed would make.

| Gate group | Result against the saboteur |
|---|---|
| Completeness (5 assertions) | **all passed** — structure alone proves nothing |
| Encoding (4 assertions) | **all failed** |
| Reference verses (3) | **all failed** |
| PUA pin, canonical-form pins (3) | **all failed** |

10 failures, 5 passes. The snapshot was then restored and its SHA-256
re-verified against the digest recorded above. Anyone weakening an assertion
in that file should repeat this experiment.

U+0671 is the discriminator. It is frequent in Uthmani and occurs **zero**
times in genuine IndoPak, so "contains no U+0671" is a cheap, total proof that
Uthmani has not been written into the IndoPak column. That failure mode would
pass every structural check — 6,236 rows, no nulls, Arabic everywhere — and
would silently reproduce the exact bug this work was done to fix, which is why
it is guarded **twice**: in the gate, and in the seed before it writes.

---

## Operational record

| | |
|---|---|
| **Migration** | `prisma/migrations/20261010120000_add_quran_indopak_script` — `ALTER TABLE "quran_verses" ADD COLUMN "text_indopak" TEXT;` |
| **Seeder** | `seedIndopakScript` in `prisma/seed-quran-scripts.ts` |
| **Run standalone** | `npm run prisma:seed:quran-scripts` |
| **Correctness gate** | `src/faiths/islam/quran/indopak-script.spec.ts` |
| **Seeded against production?** | **NO.** Prepared and gated only, as of 2026-10-10. |

The migration adds one nullable column with no default and no backfill. It
rewrites no rows, takes no table-rewrite lock on PostgreSQL, and is invisible
to every existing query — reading it on an unseeded database yields `null`,
which every consumer handles. It is safe to run against production at any
time, including before the application code that uses it.

Use `prisma migrate deploy`, never `prisma migrate dev`: the latter's
shadow-database and drift detection can prompt a reset against live user data.

### ⚠️ Migrate BEFORE deploying the app code — this order is not optional

Once `text_indopak` is in `schema.prisma`, Prisma selects it on **every**
Qur'an verse read, not only the new ones: `getSurah`, `getSurahPremium`,
`getVerse` and `searchVerses` all use `include` with no `select`, so Prisma
emits every scalar the model declares, and `JuzService` names the column
explicitly.

**So application code deployed ahead of the migration makes every Qur'an read
endpoint return 500** (Postgres 42703, `column "text_indopak" does not
exist`). Not an edge case — the default outcome:

* `vercel.json` has no migration step.
* `"build": "nest build"` runs no migration.
* `"postinstall": "prisma generate"` runs no migration.

Nothing in the deploy pipeline will run this for you. The required order is:

```bash
npm run prisma:migrate:deploy   # 1. add the column (safe, nullable, instant)
# 2. deploy the application
npm run prisma:seed:quran-scripts   # 3. back-fill the text (safe, idempotent)
```

The reverse order is harmless — a nullable column that no deployed code reads
breaks nothing — so when in doubt, migrate early. Step 3 may lag steps 1–2 by
any amount: until it runs, `textIndopak` serves `null` and
`?script=indopak` falls back to Uthmani, i.e. exactly today's behaviour.

The seeder is idempotent and **recovers from a partial run**: its skip check
counts non-null rows against 6,236 rather than looking for a single one, so a
run interrupted mid-way is resumed by simply running it again.
