// Reports library — live-DB integration (Story 10.7, AC3/AC5/AC6).
//
// TWO concerns against a real DB:
//   1. SCOPE-RESPECTING NARROWING (AC3) — seed members across two districts (+ a second Pariwar) and
//      assert a district-scoped actor's roster contains ONLY their district's rows, a pariwar-scoped
//      actor sees the whole tenant, and NEITHER ever sees the other Pariwar's rows (RLS + the explicit
//      pariwar_id predicate).
//   2. THE report_exports LIFECYCLE ACCESSORS (AC5) — the idempotent findActive guard, the one-time
//      markConsumed (410-on-replay), and the pending-only markFailed guard.
//
// Live DB only (skipped without DATABASE_URL). Seeding runs as the Docker superuser BEFORE enterAppScope
// (RLS bypassed) so both tenants' rows land; the roster query then runs under twt_app scope (RLS on).

import { and, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { reportExportId as toReportExportId } from '../../../src/ids/index.js';
import * as reports from '../../../src/reports/index.js';
import { reportExports } from '../../../src/schema/report_exports.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import {
  PARIWAR_A,
  PARIWAR_B,
  enterAppScope,
  seedMember,
  seedMemberPosting,
} from '../_helpers.js';

const ACTOR = '99999999-9999-9999-9999-999999999999';

function districtCtx(): reports.ReportScopeCtx {
  return {
    actorId: ACTOR,
    grants: [{ pariwarId: PARIWAR_A, role: 'district_admin', scopeDimension: 'district', scopeValue: 'Patna' }],
    pariwarId: PARIWAR_A,
    resolvedScope: { dimension: 'district', value: 'Patna' },
  };
}
function pariwarCtx(): reports.ReportScopeCtx {
  return {
    actorId: ACTOR,
    grants: [{ pariwarId: PARIWAR_A, role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: PARIWAR_A }],
    pariwarId: PARIWAR_A,
    resolvedScope: { dimension: 'pariwar', value: PARIWAR_A },
  };
}

