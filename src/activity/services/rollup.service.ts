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

  /** Compute one day and write it to `daily_rollups`. */
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
   */
  async rebuildRange(
    userId: string,
    faithId: FaithId,
    from: string,
    to: string,
  ): Promise<RollupSnapshot[]> {
    const snapshots: RollupSnapshot[] = [];
    for (let day = from; day <= to; day = addDays(day, 1)) {
      snapshots.push(await this.persistDailyRollup(userId, faithId, day));
    }
    return snapshots;
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
    return this.rebuildSince(userId, faithId, today, null);
  }

  /**
   * `rebuildAll`, floored at `today - windowDays`: the read path's version.
   *
   * Identical in every respect but where the rebuild starts. Days older than
   * the floor are not recomputed, because nothing can change them — see
   * `TODAY_REBUILD_WINDOW_DAYS` for the derivation — and `projectStreak` reads
   * all persisted rollups regardless of the window, so their met-days still
   * count toward the streak.
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
    return this.rebuildSince(userId, faithId, today, addDays(today, -windowDays));
  }

  /**
   * The body both entry points share: rebuild `[max(firstEventDay, floor),
   * today]` and project. `floor` of `null` means "no floor" — the user's whole
   * history.
   */
  private async rebuildSince(
    userId: string,
    faithId: FaithId,
    today: string,
    floor: string | null,
  ): Promise<StreakSnapshot> {
    // Still consulted when a floor is set, so a user who joined last week gets
    // one row rather than a window's worth of empty days. §6.3's density
    // requirement is `/history`'s, and `history()` rebuilds its own range.
    const first = await this.prisma.activityEvent.findFirst({
      where: { userId, faithId },
      orderBy: { localDay: 'asc' },
    });

    if (first) {
      const firstDay = toDayKey(first.localDay);
      const from = floor && floor > firstDay ? floor : firstDay;
      // A user whose only events are stamped in the future (clock tampering is
      // accepted per §2.2) must not make this loop run backwards forever.
      if (from <= today) await this.rebuildRange(userId, faithId, from, today);
    }

    return this.projectStreak(userId, faithId, today);
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
    const rollups = await this.prisma.dailyRollup.findMany({
      where: { userId, faithId },
      orderBy: { localDay: 'asc' },
    });

    const metDays = rollups
      .filter((r) => r.goalMet)
      .map((r) => toDayKey(r.localDay))
      // Future rollups must not count toward a streak that is "as of today",
      // and must not be able to become the anchor.
      .filter((day) => day <= today)
      .sort();

    const computed = computeStreak(metDays, today);

    const existing = await this.prisma.streakState.findUnique({
      where: { userId_faithId: { userId, faithId } },
    });

    // §2.5 — `longest` never decreases. Everything else is recomputed outright,
    // so a wrong cached value self-heals on the next projection.
    const snapshot: StreakSnapshot = {
      ...computed,
      longest: Math.max(computed.longest, existing?.longest ?? 0),
    };

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

    return snapshot;
  }
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
