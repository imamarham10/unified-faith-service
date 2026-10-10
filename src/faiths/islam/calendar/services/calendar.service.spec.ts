import { Test } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { PrismaService } from '../../../../common/utils/prisma.service';
import { CalendarService } from './calendar.service';

/**
 * Unit specs for the two month calendars (`GET /islam/calendar/gregorian-month`
 * and `/hijri-month`).
 *
 * No database and no Redis: `DATABASE_URL` points at a shared RDS instance
 * holding live user data and `PrismaService`'s constructor opens a real
 * `pg.Pool` against it, so the real provider is never instantiated. The
 * doubles below are in-memory and count their calls, because what these specs
 * are about is **how many network round trips a month costs**, not how long it
 * takes — a timing assertion on a double measures the double.
 *
 * ## What was wrong
 *
 * Both endpoints built a month by calling the per-date method in a loop.
 * `gregorianToHijri` is a cache get, an `islamic_events` query and a cache set;
 * `hijriToGregorian` is an `islamic_events` query. So a 31-day Gregorian month
 * was ~93 sequential network calls (21s measured in production on a cold key)
 * and a 30-day Hijri month was 30 (6.8s, every single call — it has no cache).
 * The conversion arithmetic underneath is ~0.01ms per day; all of it was round
 * trips.
 *
 * The Gregorian one was *also* cached for a day, which made it look fast in
 * aggregate while still being a 21-second function on every cold key, every
 * TTL expiry and every unseen timezone. These specs assert the function is
 * cheap, which is the thing the cache cannot do.
 */

type Row = Record<string, any>;

function matchesClause(actual: unknown, expected: unknown): boolean {
  if (expected === null) return actual === null || actual === undefined;
  if (expected && typeof expected === 'object') {
    // Nothing in this service filters with an operator object. Falling through
    // to `true` would make a spec that asserts a filter narrows something pass
    // against code that never applies it, so an unrecognised shape throws —
    // as `rollup-cron.service.spec.ts` and `prayers.service.spec.ts` do.
    throw new Error(
      `prisma double: unimplemented operator(s) ${Object.keys(expected as Row).join(', ')}`,
    );
  }
  return actual === expected;
}

const matches = (row: Row, where: Row = {}) =>
  Object.entries(where).every(([field, expected]) => matchesClause(row[field], expected));

/** Ramadan 1 and Eid al-Fitr, plus a second event sharing Ramadan 1's date. */
const EVENTS: Row[] = [
  {
    id: 'e1',
    name: 'Ramadan Begins',
    nameArabic: 'رَمَضَان',
    description: 'The first day of the month of fasting',
    hijriMonth: 9,
    hijriDay: 1,
    importance: 'major',
  },
  {
    id: 'e2',
    name: 'Night of Decree watch begins',
    nameArabic: null,
    description: null,
    hijriMonth: 9,
    hijriDay: 1,
    importance: 'minor',
  },
  {
    id: 'e3',
    name: 'Eid al-Fitr',
    nameArabic: 'عِيد ٱلْفِطْر',
    description: 'The festival of breaking the fast',
    hijriMonth: 10,
    hijriDay: 1,
    importance: 'major',
  },
];

function createDoubles() {
  const islamicEvents = [...EVENTS];
  const store = new Map<string, unknown>();

  const prisma = {
    islamicEvent: {
      findMany: jest.fn(async ({ where, select }: Row = {}) =>
        islamicEvents
          .filter((r) => matches(r, where))
          .map((row) =>
            select
              ? Object.fromEntries(Object.keys(select).map((k) => [k, row[k]]))
              : { ...row },
          ),
      ),
    },
  };

  const cacheManager = {
    get: jest.fn(async (key: string) => store.get(key)),
    set: jest.fn(async (key: string, value: unknown) => {
      store.set(key, value);
    }),
  };

  /** Every call that would leave the process: Postgres and Redis alike. */
  const roundTrips = () =>
    prisma.islamicEvent.findMany.mock.calls.length +
    cacheManager.get.mock.calls.length +
    cacheManager.set.mock.calls.length;

  const reset = () => {
    prisma.islamicEvent.findMany.mockClear();
    cacheManager.get.mockClear();
    cacheManager.set.mockClear();
  };

  return { prisma, cacheManager, store, roundTrips, reset };
}

