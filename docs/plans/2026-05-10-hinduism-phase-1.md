# Hinduism Phase 1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship 4 of 9 Hindu modules — **Panchang, Festivals (in Panchang), Puja-times, Japa** — atop the Phase 0 foundation. By end of Phase 1, `/hindu/panchang`, `/hindu/puja-times`, and `/hindu/japa` are no longer placeholders.

**Architecture:** Mirror Islam patterns (Phase 0 commitment). Panchang is the only genuinely new shape (no Islam analog) — implements the 5 angas (Tithi, Vaara, Nakshatra, Yoga, Karana) plus Sandhya/auspicious times via a pure-JS Panchang library. Puja-times mirrors `prayers`. Japa mirrors `dhikr` almost identically.

**Tech Stack:** NestJS 11 + Prisma 7 (backend) + React Router v7 + Tailwind v4 (frontend). New runtime dependency: an MIT-licensed Panchang JS library (research in W3 → fall back to `astronomia` + custom Tithi/Nakshatra calc if none is suitable).

**Decision locked:** Panchang library = **C (existing JS package) → B (`astronomia` + custom) fallback. Skip A (`swisseph` commercial €600).** Rationale: matches the Islam side (Adhan.js MIT); avoids AGPL complexity.

---

## Plan structure

This plan covers **4 modules** in order, organized as 7 bundles (matching the bundle approach that worked for Phase 0):

- **Bundle G** — Panchang library + DTOs + service skeleton (W3 first half)
- **Bundle H** — Panchang calculation services + controller + module wiring (W3 second half + W4 first half)
- **Bundle I** — Panchang frontend page (W4 second half)
- **Bundle J** — Festivals (rule resolver + 30-festival seed + integration into Panchang) (W5)
- **Bundle K** — Puja-times (Sandhya calc + log endpoints + frontend) (W6)
- **Bundle L** — Japa (counters/goals/history + mantra dictionary + frontend) (W7)
- **Bundle M** — Phase 1 smoke test

**Total:** ~30 atomic tasks. Bundle dispatch sequencing is the same as Phase 0.

## Project conventions

