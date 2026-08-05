// ⭐ The D3 OBSERVATIONAL-EQUIVALENCE invariant — Story 10.24 (Task 2; AC1). Live DB (:5433).
//
// Story 10.24 ships TWO projections maintained by TWO DIFFERENT mechanisms:
//   · `member_contribution_ledger`  — an events_log AFTER-INSERT TRIGGER (migration 0093)
//   · `member_pool_assignments`     — an EXPLICIT domain writer (`insertMemberPoolAssignments`)
//
// That is a real hazard. Two projection styles drift into subtly different guarantees — ordering,
// idempotency, transactional boundary, what a replay reproduces — and the divergence surfaces years
// later as a fact that disagrees with its own source. THE MECHANISM IS AN IMPLEMENTATION DETAIL; THE
// PROJECTED STATE IS THE CONTRACT. The difference between the two must be WHERE the write is invoked,
// and nothing else.
//
// So this file is ONE SHARED TEST BODY (`runProjectionInvariants`) parameterized by mechanism and run
// TWICE — never two parallel files that can drift apart. Four properties, asserted identically:
//
//   │ Atomicity              │ the projection row commits/rolls back WITH its source write
//   │ Idempotency            │ applying the same source twice → byte-identical state, never a dup
//   │ Replay equivalence     │ a from-scratch BACKFILL reproduces the incrementally-maintained state
//   │ Ordering-independence  │ the state is a function of the source SET, not of arrival order
//
// Replay equivalence is the load-bearing one: it is what makes the backfill a genuine REPAIR path
// rather than a second, differently-wrong producer.
//
// Plus the acceptance-level tie to what actually matters (D3): `deriveContributionFacts` over the
// INCREMENTALLY-maintained tables and over FRESHLY-BACKFILLED tables must return IDENTICAL facts for
// the same (member, at). A diff there is a P0 finding, not a tolerance — one of the mechanisms is
// wrong and every fact downstream is untrustworthy. That check lives in `contribution-facts.spec.ts`
// (it needs the pure derivation, which lives in @twt/validity-service and cannot be imported here).
//
// Own-committing writers accumulate rows, so every assertion is MEMBERSHIP or an explicitly-scoped
// count over ids this test itself minted ([[project_live_db_test_gotchas]]).

import { createHash, randomUUID } from 'node:crypto';

