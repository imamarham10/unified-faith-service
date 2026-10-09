import { Test } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { PrismaService } from '../../../../common/utils/prisma.service';
import { PrayersService, countStreak } from './prayers.service';
import { PrayerCalculationsService } from './prayer-calculations.service';

/**
 * Specs for `GET /api/v1/islam/prayers/stats`.
 *
 * The bug under test, in two places: the streak and the prayer counts both
 * queried `prayer_logs` with **no status filter**, so a day whose only row was
 * `missed` counted as a day the user prayed, and a `missed` row counted as a
 * prayer performed. The error flatters the user, which is the one direction a
 * practice app must never be wrong in. `qada` is excluded for a different
 * reason: it records a prayer owed from *another* day, stamped with the date it
 * was made up on, so counting it would credit today for yesterday's obligation.
 * The mobile client excludes both from its on-device streak and the two must
 * agree.
 *
 * No database connection is made, for the same reason the activity specs make
 * none: `DATABASE_URL` points at a shared RDS instance holding live user data
 * and `PrismaService`'s constructor opens a real `pg.Pool` against it. The
 * real provider is never instantiated — it is replaced by the in-memory double
 * below, which is the one from `src/activity/services/*.spec.ts` narrowed to
 * the two models this service reads and extended with the three capabilities
 * those specs never needed: `count`, `select`/`distinct` on `findMany`, and
 * the `{ in: [...] }` filter.
 *
 * ## The `in` operator is asserted directly, and that is not ceremony
 *
 * The doubles in the activity specs implement `lte`/`lt`/`gte`/`gt`/`equals`
 * and **return `true` for any other operator object**. Under such a double
 * `where: { status: { in: ['on_time', 'late'] } }` matches every row, the
 * fix becomes invisible, and both tests below would pass against the unfixed
 * service. `the test double itself` pins it: a test that passes because the
 * double is wrong proves nothing.
 *
 * ## Why every fixture date is a UTC midnight
 *
 * `prayer_logs.date` is `@db.Date`, which Prisma hands back as a `Date` at
 * **UTC** midnight, and that is now also the day the service reckons against
 * (`toDayKey`). Fixtures are built the same way so a day is a day in any
 * runner timezone.
 *
 * The service used to build its reference day with `setHours(0,0,0,0)` —
 * **server-local** midnight — and subtract instants. `the streak is reckoned
 * in calendar days` below asserts that it no longer does, by running the same
 * fixtures under several `TZ` values; a stale assertion there would be an
 * assertion about the runner rather than about the service.
 */

const USER = 'prayer-user';

type Row = Record<string, any>;

/** Compare a stored value against one `where` clause entry. */
function matchesClause(actual: unknown, expected: unknown): boolean {
  if (expected === null) return actual === null || actual === undefined;
  if (expected instanceof Date) {
    return actual instanceof Date && actual.getTime() === expected.getTime();
  }
  if (expected && typeof expected === 'object') {
    const ops = expected as Record<string, any>;
    const asNumber = (v: unknown) => (v instanceof Date ? v.getTime() : (v as any));
    const a = asNumber(actual);
    // `in` / `notIn` are the operators this file's subject depends on, and the
    // reason the fall-through below is a `false` rather than the activity
    // doubles' `true`: an unimplemented operator must fail loudly here, not
    // silently match every row.
    if ('in' in ops) {
      if (!Array.isArray(ops.in) || !ops.in.some((v: unknown) => matchesClause(actual, v))) {
        return false;
      }
    }
    if ('notIn' in ops) {
      if (Array.isArray(ops.notIn) && ops.notIn.some((v: unknown) => matchesClause(actual, v))) {
        return false;
      }
    }
    if ('lte' in ops && !(a <= asNumber(ops.lte))) return false;
    if ('lt' in ops && !(a < asNumber(ops.lt))) return false;
    if ('gte' in ops && !(a >= asNumber(ops.gte))) return false;
    if ('gt' in ops && !(a > asNumber(ops.gt))) return false;
    if ('equals' in ops && !matchesClause(actual, ops.equals)) return false;

    const known = ['in', 'notIn', 'lte', 'lt', 'gte', 'gt', 'equals'];
    const unknownOps = Object.keys(ops).filter((k) => !known.includes(k));
    if (unknownOps.length) {
      throw new Error(`prisma double: unimplemented operator(s) ${unknownOps.join(', ')}`);
    }
    return true;
  }
  return actual === expected;
}

const matches = (row: Row, where: Row = {}) =>
  Object.entries(where).every(([field, expected]) => matchesClause(row[field], expected));

