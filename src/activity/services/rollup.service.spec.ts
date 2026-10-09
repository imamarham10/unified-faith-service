import { Test } from '@nestjs/testing';
import { PrismaService } from '../../common/utils/prisma.service';
import {
  RollupService,
  TODAY_REBUILD_WINDOW_DAYS,
  addDays,
  computeStreak,
} from './rollup.service';

/**
 * Unit specs for the daily rollup and the streak projection (contract §2.4–§2.8).
 *
 * No database connection is made, for the same reason `activity.service.spec.ts`
 * makes none: `DATABASE_URL` points at a shared RDS instance holding live user
 * data, and `PrismaService`'s constructor opens a real `pg.Pool` against it.
 * The real provider is never instantiated — it is replaced by the in-memory
 * double below, which extends the one in `activity.service.spec.ts` with the
 * three models this task reads and writes.
 *
 * The double is deliberately local to this file rather than shared from under
 * `src/`: a shared helper would be compiled into `dist/` by `npm run build`,
 * carrying `jest.fn()` into the shipped bundle.
 *
 * Two behaviours of the double are load-bearing and are asserted directly in
 * `the test double itself` below, because a test that passes because the
 * double is wrong proves nothing:
 *
 *  - `userGoal.findFirst` must really sort by `effectiveFrom` descending and
 *    take one, not return rows in insertion order. The retroactive-goal spec
 *    is meaningless otherwise.
 *  - `{ lte: Date }` must compare instants, not object identity.
 */

const USER = 'rollup-user';
const OTHER_USER = 'rollup-other-user';
const ISLAM = 'islam' as const;

type Row = Record<string, any>;

const utc = (day: string) => new Date(`${day}T00:00:00.000Z`);
const dayOf = (value: Date) => value.toISOString().slice(0, 10);

