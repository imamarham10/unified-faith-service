# Seed Data Documentation

## Overview

This document provides instructions for seeding the Islamic features database with initial data.

## Included Seed Data

### 1. 99 Names of Allah (Asma ul Husna)
- Complete list of all 99 names
- Arabic names, transliterations, English translations
- Meanings and descriptions for each name

**Sample entries**: 30 names included (can be expanded to all 99)

### 2. Prayer Calculation Methods
- Muslim World League (MWL)
- Islamic Society of North America (ISNA)
- Egyptian General Authority of Survey
- Umm Al-Qura University, Makkah
- University of Islamic Sciences, Karachi

Each method includes Fajr and Isha angle parameters.

### 3. Islamic Events
- Major events: Ramadan, Eid al-Fitr, Eid al-Adha, Day of Arafah, Laylat al-Qadr
- Moderate events: Islamic New Year, Ashura, Mawlid, Isra and Mi'raj
- Minor events: Mid-Sha'ban

Total: 10 important Islamic calendar events

### 4. Dua Collections
- **Categories**: 7 categories (Morning, Evening, Before Sleep, Food & Drink, Travel, Entering Mosque, General)
- **Sample Duas**: 6 commonly used duas with Arabic text, transliteration, English translation, and references

## Running the Seed Script

### Prerequisites
- Database must be accessible
- Prisma migrations must be applied first

### Steps

1. **Apply migrations** (when database is accessible):
```bash
npx prisma migrate dev --name add_islamic_features
```

2. **Run the seed script**:
```bash
npx ts-node prisma/seed-islamic-features.ts
```

Or add to package.json:
```json
{
  "prisma": {
    "seed": "ts-node prisma/seed-islamic-features.ts"
  }
}
```

Then run:
```bash
npx prisma db seed
```

## Expanding the Data

### Complete 99 Names of Allah
The current seed includes 30 names as examples. To add all 99 names, expand the `allahNames` array in `seed-islamic-features.ts` with the remaining 69 names following the same structure:

```typescript
{
  id: number,
  nameArabic: string,
  nameTranslit: string,
  nameEnglish: string,
  meaning: string
}
```

### Adding More Duas
To add more duas, follow this pattern:

```typescript
{
  categoryId: string, // UUID of category
  titleArabic: string,
  titleEnglish: string,
  textArabic: string,
  textTranslit: string (optional),
  textEnglish: string,
  reference: string (optional),
  audioUrl: string (optional)
}
```

### Adding Quran Text
For Quran text, you'll need:
- All 114 surahs metadata
- All 6,236 verses in Arabic
- Translations (English, Urdu, etc.)

This data is typically large and should be sourced from:
- [Quran.com API](https://quran.api-docs.io/)
- [Tanzil Project](http://tanzil.net/)
- [Al-Quran Cloud](https://alquran.cloud/api)

## Data Sources

### Recommended APIs for Additional Data
1. **Prayer Times**: [Aladhan API](https://aladhan.com/prayer-times-api)
2. **Quran**: [Quran.com API](https://quran.api-docs.io/), [Al-Quran Cloud](https://alquran.cloud/api)
3. **Hadith**: [Hadith API](https://hadithapi.com/)
4. **Islamic Calendar**: [Islamic Finder API](https://www.islamicfinder.org/api)

## Notes

- The seed script uses `upsert` for idempotency (safe to run multiple times)
- All data includes proper Arabic text encoding (UTF-8)
- References to authentic Islamic sources are included where applicable
- Data can be customized based on regional preferences and scholarly opinions
