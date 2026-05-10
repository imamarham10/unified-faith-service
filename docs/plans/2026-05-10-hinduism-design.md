# Hinduism Module — Design Document

**Date:** 2026-05-10
**Author:** Brainstorming session (arham + Claude)
**Status:** Approved (4/4 sections)
**Target launch:** ~22 weeks (~5.5 months) after kick-off

---

## Executive summary

Add a Hindu spiritual companion to Siraat at full feature parity with the existing Islam module. Build it as a parallel `src/faiths/hindu/` tree mirroring Islam's structure (no shared abstractions yet — Rule of Three for premature abstraction). Deity-aware (Ishta Devata) personalization. Launch with English + Sanskrit + Hindi; schema designed for Tamil/Bengali/etc. as data later. Public-domain content sourcing for v1; flagship-only audio (Hanuman Chalisa, Vishnu Sahasranama, Gayatri Mantra). Compute Panchang ourselves with Swiss Ephemeris. Burgundy + warm gold theme with kolam pattern.

The frontend `/hindu` route currently shows a coming-soon placeholder; this work replaces it with a full surface symmetric to `/islam/*`.

---

## Locked decisions

| Decision | Choice | Rationale |
|---|---|---|
| **Scope** | Full parity with Islam (9 modules, ~5.5 months) | Marketing-equal to Islam; treats Hindu as a flagship-equal launch |
| **Diversity model** | Deity-aware (Ishta Devata) — 6 deities at launch | Practitioners self-identify by chosen deity, not abstract sect; better SEO match; cleaner schema than nested sect taxonomies |
| **Languages** | English + Sanskrit + Hindi (schema for more) | Hindi unlocks the largest single-language Indian Hindu audience; schema designed so Tamil/Bengali/Telugu/Kannada/Marathi can be added as data without migration |
| **Text sourcing** | Public-domain digitizations | Free, fast, sufficient for v1; gray Gita Press content avoided in v1 |
| **Audio at launch** | Flagship-only: Hanuman Chalisa, Vishnu Sahasranama, Gayatri Mantra | 80/20 win on devotional listening; full Gita audio deferred to phase 2 |
| **Panchang** | Compute ourselves with Swiss Ephemeris | Symmetry with Islam's internal Hijri computation; no recurring cost; enables historical/future queries |
| **Theme** | Burgundy + warm gold + kolam pattern | Sanyasi colors are politically neutral, pan-sectarian, and pair with the umbrella twilight |
| **Architecture** | Mirror Islam structure, no shared abstractions | Speed-to-launch dominates; refactor risk on production code; Rule of Three says wait until 3 faiths exist before extracting common modules |
| **Deity picker UX** | Inline-on-home (primary), settings page (secondary), NOT on registration | Doesn't bloat signup form; never blocks features; defaults to "universal" picks until set |

---

## 1. Backend module map

### Directory structure
```
src/faiths/
├── faith.module.ts          # imports IslamModule + HinduModule
├── islam/                   # existing — untouched
└── hindu/
    ├── puja-times/          # mirrors prayers/   — Sandhya & auspicious times
    ├── scriptures/          # mirrors quran/     — Bhagavad Gita + others
    ├── japa/                # mirrors dhikr/     — mantra counter
    ├── panchang/            # mirrors calendar/  — Tithi/Nakshatra/festivals
    ├── stotras/             # mirrors duas/      — stotras + aartis
    ├── deity-names/         # mirrors names/     — 108 Names per deity
    ├── temple-locator/      # replaces qibla/    — nearest temples
    ├── feelings/            # mirrors feelings/  — mood → Gita verse
    ├── sacred-stories/      # mirrors hadiths/   — Puranas + saint biographies
    └── hindu.module.ts
```

### URL convention
All Hindu endpoints under `/api/v1/hindu/<module>/<action>`. Same auth posture as Islam: read endpoints public, user-state endpoints (japa counters, favorites, scripture bookmarks) protected by `JwtAuthGuard` and `@CurrentUser()`. Same response envelope shape.

