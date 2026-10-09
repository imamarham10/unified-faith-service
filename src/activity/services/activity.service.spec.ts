import { Test } from '@nestjs/testing';
import { ActivityService } from './activity.service';
import { PrismaService } from '../../common/utils/prisma.service';

/**
 * Unit specs for POST /api/v1/activity/events (contract §4).
 *
 * No database connection is made. `DATABASE_URL` points at a shared RDS
 * instance holding live user data, and `PrismaService`'s constructor would
 * open a real `pg.Pool` against it, so the real provider is never
 * instantiated: it is replaced with the in-memory double below, which enforces
 * the one constraint under test — `@@unique([userId, clientEventId])` — and
 * raises Prisma's `P2002` exactly as Postgres would.
 */

const USER_ID = 'user-under-test';
const OTHER_USER = 'somebody-else';

type Row = Record<string, any>;

/** Prisma double. Enforces the unique key and nothing else. */
function createPrismaDouble() {
  const rows: Row[] = [];
  return {
    rows,
    activityEvent: {
      create: jest.fn(async ({ data }: { data: Row }) => {
        const clash = rows.some(
          (r) => r.userId === data.userId && r.clientEventId === data.clientEventId,
        );
        if (clash) {
          // Shape matches Prisma's PrismaClientKnownRequestError closely
          // enough for the duck-typed `err.code === 'P2002'` check.
          const error: any = new Error(
            'Unique constraint failed on the fields: (`user_id`,`client_event_id`)',
          );
          error.code = 'P2002';
          error.meta = { target: ['user_id', 'client_event_id'] };
          throw error;
        }
        const row = { id: `row-${rows.length + 1}`, ...data };
        rows.push(row);
        return row;
      }),
      count: jest.fn(async ({ where }: { where: Row }) =>
        rows.filter((r) =>
          Object.entries(where).every(([k, v]) => r[k] === v),
        ).length,
      ),
    },
  };
}

type PrismaDouble = ReturnType<typeof createPrismaDouble>;

const DAY_MS = 24 * 60 * 60 * 1000;

/** `occurredAt` relative to now, so specs do not rot against the 90-day bound. */
function isoDaysAgo(days: number, hour = 12): string {
  const d = new Date(Date.now() - days * DAY_MS);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
}

/** The UTC calendar date of an instant, as `YYYY-MM-DD`. */
function utcDay(iso: string, shiftDays = 0): string {
  return new Date(Date.parse(iso) + shiftDays * DAY_MS).toISOString().slice(0, 10);
}

let seq = 0;
function uuid(): string {
  seq += 1;
  return `6f1b2c4e-9d3a-4f87-9f1a-${String(seq).padStart(12, '0')}`;
}

function buildEvent(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const occurredAt = (overrides.occurredAt as string) ?? isoDaysAgo(0);
  // Derive the default localDay only when the spec has not supplied one and
  // the instant is real -- several specs pass a deliberately broken
  // occurredAt together with an explicit localDay.
  const hasOwnLocalDay = 'localDay' in overrides;
  const base: Record<string, unknown> = {
    clientEventId: uuid(),
    faithId: 'islam',
    activityType: 'quran_verse',
    quantity: 1,
    occurredAt,
    timezone: 'Asia/Kolkata',
    sourceRef: 'quran:2:148',
  };
  if (!hasOwnLocalDay) base.localDay = utcDay(occurredAt);
  return { ...base, ...overrides };
}

