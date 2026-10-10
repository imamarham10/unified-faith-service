# Qur'an Juz API — frozen contract
**Date:** 2026-10-10 · Base: `/api/v1/islam/quran` · Both endpoints `@Public()`

Backend and mobile build against this in parallel. **Changing it after either
side starts needs both sides told.**

## Why this is a backend endpoint and not a client constant

Juz boundaries themselves are 30 fixed constants and could live in the client.
The verses cannot. A juz spans surahs — Juz 1 is 1:1–2:141, and **Juz 30 spans
37 surahs (78:1–114:6)**. A client assembling that from the existing
`GET /surah/:id` would make 37 round trips for one juz. The server already
holds all 6,236 verses and can answer in one.

## 1. `GET /juz`

The chooser. No parameters.

```json
[ { "number": 1,
    "start": { "surahId": 1,  "surahName": "Al-Fatihah", "verseNumber": 1 },
    "end":   { "surahId": 2,  "surahName": "Al-Baqarah", "verseNumber": 141 },
    "verseCount": 148,
    "surahIds": [1, 2] } ]
```

Exactly 30 entries, ascending. `surahIds` is every surah the juz touches, in
order — the client shows "Al-Fatihah – Al-Baqarah" without a second call.

## 2. `GET /juz/:number`

The reader. `number` is 1–30; anything else is `400`, not `404` — the resource
class is valid, the value isn't.

| query | default | notes |
|---|---|---|
| `translationId` | app default | same semantics as `GET /surah/:id` |
| `page` | 1 | 1-based |
| `limit` | 50 | max 300 |

```json
{ "number": 2,
  "verseCount": 111,
  "page": 1, "limit": 50, "totalPages": 3,
  "verses": [
    { "id": "…", "surahId": 2, "surahName": "Al-Baqarah",
      "verseNumber": 142,
      "indexInJuz": 1,
      "textArabic": "…", "textUthmani": "…", "textIndopak": "…",
      "translation": "…" } ]
}
```

`indexInJuz` is 1-based across the **whole juz**, not the page — the reader
shows "142 / 286" for position in surah and needs juz position for "105 verses
left" independently.

## Correctness gate — this is Qur'anic structure, so it is checkable

The 30-juz division used here is the standard **Hafs** one. Three mechanical
assertions, all of which must pass in CI:

1. **Totals.** `sum(verseCount for all 30 juz) == 6236` exactly.
2. **Contiguity.** Juz *n*'s end verse is immediately followed by juz *n+1*'s
   start verse — no gap, no overlap, no repeated verse.
3. **Endpoints.** Juz 1 starts at 1:1; juz 30 ends at 114:6.

Any boundary table that passes all three is almost certainly right; one that
fails any is certainly wrong. Source the boundaries from a reference and then
let the assertions judge them — **do not hand-type 30 pairs and trust them.**

Verse counts must be computed from the seeded `quran_verses` rows, never
hardcoded alongside the boundaries, or assertion 1 checks the table against
itself and proves nothing.

## 3. Amendment 2026-10-10 — `textIndopak` (additive)

**Added after both sides started, and notified as this section requires.**
Purely additive: no field renamed, no field removed, no field's meaning
changed. A client written against the original §2 keeps working untouched.

`verses[].textIndopak` — `string | null` — the verse in the **IndoPak**
encoding, alongside the Uthmani one that was already there.

IndoPak is an **encoding, not a typeface.** The two scripts are different
Unicode, so a client cannot derive one from the other by changing font — which
is exactly the bug this field exists to fix. 2:142:

| | |
|---|---|
| Uthmani (`textUthmani`) | `۞سَيَقُولُ ٱلسُّفَهَآءُ مِنَ ٱلنَّاسِ مَا وَلَّىٰهُمۡ …` |
| IndoPak (`textIndopak`) | `سَيَقُوۡلُ السُّفَهَآءُ مِنَ النَّاسِ مَا وَلّٰٮهُمۡ …` |

Alef-wasla `ٱ` (U+0671) against plain `ال`; dotless ya (U+066E); `ؕ` (U+0615)
waqf marks instead of `ۚ`. No font bridges that.

`null` is possible and must be handled: `quran_verses.text_indopak` is
nullable, so a database that has taken migration
`20261010120000_add_quran_indopak_script` but not run
`prisma/seed-quran-scripts.ts` serves nulls. Fall back to `textUthmani`, then
`textArabic` — the same chain `GET /surah/:id?script=indopak` uses server-side.

**Rendering warning.** The IndoPak text carries ~1,360 Private Use Area
codepoints (U+E003, U+E004, U+E01A–U+E01F, U+E021, U+E022) which are
font-specific waqf glyphs, and it is **not** in Unicode NFC form. Both are
deliberate and both are documented, with counts, in
`docs/quran_script_provenance.md` — read that before rendering this field.