### App registration
```ts
// src/faiths/faith.module.ts
@Module({
  imports: [IslamModule, HinduModule],
  exports: [IslamModule, HinduModule],
})
export class FaithModule {}
```

### New npm packages
- `swisseph` (or pure-JS port) — Swiss Ephemeris for Panchang
- `@googlemaps/google-maps-services-js` OR `@mapbox/mapbox-sdk` — temple locator (decision in implementation phase)
- `@fontsource/noto-sans-devanagari` — frontend Devanagari rendering

### Symmetry guarantee
Every Hindu endpoint has a 1:1 conceptual analog to an Islam endpoint with the same auth, pagination, and response shape. Frontend porting becomes mechanical (copy `/islam/*` route → adapt for Hindu).

---

## 2. Database schema

~25 new Prisma models prefixed `Hindu*`. FK references to `User` cascade-delete. All in a single migration (`add_hindu_module`).

### Cross-cutting: Ishta Devata
Stored in existing `UserPreference.contentPreferences` JSON (no new table):
```ts
contentPreferences: {
  ...existing,
  ishtaDevata?: string[];  // e.g., ["vishnu", "shiva", "hanuman"]
}
```

### Module-by-module

**1. Puja-times** — Computed; only logging is persisted:
- `PujaLog (id, userId, sandhya: 'pratah'|'madhyahna'|'sayam', date, status, createdAt)`

**2. Scriptures** — Heaviest. Generic shape so Gita, Vishnu Sahasranama, Hanuman Chalisa, Upanishads share the same model:
```prisma
HinduText            (id, slug, nameEnglish, nameSanskrit, type, totalVerses, isPremium)
HinduTextChapter     (id, textId, chapterNumber, nameSanskrit, nameEnglish)
HinduTextVerse       (id, textId, chapterId, verseNumber, sanskritText, transliteration)
HinduTextTranslation (id, verseId, languageCode, authorName, text, isPremium)
HinduTextAudio       (id, textId, chapterId?, reciterSlug, url, isPremium)
HinduScriptureBookmark (id, userId, verseId, note, createdAt)
```

**3. Japa** — Mirrors `Dhikr*`:
- `JapaCounter (id, userId, name, mantraSanskrit?, mantraEnglish?, count, targetCount?, deityKey?)`
- `JapaGoal (id, userId, mantraSanskrit, targetCount, period, startDate, endDate)`
- `JapaHistory (id, userId, mantra, count, date, createdAt)`
- Predefined mantras kept in-memory (`MantraDictionaryService`).

**4. Panchang**:
- `HinduFestival (id, slug, nameEnglish, nameSanskrit, nameHindi, ruleSpec: Json, deityKey?, regions: string[])`
- No pre-computed `Occurrence` table — compute lazily, cache in Redis if needed later.

**5. Stotras**:
- `StotraCategory (id, slug, name, deityKey?)`
- `Stotra (id, categoryId, slug, titleSanskrit, titleEnglish, type: 'stotra'|'aarti'|'bhajan', deityKey?, isPremium)`
- `StotraVerse (id, stotraId, verseNumber, sanskritText, transliteration)`
- `StotraTranslation (id, verseId, languageCode, text)`
- `StotraAudio (id, stotraId, reciterSlug, url)`
- `UserFavoriteStotra (userId, stotraId)`

**6. Deity-names**:
- `Deity (id, slug, nameEnglish, nameSanskrit, family, color, traditions: string[])` — seeded with 6 deities at launch
- `DeityName (id, deityId, sequence, sanskritName, transliteration, hindiName, englishMeaning, description?)`
- `UserFavoriteDeityName (userId, deityNameId)`

**7. Temple-locator**:
- `Temple (id, name, deityKey?, lat, lng, address, country, photos: string[], googlePlaceId?, source: 'curated'|'google')`
- `UserFavoriteTemple (userId, templeId)`
- ~200 famous temples curated and seeded; Google Places used live-only (TOS-safe), never persisted from Places.