/** Compare a stored value against one `where` clause entry. */
function matchesClause(actual: unknown, expected: unknown): boolean {
  if (expected instanceof Date) {
    return actual instanceof Date && actual.getTime() === expected.getTime();
  }
  if (expected && typeof expected === 'object') {
    const ops = expected as Record<string, any>;
    const asNumber = (v: unknown) => (v instanceof Date ? v.getTime() : (v as any));
    const a = asNumber(actual);
    if ('lte' in ops && !(a <= asNumber(ops.lte))) return false;
    if ('lt' in ops && !(a < asNumber(ops.lt))) return false;
    if ('gte' in ops && !(a >= asNumber(ops.gte))) return false;
    if ('gt' in ops && !(a > asNumber(ops.gt))) return false;
    if ('equals' in ops && !matchesClause(actual, ops.equals)) return false;
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

/**
 * Prisma double. Stores plain rows and enforces only what these specs depend
 * on: the two compound primary keys, `orderBy`, and `lte` on a date column.
 */
function createPrismaDouble() {
  const activityEvents: Row[] = [];
  const userGoals: Row[] = [];
  const dailyRollups: Row[] = [];
  const streakStates: Row[] = [];

  const upsertBy = (table: Row[], keyFields: string[]) =>
    jest.fn(async ({ where, create, update }: Row) => {
      const key = Object.values(where)[0] as Row;
      const index = table.findIndex((r) => keyFields.every((f) => matchesClause(r[f], key[f])));
      if (index >= 0) {
        table[index] = { ...table[index], ...update };
        return table[index];
      }
      const row = { ...create };
      table.push(row);
      return row;
    });

  const finders = (table: Row[]) => ({
    findMany: jest.fn(async ({ where, orderBy }: Row = {}) =>
      sortRows(
        table.filter((r) => matches(r, where)),
        orderBy,
      ).map((r) => ({ ...r })),
    ),
    findFirst: jest.fn(async ({ where, orderBy }: Row = {}) => {
      const hit = sortRows(
        table.filter((r) => matches(r, where)),
        orderBy,
      )[0];
      return hit ? { ...hit } : null;
    }),
    deleteMany: jest.fn(async ({ where }: Row = {}) => {
      let count = 0;
      for (let i = table.length - 1; i >= 0; i -= 1) {
        if (matches(table[i], where)) {
          table.splice(i, 1);
          count += 1;
        }
      }
      return { count };
    }),
  });

  return {
    activityEvents,
    userGoals,
    dailyRollups,
    streakStates,
    activityEvent: { ...finders(activityEvents) },
    userGoal: { ...finders(userGoals) },
    dailyRollup: {
      ...finders(dailyRollups),
      upsert: upsertBy(dailyRollups, ['userId', 'faithId', 'localDay']),
    },
    streakState: {
      ...finders(streakStates),
      findUnique: jest.fn(async ({ where }: Row) => {
        const key = Object.values(where)[0] as Row;
        const hit = streakStates.find(
          (r) => r.userId === key.userId && r.faithId === key.faithId,
        );
        return hit ? { ...hit } : null;
      }),
      upsert: upsertBy(streakStates, ['userId', 'faithId']),
    },
  };
}

type PrismaDouble = ReturnType<typeof createPrismaDouble>;

describe('RollupService', () => {
  let service: RollupService;
  let prisma: PrismaDouble;
  let seq = 0;

  beforeEach(async () => {
    prisma = createPrismaDouble();
    const moduleRef = await Test.createTestingModule({
      providers: [RollupService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(RollupService);
  });

  // ------------------------------------------------------------- fixtures

  /** One stored `activity_events` row, as ingest would have written it. */
  function addEvent(options: {
    userId?: string;
    localDay: string;
    activityType?: string;
    quantity?: number;
    timezone?: string;
  }) {
    seq += 1;
    prisma.activityEvents.push({
      id: `evt-${seq}`,
      userId: options.userId ?? USER,
      faithId: ISLAM,
      activityType: options.activityType ?? 'quran_verse',
      quantity: options.quantity ?? 1,
      occurredAt: new Date(`${options.localDay}T12:00:00.000Z`),
      localDay: utc(options.localDay),
      timezone: options.timezone ?? 'Asia/Kolkata',
      sourceRef: 'quran:2:148',
      clientEventId: `client-${seq}`,
    });
  }

  /** One appended `user_goals` row. §7.5 — append-only, effective-dated. */
  function addGoal(options: {
    userId?: string;
    goalType?: string;
    target: number;
    effectiveFrom: string;
    effectiveTo?: string;
  }) {
    seq += 1;
    prisma.userGoals.push({
      id: `goal-${seq}`,
      userId: options.userId ?? USER,
      faithId: ISLAM,
      goalType: options.goalType ?? 'verses',
      target: options.target,
      effectiveFrom: utc(options.effectiveFrom),
      effectiveTo: options.effectiveTo ? utc(options.effectiveTo) : null,
      createdAt: new Date(),
    });
  }

  /** A goal of 1 verse from the dawn of the fixture, plus a met day per date. */
  function metOn(days: string[], userId = USER) {
    for (const day of days) addEvent({ userId, localDay: day, quantity: 5 });
  }

  // =========================================================== the double

  describe('the test double itself', () => {
    it('orders user goals by effectiveFrom descending, not by insertion order', async () => {
      // Inserted newest-first on purpose: insertion order would hand back the
      // Oct 5 row for a lookup on Oct 3, which is the exact bug the
      // retroactive-goal spec below exists to catch.
      addGoal({ target: 3, effectiveFrom: '2026-10-05' });
      addGoal({ target: 10, effectiveFrom: '2026-10-01' });

      const hit = await prisma.userGoal.findFirst({
        where: { userId: USER, faithId: ISLAM, effectiveFrom: { lte: utc('2026-10-03') } },
        orderBy: { effectiveFrom: 'desc' },
      });

      expect(hit.target).toBe(10);
      expect(dayOf(hit.effectiveFrom)).toBe('2026-10-01');
    });

    it('filters { lte: Date } by instant, and returns null before the first goal', async () => {
      addGoal({ target: 10, effectiveFrom: '2026-10-01' });

      expect(
        await prisma.userGoal.findFirst({
          where: { userId: USER, faithId: ISLAM, effectiveFrom: { lte: utc('2026-09-30') } },
          orderBy: { effectiveFrom: 'desc' },
        }),
      ).toBeNull();

      // Inclusive on the boundary: `effective_from <= D`.
      expect(
        (
          await prisma.userGoal.findFirst({
            where: { userId: USER, faithId: ISLAM, effectiveFrom: { lte: utc('2026-10-01') } },
            orderBy: { effectiveFrom: 'desc' },
          })
        ).target,
      ).toBe(10);
    });
  });

  // ============================================================ §2.4 goalMet

  describe('goalMet (§2.4)', () => {
    it('counts SUM(quantity), not COUNT(events)', async () => {
      // Target 12. One event of 12 and twelve events of 1 are the same act of
      // worship logged with different granularity and must be indistinguishable.
      // A COUNT implementation scores the first as 1 (not met) and the second
      // as 12 (met) — the Qur'an reader's batching strategy would silently
      // decide whether the user kept their streak.
      addGoal({ target: 12, effectiveFrom: '2026-10-01' });
      addGoal({ userId: OTHER_USER, target: 12, effectiveFrom: '2026-10-01' });

      addEvent({ userId: USER, localDay: '2026-10-08', quantity: 12 });
      for (let i = 0; i < 12; i += 1) {
        addEvent({ userId: OTHER_USER, localDay: '2026-10-08', quantity: 1 });
      }

      const one = await service.computeDailyRollup(USER, ISLAM, '2026-10-08');
      const twelve = await service.computeDailyRollup(OTHER_USER, ISLAM, '2026-10-08');

      expect(one.counts).toEqual({ quran_verse: 12 });
      expect(twelve.counts).toEqual({ quran_verse: 12 });
      expect(one.goalMet).toBe(true);
      expect(twelve.goalMet).toBe(true);

      // The property, stated as the contract states it: identical.
      expect({ ...one, userId: null }).toEqual({ ...twelve, userId: null });
    });

    it("uses the goal in force on the day computed, not today's goal", async () => {
      // Target 10 until Oct 5, then target 3. Oct 3 has 5 verses.
      //
      // §7.4: lowering the target later must NOT retroactively manufacture a
      // streak. If this passes against a mutable single-row `UserGoal`, the
      // effective-dated lookup has been bypassed and the whole of §7.5 is lost.
      addGoal({ target: 3, effectiveFrom: '2026-10-05' });
      addGoal({ target: 10, effectiveFrom: '2026-10-01' });

      addEvent({ localDay: '2026-10-03', quantity: 5 });
      addEvent({ localDay: '2026-10-06', quantity: 5 });

      const oct3 = await service.computeDailyRollup(USER, ISLAM, '2026-10-03');
      const oct6 = await service.computeDailyRollup(USER, ISLAM, '2026-10-06');

      expect(oct3.counts).toEqual({ quran_verse: 5 });
      expect(oct3.goalMet).toBe(false); // 5 < 10, the target that day
      expect(oct6.goalMet).toBe(true); //  5 >= 3, the target that day
    });

    it('is false for a day before the user ever set a goal (§7.4)', async () => {
      addGoal({ target: 1, effectiveFrom: '2026-10-05' });
      addEvent({ localDay: '2026-10-01', quantity: 99 });

      const rollup = await service.computeDailyRollup(USER, ISLAM, '2026-10-01');
      expect(rollup.counts).toEqual({ quran_verse: 99 });
      expect(rollup.goalMet).toBe(false);
    });

    it('counts only the activity type the goalType names, but reports all of them', async () => {
      addGoal({ goalType: 'prayers', target: 5, effectiveFrom: '2026-10-01' });
      addEvent({ localDay: '2026-10-08', activityType: 'quran_verse', quantity: 40 });
      addEvent({ localDay: '2026-10-08', activityType: 'prayer', quantity: 3 });
      addEvent({ localDay: '2026-10-08', activityType: 'dhikr', quantity: 33 });

      const rollup = await service.computeDailyRollup(USER, ISLAM, '2026-10-08');
      // §5.3 — every non-zero type is a key; zero totals are absent, not `0`.
      expect(rollup.counts).toEqual({ quran_verse: 40, prayer: 3, dhikr: 33 });
      expect(rollup.goalMet).toBe(false); // 3 prayers < 5, despite 40 verses
      expect(rollup.points).toBe(0); // §2.9
    });

    it('returns an empty counts object for a day with no events', async () => {
      addGoal({ target: 1, effectiveFrom: '2026-10-01' });
      const rollup = await service.computeDailyRollup(USER, ISLAM, '2026-10-02');
      expect(rollup.counts).toEqual({});
      expect(rollup.goalMet).toBe(false);
    });
  });

  // ============================================================ §2.5 streaks

  describe('streak projection (§2.5, §2.6)', () => {
    it('keeps the streak when the user flies Asia/Kolkata to Europe/London', async () => {
      // localDay is stamped by the device (§2.1) and `timezone` is stored but
      // never consulted (§2.2), so a zone change mid-run is simply three
      // consecutive local days. This spec is the guard against anyone
      // "improving" the day arithmetic into a timezone conversion, at which
      // point the Oct 9 boundary would move and the run would split.
      addGoal({ target: 5, effectiveFrom: '2026-10-01' });
      addEvent({ localDay: '2026-10-08', quantity: 5, timezone: 'Asia/Kolkata' });
      addEvent({ localDay: '2026-10-09', quantity: 2, timezone: 'Asia/Kolkata' });
      addEvent({ localDay: '2026-10-09', quantity: 3, timezone: 'Europe/London' });
      addEvent({ localDay: '2026-10-10', quantity: 5, timezone: 'Europe/London' });

      const streak = await service.rebuildAll(USER, ISLAM, '2026-10-10');

      expect(streak.current).toBe(3);
      expect(streak.lastGoalMetDay).toBe('2026-10-10');
      expect(streak.freezesLeft).toBe(2);
    });

    it('does not drop a day across the Europe/London DST transition', async () => {
      // NOTE: the task brief called this "loses an hour". 2026-10-25 is when
      // British Summer Time ENDS — the clocks go back and the day is 25 hours
      // long, not 23. The dates and the assertion are as briefed; only the
      // description is corrected. (A 23-hour day would be 2026-03-29.)
      //
      // Either way the hazard is the same one: `localDay + 86_400_000` through
      // a local-time `Date` lands back on 2026-10-25, the two days collapse to
      // one, and the user is robbed of a day they earned.
      addGoal({ target: 5, effectiveFrom: '2026-10-01' });
      addEvent({ localDay: '2026-10-24', quantity: 5, timezone: 'Europe/London' });
      addEvent({ localDay: '2026-10-25', quantity: 5, timezone: 'Europe/London' });

      const streak = await service.rebuildAll(USER, ISLAM, '2026-10-25');

      expect(streak.current).toBe(2);
      expect(streak.longest).toBe(2);
      expect(streak.lastGoalMetDay).toBe('2026-10-25');
    });

    it('consumes a freeze for exactly one missed day and no more', async () => {
      // Met Oct 7, 8, _gap Oct 9_, 10, 11. Today is Oct 11.
      addGoal({ target: 5, effectiveFrom: '2026-10-01' });
      metOn(['2026-10-07', '2026-10-08', '2026-10-10', '2026-10-11']);

      const streak = await service.rebuildAll(USER, ISLAM, '2026-10-11');

      // Four goal-met days. The frozen day BRIDGES but does not COUNT — §6.3
      // says the same from the other side: a frozen day shows goalMet:false
      // and the streak survives it.
      expect(streak.current).toBe(4);
      // Exactly one freeze, not two, and not one per day of the run.
      expect(streak.freezesLeft).toBe(1);
      expect(streak.freezeResetOn).toBe('2026-11-01');
      expect(streak.lastGoalMetDay).toBe('2026-10-11');
    });

    it('breaks the streak when two consecutive days are missed and one freeze remains', async () => {
      // Oct 02 met, Oct 03 met, Oct 04 MISSED (freeze #1 bridges it),
      // Oct 05 met, Oct 06 met, Oct 07 + Oct 08 MISSED (needs two, one left),
      // Oct 09 met, Oct 10 met. Today is Oct 10.
      addGoal({ target: 5, effectiveFrom: '2026-10-01' });
      metOn([
        '2026-10-02',
        '2026-10-03',
        '2026-10-05',
        '2026-10-06',
        '2026-10-09',
        '2026-10-10',
      ]);

      const streak = await service.rebuildAll(USER, ISLAM, '2026-10-10');

      // The run Oct 02..Oct 06 is four met days bridged by one freeze.
      // The two-day gap cannot be paid for, so the streak restarts at Oct 09.
      expect(streak.current).toBe(2);
      expect(streak.longest).toBe(4);
      // The one freeze already spent on Oct 04 stays spent; the unpayable gap
      // charges nothing, because an all-or-nothing bridge that fails buys the
      // user nothing and must not cost them a freeze.
      expect(streak.freezesLeft).toBe(1);
      expect(streak.lastGoalMetDay).toBe('2026-10-10');

      // The contrast that proves the freeze count is what broke it: the same
      // day sequence with a full allowance bridges straight through.
      const withBothFreezes = computeStreak(
        ['2026-10-05', '2026-10-06', '2026-10-09', '2026-10-10'],
        '2026-10-10',
      );
      expect(withBothFreezes.current).toBe(4);
      expect(withBothFreezes.freezesLeft).toBe(0);
    });

    it('reproduces the contract worked example on both sides of the goal (§2.6)', async () => {
      // §2.6's table, which is the test for lazy consumption:
      //   morning of Oct 27, goal not yet met  -> current 25, freezesLeft 2
      //   Oct 27 after the goal is met         -> current 26, freezesLeft 1
      // The eager implementation shows freezesLeft 1 all morning, and §2.7
      // then overrides it on the next sync — the user watches their freeze
      // count change for no reason.
      addGoal({ target: 5, effectiveFrom: '2026-10-01' });
      const oct1to25: string[] = [];
      for (let d = 1; d <= 25; d += 1) {
        oct1to25.push(`2026-10-${String(d).padStart(2, '0')}`);
      }
      metOn(oct1to25); // Oct 26 deliberately absent

      const morning = await service.rebuildAll(USER, ISLAM, '2026-10-27');
      expect(morning.current).toBe(25);
      expect(morning.freezesLeft).toBe(2);
      expect(morning.lastGoalMetDay).toBe('2026-10-25');

      metOn(['2026-10-27']);
      const evening = await service.rebuildAll(USER, ISLAM, '2026-10-27');
      expect(evening.current).toBe(26); // 25 + today, NOT 27 — Oct 26 bridges, it does not count
      expect(evening.freezesLeft).toBe(1);
      expect(evening.lastGoalMetDay).toBe('2026-10-27');
    });

    it('includes today if and only if the goal is met today (§2.5)', async () => {
      addGoal({ target: 5, effectiveFrom: '2026-10-01' });
      metOn(['2026-10-06', '2026-10-07', '2026-10-08']);

      // Morning of Oct 9: nothing logged yet. The run does not drop to 2.
      const morning = await service.rebuildAll(USER, ISLAM, '2026-10-09');
      expect(morning.current).toBe(3);

      metOn(['2026-10-09']);
      const evening = await service.rebuildAll(USER, ISLAM, '2026-10-09');
      expect(evening.current).toBe(4);
    });

    it('is zero once the last goal-met day is further back than freezes can bridge', async () => {
      // §2.5's closing sentence. The trailing gap is TESTED for payability but
      // never CHARGED (§2.6) — which is why `freezesLeft` is still 2 here.
      addGoal({ target: 5, effectiveFrom: '2026-10-01' });
      metOn(['2026-10-01', '2026-10-02', '2026-10-03']);

      // Oct 4 and Oct 5 missed: two freezes would cover them, so it is alive.
      expect((await service.rebuildAll(USER, ISLAM, '2026-10-06')).current).toBe(3);
      // Oct 4, 5 and 6 missed: three days, two freezes. Dead.
      const dead = await service.rebuildAll(USER, ISLAM, '2026-10-07');
      expect(dead.current).toBe(0);
      expect(dead.longest).toBe(3); // §2.5 — longest never decreases
      expect(dead.lastGoalMetDay).toBe('2026-10-03'); // still reported
      expect(dead.freezesLeft).toBe(2);
    });

    it('never decreases longest, even when projected against an earlier today (§2.5)', async () => {
      // `computeStreak` only sees met days <= `today`, so projecting at a day
      // that precedes part of the run computes a SHORTER longest. §2.5 says
      // longest never decreases, and the persisted `max()` is the only thing
      // holding that — this is the spec that fails if someone removes it.
      //
      // Task 1.6 makes this reachable, not hypothetical: §5.1 lets the client
      // supply its own `localDay` within a day's slack of the server's.
      addGoal({ target: 5, effectiveFrom: '2026-10-01' });
      metOn(['2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10']);

      const full = await service.rebuildAll(USER, ISLAM, '2026-10-10');
      expect(full.current).toBe(5);
      expect(full.longest).toBe(5);

      // The same rollups, projected as of Oct 7: only two met days are visible.
      const earlier = await service.projectStreak(USER, ISLAM, '2026-10-07');
      expect(earlier.current).toBe(2); // as of that day, correctly
      expect(earlier.longest).toBe(5); // but the record stands
      expect(computeStreak(['2026-10-06', '2026-10-07'], '2026-10-07').longest).toBe(2);
    });

    it('gives a user with no activity a zero-valued state, never a throw (§5.4)', async () => {
      const streak = await service.rebuildAll(USER, ISLAM, '2026-10-08');
      expect(streak).toEqual({
        current: 0,
        longest: 0,
        lastGoalMetDay: null,
        freezesLeft: 2,
        freezeResetOn: '2026-11-01',
      });
    });

    it('charges each bridged day to the allowance of its own calendar month', async () => {
      // Under-specified in §2.6 and resolved here (see rollup.service.ts): a
      // gap day is charged to the month it falls in. A single running budget
      // would let two freezes bridge arbitrarily long gaps anywhere in history.
      //
      // Sep 29 met, Sep 30 + Oct 01 missed, Oct 02 met: one freeze from each
      // month's allowance, so October still shows one left.
      addGoal({ target: 5, effectiveFrom: '2026-09-01' });
      metOn(['2026-09-28', '2026-09-29', '2026-10-02', '2026-10-03']);

      const streak = await service.rebuildAll(USER, ISLAM, '2026-10-03');
      expect(streak.current).toBe(4);
      expect(streak.freezesLeft).toBe(1); // October's allowance, not September's
      expect(streak.freezeResetOn).toBe('2026-11-01');
    });
  });

  // ========================================================= replay property

  describe('replay equivalence', () => {
    it('rebuilds identical state when rollups are deleted and replayed', async () => {
      // The property that justifies storing events rather than counters: every
      // row in `daily_rollups` and `streak_states` is derivable from
      // `activity_events` plus `user_goals`, so both tables are caches and
      // either can be dropped without losing anything.
      //
      // The fixture is deliberately nasty: a mid-window goal change (so a
      // single mutable goal row would replay differently — §7.5), multi-event
      // days, a bridged gap, an unbridgeable gap, and a mixture of activity
      // types.
      addGoal({ target: 10, effectiveFrom: '2026-09-25' });
      addGoal({ target: 3, effectiveFrom: '2026-10-05' });

      for (const day of ['2026-09-28', '2026-09-29', '2026-09-30']) {
        addEvent({ localDay: day, quantity: 6 });
        addEvent({ localDay: day, quantity: 6 }); // 12 >= 10
      }
      addEvent({ localDay: '2026-10-01', quantity: 12 });
      // Oct 02 missed -> bridged by an October freeze.
      addEvent({ localDay: '2026-10-03', quantity: 10 });
      addEvent({ localDay: '2026-10-04', quantity: 4 }); // 4 < 10: not met that day
      addEvent({ localDay: '2026-10-06', quantity: 4 }); // 4 >= 3 under the new goal
      addEvent({ localDay: '2026-10-06', activityType: 'dhikr', quantity: 33 });
      addEvent({ localDay: '2026-10-07', quantity: 3 });
      addEvent({ localDay: '2026-10-08', activityType: 'prayer', quantity: 5 });
      addEvent({ localDay: '2026-10-08', quantity: 3 });

      const TODAY = '2026-10-08';

      const firstStreak = await service.rebuildAll(USER, ISLAM, TODAY);
      const firstRollups = (
        await prisma.dailyRollup.findMany({
          where: { userId: USER, faithId: ISLAM },
          orderBy: { localDay: 'asc' },
        })
      ).map(({ computedAt, ...rest }) => rest);

      // Sanity: the fixture must actually exercise the machinery, or
      // "identical" would be a statement about two empty objects.
      // Dense from the first EVENT day (Sep 28, not the first goal day) to today.
      expect(firstRollups.length).toBe(11); // Sep 28 .. Oct 8 inclusive
      expect(firstRollups.some((r) => r.goalMet)).toBe(true);
      expect(firstRollups.some((r) => !r.goalMet)).toBe(true);
      expect(firstStreak.current).toBeGreaterThan(0);

      // --- the actual replay: drop both caches entirely -------------------
      await prisma.dailyRollup.deleteMany({ where: {} });
      prisma.streakStates.length = 0;
      expect(prisma.dailyRollups.length).toBe(0);
      expect(prisma.streakStates.length).toBe(0);

      const secondStreak = await service.rebuildAll(USER, ISLAM, TODAY);
      const secondRollups = (
        await prisma.dailyRollup.findMany({
          where: { userId: USER, faithId: ISLAM },
          orderBy: { localDay: 'asc' },
        })
      ).map(({ computedAt, ...rest }) => rest);

      expect(secondRollups).toEqual(firstRollups);
      expect(secondStreak).toEqual(firstStreak);

      // And the persisted StreakState matches the projection it returned.
      const persisted = await prisma.streakState.findUnique({
        where: { userId_faithId: { userId: USER, faithId: ISLAM } },
      });
      expect(persisted.current).toBe(secondStreak.current);
      expect(persisted.longest).toBe(secondStreak.longest);
      expect(dayOf(persisted.lastGoalMetDay)).toBe(secondStreak.lastGoalMetDay);
      expect(persisted.freezesLeft).toBe(secondStreak.freezesLeft);
      expect(dayOf(persisted.freezeResetOn)).toBe(secondStreak.freezeResetOn);
    });

    it('is idempotent — replaying over intact rollups changes nothing', async () => {
      addGoal({ target: 5, effectiveFrom: '2026-10-01' });
      metOn(['2026-10-05', '2026-10-06', '2026-10-08']);

      const first = await service.rebuildAll(USER, ISLAM, '2026-10-08');
      const rowCount = prisma.dailyRollups.length;
      const second = await service.rebuildAll(USER, ISLAM, '2026-10-08');

      expect(second).toEqual(first);
      expect(prisma.dailyRollups.length).toBe(rowCount);
      expect(prisma.streakStates.length).toBe(1);
    });
  });

  // ================================================ the bounded read rebuild

  describe('bounded rebuild on the read path', () => {
    // `GET /today` calls `rebuildRecent`, not `rebuildAll`. These specs pin the
    // two halves of that trade: the streak must be bit-identical across the
    // bound, and the write count must actually fall. A streak assertion alone
    // would pass just as happily if the bound did nothing.
    const WINDOW = TODAY_REBUILD_WINDOW_DAYS;
    const TODAY = '2026-10-08';
    const SPAN = 200; // > 2 x WINDOW, so the bound has to bite

    /** `daily_rollups` as a comparable snapshot, newest-last. */
    const rollupRows = async () =>
      (
        await prisma.dailyRollup.findMany({
          where: { userId: USER, faithId: ISLAM },
          orderBy: { localDay: 'asc' },
        })
      ).map(({ computedAt, ...rest }) => rest);

    /** `SPAN` consecutive goal-met days ending on `TODAY`. */
    function seedLongRun() {
      const first = addDays(TODAY, -(SPAN - 1));
      addGoal({ target: 5, effectiveFrom: first });
      const days: string[] = [];
      for (let day = first; day <= TODAY; day = addDays(day, 1)) days.push(day);
      expect(days.length).toBe(SPAN);
      metOn(days);
      return first;
    }

    it('derives the window from the ingest horizon and the two localDay slacks', () => {
      // 90 (§2.3) + 1 (§2.2) + 1 (§5.2) + 1 (§5.1). If any of those contract
      // numbers moves, the constant must move with it rather than silently
      // becoming too small — which is why it is written as that sum.
      expect(WINDOW).toBe(93);
      // The guarantee in one line: the oldest localDay a future ingest can
      // produce is 91 days before the day it lands on, and the anchor can sit
      // two days from that day. Nothing the bound skips is reachable.
      expect(WINDOW).toBeGreaterThanOrEqual(90 + 1 + 1 + 1);
    });

    it('leaves the streak identical across a span far longer than the window', async () => {
      seedLongRun();

      // The accumulated production state: every day this user has ever had is
      // persisted, which is what daily `/today` loads and the nightly cron
      // produce in the real system.
      const unbounded = await service.rebuildAll(USER, ISLAM, TODAY);
      expect(unbounded.current).toBe(SPAN);
      expect(unbounded.longest).toBe(SPAN);
      const unboundedRows = await rollupRows();
      expect(unboundedRows.length).toBe(SPAN);

      prisma.dailyRollup.upsert.mockClear();
      const bounded = await service.rebuildRecent(USER, ISLAM, TODAY);

      // THE assertion: the streak does not change. `projectStreak` has no date
      // filter, so the 106 days outside the window keep contributing their
      // met-days; they simply stop being rewritten.
      expect(bounded).toEqual(unbounded);
      // And the rows are untouched, not merely the projection over them.
      expect(await rollupRows()).toEqual(unboundedRows);

      // The half that proves the bound bit at all.
      expect(prisma.dailyRollup.upsert).toHaveBeenCalledTimes(WINDOW + 1);
      expect(prisma.dailyRollup.upsert.mock.calls.length).toBeLessThan(SPAN);
    });

    it('still writes only the days a short-history user has, not a whole window', async () => {
      // Front-sparseness survives the floor: the first-event lookup still wins
      // when it is later than the floor, so a user who joined yesterday gets
      // two rows rather than 94 empty ones.
      addGoal({ target: 5, effectiveFrom: '2026-10-07' });
      metOn(['2026-10-07', '2026-10-08']);

      prisma.dailyRollup.upsert.mockClear();
      const bounded = await service.rebuildRecent(USER, ISLAM, TODAY);

      expect(prisma.dailyRollup.upsert).toHaveBeenCalledTimes(2);
      expect(bounded.current).toBe(2);
      expect(await rollupRows()).toHaveLength(2);
    });

    it('recovers an emptied rollup table through rebuildAll, not through the read path', async () => {
      // The one property the bound costs, asserted rather than left implicit:
      // `daily_rollups` is advertised as droppable, and after this change a
      // `/today` load on a cold table restores only the window. Recovery is
      // `rebuildAll`'s job — which is why it is kept unbounded.
      seedLongRun();
      expect((await service.rebuildAll(USER, ISLAM, TODAY)).current).toBe(SPAN);

      await prisma.dailyRollup.deleteMany({ where: {} });
      const cold = await service.rebuildRecent(USER, ISLAM, TODAY);
      expect(cold.current).toBe(WINDOW + 1);
      // §2.5 — `longest` never decreases, so the record survives even this.
      expect(cold.longest).toBe(SPAN);

      const recovered = await service.rebuildAll(USER, ISLAM, TODAY);
      expect(recovered.current).toBe(SPAN);
      expect(await rollupRows()).toHaveLength(SPAN);
    });
  });
});
