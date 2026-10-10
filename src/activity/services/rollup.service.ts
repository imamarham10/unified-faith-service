import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/utils/prisma.service';
import {
  FaithId,
  FREEZES_PER_MONTH,
  GOAL_TYPE_ACTIVITY,
  LOCAL_DAY_OVERRIDE_SLACK_DAYS,
  LOCAL_DAY_SLACK_MS,
  OCCURRED_AT_MAX_AGE_MS,
} from '../dto/activity.dto';

/**
 * Task 1.5 — the daily rollup and the streak projection.
 *
 * Frozen contract: `docs/contracts/activity-api.md` §2.4–§2.8. Where this file
 * and that document disagree, the document is right and this file is a bug.
 *
 * Two jobs, deliberately separable:
 *
 *  1. `computeDailyRollup` turns one (user, faith, localDay)'s events into a
 *     `DailyRollup` — counts, points, goalMet.
 *  2. `projectStreak` turns a user's rollups into a `StreakState`.
 *
 * Both are **pure functions of the event stream plus the effective-dated
 * goal**. Nothing they write is an input to anything they read, which is the
 * property Task 1.5's replay test asserts directly: delete every rollup,
 * recompute, and the state is bit-identical. That property is the entire
 * justification for storing events rather than counters, and it is false the
 * moment a rollup reads its own previous value.
 *
 * `StreakState.longest` is the one exception, and a contained one: it is
 * `max(computed, persisted)` because §2.5 says it never decreases. The
 * computed half is still a pure function of the rollups, so a full rebuild
 * from an empty `streak_states` table reproduces it exactly.
 *
 * ## Day arithmetic is UTC-only, on purpose
 *
 * Every date in this file is a `YYYY-MM-DD` string or a `Date` at **UTC
 * midnight**, and every step/compare goes through `Date.UTC`. `localDay` is
 * stamped by the device (§2.1) and `timezone` is stored but never consulted
 * (§2.2) — so once a day is a calendar date, no zone is involved and none may
 * be reintroduced. This is not pedantry: use local-time `Date` methods and
 * 2026-10-25 in Europe/London is 25 hours long, `+ 86_400_000` lands back on
 * the same date, and a user loses a day off a streak they actually earned.
 */

/** The computed form of one `DailyRollup` row. `localDay` is `YYYY-MM-DD`. */
export interface RollupSnapshot {
  userId: string;
  faithId: FaithId;
  localDay: string;
  /** `activityType` -> summed `quantity`. §5.3: zero totals are absent keys. */
  counts: Record<string, number>;
  /** §2.9 — weighting is undecided until Phase 3; always 0 in Phase 1. */
  points: number;
  goalMet: boolean;
}

/** The computed form of one `StreakState` row. Dates are `YYYY-MM-DD`. */
export interface StreakSnapshot {
  current: number;
  longest: number;
  lastGoalMetDay: string | null;
  freezesLeft: number;
  freezeResetOn: string;
}

/**
 * What `GET /today` needs out of one refresh: the streak, today's rollup and
 * the goal in force today.
 *
 * Bundled rather than fetched by three more calls because all three fall out
 * of the same window rebuild. `/today` used to follow `rebuildRecent` with a
 * fresh `computeDailyRollup` and a fresh `findGoalInForce` — five round trips
 * for values the rebuild had just computed and thrown away.
 */
export interface TodayProjection {
  streak: StreakSnapshot;
  day: RollupSnapshot;
  goal: { goalType: string; target: number } | null;
}

/** A `user_goals` row reduced to what the rollup reads. */
interface GoalRow {
  goalType: string;
  target: number;
  effectiveFrom: Date | string;
}

/** An `activity_events` row reduced to what the rollup reads. */
interface EventRow {
  activityType: string;
  quantity: unknown;
  localDay: Date | string;
}

