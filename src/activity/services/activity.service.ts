import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/utils/prisma.service';
import {
  ACTIVITY_TYPE_FAITH,
  CALENDAR_DATE,
  FAITH_IDS,
  FaithId,
  IANA_ZONE_SHAPE,
  IngestResult,
  LOCAL_DAY_SLACK_MS,
  NormalisedEvent,
  OCCURRED_AT_MAX_AGE_MS,
  OCCURRED_AT_MAX_FUTURE_MS,
  QUANTITY_MAX,
  QUANTITY_MIN,
  RFC3339_WITH_ZONE,
  RejectedEvent,
  RejectionCode,
  SOURCE_REF_MAX_LENGTH,
} from '../dto/activity.dto';

/** A per-event verdict: either a row to write, or a reason it will never work. */
interface Rejection {
  code: RejectionCode;
  message: string;
}
type Verdict = NormalisedEvent | Rejection;

/**
 * An explicit predicate rather than a discriminated union on `ok`: this repo
 * compiles with `strictNullChecks: false`, under which TypeScript will not
 * narrow a union by a boolean literal discriminant.
 */
function isRejection(verdict: Verdict): verdict is Rejection {
  return typeof (verdict as Rejection).code === 'string';
}

const DAY_MS = 24 * 60 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ingest a batch of activity events for one user (contract §4).
   *
   * Partial and per-event: a permanently-invalid event comes back in
   * `rejected[]` and the rest of the batch is still written. Idempotent on
   * `(userId, clientEventId)`: a replayed batch writes nothing and is counted
   * as duplicates, so a phone retrying a flaky upload can never double-count a
   * user's verses.
   *
   * `userId` comes from the bearer token and is the only user ever written —
   * §4 has no `userId` in the request body and a client must not try.
   */
  async ingest(userId: string, events: unknown[]): Promise<IngestResult> {
    // One instant for the whole batch, so §2.3's bounds are judged identically
    // for every event and the result is deterministic. Note that this clock is
    // used ONLY for the future/too-old bounds. The local-day rule (§2.2) is
    // derived from each event's own occurredAt and never touches it.
    const now = Date.now();

    const rejected: RejectedEvent[] = [];
    const toWrite: NormalisedEvent[] = [];
    const seenInBatch = new Set<string>();
    let duplicates = 0;

    for (const raw of events) {
      const verdict = this.validate(raw, now);

      if (isRejection(verdict)) {
        rejected.push({
          clientEventId: readClientEventId(raw),
          code: verdict.code,
          message: verdict.message,
        });
        continue;
      }

      // §4.3: a clientEventId repeated inside one batch follows the same rule
      // as one repeated across batches — the first occurrence is accepted,
      // later ones are duplicates. Caught here because the two inserts would
      // otherwise race within a single request.
      if (seenInBatch.has(verdict.clientEventId)) {
        duplicates += 1;
        continue;
      }
      seenInBatch.add(verdict.clientEventId);
      toWrite.push(verdict);
    }

    let accepted = 0;

    // Deliberately not wrapped in $transaction. An escaping throw would roll
    // back the events that did land, and §4.8 already tells the client to
    // retry the whole batch on a 5xx — which idempotency makes free. Rolling
    // back would turn a partial success into a guaranteed re-send of work the
    // server had already done correctly.
    for (const event of toWrite) {
      try {
        await this.prisma.activityEvent.create({ data: { userId, ...event } });
        accepted += 1;
      } catch (error) {
        // The @@unique([userId, clientEventId]) constraint doing the real
        // work. Duck-typed on `.code` rather than
        // `instanceof Prisma.PrismaClientKnownRequestError`, which is brittle
        // across Prisma versions and across the driver adapter.
        if ((error as { code?: string })?.code === 'P2002') {
          duplicates += 1;
          continue;
        }
        throw error;
      }
    }

    if (rejected.length) {
      this.logger.warn(
        `Rejected ${rejected.length}/${events.length} activity events for user ${userId}: ` +
          rejected.map((r) => r.code).join(', '),
      );
    }

    return { accepted, duplicates, rejected };
  }

  /**
   * Validate and normalise one event.
   *
   * Checks run in the order §4.5 lists the codes, so an event failing several
   * reports the earliest — the contract does not specify a precedence, and a
   * stable one matters because a client logs the code as a bug report.
   */
  private validate(raw: unknown, now: number): Verdict {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return reject('invalid_client_event_id', 'Event must be a JSON object');
    }
    const e = raw as Record<string, unknown>;

    // --- clientEventId -----------------------------------------------------
    // §4.1 says "UUID v4" but §4.5 says only "not a UUID", and a rejection is
    // permanent — a client minting a v7 would be told, falsely and forever,
    // that its id is malformed. The error table governs, so any well-formed
    // UUID is accepted. Flagged to the contract owner.
    const clientEventId = e.clientEventId;
    if (typeof clientEventId !== 'string' || !UUID.test(clientEventId)) {
      return reject(
        'invalid_client_event_id',
        'clientEventId must be a UUID minted on the device',
      );
    }

    // --- faithId -----------------------------------------------------------
    const faithId = e.faithId;
    if (typeof faithId !== 'string' || !(FAITH_IDS as readonly string[]).includes(faithId)) {
      return reject(
        'unknown_faith_id',
        `faithId must be one of ${FAITH_IDS.join(' | ')}; received ${describe(faithId)}`,
      );
    }

    // --- activityType ------------------------------------------------------
    const activityType = e.activityType;
    if (typeof activityType !== 'string' || !(activityType in ACTIVITY_TYPE_FAITH)) {
      return reject(
        'unknown_activity_type',
        `Unknown activityType ${describe(activityType)}`,
      );
    }
    if (ACTIVITY_TYPE_FAITH[activityType] !== faithId) {
      return reject(
        'activity_type_faith_mismatch',
        `activityType ${activityType} belongs to ${ACTIVITY_TYPE_FAITH[activityType]}, not ${faithId}`,
      );
    }

    // --- quantity ----------------------------------------------------------
    // Absent means 1 (§4.1). A string is rejected rather than coerced: the
    // global pipe's enableImplicitConversion never reaches inside this array,
    // so "5" really is what the client sent, and silently accepting it would
    // hide a client bug.
    const quantity = e.quantity === undefined || e.quantity === null ? 1 : e.quantity;
    if (
      typeof quantity !== 'number' ||
      !Number.isInteger(quantity) ||
      quantity < QUANTITY_MIN ||
      quantity > QUANTITY_MAX
    ) {
      return reject(
        'invalid_quantity',
        `quantity must be an integer between ${QUANTITY_MIN} and ${QUANTITY_MAX}; received ${describe(e.quantity)}`,
      );
    }

    // --- occurredAt --------------------------------------------------------
    const occurredAtRaw = e.occurredAt;
    if (typeof occurredAtRaw !== 'string' || !RFC3339_WITH_ZONE.test(occurredAtRaw)) {
      return reject(
        'invalid_occurred_at',
        'occurredAt must be an RFC 3339 instant carrying a zone, e.g. 2026-10-08T14:03:22Z',
      );
    }
    const occurredAtMs = Date.parse(occurredAtRaw);
    if (Number.isNaN(occurredAtMs)) {
      return reject('invalid_occurred_at', `occurredAt ${occurredAtRaw} is not a real instant`);
    }
    if (occurredAtMs - now > OCCURRED_AT_MAX_FUTURE_MS) {
      return reject(
        'occurred_at_in_future',
        `occurredAt ${occurredAtRaw} is more than 24 hours in the future`,
      );
    }
    if (now - occurredAtMs > OCCURRED_AT_MAX_AGE_MS) {
      return reject(
        'occurred_at_too_old',
        `occurredAt ${occurredAtRaw} is more than 90 days in the past`,
      );
    }

    // --- localDay ----------------------------------------------------------
    const localDayRaw = e.localDay;
    if (
      typeof localDayRaw !== 'string' ||
      !CALENDAR_DATE.test(localDayRaw) ||
      !isRealCalendarDate(localDayRaw)
    ) {
      return reject(
        'invalid_local_day',
        `localDay must be a YYYY-MM-DD calendar date; received ${describe(localDayRaw)}`,
      );
    }

    // §2.2, the single most important rule in the system:
    //
    //   abs( localDay - dateOf(occurredAt in UTC) ) <= 1 day
    //
    // The reference day is the EVENT'S OWN occurredAt, not the server's wall
    // clock. Validating against server-today would reject every event the
    // offline queue exists to carry — a batch flushed after a three-day flight
    // would discard three days of worship. Derived this way the verdict is
    // time-of-arrival independent: the same event validates identically
    // whether it is sent now or next week.
    //
    // +/-1 rather than 0 is exactly the slack covering UTC-12..UTC+14. A user
    // in Pacific/Kiritimati at 01:00 local is still on the previous UTC date
    // and is not cheating. `timezone` is stored but never consulted here.
    const localDayMs = Date.parse(`${localDayRaw}T00:00:00.000Z`);
    const occurredDayMs = startOfUtcDay(occurredAtMs);
    if (Math.abs(localDayMs - occurredDayMs) > LOCAL_DAY_SLACK_MS) {
      return reject(
        'local_day_mismatch',
        `localDay ${localDayRaw} is more than one day from the date of occurredAt (${new Date(occurredDayMs).toISOString().slice(0, 10)})`,
      );
    }

    // --- timezone ----------------------------------------------------------
    const timezone = e.timezone;
    if (typeof timezone !== 'string' || !isIanaZone(timezone)) {
      return reject(
        'invalid_timezone',
        `timezone must be an IANA zone name such as Asia/Kolkata; received ${describe(timezone)}`,
      );
    }

    // --- sourceRef ---------------------------------------------------------
    // §1.6: "stored verbatim and not validated in Phase 1". Only the length is
    // checked, because it is the only failure the contract gives a code for. A
    // non-string value is treated as absent rather than rejected — there is no
    // code for it, and inventing one would break the frozen error table.
    let sourceRef: string | null = null;
    if (typeof e.sourceRef === 'string') {
      if (e.sourceRef.length > SOURCE_REF_MAX_LENGTH) {
        return reject(
          'source_ref_too_long',
          `sourceRef must be at most ${SOURCE_REF_MAX_LENGTH} characters; received ${e.sourceRef.length}`,
        );
      }
      sourceRef = e.sourceRef;
    }

    return {
      clientEventId,
      faithId: faithId as FaithId,
      activityType,
      quantity,
      occurredAt: new Date(occurredAtMs),
      // Built as explicit UTC midnight. The column is `@db.Date`; a
      // local-midnight Date would shift the stored date by one for negative
      // offsets, which is exactly the silent day-boundary bug that kills a
      // 90-day streak.
      localDay: new Date(localDayMs),
      timezone,
      sourceRef,
    };
  }
}

function reject(code: RejectionCode, message: string): Rejection {
  return { code, message };
}

/** Echo back whatever the client called the row, so it knows which one to drop. */
function readClientEventId(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = (raw as Record<string, unknown>).clientEventId;
  return typeof value === 'string' ? value : null;
}

function startOfUtcDay(ms: number): number {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Rejects 2026-02-31 and friends, which the regex alone would let through. */
function isRealCalendarDate(value: string): boolean {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/**
 * The shape check is not redundant: recent Node accepts offset strings such as
 * `+05:30` in `Intl.DateTimeFormat`, and §1.5 forbids those. `Intl` is then
 * asked whether the zone really exists — rather than
 * `Intl.supportedValuesOf('timeZone')`, which omits aliases like
 * `Asia/Calcutta` that millions of devices still report.
 */
function isIanaZone(value: string): boolean {
  if (!IANA_ZONE_SHAPE.test(value)) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

function describe(value: unknown): string {
  if (value === undefined) return 'nothing';
  if (value === null) return 'null';
  return typeof value === 'string' ? `"${value}"` : String(value);
}