**8. Feelings**:
- `HinduEmotion (id, slug, nameEnglish, nameHindi, icon)`
- `HinduEmotionRemedy (id, emotionId, verseId, note, sequence)` — links to `HinduTextVerse`

**9. Sacred-stories**:
- `HinduStoryCollection (id, slug, name, sourceText, isPremium)`
- `HinduStory (id, collectionId, storyNumber?, title, summary, body, deityKey?, characters: string[])`
- `HinduStoryTranslation (id, storyId, languageCode, body)`
- `UserFavoriteHinduStory (userId, storyId)`

### Indexes
- `HinduTextVerse (textId, chapterId, verseNumber)` composite
- `HinduFestival.slug` unique
- `Temple (lat, lng)` for radius queries (or PostGIS `geography` if needed)
- `JapaHistory (userId, date)` for streak queries
- `DeityName (deityId, sequence)` for ordered listing

---

## 3. Frontend, theme & onboarding

### Routes (15 new entries)
```ts
route("hindu", "routes/hindu.tsx"),                              // home
route("hindu/puja-times", "routes/hindu.puja-times.tsx"),
route("hindu/scriptures", "routes/hindu.scriptures.tsx"),
route("hindu/scriptures/:slug", "routes/hindu.scriptures.$slug.tsx"),
route("hindu/scriptures/:slug/chapter/:n", "routes/hindu.scriptures.$slug.chapter.$n.tsx"),
route("hindu/japa", "routes/hindu.japa.tsx"),
route("hindu/panchang", "routes/hindu.panchang.tsx"),
route("hindu/stotras", "routes/hindu.stotras.tsx"),
route("hindu/stotras/:id", "routes/hindu.stotras.$id.tsx"),
route("hindu/names/:deity", "routes/hindu.names.$deity.tsx"),
route("hindu/temples", "routes/hindu.temples.tsx"),
route("hindu/feelings", "routes/hindu.feelings.tsx"),
route("hindu/feelings/:slug", "routes/hindu.feelings.$slug.tsx"),
route("hindu/stories", "routes/hindu.stories.tsx"),
route("hindu/stories/:id", "routes/hindu.stories.$id.tsx"),
```
Existing `/hindu` coming-soon route entry stays; just points at the new home.

### FaithConfig
Flip Hindu's `comingSoon: false` and replace placeholder navLinks with the real 9-item list. Header/Footer already key off `faith === "hindu"` — chrome activates automatically.

### Theme tokens (added to `app.css`)
```css
@theme {
  --color-hindu-primary:       #6B1F2A;
  --color-hindu-primary-dark:  #4A1119;
  --color-hindu-primary-light: #8B3344;
  --color-hindu-surface-warm:  #FBF6EC;
  /* gold (--color-gold) reused — shared with umbrella */
}

.bg-hero-hindu {
  background: linear-gradient(135deg, #4A1119 0%, #6B1F2A 50%, #2A0A12 100%);
}
.pattern-kolam::before { /* SVG-based 4-fold rotational lattice, opacity 0.05 */ }
.btn-hindu-primary { /* burgundy gradient */ }
```

### Header & Footer chrome — 3-way fork
Extend existing Islam-vs-neutral logic:
- `/islam/*` → `bg-hero-warm` + `pattern-islamic` + `btn-primary` (existing, unchanged)
- `/hindu/*` → `bg-hero-hindu` + `pattern-kolam` + `btn-hindu-primary`
- everything else → `bg-hero-neutral` (existing, unchanged)

Two small refactors in `Header.tsx` and `Footer.tsx`. Sign-In button color forks 3-ways.

