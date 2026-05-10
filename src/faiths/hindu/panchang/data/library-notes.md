# Panchang Library

**Package:** `panchang-ts`
**Version:** 4.0.0 (exact pin)
**License:** MIT
**Locked:** 2026-05-10 (after `@bidyashish/panchang` was rejected for swisseph dep)

## Why this library
- Pure JS, no native compilation (works on Node 22 / Python 3.12)
- MIT licensed (compatible with closed-source SaaS)
- Single dependency: `astronomy-engine` (MIT, by Don Cross)
- TypeScript-native, types built in
- Covers the 5 angas (Tithi, Nakshatra, Yoga, Karana, Vara) plus a large surface
  area of additional Hindu-calendar primitives (Choghadiya, Hora, Gowri Panchangam,
  Brahma Muhurta, Rahu Kalam, Gulika Kalam, Yamaganda, Abhijit Muhurta,
  moonrise/moonset, festivals, eclipses, samvat, masa, chandramasa, varjyam, etc.)

## API used (confirmed via smoke-test on 2026-05-10)

The package exposes ~100+ named functions. The two we care about for Bundle G/H:

### `getDailyPanchang(date: Date, location: { latitude: number; longitude: number }, timezone: string)`

Returns a comprehensive daily panchang object spanning sunrise → next sunrise.

Top-level response keys (verified):
- `date`, `location` (`{ latitude, longitude }`), `timezone` (NOTE: returned as
  **minutes offset**, e.g. `330` for IST — the input is the IANA tz string)
- `sunrise`, `sunset`, `nextSunrise`, `dayDurationMinutes`, `nightDurationMinutes`
- `tithis: TithiSpan[]` — array of tithi spans active during the day-window
  (usually 1–2 entries). Each entry has:
  `{ index, name, paksha: 'Krishna' | 'Shukla', number, completionPercentage, startTime, endTime, isActiveAtSunrise }`
- `nakshatras: NakshatraSpan[]` — same shape, with `pada`, `degreesInNakshatra`
- `yogas: YogaSpan[]`
- `karanas: KaranaSpan[]` — `type: 'movable' | 'fixed'` (movable = auspicious)
- `vara: { index, name, shortName, englishName }` — index 0 = Sunday (Raviwara)
- `rahuKalam`, `gulikaKalam`, `yamaganda`, `abhijitMuhurta`, `brahmaMuhurta` — `{ start, end }`
- `moonrise`, `moonset` — ISO strings (may be null if moon doesn't rise/set in window)
- `choghadiya`, `gowriPanchangam`, `hora`, `doGhatiMuhurta` — `{ day: TimeBand[], night: TimeBand[] }`
- `chandramasa`, `chandraRashi`, `suryaNakshatra`, `masa`, `samvat`,
  `ayanamsa`, `siderealSunAtSunrise`, `siderealMoonAtSunrise`
  - **`masa`** is the **SOLAR** masa (`{ index: 0..11, name: 'Mesha'..'Meena' }`).
    Useful for Sankranti detection but NOT for tithi-based festivals.
  - **`chandramasa`** is the **LUNAR** masa (the one we want for tithi-based
    festival rules). Shape:
    ```ts
    {
      index: number;          // 0..11 in active system
      name: string;           // active-system month name
      isAdhika: boolean;      // intercalary (skip these for festival match)
      system: 'purnimanta' | 'amanta';
      amantaIndex: number;
      amantaName: string;     // e.g. 'Vaishakha'
      purnimantaIndex: number;
      purnimantaName: string; // e.g. 'Jyeshtha'
    }
    ```
    Bundle J's `FestivalRuleService` pins to `chandramasa.purnimantaName`
    because (a) panchang-ts's default `masaSystem` is purnimanta and
    (b) the v1 festival seed authors rules in purnimanta convention
    (e.g. Holi = Chaitra Krishna 1; Janmashtami = Bhadrapada Krishna 8).
- `panchaka`, `panchakaRahita`, `bhadra`, `varjyam`, `gandaMula`,
  `anandadiYoga`, `specialYogas`
- `vijayaMuhurta`, `godhuliMuhurta`, `nishitaMuhurta`, `amritKala`,
  `madhyahna`, `pratahSandhya`, `sayahnaSandhya`, `durMuhurta[]`
- `festivals: Festival[]`
- `eclipse`

### `getInstantPanchang(date: Date, location: { latitude, longitude, timezone })`

Returns the panchang state at a single instant (single tithi, single nakshatra,
etc.). Lighter response; useful for "what's the panchang RIGHT NOW" queries.

## Quirks/gotchas
- Tithi `name` already concatenates paksha + tithi-number (e.g. "Krishna Ashtami").
  The response also has separate `paksha` ("Krishna" / "Shukla", capitalized) and
  `number` (1–15) fields — use those for our DTO instead of parsing the name.
- Tithi `index` runs 0–29 across the full lunar cycle (15 Shukla + 15 Krishna).
- Karana `index` runs 0–59 across the lunar cycle (60 half-tithis); `type` field
  distinguishes movable (auspicious) vs fixed (inauspicious — Shakuni/Naga/etc).
- Vara `index` 0–6 starts at Sunday (matches JS `Date.getDay()`).
- For `getDailyPanchang`, the third arg is the IANA timezone string (e.g.
  `"Asia/Kolkata"`) but the response echoes it back as minutes offset (e.g. `330`).
- Sanskrit/Devanagari names are NOT in the response — we provide our own lookup
  tables in `sanskrit-names.ts` indexed by `number`.
- Smoke-test for New Delhi on 2026-05-10 returned plausible values (sunrise
  ~05:33 UTC = ~11:03 IST ✅, Krishna Ashtami → Navami transition at 15:07 UTC, etc).

## Risk
- Heavy version churn (4.0.0 in 6 weeks — be careful with upgrades).
- Pinned to exact version (no caret) in package.json.
- Re-run smoke-test before any version bump.

## Fallback
- Plan B (`astronomia` + custom Tithi calc) is documented in
  `docs/plans/2026-05-10-hinduism-phase-1.md` Bundle G Task G1.
