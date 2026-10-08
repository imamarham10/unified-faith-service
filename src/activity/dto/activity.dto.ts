import { Allow } from 'class-validator';

/**
 * Activity ingest vocabulary and envelope DTO.
 *
 * Frozen contract: `docs/contracts/activity-api.md`. Section references below
 * are to that document; where the code and the contract disagree, the contract
 * is right and the code is a bug.
 */

/** §1.1 — the two content packs. Unknown values are errors, never defaults. */
export const FAITH_IDS = ['islam', 'hindu'] as const;
export type FaithId = (typeof FAITH_IDS)[number];

/**
 * §1.2 — every activity type belongs to exactly one faith. `islam` +
 * `gita_shloka` is `activity_type_faith_mismatch`, never silently re-homed.
 */
export const ACTIVITY_TYPE_FAITH: Record<string, FaithId> = {
  quran_verse: 'islam',
  prayer: 'islam',
  dhikr: 'islam',
  gita_shloka: 'hindu',
  sandhya: 'hindu',
  japa_mala: 'hindu',
};

/** §4.1 — batch bounds. 1..100 events; the envelope fails outside that. */
export const BATCH_MIN = 1;
export const BATCH_MAX = 100;

/** §4.1 — quantity bounds. */
export const QUANTITY_MIN = 1;
export const QUANTITY_MAX = 10000;

/** §1.6 — sourceRef is stored verbatim; only its length is validated. */
export const SOURCE_REF_MAX_LENGTH = 128;

/** §2.3 — bounds on `occurredAt`, measured against server receipt time. */
export const OCCURRED_AT_MAX_FUTURE_MS = 24 * 60 * 60 * 1000;
export const OCCURRED_AT_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

/** §2.2 — the local day may sit at most one day either side of occurredAt. */
export const LOCAL_DAY_SLACK_MS = 24 * 60 * 60 * 1000;

/**
 * §1.5 — an instant must carry a zone. `Date` happily parses a bare
 * `2026-10-08T14:03:22` as *server local time*, which would silently shift the
 * derived UTC date, so the zone designator is required by the regex rather
 * than left to the parser.
 */
export const RFC3339_WITH_ZONE =
  /^\d{4}-\d{2}-\d{2}[Tt]\d{2}:\d{2}:\d{2}(\.\d+)?([Zz]|[+-]\d{2}:\d{2})$/;

/** §1.5 — `localDay` is a calendar date: no time, no zone, no `T`. */
export const CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * §1.5 — an IANA zone name, never a fixed offset and never an abbreviation.
 * The shape check is load-bearing: recent Node accepts offset strings such as
 * `+05:30` in `Intl.DateTimeFormat`, so `Intl` alone would let one through.
 */
export const IANA_ZONE_SHAPE = /^[A-Za-z][A-Za-z0-9_+-]*(\/[A-Za-z0-9_+-]+)+$/;

/**
 * The two zone identifiers that are real tzdb names yet carry no `/`.
 *
 * `IANA_ZONE_SHAPE` requires at least one slash, which is right for almost
 * everything and wrong for exactly these: `UTC` and `GMT` are genuine tzdb
 * identifiers (links in the `backward`/`etcetera` files) and are what a real
 * Android device reports from `TimeZone.getID()` when it has no region set —
 * an emulator, a freshly-flashed handset, a VPN'd device. Without them such a
 * user has **every** event rejected as `invalid_timezone` and never records a
 * thing, and contract §7.2 names `UTC` as the mandated `PUT /goal` fallback,
 * so the server itself would be producing a value it refuses to accept.
 *
 * Deliberately a two-item allowlist and not a relaxation of the regex: recent
 * Node's `Intl` accepts `IST`, `CST` and friends, which §1.5 forbids and the
 * Task 1.4 spec asserts are rejected. The slash requirement is the only thing
 * standing between those and acceptance, so it stays.
 */
export const IANA_SINGLE_SEGMENT_ZONES: readonly string[] = ['UTC', 'GMT'];

/** §4.5 — the per-event rejection codes, in the order the contract lists them. */
export type RejectionCode =
  | 'invalid_client_event_id'
  | 'unknown_faith_id'
  | 'unknown_activity_type'
  | 'activity_type_faith_mismatch'
  | 'invalid_quantity'
  | 'invalid_occurred_at'
  | 'occurred_at_in_future'
  | 'occurred_at_too_old'
  | 'invalid_local_day'
  | 'local_day_mismatch'
  | 'invalid_timezone'
  | 'source_ref_too_long';

