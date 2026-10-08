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
