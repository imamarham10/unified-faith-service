import { Test } from '@nestjs/testing';
import { PrismaService } from '../../../../common/utils/prisma.service';
import { PanchangService } from './panchang.service';
import { FestivalRuleService } from './festival-rule.service';

/**
 * Unit specs for the panchang month (`GET /hindu/panchang/month`).
 *
 * No database: `DATABASE_URL` points at a shared RDS instance holding live
 * user data and `PrismaService`'s constructor opens a real `pg.Pool` against
 * it, so the real provider is never instantiated. `getDailyPanchang` is the
 * genuine library — it is pure computation with no network, and doubling it
 * would make the "computed once, not twice" assertions meaningless.
 *
 * ## What was wrong
 *
 * The month loop lived in `PanchangController.getMonth` and called
 * `getPanchang` per day. Each of those read the whole `hindu_festivals` table
 * **and** computed `getDailyPanchang` twice — once for the response's angas
 * and once more inside `findFestivalsForDate`. So a 31-day month was 31
 * full-table reads and 62 astronomical computations (~7.7ms each, measured).
 *
 * These specs count calls rather than time, because a timing assertion on a
 * double measures the double. The round trips are counted on the Prisma
 * double; the computations are counted by watching how often the library is
 * asked, via the festival matcher that receives each one.
 */

type Row = Record<string, any>;

function matchesClause(actual: unknown, expected: unknown): boolean {
  if (expected === null) return actual === null || actual === undefined;
  if (expected && typeof expected === 'object') {
    // Nothing here filters with an operator object; an unrecognised shape must
    // throw rather than fall through to `true`, which would let a spec that
    // asserts a filter narrows something pass against code that never applies
    // it. `rollup-cron.service.spec.ts` throws for the same reason.
    throw new Error(
      `prisma double: unimplemented operator(s) ${Object.keys(expected as Row).join(', ')}`,
    );
  }
  return actual === expected;
}

const matches = (row: Row, where: Row = {}) =>
  Object.entries(where).every(([field, expected]) => matchesClause(row[field], expected));

/**
 * Two real-shaped rules. Krishna Janmashtami is Bhadrapada Krishna 8; Diwali's
 * Lakshmi Puja is the Kartika new moon, which exercises the tithi-30 sentinel.
 */
const FESTIVALS: Row[] = [
  {
    id: 'f1',
    slug: 'krishna-janmashtami',
    nameEnglish: 'Krishna Janmashtami',
    nameSanskrit: 'कृष्ण जन्माष्टमी',
    ruleSpec: { type: 'tithi', month: 'bhadrapada', paksha: 'krishna', tithi: 8 },
  },
  {
    id: 'f2',
    slug: 'diwali',
    nameEnglish: 'Diwali',
    nameSanskrit: null,
    ruleSpec: { type: 'tithi', month: 'kartika', paksha: 'krishna', tithi: 30 },
  },
];

const BENGALURU = { lat: 12.97, lng: 77.59, timezone: 'Asia/Kolkata' };

function createPrismaDouble() {
  const hinduFestivals = [...FESTIVALS];
  return {
    hinduFestivals,
    hinduFestival: {
      findMany: jest.fn(async ({ where }: Row = {}) =>
        hinduFestivals.filter((r) => matches(r, where)).map((r) => ({ ...r })),
      ),
    },
  };
}

