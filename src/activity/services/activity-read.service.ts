import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/utils/prisma.service';
import { RollupService, toDayKey, toUtcMidnight, daysBetween } from './rollup.service';
import { activityError } from '../activity-errors';
import {
  ACTIVITY_TYPE_FAITH,
  FAITH_IDS,
  FaithId,
  GOAL_TARGET_MAX,
  GOAL_TARGET_MIN,
  GOAL_TYPE_ACTIVITY,
  GoalResponse,
  HISTORY_MAX_DAYS,
  HistoryResponse,
  LOCAL_DAY_OVERRIDE_SLACK_DAYS,
  SetGoalDto,
  TodayGoal,
  TodayResponse,
  isIanaZone,
  isRealCalendarDate,
  localDayIn,
} from '../dto/activity.dto';

/**
 * Task 1.6 — the activity read path and the goal upsert.
 *
 * Frozen contract: `docs/contracts/activity-api.md` §5 (`GET /today`), §6
 * (`GET /history`) and §7 (`PUT /goal`). Where this file and that document
 * disagree, the document is right and this file is a bug.
 *
 * Everything here is a projection over `activity_events` and the
 * effective-dated `user_goals` rows, computed through `RollupService` rather
 * than reimplemented. The one write is `PUT /goal`.
 *
 * ## Why validation is hand-rolled rather than decorated
 *
 * `main.ts` registers a **global** `ValidationPipe`, and Nest runs global
 * pipes before controller- and route-scoped ones. A `@IsInt()`/`@Max()` on the
 * goal DTO would therefore be enforced by the global pipe, which throws Nest's
 * default `{statusCode, message: string[], error}` shape; `ActivityExceptionFilter`
 * can only map that bare 400 to `code: "malformed_body"`. §7.6 promises
 * `invalid_target`, `unknown_goal_type` and `goal_type_faith_mismatch` as
 * stable codes a client may branch on, so each one is raised here explicitly.
 *
 * ## Why nothing is trusted from `streak_states`
 *
 * `StreakState` is a cache of "the streak **as of a given day**", not a
 * timeless row. `current` depends on what today is, because of §2.5's
 * trailing-gap rule: a 25-day streak that was alive last night is `0` this
 * morning if the gap behind it can no longer be bridged. A row written
 * yesterday going stale overnight is therefore expected behaviour and not a
 * bug to be worked around — `/today` recomputes on every read and lets
 * `projectStreak` rewrite the cache.
 */
@Injectable()
export class ActivityReadService {
  private readonly logger = new Logger(ActivityReadService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rollups: RollupService,
  ) {}

  /**
   * The server's wall clock, as one overridable method.
   *
   * Every "what time is it" in this file goes through here: `localDayIn` needs
   * an instant to resolve a zone against, and `PUT /goal` stamps `createdAt`
   * because `UserGoal` has no `@updatedAt`. A seam rather than bare
   * `new Date()` calls because the specs have to pin the clock to assert §5.2
   * at all — "02:00 in Kolkata is tomorrow" is not a statement that can be
   * made without choosing an instant — and jest's fake timers install the
   * whole timer API to do it, which leaves the worker with installed timers to
   * force-exit over. Task 1.7's cron will want the same seam.
   */
  protected now(): Date {
    return new Date();
  }

  // ------------------------------------------------------------------ today