/** A persisted `daily_rollups` row, as the diff below compares it. */
interface RollupRow {
  localDay: Date | string;
  counts: unknown;
  points: number;
  goalMet: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * How far back a **read** rebuilds before it stops rewriting rows that cannot
 * have changed. `rebuildRecent` uses it; `rebuildAll` does not.
 *
 * ## Why a bound exists at all
 *
 * `rebuildAll` upserts every day from the user's first event through today.
 * On `GET /today` — the app's primary screen, on a serverless function
 * against a small pg pool — a two-year-old account is ~730 sequential upserts
 * per load, and 729 of them rewrite a row to the value it already held.
 *
 * ## Why a day outside the window cannot change
 *
 * A computed day's value is a function of exactly two things: the events
 * stamped with that `localDay`, and the `UserGoal` row in force on it.
 *
 *  - **Events.** §2.3 rejects an `occurredAt` more than 90 days before server
 *    receipt, and §2.2 allows `localDay` to sit at most one day either side of
 *    that instant's UTC date. So the oldest `localDay` any future ingest can
 *    ever produce is 91 days before the day it is received on.
 *  - **Goals.** §7.4 makes a goal change effective from the user's *current*
 *    `localDay` forward and never earlier, so no `PUT /goal` can alter the
 *    goal in force on a day already behind the anchor.
 *
 * The two remaining terms convert "days before server receipt" into "days
 * before the anchor `/today` passes in", which is a *local* day: it may lead
 * the server's UTC date by one (§5.2), and §5.1 lets the client move it one
 * further back. 90 + 1 + 1 + 1 = 93, written below as that sum so the
 * derivation survives a change to any of its terms rather than rotting into a
 * literal. For scale, §6.2 already lets `/history` rebuild a 92-day window
 * (`HISTORY_MAX_DAYS`) on demand, so this is not a new order of work.
 *
 * ## What this does NOT weaken
 *
 * `projectStreak` reads **every** persisted rollup with no date filter, so
 * days outside the window keep contributing their met-days exactly as before.
 * They merely stop being rewritten. The streak is unchanged — asserted
 * directly over a 200-day run in `rollup.service.spec.ts`.
 *
 * ## What it does narrow — read this before deleting `daily_rollups`
 *
 * Recovery from an **emptied** `daily_rollups` table must go through
 * `rebuildAll`, never through a `/today` load. A `/today` load on a cold table
 * now restores only the trailing window, so a 400-day streak would come back
 * as 93. That is the one property this bound costs, and `rebuildAll` is kept —
 * unbounded, tested by the replay spec — precisely so the cost is recoverable
 * rather than paid.
 *
 * The operator entry point is `POST /api/v1/maintenance/activity/rebuild`
 * (`RollupCronService.runFullRebuild`). The nightly `rollup` route is **not**
 * an alternative however large its `lookbackDays`: it enumerates pairs with a
 * recent-activity floor, so a dormant account is never visited, and it writes
 * only days that have already closed.
 */
export const TODAY_REBUILD_WINDOW_DAYS =
  OCCURRED_AT_MAX_AGE_MS / DAY_MS + // §2.3 — the oldest occurredAt ingest accepts
  LOCAL_DAY_SLACK_MS / DAY_MS + //    §2.2 — localDay may sit a day below it
  1 + //                              §5.2 — the user's localDay may lead UTC
  LOCAL_DAY_OVERRIDE_SLACK_DAYS; //   §5.1 — the client may move the anchor back

@Injectable()
export class RollupService {
  private readonly logger = new Logger(RollupService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------- rollups

  /**
   * Compute one day's rollup from its events and the goal in force on it.
   *
   * Reads nothing it has written: not the existing `DailyRollup` row, not
   * yesterday's, not the `StreakState`. Calling this twice on an unchanged
   * event stream must return the same object, and it is the only reason
   * `rebuildRange` below can be run at any time without consequence.
   */
  async computeDailyRollup(
    userId: string,
    faithId: FaithId,
    localDay: string,
  ): Promise<RollupSnapshot> {
    const day = toUtcMidnight(localDay);

    const events = await this.prisma.activityEvent.findMany({
      where: { userId, faithId, localDay: day },
    });

    // §2.4 — SUM(quantity), never COUNT(events). Reading 12 verses in one
    // event and in twelve events must be indistinguishable here, because to
    // the user they are the same act of worship logged with different
    // granularity. A count would make the Qur'an reader's batching strategy
    // silently change whether a goal is met.
    const counts: Record<string, number> = {};
    for (const event of events) {
      const quantity = typeof event.quantity === 'number' ? event.quantity : 0;
      counts[event.activityType] = (counts[event.activityType] ?? 0) + quantity;
    }
    // §5.3 — "only activity types with a non-zero total appear as keys". A
    // zero total cannot arise from the sum above (quantity >= 1), but a
    // corrected or zero-quantity row must not leave a `0` key behind.
    for (const key of Object.keys(counts)) {
      if (counts[key] === 0) delete counts[key];
    }

    const goal = await this.findGoalInForce(userId, faithId, day);

    // §2.4 — no goal means `met: false`. The server never invents a default
    // target; §7.4's consequence is explicit that 40 days of reading before a
    // goal existed are 40 closed days of `goalMet: false`.
    let goalMet = false;
    if (goal) {
      const countedActivity = GOAL_TYPE_ACTIVITY[goal.goalType];
      const progress = countedActivity ? (counts[countedActivity] ?? 0) : 0;
      goalMet = progress >= goal.target;
    }

    return { userId, faithId, localDay, counts, points: 0, goalMet };
  }

  /**
   * The goal in force on day D (§7.5, and the model comment on `UserGoal`).
   *
   *   WHERE user_id = ? AND faith_id = ? AND effective_from <= D
   *   ORDER BY effective_from DESC LIMIT 1
   *
   * Note what is NOT in the predicate: `effective_to`. This is deliberate and
   * must not be "tidied up" into the range form
   * `AND (effective_to IS NULL OR effective_to > D)`.
   *
   * `PUT /goal` closes the open row and inserts the new one in a transaction.
   * If that transaction ever fails to be one — a crash between the two
   * statements, a future code path that forgets the wrapper — the range form
   * returns **zero rows** for every day after the close. Zero rows reads as
   * "no goal", which reads as `goalMet: false`, which silently ends a
   * 90-day streak with nothing logged and nothing to see in the data.
   *
   * The ORDER BY form cannot do that. It is total (any day on or after the
   * first goal has an answer) and single-valued
   * (`@@unique([userId, faithId, effectiveFrom])` guarantees the sort can
   * never tie), whatever state `effective_to` is in. While Phase 1 has no goal
   * deletion, `effective_to` is bookkeeping and correctness never depends on
   * it.
   *
   * Returning null for a day before the user's first goal is the right answer,
   * not a failure: §7.4 says the streak begins on the first day the user both
   * has a goal and meets it.
   */
  /*
   * Public, deliberately. Task 1.6's `/today` and `PUT /goal` both have to
   * report `goalType` and `target`, which `computeDailyRollup` does not
   * return. Exposing this one method is the alternative to a second
   * `userGoal.findFirst` somewhere else in the module — and a second copy of
   * the lookup is exactly what the warning above is about, because the copy
   * would not carry the warning.
   */
  async findGoalInForce(
    userId: string,
    faithId: FaithId,
    day: Date | string,
  ): Promise<{ goalType: string; target: number } | null> {
    const goal = await this.prisma.userGoal.findFirst({
      where: {
        userId,
        faithId,
        effectiveFrom: { lte: typeof day === 'string' ? toUtcMidnight(day) : day },
      },
      orderBy: { effectiveFrom: 'desc' },
    });
    return goal ?? null;
  }

  /**
   * Compute one day and write it to `daily_rollups`.
   *
   * Two round trips to read plus one to write, per day. Fine for a single day
   * — `PUT /goal` re-evaluating today — and the reason `rebuildRange` below
   * does **not** call it in a loop: N days through here is 3N sequential
   * round trips, which is what made `GET /today` take three seconds.
   */
  async persistDailyRollup(
    userId: string,
    faithId: FaithId,
    localDay: string,
  ): Promise<RollupSnapshot> {
    const snapshot = await this.computeDailyRollup(userId, faithId, localDay);
    await this.writeRollup(snapshot);
    return snapshot;
  }

  private async writeRollup(snapshot: RollupSnapshot): Promise<void> {
    const key = {
      userId: snapshot.userId,
      faithId: snapshot.faithId,
      localDay: toUtcMidnight(snapshot.localDay),
    };
    const value = {
      counts: snapshot.counts,
      points: snapshot.points,
      goalMet: snapshot.goalMet,
    };
    await this.prisma.dailyRollup.upsert({
      where: { userId_faithId_localDay: key },
      create: { ...key, ...value },
      update: value,
    });
  }

  /**
   * Recompute and persist every day in `[from, to]` inclusive.
   *
   * Dense on purpose — a day with no events still gets a row, because §6.3
   * requires `/history` to return a cell for every day and a rollup that
   * exists only for active days would make "absent" ambiguous between "no
   * activity" and "not computed yet".
   *
   * ## Why this is three queries and not three per day
   *
   * It used to be `for (day of range) await persistDailyRollup(day)`, which is
   * an event query, a goal query and an upsert **per day**: a 93-day `/today`
   * was 282 sequential round trips against a `max: 10` pool from a serverless
   * function, and a 28-day `/history` was 84. The window bound that preceded
   * this change made that number look reasonable without changing its shape.
   *
   * The shape is now flat in the window:
   *
   *  1. every event in `[from, to]` in one query, grouped by `localDay`;
   *  2. every goal effective on or before `to` in one query, walked with a
   *     pointer as the days advance;
   *  3. every existing rollup row in the window in one query, so that days
   *     whose value has not moved are not rewritten.
   *
   * The three are issued together, so the read is one round trip's latency
   * rather than three. Writes are then only the days that genuinely differ —
   * on a steady-state `/today` that is zero or one.
   */
  async rebuildRange(
    userId: string,
    faithId: FaithId,
    from: string,
    to: string,
  ): Promise<RollupSnapshot[]> {
    const lo = toUtcMidnight(from);
    const hi = toUtcMidnight(to);

    const [events, goals, existing] = await Promise.all([
      this.prisma.activityEvent.findMany({
        where: { userId, faithId, localDay: { gte: lo, lte: hi } },
      }),
      this.prisma.userGoal.findMany({
        where: { userId, faithId, effectiveFrom: { lte: hi } },
        orderBy: { effectiveFrom: 'asc' },
      }),
      this.prisma.dailyRollup.findMany({
        where: { userId, faithId, localDay: { gte: lo, lte: hi } },
      }),
    ]);

    const snapshots = computeRange(userId, faithId, from, to, groupByDay(events), goals);
    await this.writeChanged(snapshots, existing);
    return snapshots;
  }

  /**
   * Upsert only the days whose computed value differs from what is stored.
   *
   * §2.8 asks for days to be *computed* on read; it does not ask for a row to
   * be rewritten to the value it already holds. Most days in a trailing window
   * have no events and an identical rollup already, so the steady-state read
   * path writes nothing at all. `computed_at` stops moving for those days,
   * which is correct — nothing about them was recomputed into a new value —
   * and nothing reads it (it is not in any §5/§6/§7 response).
   *
   * Issued together rather than in sequence: these are distinct primary keys
   * with no ordering between them, exactly as the per-day loop's upserts were.
   */
  private async writeChanged(
    snapshots: RollupSnapshot[],
    existing: RollupRow[],
  ): Promise<void> {
    const stored = new Map(existing.map((row) => [toDayKey(row.localDay), row]));
    const changed = snapshots.filter((s) => !isUnchanged(s, stored.get(s.localDay)));
    if (!changed.length) return;
    await Promise.all(changed.map((snapshot) => this.writeRollup(snapshot)));
  }

  /**
   * Rebuild every day the user has ever had, from their first event through
   * `today`, then reproject the streak. This is the replay entry point: it
   * reads only `activity_events` and `user_goals`, so it is correct against an
   * empty `daily_rollups` table and idempotent against a full one.
   *
   * Deliberately unbounded, and deliberately **not** what `GET /today` calls —
   * see `rebuildRecent`. Keeping this one whole is what makes the bound on the
   * read path recoverable: drop `daily_rollups` and this restores it exactly,
   * which is the property the replay spec asserts and the reason the engine
   * stores events rather than counters.
   */
  async rebuildAll(
    userId: string,
    faithId: FaithId,
    today: string,
  ): Promise<StreakSnapshot> {
    return (await this.refresh(userId, faithId, today, null)).streak;
  }

  /**
   * `rebuildAll`, floored at `today - windowDays`: the read path's version.
   *
   * Identical in every respect but where the rebuild starts. Days older than
   * the floor are not recomputed, because nothing can change them — see
   * `TODAY_REBUILD_WINDOW_DAYS` for the derivation — and the streak is
   * projected over **every** persisted rollup regardless of the window, so
   * their met-days still count toward the streak.
   *
   * This is what `GET /today` calls, and it is **not** a recovery path:
   * rebuilding an emptied `daily_rollups` table needs `rebuildAll`, which is
   * kept unbounded for exactly that.
   */
  async rebuildRecent(
    userId: string,
    faithId: FaithId,
    today: string,
    windowDays: number = TODAY_REBUILD_WINDOW_DAYS,
  ): Promise<StreakSnapshot> {
    return (await this.projectToday(userId, faithId, today, windowDays)).streak;
  }

  /**
   * `rebuildRecent`, also handing back the two values `GET /today` would
   * otherwise re-query: today's rollup and the goal in force today.
   *
   * Both are by-products of the window rebuild. `/today` used to follow the
   * rebuild with `computeDailyRollup` (two round trips) and `findGoalInForce`
   * (one more) for exactly the values the rebuild had already computed.
   */
  async projectToday(
    userId: string,
    faithId: FaithId,
    today: string,
    windowDays: number = TODAY_REBUILD_WINDOW_DAYS,
  ): Promise<TodayProjection> {
    return this.refresh(userId, faithId, today, addDays(today, -windowDays));
  }

  /**
   * The body every entry point shares: rebuild `[max(firstEventDay, floor),
   * today]`, project the streak, and persist whatever actually changed.
   * `floor` of `null` means "no floor" — the user's whole history.
   *
   * ## Why the reads are one batch and the writes are another
   *
   * Nothing read here is written here *before* it is read: the window's
   * events, the goals, the persisted rollups and the persisted `StreakState`
   * are all inputs, and the rebuild is a pure function of them. That is the
   * same property the replay test asserts, and it is what lets the five reads
   * go out together instead of in series. Against a serverless function whose
   * round trip to RDS dominates everything else, five queries in one batch
   * cost one round trip and five queries in sequence cost five.
   *
   * The streak is then projected over the persisted rollups **with this
   * window's freshly computed days laid over them**, rather than by re-reading
   * `daily_rollups` after writing. The two are the same set by construction —
   * the overlay holds exactly the values the write would have stored — and
   * this way the read does not have to wait for the write.
   */
  private async refresh(
    userId: string,
    faithId: FaithId,
    today: string,
    floor: string | null,
  ): Promise<TodayProjection> {
    const hi = toUtcMidnight(today);
    const lo = floor ? toUtcMidnight(floor) : null;

    const [first, events, goals, persisted, existingStreak] = await Promise.all([
      // Still consulted when a floor is set, so a user who joined last week
      // gets one row rather than a window's worth of empty days. §6.3's
      // density requirement is `/history`'s, and `history()` rebuilds its own
      // range.
      this.prisma.activityEvent.findFirst({
        where: { userId, faithId },
        orderBy: { localDay: 'asc' },
      }),
      this.prisma.activityEvent.findMany({
        where: {
          userId,
          faithId,
          localDay: lo ? { gte: lo, lte: hi } : { lte: hi },
        },
      }),
      this.prisma.userGoal.findMany({
        where: { userId, faithId, effectiveFrom: { lte: hi } },
        orderBy: { effectiveFrom: 'asc' },
      }),
      // No date filter, exactly as before: days outside the window keep
      // contributing their met-days to the streak, they merely stop being
      // recomputed and rewritten.
      this.prisma.dailyRollup.findMany({
        where: { userId, faithId },
        orderBy: { localDay: 'asc' },
      }),
      this.prisma.streakState.findUnique({
        where: { userId_faithId: { userId, faithId } },
      }),
    ]);

    const eventsByDay = groupByDay(events);
    const goal = goalInForce(goals, today);

    let days: RollupSnapshot[] = [];
    if (first) {
      const firstDay = toDayKey(first.localDay);
      const from = floor && floor > firstDay ? floor : firstDay;
      // A user whose only events are stamped in the future (clock tampering is
      // accepted per §2.2) must not make this range run backwards.
      if (from <= today) {
        days = computeRange(userId, faithId, from, today, eventsByDay, goals);
      }
    }

    // `days` always ends on `today` when it is non-empty, because the range is
    // `[from, today]`. The fallback covers the user with no events at all, who
    // gets an empty day computed but — as before — no row written for it.
    const day =
      days.length && days[days.length - 1].localDay === today
        ? days[days.length - 1]
        : rollupFrom(userId, faithId, today, eventsByDay.get(today) ?? [], goal);

    const streak = this.streakFrom(today, persisted, days, existingStreak);

    await Promise.all([
      this.writeChanged(days, persisted),
      this.writeStreakState(userId, faithId, streak),
    ]);

    return { streak, day, goal };
  }

  // ---------------------------------------------------------------- streaks

  /**
   * Project `StreakState` from the persisted rollups, and write it.
   *
   * `today` is the user's current `localDay` (§5.2 derives it from the
   * request's `timezone`; Task 1.6 passes it in). The projection genuinely
   * depends on it — see the trailing-gap rule in `computeStreak` — so the
   * persisted `StreakState` is a cache of "as of that day" and is expected to
   * be recomputed on read rather than trusted indefinitely.
   */
  async projectStreak(
    userId: string,
    faithId: FaithId,
    today: string,
  ): Promise<StreakSnapshot> {
    const [rollups, existing] = await Promise.all([
      this.prisma.dailyRollup.findMany({
        where: { userId, faithId },
        orderBy: { localDay: 'asc' },
      }),
      this.prisma.streakState.findUnique({
        where: { userId_faithId: { userId, faithId } },
      }),
    ]);

    const snapshot = this.streakFrom(today, rollups, [], existing);
    await this.writeStreakState(userId, faithId, snapshot);
    return snapshot;
  }

  /**
   * The projection itself, over persisted rows plus any freshly computed days
   * laid on top of them.
   *
   * `computed` wins over `persisted` for the same day, because it is what the
   * accompanying write stores. Passing it in rather than re-reading
   * `daily_rollups` after the write is what keeps the whole refresh to two
   * round trips; the result is identical either way, which is the point.
   */
  private streakFrom(
    today: string,
    persisted: Array<{ localDay: Date | string; goalMet: boolean }>,
    computed: RollupSnapshot[],
    existing: { longest: number } | null,
  ): StreakSnapshot {
    const metByDay = new Map<string, boolean>();
    for (const row of persisted) metByDay.set(toDayKey(row.localDay), row.goalMet);
    for (const snapshot of computed) metByDay.set(snapshot.localDay, snapshot.goalMet);

    const metDays = [...metByDay.entries()]
      .filter(([, met]) => met)
      .map(([day]) => day)
      // Future rollups must not count toward a streak that is "as of today",
      // and must not be able to become the anchor.
      .filter((day) => day <= today)
      .sort();

    const projected = computeStreak(metDays, today);

    // §2.5 — `longest` never decreases. Everything else is recomputed outright,
    // so a wrong cached value self-heals on the next projection.
    return { ...projected, longest: Math.max(projected.longest, existing?.longest ?? 0) };
  }

  private async writeStreakState(
    userId: string,
    faithId: FaithId,
    snapshot: StreakSnapshot,
  ): Promise<void> {
    const value = {
      current: snapshot.current,
      longest: snapshot.longest,
      lastGoalMetDay: snapshot.lastGoalMetDay
        ? toUtcMidnight(snapshot.lastGoalMetDay)
        : null,
      freezesLeft: snapshot.freezesLeft,
      freezeResetOn: toUtcMidnight(snapshot.freezeResetOn),
    };
    await this.prisma.streakState.upsert({
      where: { userId_faithId: { userId, faithId } },
      create: { userId, faithId, ...value },
      update: value,
    });
  }
}

// ---------------------------------------------------------------------------
// The range rebuild, as pure functions of rows already fetched.
// ---------------------------------------------------------------------------

/** Events keyed by their `localDay`, so a window is grouped once, not re-queried daily. */
function groupByDay(events: EventRow[]): Map<string, EventRow[]> {
  const byDay = new Map<string, EventRow[]>();
  for (const event of events) {
    const key = toDayKey(event.localDay);
    const bucket = byDay.get(key);
    if (bucket) bucket.push(event);
    else byDay.set(key, [event]);
  }
  return byDay;
}

/**
 * The goal in force on `day`, from goals already fetched (§7.5).
 *
 * The in-memory twin of `RollupService.findGoalInForce`, and it must stay one:
 * the latest `effectiveFrom <= day`, with **no `effectiveTo` predicate**. Read
 * that method's comment before changing this — the range form
 * `effective_to IS NULL OR effective_to > D` returns nothing at all for every
 * day after a close that lost its insert, which reads as "no goal", which
 * silently ends a streak with nothing in the logs.
 *
 * `goals` must be ascending by `effectiveFrom`. `@@unique([userId, faithId,
 * effectiveFrom])` guarantees the order can never tie, so "the last one at or
 * before `day`" is single-valued, exactly as the `ORDER BY ... DESC LIMIT 1`
 * it replaces.
 */
function goalInForce(
  goals: GoalRow[],
  day: string,
): { goalType: string; target: number } | null {
  let found: GoalRow | null = null;
  for (const goal of goals) {
    if (toDayKey(goal.effectiveFrom) > day) break;
    found = goal;
  }
  return found ? { goalType: found.goalType, target: found.target } : null;
}

/** One day's `RollupSnapshot` from its events and the goal in force on it. */
function rollupFrom(
  userId: string,
  faithId: FaithId,
  localDay: string,
  events: EventRow[],
  goal: { goalType: string; target: number } | null,
): RollupSnapshot {
  // §2.4 — SUM(quantity), never COUNT(events). Reading 12 verses in one
  // event and in twelve events must be indistinguishable here, because to
  // the user they are the same act of worship logged with different
  // granularity. A count would make the Qur'an reader's batching strategy
  // silently change whether a goal is met.
  const counts: Record<string, number> = {};
  for (const event of events) {
    const quantity = typeof event.quantity === 'number' ? event.quantity : 0;
    counts[event.activityType] = (counts[event.activityType] ?? 0) + quantity;
  }
  // §5.3 — "only activity types with a non-zero total appear as keys". A
  // zero total cannot arise from the sum above (quantity >= 1), but a
  // corrected or zero-quantity row must not leave a `0` key behind.
  for (const key of Object.keys(counts)) {
    if (counts[key] === 0) delete counts[key];
  }

  // §2.4 — no goal means `met: false`. The server never invents a default
  // target; §7.4's consequence is explicit that 40 days of reading before a
  // goal existed are 40 closed days of `goalMet: false`.
  let goalMet = false;
  if (goal) {
    const countedActivity = GOAL_TYPE_ACTIVITY[goal.goalType];
    const progress = countedActivity ? (counts[countedActivity] ?? 0) : 0;
    goalMet = progress >= goal.target;
  }

  return { userId, faithId, localDay, counts, points: 0, goalMet };
}

/**
 * Every day in `[from, to]`, dense, from rows already fetched.
 *
 * `goals` is walked with a forward pointer rather than searched per day: the
 * days ascend and so do the goals, so the whole range costs one pass over a
 * list that is almost always one element long.
 */
function computeRange(
  userId: string,
  faithId: FaithId,
  from: string,
  to: string,
  eventsByDay: Map<string, EventRow[]>,
  goals: GoalRow[],
): RollupSnapshot[] {
  const snapshots: RollupSnapshot[] = [];
  let next = 0;
  let inForce: { goalType: string; target: number } | null = null;

  for (let day = from; day <= to; day = addDays(day, 1)) {
    while (next < goals.length && toDayKey(goals[next].effectiveFrom) <= day) {
      inForce = { goalType: goals[next].goalType, target: goals[next].target };
      next += 1;
    }
    snapshots.push(
      rollupFrom(userId, faithId, day, eventsByDay.get(day) ?? [], inForce),
    );
  }
  return snapshots;
}

/**
 * Is a computed day already stored with exactly this value?
 *
 * The three fields are the whole of what `writeRollup` writes. `computedAt` is
 * deliberately not compared: it is the timestamp of the last write, so
 * including it would make every day differ from itself and the skip would
 * never fire.
 */
function isUnchanged(snapshot: RollupSnapshot, stored: RollupRow | undefined): boolean {
  if (!stored) return false;
  if (stored.goalMet !== snapshot.goalMet) return false;
  if (stored.points !== snapshot.points) return false;
  return sameCounts(stored.counts, snapshot.counts);
}

/** `counts` is a JSON column, so it comes back as an untyped value. */
function sameCounts(stored: unknown, computed: Record<string, number>): boolean {
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return false;
  const left = stored as Record<string, unknown>;
  const keys = Object.keys(left);
  if (keys.length !== Object.keys(computed).length) return false;
  return keys.every((key) => left[key] === computed[key]);
}

// ---------------------------------------------------------------------------
// The streak rules (§2.5, §2.6), as one pure function.
// ---------------------------------------------------------------------------

/**
 * Project a streak from the ascending list of goal-met days.
 *
 * Exported and pure so that the rules the mobile client duplicates in Task
 * 1.10 can be read, tested and ported without a database in the way.
 *
 * ## The shape of the algorithm, and why it is a forward scan
 *
 * §2.5 describes a backward walk from the most recent goal-met day. A single
 * forward scan over the met days computes the same thing and is strictly
 * better behaved in two places:
 *
 *  - Gaps **before the user's first goal-met day** are never examined, so a
 *    brand-new user's streak cannot spend freezes bridging prehistory.
 *  - Freeze consumption is deterministic in one direction, which is what makes
 *    the replay test's deep-equality meaningful rather than lucky.
 *
 * ## Lazy freezes (§2.6), stated precisely
 *
 * A freeze is charged only by a gap day that actually **bridges** — one with a
 * goal-met day on both sides. The gap between the last goal-met day and today
 * is never charged, which is exactly the contract's worked example: on the
 * morning of Oct 27 after missing Oct 26, the user sees `25` and
 * `freezesLeft: 2`; when they meet the goal that evening they see `26` and
 * `freezesLeft: 1`. The eager implementation shows `1` all morning and then
 * gets overridden on the next sync (§2.7) — the user watches their freeze
 * count change for no reason.
 *
 * A frozen day **bridges but does not count**. Oct 1–25 met, Oct 26 frozen,
 * Oct 27 met is `26`, not `27`; §6.3 says the same from the other side ("a
 * frozen day shows `goalMet: false` and the streak still survives it").
 *
 * ## Two rules the contract does not state, resolved here
 *
 * Both are flagged in the Task 1.5 report; the mobile engine must match them.
 *
 *  1. **Which month pays.** "Two per calendar month" plus a run that crosses a
 *     month boundary is ambiguous. Each gap day is charged to the allowance of
 *     **the calendar month that gap day falls in**. The alternative — one
 *     running budget — makes two freezes bridge arbitrarily long gaps anywhere
 *     in history, and streaks become effectively unbreakable.
 *  2. **The trailing gap.** §2.5 also says the streak is `0` "when the most
 *     recent goal-met day is further back than freezes can bridge", which
 *     looks like it contradicts the lazy rule. It does not, once *bridgeable*
 *     and *charged* are separated: the trailing gap is **tested** for
 *     payability (an unpayable one means the streak is already dead and the
 *     client must render it as broken) but is **not charged** until a later
 *     goal-met day actually completes the bridge. Without the test, a user who
 *     last met their goal in 2024 would be shown a live 47-day streak.
 *     Payability is tested against what remains after in-run spending, so
 *     "with no freezes left, a gap breaks the streak" (§2.6) holds.
 */
export function computeStreak(metDays: string[], today: string): StreakSnapshot {
  const freezeResetOn = firstDayOfNextMonth(today);

  if (!metDays.length) {
    return {
      current: 0,
      longest: 0,
      lastGoalMetDay: null,
      freezesLeft: FREEZES_PER_MONTH,
      freezeResetOn,
    };
  }

  // Remaining freeze allowance, keyed by the `YYYY-MM` of the day being
  // bridged. Absent means the full monthly grant is untouched.
  const remaining = new Map<string, number>();
  const remainingFor = (day: string): number =>
    remaining.get(monthKey(day)) ?? FREEZES_PER_MONTH;

  /**
   * Pay for a whole gap, or pay for none of it. All-or-nothing matters: a
   * freeze that is spent and then fails to complete the bridge has bought the
   * user nothing, and charging for it would quietly cost them a freeze they
   * could have used the next day.
   */
  const payFor = (gapDays: string[], commit: boolean): boolean => {
    const needed = new Map<string, number>();
    for (const day of gapDays) {
      const month = monthKey(day);
      needed.set(month, (needed.get(month) ?? 0) + 1);
    }
    for (const [month, need] of needed) {
      if ((remaining.get(month) ?? FREEZES_PER_MONTH) < need) return false;
    }
    if (commit) {
      for (const [month, need] of needed) {
        remaining.set(month, (remaining.get(month) ?? FREEZES_PER_MONTH) - need);
      }
    }
    return true;
  };

  let runLength = 1;
  let longest = 1;

  for (let i = 1; i < metDays.length; i += 1) {
    const previous = metDays[i - 1];
    const day = metDays[i];
    const gap = daysBetween(previous, day) - 1;

    if (gap === 0) {
      runLength += 1;
    } else if (payFor(daysInRange(addDays(previous, 1), addDays(day, -1)), true)) {
      // Bridged. The frozen days themselves add nothing to the length.
      runLength += 1;
    } else {
      // §2.6 — with no freezes left, a gap breaks the streak. `longest` is
      // preserved; the new run starts at this day.
      runLength = 1;
    }
    if (runLength > longest) longest = runLength;
  }

  const lastGoalMetDay = metDays[metDays.length - 1];

  // §2.5 — `current` includes today if and only if today is goal-met, and that
  // falls out of the anchor being the most recent goal-met day: when today is
  // met it IS the anchor and is counted; when it is not, it is the trailing
  // gap's first day and is never examined. There is no separate flag.
  const trailing = daysInRange(addDays(lastGoalMetDay, 1), addDays(today, -1));
  const alive = trailing.length === 0 || payFor(trailing, false);

  return {
    current: alive ? runLength : 0,
    longest,
    lastGoalMetDay,
    // §2.6 — reported after freezes already consumed this month, and excluding
    // today, which is not a gap until it is over. The trailing gap was tested
    // with `commit: false`, so nothing it would need has been deducted.
    freezesLeft: Math.max(0, Math.min(FREEZES_PER_MONTH, remainingFor(today))),
    freezeResetOn,
  };
}

// ---------------------------------------------------------------------------
// Calendar-date arithmetic. UTC only — see the file header for why.
// ---------------------------------------------------------------------------

/** `YYYY-MM-DD` -> a `Date` at UTC midnight, matching what ingest stores. */
export function toUtcMidnight(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

/** A `@db.Date` column value (or a `YYYY-MM-DD` string) -> `YYYY-MM-DD`. */
export function toDayKey(value: Date | string): string {
  if (typeof value === 'string') return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

/** Step whole calendar days. `Date.UTC` normalises month and year overflow. */
export function addDays(day: string, delta: number): string {
  return new Date(toUtcMidnight(day).getTime() + delta * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

/** Calendar days from `from` to `to`; negative if `to` precedes `from`. */
export function daysBetween(from: string, to: string): number {
  return Math.round((toUtcMidnight(to).getTime() - toUtcMidnight(from).getTime()) / DAY_MS);
}

/** Every day in `[from, to]` inclusive; empty when `to` precedes `from`. */
function daysInRange(from: string, to: string): string[] {
  const days: string[] = [];
  for (let day = from; day <= to; day = addDays(day, 1)) days.push(day);
  return days;
}

/** The `YYYY-MM` a day belongs to — the key the freeze allowance is held under. */
function monthKey(day: string): string {
  return day.slice(0, 7);
}

/** §2.6 — `freezeResetOn`: the first day of the next calendar month. */
function firstDayOfNextMonth(day: string): string {
  const year = Number(day.slice(0, 4));
  const month = Number(day.slice(5, 7));
  return new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
}
