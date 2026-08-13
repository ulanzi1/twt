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

import { AuthorizationDeniedError } from '../../../src/errors.js';
import { buildGeoTree, createGeoTreeResolver } from '../../../src/geo-tree/index.js';
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
    resolvedScope: { dimension: 'district', values: ['Patna'] },
  };
}
function pariwarCtx(): reports.ReportScopeCtx {
  return {
    actorId: ACTOR,
    grants: [{ pariwarId: PARIWAR_A, role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: PARIWAR_A }],
    pariwarId: PARIWAR_A,
    resolvedScope: { dimension: 'pariwar', values: [PARIWAR_A] },
  };
}
/**
 * ⭐ Story 10.28 (AC3) — a district_admin holding the roster key at BOTH Patna and Gaya. Two
 * legitimate grants, both inside the `district` ceiling.
 *
 * ⛔ THE RESOLVED SCOPE IS **DERIVED FROM THE GRANTS BY THE REAL PRODUCER**, NEVER HAND-BUILT — and
 * that is load-bearing, not stylistic. A hand-built `{ values: ['Gaya','Patna'] }` would exercise
 * only the TEMPLATE's `IN (…)` narrowing and would pass unchanged against the old single-valued
 * resolver, proving nothing about the bug this story fixes. Running the chain end-to-end —
 * grants → `resolveActorReportScope` → `assembleReport` → SQL — is what makes the AC3 test go RED
 * when the strict-`<` tie-break is restored (Escalation 2's revert-sanity, which caught exactly this
 * defect in an earlier draft of this fixture).
 */