describe('ActivityService.ingest', () => {
  let service: ActivityService;
  let prisma: PrismaDouble;

  const countEvents = (userId: string) =>
    prisma.activityEvent.count({ where: { userId } });

  beforeEach(async () => {
    prisma = createPrismaDouble();
    const moduleRef = await Test.createTestingModule({
      providers: [ActivityService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(ActivityService);
  });

  // ---------------------------------------------------------------- idempotency

  describe('idempotency (§4.3)', () => {
    it('writes each event exactly once, however many times it is sent', async () => {
      const batch = [buildEvent({ clientEventId: 'abc0de12-1111-4222-8333-444455556666' })];

      const first = await service.ingest(USER_ID, batch);
      expect(first.accepted).toBe(1);
      expect(first.duplicates).toBe(0);

      const second = await service.ingest(USER_ID, batch);
      expect(second.accepted).toBe(0);
      expect(second.duplicates).toBe(1);

      expect(await countEvents(USER_ID)).toBe(1);
    });

    it('survives a batch replayed many times without double-counting', async () => {
      const batch = [buildEvent(), buildEvent(), buildEvent()];
      for (let i = 0; i < 5; i += 1) await service.ingest(USER_ID, batch);
      expect(await countEvents(USER_ID)).toBe(3);
    });

    it('first write wins — a re-sent id with a different payload does not overwrite', async () => {
      const id = uuid();
      await service.ingest(USER_ID, [buildEvent({ clientEventId: id, quantity: 1 })]);
      const second = await service.ingest(USER_ID, [
        buildEvent({ clientEventId: id, quantity: 99 }),
      ]);

      expect(second.duplicates).toBe(1);
      expect(prisma.rows).toHaveLength(1);
      expect(prisma.rows[0].quantity).toBe(1);
    });

    it('counts a clientEventId repeated inside one batch as a duplicate', async () => {
      const id = uuid();
      const result = await service.ingest(USER_ID, [
        buildEvent({ clientEventId: id }),
        buildEvent({ clientEventId: id }),
      ]);

      expect(result).toMatchObject({ accepted: 1, duplicates: 1, rejected: [] });
      expect(await countEvents(USER_ID)).toBe(1);
    });

    it('scopes idempotency to the user — two users may mint the same UUID', async () => {
      const id = uuid();
      await service.ingest(USER_ID, [buildEvent({ clientEventId: id })]);
      const other = await service.ingest(OTHER_USER, [buildEvent({ clientEventId: id })]);

      expect(other.accepted).toBe(1);
      expect(await countEvents(USER_ID)).toBe(1);
      expect(await countEvents(OTHER_USER)).toBe(1);
    });

    it('never writes activity for anyone but the authenticated user', async () => {
      await service.ingest(USER_ID, [
        buildEvent({ userId: OTHER_USER } as Record<string, unknown>),
      ]);
      expect(prisma.rows.every((r) => r.userId === USER_ID)).toBe(true);
    });
  });

  // ------------------------------------------------------------ partial batches

  describe('the batch is partial, not atomic (§4.2)', () => {
    it('leaves the other 99 events intact when one is permanently invalid', async () => {
      const batch = [
        ...Array.from({ length: 99 }, () => buildEvent()),
        buildEvent({ clientEventId: 'not-a-uuid' }),
      ];

      const result = await service.ingest(USER_ID, batch);

      expect(result.accepted).toBe(99);
      expect(result.rejected).toHaveLength(1);
      expect(result.rejected[0].code).toBe('invalid_client_event_id');
      expect(await countEvents(USER_ID)).toBe(99);
    });

    it('always satisfies accepted + duplicates + rejected.length === events.length', async () => {
      const dupe = buildEvent();
      await service.ingest(USER_ID, [dupe]);

      const batch = [
        dupe,
        buildEvent(),
        buildEvent({ faithId: 'jedi' }),
        buildEvent({ activityType: 'pages' }),
        buildEvent({ quantity: 0 }),
        buildEvent(),
      ];
      const result = await service.ingest(USER_ID, batch);

      expect(result.accepted + result.duplicates + result.rejected.length).toBe(
        batch.length,
      );
      expect(result).toMatchObject({ accepted: 2, duplicates: 1 });
      expect(result.rejected).toHaveLength(3);
    });

    it('names the offending clientEventId on every rejection so the client can drop that row', async () => {
      const id = uuid();
      const result = await service.ingest(USER_ID, [
        buildEvent({ clientEventId: id, faithId: 'pastafarian' }),
      ]);

      expect(result.rejected[0]).toMatchObject({
        clientEventId: id,
        code: 'unknown_faith_id',
      });
      expect(typeof result.rejected[0].message).toBe('string');
    });

    it('echoes null rather than omitting clientEventId when none was sent', async () => {
      const result = await service.ingest(USER_ID, [buildEvent({ clientEventId: undefined })]);
      expect(result.rejected[0]).toMatchObject({
        clientEventId: null,
        code: 'invalid_client_event_id',
      });
    });

    it('rejects a non-object event instead of throwing', async () => {
      const result = await service.ingest(USER_ID, [null, 'nonsense', 42] as unknown[]);
      expect(result.rejected).toHaveLength(3);
      expect(result.rejected.every((r) => r.code === 'invalid_client_event_id')).toBe(true);
    });
  });

  // ------------------------------------------------------- local day validation

  describe('local day validation (§2.2) — derived from occurredAt, never the server clock', () => {
    it('accepts an event queued five days ago and flushed only now', async () => {
      const occurredAt = isoDaysAgo(5);
      const result = await service.ingest(USER_ID, [
        buildEvent({ occurredAt, localDay: utcDay(occurredAt) }),
      ]);

      expect(result).toMatchObject({ accepted: 1, duplicates: 0, rejected: [] });
      expect(await countEvents(USER_ID)).toBe(1);
    });

    it('validates identically however long the event sat in the queue', async () => {
      // Time-of-arrival independence: the same event, judged a week later,
      // must produce the same verdict. Only §2.3's bounds may move with the
      // server clock, and 5 -> 12 days stays far inside the 90-day window.
      const occurredAt = isoDaysAgo(5);
      const event = buildEvent({ occurredAt, localDay: utcDay(occurredAt) });

      const onArrival = await service.ingest(USER_ID, [event]);

      const realNow = Date.now();
      const spy = jest
        .spyOn(Date, 'now')
        .mockImplementation(() => realNow + 7 * DAY_MS);
      try {
        const aWeekLater = await service.ingest(OTHER_USER, [event]);
        expect(aWeekLater.rejected).toEqual(onArrival.rejected);
        expect(aWeekLater.accepted).toBe(1);
      } finally {
        spy.mockRestore();
      }
    });

    it('accepts localDay exactly one day either side of the occurredAt date', async () => {
      const occurredAt = isoDaysAgo(2);
      const result = await service.ingest(USER_ID, [
        buildEvent({ occurredAt, localDay: utcDay(occurredAt, -1) }), // UTC+14 territory
        buildEvent({ occurredAt, localDay: utcDay(occurredAt, +1) }), // UTC-11 territory
      ]);

      expect(result).toMatchObject({ accepted: 2, rejected: [] });
    });

    it('rejects localDay two days either side', async () => {
      const occurredAt = isoDaysAgo(10);
      const result = await service.ingest(USER_ID, [
        buildEvent({ occurredAt, localDay: utcDay(occurredAt, -2) }),
        buildEvent({ occurredAt, localDay: utcDay(occurredAt, +2) }),
      ]);

      expect(result.accepted).toBe(0);
      expect(result.rejected.map((r) => r.code)).toEqual([
        'local_day_mismatch',
        'local_day_mismatch',
      ]);
    });

    it('accepts one batch spanning several days and several timezones', async () => {
      // A user who flew Delhi -> London mid-queue. §4.1 says this is valid.
      const batch = [
        (() => {
          const o = isoDaysAgo(3);
          return buildEvent({ occurredAt: o, localDay: utcDay(o), timezone: 'Asia/Kolkata' });
        })(),
        (() => {
          const o = isoDaysAgo(2);
          return buildEvent({ occurredAt: o, localDay: utcDay(o), timezone: 'Europe/London' });
        })(),
        (() => {
          const o = isoDaysAgo(1);
          return buildEvent({ occurredAt: o, localDay: utcDay(o), timezone: 'America/New_York' });
        })(),
      ];

      const result = await service.ingest(USER_ID, batch);
      expect(result).toMatchObject({ accepted: 3, rejected: [] });
    });

    it('stores localDay at UTC midnight, so the DATE column cannot drift a day', async () => {
      const occurredAt = isoDaysAgo(1);
      const day = utcDay(occurredAt);
      await service.ingest(USER_ID, [buildEvent({ occurredAt, localDay: day })]);

      const stored: Date = prisma.rows[0].localDay;
      expect(stored.toISOString()).toBe(`${day}T00:00:00.000Z`);
    });

    it('stores the timezone verbatim and never uses it to validate localDay', async () => {
      // §2.2: "a wrong-but-well-formed IANA string never causes a rejection".
      const occurredAt = isoDaysAgo(1);
      const result = await service.ingest(USER_ID, [
        buildEvent({ occurredAt, localDay: utcDay(occurredAt), timezone: 'Pacific/Kiritimati' }),
      ]);

      expect(result.accepted).toBe(1);
      expect(prisma.rows[0].timezone).toBe('Pacific/Kiritimati');
    });

    it('rejects a localDay that is not a calendar date', async () => {
      const result = await service.ingest(USER_ID, [
        buildEvent({ localDay: '2026-10-08T00:00:00Z' }),
        buildEvent({ localDay: '08/10/2026' }),
        buildEvent({ localDay: '2026-02-31' }),
        buildEvent({ localDay: undefined }),
      ]);
      expect(result.rejected.map((r) => r.code)).toEqual([
        'invalid_local_day',
        'invalid_local_day',
        'invalid_local_day',
        'invalid_local_day',
      ]);
    });
  });

  // ------------------------------------------------------------ occurredAt bounds

  describe('occurredAt (§1.5, §2.3)', () => {
    it('rejects an instant carrying no zone', async () => {
      // `new Date('2026-10-08T14:03:22')` parses as *server local* time, which
      // would silently shift the derived UTC date. It must be rejected.
      const result = await service.ingest(USER_ID, [
        buildEvent({ occurredAt: '2026-10-08T14:03:22', localDay: '2026-10-08' }),
      ]);
      expect(result.rejected[0].code).toBe('invalid_occurred_at');
    });

    it('accepts a numeric offset and normalises it to UTC', async () => {
      const result = await service.ingest(USER_ID, [
        buildEvent({ occurredAt: isoDaysAgo(1).replace('Z', '+00:00') }),
      ]);
      expect(result.accepted).toBe(1);
      expect(prisma.rows[0].occurredAt).toBeInstanceOf(Date);
    });

    it('preserves milliseconds', async () => {
      const base = new Date(Date.now() - DAY_MS);
      base.setUTCMilliseconds(456);
      const occurredAt = base.toISOString();
      await service.ingest(USER_ID, [
        buildEvent({ occurredAt, localDay: utcDay(occurredAt) }),
      ]);
      expect(prisma.rows[0].occurredAt.getUTCMilliseconds()).toBe(456);
    });

    it('rejects an absent or unparseable instant', async () => {
      const result = await service.ingest(USER_ID, [
        buildEvent({ occurredAt: undefined, localDay: '2026-10-08' }),
        buildEvent({ occurredAt: 'yesterday', localDay: '2026-10-08' }),
        buildEvent({ occurredAt: 1760000000000, localDay: '2026-10-08' }),
      ]);
      expect(result.rejected.map((r) => r.code)).toEqual([
        'invalid_occurred_at',
        'invalid_occurred_at',
        'invalid_occurred_at',
      ]);
    });

    it('rejects an instant more than 24 hours in the future', async () => {
      const occurredAt = isoDaysAgo(-3);
      const result = await service.ingest(USER_ID, [
        buildEvent({ occurredAt, localDay: utcDay(occurredAt) }),
      ]);
      expect(result.rejected[0].code).toBe('occurred_at_in_future');
    });

    it('accepts an instant a few hours ahead — a device clock is never exact', async () => {
      const occurredAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
      const result = await service.ingest(USER_ID, [
        buildEvent({ occurredAt, localDay: utcDay(occurredAt) }),
      ]);
      expect(result).toMatchObject({ accepted: 1, rejected: [] });
    });

    it('rejects an instant more than 90 days old, and accepts one just inside', async () => {
      const old = isoDaysAgo(120);
      const fresh = isoDaysAgo(89);
      const result = await service.ingest(USER_ID, [
        buildEvent({ occurredAt: old, localDay: utcDay(old) }),
        buildEvent({ occurredAt: fresh, localDay: utcDay(fresh) }),
      ]);
      expect(result.rejected.map((r) => r.code)).toEqual(['occurred_at_too_old']);
      expect(result.accepted).toBe(1);
    });

    it('judges every event in a batch against one instant', async () => {
      const batch = [buildEvent(), buildEvent(), buildEvent()];
      const spy = jest.spyOn(Date, 'now');
      await service.ingest(USER_ID, batch);
      expect(spy).toHaveBeenCalledTimes(1);
      spy.mockRestore();
    });
  });

  // ----------------------------------------------------------------- the enums

  describe('unknown enum values are always errors, never silent defaults (§1.4)', () => {
    it('rejects an unknown faithId', async () => {
      const result = await service.ingest(USER_ID, [
        buildEvent({ faithId: 'buddhism' }),
        buildEvent({ faithId: undefined }),
        buildEvent({ faithId: 'ISLAM' }),
      ]);
      expect(result.rejected.map((r) => r.code)).toEqual([
        'unknown_faith_id',
        'unknown_faith_id',
        'unknown_faith_id',
      ]);
      expect(await countEvents(USER_ID)).toBe(0);
    });

    it('rejects an unknown activityType rather than storing it', async () => {
      const result = await service.ingest(USER_ID, [
        buildEvent({ activityType: 'tafsir_page' }),
        buildEvent({ activityType: 'pages' }), // deliberately not in Phase 1
        buildEvent({ activityType: 'minutes' }),
      ]);
      expect(result.rejected.map((r) => r.code)).toEqual([
        'unknown_activity_type',
        'unknown_activity_type',
        'unknown_activity_type',
      ]);
    });

    it('rejects an activityType belonging to the other faith (§1.2)', async () => {
      const result = await service.ingest(USER_ID, [
        buildEvent({ faithId: 'islam', activityType: 'gita_shloka' }),
        buildEvent({ faithId: 'hindu', activityType: 'prayer' }),
      ]);
      expect(result.rejected.map((r) => r.code)).toEqual([
        'activity_type_faith_mismatch',
        'activity_type_faith_mismatch',
      ]);
    });

    it('accepts every documented faith / activityType pairing', async () => {
      const result = await service.ingest(USER_ID, [
        buildEvent({ faithId: 'islam', activityType: 'quran_verse' }),
        buildEvent({ faithId: 'islam', activityType: 'prayer' }),
        buildEvent({ faithId: 'islam', activityType: 'dhikr' }),
        buildEvent({ faithId: 'hindu', activityType: 'gita_shloka' }),
        buildEvent({ faithId: 'hindu', activityType: 'sandhya' }),
        buildEvent({ faithId: 'hindu', activityType: 'japa_mala' }),
      ]);
      expect(result).toMatchObject({ accepted: 6, rejected: [] });
    });
  });

  // -------------------------------------------------------------- field details

  describe('quantity (§4.1)', () => {
    it('defaults an absent quantity to 1', async () => {
      await service.ingest(USER_ID, [buildEvent({ quantity: undefined })]);
      expect(prisma.rows[0].quantity).toBe(1);
    });

    it('rejects zero, negatives, fractions, strings and out-of-range values', async () => {
      const result = await service.ingest(USER_ID, [
        buildEvent({ quantity: 0 }),
        buildEvent({ quantity: -1 }),
        buildEvent({ quantity: 1.5 }),
        buildEvent({ quantity: '5' }),
        buildEvent({ quantity: 10001 }),
        buildEvent({ quantity: Number.NaN }),
      ]);
      expect(result.accepted).toBe(0);
      expect(result.rejected.every((r) => r.code === 'invalid_quantity')).toBe(true);
    });

    it('accepts the documented bounds', async () => {
      const result = await service.ingest(USER_ID, [
        buildEvent({ quantity: 1 }),
        buildEvent({ quantity: 10000 }),
      ]);
      expect(result).toMatchObject({ accepted: 2, rejected: [] });
    });
  });

  describe('timezone (§1.5)', () => {
    it('rejects an absent zone, a fixed offset and an abbreviation', async () => {
      const result = await service.ingest(USER_ID, [
        buildEvent({ timezone: undefined }),
        buildEvent({ timezone: '+05:30' }),
        buildEvent({ timezone: 'IST' }),
        buildEvent({ timezone: 'Mars/Olympus_Mons' }),
        buildEvent({ timezone: '' }),
      ]);
      expect(result.accepted).toBe(0);
      expect(result.rejected.every((r) => r.code === 'invalid_timezone')).toBe(true);
    });

    it('accepts IANA aliases that Intl.supportedValuesOf omits', async () => {
      const result = await service.ingest(USER_ID, [
        buildEvent({ timezone: 'Asia/Calcutta' }),
        buildEvent({ timezone: 'America/Argentina/Buenos_Aires' }),
      ]);
      expect(result).toMatchObject({ accepted: 2, rejected: [] });
    });
  });

  describe('sourceRef (§1.6)', () => {
    it('rejects one longer than 128 characters', async () => {
      const result = await service.ingest(USER_ID, [
        buildEvent({ sourceRef: 'q'.repeat(129) }),
      ]);
      expect(result.rejected[0].code).toBe('source_ref_too_long');
    });

    it('stores 128 characters, an omitted field and an explicit null', async () => {
      const result = await service.ingest(USER_ID, [
        buildEvent({ sourceRef: 'q'.repeat(128) }),
        buildEvent({ sourceRef: undefined }),
        buildEvent({ sourceRef: null }),
      ]);
      expect(result).toMatchObject({ accepted: 3, rejected: [] });
      expect(prisma.rows.map((r) => r.sourceRef)).toEqual(['q'.repeat(128), null, null]);
    });
  });

  describe('unknown request fields are silently stripped (§1.7)', () => {
    it('drops a field the contract does not define, and still succeeds', async () => {
      const result = await service.ingest(USER_ID, [
        buildEvent({ deviceModel: 'Pixel 9', points: 999 }),
      ]);
      expect(result.accepted).toBe(1);
      expect(prisma.rows[0]).not.toHaveProperty('deviceModel');
      expect(prisma.rows[0]).not.toHaveProperty('points');
    });

    it('writes exactly the columns the model declares', async () => {
      await service.ingest(USER_ID, [buildEvent()]);
      const { id, ...written } = prisma.rows[0];
      expect(Object.keys(written).sort()).toEqual(
        [
          'activityType',
          'clientEventId',
          'faithId',
          'localDay',
          'occurredAt',
          'quantity',
          'sourceRef',
          'timezone',
          'userId',
        ].sort(),
      );
    });
  });

  // ------------------------------------------------------------- failure modes

  describe('database failures', () => {
    it('does not swallow a non-P2002 fault as a duplicate', async () => {
      const boom: any = new Error('connection terminated');
      boom.code = 'P1001';
      prisma.activityEvent.create.mockRejectedValueOnce(boom);

      await expect(service.ingest(USER_ID, [buildEvent()])).rejects.toThrow(
        'connection terminated',
      );
    });

    it('keeps the events that landed before a mid-batch fault', async () => {
      // No $transaction wraps the loop: a throw must not roll back the rows
      // already written, because §4.8 lets the client safely retry the whole
      // batch and idempotency makes the replay free.
      const batch = [buildEvent(), buildEvent(), buildEvent()];
      const real = prisma.activityEvent.create.getMockImplementation()!;
      let calls = 0;
      prisma.activityEvent.create.mockImplementation(async (args: any) => {
        calls += 1;
        if (calls === 3) throw Object.assign(new Error('deadlock'), { code: 'P2034' });
        return real(args);
      });

      await expect(service.ingest(USER_ID, batch)).rejects.toThrow('deadlock');
      expect(prisma.rows).toHaveLength(2);
    });
  });
});