import { and, eq, sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import type pg from 'pg';

import type { Db } from '../../../src/db.js';
import { CONFIRMED_EVENT_TYPE } from '../../../src/contribution/read.js';
import {
  backfillContributionLedger,
  backfillMemberPoolAssignments,
  insertMemberPoolAssignments,
} from '../../../src/contribution/projection-write.js';
import {
  claimId as toClaimId,
  cycleFreezeCommitId as toCycleId,
  memberId as toMemberId,
  pariwarId as toPariwarId,
  poolId as toPoolId,
} from '../../../src/ids/index.js';
import { RECONCILIATION_CONFIRMATION_REVERSED_EVENT_TYPE } from '../../../src/reconciliation/events.js';
import * as schema from '../../../src/schema/index.js';
import { eventsLog } from '../../../src/schema/events_log.js';
import { memberContributionLedger } from '../../../src/schema/member_contribution_ledger.js';
import { memberPoolAssignments } from '../../../src/schema/member_pool_assignments.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, enterAppScope } from '../_helpers.js';

const AT = new Date('2026-07-20T00:00:00Z');

/**
 * A DETERMINISTIC uuid derived from `(seed, tag)`. The ordering-independence property is only
 * meaningful if the two permuted runs mint IDENTICAL ids — otherwise the states differ for reasons
 * that have nothing to do with arrival order. `randomUUID()` would silently make that assertion
 * vacuous, so every id a mechanism fixture creates comes from here.
 */
function derivedId(seed: string, tag: string): string {
  const h = createHash('sha256').update(`${seed}:${tag}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/**
 * Seed the full source chain the ASSIGNMENT backfill rebuilds from: the cycle-freeze commit (which
 * supplies `assigned_at`), the pool, and the pool SNAPSHOT carrying `member_assignments`. The backfill
 * reads the persisted snapshot — never a recompute of `assignMembersToPools` (AC4) — so without this
 * chain the replay-equivalence assertion would pass vacuously against an empty rebuild.
 */
async function seedAssignmentSource(
  tx: Db,
  input: { poolId: string; cycleId: string; memberIds: readonly string[] },
): Promise<void> {
  await tx
    .insert(schema.cycleFreezeCommits)
    .values({
      commitId: toCycleId(input.cycleId),
      pariwarId: toPariwarId(PARIWAR_A),
      actorId: 'trustee-actor-1',
      actorDisplay: 'Trustee One',
      committedClaimIds: [],
      committedAt: AT,
    })
    .onConflictDoNothing();
  // The pool + snapshot are seeded with DETERMINISTIC ids and `onConflictDoNothing`, so a second
  // `apply` for the same member (the idempotency property) re-seeds nothing rather than colliding.
  await tx.execute(sql.raw("SET LOCAL app.pool_state_writer = 'on'"));
  try {
    await tx
      .insert(schema.pools)
      .values({
        poolId: toPoolId(input.poolId),
        pariwarId: toPariwarId(PARIWAR_A),
        cycleId: toCycleId(input.cycleId),
        claimCaseId: toClaimId(derivedId(input.poolId, 'claim')),
        poolIndex: 0,
        poolCanonicalIdentifier: `P-2026-07-${input.poolId.slice(0, 6)}`,
        supportCategory: 'death_support',
        benefitMechanism: 'pool',
        fixedAmount: 500,
        currentState: 'spawned',
        stateEventVersion: 1,
      })
      .onConflictDoNothing();
  } finally {
    await tx.execute(sql.raw("SET LOCAL app.pool_state_writer = 'off'"));
  }
  await tx
    .insert(schema.poolSnapshots)
    .values({
      snapshotId: derivedId(input.poolId, 'snapshot'),
      poolId: toPoolId(input.poolId),
      pariwarId: toPariwarId(PARIWAR_A),
      formatVersion: 1,
      schemaVersion: 'test',
      integrityHash: 'test',
      stateEventVersion: 1,
      snapshot: {
        member_assignments: input.memberIds.map((member_id) => ({ member_id })),
      } as never,
    })
    .onConflictDoNothing();
}

/**
 * Delete a member's projected rows — deliberately as the SESSION (superuser) role, because NEITHER
 * projection grants DELETE to `twt_app` (migration 0093): they are append projections whose repair
 * path is the idempotent backfill, never a truncate-and-rebuild. Running this under app scope raises
 * 42501, which is the design working; `assertNoAppDeleteGrant` below pins that directly so this
 * helper's role switch can never be mistaken for a workaround.
 */
async function clearAsSuperuser(client: pg.PoolClient, statement: string): Promise<void> {
  await client.query('RESET ROLE');
  try {
    await client.query(statement);
  } finally {
    await client.query('SET LOCAL ROLE twt_app');
  }
}

/** Append a `contribution.confirmed` to the alert stream (what the trigger keys on). */
async function appendConfirmed(
  tx: Db,
  streamId: string,
  memberId: string,
  poolId: string,
  version: number,
  occurredAt: Date,
): Promise<string> {
  const eventId = randomUUID();
  await tx.insert(eventsLog).values({
    eventId,
    streamId,
    eventType: CONFIRMED_EVENT_TYPE,
    payload: { memberId, poolId, alertId: streamId },
    eventVersion: version,
    actorId: null,
    pariwarId: PARIWAR_A,
    occurredAt,
  });
  return eventId;
}

/** Append a `reconciliation.confirmation-reversed` naming an exact confirmation event id. */
async function appendReversal(
  tx: Db,
  streamId: string,
  memberId: string,
  reversedConfirmedEventId: string,
  version: number,
  occurredAt: Date,
): Promise<string> {
  const eventId = randomUUID();
  await tx.insert(eventsLog).values({
    eventId,
    streamId,
    eventType: RECONCILIATION_CONFIRMATION_REVERSED_EVENT_TYPE,
    payload: { memberId, reversedConfirmedEventId, alertId: streamId },
    eventVersion: version,
    actorId: null,
    pariwarId: PARIWAR_A,
    occurredAt,
  });
  return eventId;
}

/** The ledger rows for one member, as a comparable, order-stable snapshot. */
async function ledgerState(tx: Db, memberId: string) {
  const rows = await tx
    .select()
    .from(memberContributionLedger)
    .where(
      and(
        eq(memberContributionLedger.pariwarId, PARIWAR_A),
        eq(memberContributionLedger.memberId, toMemberId(memberId)),
      ),
    );
  return rows
    .map((r) => ({
      confirmedEventId: r.confirmedEventId,
      poolId: String(r.poolId),
      confirmedAt: r.confirmedAt.toISOString(),
      reversedAt: r.reversedAt ? r.reversedAt.toISOString() : null,
    }))
    .sort((a, b) => (a.confirmedEventId < b.confirmedEventId ? -1 : 1));
}

/** The assignment rows for one member, as a comparable, order-stable snapshot. */
async function assignmentState(tx: Db, memberId: string) {
  const rows = await tx
    .select()
    .from(memberPoolAssignments)
    .where(
      and(
        eq(memberPoolAssignments.pariwarId, PARIWAR_A),
        eq(memberPoolAssignments.memberId, toMemberId(memberId)),
      ),
    );
  return rows
    .map((r) => ({
      poolId: String(r.poolId),
      cycleId: String(r.cycleId),
      assignedAt: r.assignedAt.toISOString(),
    }))
    .sort((a, b) => (a.poolId < b.poolId ? -1 : 1));
}

/**
 * The ONE shared invariant body. `apply` performs the mechanism's source write; `rebuild` runs the
 * mechanism's from-scratch backfill; `read` snapshots the projected state for the member.
 *
 * Both mechanisms are handed the SAME four assertions, verbatim — that identity is the point.
 */
interface MechanismUnderTest {
  readonly name: string;
  /** Perform the source write for `memberId`. `variant` lets the ordering test permute arrival order. */
  apply(tx: Db, memberId: string, variant: 'forward' | 'reverse'): Promise<void>;
  /** Rebuild the projection from scratch over the same source data (the REPAIR path). */
  rebuild(tx: Db): Promise<void>;
  /** Snapshot the projected state for `memberId`. */
  read(tx: Db, memberId: string): Promise<unknown>;
  /** Delete this member's projected rows, so `rebuild` genuinely rebuilds rather than no-ops. */
  clear(client: pg.PoolClient, memberId: string): Promise<void>;
}

function runProjectionInvariants(mechanism: MechanismUnderTest): void {
  describe(`${mechanism.name} — the four D3 properties`, () => {
    it('ATOMICITY: the projection row rolls back WITH its source write', async () => {
      const { tx, client } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const memberId = randomUUID();

      await tx.execute(sql.raw('SAVEPOINT d3_atomicity'));
      await mechanism.apply(tx, memberId, 'forward');
      expect(await mechanism.read(tx, memberId)).not.toEqual([]);

      await tx.execute(sql.raw('ROLLBACK TO SAVEPOINT d3_atomicity'));
      // The source write is gone; so is everything the projection derived from it. NOT "eventually
      // reconciled" — gone in the same transactional breath.
      expect(await mechanism.read(tx, memberId)).toEqual([]);
    });

    it('IDEMPOTENCY: applying the same source twice yields byte-identical state (no duplicate, no second increment)', async () => {
      const { tx, client } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const memberId = randomUUID();

      await mechanism.apply(tx, memberId, 'forward');
      const once = await mechanism.read(tx, memberId);
      await mechanism.apply(tx, memberId, 'forward');
      const twice = await mechanism.read(tx, memberId);

      expect(twice).toEqual(once);
    });

    it('REPLAY EQUIVALENCE: a from-scratch backfill reproduces the incrementally-maintained state byte-for-byte', async () => {
      const { tx, client } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const memberId = randomUUID();

      await mechanism.apply(tx, memberId, 'forward');
      const incremental = await mechanism.read(tx, memberId);
      expect(incremental).not.toEqual([]);

      // Wipe ONLY this member's projected rows, then rebuild from the surviving source data.
      await mechanism.clear(client, memberId);
      expect(await mechanism.read(tx, memberId)).toEqual([]);
      await mechanism.rebuild(tx);

      // The load-bearing assertion of the whole file: the repair path is not a second producer.
      expect(await mechanism.read(tx, memberId)).toEqual(incremental);
    });

    it('ORDERING-INDEPENDENCE: the projected state is a function of the source SET, not arrival order', async () => {
      const { tx, client } = getTx();
      await enterAppScope(client, PARIWAR_A);
      // ONE member, ONE deterministic id set (derived from the member id inside `apply`), applied twice
      // with the source events PERMUTED — separated by a savepoint rollback so the second run starts
      // from the same empty state as the first. Comparing the same member's own two runs is what makes
      // the equality meaningful: every id in the projected rows is identical by construction, so a
      // difference can ONLY come from arrival order.
      const memberId = randomUUID();

      await tx.execute(sql.raw('SAVEPOINT d3_ordering'));
      await mechanism.apply(tx, memberId, 'forward');
      // The backfill is the convergence point for a permutation the incremental mechanism alone cannot
      // resolve (a reversal arriving before its confirmation) — see migration 0093's note.
      await mechanism.rebuild(tx);
      const forward = await mechanism.read(tx, memberId);
      expect(forward).not.toEqual([]);

      await tx.execute(sql.raw('ROLLBACK TO SAVEPOINT d3_ordering'));
      expect(await mechanism.read(tx, memberId)).toEqual([]);

      await mechanism.apply(tx, memberId, 'reverse');
      await mechanism.rebuild(tx);
      expect(await mechanism.read(tx, memberId)).toEqual(forward);
    });
  });
}

describe.skipIf(!hasDatabase)(
  'Story 10.24 — the two projection mechanisms are OBSERVATIONALLY EQUIVALENT (D3/AC1) (:5433)',
  { timeout: 20000 },
  () => {
    setupLiveDb();

    // ── Mechanism 1: the TRIGGER-maintained ledger ────────────────────────────────────────────────
    //
    // Every id is DERIVED from the member id, so the two arrival orders differ ONLY in order. The
    // `reverse` variant appends the REVERSAL BEFORE its confirmation — which the trigger alone cannot
    // resolve (its UPDATE matches zero rows), and which the backfill's set-based reversal pass
    // converges. That asymmetry is stated honestly in migration 0093 rather than assumed away, and
    // this is the test that holds it to converging.
    runProjectionInvariants({
      name: 'member_contribution_ledger (events_log AFTER-INSERT trigger)',
      apply: async (tx, memberId, variant) => {
        const stream = derivedId(memberId, 'stream');
        const poolId = derivedId(memberId, 'pool');
        const confirmedEventId = derivedId(memberId, 'confirmed');
        const confirmedAt = new Date('2026-07-10T00:00:00Z');
        const reversedAt = new Date('2026-07-12T00:00:00Z');
        const appendC = (version: number) =>
          tx
            .insert(eventsLog)
            .values({
              eventId: confirmedEventId,
              streamId: stream,
              eventType: CONFIRMED_EVENT_TYPE,
              payload: { memberId, poolId, alertId: stream },
              eventVersion: version,
              actorId: null,
              pariwarId: PARIWAR_A,
              occurredAt: confirmedAt,
            })
            .onConflictDoNothing();
        const appendR = (version: number) =>
          tx
            .insert(eventsLog)
            .values({
              eventId: derivedId(memberId, 'reversal'),
              streamId: stream,
              eventType: RECONCILIATION_CONFIRMATION_REVERSED_EVENT_TYPE,
              payload: { memberId, reversedConfirmedEventId: confirmedEventId, alertId: stream },
              eventVersion: version,
              actorId: null,
              pariwarId: PARIWAR_A,
              occurredAt: reversedAt,
            })
            .onConflictDoNothing();
        // The version numbers follow ARRIVAL order (an event stream numbers what it receives), so the
        // permutation is genuine — not the same rows relabelled.
        if (variant === 'forward') {
          await appendC(1);
          await appendR(2);
        } else {
          await appendR(1);
          await appendC(2);
        }
      },
      rebuild: (tx) => backfillContributionLedger(tx, PARIWAR_A),
      read: (tx, memberId) => ledgerState(tx, memberId),
      clear: (client, memberId) =>
        clearAsSuperuser(
          client,
          `DELETE FROM member_contribution_ledger WHERE pariwar_id = '${PARIWAR_A}' AND member_id = '${memberId}'::uuid`,
        ),
    });

    // ── Mechanism 2: the EXPLICIT-writer assignment index ─────────────────────────────────────────
    //
    // The `reverse` variant inserts the member ids in the opposite order within the same bulk write —
    // the arrival-order permutation available to a set-valued writer. The full source chain is seeded
    // (`cycle_freeze_commits` → `pools` → `pool_snapshots`) because the BACKFILL rebuilds from the
    // persisted SNAPSHOT, never from a recompute — so replay equivalence here also proves the writer
    // and the snapshot agree about who was assigned.
    runProjectionInvariants({
      name: 'member_pool_assignments (explicit domain writer)',
      apply: async (tx, memberId, variant) => {
        const poolId = derivedId(memberId, 'pool');
        const cycleId = derivedId(memberId, 'cycle');
        const other = derivedId(memberId, 'other-member');
        const memberIds = variant === 'forward' ? [memberId, other] : [other, memberId];
        await seedAssignmentSource(tx, { poolId, cycleId, memberIds });
        await insertMemberPoolAssignments(tx, {
          pariwarId: toPariwarId(PARIWAR_A),
          poolId: toPoolId(poolId),
          cycleId: toCycleId(cycleId),
          assignedAt: AT,
          memberIds,
        });
      },
      rebuild: (tx) => backfillMemberPoolAssignments(tx, PARIWAR_A),
      read: (tx, memberId) => assignmentState(tx, memberId),
      clear: (client, memberId) =>
        clearAsSuperuser(
          client,
          `DELETE FROM member_pool_assignments WHERE pariwar_id = '${PARIWAR_A}' AND member_id = '${memberId}'::uuid`,
        ),
    });

    // ── The mechanism-crossing check the four properties exist to protect ────────────────────────
    it('the ledger trigger and the ledger backfill agree on a MIXED history (confirm ×2, one reversed)', async () => {
      const { tx, client } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const memberId = randomUUID();
      const stream = randomUUID();
      const poolA = randomUUID();
      const poolB = randomUUID();

      const c1 = await appendConfirmed(tx, stream, memberId, poolA, 1, new Date('2026-05-01T00:00:00Z'));
      await appendConfirmed(tx, stream, memberId, poolB, 2, new Date('2026-06-01T00:00:00Z'));
      await appendReversal(tx, stream, memberId, c1, 3, new Date('2026-06-15T00:00:00Z'));

      const incremental = await ledgerState(tx, memberId);
      expect(incremental).toHaveLength(2);
      expect(incremental.filter((r) => r.reversedAt !== null)).toHaveLength(1);

      await clearAsSuperuser(
        client,
        `DELETE FROM member_contribution_ledger WHERE pariwar_id = '${PARIWAR_A}' AND member_id = '${memberId}'::uuid`,
      );
      await backfillContributionLedger(tx, PARIWAR_A);
      expect(await ledgerState(tx, memberId)).toEqual(incremental);
    });

    it('NEITHER projection grants DELETE to twt_app — the repair path is the backfill, not a rebuild', async () => {
      // Pins the design the `clearAsSuperuser` helper works around, so that helper can never be read as
      // "the app can delete projected rows, we just chose not to". It cannot.
      const { tx, client } = getTx();
      await enterAppScope(client, PARIWAR_A);
      for (const table of ['member_contribution_ledger', 'member_pool_assignments']) {
        await tx.execute(sql.raw('SAVEPOINT no_delete_probe'));
        // Drizzle wraps the driver error, so assert on the pg SQLSTATE (42501 = insufficient_privilege)
        // carried on `cause` — never on the wrapper's message text.
        await expect(tx.execute(sql.raw(`DELETE FROM ${table}`))).rejects.toMatchObject({
          cause: { code: '42501' },
        });
        await tx.execute(sql.raw('ROLLBACK TO SAVEPOINT no_delete_probe'));
      }
    });

    it('a MALFORMED confirmed event (no poolId) projects NOTHING — never a NULL-keyed row', async () => {
      const { tx, client } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const memberId = randomUUID();
      const stream = randomUUID();
      await tx.insert(eventsLog).values({
        streamId: stream,
        eventType: CONFIRMED_EVENT_TYPE,
        payload: { memberId, alertId: stream }, // poolId ABSENT
        eventVersion: 1,
        actorId: null,
        pariwarId: PARIWAR_A,
        occurredAt: new Date('2026-05-01T00:00:00Z'),
      });
      expect(await ledgerState(tx, memberId)).toEqual([]);
      // …and the backfill agrees — the two mechanisms drop the same malformed event.
      await backfillContributionLedger(tx, PARIWAR_A);
      expect(await ledgerState(tx, memberId)).toEqual([]);
    });

    it('a PRESENT-BUT-MALFORMED memberId/poolId (not UUID-shaped) is skipped, never a cast exception (code review, 2026-08-05)', async () => {
      // Distinct from the "missing key" case above: here the keys are present but not UUID-shaped. A
      // blind `::uuid` cast would raise INSIDE the AFTER-INSERT trigger and abort the whole event
      // append — the format check must catch this BEFORE the cast, not just the IS NOT NULL check.
      const { tx, client } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const memberId = randomUUID();
      const stream = randomUUID();
      await expect(
        tx.insert(eventsLog).values({
          streamId: stream,
          eventType: CONFIRMED_EVENT_TYPE,
          payload: { memberId, poolId: 'not-a-uuid', alertId: stream },
          eventVersion: 1,
          actorId: null,
          pariwarId: PARIWAR_A,
          occurredAt: new Date('2026-05-01T00:00:00Z'),
        }),
      ).resolves.not.toThrow();
      expect(await ledgerState(tx, memberId)).toEqual([]);
      // …and the backfill agrees — it SKIPS the malformed historical row rather than failing the whole
      // set-based statement over it.
      await backfillContributionLedger(tx, PARIWAR_A);
      expect(await ledgerState(tx, memberId)).toEqual([]);
    });

    it('a PRESENT-BUT-MALFORMED reversedConfirmedEventId is skipped by both the trigger and the backfill (code review, 2026-08-05)', async () => {
      const { tx, client } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const memberId = randomUUID();
      const poolId = randomUUID();
      const confirmedStream = randomUUID();
      const reversalStream = randomUUID();
      await tx.insert(eventsLog).values({
        streamId: confirmedStream,
        eventType: CONFIRMED_EVENT_TYPE,
        payload: { memberId, poolId, alertId: confirmedStream },
        eventVersion: 1,
        actorId: null,
        pariwarId: PARIWAR_A,
        occurredAt: new Date('2026-05-01T00:00:00Z'),
      });
      await expect(
        tx.insert(eventsLog).values({
          streamId: reversalStream,
          eventType: RECONCILIATION_CONFIRMATION_REVERSED_EVENT_TYPE,
          payload: { reversedConfirmedEventId: 'not-a-uuid', alertId: reversalStream },
          eventVersion: 1,
          actorId: null,
          pariwarId: PARIWAR_A,
          occurredAt: new Date('2026-05-02T00:00:00Z'),
        }),
      ).resolves.not.toThrow();
      // The confirmation projects; the malformed reversal is skipped, so it stays un-reversed.
      const rows = await ledgerState(tx, memberId);
      expect(rows).toHaveLength(1);
      expect(rows[0]?.reversedAt).toBeNull();
      // …and the backfill agrees.
      await backfillContributionLedger(tx, PARIWAR_A);
      const rowsAfterBackfill = await ledgerState(tx, memberId);
      expect(rowsAfterBackfill).toHaveLength(1);
      expect(rowsAfterBackfill[0]?.reversedAt).toBeNull();
    });
  },
);