  /**
   * `GET /api/v1/activity/today` (§5).
   *
   * One call for the whole Today screen: the day's counts, the goal and its
   * progress, and the streak.
   *
   * ### The order of operations matters
   *
   * `projectStreak` reads **only persisted rollups** (§2.8 allows a day to be
   * unpersisted and requires it be computed on read), and ingest writes no
   * rollups at all — it only appends events. So a bare `projectStreak` would
   * miss today entirely: a user who met their goal an hour ago would be shown
   * yesterday's streak. `rebuildAll` recomputes every day from the user's
   * first event through today and *then* projects, which is why it is the
   * entry point here rather than `projectStreak`.
   *
   * Front-sparseness (`rebuildAll` starting at the first event day rather than
   * at the dawn of time) is harmless for the streak and matters only for
   * `/history`: a day with no events can never be a goal-met day, and
   * `computeStreak`'s forward scan never examines a gap before the first
   * goal-met day. See `history()` for the case where it does matter.
   */
  async today(
    userId: string,
    faithIdRaw: unknown,
    timezoneRaw: unknown,
    localDayRaw?: unknown,
  ): Promise<TodayResponse> {
    const faithId = this.requireFaithId(faithIdRaw);
    const timezone = this.requireTimezone(timezoneRaw);

    // §5.2 — the server derives the day from the zone the device states, and
    // echoes it back so there is exactly one authority on which day is being
    // described. The client renders this, not the day it assumed.
    const derived = localDayIn(timezone, this.now());
    const localDay = this.resolveLocalDayOverride(localDayRaw, derived);

    const streak = await this.rollups.rebuildAll(userId, faithId, localDay);
    const day = await this.rollups.computeDailyRollup(userId, faithId, localDay);
    const goal = await this.buildGoal(userId, faithId, localDay, day.counts);

    return {
      faithId,
      localDay,
      timezone,
      // §5.3 — only non-zero totals appear as keys. A brand-new user gets `{}`,
      // not a map of zeroes; §5.4 makes that a 200, not a 404.
      counts: day.counts,
      // §5.4 — `null`, never a fabricated default, so the client can tell
      // "never set a goal" (prompt for one) from "set one and has not met it"
      // (render an empty ring).
      goal,
      streak: {
        current: streak.current,
        longest: streak.longest,
        freezesLeft: streak.freezesLeft,
        freezeResetOn: streak.freezeResetOn,
        lastGoalMetDay: streak.lastGoalMetDay,
      },
    };
  }

  // ---------------------------------------------------------------- history

  /**
   * `GET /api/v1/activity/history` (§6).
   *
   * ### Density is the whole point
   *
   * §6.3 requires `to - from + 1` entries, in ascending order, with no gaps:
   * the dot-grid needs a cell for every day and the server fills them so that
   * no client has to. `rebuildRange` is dense by construction — it steps the
   * calendar rather than the data — so the response is mapped straight off its
   * return value. Re-querying `daily_rollups` afterwards and assembling the
   * array from the rows would make density *incidental* (true only because the
   * rebuild happened to have run) instead of structural.
   *
   * ### Why `rebuildAll` is not enough here
   *
   * `rebuildAll` seeds from the user's **first event day**, so the table is
   * front-sparse: a day before that first event — which can legitimately have
   * a goal in force, since §7.4's worked consequence has goals and events
   * arriving in either order — gets no row at all. A `/history` window reaching
   * back before the first event would then return short, and the dot-grid
   * would silently lose its leading cells. Rebuilding exactly the requested
   * window is what guarantees the window is covered.
   *
   * ### No `timezone`, and no streak
   *
   * §6.1: `from` and `to` are already explicit local days, so there is nothing
   * to derive. §6.3: streak is one value for the user, not a per-day one, and
   * lives on `/today` — a client must read the week strip's fill from
   * `goalMet` here and the flame from `/today`, never infer one from the other
   * (a frozen day is `goalMet: false` with the streak intact).
   */
  async history(
    userId: string,
    faithIdRaw: unknown,
    fromRaw: unknown,
    toRaw: unknown,
  ): Promise<HistoryResponse> {
    const faithId = this.requireFaithId(faithIdRaw);
    const from = this.requireRangeDate(fromRaw, 'from');
    const to = this.requireRangeDate(toRaw, 'to');

    if (to < from) {
      throw activityError(
        HttpStatus.BAD_REQUEST,
        'invalid_date_range',
        `"to" (${to}) must not precede "from" (${from})`,
      );
    }

    // §6.2 — inclusive, so `from == to` is one day. Over the limit is a 400,
    // never a silent truncation: a truncated chart is wrong rather than absent,
    // and the client has no way to notice it happened.
    const span = daysBetween(from, to) + 1;
    if (span > HISTORY_MAX_DAYS) {
      throw activityError(
        HttpStatus.BAD_REQUEST,
        'range_too_large',
        `The range from ${from} to ${to} spans ${span} days; the maximum is ${HISTORY_MAX_DAYS}`,
      );
    }

    const snapshots = await this.rollups.rebuildRange(userId, faithId, from, to);

    return {
      faithId,
      from,
      to,
      days: snapshots.map((snapshot) => ({
        localDay: snapshot.localDay,
        counts: snapshot.counts,
        goalMet: snapshot.goalMet,
      })),
    };
  }