function twoDistrictCtx(): reports.ReportScopeCtx {
  const grants = [
    { pariwarId: PARIWAR_A, role: 'district_admin', scopeDimension: 'district' as const, scopeValue: 'Patna' },
    { pariwarId: PARIWAR_A, role: 'district_admin', scopeDimension: 'district' as const, scopeValue: 'Gaya' },
  ];
  const resolvedScope = reports.resolveActorReportScope(grants, 'member.export_roster', PARIWAR_A);
  if (!resolvedScope) throw new Error('fixture: the two district grants must resolve to a scope');
  return { actorId: ACTOR, grants, pariwarId: PARIWAR_A, resolvedScope };
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
      resolvedScope: { dimension: 'pariwar', values: [PARIWAR_B] },
    };
    const result = await reports.assembleReport(registry, 'member_roster', ctx, tx);
    const ids = new Set((result.rows as { member_id: string }[]).map((r) => r.member_id));
    // B's member is present; NONE of Pariwar A's members leak across the tenant boundary.
    expect(ids.has(b1)).toBe(true);
    expect(ids.has(a1)).toBe(false);
    expect(ids.has(a2)).toBe(false);
    expect(ids.has(a3)).toBe(false);
  });

  // ══ STORY 10.28 ══════════════════════════════════════════════════════════════════════════════
  //
  // ⭐ AC3 — THIS TEST IS THE STORY. The failure it removes is SILENT: before 10.28 a strict-`<`
  // tie-break kept whichever same-dimension grant iterated first, so this actor's export contained
  // Patna and simply omitted Gaya — no error, no warning, no partial-export signal, and a CSV the
  // administrator would read as complete.
  // ⛔ THEREFORE IT ASSERTS **PRESENCE**, NOT ABSENCE OF ERROR. A `rows.length > 0` assertion would
  // not satisfy AC3 — the OLD behaviour also returned rows.
  // ⛔ MEMBERSHIP, NEVER COUNTS: the shared dev DB accumulates committed rows from own-committing
  // test runs ([[project_live_db_test_gotchas]]), so an absolute count is brittle by construction.
  it('AC3: a TWO-DISTRICT actor sees BOTH districts (Patna AND Gaya) — never the other Pariwar', async () => {
    const { tx, client } = getTx();
    const { a1, a2, a3, b1 } = await seedTwoDistricts(tx);
    await enterAppScope(client, PARIWAR_A);

    const result = await reports.assembleReport(registry, 'member_roster', twoDistrictCtx(), tx);
    const rows = result.rows as { member_id: string; district: string }[];
    const ids = new Set(rows.map((r) => r.member_id));

    // ⭐ THE ASSERTION THE STORY EXISTS FOR — every district the actor holds is REPRESENTED.
    expect(ids.has(a1)).toBe(true); // Patna
    expect(ids.has(a2)).toBe(true); // Patna
    expect(ids.has(a3)).toBe(true); // Gaya — the one the single-valued tie-break silently dropped
    expect(ids.has(b1)).toBe(false); // Pariwar B — cross-tenant, still excluded

    // …and the narrowing still NARROWS: nothing outside the two held districts is returned. (A
    // polluted row from another district would fail this without touching the membership asserts.)
    expect(rows.every((r) => r.district === 'Patna' || r.district === 'Gaya')).toBe(true);
  });

  // ── ⛔ THE D5 POLARITY PAIR — BOTH HALVES ARE MANDATORY, AND NEITHER PROVES ANYTHING ALONE. ────
  //
  // (a) alone passes on a system that has stopped narrowing at all (it would also return both
  // districts — and everything else). (b) alone passes on a system that denies everything. Only the
  // pair isolates the polarity: narrow to EXACTLY the held set, and DENY when the set is empty.
  //
  // ⭐ WHY (b) IS THE DANGEROUS HALF. `WHERE district IN ()` is a Postgres SYNTAX ERROR, so an empty
  // set arrives as a runtime failure — and the smallest edit that makes that failure go away is to
  // DROP THE PREDICATE, which exports the FULL TENANT to an actor entitled to zero districts. That is
  // a privilege escalation with a `.length === 0` on it, and it touches no line mentioning authz.
  it('D5(a): a two-district scope narrows to EXACTLY those districts — both present, others absent', async () => {
    const { tx, client } = getTx();
    const { a1, a2, a3, b1 } = await seedTwoDistricts(tx);
    await seedMemberPosting(tx, PARIWAR_A, await seedMember(tx, PARIWAR_A), 'Nalanda');
    await enterAppScope(client, PARIWAR_A);

    const rosterTemplate = registry.get<{ member_id: string; district: string }>('member_roster')!;
    const rows = await rosterTemplate.query(twoDistrictCtx(), tx);
    const districts = new Set(rows.map((r) => r.district));
    const ids = new Set(rows.map((r) => r.member_id));

    expect(districts.has('Patna')).toBe(true);
    expect(districts.has('Gaya')).toBe(true);
    // ⛔ A third seeded district in the SAME tenant is NOT swept in — the `IN` list is the held set,
    // not "every district that exists".
    expect(districts.has('Nalanda')).toBe(false);
    expect(ids.has(a1) && ids.has(a2) && ids.has(a3)).toBe(true);
    expect(ids.has(b1)).toBe(false);
  });

  // [Review fix] `contribution-rate-by-district.ts`'s `IN (...)` construction is a hand-copied
  // duplicate of `member-roster.ts`'s (not a shared helper), so the test above proves nothing about
  // THIS template's own copy — a typo here would ship unnoticed. `reconciliation.review` is held only
  // at pariwar ceilings (Escalation 1), so no real grant can ever drive this branch; hand-build the
  // ctx directly at the `.query()` level, exactly as D5(b) below does for the empty-set case, rather
  // than inventing a grant (which Escalation 1 explicitly rejects).
  it('contribution_rate_by_district also narrows WHERE district IN (...) — its own IN(...) construction, proven directly since no real grant can reach it (Escalation 1)', async () => {
    const { tx, client } = getTx();
    await seedTwoDistricts(tx);
    await enterAppScope(client, PARIWAR_A);

    const contributionRateTemplate = registry.get<{ district: string; member_count: number }>(
      'contribution_rate_by_district',
    )!;
    const twoDistrictsCtx: reports.ReportScopeCtx = {
      actorId: ACTOR,
      grants: [],
      pariwarId: PARIWAR_A,
      resolvedScope: { dimension: 'district', values: ['Gaya', 'Patna'] },
    };

    const rows = await contributionRateTemplate.query(twoDistrictsCtx, tx);
    const districts = new Set(rows.map((r) => r.district));
    expect(districts.has('Patna')).toBe(true);
    expect(districts.has('Gaya')).toBe(true);
  });

  it('D5(b): an EMPTY district set DENIES — zero rows against a tenant that demonstrably HAS rows', async () => {
    const { tx, client } = getTx();
    const { a1, a2, a3 } = await seedTwoDistricts(tx);
    await enterAppScope(client, PARIWAR_A);

    const rosterTemplate = registry.get<{ member_id: string; district: string }>('member_roster')!;

    // ⚠ THIS INPUT IS UNREACHABLE THROUGH A REAL ACTOR'S GRANTS, BY D1(i)'s OWN INVARIANT —
    // `resolveActorReportScope` never returns a non-global scope with an empty set, and an actor with
    // no district grant resolves to `null` and is 403'd before any template runs. So it is HAND-BUILT
    // here, exactly as the PIN 9/9 test hand-builds its state_trustee scope. That is the point: the
    // guarantee must hold at the narrowing authority even for an input the producer cannot emit.
    const emptyCtx: reports.ReportScopeCtx = {
      actorId: ACTOR,
      grants: [
        { pariwarId: PARIWAR_A, role: 'district_admin', scopeDimension: 'district', scopeValue: 'Patna' },
      ],
      pariwarId: PARIWAR_A,
      resolvedScope: { dimension: 'district', values: [] },
    };

    // ⛔ ZERO ROWS — never the tenant.
    expect(await rosterTemplate.query(emptyCtx, tx)).toEqual([]);

    // ⭐ AND THE ASSERTION THAT STOPS THIS PASSING VACUOUSLY: the very same tenant, read through a
    // pariwar-scoped actor in the very same transaction, DOES have rows. Without this, a suite that
    // seeded nothing (or a DB that returned nothing) would satisfy the line above.
    const tenantRows = await rosterTemplate.query(pariwarCtx(), tx);
    const tenantIds = new Set(tenantRows.map((r) => r.member_id));
    expect(tenantIds.has(a1) && tenantIds.has(a2) && tenantIds.has(a3)).toBe(true);

    // Defence-in-depth, the D2 half: the same empty scope also fails CLOSED at the authorization
    // layer — `assembleReport` maps the empty set to a single `null` target, which `scopeContains`
    // rejects for any non-global dimension. ⛔ It must never become an empty loop that checks nothing.
    // [Review fix] Asserted on `AuthorizationDeniedError` specifically, not a bare `toThrow()` — this
    // is the trap the story calls the most dangerous, and a bare `toThrow()` can't tell "denied for
    // the right reason" apart from an unrelated crash.
    await expect(reports.assembleReport(registry, 'member_roster', emptyCtx, tx)).rejects.toThrow(
      AuthorizationDeniedError,
    );
  });

  // ── PIN 9/9 — RE-PINNED AT STORY 10.28 (AC4). ASSERTIONS UNCHANGED; THE REASON IS REWRITTEN. ──
  //
  // ⛔ THIS IS A **QUERY** DENY-DEEPER PIN, NOT AN RBAC ONE — and that distinction is the whole
  // disposition. Read the chain before touching it: `checkPermission` ALREADY ALLOWS here. A real
  // `state_trustee` genuinely holds `member.view_validity` at `{state,'Bihar'}`, and the resolved
  // scope is ALSO `{state,['Bihar']}` — an EXACT-NODE match at the SAME dimension, answered at
  // `rbac/scope.ts:241` with no resolver involved at all. The zero rows come from the QUERY-level
  // narrowing in `templates/_shared.ts` (`resolveDistrictNarrowing` → `deny`).
  //
  // ⇒ Story 1.18's ancestry resolver does NOT move this pin, and could not have. It was listed among
  // the nine because it says "deny-deeper", not because a resolver was ever the blocker. That half of
  // the disposition — the RBAC-vs-QUERY reclassification — was DISCHARGED IN FULL by Story 1.18
  // (AC6), and asserted falsifiably by the with-resolver companion at the bottom of this test. ⛔ It
  // is not re-litigated here, and Story 10.28 changes NONE of it.
  //
  // ⭐ WHAT STORY 10.28 CHANGES IS THE *REASON*, AND ONLY THE REASON — because the one Story 1.18
  // left has now EXPIRED. That reason was "`DistrictNarrowing` and `ResolvedReportScope` are
  // SINGLE-VALUED", and Story 10.28 made both MULTI-valued: the narrowing is now
  // `WHERE district IN (…)` and a two-district admin genuinely gets both. So the cardinality that
  // used to be the blocker is GONE, and a `state` actor STILL resolves nothing here.
  //
  // ⚠ THE REASON ON THIS BRANCH HAS NOW BEEN WRONG TWICE ("no resolver until 1.18"; "the type is
  // single-valued"). Both named a MISSING MECHANISM, and mechanisms get built. The third reason
  // names a MISSING ACTOR, which is why it is durable:
  //
  //   **NO ROLE HOLDS A DISTRICT-NARROWABLE REPORT KEY AT A `state` CEILING.** `state_trustee`
  //   (`roles.ts:361-369`, ceiling `state`) holds `member.view_validity` but NOT
  //   `member.export_roster` — which lives only at `pariwar_admin` (`:341`) and `district_admin`
  //   (`:401`); `reconciliation.review` is pariwar-ceiling only. Zero live consumers, zero backlog
  //   consumers, no FR. The district-ENUMERATION API a state→descendants expansion needs does not
  //   exist BECAUSE NONE WAS EVER NEEDED (`GeoTreeResolver` is `contains`-only by interface;
  //   `LoadedGeoTree.parents` is child→parent only).
  //
  // ⛔ **"Closed by [edit]", NO successor minted** (Story 10.28, D3) — deliberately, on Story 1.18's
  // own D4-R precedent. This is NOT a deferral and must never be re-read as one. If a state-ceiling
  // role ever gains such a key, THAT story raises the enumeration question with a live requirement
  // attached. ⛔ This test asserts the SAME zero rows it always has; the fixture below is registered
  // under `member.view_validity` precisely because no `state`-ceiling role holds the roster key.
  it('deny-deeper (QUERY-level, not RBAC): a state-scoped actor resolves nothing below its ceiling — through the REAL checkPermission + assembleReport chain, not just the query helper', async () => {
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
      resolvedScope: { dimension: 'state', values: ['Bihar'] },
    };
    const result = await reports.assembleReport(
      stateFixtureRegistry,
      'fixture_state_trustee_roster',
      ctx,
      tx,
    );
    expect(result.rows).toHaveLength(0); // real checkPermission ALLOWED (state_trustee genuinely holds
    // member.view_validity @ state); the QUERY's deny-deeper narrowing is what actually stops the leak.

    // ⭐ Story 1.18 — the classification above ASSERTED rather than merely claimed. Re-run the exact
    // same assembly with a REAL geo-tree resolver supplied (a published Bihar tree containing both
    // seeded districts). If this pin were RBAC-blocked, the resolver would change the outcome. It
    // does not: still zero rows, because the block is the QUERY's narrowing, which no resolver
    // touches. This is what makes the "not an RBAC pin" disposition falsifiable instead of asserted.
    const withResolver = await reports.assembleReport(
      stateFixtureRegistry,
      'fixture_state_trustee_roster',
      {
        ...ctx,
        geoResolver: createGeoTreeResolver(
          buildGeoTree({
            version: 1,
            nodes: [
              { dimension: 'state', value: 'Bihar', parent_dimension: null, parent_value: null },
              { dimension: 'district', value: 'Patna', parent_dimension: 'state', parent_value: 'Bihar' },
              { dimension: 'district', value: 'Vaishali', parent_dimension: 'state', parent_value: 'Bihar' },
            ],
          }),
        ),
      },
      tx,
    );
    expect(withResolver.rows).toHaveLength(0);
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