/** One entry of `rejected[]`. §4.4 — always carries the clientEventId. */
export interface RejectedEvent {
  /** Echoed verbatim so an offline client can identify the queue row. Null
   *  when the client sent nothing usable to echo. */
  clientEventId: string | null;
  code: RejectionCode;
  message: string;
}

/** §4.4 — the 200 response body. Bare, not the repo's {data, statusCode} wrapper. */
export interface IngestResult {
  accepted: number;
  duplicates: number;
  rejected: RejectedEvent[];
}

/** A validated event, ready to become an `activity_events` row. */
export interface NormalisedEvent {
  clientEventId: string;
  faithId: FaithId;
  activityType: string;
  quantity: number;
  occurredAt: Date;
  localDay: Date;
  timezone: string;
  sourceRef: string | null;
}

/**
 * The envelope, and only the envelope.
 *
 * `events` is deliberately untyped and carries only `@Allow()`:
 *
 *  - A nested `@ValidateNested()` DTO would make the *global* ValidationPipe
 *    throw `400` for the whole batch as soon as one event were invalid, which
 *    is precisely the poison pill §4.2 forbids. Per-event validation therefore
 *    lives in ActivityService, where it can produce `rejected[]`.
 *  - `@Allow()` (rather than no decorator at all) is required because the
 *    global pipe runs `whitelist: true` and strips undecorated properties —
 *    `events` would arrive as `undefined`.
 *  - Because class-transformer never recurses into plain objects, §1.7
 *    ("unknown request fields are silently stripped") holds by construction:
 *    the service builds each row from known keys only.
 */
export class IngestEventsDto {
  @Allow()
  events?: unknown;
}

/**
 * §1.3 — each `goalType` counts exactly one `activityType`. The names differ
 * deliberately: `goalType` is the unit the user sets a target in and reads in
 * English (`verses`), `activityType` is what an event records (`quran_verse`).
 *
 * This map is the whole of "the one activityType that goalType counts" in
 * §2.4. A `goalType` absent from it has no counted activity and therefore no
 * progress, which makes `goalMet` false rather than throwing — a goal row that
 * predates a deploy must never be able to break a rollup.
 */
export const GOAL_TYPE_ACTIVITY: Record<string, string> = {
  verses: 'quran_verse',
  prayers: 'prayer',
  dhikr: 'dhikr',
  shlokas: 'gita_shloka',
  sandhyas: 'sandhya',
  malas: 'japa_mala',
};

/** §2.6 — the monthly freeze allowance. Granted, not earned; never configurable in Phase 1. */
export const FREEZES_PER_MONTH = 2;

/**
 * §1.3 — the per-`goalType` target ceiling. The floor is 1 for every type.
 *
 * These are the "Target range" column of §1.3's table, and they are this
 * task's to enforce (Task 1.5 validated nothing about targets — it only read
 * whatever row was in force). A `goalType` absent from this map is an unknown
 * goal type and is rejected before the range is ever consulted.
 */
export const GOAL_TARGET_MIN = 1;
export const GOAL_TARGET_MAX: Record<string, number> = {
  verses: 1000,
  prayers: 5,
  dhikr: 10000,
  shlokas: 1000,
  sandhyas: 3,
  malas: 108,
};

/** §6.2 — `/history` spans at most 92 days inclusive; beyond is `range_too_large`. */
export const HISTORY_MAX_DAYS = 92;

/** §5.1 — a supplied `localDay` override may sit at most one day either side
 *  of the day the server derives from `timezone`. Same slack, same reason, as
 *  §2.2: the civil range of UTC−12..UTC+14 is 26 hours wide. */
export const LOCAL_DAY_OVERRIDE_SLACK_DAYS = 1;

/**
 * Rejects 2026-02-31 and friends, which `CALENDAR_DATE` alone would let
 * through. Lives here rather than in ActivityService because ingest (§4.5
 * `invalid_local_day`), `/today` (§5.5) and `/history` (§6.4
 * `invalid_date_range`) all need the identical notion of "a real calendar
 * date" and must not be able to drift apart.
 */
