// Contribution-projection RLS policy-regression tests — Story 10.24 (round-2 review finding P3).
//
// Covers all THREE tenant-scoped tables the story added: `member_contribution_ledger`,
// `member_pool_assignments` (migration 0093) and `contribution_projection_coverage` (0094).
//
// ── Why this file had to exist ───────────────────────────────────────────────────────────────────
// Story 10.24 shipped correct policies (`policies/contribution-projection-rls.ts`, migrations 0093/0094
// ENABLE+FORCE) but no regression spec on the tables' OWN policies — against a 20-file convention where
// every sibling tenant-isolated table ships one. That gap mattered more here than usual: the ledger is
// written by a SECURITY INVOKER TRIGGER, under the appending session's own scope. The policy file's own
// header calls that `withCheck` "load-bearing rather than decorative" precisely because it is the thing
// standing between a tenant-mismatched append and a confirmation projected into ANOTHER TENANT — and it
// was the one write path in the story with no negative test.
//
// The positive/negative pairs the policies/README "Test discipline" requires:
//   (a) owning Pariwar reads its own rows;
//   (b) cross-Pariwar SELECT returns 0 rows (the leak invariant);
//   (c) cross-Pariwar INSERT is blocked (withCheck → 42501) — including THROUGH THE TRIGGER;
//   (e) unset-scope session: SELECT returns 0 rows AND write is blocked (fail-closed);
//   (f) ENABLE + FORCE RLS are both on.
//
// Live DB only — skips when DATABASE_URL is unset. Per-test BEGIN/ROLLBACK isolation (setupLiveDb).
// Seeds run as the Docker superuser (RLS bypassed) BEFORE entering app scope; enforcement assertions
// `SET LOCAL ROLE twt_app` to shed superuser (see _helpers.ts).

import { randomUUID } from 'node:crypto';