  // ------------------------------------------------------------------- goal

  /**
   * `PUT /api/v1/activity/goal` (§7).
   *
   * ### Append-only and effective-dated, in one transaction
   *
   * `UserGoal` is not one mutable row (§7.5). A goal change **closes** the open
   * row — sets its `effectiveTo` to the new row's `effectiveFrom` — and
   * **inserts** the new row, and the two statements must be one transaction.
   *
   * The reason is spelled out on `RollupService.findGoalInForce`: the in-force
   * lookup deliberately ignores `effectiveTo`, because the range form
   * `AND (effective_to IS NULL OR effective_to > D)` returns **zero rows** for
   * every subsequent day if a close ever lands without its insert. Zero rows
   * reads as "no goal", which reads as `goalMet: false`, which silently ends a
   * 90-day streak with nothing in the logs. The transaction is the guard that
   * makes that state unreachable; the `ORDER BY` lookup is the guard that
   * makes it survivable if the transaction is ever lost anyway. Both, not
   * either.
   *
   * ### A second PUT on the same day updates rather than appends
   *
   * Today has not closed, and §7.4 says the current day is re-evaluated
   * against the new goal immediately, so there is no history to preserve for
   * it. Appending a second row would also collide with
   * `@@unique([userId, faithId, effectiveFrom])`. §7.1 says a repeat PUT is a
   * no-op beyond `updatedAt`, so `createdAt` — which stands in for `updatedAt`,
   * there being no `@updatedAt` column on this model — is touched explicitly
   * on that branch; Prisma would not bump it on its own.
   */
  async setGoal(userId: string, body: SetGoalDto): Promise<GoalResponse> {
    const faithId = this.requireFaithId(body?.faithId);
    const goalType = this.requireGoalType(body?.goalType, faithId);
    const target = this.requireTarget(body?.target, goalType);

    // §7.2 — `timezone` is optional here, unlike on `/today`, and falls back to
    // the zone of the user's most recent event and then to UTC. The fallbacks
    // exist so a client that forgets the field still gets a goal that takes
    // effect on a sane day, not so clients may rely on them.
    const timezone = await this.resolveGoalTimezone(userId, body?.timezone);
    const localDay = localDayIn(timezone, this.now());
    const effectiveFrom = toUtcMidnight(localDay);

    const row = await this.prisma.$transaction(async (tx) => {
      // Ordered descending so this finds the row that is actually in force, not
      // merely some open row — the same reason `findGoalInForce` sorts.
      const latest = await tx.userGoal.findFirst({
        where: { userId, faithId },
        orderBy: { effectiveFrom: 'desc' },
      });

      // `>=` rather than `===` on purpose. A user whose device moved west
      // across a date boundary can produce a `today` *earlier* than an
      // already-created row's `effectiveFrom`; closing that row would write an
      // inverted `[from, to)` range. Updating it in place keeps the table
      // honest and still gives the user the goal they just set.
      if (latest && toDayKey(latest.effectiveFrom) >= localDay) {
        return tx.userGoal.update({
          where: { id: latest.id },
          data: {
            goalType,
            target,
            effectiveTo: null,
            // §7.1 — "a repeat PUT is a no-op beyond updatedAt". `createdAt`
            // is what the response surfaces as `updatedAt`, and an identical
            // re-PUT would otherwise leave it untouched.
            createdAt: this.now(),
          },
        });
      }

      // Close every open row, not just the latest: `updateMany` is one
      // statement and is still correct if the single-open-row invariant was
      // ever violated by a crash between the two halves of an earlier PUT.
      await tx.userGoal.updateMany({
        where: { userId, faithId, effectiveTo: null, effectiveFrom: { lt: effectiveFrom } },
        data: { effectiveTo: effectiveFrom },
      });

      return tx.userGoal.create({
        data: {
          userId,
          faithId,
          goalType,
          target,
          effectiveFrom,
          effectiveTo: null,
          // Set rather than left to @default(now()) so that the value the
          // response reports as `updatedAt` is written by the same code path on
          // both branches.
          createdAt: this.now(),
        },
      });
    });

    // §7.4 — today has not closed, so it is re-evaluated against the new goal
    // at once. Persisted as well as computed: `/history` and the streak both
    // read rollups, and today's `goalMet` has just changed underneath them.
    const day = await this.rollups.persistDailyRollup(userId, faithId, localDay);
    const progress = progressFor(goalType, day.counts);

    return {
      faithId,
      goalType,
      target,
      localDay,
      // §7.3 — changing `goalType` changes which activity is counted, so
      // `progress` can jump dramatically between two PUTs. That is correct.
      progress,
      met: progress >= target,
      updatedAt: new Date(row.createdAt).toISOString(),
    };
  }