describe('CalendarService month calendars', () => {
  let service: CalendarService;
  let doubles: ReturnType<typeof createDoubles>;

  beforeEach(async () => {
    doubles = createDoubles();
    const moduleRef = await Test.createTestingModule({
      providers: [
        CalendarService,
        { provide: PrismaService, useValue: doubles.prisma },
        { provide: CACHE_MANAGER, useValue: doubles.cacheManager },
      ],
    }).compile();
    service = moduleRef.get(CalendarService);
  });

  // ======================================================== the round trips

  describe('round trips', () => {
    it('builds a Gregorian month from a single events read, not one per day', async () => {
      // 31 days. The old loop: 31 cache gets + 31 event queries + 31 cache
      // sets, plus the month's own get and set. This asserts the shape that
      // replaced it — the month cache get, one events read (itself one cache
      // get, since `getAllEvents` is week-cached, plus one query on the miss),
      // and the month cache set.
      const result = await service.getGregorianMonthCalendar(2026, 10, 'Asia/Kolkata');

      expect(result.days).toHaveLength(31);
      expect(doubles.prisma.islamicEvent.findMany).toHaveBeenCalledTimes(1);
      expect(doubles.roundTrips()).toBeLessThanOrEqual(5);
    });

    it('builds a Hijri month from a single events read, not one per day', async () => {
      // This is the endpoint with no cache at all, so every call paid the full
      // 29-or-30 queries. One now, whatever the month's length.
      const result = await service.getHijriMonthCalendar(1448, 9, 'Asia/Kolkata');

      expect(result.days.length).toBeGreaterThanOrEqual(29);
      expect(doubles.prisma.islamicEvent.findMany).toHaveBeenCalledTimes(1);
      expect(doubles.roundTrips()).toBeLessThanOrEqual(3);
    });

    it('costs the same for a 29-day month as for a 31-day one', async () => {
      // The property, stated directly: the cost does not scale with the month.
      await service.getHijriMonthCalendar(1448, 9, 'UTC');
      const shortMonth = doubles.roundTrips();

      doubles.reset();
      await service.getGregorianMonthCalendar(2026, 1, 'UTC');
      const longMonth = doubles.roundTrips();

      // The Gregorian one carries two extra calls for its own month cache.
      expect(longMonth - shortMonth).toBeLessThanOrEqual(2);
    });

    it('does not reach for the database again on a cached events read', async () => {
      // `getAllEvents` is week-cached, so the second month in a request —
      // or the second request inside the TTL — is zero queries.
      await service.getHijriMonthCalendar(1448, 9, 'UTC');
      doubles.reset();
      await service.getHijriMonthCalendar(1448, 10, 'UTC');

      expect(doubles.prisma.islamicEvent.findMany).not.toHaveBeenCalled();
    });
  });

  // ========================================================= what it returns

  describe('the response is unchanged', () => {
    it('attaches every event on a day, projected to the per-date shape', async () => {
      // `getAllEvents()` returns whole rows while the single-date path selects
      // four columns. Without the projection the month response would grow
      // `id`, `hijriMonth` and `hijriDay` that it never had.
      const month = await service.getHijriMonthCalendar(1448, 9, 'UTC');
      const first = month.days[0];

      expect(first.hijriDay).toBe(1);
      expect(first.events).toEqual([
        {
          name: 'Ramadan Begins',
          nameArabic: 'رَمَضَان',
          description: 'The first day of the month of fasting',
          importance: 'major',
        },
        {
          name: 'Night of Decree watch begins',
          nameArabic: null,
          description: null,
          importance: 'minor',
        },
      ]);
      expect(month.days[1].events).toEqual([]);
    });

    it('agrees with the per-date endpoint, day for day', async () => {
      // The month builders no longer call the per-date methods, so "they agree"
      // stopped being true by construction and has to be asserted. A drift
      // here is what would put a different Hijri date on the grid than on the
      // card for the same day.
      const month = await service.getGregorianMonthCalendar(2026, 10, 'Asia/Kolkata');

      for (const day of [1, 15, 31]) {
        const perDate = await service.gregorianToHijri(
          new Date(Date.UTC(2026, 9, day)),
          'Asia/Kolkata',
        );
        expect(month.days[day - 1]).toEqual(perDate);
      }
    });

    it('agrees with the per-date endpoint on the Hijri side too', async () => {
      const month = await service.getHijriMonthCalendar(1448, 9, 'Asia/Kolkata');

      for (const day of [1, 2, 29]) {
        const perDate = await service.hijriToGregorian(1448, 9, day, 'Asia/Kolkata');
        expect(month.days[day - 1]).toEqual(perDate);
      }
    });

    it('honours calendarAdjust, which shifts the whole grid by a day', async () => {
      // India/Pakistan/Bangladesh start Ramadan a day after the Gulf, and the
      // grid has to move with them. If the index lookup were keyed off the
      // unadjusted date this would come back identical.
      const gulf = await service.getHijriMonthCalendar(1448, 9, 'UTC', 0);
      const india = await service.getHijriMonthCalendar(1448, 9, 'UTC', 1);

      expect(india.days[0].gregorianDate).not.toBe(gulf.days[0].gregorianDate);
      expect(india.days[0].hijriDay).toBe(gulf.days[0].hijriDay);
      // The events follow the Hijri day, not the Gregorian one.
      expect(india.days[0].events).toEqual(gulf.days[0].events);
    });
  });
});
