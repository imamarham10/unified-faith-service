import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

/**
 * Schema invariants for the retention engine (Task 1.3).
 *
 * These specs read `prisma/schema.prisma` and the generated migration SQL as
 * text. That is deliberate, not a shortcut:
 *
 *  - Prisma 7's runtime DMMF (`Prisma.dmmf.datamodel`) is trimmed to
 *    `{ name, fields, dbName }`. It carries no index, unique-key or primary-key
 *    metadata at all, so it cannot see any of the constraints under test here.
 *    `@prisma/internals` (which exposes the full DMMF) is not a dependency of
 *    Prisma 7 and is not installed.
 *  - The migration SQL is in any case the stronger assertion: it is what
 *    Postgres is actually told to enforce. A constraint that exists in the
 *    Prisma model but never reaches a `CREATE ... INDEX` protects nothing.
 *
 * No database connection is made. `DATABASE_URL` points at a shared RDS
 * instance holding live user data; these specs must stay runnable without it.
 */

const PRISMA_DIR = join(__dirname, '..', '..', 'prisma');
const SCHEMA = readFileSync(join(PRISMA_DIR, 'schema.prisma'), 'utf8');

const MIGRATION_DIR = join(PRISMA_DIR, 'migrations');
const ACTIVITY_MIGRATION = readdirSync(MIGRATION_DIR).filter((d) =>
  d.endsWith('_add_activity_engine'),
);
const MIGRATION_SQL = readFileSync(
  join(MIGRATION_DIR, ACTIVITY_MIGRATION[0], 'migration.sql'),
  'utf8',
);

/** The body of one `model X { ... }` block, or undefined if absent. */
function modelBlock(name: string): string | undefined {
  const match = SCHEMA.match(new RegExp(`\\nmodel ${name} \\{([\\s\\S]*?)\\n\\}`));
  return match?.[1];
}

/** Collapse runs of whitespace so SQL can be matched without minding layout. */
const sql = MIGRATION_SQL.replace(/\s+/g, ' ');