import { eq, sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import type { CycleFreezeCommitId, MemberId, PariwarId, PoolId } from '../../../src/ids/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppRoleNoScope, enterAppScope } from '../_helpers.js';

function ledgerValues(pariwarId: PariwarId): typeof schema.memberContributionLedger.$inferInsert {
  return {
    confirmedEventId: randomUUID(),
    pariwarId,
    memberId: randomUUID() as MemberId,
    poolId: randomUUID() as PoolId,
    confirmedAt: new Date('2026-03-01T00:00:00.000Z'),
  };
}

function assignmentValues(pariwarId: PariwarId): typeof schema.memberPoolAssignments.$inferInsert {
  return {
    poolId: randomUUID() as PoolId,
    memberId: randomUUID() as MemberId,
    pariwarId,
    cycleId: randomUUID() as CycleFreezeCommitId,
    assignedAt: new Date('2026-02-01T00:00:00.000Z'),
  };
}

function coverageValues(
  pariwarId: PariwarId,
): typeof schema.contributionProjectionCoverage.$inferInsert {
  return { pariwarId, coveredFrom: new Date('2020-01-01T00:00:00.000Z') };
}

describe.skipIf(!hasDatabase)('contribution-projection RLS policy regression', () => {
  setupLiveDb();

  describe('member_contribution_ledger', () => {
    it('(a) positive: owning Pariwar A reads its OWN ledger rows', async () => {
      const { tx, client } = getTx();
      await tx.insert(schema.memberContributionLedger).values(ledgerValues(PARIWAR_A));
      await tx.insert(schema.memberContributionLedger).values(ledgerValues(PARIWAR_B));
      await enterAppScope(client, PARIWAR_A);

      const rows = await tx.select().from(schema.memberContributionLedger);
      expect(rows).toHaveLength(1);
      expect(rows[0]?.pariwarId).toBe(PARIWAR_A);
    });

    it('(b) LEAK INVARIANT: Pariwar A scope sees ZERO of Pariwar B’s ledger rows', async () => {
      const { tx, client } = getTx();
      await tx.insert(schema.memberContributionLedger).values(ledgerValues(PARIWAR_B));
      await enterAppScope(client, PARIWAR_A);

      // An explicit WHERE pariwar_id = B must STILL return zero. A leak here would expose one tenant's
      // contribution history to another — and it is a fact that feeds suspension decisions.
      const bRows = await tx
        .select()
        .from(schema.memberContributionLedger)
        .where(eq(schema.memberContributionLedger.pariwarId, PARIWAR_B));
      expect(bRows).toHaveLength(0);
    });

    it('(c) write-isolation: an A session INSERT for Pariwar B is blocked (withCheck → 42501)', async () => {
      const { tx, client } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const err = await tx
        .insert(schema.memberContributionLedger)
        .values(ledgerValues(PARIWAR_B))
        .catch((e: unknown) => e);
      const cause = (err as { cause?: { code?: string; message?: string } }).cause;
      expect(cause?.code).toBe('42501');
      expect(cause?.message ?? '').toMatch(/row-level security/i);
    });

    it('(c-trigger) ⚠ THE load-bearing case: a tenant-mismatched append fails at the trigger’s withCheck', async () => {
      // The ledger's only production writer is migration 0093's SECURITY INVOKER trigger, which runs
      // under the APPENDING session's scope. This asserts what the policy header claims: an event
      // stamped with another tenant's pariwar_id cannot project a row into that tenant — the append
      // itself fails LOUDLY instead of silently crossing the boundary.
      const { tx, client } = getTx();
      await enterAppScope(client, PARIWAR_A);

      const err = await tx
        .execute(
          sql`INSERT INTO events_log (stream_id, event_type, payload, event_version, actor_id, pariwar_id, occurred_at)
              VALUES (${randomUUID()}, 'contribution.confirmed',
                      ${JSON.stringify({ memberId: randomUUID(), poolId: randomUUID() })}::jsonb,
                      1, NULL, ${PARIWAR_B}, now())`,
        )
        .catch((e: unknown) => e);

      // Whether the events_log policy or the ledger's own withCheck rejects first, the outcome that
      // matters is identical: 42501, and no cross-tenant projection row.
      const cause = (err as { cause?: { code?: string } }).cause;
      expect(cause?.code).toBe('42501');
    });

    it('(e) unset-scope session: SELECT returns 0 rows AND write is blocked (fail-closed)', async () => {
      const { tx, client } = getTx();
      await tx.insert(schema.memberContributionLedger).values(ledgerValues(PARIWAR_A));
      await enterAppRoleNoScope(client);

      expect(await tx.select().from(schema.memberContributionLedger)).toHaveLength(0);

      const err = await tx
        .insert(schema.memberContributionLedger)
        .values(ledgerValues(PARIWAR_A))
        .catch((e: unknown) => e);
      expect((err as { cause?: { code?: string } }).cause?.code).toBe('42501');
    });
  });

  describe('member_pool_assignments', () => {
    it('(a) positive: owning Pariwar A reads its OWN assignment rows', async () => {
      const { tx, client } = getTx();
      await tx.insert(schema.memberPoolAssignments).values(assignmentValues(PARIWAR_A));
      await tx.insert(schema.memberPoolAssignments).values(assignmentValues(PARIWAR_B));
      await enterAppScope(client, PARIWAR_A);

      const rows = await tx.select().from(schema.memberPoolAssignments);
      expect(rows).toHaveLength(1);
      expect(rows[0]?.pariwarId).toBe(PARIWAR_A);
    });

    it('(b) LEAK INVARIANT: Pariwar A scope sees ZERO of Pariwar B’s assignment rows', async () => {
      const { tx, client } = getTx();
      await tx.insert(schema.memberPoolAssignments).values(assignmentValues(PARIWAR_B));
      await enterAppScope(client, PARIWAR_A);

      const bRows = await tx
        .select()
        .from(schema.memberPoolAssignments)
        .where(eq(schema.memberPoolAssignments.pariwarId, PARIWAR_B));
      expect(bRows).toHaveLength(0);
    });

    it('(c) write-isolation: an A session INSERT for Pariwar B is blocked (withCheck → 42501)', async () => {
      const { tx, client } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const err = await tx
        .insert(schema.memberPoolAssignments)
        .values(assignmentValues(PARIWAR_B))
        .catch((e: unknown) => e);
      expect((err as { cause?: { code?: string } }).cause?.code).toBe('42501');
    });

    it('(e) unset-scope session: SELECT returns 0 rows AND write is blocked (fail-closed)', async () => {
      const { tx, client } = getTx();
      await tx.insert(schema.memberPoolAssignments).values(assignmentValues(PARIWAR_A));
      await enterAppRoleNoScope(client);

      expect(await tx.select().from(schema.memberPoolAssignments)).toHaveLength(0);

      const err = await tx
        .insert(schema.memberPoolAssignments)
        .values(assignmentValues(PARIWAR_A))
        .catch((e: unknown) => e);
      expect((err as { cause?: { code?: string } }).cause?.code).toBe('42501');
    });
  });

  describe('contribution_projection_coverage', () => {
    it('(a)+(b) A reads its OWN coverage row and ZERO of B’s', async () => {
      const { tx, client } = getTx();
      await tx.insert(schema.contributionProjectionCoverage).values(coverageValues(PARIWAR_A));
      await tx.insert(schema.contributionProjectionCoverage).values(coverageValues(PARIWAR_B));
      await enterAppScope(client, PARIWAR_A);

      const rows = await tx.select().from(schema.contributionProjectionCoverage);
      expect(rows).toHaveLength(1);
      expect(rows[0]?.pariwarId).toBe(PARIWAR_A);
    });

    it('(b2) ⚠ a leaked coverage row would be worse than a missing one', async () => {
      // Coverage is what licenses the producer to answer AT ALL. If Pariwar A could read B's coverage
      // row, an un-backfilled A would stop degrading to `producer_unavailable` and start reporting its
      // whole membership as CLEAN — the fabricated-clean-member failure the watermark exists to prevent,
      // re-introduced through a tenant leak.
      const { tx, client } = getTx();
      await tx.insert(schema.contributionProjectionCoverage).values(coverageValues(PARIWAR_B));
      await enterAppScope(client, PARIWAR_A);

      const rows = await tx
        .select()
        .from(schema.contributionProjectionCoverage)
        .where(eq(schema.contributionProjectionCoverage.pariwarId, PARIWAR_B));
      expect(rows).toHaveLength(0);
    });

    it('(c) write-isolation: an A session INSERT for Pariwar B is blocked (withCheck → 42501)', async () => {
      const { tx, client } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const err = await tx
        .insert(schema.contributionProjectionCoverage)
        .values(coverageValues(PARIWAR_B))
        .catch((e: unknown) => e);
      expect((err as { cause?: { code?: string } }).cause?.code).toBe('42501');
    });

    it('(e) unset-scope session: SELECT returns 0 rows AND write is blocked (fail-closed)', async () => {
      const { tx, client } = getTx();
      await tx.insert(schema.contributionProjectionCoverage).values(coverageValues(PARIWAR_A));
      await enterAppRoleNoScope(client);

      expect(await tx.select().from(schema.contributionProjectionCoverage)).toHaveLength(0);

      const err = await tx
        .insert(schema.contributionProjectionCoverage)
        .values(coverageValues(PARIWAR_A))
        .catch((e: unknown) => e);
      expect((err as { cause?: { code?: string } }).cause?.code).toBe('42501');
    });
  });

  it('(f) FORCE RLS: all three projection tables have rowsecurity AND forcerowsecurity enabled', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{
      relname: string;
      relrowsecurity: boolean;
      relforcerowsecurity: boolean;
    }>(
      `SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class
        WHERE relname IN ('member_contribution_ledger','member_pool_assignments','contribution_projection_coverage')
        ORDER BY relname`,
    );
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(row.relrowsecurity, `${row.relname}.relrowsecurity`).toBe(true);
      expect(row.relforcerowsecurity, `${row.relname}.relforcerowsecurity`).toBe(true);
    }
  });
});
