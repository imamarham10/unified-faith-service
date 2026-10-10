import { Test } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { PrismaService } from '../../../../common/utils/prisma.service';
import { QuranService } from './quran.service';

/**
 * `?script=` resolution for `GET /surah/:id` and `GET /surah/:id/premium`.
 *
 * ## The bug this pins
 *
 * `resolveArabicText` used to read:
 *
 * ```ts
 * if (script === 'uthmani' || script === 'indopak') {
 *   return verse.textUthmani || verse.textArabic;
 * }
 * ```
 *
 * — `indopak` was a literal alias for `uthmani`. Verified against production
 * on 2026-10-10: `GET /surah/2?script=uthmani` and `?script=indopak` returned
 * **byte-identical** text, alef-wasla and all. The mobile app defaults its
 * Arabic-script preference to Indo-Pak and India is this app's primary
 * market, so the default setting named one script and served another.
 *
 * It is a one-line bug with no symptom an automated check would have caught —
 * both responses are 200, both are Arabic, both render. So it gets a test.
 *
 * ## No database
 *
 * Same constraint as the juz specs: `DATABASE_URL` points at a shared RDS
 * instance holding live user data and `PrismaService`'s constructor opens a
 * real `pg.Pool` against it, so the real provider is never instantiated.
 */

/** One row, with all three script columns distinguishable. */
const ROW = {
  id: 'verse-2-142',
  surahId: 2,
  verseNumber: 142,
  textArabic: 'ARABIC',
  textSimple: 'SIMPLE',
  textUthmani: 'UTHMANI',
  textIndopak: 'INDOPAK',
  translations: [],
};

async function makeService(row: Record<string, any> = ROW) {
  const prisma = {
    quranSurah: {
      findUnique: jest.fn(async () => ({
        id: 2,
        nameTransliteration: 'Al-Baqarah',
        verses: [row],
      })),
    },
  };
  const cache = { get: jest.fn(async () => undefined), set: jest.fn() };

  const moduleRef = await Test.createTestingModule({
    providers: [
      QuranService,
      { provide: PrismaService, useValue: prisma },
      { provide: CACHE_MANAGER, useValue: cache },
    ],
  }).compile();

  return moduleRef.get(QuranService);
}

async function arabicFor(script: any, row?: Record<string, any>) {
  const service = await makeService(row);
  const surah: any = await service.getSurah(2, 'en', script);
  return surah.verses[0].textArabic;
}

describe('?script= selects a different encoding, not a different font', () => {
  it('indopak serves the IndoPak column', async () => {
    expect(await arabicFor('indopak')).toBe('INDOPAK');
  });

  it('uthmani serves the Uthmani column', async () => {
    expect(await arabicFor('uthmani')).toBe('UTHMANI');
  });

  it('simple serves the base Arabic', async () => {
    expect(await arabicFor('simple')).toBe('ARABIC');
  });

  /**
   * The regression assertion. If these two are ever equal again for a row
   * whose columns differ, the alias is back.
   */
  it('indopak and uthmani are not the same text', async () => {
    expect(await arabicFor('indopak')).not.toBe(await arabicFor('uthmani'));
  });
});

describe('null-safety — the column is nullable', () => {
  it('indopak falls back to Uthmani when text_indopak is null', async () => {
    expect(await arabicFor('indopak', { ...ROW, textIndopak: null })).toBe(
      'UTHMANI',
    );
  });

  it('indopak falls back to base Arabic when both are null', async () => {
    expect(
      await arabicFor('indopak', {
        ...ROW,
        textIndopak: null,
        textUthmani: null,
      }),
    ).toBe('ARABIC');
  });

  it('uthmani falls back to base Arabic when text_uthmani is null', async () => {
    expect(await arabicFor('uthmani', { ...ROW, textUthmani: null })).toBe(
      'ARABIC',
    );
  });
});

describe('response shape — additive only', () => {
  it('exposes textIndopak and still strips textUthmani and textSimple', async () => {
    const service = await makeService();
    const surah: any = await service.getSurah(2, 'en', 'simple');
    const verse = surah.verses[0];

    // New field, present regardless of which script was asked for.
    expect(verse.textIndopak).toBe('INDOPAK');

    // Unchanged from before: these were stripped and stay stripped, so no
    // existing client sees a different payload shape.
    expect(verse).not.toHaveProperty('textUthmani');
    expect(verse).not.toHaveProperty('textSimple');

    // And nothing else moved.
    expect(verse.id).toBe('verse-2-142');
    expect(verse.verseNumber).toBe(142);
    expect(verse.textArabic).toBe('ARABIC');
  });

  it('textIndopak is null, not undefined, when the column is null', async () => {
    const service = await makeService({ ...ROW, textIndopak: null });
    const surah: any = await service.getSurah(2, 'en', 'indopak');
    expect(surah.verses[0].textIndopak).toBeNull();
  });
});
