import { HttpException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../common/utils/prisma.service';
import { ActivityReadService } from './activity-read.service';
import { RollupService } from './rollup.service';
import { ActivityErrorBody } from '../activity-errors';
import { HISTORY_MAX_DAYS } from '../dto/activity.dto';

/**
 * Unit specs for `GET /today`, `GET /history` and `PUT /goal`
 * (contract §5, §6, §7).
 *
 * No database connection is made, for the same reason the Task 1.4 and 1.5
 * specs make none: `DATABASE_URL` points at a shared RDS instance holding live
 * user data and `PrismaService`'s constructor opens a real `pg.Pool` against
 * it. The real provider is never instantiated.
 *
 * The double below is the one from `rollup.service.spec.ts`, extended rather
 * than replaced, with the three things this task needs and Task 1.5 did not:
 * `userGoal.create` / `update` / `updateMany`, and an interactive
 * `$transaction` that **really rolls back**. That last one is the point: an
 * assertion that `$transaction` was called proves nothing about atomicity, so
 * the double snapshots every table on entry and restores it if the callback
 * throws, and the goal spec forces a mid-transaction failure and checks that
 * the previous goal row is still open.
 *
 * It stays local to this file rather than being shared from under `src/`: a
 * shared helper would be compiled into `dist/` by `npm run build`, carrying
 * `jest.fn()` into the shipped bundle.
 */

const USER = 'read-user';
const ISLAM = 'islam' as const;

type Row = Record<string, any>;

const utc = (day: string) => new Date(`${day}T00:00:00.000Z`);
const dayOf = (value: Date) => value.toISOString().slice(0, 10);

function matchesClause(actual: unknown, expected: unknown): boolean {
  if (expected === null) return actual === null || actual === undefined;
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
  const activityEvents: Row[] = [];
  const userGoals: Row[] = [];
  const dailyRollups: Row[] = [];
  const streakStates: Row[] = [];
  const tables = [activityEvents, userGoals, dailyRollups, streakStates];

  let ids = 0;

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

  /** Writers `user_goals` needs that Task 1.5 never exercised. */
  const writers = (table: Row[], prefix: string) => ({
    create: jest.fn(async ({ data }: Row) => {
      ids += 1;
      const row = { id: `${prefix}-${ids}`, ...data };
      table.push(row);
      return { ...row };
    }),
    update: jest.fn(async ({ where, data }: Row) => {
      const index = table.findIndex((r) => Object.entries(where).every(([f, v]) => r[f] === v));
      if (index < 0) throw Object.assign(new Error('record not found'), { code: 'P2025' });
      table[index] = { ...table[index], ...data };
      return { ...table[index] };
    }),
    updateMany: jest.fn(async ({ where, data }: Row = {}) => {
      let count = 0;
      for (const row of table) {
        if (matches(row, where)) {
          Object.assign(row, data);
          count += 1;
        }
      }
      return { count };
    }),
  });

  const double: Row = {
    activityEvents,
    userGoals,
    dailyRollups,
    streakStates,
    activityEvent: { ...finders(activityEvents) },
    userGoal: { ...finders(userGoals), ...writers(userGoals, 'goal') },
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

  /**
   * The interactive form, with a real rollback.
   *
   * Prisma's `$transaction(fn)` hands the callback a transactional client and
   * discards every write if it throws. A double that merely invoked the
   * callback would let a half-applied close-then-insert persist and the
   * atomicity spec would pass against a broken implementation.
   */
  double.$transaction = jest.fn(async (fn: (tx: Row) => Promise<unknown>) => {
    const snapshot = tables.map((t) => t.map((r) => ({ ...r })));
    try {
      return await fn(double);
    } catch (error) {
      tables.forEach((table, i) => table.splice(0, table.length, ...snapshot[i]));
      throw error;
    }
  });

  return double as typeof double & { $transaction: jest.Mock };
}

type PrismaDouble = ReturnType<typeof createPrismaDouble>;

/** Unwrap the contract-shaped body an activityError() carries (§3). */
async function expectRejection(promise: Promise<unknown>): Promise<ActivityErrorBody> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(HttpException);
    return (error as HttpException).getResponse() as ActivityErrorBody;
  }
  throw new Error('expected the call to throw');
}