### Hindu home page sections (`routes/hindu.tsx`)
Mirrors Islam home structure for symmetry:
1. Greeting (Namaste, time-based: Shubh Prabhat / Madhyahna / Sandhya)
2. Today's Panchang card (Tithi, Nakshatra, Yoga, Vaara)
3. Next Sandhya card (countdown + sun-position diagram)
4. Daily verse from Bhagavad Gita
5. Daily mantra (keyed to Ishta Devata; falls back to Gayatri)
6. Daily Name (rotates from chosen deity's 108)
7. Upcoming festivals (next 3 in user's timezone)
8. Mood widget (entry to feelings/Gita-verse mapping)

### Deity picker (Ishta Devata) — three touchpoints
1. **Inline on Hindu home** (primary) — prominent "Personalize your practice" card if `ishtaDevata` empty; pick up to 3 from 6 deities; dismiss-able but returns next visit.
2. **Settings page** — new "Devata" section, multi-select chip group.
3. **Registration** — *not* added; would bloat signup form and hurt conversion.

### Devanagari font
Add `@fontsource/noto-sans-devanagari`; expose as `--font-devanagari` token; use for all Sanskrit/Hindi text.

### Shared component
`<DeityBadge deity="vishnu" />` chip used across mantra/name/stotra cards.

### SEO
- `root.tsx` `meta()` — add `pathname.startsWith()` branches for all `/hindu/*` patterns
- Breadcrumb schema — `validTopLevel` gets `"hindu"`; `routeNames` map gets Hindu entries
- Sitemap — static entries for ~10 top-level Hindu routes; dynamic entries for Gita chapters (18), Stotras (~30), Stories (~50), emotions (12-14)

---

## 4. Content ingestion, phasing & risks

### Content sourcing per module (v1)

| Module | Source | Effort |
|---|---|---|
| Bhagavad Gita (700 v.) | `gita/bhagavad-gita-api` GitHub (PD); Aurobindo / Edwin Arnold English; PD Hindi via wikisource | ~80 hrs |
| Vishnu Sahasranama (1000 names) | Sanskrit + Sankaracharya commentary (PD) | ~30 hrs |
| Hanuman Chalisa (40 v.) | Tulsidas Awadhi (PD) + PD translations | ~10 hrs |
| Mantras | Universal — Gayatri, Maha Mrityunjaya, etc. (all PD ancient) | ~15 hrs |
| 108 Names × 6 deities | Ashtottara Shatanamavalis (PD); first-108 of Sahasranamas | ~40 hrs |
| Stotras + Aartis (~30) | Major aartis + stotras (PD by age) | ~50 hrs |
| Festivals (~30) | Dharmashastra rules; cross-check vs DrikPanchang | ~30 hrs |
| Sacred Stories (~50) | Bhagavata Purana (PD), Ramayana tales, Saint Lives | ~70 hrs |
| Mood→Gita verses (12 × 4-6) | Curate from Gita already seeded | ~15 hrs |
| Temples (~200 curated) | Wikipedia + official temple sites | ~30 hrs |
| Audio (3 flagships) | archive.org PD; Opus encoding; R2/S3 hosting | ~10 hrs |

**Total content effort: ~380 hrs (~9-10 weeks)** — runs in parallel with engineering. Content lead is critical-path.

### Ingestion mechanism
Idempotent seed scripts in `prisma/`, mirroring Islam's pattern:
- `seed-hindu-foundation.ts` (deities, festivals, mantras dictionary)
- `seed-bhagavad-gita.ts`
- `seed-vishnu-sahasranama.ts`
- `seed-hanuman-chalisa.ts`
- `seed-deity-names.ts` (108 × 6)
- `seed-stotras.ts`
- `seed-sacred-stories.ts`
- `seed-mood-gita.ts`
- `seed-temples.ts`

`npm run prisma:seed:hindu` runs all in dependency order. All use `upsert` by slug/sequence — safe to re-run.

### Phasing — 22-week plan (1 engineer + 1 content lead, parallel)

**Phase 0 — Foundation (W1-2)**
- Theme tokens, Devanagari font, 3-way Header/Footer chrome
- FaithConfig real Hindu nav
- `src/faiths/hindu/` skeleton (9 module stubs)
- Single Prisma migration: ~25 Hindu tables
- root.tsx meta + breadcrumbs + sitemap stubs

**Phase 1 — Foundational features (W3-7)** *content-light*
- W3-4: Panchang (swisseph integration)
- W5: Festival rule engine + 30 festival seed
- W6: Puja-times (Sandhya calc + log)
- W7: Japa (mirrors dhikr exactly)

**Phase 2 — Scriptures backbone (W8-13)** *content-heavy*
- W8: Scriptures backend (models + ingestion infra)
- W9-10: Bhagavad Gita seed
- W11: Hanuman Chalisa + Vishnu Sahasranama seed + audio hosting
- W12: Scriptures frontend
- W13: Deity Names module + 108 × 6 seed + frontend

**Phase 3 — Devotional content (W14-18)**
- W14-15: Stotras backend + ~30 stotras seed
- W16: Stotras frontend
- W17: Sacred Stories backend + ~50 stories
- W18: Feelings/mood-Gita

**Phase 4 — Temple locator + polish (W19-22)**
- W19-20: Temple Locator + map view
- W21: Hindu home assembly + Deity picker UX
- W22: QA, scholarly review, SEO audit, content corrections, launch

### Risks & mitigations

1. **PD translations feel dated** (Aurobindo 1900s, Besant 1905). Mitigation: ship v1 with prominent attribution; commission fresh modern translation as paid phase-2 premium upgrade.

2. **Sect/regional disputes.** Mitigation: every content row carries `source` and `tradition` fields; UI shows attribution; "report inaccuracy" link; written editorial policy in repo.

3. **Devanagari rendering bugs.** Mitigation: Noto Sans Devanagari (Google reference); cross-OS testing in Phase 0.

4. **Swisseph licensing.** AGPL-3 incompatible with closed-source SaaS. Mitigation: pay commercial license (~€600 one-time per release) OR pure-JS port (`@nrweb/swisseph` or similar). Decision: pay for commercial; budget item.

5. **Google Places TOS.** Storing Places data violates TOS. Mitigation: `Temple` table only stores curated entries; Places used live-only.

6. **Audio file size.** PD recordings often 10-30 MB. Mitigation: convert to Opus 64kbps (~3-5 MB), host on Cloudflare R2 + CDN.

7. **Hindu market perception of "Islam-first" platform.** Mitigation: India-targeted marketing push at Hindu launch; neutral homepage already mitigates; dedicated `/hindu` `og:image` and landing variants for paid acquisition.

8. **Stale planning artifacts** (`faiths.constant.ts`, `plan.md`, placeholder `hindu.tsx` all list slightly different features). Mitigation: Phase 0 W1, single PR aligning to canonical 9-module list.

### Out of scope for v1 (deferred to phase 2)
- Full Gita verse-by-verse audio
- Tamil / Bengali / Telugu / Kannada / Marathi translations
- Sect-specific (Sri Vaishnava vs Madhva vs Smarta) Panchang variants
- Hindu premium tier (mirror Islam later)
- Kundali / birth chart / Vedic astrology
- Live darshan streams, temple booking
- Personalized verse recommendations (ML)

---

## Open questions / future decisions

These were intentionally deferred during brainstorming and need resolution during implementation:

1. **Temple data source** — Curated-only vs Google Places hybrid vs Mapbox. Trade-off resolved during Phase 4 W19.
2. **Audio reciter selection** — Specific PD recordings to use for Hanuman Chalisa, Vishnu Sahasranama, Gayatri. Content lead picks during Phase 2 W11.
3. **Premium tier for Hindu** — Mirror Islam's premium-translations-and-reciters pattern, or different model? Phase 2 decision.
4. **Festival timing for sect variants** — Janmashtami has Smarta vs Vaishnava timing differences. Default to most-common; surface alternatives in v2.
5. **Editorial policy doc** — Sect attribution, source citation rules, dispute resolution. Drafted in Phase 0 W2 before content seeding begins.

---

## Next step

Hand off to `writing-plans` skill to produce the implementation plan from this design.