export function isRealCalendarDate(value: string): boolean {
  if (!CALENDAR_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/**
 * §1.5 — an IANA zone name, never a fixed offset and never an abbreviation.
 *
 * The shape check is not redundant: recent Node accepts offset strings such as
 * `+05:30` in `Intl.DateTimeFormat`, and §1.5 forbids those. `Intl` is then
 * asked whether the zone really exists — rather than
 * `Intl.supportedValuesOf('timeZone')`, which omits aliases like
 * `Asia/Calcutta` that millions of devices still report.
 */
export function isIanaZone(value: string): boolean {
  if (!IANA_ZONE_SHAPE.test(value) && !IANA_SINGLE_SEGMENT_ZONES.includes(value)) {
    return false;
  }
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/**
 * The calendar date it is *right now* in `timezone`, as `YYYY-MM-DD`.
 *
 * This is the one place in the retention engine where a timezone is consulted
 * to decide what day it is, and §5.2 is why it has to exist: a user in
 * `Asia/Kolkata` opening the app at 02:00 IST is on tomorrow's local day but
 * still on yesterday's UTC date, and answering from the server's own clock
 * would show them yesterday's card and a streak that looks broken.
 *
 * It does not contradict `rollup.service.ts`'s "timezone is stored but never
 * consulted" — that is about §2.2, which validates a `localDay` the *device*
 * stamped. Once a day is a calendar date no zone is involved again; this
 * function is how a calendar date is obtained in the first place, for the one
 * request (§5) that does not carry one.
 *
 * `formatToParts` rather than `format()`: the formatted string's field order
 * and separators are locale data and have changed between ICU releases, while
 * the part types have not.
 */
export function localDayIn(timezone: string, at: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    calendar: 'gregory',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(at);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${part('year').padStart(4, '0')}-${part('month')}-${part('day')}`;
}

/** §5.3 — `counts` maps activityType to summed quantity; zero totals are absent keys. */
export type ActivityCounts = Record<string, number>;

/** §5.3 — the `goal` object on `/today`. `null` when no goal is in force. */
export interface TodayGoal {
  goalType: string;
  target: number;
  progress: number;
  met: boolean;
}

/** §5.3 — the `streak` object on `/today`. */
export interface TodayStreak {
  current: number;
  longest: number;
  freezesLeft: number;
  freezeResetOn: string;
  lastGoalMetDay: string | null;
}

/** §5.3 — the `GET /today` body. */
export interface TodayResponse {
  faithId: FaithId;
  localDay: string;
  timezone: string;
  counts: ActivityCounts;
  goal: TodayGoal | null;
  streak: TodayStreak;
}

/** §6.3 — one cell of the dot-grid. No `points` (§2.9), no streak. */
export interface HistoryDay {
  localDay: string;
  counts: ActivityCounts;
  goalMet: boolean;
}

/** §6.3 — the `GET /history` body. `days` is dense: `to - from + 1` entries. */
export interface HistoryResponse {
  faithId: FaithId;
  from: string;
  to: string;
  days: HistoryDay[];
}

/** §7.3 — the `PUT /goal` body, re-evaluating today against the new goal. */
export interface GoalResponse {
  faithId: FaithId;
  goalType: string;
  target: number;
  localDay: string;
  progress: number;
  met: boolean;
  updatedAt: string;
}

/**
 * §7.2 — the `PUT /goal` request body.
 *
 * Every field is `unknown` and carries only `@Allow()`, for the same two
 * reasons `IngestEventsDto.events` does:
 *
 *  - `@Allow()` is required at all because the global pipe runs
 *    `whitelist: true` and would strip an undecorated property to `undefined`.
 *  - A real constraint decorator (`@IsInt()`, `@Max()`) would be enforced by
 *    the *global* pipe in `main.ts`, which runs before any controller-scoped
 *    pipe and throws Nest's default `{message: string[]}` shape. The filter
 *    maps that bare 400 to `code: "malformed_body"`, so mobile would receive
 *    `malformed_body` where §7.6 promises `invalid_target`. Hand-validation in
 *    the service is what keeps the frozen codes.
 *
 * `unknown` rather than `number`/`string` also disables the global pipe's
 * `enableImplicitConversion`, so `target: "5"` arrives as the string the
 * client really sent and is rejected rather than silently coerced.
 */
export class SetGoalDto {
  @Allow()
  faithId?: unknown;

  @Allow()
  goalType?: unknown;

  @Allow()
  target?: unknown;

  @Allow()
  timezone?: unknown;
}
