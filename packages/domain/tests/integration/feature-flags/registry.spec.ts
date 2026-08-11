// Feature-flag registry + inventory — live-DB integration (Story 10.8, Task 11; AC1/AC3/AC4/AC9).
//
// Covers: the THREE-tier in-force precedence (override ≻ global row ≻ code default); effective-window
// resolution; version numbering starting at 2 past the code default's 1; the supersession
// forward-pointer + INSERT-not-UPDATE immutability; the 23505 → FlagVersionConflictError 409 seam;
// replay-by-version; and the AC4 inventory-COMPLETENESS property.
//
// Live DB only. Own-committing writers accumulate rows → assert membership/shape, NEVER global counts
// ([[project_live_db_test_gotchas]]).
//
// ⚠ Global (pariwar_id IS NULL) rows are seeded as the SUPERUSER, before entering app scope. That is
// not a test shortcut — it mirrors production: the INSERT policy deliberately has no null leg, so a
// tenant-scoped caller can never author a global row (they are a service-pool/seed path). Writing the
// seeds under app scope would fail with 42501, which the RLS spec asserts separately.

import { randomUUID } from 'node:crypto';

import { and, eq, isNull, sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import {
  FlagEffectiveFromOutOfOrderError,
  FlagVersionConflictError,
  FlagVersionDuplicateIdError,
  FlagVersionInvalidError,
} from '../../../src/feature-flags/errors.js';
import type { FeatureFlagVersionId } from '../../../src/ids/index.js';
import {
  DEFAULT_FLAG_VERSION,
  FLAG_KEYS,
  createFlagVersion,
  flagVersionForVersion,
  flagVersionInForce,
} from '../../../src/feature-flags/registry.js';
import { listEffectiveFlags, listFlagVersions } from '../../../src/feature-flags/store.js';
import { featureFlagVersions } from '../../../src/schema/feature_flag_versions.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope } from '../_helpers.js';

const KEY = 'kyc_manual_fallback';
const AT = new Date('2026-08-10T00:00:00.000Z');
const DEAD_BY = new Date('2027-06-30T00:00:00.000Z');
// ⚠ The pinned seed instant for rows written through `createFlagVersion`, whose `effective_from`
// otherwise defaults to the DB clock (registry.ts). Read against the fixed `AT`, such a row falls out
// of force the moment wall-clock passes `AT` — which is exactly what took the AC4 test below red at
// 2026-08-10T00:00Z. Every raw-insert seed in this file was already pinned via `values()`; this is
// the same discipline for the one seed that goes through the writer. Must stay in the PAST: the
// writer rejects `effectiveFrom > now`.
const SEEDED_FROM = new Date('2026-01-01T00:00:00.000Z');

function values(
  pariwarId: string | null,
  overrides: Partial<typeof featureFlagVersions.$inferInsert> = {},
): typeof featureFlagVersions.$inferInsert {
  return {
    flagKey: KEY,
    pariwarId: pariwarId as never,
    version: 2,
    cohortDefinition: { clauses: [] },
    state: 'full',
    fallbackDefault: true,
    owner: 'kyc-desk',
    deadBy: DEAD_BY,
    effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
    rationale: 'integration seed',
    ...overrides,
  };
}

describe.skipIf(!hasDatabase)('feature-flag registry — three-tier resolution (AC1)', () => {
  setupLiveDb();

  it('TIER 3: no rows anywhere resolves to the CODE DEFAULT (version 1)', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const inForce = await flagVersionInForce(tx, KEY, PARIWAR_A, AT);
    expect(inForce?.source).toBe('default');
    expect(inForce?.document.version).toBe(DEFAULT_FLAG_VERSION);
    // The registry's own seed: every flag ships `off`, so a flag's ARRIVAL never changes behaviour.
    expect(inForce?.document.state).toBe('off');
  });

  it('TIER 2: a GLOBAL row beats the code default, for every tenant', async () => {
    const { client, tx } = getTx();
    await tx.insert(featureFlagVersions).values(values(null, { state: 'canary' }));

    for (const pariwar of [PARIWAR_A, PARIWAR_B]) {
      await enterAppScope(client, pariwar);
      const inForce = await flagVersionInForce(tx, KEY, pariwar, AT);
      expect(inForce?.source, `pariwar ${pariwar}`).toBe('global');
      expect(inForce?.document.state).toBe('canary');
    }
  });

  it('TIER 1: a per-Pariwar OVERRIDE beats the global row — for that tenant only', async () => {
    const { client, tx } = getTx();
    await tx.insert(featureFlagVersions).values(values(null, { state: 'canary' }));
    await tx.insert(featureFlagVersions).values(values(PARIWAR_A, { state: 'full' }));

    await enterAppScope(client, PARIWAR_A);
    const a = await flagVersionInForce(tx, KEY, PARIWAR_A, AT);
    expect(a?.source).toBe('override');
    expect(a?.document.state).toBe('full');

    // ⚠ The tenant-isolation half of the same property: B is unaffected by A's override and still
    // reads the global row. This is the "changes nothing for other tenants" claim, checked.
    await enterAppScope(client, PARIWAR_B);
    const b = await flagVersionInForce(tx, KEY, PARIWAR_B, AT);
    expect(b?.source).toBe('global');
    expect(b?.document.state).toBe('canary');
  });

  it('resolves the EFFECTIVE WINDOW: before `effective_from` and at/after `effective_until` do not apply', async () => {
    const { client, tx } = getTx();
    await tx.insert(featureFlagVersions).values(
      values(PARIWAR_A, {
        state: 'full',
        effectiveFrom: new Date('2026-06-01T00:00:00.000Z'),
        effectiveUntil: new Date('2026-07-01T00:00:00.000Z'),
      }),
    );
    await enterAppScope(client, PARIWAR_A);

    // Before the window → falls through to the code default.
    expect((await flagVersionInForce(tx, KEY, PARIWAR_A, new Date('2026-05-01T00:00:00Z')))?.source).toBe('default');
    // Inside → the override.
    expect((await flagVersionInForce(tx, KEY, PARIWAR_A, new Date('2026-06-15T00:00:00Z')))?.source).toBe('override');
    // Half-open interval: the exact `effective_until` instant is already OUT, so no instant is ever
    // covered by two consecutive versions.
    expect((await flagVersionInForce(tx, KEY, PARIWAR_A, new Date('2026-07-01T00:00:00Z')))?.source).toBe('default');
  });

  it('returns null for an UNREGISTERED key rather than inventing a flag', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    expect(await flagVersionInForce(tx, 'not_a_registered_flag', PARIWAR_A, AT)).toBeNull();
  });
});