describe('PanchangService', () => {
  let service: PanchangService;
  let rules: FestivalRuleService;
  let prisma: ReturnType<typeof createPrismaDouble>;
  /** Every panchang the matcher is handed — one per `getDailyPanchang` result. */
  let matchSpy: jest.SpyInstance;

  beforeEach(async () => {
    prisma = createPrismaDouble();
    const moduleRef = await Test.createTestingModule({
      providers: [
        PanchangService,
        FestivalRuleService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(PanchangService);
    rules = moduleRef.get(FestivalRuleService);
    matchSpy = jest.spyOn(rules, 'matchFestivals');
  });

  describe('round trips and computations', () => {
    it('reads the festival rules once for a whole month, not once per day', async () => {
      const month = await service.getPanchangMonth(2026, 10, BENGALURU.lat, BENGALURU.lng, BENGALURU.timezone);

      expect(month.days).toHaveLength(31);
      expect(prisma.hinduFestival.findMany).toHaveBeenCalledTimes(1);
    });

    it('computes the panchang once per day, not twice', async () => {
      // The matcher is handed the same object the response was built from, so
      // one call per day is the proof that nothing recomputed it. Two calls a
      // day — or one call plus a second computation out of sight — is the old
      // shape, which doubled ~7.7ms of astronomy for every day on the grid.
      await service.getPanchangMonth(2026, 10, BENGALURU.lat, BENGALURU.lng, BENGALURU.timezone);

      expect(matchSpy).toHaveBeenCalledTimes(31);
      for (const [festivals] of matchSpy.mock.calls) {
        // And every day matched against the same loaded rules.
        expect(festivals).toHaveLength(FESTIVALS.length);
      }
    });

    it('costs one read for a single date too', async () => {
      // `getPanchang` used to be two computations and one read; it is one of
      // each. The read is still there — the rules have to come from somewhere.
      await service.getPanchang(new Date(Date.UTC(2026, 9, 8)), BENGALURU.lat, BENGALURU.lng, BENGALURU.timezone);

      expect(prisma.hinduFestival.findMany).toHaveBeenCalledTimes(1);
      expect(matchSpy).toHaveBeenCalledTimes(1);
    });

    it('does not grow its read count with the length of the month', async () => {
      await service.getPanchangMonth(2026, 2, BENGALURU.lat, BENGALURU.lng, BENGALURU.timezone);
      const februaryReads = prisma.hinduFestival.findMany.mock.calls.length;

      prisma.hinduFestival.findMany.mockClear();
      await service.getPanchangMonth(2026, 1, BENGALURU.lat, BENGALURU.lng, BENGALURU.timezone);

      expect(prisma.hinduFestival.findMany.mock.calls.length).toBe(februaryReads);
    });
  });

  describe('the response is unchanged', () => {
    it('gives the same day in the month grid as the single-date endpoint', async () => {
      // The month no longer routes through `getPanchang`, so "they agree"
      // stopped being true by construction and has to be asserted. A drift
      // here would put a different tithi on the grid than on the day card.
      const month = await service.getPanchangMonth(2026, 10, BENGALURU.lat, BENGALURU.lng, BENGALURU.timezone);

      for (const day of [1, 17, 31]) {
        const single = await service.getPanchang(
          new Date(Date.UTC(2026, 9, day)),
          BENGALURU.lat,
          BENGALURU.lng,
          BENGALURU.timezone,
        );
        expect(month.days[day - 1]).toEqual(single);
      }
    });

    it('fills every civil day of the month in order', async () => {
      const month = await service.getPanchangMonth(2026, 2, BENGALURU.lat, BENGALURU.lng, BENGALURU.timezone);

      expect(month).toMatchObject({ year: 2026, month: 2 });
      expect(month.days).toHaveLength(28);
      expect(month.days[0].date).toBe('2026-02-01');
      expect(month.days[27].date).toBe('2026-02-28');
    });

    it('still resolves festivals, against the rules it loaded once', async () => {
      // Without this the read-count assertions above would be satisfied by a
      // month that simply stopped matching anything.
      // 2026-11-09 is the Kartika amavasya at Bengaluru — the tithi-30
      // sentinel path — and 2026-09-04 is Bhadrapada Krishna 8.
      const kartika = await service.getPanchangMonth(2026, 11, BENGALURU.lat, BENGALURU.lng, BENGALURU.timezone);
      expect(kartika.days[8].date).toBe('2026-11-09');
      expect(kartika.days[8].festivals.map((f) => f.slug)).toEqual(['diwali']);

      const bhadrapada = await service.getPanchangMonth(2026, 9, BENGALURU.lat, BENGALURU.lng, BENGALURU.timezone);
      expect(bhadrapada.days[3].date).toBe('2026-09-04');
      expect(bhadrapada.days[3].festivals.map((f) => f.slug)).toEqual([
        'krishna-janmashtami',
      ]);

      // And the rest of the month is quiet, so "it resolves festivals" is not
      // satisfied by a matcher that says yes to everything.
      expect(kartika.days.filter((d) => d.festivals.length)).toHaveLength(1);
    });
  });
});