describe.skipIf(!hasDatabase)('reports — scope-respecting narrowing (AC3)', () => {
  setupLiveDb();
  const registry = reports.createDefaultReportRegistry();

  // Returns the seeded member ids so the assertions can be MEMBERSHIP-based, not count-based: the shared
  // dev DB accumulates committed rows from own-committing test runs ([[project_live_db_test_gotchas]]),
  // and now that the roster is all-members (LEFT JOIN, review decision) a polluted posting-LESS member in
  // the tenant legitimately appears in a pariwar-scoped read — so an absolute count is brittle.
  async function seedTwoDistricts(
    tx: Parameters<typeof seedMember>[0],
  ): Promise<{ a1: string; a2: string; a3: string; b1: string }> {
    const a1 = await seedMember(tx, PARIWAR_A);
    const a2 = await seedMember(tx, PARIWAR_A);
    const a3 = await seedMember(tx, PARIWAR_A);
    await seedMemberPosting(tx, PARIWAR_A, a1, 'Patna');
    await seedMemberPosting(tx, PARIWAR_A, a2, 'Patna');
    await seedMemberPosting(tx, PARIWAR_A, a3, 'Gaya');
    // A second Pariwar's member in the SAME district name — must never leak across the tenant boundary.
    const b1 = await seedMember(tx, PARIWAR_B);
    await seedMemberPosting(tx, PARIWAR_B, b1, 'Patna');
    return { a1, a2, a3, b1 };
  }

  it('a district-scoped actor sees ONLY their district (Patna), never Gaya, never the other Pariwar', async () => {
    const { tx, client } = getTx();
    const { a1, a2, a3, b1 } = await seedTwoDistricts(tx);
    await enterAppScope(client, PARIWAR_A);

    const result = await reports.assembleReport(registry, 'member_roster', districtCtx(), tx);
    const rows = result.rows as { member_id: string; district: string }[];
    // Every returned row is Patna (the narrowing predicate holds regardless of DB pollution)…
    expect(rows.every((r) => r.district === 'Patna')).toBe(true);
    const ids = new Set(rows.map((r) => r.member_id));
    // …the two seeded Patna members are present, and the Gaya member + the other Pariwar are excluded.
    expect(ids.has(a1)).toBe(true);
    expect(ids.has(a2)).toBe(true);
    expect(ids.has(a3)).toBe(false); // Gaya — out of the district narrowing
    expect(ids.has(b1)).toBe(false); // Pariwar B — cross-tenant
  });

  it('a pariwar-scoped actor sees the whole tenant (Patna + Gaya), never the other Pariwar', async () => {
    const { tx, client } = getTx();
    const { a1, a2, a3, b1 } = await seedTwoDistricts(tx);
    await enterAppScope(client, PARIWAR_A);

    const result = await reports.assembleReport(registry, 'member_roster', pariwarCtx(), tx);
    const rows = result.rows as { member_id: string; district: string }[];
    const byId = new Map(rows.map((r) => [r.member_id, r.district]));
    // All three seeded Pariwar-A members are present with their districts…
    expect(byId.get(a1)).toBe('Patna');
    expect(byId.get(a2)).toBe('Patna');
    expect(byId.get(a3)).toBe('Gaya');
    // …and Pariwar B's Patna member is NEVER present (RLS + explicit pariwar_id predicate).
    expect(byId.has(b1)).toBe(false);
  });

  it('a cross-Pariwar actor (scoped to B) sees ONLY B — never A (RLS isolation)', async () => {
    const { tx, client } = getTx();
    const { a1, a2, a3, b1 } = await seedTwoDistricts(tx);
    await enterAppScope(client, PARIWAR_B);

    const ctx: reports.ReportScopeCtx = {
      actorId: ACTOR,
      grants: [{ pariwarId: PARIWAR_B, role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: PARIWAR_B }],
      pariwarId: PARIWAR_B,
      resolvedScope: { dimension: 'pariwar', value: PARIWAR_B },
    };
    const result = await reports.assembleReport(registry, 'member_roster', ctx, tx);
    const ids = new Set((result.rows as { member_id: string }[]).map((r) => r.member_id));
    // B's member is present; NONE of Pariwar A's members leak across the tenant boundary.
    expect(ids.has(b1)).toBe(true);
    expect(ids.has(a1)).toBe(false);
    expect(ids.has(a2)).toBe(false);
    expect(ids.has(a3)).toBe(false);
  });

  it('deny-deeper: a state-scoped actor resolves nothing below its ceiling — through the REAL checkPermission + assembleReport chain, not just the query helper', async () => {
    const { tx, client } = getTx();
    await seedTwoDistricts(tx);
    await enterAppScope(client, PARIWAR_A);

    // `state_trustee` is a REAL role (roles.ts) with a REAL `state` scopeCeiling that REALLY holds
    // `member.view_validity` — unlike `member.export_roster` (which no real `state`-ceiling role holds
    // today, per the prior version of this test). Registering a FIXTURE template that reuses the roster's
    // OWN query (the real deny-deeper geo logic) under `member.view_validity` lets a genuine state_trustee
    // grant pass the REAL `checkPermission` fail-closed gate — proving the query-level deny-deeper
    // narrowing survives even when RBAC legitimately allows a broader-than-district actor through, not
    // just that the query helper behaves correctly in isolation (the gap the prior version left).
    const rosterTemplate = registry.get<{ district: string }>('member_roster')!;
    const stateFixtureRegistry = reports.createReportRegistry([
      { ...rosterTemplate, reportType: 'fixture_state_trustee_roster', permissionKey: 'member.view_validity' },
    ]);
    const ctx: reports.ReportScopeCtx = {
      actorId: ACTOR,
      grants: [{ pariwarId: PARIWAR_A, role: 'state_trustee', scopeDimension: 'state', scopeValue: 'Bihar' }],
      pariwarId: PARIWAR_A,
      resolvedScope: { dimension: 'state', value: 'Bihar' },
    };
    const result = await reports.assembleReport(
      stateFixtureRegistry,
      'fixture_state_trustee_roster',
      ctx,
      tx,
    );
    expect(result.rows).toHaveLength(0); // real checkPermission ALLOWED (state_trustee genuinely holds
    // member.view_validity @ state); the QUERY's deny-deeper narrowing is what actually stops the leak.
  });
});