/** Sort by one `orderBy: { field: 'asc' | 'desc' }`, comparing Dates by instant. */
function sortRows(rows: Row[], orderBy?: Row): Row[] {
  if (!orderBy) return [...rows];
  const [field, direction] = Object.entries(orderBy)[0];
  const key = (r: Row) => (r[field] instanceof Date ? r[field].getTime() : r[field]);
  return [...rows].sort((a, b) => {
    const x = key(a);
    const y = key(b);
    const cmp = x < y ? -1 : x > y ? 1 : 0;
    return direction === 'desc' ? -cmp : cmp;
  });
}

function createPrismaDouble() {
  const prayerLogs: Row[] = [];
  const prayerQadaCounts: Row[] = [];

  const finders = (table: Row[]) => ({
    /**
     * `where` -> `orderBy` -> `distinct` -> `select` -> `take`, in that order.
     *
     * The order is the whole point for this subject: filtering *before*
     * de-duplicating is what makes a day holding one `missed` row and one
     * `on_time` row resolve to the `on_time` row. De-duplicating first would
     * let the `missed` row win the day and the spec would be asserting the
     * double's accident rather than the service's behaviour.
     */
    findMany: jest.fn(async ({ where, orderBy, distinct, select, take }: Row = {}) => {
      let rows = sortRows(
        table.filter((r) => matches(r, where)),
        orderBy,
      );
      if (Array.isArray(distinct)) {
        const seen = new Set<string>();
        rows = rows.filter((r) => {
          const key = distinct
            .map((f: string) => (r[f] instanceof Date ? r[f].toISOString() : String(r[f])))
            .join('|');
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }
      let out = rows.map((r) => ({ ...r }));
      if (select) {
        const fields = Object.keys(select).filter((f) => select[f]);
        out = out.map((r) => Object.fromEntries(fields.map((f) => [f, r[f]])));
      }
      if (typeof take === 'number') out = out.slice(0, take);
      return out;
    }),
    count: jest.fn(async ({ where }: Row = {}) => table.filter((r) => matches(r, where)).length),
  });

  return {
    prayerLogs,
    prayerQadaCounts,
    prayerLog: { ...finders(prayerLogs) },
    prayerQadaCount: { ...finders(prayerQadaCounts) },
  };
}

type PrismaDouble = ReturnType<typeof createPrismaDouble>;

/** UTC midnight, `offset` whole days before today's UTC midnight. */
function daysAgo(offset: number): Date {
  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return new Date(todayUtc - offset * 24 * 60 * 60 * 1000);
}

describe('PrayersService.getPrayerStats', () => {
  let service: PrayersService;
  let prisma: PrismaDouble;
  let seq = 0;

  beforeEach(async () => {
    prisma = createPrismaDouble();
    seq = 0;
    const moduleRef = await Test.createTestingModule({
      providers: [
        PrayersService,
        { provide: PrismaService, useValue: prisma },
        // Neither is reachable from getPrayerStats; both are constructor
        // dependencies and are stubbed rather than instantiated so no prayer
        // maths or cache client is pulled into this spec.
        { provide: PrayerCalculationsService, useValue: {} },
        { provide: CACHE_MANAGER, useValue: { get: jest.fn(), set: jest.fn() } },
      ],
    }).compile();
    service = moduleRef.get(PrayersService);
  });

  function log(options: { daysAgo: number; status: string; prayerName?: string }) {
    seq += 1;
    prisma.prayerLogs.push({
      id: `log-${seq}`,
      userId: USER,
      prayerName: options.prayerName ?? 'fajr',
      date: daysAgo(options.daysAgo),
      loggedAt: new Date(),
      status: options.status,
      createdAt: new Date(),
    });
  }

  const streakOf = async () => (await service.getPrayerStats(USER)).streak;

  // ------------------------------------------------- the test double itself

  describe('the test double itself', () => {
    it('really filters on `{ in: [...] }` rather than matching every row', async () => {
      log({ daysAgo: 0, status: 'on_time' });
      log({ daysAgo: 0, status: 'missed', prayerName: 'dhuhr' });

      const kept = await prisma.prayerLog.findMany({
        where: { userId: USER, status: { in: ['on_time', 'late'] } },
      });

      // The activity specs' doubles return `true` for an unrecognised operator
      // object, which would make this two.
      expect(kept).toHaveLength(1);
      expect(kept[0].status).toBe('on_time');
    });

    it('applies `distinct` after `where`, so a filtered-out row cannot claim the day', async () => {
      // `missed` sorts into the same day as `on_time`. If `distinct` ran
      // before `where`, the `missed` row could be the one kept for that date
      // and then be discarded, losing the day entirely.
      log({ daysAgo: 0, status: 'missed' });
      log({ daysAgo: 0, status: 'on_time', prayerName: 'dhuhr' });

      const days = await prisma.prayerLog.findMany({
        where: { userId: USER, status: { in: ['on_time', 'late'] } },
        select: { date: true },
        distinct: ['date'],
      });

      expect(days).toHaveLength(1);
      expect(Object.keys(days[0])).toEqual(['date']);
    });
  });

  // ------------------------------------------------------------- the streak

  describe('a day counts only when the user actually prayed', () => {
    it('does not let a day whose only row is `missed` carry the streak', async () => {
      // The bug, stated as data: an unbroken-looking three-day run in which
      // the middle day is a logged *absence*. Counting it reports 3 where the
      // user practised on 2 non-consecutive days.
      log({ daysAgo: 0, status: 'on_time' });
      log({ daysAgo: 1, status: 'missed' });
      log({ daysAgo: 2, status: 'on_time' });

      expect(await streakOf()).toBe(1);
    });

    it('does not let a day whose only row is `qada` carry the streak', async () => {
      // A qada row is a prayer owed from another day, stamped with the day it
      // was made up on. The mobile client excludes it from both the daily goal
      // and the streak; the server must agree or the two numbers diverge on
      // the same screen.
      log({ daysAgo: 0, status: 'on_time' });
      log({ daysAgo: 1, status: 'qada' });
      log({ daysAgo: 2, status: 'on_time' });

      expect(await streakOf()).toBe(1);
    });

    it('is zero when the only log today is `missed`', async () => {
      log({ daysAgo: 0, status: 'missed' });

      expect(await streakOf()).toBe(0);
    });

    it('is zero when the only log today is `qada`', async () => {
      log({ daysAgo: 0, status: 'qada' });

      expect(await streakOf()).toBe(0);
    });

    it('counts `late` — a prayer prayed outside its window is still prayed', async () => {
      log({ daysAgo: 0, status: 'on_time' });
      log({ daysAgo: 1, status: 'late' });
      log({ daysAgo: 2, status: 'on_time' });

      expect(await streakOf()).toBe(3);
    });

    it('counts a day once when it holds both a missed prayer and a prayed one', async () => {
      // Five prayers a day means most real days are mixed. A day is a day the
      // user practised if *any* prayer on it was prayed.
      log({ daysAgo: 0, status: 'missed', prayerName: 'fajr' });
      log({ daysAgo: 0, status: 'on_time', prayerName: 'dhuhr' });
      log({ daysAgo: 1, status: 'on_time', prayerName: 'fajr' });
      log({ daysAgo: 1, status: 'missed', prayerName: 'isha' });

      expect(await streakOf()).toBe(2);
    });

    it('still starts from yesterday when nothing is logged today', async () => {
      // §-equivalent of the activity engine's §2.5: a run that ended yesterday
      // is alive this morning and must not drop by one overnight.
      log({ daysAgo: 1, status: 'on_time' });
      log({ daysAgo: 2, status: 'on_time' });

      expect(await streakOf()).toBe(2);
    });

    it('is zero when the most recent prayed day is older than yesterday', async () => {
      log({ daysAgo: 3, status: 'on_time' });
      log({ daysAgo: 4, status: 'on_time' });

      expect(await streakOf()).toBe(0);
    });

    it('is zero for a user who has never logged anything', async () => {
      expect(await streakOf()).toBe(0);
    });
  });

  // ------------------------------------------- calendar days, not instants

  describe('the streak is reckoned in calendar days', () => {
    const ORIGINAL_TZ = process.env.TZ;

    afterEach(() => {
      if (ORIGINAL_TZ === undefined) delete process.env.TZ;
      else process.env.TZ = ORIGINAL_TZ;
    });

    // Node re-reads `process.env.TZ` on every `Date` operation, so this really
    // moves the server's wall clock rather than only its label. The spread is
    // the point: `Pacific/Kiritimati` is UTC+14 and `Pacific/Niue` UTC−11, the
    // two ends of the 26-hour band `rollup-cron.service.ts` documents.
    const ZONES = ['UTC', 'Asia/Kolkata', 'Pacific/Kiritimati', 'Pacific/Niue', 'America/New_York'];

    it.each(ZONES)('reports the same live streak under TZ=%s', async (zone) => {
      process.env.TZ = zone;
      log({ daysAgo: 0, status: 'on_time' });
      log({ daysAgo: 1, status: 'on_time' });
      log({ daysAgo: 2, status: 'on_time' });

      expect(await streakOf()).toBe(3);
    });

    it.each(ZONES)('is zero under TZ=%s when the last prayed day is two days back', async (zone) => {
      // The assertion the old instant arithmetic failed. Server-local midnight
      // minus a UTC-midnight `@db.Date` leaves the runtime's offset behind, and
      // `Math.floor` turns it into an off-by-one: east of Greenwich a run that
      // ended the day before yesterday still passed the `<= 1` gate and was
      // reported as alive.
      process.env.TZ = zone;
      log({ daysAgo: 2, status: 'on_time' });
      log({ daysAgo: 3, status: 'on_time' });

      expect(await streakOf()).toBe(0);
    });

    it('ignores a future-dated log rather than letting it zero a live streak', async () => {
      // Nothing in `prayer_logs` forbids a future date and `logPrayer` upserts
      // whatever the client sends, so a device with a wrong clock can write
      // one. The old gate had no lower bound and counted it; a naive
      // `daysDiff >= 0` would make it the rejected anchor and report 0 for a
      // user with a perfectly good run. Dropping it first does neither.
      log({ daysAgo: -5, status: 'on_time' });
      log({ daysAgo: 0, status: 'on_time' });
      log({ daysAgo: 1, status: 'on_time' });

      expect(await streakOf()).toBe(2);
    });

    it('is zero when the only log is future-dated', async () => {
      log({ daysAgo: -1, status: 'on_time' });

      expect(await streakOf()).toBe(0);
    });
  });

  describe('countStreak', () => {
    // The day arithmetic on its own, with no clock and no database in it.
    it('counts a contiguous run ending today', () => {
      expect(countStreak(['2026-10-09', '2026-10-08', '2026-10-07'], '2026-10-09')).toBe(3);
    });

    it('counts a run that ended yesterday', () => {
      expect(countStreak(['2026-10-08', '2026-10-07'], '2026-10-09')).toBe(2);
    });

    it('stops at the first gap', () => {
      expect(countStreak(['2026-10-09', '2026-10-08', '2026-10-06'], '2026-10-09')).toBe(2);
    });

    it('is zero when the run ended before yesterday', () => {
      expect(countStreak(['2026-10-07', '2026-10-06'], '2026-10-09')).toBe(0);
    });

    it('crosses a month boundary', () => {
      expect(countStreak(['2026-10-01', '2026-09-30', '2026-09-29'], '2026-10-01')).toBe(3);
    });

    it('crosses a year boundary', () => {
      expect(countStreak(['2027-01-01', '2026-12-31', '2026-12-30'], '2027-01-01')).toBe(3);
    });

    it('drops days after today before anchoring', () => {
      expect(countStreak(['2026-12-25', '2026-10-09', '2026-10-08'], '2026-10-09')).toBe(2);
    });

    it('is zero for an empty list', () => {
      expect(countStreak([], '2026-10-09')).toBe(0);
    });
  });

  describe('`totalPrayers` counts prayers performed, not rows', () => {
    it('excludes `missed` and `qada` from `totalPrayers`, leaving the qada tallies alone', async () => {
      // Four rows, two of them prayers the user actually performed. The old
      // behaviour — `count({ where: { userId } })`, no status filter — reported
      // 4, so a `missed` row (a logged *absence*) and a `qada` row (a prayer
      // owed from another day) both read as prayers performed.
      //
      // `onTimePrayers` is not a separate fix: it was already on-time-only, so
      // the unfiltered total made `onTime/total` a ratio with mismatched
      // populations. The pair now shares one denominator — prayers performed —
      // and the ratio the client renders beside them means something.
      log({ daysAgo: 0, status: 'on_time' });
      log({ daysAgo: 0, status: 'late', prayerName: 'dhuhr' });
      log({ daysAgo: 0, status: 'missed', prayerName: 'asr' });
      log({ daysAgo: 1, status: 'qada', prayerName: 'maghrib' });
      prisma.prayerQadaCounts.push({ userId: USER, prayerName: 'fajr', count: 3 });

      const stats = await service.getPrayerStats(USER);

      expect(stats.totalPrayers).toBe(2);
      expect(stats.onTimePrayers).toBe(1);
      // Excluding qada from the prayer count loses nothing: the tally is its
      // own field in the same payload and is untouched.
      expect(stats.totalQaza).toBe(3);
      expect(stats.byPrayer.fajr).toBe(3);
    });

    it('counts a performed prayer once per row, not once per day', async () => {
      // `totalPrayers` is a count of prayers, not of days — five prayers on one
      // day are five. Only the streak collapses a day to one.
      for (const prayerName of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']) {
        log({ daysAgo: 0, status: 'on_time', prayerName });
      }

      const stats = await service.getPrayerStats(USER);

      expect(stats.totalPrayers).toBe(5);
      expect(stats.onTimePrayers).toBe(5);
      expect(stats.streak).toBe(1);
    });
  });
});