- **No test framework** — manual verification via `npx tsc --noEmit`, `npm run start:dev` boot, and `curl` against running endpoints.
- **Two repos:** backend (`unified-faith-service`), frontend (`faith-web-remix`). Don't conflate.
- **Per-task commits, no bundling commits across tasks.**
- **Pre-existing `prisma migrate dev` bug** (the `add_bilingual_dhikr_support` migration's `DROP CONSTRAINT` issue) is unfixed. If a task in Phase 1 needs a new migration, use the same `prisma migrate diff` workaround Phase 0 used. **Strongly recommend fixing the legacy migration first** as a separate PR before starting Phase 1.

---

## Pre-flight

**Branch off Phase 0:**

```bash
cd /Users/imamarham10/Desktop/Arham/Faith/unified-faith-service
git checkout feat/hindu-foundation
git checkout -b feat/hindu-phase-1

cd /Users/imamarham10/Desktop/Arham/Faith/faith-web-remix
git checkout feat/hindu-foundation
git checkout -b feat/hindu-phase-1
```

If Phase 0 has merged to `main` by the time Phase 1 begins, branch from `main` instead.

---

## Module 1 — Panchang (Bundles G, H, I)

Most complex module. Implements computed Hindu calendar: 5 angas, sunrise/sunset, auspicious time bands, festivals.

### Bundle G — Panchang library, DTOs, service skeleton

**Task G1: Research and pick the Panchang library**

- Files: nothing yet — this is a research + decision task
- Search npm: `panchang`, `hindu-panchang`, `pancanga`, `vedic-astronomy`. Evaluate:
  - License (MIT or similar permissive — MUST be compatible with closed-source SaaS, NOT AGPL)
  - Last published date (within 18 months)
  - Test coverage / GitHub stars
  - Outputs we need: Tithi, Nakshatra, Yoga, Karana, Vaara, sunrise/sunset, ideally Rahu Kaal/Brahma Muhurta
  - Lahiri Ayanamsa support (the standard Indian sidereal correction)
- **Decision matrix:**
  - If a package scores well on all 4 → use it (C), commit to it
  - If no package qualifies → use `astronomia` (MIT, well-maintained) for raw sun/moon longitudes, compute angas ourselves (B). The 5-anga formulas:
    - Tithi = `floor(((Moon_long - Sun_long) mod 360) / 12)` → 0–29 → mod 30 names
    - Nakshatra = `floor(Moon_long / (360/27))` → 0–26 → 27 names
    - Yoga = `floor(((Sun_long + Moon_long) mod 360) / (360/27))`
    - Karana = `floor(((Moon_long - Sun_long) mod 360) / 6)` → 0–59 → 11 karana cycle (with Vishti/Bhadra etc. mapping)
    - Vaara = JS `Date.getDay()` mapped to Sanskrit weekday names
- **Apply Lahiri Ayanamsa** to sun/moon longitudes if computing ourselves: Lahiri at J2000 = 23.85°, increases ~50.27"/year. Use formula or library.

**Document the decision** by adding a comment at the top of the Panchang service file (created in G3) listing the chosen library, version, license, and link to the rationale.

**Step: Verify**
- `npm install <chosen-lib>` succeeds
- License confirmed compatible: `npm view <pkg> license`
- A spot-check call returns plausible Sanskrit names for today's date

**Commit:** `feat(panchang): adopt <library>@<version> for Hindu calendar calculations`

---

**Task G2: Define Panchang DTOs**

- Create: `unified-faith-service/src/faiths/hindu/panchang/dto/panchang-response.dto.ts`

```ts
export class TithiInfo {
  number: number;        // 1-30 (1-15 Shukla, 16-30 Krishna)
  name: string;
  nameSanskrit: string;
  paksha: 'shukla' | 'krishna';
  endTime?: string;       // ISO — when this tithi ends (next sunrise typically)
}

export class NakshatraInfo {
  number: number;        // 1-27
  name: string;
  nameSanskrit: string;
  deity: string;          // ruling deity (e.g., "Ashwini Kumaras")
  endTime?: string;
}

export class YogaInfo {
  number: number;        // 1-27
  name: string;
  nameSanskrit: string;
}

export class KaranaInfo {
  number: number;        // 1-11
  name: string;
  nameSanskrit: string;
  isAuspicious: boolean; // Vishti/Bhadra is inauspicious
}

export class VaaraInfo {
  number: number;        // 0-6 (Sunday=0)
  name: string;
  nameSanskrit: string;  // Ravi/Soma/Mangala/Budha/Guru/Shukra/Shani
}

export class TimeBand {
  start: string;         // ISO
  end: string;
}

export class AuspiciousTimes {
  brahmaMuhurta: TimeBand;
  abhijitMuhurta: TimeBand;
  rahuKaal: TimeBand;
  yamagandam: TimeBand;
  gulika: TimeBand;
}

export class PanchangResponseDto {
  date: string;           // YYYY-MM-DD
  timezone: string;
  tithi: TithiInfo;
  nakshatra: NakshatraInfo;
  yoga: YogaInfo;
  karana: KaranaInfo;
  vaara: VaaraInfo;
  sunrise: string;
  sunset: string;
  moonrise?: string;
  moonset?: string;
  auspicious: AuspiciousTimes;
  festivals: { slug: string; nameEnglish: string; nameSanskrit?: string }[];
}
```

**Verify:** `npx tsc --noEmit | head` clean.

**Commit:** `feat(panchang): add response DTOs for 5 angas + auspicious times`

---

**Task G3: PanchangService skeleton + Sanskrit name lookup tables**

- Create: `unified-faith-service/src/faiths/hindu/panchang/services/panchang.service.ts`
- Create: `unified-faith-service/src/faiths/hindu/panchang/data/sanskrit-names.ts` — static name tables for Tithi (30), Nakshatra (27), Yoga (27), Karana (11), Vaara (7)

The service should expose a single primary method:
```ts
async getPanchang(date: Date, lat: number, lng: number, timezone: string): Promise<PanchangResponseDto>
```

Stub the method body — return a hardcoded sample for now. Real calculation comes in Bundle H. But have the method signature, name-table lookups, and DTO assembly working.

**Sanskrit name tables** (pseudocode):
```ts
export const TITHI_NAMES = ['Pratipada', 'Dvitiya', 'Tritiya', /* ... 30 total */];
export const NAKSHATRA_NAMES = [
  { name: 'Ashwini', sanskrit: 'अश्विनी', deity: 'Ashwini Kumaras' },
  { name: 'Bharani', sanskrit: 'भरणी', deity: 'Yama' },
  // ... 27 total
];
export const YOGA_NAMES = ['Vishkambha', 'Priti', /* ... 27 total */];
export const KARANA_NAMES = ['Bava', 'Balava', 'Kaulava', 'Taitila', 'Garaja', 'Vanija', 'Vishti', 'Shakuni', 'Chatushpada', 'Naga', 'Kimstughna']; // 11
export const VAARA_NAMES = [
  { name: 'Sunday', sanskrit: 'रवि', en: 'Ravi' },
  // ... 7 total
];
```

**Verify:** `npx tsc --noEmit | head` clean. The service can be `@Injectable()` and instantiable.

**Commit:** `feat(panchang): add PanchangService skeleton + Sanskrit name lookup tables`

---

### Bundle H — Panchang calculations + controller + module wiring

**Task H1: Sun-position helper (sunrise/sunset/moonrise)**

- Create: `unified-faith-service/src/faiths/hindu/panchang/services/sun-position.service.ts`

Use the chosen Panchang library or `astronomia` to compute sunrise/sunset for a given lat/lng/date/timezone. If the chosen Panchang library bundles this, just delegate.

```ts
@Injectable()
export class SunPositionService {
  computeSunriseSunset(date: Date, lat: number, lng: number, timezone: string): { sunrise: Date; sunset: Date };
  computeMoonriseMoonset(date: Date, lat: number, lng: number, timezone: string): { moonrise?: Date; moonset?: Date };
}
```

Verify accuracy by spot-checking against a known location (e.g., Bengaluru on today's date — sunrise around 5:50–6:00 AM IST in May).

**Commit:** `feat(panchang): add sun-position service for sunrise/sunset/moonrise/moonset`

---

**Task H2: Tithi/Nakshatra/Yoga/Karana calculation**

In `PanchangService`, replace the stub from G3 with real computation:

1. Get sun & moon ecliptic longitudes (from chosen library or `astronomia`)
2. Apply Lahiri Ayanamsa correction (sidereal = tropical − ayanamsa)
3. Compute the 5 angas using the formulas listed in G1's decision-matrix block
4. Map indices to Sanskrit names from the lookup tables (G3)
5. For Tithi & Nakshatra, also compute the **end time** — the moment the current Tithi/Nakshatra transitions to the next (search for the time when `(moon - sun) mod 360 / 12` rolls over)

**Step: Verify** with hardcoded test cases:
- Pick today's date and a known lat/lng (e.g., New Delhi, 28.6° N, 77.2° E)
- Cross-check the output against a published Panchang source (e.g., DrikPanchang.com for that date) — Tithi should match to the hour
- Acceptable tolerance: end-times within ±5 minutes vs published reference

**Commit:** `feat(panchang): compute 5 angas (Tithi, Nakshatra, Yoga, Karana, Vaara)`

---

**Task H3: Auspicious time bands (Rahu Kaal, Brahma Muhurta, Abhijit, Yamagandam, Gulika)**

Add a separate service file `unified-faith-service/src/faiths/hindu/panchang/services/auspicious-times.service.ts`:

- **Brahma Muhurta:** 96 minutes before sunrise to 48 minutes before sunrise (1.5 hr to 48 min before). Two consecutive 48-min muhurtas; use the latter half conventionally.
- **Abhijit Muhurta:** 24 minutes before solar noon to 24 minutes after (~48 min total).
- **Rahu Kaal:** Day divided into 8 equal periods from sunrise to sunset. Rahu Kaal slot per weekday (well-documented mapping):
  - Sunday: 8th slot (4:30–6:00 PM in standard 12-hour day)
  - Monday: 2nd slot
  - Tuesday: 7th slot
  - Wednesday: 5th slot
  - Thursday: 6th slot
  - Friday: 4th slot
  - Saturday: 3rd slot
- **Yamagandam (Yamaganda Kalam):** similar pattern, different weekday mapping
- **Gulika Kalam:** similar pattern, different weekday mapping

Inject `SunPositionService` to get sunrise/sunset; compute slots from those.

**Verify:** Spot-check Rahu Kaal for today's weekday and lat/lng against DrikPanchang.

**Commit:** `feat(panchang): compute auspicious time bands (Rahu Kaal, Brahma Muhurta, etc.)`

---

**Task H4: PanchangController + endpoints**

- Create: `unified-faith-service/src/faiths/hindu/panchang/controllers/panchang.controller.ts`

Endpoints (mirror Islam calendar pattern):

```ts
@Controller('api/v1/hindu/panchang')
export class PanchangController {
  @Get('today')
  getToday(@Query('lat') lat: number, @Query('lng') lng: number, @Query('timezone') tz?: string)

  @Get('date/:date')
  getByDate(@Param('date') date: string, @Query('lat') lat: number, @Query('lng') lng: number, @Query('timezone') tz?: string)

  @Get('month')
  getMonth(@Query('year') year: number, @Query('month') month: number, @Query('lat') lat: number, @Query('lng') lng: number, @Query('timezone') tz?: string)

  @Get('auspicious')
  getAuspicious(@Query('date') date: string, @Query('lat') lat: number, @Query('lng') lng: number, @Query('timezone') tz?: string)
}
```

All endpoints public (no `@UseGuards(JwtAuthGuard)` — Panchang is faith-content, not user-state).

Validate `lat` (-90 to 90), `lng` (-180 to 180), `date` (YYYY-MM-DD), `year`/`month` ranges. Use ValidationPipe.

**Festivals on this date** are returned in the `festivals` array of the Panchang response — populated in Bundle J once we have the FestivalService. For now, stub `festivals: []`.

**Verify:** Start backend (`npm run start:dev`), call `curl 'http://localhost:7000/api/v1/hindu/panchang/today?lat=28.6&lng=77.2&timezone=Asia/Kolkata' | jq` and confirm a real-looking Panchang response.

**Commit:** `feat(panchang): add controller with /today, /date, /month, /auspicious endpoints`

---

**Task H5: Wire PanchangModule (controllers + providers)**

- Modify: `unified-faith-service/src/faiths/hindu/panchang/panchang.module.ts`

Update from the empty stub to:
```ts
@Module({
  controllers: [PanchangController],
  providers: [PanchangService, SunPositionService, AuspiciousTimesService],
  exports: [PanchangService],  // exported in case Festivals/Puja-times reuse it
})
export class PanchangModule {}
```

Restart backend and verify all 3 services + 1 controller initialize cleanly in the Nest boot log.

**Commit:** `feat(panchang): wire PanchangModule with controllers and providers`

---

### Bundle I — Panchang frontend page

**Task I1: Add Panchang to frontend API client**

- Modify: `faith-web-remix/app/services/api.ts`

Add a new export below the existing `calendarAPI`:

```ts
export const hinduPanchangAPI = {
  getToday: (lat: number, lng: number, timezone?: string) =>
    api.get('/api/v1/hindu/panchang/today', { params: { lat, lng, timezone } }),

  getByDate: (date: string, lat: number, lng: number, timezone?: string) =>
    api.get(`/api/v1/hindu/panchang/date/${date}`, { params: { lat, lng, timezone } }),

  getMonth: (year: number, month: number, lat: number, lng: number, timezone?: string) =>
    api.get('/api/v1/hindu/panchang/month', { params: { year, month, lat, lng, timezone } }),

  getAuspicious: (date: string, lat: number, lng: number, timezone?: string) =>
    api.get('/api/v1/hindu/panchang/auspicious', { params: { date, lat, lng, timezone } }),
};
```

**Commit:** `feat(api): add hinduPanchangAPI client`

---

**Task I2: Build the Panchang page**

- Replace: `faith-web-remix/app/routes/hindu.panchang.tsx`

Replace the placeholder with a real page. Layout (mirror the calendar page's structure but with Panchang content):

1. **Hero** — burgundy gradient (`bg-hero-hindu pattern-kolam`), title "Today's Panchang", current location, date in both Gregorian + Vikram Samvat
2. **5 angas grid** — 5 cards, one each for Tithi/Nakshatra/Yoga/Karana/Vaara. Each shows the Sanskrit name in Devanagari (using `font-devanagari`), English name, end-time
3. **Sunrise/Sunset card** — visual sun-arc from sunrise to sunset, current time marker
4. **Auspicious times list** — Brahma Muhurta, Abhijit Muhurta highlighted positive; Rahu Kaal, Yamagandam, Gulika highlighted as inauspicious
5. **Festivals on this date** (only shown if any) — small strip

Use existing geolocation logic from `app/routes/islam.tsx` (the Islam home auto-detects user lat/lng) — copy the helper into a shared place if needed, or duplicate (per Approach 1).

Remove the `noindex` from `meta()` since this is now real content.

**Verify:** `npm run dev`, navigate to `/hindu/panchang`. Today's Panchang renders with real data. Cross-check Tithi/Nakshatra against DrikPanchang for the same date+location.

**Commit:** `feat(hindu): build Panchang page with 5 angas + auspicious times`

---

## Module 2 — Festivals (Bundle J)

Festivals are conceptually part of Panchang but get their own bundle because they're content-heavy and architecturally separable.

### Bundle J — Festival rules + 30-festival seed + integration

**Task J1: Define `RuleSpec` types and FestivalRuleService**

- Create: `unified-faith-service/src/faiths/hindu/panchang/services/festival-rule.service.ts`
- Create: `unified-faith-service/src/faiths/hindu/panchang/types/rule-spec.ts`

`RuleSpec` is a discriminated union stored in the `HinduFestival.ruleSpec` JSON column:

```ts
export type RuleSpec =
  | { type: 'tithi'; month: HinduMonth; paksha: 'shukla' | 'krishna'; tithi: number }
  | { type: 'nakshatra'; month: HinduMonth; nakshatra: number }
  | { type: 'solar'; sankranti: 'mesha' | 'vrishabha' | /* ... */ 'meena' }
  | { type: 'fixed-gregorian'; month: number; day: number };

export type HinduMonth =
  | 'chaitra' | 'vaishakha' | 'jyeshtha' | 'ashadha'
  | 'shravana' | 'bhadrapada' | 'ashwin' | 'kartika'
  | 'margashirsha' | 'pausha' | 'magha' | 'phalguna';
```

`FestivalRuleService` exposes:
```ts
resolveDateForYear(festival: HinduFestival, year: number): Date  // when does this festival fall in year X?
findFestivalsForDate(date: Date): Promise<HinduFestival[]>       // any festivals on this exact date?
findUpcoming(fromDate: Date, days: number): Promise<{ festival: HinduFestival; date: Date }[]>
```

`resolveDateForYear` is the heart of the engine: given a tithi-rule like `{ month: 'kartika', paksha: 'krishna', tithi: 14 }`, find the Gregorian date in year X where that combination holds. Uses `PanchangService` to do the search (binary search over the year's days).

**Verify:** Spot-check `resolveDateForYear(diwali_rule, 2026)` — should return ~Nov 8, 2026 (Diwali 2026 is Nov 8 per published Panchang).

**Commit:** `feat(panchang): festival rule resolver service for tithi/nakshatra/solar/fixed rules`

---

**Task J2: Festival CRUD endpoints (read-only for v1)**

Extend the existing `PanchangController`:

```ts
@Get('festivals')
listAllFestivals()                                   // all rule definitions

@Get('festivals/upcoming')
upcomingFestivals(@Query('days') days = 90, @Query('timezone') tz?: string)

@Get('festivals/:slug')
getFestival(@Param('slug') slug: string)             // single festival detail
```

`listAllFestivals` returns the rule rows. `upcomingFestivals` resolves rules to dates within the window. `getFestival/:slug` returns one rule + its next 3 occurrences.

**Verify:** `curl 'http://localhost:7000/api/v1/hindu/panchang/festivals/upcoming?days=180' | jq` returns festival list with resolved dates.

**Commit:** `feat(panchang): add festival listing and upcoming-festival endpoints`

---

**Task J3: Seed 30 major festivals**

- Create: `unified-faith-service/prisma/seed-hindu-festivals.ts`
- Modify: `unified-faith-service/package.json` — add npm script `prisma:seed:hindu-festivals` running this file via tsx

Seed 30 festival rules. Suggested set (each a separate `upsert` keyed on slug):

| Slug | Rule | Notes |
|---|---|---|
| `diwali` | Tithi: Kartika Krishna Amavasya | Festival of lights |
| `dhanteras` | Tithi: Kartika Krishna Trayodashi | Diwali eve −2 |
| `govardhan-puja` | Tithi: Kartika Shukla Pratipada | Diwali +1 |
| `bhai-dooj` | Tithi: Kartika Shukla Dvitiya | Diwali +2 |
| `holi` | Tithi: Phalguna Purnima (Shukla 15) |  |
| `holika-dahan` | Tithi: Phalguna Purnima eve |  |
| `krishna-janmashtami` | Tithi: Bhadrapada Krishna Ashtami |  |
| `ram-navami` | Tithi: Chaitra Shukla Navami |  |
| `maha-shivaratri` | Tithi: Phalguna Krishna Chaturdashi |  |
| `hanuman-jayanti` | Tithi: Chaitra Purnima |  |
| `ganesh-chaturthi` | Tithi: Bhadrapada Shukla Chaturthi |  |
| `navratri-start` | Tithi: Ashwin Shukla Pratipada | Sharad Navratri |
| `dussehra` (Vijayadashami) | Tithi: Ashwin Shukla Dashami |  |
| `karwa-chauth` | Tithi: Kartika Krishna Chaturthi |  |
| `raksha-bandhan` | Tithi: Shravana Purnima |  |
| `buddha-purnima` | Tithi: Vaishakha Purnima |  |
| `guru-purnima` | Tithi: Ashadha Purnima |  |
| `makar-sankranti` | Solar: Mesha → Karka transition (no, Makar = Capricorn ingress) | Use solar transition |
| `vasant-panchami` | Tithi: Magha Shukla Panchami |  |
| `chaitra-navratri-start` | Tithi: Chaitra Shukla Pratipada |  |
| `akshaya-tritiya` | Tithi: Vaishakha Shukla Tritiya |  |
| `ganga-dussehra` | Tithi: Jyeshtha Shukla Dashami |  |
| `nirjala-ekadashi` | Tithi: Jyeshtha Shukla Ekadashi |  |
| `vat-purnima` | Tithi: Jyeshtha Purnima |  |
| `nag-panchami` | Tithi: Shravana Shukla Panchami |  |
| `onam` | Nakshatra: Bhadrapada Shravana | Regional |
| `pongal` | Solar: Capricorn ingress | South Indian |
| `ugadi` | Tithi: Chaitra Shukla Pratipada | Karnataka/AP New Year |
| `kartika-purnima` | Tithi: Kartika Purnima |  |
| `mahavir-jayanti` | Tithi: Chaitra Shukla Trayodashi | Jain festival included for completeness |

Each row in seed:
```ts
await prisma.hinduFestival.upsert({
  where: { slug: 'diwali' },
  update: {},
  create: {
    slug: 'diwali',
    nameEnglish: 'Diwali',
    nameSanskrit: 'दीपावली',
    nameHindi: 'दिवाली',
    deityKey: 'lakshmi',
    regions: ['north', 'central', 'pan-india'],
    description: 'Festival of lights celebrating the victory of light over darkness.',
    ruleSpec: { type: 'tithi', month: 'kartika', paksha: 'krishna', tithi: 30 /* Amavasya */ }
  }
});
```

Run the seed: `npm run prisma:seed:hindu-festivals` and verify 30 rows in the `hindu_festivals` table.

**Verify:** `curl 'http://localhost:7000/api/v1/hindu/panchang/festivals' | jq 'length'` returns 30.

**Commit:** `feat(panchang): seed 30 major Hindu festivals with rule specs`

---

**Task J4: Wire festivals into PanchangService.getPanchang()**

Update the `PanchangService.getPanchang()` method (from H4) so the `festivals` array is populated by calling `FestivalRuleService.findFestivalsForDate(date)`. Inject `FestivalRuleService` into `PanchangService`'s constructor.

Update `PanchangModule` providers list to include `FestivalRuleService`.

**Verify:** `curl 'http://localhost:7000/api/v1/hindu/panchang/today?lat=28.6&lng=77.2&timezone=Asia/Kolkata' | jq '.festivals'` returns either `[]` (no festival today) or an array with the festival(s) of the day.

**Commit:** `feat(panchang): include festivals on date in /today and /date endpoints`

---

**Task J5: Frontend — festivals strip on Panchang page + dedicated Upcoming Festivals card**

Update `faith-web-remix/app/routes/hindu.panchang.tsx`:
- Render the `festivals` array as a strip below the 5-anga grid (only if non-empty) — each as a chip with deity-keyed color
- Add a **"Upcoming Festivals"** card that calls `hinduPanchangAPI.getUpcomingFestivals(90)` and lists the next 5

Add to `hinduPanchangAPI` in `services/api.ts`:
```ts
listFestivals: () => api.get('/api/v1/hindu/panchang/festivals'),
upcomingFestivals: (days = 90, timezone?: string) =>
  api.get('/api/v1/hindu/panchang/festivals/upcoming', { params: { days, timezone } }),
getFestival: (slug: string) => api.get(`/api/v1/hindu/panchang/festivals/${slug}`),
```

**Verify:** `/hindu/panchang` shows festivals (test by temporarily pointing the date forward to a known festival like Diwali).

**Commit:** `feat(hindu): render festivals on Panchang page + upcoming-festivals card`

---

## Module 3 — Puja-times (Bundle K)

Mirrors Islam's `prayers` module almost exactly, just with 3 sandhya times (sunrise-based) instead of 5 prayer times.

### Bundle K — Puja-times calc + log + frontend

**Task K1: Sandhya calculation service**

- Create: `unified-faith-service/src/faiths/hindu/puja-times/services/puja-times.service.ts`

3 daily sandhyas, each anchored to sun position:
- **Pratah Sandhya (पातः):** Brahma Muhurta to ~30 min after sunrise
- **Madhyahna Sandhya (माध्यान्ह):** ~30 min before to ~30 min after solar noon
- **Sayam Sandhya (सायं):** ~30 min before sunset to ~45 min after

Inject `SunPositionService` from PanchangModule (which is `exports`-ed). Move the import into PujaTimesModule.

```ts
@Injectable()
export class PujaTimesService {
  async getTimesForDate(date: Date, lat: number, lng: number, timezone: string): Promise<PujaTimesResponseDto>
}
```

Response shape:
```ts
{
  date: string;
  pratah:    { start: string; end: string; muhurta: 'auspicious' | 'standard' };
  madhyahna: { start: string; end: string; muhurta: 'auspicious' | 'standard' };
  sayam:     { start: string; end: string; muhurta: 'auspicious' | 'standard' };
  next: { sandhya: 'pratah' | 'madhyahna' | 'sayam'; startsIn: number /* seconds */ };
}
```

**Commit:** `feat(puja-times): compute 3 daily Sandhya times based on sun position`

---

**Task K2: PujaLog service + endpoints**

- Create: `unified-faith-service/src/faiths/hindu/puja-times/services/puja-log.service.ts`
- Create: `unified-faith-service/src/faiths/hindu/puja-times/controllers/puja-times.controller.ts`

Mirror `PrayerLog` exactly. Endpoints:
```ts
@Controller('api/v1/hindu/puja-times')
class PujaTimesController {
  @Get('today')   // public
  getToday(@Query('lat') lat: number, @Query('lng') lng: number, @Query('timezone') tz?: string)

  @Get('date/:date')   // public
  getByDate(@Param('date') date: string, @Query('lat') lat: number, @Query('lng') lng: number, @Query('timezone') tz?: string)

  @Post('log')   // protected
  @UseGuards(JwtAuthGuard)
  logSandhya(@CurrentUser() user, @Body() dto: CreatePujaLogDto)

  @Get('logs')   // protected
  @UseGuards(JwtAuthGuard)
  listLogs(@CurrentUser() user, @Query('fromDate') from?: string, @Query('toDate') to?: string)

  @Get('stats')   // protected
  @UseGuards(JwtAuthGuard)
  getStats(@CurrentUser() user)

  @Delete('log/:id')   // protected
  deleteLog(@CurrentUser() user, @Param('id') id: string)
}
```

CreatePujaLogDto: `{ sandhya: 'pratah'|'madhyahna'|'sayam'; date: string; status: 'on_time'|'late'|'missed' }`

Stats: similar to Islam's prayer stats — total/on-time/late counts, current streak, longest streak, completion rate.

**Verify:** `curl` test each endpoint after starting the backend.

**Commit:** `feat(puja-times): add log + stats endpoints (auth-gated)`

---

**Task K3: Wire PujaTimesModule + frontend page**

- Modify: `unified-faith-service/src/faiths/hindu/puja-times/puja-times.module.ts` — register `PujaTimesController`, `PujaTimesService`, `PujaLogService` providers. Import `PanchangModule` to use the exported `SunPositionService`.

- Modify: `faith-web-remix/app/services/api.ts` — add `hinduPujaTimesAPI` (mirror `prayerAPI` pattern: `getTimes`, `getCurrent`, `logSandhya`, `getLogs`, `getStats`, `deleteLog`)

- Replace: `faith-web-remix/app/routes/hindu.puja-times.tsx`

Page layout (mirror `routes/prayers.tsx` adapted for 3 sandhyas):
1. Hero — burgundy gradient, title "Sandhya Times", today's date + Tithi
2. Today's 3 Sandhya cards (Pratah/Madhyahna/Sayam) with start/end times, current/upcoming highlight
3. Big countdown to next sandhya
4. Log button on each sandhya card (only if user is authenticated)
5. Stats card (total sandhyas logged, current streak, longest streak) for authenticated users

Remove `noindex` from meta.

**Verify:** `/hindu/puja-times` renders today's 3 sandhyas with countdown. Logged-in users can log a sandhya and see stats update.

**Commit:** `feat(puja-times): wire module + build /hindu/puja-times page`

---

## Module 4 — Japa (Bundle L)

Mirrors Islam's `dhikr` module almost identically. Schemas already created in Phase 0 (Phase 0 Task 12 added `JapaCounter`, `JapaGoal`, `JapaHistory` tables).

### Bundle L — Japa counter/goal/history + dictionary + frontend

**Task L1: JapaCounter service + DTOs**

- Create: `unified-faith-service/src/faiths/hindu/japa/dto/`:
  - `create-japa-counter.dto.ts`, `update-japa-counter.dto.ts`
  - `create-japa-goal.dto.ts`
- Create: `unified-faith-service/src/faiths/hindu/japa/services/japa-counter.service.ts`

Mirror `DhikrCounterService` exactly. Methods:
```ts
listCounters(userId: string)
createCounter(userId: string, dto: CreateJapaCounterDto)
updateCounterCount(userId: string, id: string, count: number)
deleteCounter(userId: string, id: string)
```

Reference: read `unified-faith-service/src/faiths/islam/dhikr/services/dhikr.service.ts` and adapt.

**Commit:** `feat(japa): add JapaCounter service + DTOs`

---

**Task L2: JapaGoal + JapaHistory services**

- Create: `unified-faith-service/src/faiths/hindu/japa/services/japa-goal.service.ts`
- Create: `unified-faith-service/src/faiths/hindu/japa/services/japa-history.service.ts`

Mirror their dhikr equivalents:
- Goals: create, list, compute progress (`currentCount`, `progressPercent`, `daysRemaining`, `isComplete`)
- History: list, stats (`totalCount`, `dailyAverage`, `currentStreak`, `longestStreak`, `mostRecitedPhrase`)

**Commit:** `feat(japa): add JapaGoal and JapaHistory services with progress + stats`

---

**Task L3: MantraDictionary (in-memory)**

- Create: `unified-faith-service/src/faiths/hindu/japa/services/mantra-dictionary.service.ts`

In-memory list of common mantras (mirror dhikr's `DhikrDictionaryService`):
```ts
{
  sanskrit: 'ॐ नमः शिवाय',
  transliteration: 'Om Namah Shivaya',
  english: 'Salutations to Shiva',
  category: 'mahamantra',
  deityKey: 'shiva'
}
```

Seed ~20 mantras: Gayatri, Maha Mrityunjaya, Om Namah Shivaya, Hare Krishna, Om Mani Padme Hum, Om Namo Narayanaya, Om Shri Ganeshaya Namah, Om Hanumate Namaha, Om Aim Saraswati Namaha, Om Shri Krishnaya Namah, Sarvesham Svastir Bhavatu, Asato Ma Sat Gamaya, Om Shanti Shanti Shanti, Lokah Samastah Sukhino Bhavantu, Tryambakam Yajamahe, Vakratunda Mahakaya, Sarva Mangala Mangalye, Om Tat Sat, Om Bhur Bhuvah Svah, Om Tat Sat (variant).

**Commit:** `feat(japa): add MantraDictionary service with 20 common mantras`

---

**Task L4: JapaController + endpoints**

- Create: `unified-faith-service/src/faiths/hindu/japa/controllers/japa.controller.ts`

Endpoints (mirror `DhikrController`):
```
GET    /api/v1/hindu/japa/counters       (auth)
POST   /api/v1/hindu/japa/counters       (auth)
PATCH  /api/v1/hindu/japa/counters/:id   (auth)
DELETE /api/v1/hindu/japa/counters/:id   (auth)

POST   /api/v1/hindu/japa/goals          (auth)
GET    /api/v1/hindu/japa/goals          (auth)

GET    /api/v1/hindu/japa/stats          (auth)
GET    /api/v1/hindu/japa/history        (auth)
GET    /api/v1/hindu/japa/mantras        (public)
```

**Commit:** `feat(japa): add JapaController with 9 endpoints`

---

**Task L5: Wire JapaModule + frontend**

- Modify: `unified-faith-service/src/faiths/hindu/japa/japa.module.ts` — register controller + 4 services
- Modify: `faith-web-remix/app/services/api.ts` — add `hinduJapaAPI` (mirror `dhikrAPI`)
- Replace: `faith-web-remix/app/routes/hindu.japa.tsx`

Page (mirror `routes/dhikr.tsx`):
- Hero — burgundy
- Counter list with mala-style increment buttons (+1, +5, +27, +108)
- Devanagari display for current mantra
- Goal progress bars
- Stats card (total japa, daily average, streak)
- Mantra dictionary picker for new counter creation

Remove `noindex` from meta.

**Verify:** `/hindu/japa` allows authenticated users to create a counter, increment, see streak.

**Commit:** `feat(japa): wire module + build /hindu/japa page mirroring dhikr UX`

---

## Bundle M — Phase 1 smoke test

**Task M1: End-to-end Phase 1 verification**

Manual checklist:

- [ ] **Backend boots cleanly** — `npm run start:dev`, all 9 Hindu submodules + new providers (PanchangService, FestivalRuleService, SunPositionService, AuspiciousTimesService, PujaTimesService, PujaLogService, JapaCounterService, JapaGoalService, JapaHistoryService, MantraDictionaryService) initialize.
- [ ] **Panchang regression** — `curl /api/v1/hindu/panchang/today?lat=28.6&lng=77.2&timezone=Asia/Kolkata` returns valid response with all 5 angas + festivals + auspicious times.
- [ ] **Festivals data** — `curl /api/v1/hindu/panchang/festivals/upcoming?days=180` returns ≥10 festivals (varies by season).
- [ ] **Puja-times** — `curl /api/v1/hindu/puja-times/today?lat=28.6&lng=77.2&timezone=Asia/Kolkata` returns 3 sandhyas with realistic times.
- [ ] **Mantras dictionary** — `curl /api/v1/hindu/japa/mantras` returns 20 mantras.
- [ ] **Auth flow** — register → login → POST `/api/v1/hindu/japa/counters` (with body) → succeeds, returns counter object.
- [ ] **Islam regression** — `curl /api/v1/islam/calendar/today` still returns valid Islam data.
- [ ] **Frontend `/hindu/panchang`** — renders today's Panchang with Devanagari + festivals + countdown.
- [ ] **Frontend `/hindu/puja-times`** — renders 3 sandhyas with countdown to next.
- [ ] **Frontend `/hindu/japa`** — counter creation, increment, stats all work.
- [ ] **Hindu home `/hindu`** — still shows the Phase-0 placeholder; gets fully assembled in Phase 4 (Hindu home page is a Phase 4 task per design).

If everything passes:

```bash
git push -u origin feat/hindu-phase-1   # both repos
```

Open PRs against `main`.

---

## Phase 1 commit checklist (success criteria)

By the end of Phase 1 you should have ~20 commits across two repos:

**Backend:**
- `feat(panchang): adopt <library> for Hindu calendar calculations`
- `feat(panchang): add response DTOs for 5 angas + auspicious times`
- `feat(panchang): add PanchangService skeleton + Sanskrit name lookup tables`
- `feat(panchang): add sun-position service for sunrise/sunset/moonrise/moonset`
- `feat(panchang): compute 5 angas (Tithi, Nakshatra, Yoga, Karana, Vaara)`
- `feat(panchang): compute auspicious time bands (Rahu Kaal, Brahma Muhurta, etc.)`
- `feat(panchang): add controller with /today, /date, /month, /auspicious endpoints`
- `feat(panchang): wire PanchangModule with controllers and providers`
- `feat(panchang): festival rule resolver service for tithi/nakshatra/solar/fixed rules`
- `feat(panchang): add festival listing and upcoming-festival endpoints`
- `feat(panchang): seed 30 major Hindu festivals with rule specs`
- `feat(panchang): include festivals on date in /today and /date endpoints`
- `feat(puja-times): compute 3 daily Sandhya times based on sun position`
- `feat(puja-times): add log + stats endpoints (auth-gated)`
- `feat(puja-times): wire module + build /hindu/puja-times page` (also touches frontend)
- `feat(japa): add JapaCounter service + DTOs`
- `feat(japa): add JapaGoal and JapaHistory services with progress + stats`
- `feat(japa): add MantraDictionary service with 20 common mantras`
- `feat(japa): add JapaController with 9 endpoints`
- `feat(japa): wire module + build /hindu/japa page mirroring dhikr UX` (also touches frontend)

**Frontend:**
- `feat(api): add hinduPanchangAPI client`
- `feat(hindu): build Panchang page with 5 angas + auspicious times`
- `feat(hindu): render festivals on Panchang page + upcoming-festivals card`

**Functional outcomes:**
- ✅ `/hindu/panchang` shows real Panchang for user's location
- ✅ `/hindu/puja-times` shows 3 sandhyas with countdown
- ✅ `/hindu/japa` lets authenticated users count mantras with goals + streaks
- ✅ Festival list returns 30 rules; upcoming-festivals resolves dates correctly
- ✅ Islam endpoints unaffected
- ✅ ~85 hours of net new code, ~30 atomic commits

When all of the above hold, Phase 1 is done — invoke writing-plans again with this design + Phase 2 outline to start Phase 2 (Scriptures backbone).

---

## Open decisions (resolved during execution)

1. **Panchang library** — locked policy: try C (existing JS package) first in Bundle G Task G1; fall back to B (`astronomia` + custom Tithi/Nakshatra calc) only if no qualifying package exists. Skip A (`swisseph` commercial).
2. **Pre-existing prisma migrate dev bug** — recommend a separate fix PR for the legacy `add_bilingual_dhikr_support` migration before Phase 1 starts. Otherwise: continue using the `prisma migrate diff` workaround Phase 0 used.
3. **Festival timing for sect variants** — Janmashtami has Smarta vs Vaishnava timing; default to most-common in v1; surface alternatives in v2. Not blocking Phase 1 launch.