  // --------------------------------------------------------------- internals

  /**
   * The goal block of `/today` (§5.3), or `null`.
   *
   * `null` is keyed to "no `UserGoal` row in force on this day", **not** to
   * "no events". A user who set a goal this morning and has recorded nothing
   * gets `{progress: 0, met: false}` — an empty ring — while a user who has
   * never set one gets `null` and the goal-setting prompt. §5.4 turns on the
   * client being able to tell those apart.
   */
  private async buildGoal(
    userId: string,
    faithId: FaithId,
    localDay: string,
    counts: Record<string, number>,
  ): Promise<TodayGoal | null> {
    const goal = await this.rollups.findGoalInForce(userId, faithId, localDay);
    if (!goal) return null;

    const progress = progressFor(goal.goalType, counts);
    return {
      goalType: goal.goalType,
      target: goal.target,
      progress,
      // Computed from the same `counts` and the same `progressFor` that
      // `computeDailyRollup` uses for `goalMet`, so `/today`'s `goal.met` and
      // `/history`'s `goalMet` for the same day cannot drift apart.
      met: progress >= goal.target,
    };
  }

  /** §3 / §1.1 — `faithId` is required on every request in the contract. */
  private requireFaithId(value: unknown): FaithId {
    if (typeof value !== 'string' || !(FAITH_IDS as readonly string[]).includes(value)) {
      throw activityError(
        HttpStatus.BAD_REQUEST,
        'unknown_faith_id',
        `faithId must be one of ${FAITH_IDS.join(' | ')}; received ${describe(value)}`,
      );
    }
    return value as FaithId;
  }

  /** §5.5 / §7.6 — both endpoints report a bad zone under the same code. */
  private requireTimezone(value: unknown): string {
    if (typeof value !== 'string' || !isIanaZone(value)) {
      throw activityError(
        HttpStatus.BAD_REQUEST,
        'invalid_timezone',
        `timezone must be an IANA zone name, e.g. Asia/Kolkata; received ${describe(value)}`,
      );
    }
    return value;
  }

  /** §6.4 — `from`/`to` absent or not `YYYY-MM-DD` is one code, `invalid_date_range`. */
  private requireRangeDate(value: unknown, field: 'from' | 'to'): string {
    if (typeof value !== 'string' || !isRealCalendarDate(value)) {
      throw activityError(
        HttpStatus.BAD_REQUEST,
        'invalid_date_range',
        `"${field}" must be a YYYY-MM-DD calendar date; received ${describe(value)}`,
        { [field]: [`${field} must be a YYYY-MM-DD calendar date`] },
      );
    }
    return value;
  }