describe.skipIf(!hasDatabase)('reports — report_exports lifecycle accessors (AC5)', () => {
  setupLiveDb();

  async function insertPending(
    tx: Parameters<typeof seedMember>[0],
    paramsHash = 'hash-1',
    requestedAt = new Date(),
  ): Promise<string> {
    const row = await reports.insertReportExport(tx, {
      pariwarId: PARIWAR_A,
      requestedByActorId: ACTOR,
      reportType: 'member_roster',
      format: 'csv',
      paramsHash,
      requestedAt,
    });
    return row.reportExportId;
  }

  it('findActiveReportExport is the idempotency guard — returns the in-flight pending row', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const id = await insertPending(tx);

    const active = await reports.findActiveReportExport(tx, ACTOR, 'member_roster', 'csv', 'hash-1', new Date());
    expect(active?.reportExportId).toBe(id);
    // A different params_hash has no active row → a fresh request would insert.
    expect(await reports.findActiveReportExport(tx, ACTOR, 'member_roster', 'csv', 'other', new Date())).toBeNull();
    // Format is part of the idempotency key (review finding): the same report in JSON is a DISTINCT
    // artifact, so it must NOT collapse onto the in-flight CSV row.
    expect(await reports.findActiveReportExport(tx, ACTOR, 'member_roster', 'json', 'hash-1', new Date())).toBeNull();
  });

  it('markReportExportConsumed is one-time: the first call wins (true), a replay loses (false → 410)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const id = await insertPending(tx);
    const branded = toReportExportId(id);
    // Move it to ready (the worker does this) so a consume is meaningful.
    await tx.update(reportExports).set({ status: 'ready', readyAt: new Date(), expiresAt: new Date(Date.now() + 3.6e6) }).where(eq(reportExports.reportExportId, branded));

    expect(await reports.markReportExportConsumed(tx, branded, ACTOR, new Date())).toBe(true);
    expect(await reports.markReportExportConsumed(tx, branded, ACTOR, new Date())).toBe(false); // replay → 410
  });

  it('listReportExportsForActor returns the actor own exports, newest-first (review finding: backs the admin console list endpoint)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    // Explicit, distinct requestedAt values — ordering is asserted on `requestedAt`, so the test must
    // not rely on two back-to-back `new Date()` calls landing in different milliseconds. On a fast
    // local Postgres they can tie, and `ORDER BY requested_at DESC` has no defined tie-break, making
    // this assertion flaky for a reason that has nothing to do with the code under test.
    const now = new Date();
    const firstId = await insertPending(tx, 'hash-list-1', new Date(now.getTime() - 1000));
    const secondId = await insertPending(tx, 'hash-list-2', now);

    const list = await reports.listReportExportsForActor(tx, ACTOR);
    const ids = list.map((r) => String(r.reportExportId));
    expect(ids).toContain(firstId);
    expect(ids).toContain(secondId);
    // Newest-first: the second insert appears before the first.
    expect(ids.indexOf(secondId)).toBeLessThan(ids.indexOf(firstId));
  });

  it('markReportExportFailed is pending-only — never clobbers a ready/consumed row', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const id = await insertPending(tx);
    const branded = toReportExportId(id);
    await tx.update(reportExports).set({ status: 'ready' }).where(eq(reportExports.reportExportId, branded));

    await reports.markReportExportFailed(tx, branded, ACTOR, 'assemble_error');
    const [row] = await tx
      .select()
      .from(reportExports)
      .where(and(eq(reportExports.reportExportId, branded), eq(reportExports.requestedByActorId, ACTOR)));
    expect(row?.status).toBe('ready'); // unchanged — the pending-only guard held
  });
});