describe('ActivityReadService', () => {
  let service: ActivityReadService;
  let prisma: PrismaDouble;
  let clock = new Date('2026-10-08T06:00:00.000Z');
  let seq = 0;

  beforeEach(async () => {
    prisma = createPrismaDouble();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ActivityReadService,
        RollupService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(ActivityReadService);
    clock = new Date('2026-10-08T06:00:00.000Z');
    jest.spyOn(service as any, 'now').mockImplementation(() => new Date(clock));
  });

  // -------------------------------------------------------------- fixtures

  function addEvent(options: {
    localDay: string;
    activityType?: string;
    quantity?: number;
    timezone?: string;
    occurredAt?: string;
  }) {
    seq += 1;
    prisma.activityEvents.push({
      id: `evt-${seq}`,
      userId: USER,
      faithId: ISLAM,
      activityType: options.activityType ?? 'quran_verse',
      quantity: options.quantity ?? 1,
      occurredAt: new Date(options.occurredAt ?? `${options.localDay}T12:00:00.000Z`),
      localDay: utc(options.localDay),
      timezone: options.timezone ?? 'Asia/Kolkata',
      sourceRef: 'quran:2:148',
      clientEventId: `client-${seq}`,
    });
  }

  function addGoal(options: {
    goalType?: string;
    target: number;
    effectiveFrom: string;
    effectiveTo?: string | null;
  }) {
    seq += 1;
    prisma.userGoals.push({
      id: `goal-${seq}`,
      userId: USER,
      faithId: ISLAM,
      goalType: options.goalType ?? 'verses',
      target: options.target,
      effectiveFrom: utc(options.effectiveFrom),
      effectiveTo: options.effectiveTo ? utc(options.effectiveTo) : null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });
  }

  /**
   * Pin the server clock, so `localDayIn` is testable.
   *
   * Overrides the service's `now()` seam rather than installing jest's fake
   * timers: the only clock these specs care about is the instant a zone is
   * resolved against, and faking the whole timer API to pin it leaves the
   * worker holding installed timers it then has to force-exit over.
   */
  function atInstant(iso: string) {
    clock = new Date(iso);
  }

  // ============================================== §5.2 — deriving the day

  describe('GET /today — localDay derivation (§5.2)', () => {
    it('gives a Kolkata user tomorrow, not the server UTC date, at 02:00 IST', async () => {
      // 2026-10-08T20:30:00Z is 2026-10-09T02:00 in Asia/Kolkata. Answering
      // from the server's own clock would hand this user yesterday's card,
      // yesterday's counts and a streak that looks broken — the exact bug
      // the required `timezone` parameter exists to prevent.
      atInstant('2026-10-08T20:30:00.000Z');

      const result = await service.today(USER, ISLAM, 'Asia/Kolkata');

      expect(result.localDay).toBe('2026-10-09');
      expect(result.timezone).toBe('Asia/Kolkata');
    });

    it('gives a Los Angeles user the previous day at the same instant', async () => {
      // The same instant is 2026-10-08T13:30 in America/Los_Angeles. Two users
      // reading at once are legitimately on different days; the server must
      // not collapse them onto its own.
      atInstant('2026-10-08T20:30:00.000Z');

      const result = await service.today(USER, ISLAM, 'America/Los_Angeles');
      expect(result.localDay).toBe('2026-10-08');
    });

    it('counts the day the derived localDay names, not the UTC one', async () => {
      atInstant('2026-10-08T20:30:00.000Z');
      addEvent({ localDay: '2026-10-09', quantity: 7 });
      addEvent({ localDay: '2026-10-08', quantity: 3 });

      const result = await service.today(USER, ISLAM, 'Asia/Kolkata');
      expect(result.counts).toEqual({ quran_verse: 7 });
    });

    it('rejects an absent, offset-shaped or unreal timezone with invalid_timezone (§5.5)', async () => {
      for (const timezone of [undefined, null, '', '+05:30', 'IST', 'Mars/Olympus']) {
        const body = await expectRejection(service.today(USER, ISLAM, timezone));
        expect(body).toMatchObject({ statusCode: 400, code: 'invalid_timezone' });
      }
    });

    it('rejects an absent or unknown faithId with unknown_faith_id (§5.5)', async () => {
      for (const faithId of [undefined, null, '', 'ISLAM', 'jain']) {
        const body = await expectRejection(service.today(USER, faithId, 'Asia/Kolkata'));
        expect(body).toMatchObject({ statusCode: 400, code: 'unknown_faith_id' });
      }
    });
  });

  // ================================= §5.1 — the optional localDay override

  describe('GET /today — the localDay override (§5.1, §5.5)', () => {
    it('uses a supplied localDay verbatim when it is within one day', async () => {
      atInstant('2026-10-08T20:30:00.000Z'); // derives 2026-10-09 in Kolkata
      addEvent({ localDay: '2026-10-08', quantity: 4 });

      const result = await service.today(USER, ISLAM, 'Asia/Kolkata', '2026-10-08');

      expect(result.localDay).toBe('2026-10-08');
      expect(result.counts).toEqual({ quran_verse: 4 });
    });

    it('rejects a malformed override with invalid_local_day', async () => {
      atInstant('2026-10-08T20:30:00.000Z');
      for (const localDay of ['08-10-2026', '2026-10-8', '2026-02-31', 42]) {
        const body = await expectRejection(
          service.today(USER, ISLAM, 'Asia/Kolkata', localDay),
        );
        expect(body).toMatchObject({ statusCode: 400, code: 'invalid_local_day' });
      }
    });

    it('rejects an override more than one day from the derivation with local_day_mismatch', async () => {
      atInstant('2026-10-08T20:30:00.000Z'); // derives 2026-10-09
      const body = await expectRejection(
        service.today(USER, ISLAM, 'Asia/Kolkata', '2026-10-07'),
      );
      expect(body).toMatchObject({ statusCode: 400, code: 'local_day_mismatch' });
    });
  });

  // ================================================= §5.4 — the empty state

  describe('GET /today — a user who has never recorded anything (§5.4)', () => {
    it('returns a zero-valued 200, not a 404', async () => {
      atInstant('2026-10-08T06:00:00.000Z');

      const result = await service.today(USER, ISLAM, 'Asia/Kolkata');

      expect(result).toEqual({
        faithId: 'islam',
        localDay: '2026-10-08',
        timezone: 'Asia/Kolkata',
        counts: {},
        goal: null,
        streak: {
          current: 0,
          longest: 0,
          freezesLeft: 2,
          freezeResetOn: '2026-11-01',
          lastGoalMetDay: null,
        },
      });
    });

    it('distinguishes "never set a goal" (null) from "set one, not met" (progress 0)', async () => {
      atInstant('2026-10-08T06:00:00.000Z');
      // §5.4: `goal` is null rather than a fabricated default precisely so the
      // client can show the goal-setting prompt in one case and an empty ring
      // in the other. Keyed to the UserGoal row, never to the event count.
      addGoal({ target: 5, effectiveFrom: '2026-10-01' });

      const result = await service.today(USER, ISLAM, 'Asia/Kolkata');

      expect(result.counts).toEqual({});
      expect(result.goal).toEqual({
        goalType: 'verses',
        target: 5,
        progress: 0,
        met: false,
      });
    });
  });

  // ===================================== §2.5–§2.7 — the streak is recomputed

  describe('GET /today — the streak is recomputed, never read from cache', () => {
    it('reprojects rather than trusting a StreakState row that went stale overnight', async () => {
      // Oct 1-25 met, nothing since. On Oct 26 the projection was written as
      // `current: 25` and that row is still sitting there. By Oct 29 three
      // days are missing and two freezes cannot bridge them, so the streak is
      // dead — but nothing has rewritten the row. A read that trusted the
      // cache would show a 25-day streak that does not exist.
      addGoal({ target: 1, effectiveFrom: '2026-10-01' });
      for (let d = 1; d <= 25; d += 1) {
        addEvent({ localDay: `2026-10-${String(d).padStart(2, '0')}`, quantity: 5 });
      }
      prisma.streakStates.push({
        userId: USER,
        faithId: ISLAM,
        current: 25,
        longest: 25,
        lastGoalMetDay: utc('2026-10-25'),
        freezesLeft: 2,
        freezeResetOn: utc('2026-11-01'),
      });

      atInstant('2026-10-29T06:00:00.000Z');
      const result = await service.today(USER, ISLAM, 'UTC');

      expect(result.streak.current).toBe(0);
      // §2.5 — longest never decreases, so the dead run is still the record.
      expect(result.streak.longest).toBe(25);
      expect(result.streak.lastGoalMetDay).toBe('2026-10-25');
      // The cache has been rewritten, so the stale row cannot be read again.
      expect(prisma.streakStates[0].current).toBe(0);
    });

    it('holds §2.6’s worked example: 25 and two freezes the morning after a miss', async () => {
      // Oct 1-25 met, Oct 26 missed, morning of Oct 27 with nothing yet today.
      // The walk starts at Oct 25 — the most recent goal-met day — so Oct 26
      // is never examined and the freeze that would bridge it is not charged.
      addGoal({ target: 1, effectiveFrom: '2026-10-01' });
      for (let d = 1; d <= 25; d += 1) {
        addEvent({ localDay: `2026-10-${String(d).padStart(2, '0')}`, quantity: 5 });
      }

      atInstant('2026-10-27T05:00:00.000Z');
      const morning = await service.today(USER, ISLAM, 'UTC');

      expect(morning.streak).toMatchObject({ current: 25, freezesLeft: 2 });
      expect(morning.goal).toMatchObject({ met: false, progress: 0 });

      // Then the goal is met that evening: the freeze is spent at the moment
      // it actually bridges, and `current` includes today.
      addEvent({ localDay: '2026-10-27', quantity: 5 });
      const evening = await service.today(USER, ISLAM, 'UTC');

      expect(evening.streak).toMatchObject({ current: 26, freezesLeft: 1 });
      expect(evening.goal).toMatchObject({ met: true });
    });

    it('charges a bridged gap to the month the gap day falls in, across a boundary', async () => {
      // Oct 28-31 met, Nov 1 missed, Nov 2 met. The bridge is charged to
      // NOVEMBER's allowance, because that is the month the gap day falls in —
      // not October's, where the run began. The alternative (one running
      // budget) makes two freezes bridge arbitrarily long gaps anywhere in
      // history and streaks become effectively unbreakable.
      //
      // This is the §2.6 rule the contract does not state and the Task 1.5
      // report flagged; the mobile engine (Task 1.10) must match it exactly or
      // server and device disagree at every month boundary.
      addGoal({ target: 1, effectiveFrom: '2026-10-01' });
      for (const day of ['2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-02']) {
        addEvent({ localDay: day, quantity: 5 });
      }

      atInstant('2026-11-02T06:00:00.000Z');
      const result = await service.today(USER, ISLAM, 'UTC');

      // The frozen day bridges but does not count: four met days plus Nov 2.
      expect(result.streak.current).toBe(5);
      expect(result.streak.freezesLeft).toBe(1);
      expect(result.streak.freezeResetOn).toBe('2026-12-01');
      expect(result.streak.lastGoalMetDay).toBe('2026-11-02');
    });

    it('reports a full allowance in a new month even after both were spent in the old one', async () => {
      // Sep 25-30 met with Sep 27 and Sep 29 missed — both September freezes
      // spent — then Oct 1 met. §2.6: the allowance is granted per calendar
      // month, so October opens at 2 regardless of what September cost.
      addGoal({ target: 1, effectiveFrom: '2026-09-01' });
      for (const day of ['2026-09-25', '2026-09-26', '2026-09-28', '2026-09-30', '2026-10-01']) {
        addEvent({ localDay: day, quantity: 5 });
      }

      atInstant('2026-10-01T06:00:00.000Z');
      const result = await service.today(USER, ISLAM, 'UTC');

      expect(result.streak.current).toBe(5);
      expect(result.streak.freezesLeft).toBe(2);
      expect(result.streak.freezeResetOn).toBe('2026-11-01');
    });

    it('picks up events ingested since the last rollup — projectStreak alone would miss today', async () => {
      // Ingest writes events and no rollups at all, so without the rebuild
      // `projectStreak` reads a table that does not yet know about today and
      // reports yesterday's streak to a user who just met their goal.
      addGoal({ target: 1, effectiveFrom: '2026-10-01' });
      addEvent({ localDay: '2026-10-01', quantity: 5 });
      addEvent({ localDay: '2026-10-02', quantity: 5 });
      expect(prisma.dailyRollups).toHaveLength(0);

      atInstant('2026-10-02T06:00:00.000Z');
      const result = await service.today(USER, ISLAM, 'UTC');

      expect(result.streak.current).toBe(2);
      expect(prisma.dailyRollups).toHaveLength(2);
    });
  });

  // ======================================= §2.4 — goal progress cannot drift

  describe('GET /today — the goal block (§2.4, §5.3)', () => {
    it('sums quantity rather than counting events', async () => {
      atInstant('2026-10-08T06:00:00.000Z');
      addGoal({ goalType: 'dhikr', target: 99, effectiveFrom: '2026-10-01' });
      for (let i = 0; i < 3; i += 1) {
        addEvent({ localDay: '2026-10-08', activityType: 'dhikr', quantity: 33 });
      }

      const result = await service.today(USER, ISLAM, 'UTC');

      expect(result.counts).toEqual({ dhikr: 99 });
      expect(result.goal).toMatchObject({ progress: 99, met: true });
    });

    it('counts only the one activityType the goalType names', async () => {
      atInstant('2026-10-08T06:00:00.000Z');
      addGoal({ goalType: 'verses', target: 5, effectiveFrom: '2026-10-01' });
      addEvent({ localDay: '2026-10-08', activityType: 'prayer', quantity: 5 });
      addEvent({ localDay: '2026-10-08', activityType: 'quran_verse', quantity: 2 });

      const result = await service.today(USER, ISLAM, 'UTC');

      expect(result.counts).toEqual({ prayer: 5, quran_verse: 2 });
      expect(result.goal).toMatchObject({ progress: 2, met: false });
    });

    it('agrees with the same day’s goalMet on /history — the two must not drift', async () => {
      // `/today` computes `met` from progress >= target; `computeDailyRollup`
      // computes `goalMet` independently. §6.3 has the client render the week
      // strip from one and the ring from the other, so a disagreement shows up
      // as a filled dot next to an unmet ring.
      atInstant('2026-10-08T06:00:00.000Z');
      addGoal({ target: 5, effectiveFrom: '2026-10-01' });
      addEvent({ localDay: '2026-10-08', quantity: 5 });

      const today = await service.today(USER, ISLAM, 'UTC');
      const history = await service.history(USER, ISLAM, '2026-10-08', '2026-10-08');

      expect(today.goal.met).toBe(true);
      expect(history.days[0].goalMet).toBe(today.goal.met);
      expect(history.days[0].counts).toEqual(today.counts);
    });
  });

  // ========================================== §6.3 — /history must be dense

  describe('GET /history — density (§6.3)', () => {
    it('returns a row for every day before the user’s first event', async () => {
      // The case rebuildAll cannot cover: it seeds from the first *event* day,
      // so Oct 1-9 would have no rollup rows at all and the dot-grid would
      // lose its leading cells. rebuildRange over the requested window is what
      // makes the array dense regardless of where the data starts.
      addGoal({ target: 1, effectiveFrom: '2026-10-01' });
      addEvent({ localDay: '2026-10-10', quantity: 5 });

      const result = await service.history(USER, ISLAM, '2026-10-01', '2026-10-12');

      expect(result.days).toHaveLength(12);
      expect(result.days[0].localDay).toBe('2026-10-01');
      expect(result.days[11].localDay).toBe('2026-10-12');
      expect(result.days.map((d) => d.localDay)).toEqual([
        '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04',
        '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08',
        '2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12',
      ]);
      // §6.3 — a day with no activity is `{}` and always `goalMet: false`.
      expect(result.days[0]).toEqual({
        localDay: '2026-10-01',
        counts: {},
        goalMet: false,
      });
      expect(result.days[9]).toEqual({
        localDay: '2026-10-10',
        counts: { quran_verse: 5 },
        goalMet: true,
      });
    });

    it('is dense for a user with no events and no goal at all', async () => {
      const result = await service.history(USER, ISLAM, '2026-10-01', '2026-10-07');

      expect(result.days).toHaveLength(7);
      expect(result.days.every((d) => d.goalMet === false)).toBe(true);
      expect(result.days.every((d) => Object.keys(d.counts).length === 0)).toBe(true);
    });

    it('returns exactly one day when from == to', async () => {
      const result = await service.history(USER, ISLAM, '2026-10-05', '2026-10-05');
      expect(result.days).toHaveLength(1);
      expect(result.days[0].localDay).toBe('2026-10-05');
    });

    it('carries no points and no streak (§2.9, §6.3)', async () => {
      addEvent({ localDay: '2026-10-05', quantity: 5 });
      const result = await service.history(USER, ISLAM, '2026-10-05', '2026-10-05');

      expect(result.days[0]).not.toHaveProperty('points');
      expect(result).not.toHaveProperty('streak');
      expect(Object.keys(result.days[0]).sort()).toEqual(['counts', 'goalMet', 'localDay']);
    });
  });

  describe('GET /history — range rules (§6.2, §6.4)', () => {
    it('accepts exactly 92 days inclusive', async () => {
      const result = await service.history(USER, ISLAM, '2026-07-10', '2026-10-09');
      expect(result.days).toHaveLength(HISTORY_MAX_DAYS);
    });

    it('rejects 93 days with range_too_large rather than truncating', async () => {
      const body = await expectRejection(
        service.history(USER, ISLAM, '2026-07-09', '2026-10-09'),
      );
      expect(body).toMatchObject({ statusCode: 400, code: 'range_too_large' });
      expect(body.message).toContain('93');
      // A truncated chart is wrong rather than absent: nothing was computed.
      expect(prisma.dailyRollups).toHaveLength(0);
    });

    it('rejects to < from with invalid_date_range', async () => {
      const body = await expectRejection(
        service.history(USER, ISLAM, '2026-10-09', '2026-10-01'),
      );
      expect(body).toMatchObject({ statusCode: 400, code: 'invalid_date_range' });
    });

    it('rejects absent or malformed dates with invalid_date_range', async () => {
      for (const [from, to] of [
        [undefined, '2026-10-09'],
        ['2026-10-01', undefined],
        ['01-10-2026', '2026-10-09'],
        ['2026-02-31', '2026-10-09'],
      ]) {
        const body = await expectRejection(service.history(USER, ISLAM, from, to));
        expect(body).toMatchObject({ statusCode: 400, code: 'invalid_date_range' });
      }
    });

    it('rejects an unknown faithId before touching the range', async () => {
      const body = await expectRejection(
        service.history(USER, 'jain', '2026-10-01', '2026-10-09'),
      );
      expect(body).toMatchObject({ statusCode: 400, code: 'unknown_faith_id' });
    });
  });

  // ============================================== §7 — PUT /goal, the upsert

  describe('PUT /goal — the effective-dated upsert (§7.3, §7.5)', () => {
    it('inserts the first goal effective from the user’s current localDay', async () => {
      atInstant('2026-10-08T20:30:00.000Z'); // 2026-10-09 in Kolkata

      const result = await service.setGoal(USER, {
        faithId: ISLAM,
        goalType: 'verses',
        target: 5,
        timezone: 'Asia/Kolkata',
      });

      expect(result).toMatchObject({
        faithId: 'islam',
        goalType: 'verses',
        target: 5,
        localDay: '2026-10-09',
        progress: 0,
        met: false,
      });
      expect(prisma.userGoals).toHaveLength(1);
      expect(dayOf(prisma.userGoals[0].effectiveFrom)).toBe('2026-10-09');
      expect(prisma.userGoals[0].effectiveTo).toBeNull();
    });

    it('re-evaluates today against the new goal, so progress can jump (§7.3)', async () => {
      atInstant('2026-10-08T06:00:00.000Z');
      addEvent({ localDay: '2026-10-08', activityType: 'quran_verse', quantity: 12 });
      addEvent({ localDay: '2026-10-08', activityType: 'dhikr', quantity: 33 });

      const verses = await service.setGoal(USER, {
        faithId: ISLAM,
        goalType: 'verses',
        target: 5,
        timezone: 'UTC',
      });
      expect(verses).toMatchObject({ progress: 12, met: true });

      // Changing goalType changes which activity is counted.
      const dhikr = await service.setGoal(USER, {
        faithId: ISLAM,
        goalType: 'dhikr',
        target: 100,
        timezone: 'UTC',
      });
      expect(dhikr).toMatchObject({ progress: 33, met: false });
    });

    it('closes the open row and inserts a new one on a later day', async () => {
      addGoal({ target: 5, effectiveFrom: '2026-10-01' });
      atInstant('2026-10-08T06:00:00.000Z');

      await service.setGoal(USER, {
        faithId: ISLAM,
        goalType: 'verses',
        target: 20,
        timezone: 'UTC',
      });

      expect(prisma.userGoals).toHaveLength(2);
      const [old, fresh] = prisma.userGoals;
      // The close sets effectiveTo to the NEW row's effectiveFrom — the
      // half-open interval [from, to).
      expect(dayOf(old.effectiveTo)).toBe('2026-10-08');
      expect(dayOf(fresh.effectiveFrom)).toBe('2026-10-08');
      expect(fresh.effectiveTo).toBeNull();
      expect(fresh.target).toBe(20);
    });

    it('updates today’s row rather than appending a second one (§7.1, §7.4)', async () => {
      atInstant('2026-10-08T06:00:00.000Z');

      const first = await service.setGoal(USER, {
        faithId: ISLAM,
        goalType: 'verses',
        target: 5,
        timezone: 'UTC',
      });
      atInstant('2026-10-08T06:05:00.000Z');
      const second = await service.setGoal(USER, {
        faithId: ISLAM,
        goalType: 'verses',
        target: 9,
        timezone: 'UTC',
      });

      // Today has not closed, so there is no history to preserve — and a
      // second row would collide with @@unique([userId, faithId, effectiveFrom]).
      expect(prisma.userGoals).toHaveLength(1);
      expect(prisma.userGoals[0].target).toBe(9);
      expect(second.target).toBe(9);
      // §7.1 — a repeat PUT is a no-op beyond updatedAt, so it must move.
      // `UserGoal` has no @updatedAt column, so Prisma will not bump it for us.
      expect(new Date(second.updatedAt).getTime()).toBeGreaterThan(
        new Date(first.updatedAt).getTime(),
      );
    });

    it('bumps updatedAt even when the body is byte-identical (§7.1)', async () => {
      atInstant('2026-10-08T06:00:00.000Z');
      const body = { faithId: ISLAM, goalType: 'verses', target: 5, timezone: 'UTC' };

      const first = await service.setGoal(USER, { ...body });
      atInstant('2026-10-08T06:00:01.000Z');
      const again = await service.setGoal(USER, { ...body });

      expect(again.updatedAt).not.toBe(first.updatedAt);
      expect(prisma.userGoals).toHaveLength(1);
    });

    it('is not retroactive: a closed day keeps the goalMet it closed with (§7.4)', async () => {
      // Three verses read on Oct 1 against a target of 5 — a miss, forever.
      addGoal({ target: 5, effectiveFrom: '2026-10-01' });
      addEvent({ localDay: '2026-10-01', quantity: 3 });
      atInstant('2026-10-05T06:00:00.000Z');

      await service.setGoal(USER, {
        faithId: ISLAM,
        goalType: 'verses',
        target: 1,
        timezone: 'UTC',
      });

      const history = await service.history(USER, ISLAM, '2026-10-01', '2026-10-05');
      // If lowering the target rewrote history, a user could manufacture a
      // 90-day streak out of incidental reading and the streak would mean
      // nothing to anyone.
      expect(history.days[0]).toMatchObject({ localDay: '2026-10-01', goalMet: false });
    });

    it('keeps islam and hindu goals independent (§7.1)', async () => {
      atInstant('2026-10-08T06:00:00.000Z');

      await service.setGoal(USER, {
        faithId: 'islam',
        goalType: 'verses',
        target: 5,
        timezone: 'UTC',
      });
      await service.setGoal(USER, {
        faithId: 'hindu',
        goalType: 'malas',
        target: 2,
        timezone: 'UTC',
      });

      expect(prisma.userGoals).toHaveLength(2);
      const islam = await service.today(USER, 'islam', 'UTC');
      const hindu = await service.today(USER, 'hindu', 'UTC');
      expect(islam.goal).toMatchObject({ goalType: 'verses', target: 5 });
      expect(hindu.goal).toMatchObject({ goalType: 'malas', target: 2 });
    });
  });

  describe('PUT /goal — the close and the insert are one transaction', () => {
    it('leaves the previous row open when the insert fails', async () => {
      addGoal({ target: 5, effectiveFrom: '2026-10-01' });
      atInstant('2026-10-08T06:00:00.000Z');

      prisma.userGoal.create.mockImplementationOnce(async () => {
        throw new Error('insert exploded');
      });

      await expect(
        service.setGoal(USER, {
          faithId: ISLAM,
          goalType: 'verses',
          target: 20,
          timezone: 'UTC',
        }),
      ).rejects.toThrow('insert exploded');

      // The close must have been rolled back with the insert. If it were not,
      // the range form of the in-force lookup would return zero rows for every
      // subsequent day — "no goal", so `goalMet: false`, so a silently broken
      // streak with nothing in the logs to show for it.
      expect(prisma.userGoals).toHaveLength(1);
      expect(prisma.userGoals[0].effectiveTo).toBeNull();
      expect(prisma.userGoals[0].target).toBe(5);
    });

    it('still reports the goal in force if a close ever did land alone', async () => {
      // Defence in depth: the ORDER BY effective_from DESC LIMIT 1 lookup is
      // total whatever `effective_to` holds, so even a corrupted table reads
      // as a goal rather than as none.
      addGoal({ target: 5, effectiveFrom: '2026-10-01', effectiveTo: '2026-10-08' });
      atInstant('2026-10-10T06:00:00.000Z');

      const result = await service.today(USER, ISLAM, 'UTC');
      expect(result.goal).toMatchObject({ goalType: 'verses', target: 5 });
    });

    it('runs both statements inside $transaction', async () => {
      addGoal({ target: 5, effectiveFrom: '2026-10-01' });
      atInstant('2026-10-08T06:00:00.000Z');

      await service.setGoal(USER, {
        faithId: ISLAM,
        goalType: 'verses',
        target: 20,
        timezone: 'UTC',
      });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('PUT /goal — validation (§1.3, §7.6)', () => {
    beforeEach(() => atInstant('2026-10-08T06:00:00.000Z'));

    const valid = { faithId: ISLAM, goalType: 'verses', target: 5, timezone: 'UTC' };

    it('rejects an unknown goalType with unknown_goal_type', async () => {
      for (const goalType of [undefined, null, 'pages', 'minutes', 'quran_verse']) {
        const body = await expectRejection(service.setGoal(USER, { ...valid, goalType }));
        expect(body).toMatchObject({ statusCode: 400, code: 'unknown_goal_type' });
      }
    });

    it('rejects a goalType belonging to the other faith with goal_type_faith_mismatch', async () => {
      const body = await expectRejection(
        service.setGoal(USER, { ...valid, faithId: 'islam', goalType: 'shlokas' }),
      );
      expect(body).toMatchObject({ statusCode: 400, code: 'goal_type_faith_mismatch' });
    });

    it('enforces §1.3’s per-goalType target ceiling', async () => {
      // prayers tops out at 5 — five daily prayers is the whole obligation —
      // while dhikr runs to 10000. One shared ceiling would be wrong for both.
      const cases: Array<[string, string, number, boolean]> = [
        ['islam', 'prayers', 5, true],
        ['islam', 'prayers', 6, false],
        ['islam', 'verses', 1000, true],
        ['islam', 'verses', 1001, false],
        ['islam', 'dhikr', 10000, true],
        ['islam', 'dhikr', 10001, false],
        ['hindu', 'sandhyas', 3, true],
        ['hindu', 'sandhyas', 4, false],
        ['hindu', 'malas', 108, true],
        ['hindu', 'malas', 109, false],
        ['hindu', 'shlokas', 1000, true],
        ['hindu', 'shlokas', 1001, false],
      ];

      for (const [faithId, goalType, target, ok] of cases) {
        const call = service.setGoal(USER, { faithId, goalType, target, timezone: 'UTC' });
        if (ok) {
          await expect(call).resolves.toMatchObject({ target });
        } else {
          const body = await expectRejection(call);
          expect(body).toMatchObject({ statusCode: 400, code: 'invalid_target' });
          expect(body.errors.target[0]).toContain(goalType);
        }
      }
    });

    it('rejects a non-integer, zero, negative or stringified target', async () => {
      for (const target of [0, -1, 2.5, '5', null, undefined, NaN]) {
        const body = await expectRejection(service.setGoal(USER, { ...valid, target }));
        expect(body).toMatchObject({ statusCode: 400, code: 'invalid_target' });
      }
    });

    it('rejects a supplied-but-invalid timezone with invalid_timezone', async () => {
      for (const timezone of ['+05:30', 'IST', 'Mars/Olympus']) {
        const body = await expectRejection(service.setGoal(USER, { ...valid, timezone }));
        expect(body).toMatchObject({ statusCode: 400, code: 'invalid_timezone' });
      }
    });

    it('writes nothing when validation fails', async () => {
      await expectRejection(service.setGoal(USER, { ...valid, target: 9999 }));
      expect(prisma.userGoals).toHaveLength(0);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('PUT /goal — the timezone fallbacks (§7.2)', () => {
    it('falls back to the zone of the user’s most recent event', async () => {
      // 2026-10-08T20:30:00Z is already 2026-10-09 in Kolkata. A UTC fallback
      // would date the goal a day early and leave today evaluated against the
      // previous goal.
      addEvent({
        localDay: '2026-10-08',
        timezone: 'Asia/Kolkata',
        occurredAt: '2026-10-08T18:00:00.000Z',
      });
      atInstant('2026-10-08T20:30:00.000Z');

      const result = await service.setGoal(USER, {
        faithId: ISLAM,
        goalType: 'verses',
        target: 5,
      });

      expect(result.localDay).toBe('2026-10-09');
    });

    it('prefers the latest event by occurredAt when the user has flown', async () => {
      addEvent({
        localDay: '2026-10-08',
        timezone: 'Asia/Kolkata',
        occurredAt: '2026-10-08T06:00:00.000Z',
      });
      addEvent({
        localDay: '2026-10-08',
        timezone: 'Europe/London',
        occurredAt: '2026-10-08T18:00:00.000Z',
      });
      atInstant('2026-10-08T20:30:00.000Z');

      const result = await service.setGoal(USER, {
        faithId: ISLAM,
        goalType: 'verses',
        target: 5,
      });

      // 21:30 in London on the 8th, 02:00 in Kolkata on the 9th.
      expect(result.localDay).toBe('2026-10-08');
    });

    it('falls back to UTC for a user with no events at all', async () => {
      atInstant('2026-10-08T20:30:00.000Z');

      const result = await service.setGoal(USER, {
        faithId: ISLAM,
        goalType: 'verses',
        target: 5,
      });

      expect(result.localDay).toBe('2026-10-08');
    });
  });
});