  /**
   * §5.1 — the optional `localDay` override.
   *
   * Absent for ordinary use: the point of §5.2 is that the *server* decides
   * which day it is. It exists for the client's own optimistic-UI
   * reconciliation and for tests, and is bounded by the same ±1 day as §2.2 so
   * it cannot be used to read or write an arbitrary day.
   */
  private resolveLocalDayOverride(value: unknown, derived: string): string {
    if (value === undefined || value === null || value === '') return derived;

    if (typeof value !== 'string' || !isRealCalendarDate(value)) {
      throw activityError(
        HttpStatus.BAD_REQUEST,
        'invalid_local_day',
        `localDay must be a YYYY-MM-DD calendar date; received ${describe(value)}`,
      );
    }
    if (Math.abs(daysBetween(derived, value)) > LOCAL_DAY_OVERRIDE_SLACK_DAYS) {
      throw activityError(
        HttpStatus.BAD_REQUEST,
        'local_day_mismatch',
        `localDay ${value} is more than one day from the server's derivation (${derived})`,
      );
    }
    return value;
  }

  /** §1.3 / §7.6 — unknown goal type, then the faith it belongs to. */
  private requireGoalType(value: unknown, faithId: FaithId): string {
    if (typeof value !== 'string' || !(value in GOAL_TYPE_ACTIVITY)) {
      throw activityError(
        HttpStatus.BAD_REQUEST,
        'unknown_goal_type',
        `Unknown goalType ${describe(value)}`,
      );
    }
    // Derived rather than held in a second map: `goalType -> activityType ->
    // faithId`. A standalone goalType->faith table could drift out of step
    // with §1.3 without anything failing.
    const owner = ACTIVITY_TYPE_FAITH[GOAL_TYPE_ACTIVITY[value]];
    if (owner !== faithId) {
      throw activityError(
        HttpStatus.BAD_REQUEST,
        'goal_type_faith_mismatch',
        `goalType ${value} belongs to ${owner}, not ${faithId}`,
      );
    }
    return value;
  }

  /**
   * §1.3's "Target range" column, enforced here because Task 1.5 enforced
   * nothing about targets — it only read whatever row was in force.
   *
   * The ceiling is per-`goalType` and the differences are large and
   * deliberate: 5 prayers a day is the whole of the obligation, 10000 dhikr is
   * a plausible tasbih session.
   */
  private requireTarget(value: unknown, goalType: string): number {
    const max = GOAL_TARGET_MAX[goalType];
    if (
      typeof value !== 'number' ||
      !Number.isInteger(value) ||
      value < GOAL_TARGET_MIN ||
      value > max
    ) {
      throw activityError(
        HttpStatus.BAD_REQUEST,
        'invalid_target',
        'Validation failed',
        {
          target: [
            `target must be an integer between ${GOAL_TARGET_MIN} and ${max} for goalType "${goalType}"`,
          ],
        },
      );
    }
    return value;
  }

  /**
   * §7.2 — the zone the new goal's effective day is derived in: the body's,
   * then the user's most recent event's, then UTC.
   *
   * Ordered by `occurredAt` rather than `localDay` because the latest *event*
   * is what §2.8 appeals to for the same question, and two events on one
   * `localDay` from different zones (a user mid-flight) must resolve the same
   * way in both places.
   */
  private async resolveGoalTimezone(userId: string, value: unknown): Promise<string> {
    if (value !== undefined && value !== null && value !== '') {
      return this.requireTimezone(value);
    }

    const latest = await this.prisma.activityEvent.findFirst({
      where: { userId },
      orderBy: { occurredAt: 'desc' },
    });
    const stored = latest?.timezone;
    if (typeof stored === 'string' && isIanaZone(stored)) return stored;

    this.logger.warn(
      `PUT /goal for user ${userId} carried no timezone and the user has no usable event zone; falling back to UTC`,
    );
    return 'UTC';
  }
}

/**
 * §2.4 — progress is the summed `quantity` of the one activityType the
 * goalType counts. A goalType with no mapping has no counted activity and
 * therefore no progress, which makes a day unmet rather than throwing: a goal
 * row written before a deploy must never be able to break a read.
 */
function progressFor(goalType: string, counts: Record<string, number>): number {
  const activityType = GOAL_TYPE_ACTIVITY[goalType];
  return activityType ? (counts[activityType] ?? 0) : 0;
}

function describe(value: unknown): string {
  if (value === undefined) return 'nothing';
  if (value === null) return 'null';
  return typeof value === 'string' ? `"${value}"` : String(value);
}