describe.skipIf(!hasDatabase)('feature-flag flip — immutable versioning (AC1/AC3)', () => {
  setupLiveDb();

  it('the FIRST flip is version 2 (the code default owns 1)', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const row = await createFlagVersion(tx, {
      flagKey: KEY,
      pariwarId: PARIWAR_A,
      state: 'canary',
      cohortDefinition: { clauses: [{ dimension: 'district', op: 'in', values: ['patna'] }] },
      fallbackDefault: true,
      owner: 'kyc-desk',
      deadBy: DEAD_BY,
      rationale: 'patna pilot',
      actorWhoFlipped: null,
      actorDisplay: null,
      auditId: null,
    });
    expect(row.version).toBe(DEFAULT_FLAG_VERSION + 1);
    expect(row.supersededByVersion).toBeNull();
  });

  it('⚠ a flip INSERTs and points the prior row forward — it NEVER rewrites history', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);

    // `canary` carries a cohort (a staged state must name one) and graduates to `rollout`, not
    // straight to `full` — the AC7 ladder forbids skipping a rung.
    const first = await createFlagVersion(tx, {
      flagKey: KEY,
      pariwarId: PARIWAR_A,
      state: 'canary',
      cohortDefinition: { clauses: [{ dimension: 'district', op: 'in', values: ['patna'] }] },
      fallbackDefault: true,
      owner: 'kyc-desk',
      deadBy: DEAD_BY,
      rationale: 'start the canary',
      actorWhoFlipped: null,
      actorDisplay: null,
      auditId: null,
      effectiveFrom: new Date('2026-06-01T00:00:00.000Z'),
    });
    const second = await createFlagVersion(tx, {
      flagKey: KEY,
      pariwarId: PARIWAR_A,
      state: 'rollout',
      cohortDefinition: { clauses: [{ dimension: 'district', op: 'in', values: ['patna', 'gaya'] }] },
      fallbackDefault: true,
      owner: 'kyc-desk',
      deadBy: DEAD_BY,
      rationale: 'graduate to rollout',
      actorWhoFlipped: null,
      actorDisplay: null,
      auditId: null,
      effectiveFrom: new Date('2026-06-15T00:00:00.000Z'),
    });
    expect(second.version).toBe(first.version + 1);

    // The prior row still exists, unchanged EXCEPT the forward-pointer. This is what makes
    // "historical flag states are queryable for past evaluations" true.
    const priorRows = await tx
      .select()
      .from(featureFlagVersions)
      .where(
        and(
          eq(featureFlagVersions.pariwarId, PARIWAR_A),
          eq(featureFlagVersions.flagKey, KEY),
          eq(featureFlagVersions.version, first.version),
        ),
      );
    expect(priorRows).toHaveLength(1);
    expect(priorRows[0]?.state).toBe('canary'); // NOT rewritten to 'rollout'
    expect(priorRows[0]?.rationale).toBe('start the canary');
    expect(priorRows[0]?.supersededByVersion).toBe(second.version);

    // ⚠ POINT-IN-TIME REPLAY — the property that forced the Review Pass 2 resolution rule to be
    // "newest row with effective_from <= at, then check ITS window" rather than the obvious-looking
    // `superseded_by_version IS NULL`. Every historical row is superseded by definition, so filtering
    // superseded rows out would make this assertion return the code default and silently destroy
    // AC1's "historical flag states are queryable for past evaluations".
    const atCanary = await flagVersionInForce(tx, KEY, PARIWAR_A, new Date('2026-06-10T00:00:00Z'));
    expect(atCanary?.document.state).toBe('canary');
    expect(atCanary?.document.version).toBe(first.version);
    const atRollout = await flagVersionInForce(tx, KEY, PARIWAR_A, new Date('2026-06-20T00:00:00Z'));
    expect(atRollout?.document.state).toBe('rollout');
    expect(atRollout?.document.version).toBe(second.version);
  });

  it('⚠ a SUPERSEDED version never resurrects when the superseding version expires', async () => {
    // The Review Pass 2 regression this rule exists for. v2 is open-ended `rollout`; v3 is a BOUNDED
    // rollback window. Under the old "newest row still inside its window" rule, the moment v3's
    // window closed, v2 became the newest in-window row again and the flag silently reverted to its
    // PRE-ROLLBACK state — with `superseded_by_version = 3` sitting on the row that was governing.
    // Whatever caused an operator to roll back must not undo itself on a timer.
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);

    await createFlagVersion(tx, {
      flagKey: KEY,
      pariwarId: PARIWAR_A,
      state: 'canary',
      cohortDefinition: { clauses: [{ dimension: 'district', op: 'in', values: ['patna'] }] },
      fallbackDefault: true,
      owner: 'kyc-desk',
      deadBy: DEAD_BY,
      rationale: 'canary',
      actorWhoFlipped: null,
      actorDisplay: null,
      auditId: null,
      effectiveFrom: new Date('2026-06-01T00:00:00.000Z'),
    });
    await createFlagVersion(tx, {
      flagKey: KEY,
      pariwarId: PARIWAR_A,
      state: 'rolled_back',
      cohortDefinition: { clauses: [] },
      fallbackDefault: true,
      owner: 'kyc-desk',
      deadBy: DEAD_BY,
      rationale: 'incident — bounded rollback window',
      actorWhoFlipped: null,
      actorDisplay: null,
      auditId: null,
      effectiveFrom: new Date('2026-06-10T00:00:00.000Z'),
      effectiveUntil: new Date('2026-06-20T00:00:00.000Z'),
    });

    // Inside the rollback window: rolled back.
    expect(
      (await flagVersionInForce(tx, KEY, PARIWAR_A, new Date('2026-06-15T00:00:00Z')))?.document.state,
    ).toBe('rolled_back');

    // AFTER it closes: the code default, NOT a resurrected `canary`.
    const afterExpiry = await flagVersionInForce(tx, KEY, PARIWAR_A, new Date('2026-06-25T00:00:00Z'));
    expect(afterExpiry?.source).toBe('default');
    expect(afterExpiry?.document.state).toBe('off');

    // …and replay BEFORE the rollback still sees the canary. Both properties at once.
    expect(
      (await flagVersionInForce(tx, KEY, PARIWAR_A, new Date('2026-06-05T00:00:00Z')))?.document.state,
    ).toBe('canary');
  });

  it('replays any historical version by pin; version 1 is always the code default', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    // `rolled_back` is not reachable as a flag's FIRST version (nothing has been rolled back yet) —
    // launch a canary first, then roll it back. The AC7 ladder.
    await createFlagVersion(tx, {
      flagKey: KEY,
      pariwarId: PARIWAR_A,
      state: 'canary',
      cohortDefinition: { clauses: [{ dimension: 'district', op: 'in', values: ['patna'] }] },
      fallbackDefault: true,
      owner: 'kyc-desk',
      deadBy: DEAD_BY,
      rationale: 'launch',
      actorWhoFlipped: null,
      actorDisplay: null,
      auditId: null,
    });
    const row = await createFlagVersion(tx, {
      flagKey: KEY,
      pariwarId: PARIWAR_A,
      state: 'rolled_back',
      cohortDefinition: { clauses: [] },
      fallbackDefault: true,
      owner: 'kyc-desk',
      deadBy: DEAD_BY,
      rationale: 'rollback',
      actorWhoFlipped: null,
      actorDisplay: null,
      auditId: null,
    });
    expect((await flagVersionForVersion(tx, KEY, PARIWAR_A, row.version))?.state).toBe('rolled_back');
    expect((await flagVersionForVersion(tx, KEY, PARIWAR_A, DEFAULT_FLAG_VERSION))?.state).toBe('off');
    expect(await flagVersionForVersion(tx, KEY, PARIWAR_A, 999)).toBeNull();
  });

  it('a CONCURRENT duplicate version raises FlagVersionConflictError (the 409 seam)', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);

    // Simulate the real race: `createFlagVersion` reads the latest version, computes nextVersion, and
    // THEN inserts. A concurrent flip that lands between those two steps makes the computed version
    // stale. Here the seeded row IS that concurrent flip — it already occupies version 2, so the
    // in-flight call's `nextVersion = 2` collides on the unique constraint.
    //
    // Its `effectiveFrom` is deliberately in the PAST relative to the flip below, so the
    // out-of-order guard (which fires first when a flip predates the latest row) does NOT mask the
    // conflict — the collision is what we mean to observe.
    await tx.insert(featureFlagVersions).values(
      values(PARIWAR_A, { version: 2, effectiveFrom: new Date('2026-01-01T00:00:00.000Z') }),
    );

    // The winner: it sees version 2 and claims 3.
    const next = await createFlagVersion(tx, {
      flagKey: KEY,
      pariwarId: PARIWAR_A,
      state: 'full',
      cohortDefinition: { clauses: [] },
      fallbackDefault: true,
      owner: 'kyc-desk',
      deadBy: DEAD_BY,
      rationale: 'the winning flip',
      actorWhoFlipped: null,
      actorDisplay: null,
      auditId: null,
      effectiveFrom: new Date('2026-02-01T00:00:00.000Z'),
    });
    expect(next.version).toBe(3);

    // ⚠ THIS ASSERTION USED TO BE VACUOUS (Review Pass 2). It ended with a RAW `tx.insert(...)`
    // asserting `code === '23505'` — i.e. it asserted that Postgres enforces its own unique
    // constraint, and never invoked the function it is named for. Neither `isUniqueViolation` (which
    // reads `err.code` AND `err.cause.code` — the shape this repo has been burned by before) nor the
    // 23505 → FlagVersionConflictError mapping was exercised by ANY test: deleting the whole `catch`
    // block left the suite green.
    //
    // A VERSION collision cannot be forced on one connection — `createFlagVersion` always claims
    // `max(version) + 1`, so seeding a row just raises the max. Proving that mapping needs a genuine
    // two-connection race, which is the test below. What IS deterministic here is the `id` collision,
    // which drives the SAME `isUniqueViolation` → `uniqueViolationTarget` code path.
    //
    // A SAVEPOINT wraps the failing call because a unique violation aborts the enclosing transaction;
    // without it every later statement in this tx would fail with 25P02.
    const pinnedId = randomUUID() as FeatureFlagVersionId;
    await createFlagVersion(tx, {
      flagKey: KEY,
      pariwarId: PARIWAR_A,
      state: 'rolled_back',
      cohortDefinition: { clauses: [] },
      fallbackDefault: true,
      owner: 'kyc-desk',
      deadBy: DEAD_BY,
      rationale: 'the first write, with a caller-pinned id',
      actorWhoFlipped: null,
      actorDisplay: null,
      auditId: null,
      id: pinnedId,
      effectiveFrom: new Date('2026-03-01T00:00:00.000Z'),
    });

    await tx.execute(sql`SAVEPOINT before_conflict`);
    const err = await createFlagVersion(tx, {
      flagKey: KEY,
      pariwarId: PARIWAR_A,
      state: 'off',
      cohortDefinition: { clauses: [] },
      fallbackDefault: true,
      owner: 'kyc-desk',
      deadBy: DEAD_BY,
      rationale: 'an idempotency REPLAY of that same write',
      actorWhoFlipped: null,
      actorDisplay: null,
      auditId: null,
      id: pinnedId,
      effectiveFrom: new Date('2026-03-02T00:00:00.000Z'),
    }).catch((e: unknown) => e);
    await tx.execute(sql`ROLLBACK TO SAVEPOINT before_conflict`);

    // ⚠ And it must be the DUPLICATE-ID error, not the version-conflict one. Reporting an id replay
    // as a concurrent-flip race hands the caller advice ("re-read the latest version and retry")
    // that re-sends the same id and reproduces the identical failure forever.
    expect(err).toBeInstanceOf(FlagVersionDuplicateIdError);
    expect(err).not.toBeInstanceOf(FlagVersionConflictError);
  });

  // The genuine two-connection VERSION race lives in `flag-flip-concurrency.spec.ts` — it needs real
  // concurrent COMMITs on separate pool clients, which a rollback-per-test suite cannot provide
  // (the established `utr-attestation-concurrency.spec.ts` / `pool-stream-concurrency.spec.ts`
  // own-committing pattern).

  it('rejects a flip whose effectiveFrom precedes the scope’s latest version (order guard)', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await createFlagVersion(tx, {
      flagKey: KEY,
      pariwarId: PARIWAR_A,
      state: 'canary',
      cohortDefinition: { clauses: [{ dimension: 'district', op: 'in', values: ['patna'] }] },
      fallbackDefault: true,
      owner: 'kyc-desk',
      deadBy: DEAD_BY,
      rationale: 'first',
      actorWhoFlipped: null,
      actorDisplay: null,
      auditId: null,
      effectiveFrom: new Date('2026-06-01T00:00:00.000Z'),
    });
    // Publishing backwards in time would make the supersession chain disagree with window-based
    // resolution — the newest row would not be the one in force.
    const err = await createFlagVersion(tx, {
      flagKey: KEY,
      pariwarId: PARIWAR_A,
      // Same state (a legal identity transition), so the ONLY thing under test is the order guard.
      state: 'canary',
      cohortDefinition: { clauses: [{ dimension: 'district', op: 'in', values: ['gaya'] }] },
      fallbackDefault: true,
      owner: 'kyc-desk',
      deadBy: DEAD_BY,
      rationale: 'backdated',
      actorWhoFlipped: null,
      actorDisplay: null,
      auditId: null,
      effectiveFrom: new Date('2026-05-01T00:00:00.000Z'),
    }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(FlagEffectiveFromOutOfOrderError);
  });

  it('rejects a malformed document BEFORE persisting (the author sees it, not a member)', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const err = await createFlagVersion(tx, {
      flagKey: KEY,
      pariwarId: PARIWAR_A,
      state: 'canary',
      cohortDefinition: { clauses: [{ dimension: 'zodiac', op: 'in', values: ['leo'] }] },
      fallbackDefault: true,
      owner: 'kyc-desk',
      deadBy: DEAD_BY,
      rationale: 'bad rule',
      actorWhoFlipped: null,
      actorDisplay: null,
      auditId: null,
    }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(FlagVersionInvalidError);

    // Nothing was written.
    const rows = await tx
      .select()
      .from(featureFlagVersions)
      .where(and(eq(featureFlagVersions.pariwarId, PARIWAR_A), eq(featureFlagVersions.flagKey, KEY)));
    expect(rows).toHaveLength(0);
  });
});