describe('activity engine schema', () => {
  it('ships exactly one add_activity_engine migration', () => {
    expect(ACTIVITY_MIGRATION).toHaveLength(1);
  });

  describe.each([
    ['ActivityEvent', 'activity_events'],
    ['DailyRollup', 'daily_rollups'],
    ['StreakState', 'streak_states'],
    ['UserGoal', 'user_goals'],
  ])('%s', (model, table) => {
    it(`exists and maps to the plural snake_case table "${table}"`, () => {
      expect(modelBlock(model)).toBeDefined();
      expect(modelBlock(model)).toContain(`@@map("${table}")`);
      expect(sql).toContain(`CREATE TABLE "${table}"`);
    });
  });

  describe('idempotency (contract §4.3)', () => {
    it('declares @@unique([userId, clientEventId]) on ActivityEvent', () => {
      expect(modelBlock('ActivityEvent')).toMatch(
        /@@unique\(\[userId, clientEventId\]\)/,
      );
    });

    it('creates the unique index in the database, not just the model', () => {
      expect(sql).toContain(
        'CREATE UNIQUE INDEX "activity_events_user_id_client_event_id_key" ON "activity_events"("user_id", "client_event_id")',
      );
    });

    it('scopes idempotency to the user, so two users may mint the same UUID', () => {
      // The unique key must lead with user_id and must not be on
      // client_event_id alone, which would collide across users.
      expect(sql).not.toMatch(
        /CREATE UNIQUE INDEX "[^"]*" ON "activity_events"\("client_event_id"\)/,
      );
    });
  });

  describe('UserGoal is effective-dated and append-only (contract §7.4, §7.5)', () => {
    const block = modelBlock('UserGoal');

    it('carries effectiveFrom as a required DATE', () => {
      expect(block).toMatch(/effectiveFrom\s+DateTime\s+@map\("effective_from"\) @db\.Date/);
      expect(sql).toContain('"effective_from" DATE NOT NULL');
    });

    it('carries effectiveTo as a nullable DATE', () => {
      expect(block).toMatch(/effectiveTo\s+DateTime\?\s+@map\("effective_to"\) @db\.Date/);
      expect(sql).toContain('"effective_to" DATE,');
    });

    it('prevents two goals for one (user, faith) starting on the same day', () => {
      expect(block).toMatch(/@@unique\(\[userId, faithId, effectiveFrom\]\)/);
      expect(sql).toContain(
        'CREATE UNIQUE INDEX "user_goals_user_id_faith_id_effective_from_key" ON "user_goals"("user_id", "faith_id", "effective_from")',
      );
    });

    it('does NOT collapse to one row per (user, faith) — that would destroy history', () => {
      // A @@unique or @@id on [userId, faithId] alone would make the table a
      // single mutable current row and break replay (contract §7.5).
      expect(block).not.toMatch(/@@unique\(\[userId, faithId\]\)/);
      expect(block).not.toMatch(/@@id\(\[userId, faithId\]\)/);
      expect(sql).not.toMatch(
        /ON "user_goals"\("user_id", "faith_id"\)/,
      );
    });

    it('has a surrogate id, so a closed row and its successor can coexist', () => {
      expect(block).toMatch(/id\s+String\s+@id @default\(uuid\(\)\)/);
    });
  });

  describe('what the schema does NOT enforce — stated, not papered over', () => {
    it('has no range-exclusion constraint on user_goals', () => {
      // Full non-overlap of arbitrary [effective_from, effective_to) ranges
      // needs `EXCLUDE USING gist (... WITH &&)` and the btree_gist extension.
      // That is not expressible in schema.prisma, so `prisma migrate diff`
      // cannot emit it and every later diff would read it as drift.
      //
      // What the unique key above DOES prevent is the only overlap a correct
      // PUT /goal can produce: two rows starting on the same local day. Closed
      // ranges overlapping each other, and more than one open row, are
      // application invariants — PUT /goal must close the open row and insert
      // the new one in a single transaction (Task 1.6).
      //
      // Replay does not depend on either. The in-force lookup is
      //   WHERE user_id = ? AND faith_id = ? AND effective_from <= D
      //   ORDER BY effective_from DESC LIMIT 1
      // which is total and single-valued whatever effective_to holds, because
      // the unique key guarantees the ORDER BY can never tie.
      expect(sql).not.toContain('EXCLUDE');
      expect(sql).not.toContain('btree_gist');
    });

    it('has no CHECK constraint on the faith_id / activity_type / goal_type enums', () => {
      // These are TEXT columns. The contract's enums (§1.1–§1.3), including
      // "an activityType belongs to exactly one faith", are validated in the
      // DTO layer (Task 1.4), not by the database.
      expect(sql).not.toContain('CHECK');
    });
  });

  describe('indexes serve the frozen contract', () => {
    it('indexes (userId, faithId, localDay) for /today counts and /history ranges', () => {
      expect(sql).toContain(
        'CREATE INDEX "activity_events_user_id_faith_id_local_day_idx" ON "activity_events"("user_id", "faith_id", "local_day")',
      );
    });

    it('indexes (userId, faithId, activityType, localDay) for goal progress', () => {
      expect(sql).toContain(
        'CREATE INDEX "activity_events_user_id_faith_id_activity_type_local_day_idx" ON "activity_events"("user_id", "faith_id", "activity_type", "local_day")',
      );
    });

    it('keys DailyRollup and StreakState for the backwards streak walk', () => {
      expect(sql).toContain(
        'CONSTRAINT "daily_rollups_pkey" PRIMARY KEY ("user_id","faith_id","local_day")',
      );
      expect(sql).toContain(
        'CONSTRAINT "streak_states_pkey" PRIMARY KEY ("user_id","faith_id")',
      );
    });
  });

  describe('column semantics the contract depends on', () => {
    it('stores localDay as DATE, not a timestamp', () => {
      // A timestamp would reintroduce the timezone the local day exists to
      // eliminate (contract §2.1).
      expect(sql).toContain('"local_day" DATE NOT NULL');
      expect(sql).not.toContain('"local_day" TIMESTAMP');
    });

    it('stores occurredAt as a timestamp, separate from localDay', () => {
      expect(sql).toMatch(/"occurred_at" TIMESTAMP\(\d\) NOT NULL/);
    });

    it('requires timezone on every event', () => {
      expect(sql).toContain('"timezone" TEXT NOT NULL');
    });

    it('allows sourceRef to be absent', () => {
      expect(sql).toContain('"source_ref" TEXT,');
    });

    it('defaults quantity to 1 (contract §4.1)', () => {
      expect(sql).toContain('"quantity" INTEGER NOT NULL DEFAULT 1');
    });

    it('grants 2 streak freezes rather than earning them (contract §5.4)', () => {
      expect(sql).toContain('"freezes_left" INTEGER NOT NULL DEFAULT 2');
    });

    it('allows a user who has never met a goal (nullable lastGoalMetDay)', () => {
      expect(sql).toContain('"last_goal_met_day" DATE,');
    });

    it('stores DailyRollup counts as JSONB defaulting to an empty object', () => {
      expect(sql).toContain(`"counts" JSONB NOT NULL DEFAULT '{}'`);
    });
  });

  describe('the migration is purely additive', () => {
    // DATABASE_URL points at a shared RDS instance with 72 pre-existing tables
    // and live user data. This is a standing regression guard, not a one-time
    // eyeball: nothing in this migration may touch anything that already
    // exists.
    const statements = MIGRATION_SQL.split(';')
      .map((s) => s.replace(/^\s*(--[^\n]*\n)*/, '').trim())
      .filter(Boolean);

    it('contains only CREATE TABLE and CREATE INDEX statements', () => {
      const offending = statements.filter(
        (s) => !/^CREATE (TABLE|UNIQUE INDEX|INDEX)\b/i.test(s),
      );
      expect(offending).toEqual([]);
    });

    it('contains no DROP, ALTER or RENAME', () => {
      expect(MIGRATION_SQL).not.toMatch(/\bDROP\b/i);
      expect(MIGRATION_SQL).not.toMatch(/\bALTER\b/i);
      expect(MIGRATION_SQL).not.toMatch(/\bRENAME\b/i);
      expect(MIGRATION_SQL).not.toMatch(/\bTRUNCATE\b/i);
    });

    it('creates only the four new tables and touches no existing one', () => {
      const created = [...MIGRATION_SQL.matchAll(/CREATE TABLE "([^"]+)"/g)].map(
        (m) => m[1],
      );
      expect(created.sort()).toEqual([
        'activity_events',
        'daily_rollups',
        'streak_states',
        'user_goals',
      ]);

      const targeted = [...MIGRATION_SQL.matchAll(/ON "([^"]+)"/g)].map((m) => m[1]);
      expect([...new Set(targeted)].sort()).toEqual([
        'activity_events',
        'user_goals',
      ]);
    });

    it('adds no foreign key, matching DhikrCounter and the other faith tables', () => {
      // A relation to User would need a back-relation field on the User model,
      // which Task 1.3 may not modify.
      expect(MIGRATION_SQL).not.toMatch(/FOREIGN KEY/i);
    });
  });

  describe('existing models are untouched', () => {
    it('leaves DhikrCounter — the convention this task follows — intact', () => {
      const dhikr = modelBlock('DhikrCounter');
      expect(dhikr).toContain('@@map("dhikr_counters")');
      expect(dhikr).toMatch(/userId\s+String\s+@map\("user_id"\)/);
    });
  });
});