describe.skipIf(!hasDatabase)('the inventory is COMPLETE — no secret flags (AC4)', () => {
  setupLiveDb();

  it('⚠ EVERY registered flag appears in the inventory, including ones never flipped', async () => {
    const { client, tx } = getTx();
    // Flip exactly ONE flag. A row-driven listing would return 1 entry; a registry-driven one
    // returns all of them. That difference IS the no-secret-flags property.
    await enterAppScope(client, PARIWAR_A);
    await createFlagVersion(tx, {
      flagKey: KEY,
      pariwarId: PARIWAR_A,
      state: 'canary',
      cohortDefinition: { clauses: [{ dimension: 'district', op: 'in', values: ['patna'] }] },
      fallbackDefault: true,
      owner: 'kyc-desk',
      deadBy: DEAD_BY,
      effectiveFrom: SEEDED_FROM,
      rationale: 'the only flip',
      actorWhoFlipped: null,
      actorDisplay: null,
      auditId: null,
    });

    const inventory = await listEffectiveFlags(tx, PARIWAR_A, AT);
    expect(inventory.map((e) => e.flagKey).sort()).toEqual([...FLAG_KEYS]);

    // The flipped one shows its override. A flag that is registered but omitted from the inventory
    // would fail the set-equality assertion above.
    const flipped = inventory.find((e) => e.flagKey === KEY);
    expect(flipped?.source).toBe('override');

    // ⚠ NOT `every(e => e.source === 'default')` (Review Pass 3). That coupled this test to the state
    // of the whole shared database: it held only while NO global row existed for ANY flag anywhere,
    // and `apps/api`'s feature-flag E2E suite own-commits exactly such a row for
    // `wa_cost_optimization`. Under `ci:local`'s `--concurrency=4` the two packages run in parallel,
    // so this failed intermittently with a message pointing at inventory completeness — a property
    // that was in fact fine. The real property here is that THIS TENANT has no other OVERRIDE; a
    // global row is a legitimate `global` and violates nothing. (Same fix as its `apps/api` twin.)
    expect(inventory.filter((e) => e.flagKey !== KEY).every((e) => e.source !== 'override')).toBe(true);
  });

  it('every inventory entry carries the lifecycle + attribution fields the console renders', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    for (const entry of await listEffectiveFlags(tx, PARIWAR_A, AT)) {
      expect(entry.owner.length, entry.flagKey).toBeGreaterThan(0);
      expect(entry.deadBy, entry.flagKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(entry.description.length, entry.flagKey).toBeGreaterThan(0);
    }
  });

  it('the GLOBAL catalog view (pariwarId: null) skips the override tier by construction', async () => {
    const { client, tx } = getTx();
    await tx.insert(featureFlagVersions).values(values(null, { state: 'canary' }));
    await tx.insert(featureFlagVersions).values(values(PARIWAR_A, { state: 'full' }));
    await enterAppScope(client, PARIWAR_A);

    const catalog = await listEffectiveFlags(tx, null, AT);
    const entry = catalog.find((e) => e.flagKey === KEY);
    expect(entry?.source).toBe('global');
    expect(entry?.document.state).toBe('canary'); // NOT A's 'full' override
    expect(catalog.map((e) => e.flagKey).sort()).toEqual([...FLAG_KEYS]);
  });

  it('version history returns the tenant’s own rows AND the global rows (both governed it)', async () => {
    const { client, tx } = getTx();
    await tx.insert(featureFlagVersions).values(values(null, { state: 'canary' }));
    await tx.insert(featureFlagVersions).values(values(PARIWAR_A, { state: 'full' }));
    await tx.insert(featureFlagVersions).values(values(PARIWAR_B, { state: 'off' }));
    await enterAppScope(client, PARIWAR_A);

    const history = await listFlagVersions(tx, KEY, PARIWAR_A);
    // Membership, not counts — own-committing writers accumulate ([[project_live_db_test_gotchas]]).
    expect(history.rows.some((r) => r.pariwarId === null)).toBe(true);
    expect(history.rows.some((r) => r.pariwarId === PARIWAR_A)).toBe(true);
    expect(history.rows.some((r) => r.pariwarId === PARIWAR_B)).toBe(false); // RLS-filtered
    // The truncation signal exists and is honest for a short history (Review Pass 2 — this read used
    // to drop everything past row 100 with no way for a consumer to know).
    expect(history.hasMore).toBe(false);
  });
});

describe.skipIf(!hasDatabase)('the GLOBAL row is a service-pool path (AC1 carve-out)', () => {
  setupLiveDb();

  it('a global row seeded outside tenant scope is readable by every tenant', async () => {
    const { client, tx } = getTx();
    await tx.insert(featureFlagVersions).values(values(null, { state: 'rollout' }));
    for (const pariwar of [PARIWAR_A, PARIWAR_B]) {
      await enterAppScope(client, pariwar);
      const rows = await tx
        .select()
        .from(featureFlagVersions)
        .where(and(eq(featureFlagVersions.flagKey, KEY), isNull(featureFlagVersions.pariwarId)));
      expect(rows.length, `pariwar ${pariwar}`).toBeGreaterThan(0);
    }
  });
});
