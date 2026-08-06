// Member Validity Service — live-DB integration (Story 4.6, Task 6; :5433).
//
// Drives getValidity/getValidityAt against real Postgres: seeds a member (signup events → active) +
// (for the retired case) a member_postings retirement anchor + the R12 clause, then asserts the
// GENUINELY-producible fields (is_valid/is_active, lock_in, vyawastha_shulk, retirement_coverage with
// its real projection, applicable_niyamavali_clauses=[R12] + provenance + one rule_registry_version at
// the pinned instant), the ADMIN-call audit row + NO audit on a self-call, and idempotent byte-identical
// replay. Own-committing (NOT setupLiveDb): the idempotency store + audit writer COMMIT their own tx.
// Assertions key on membership / our own rows / idempotent outcome, NEVER global counts
// ([[project_live_db_test_gotchas]]). Real CI `test (unit)` runs with DATABASE_URL UNSET → this skips.

import { randomUUID } from 'node:crypto';

import { canonicalJsonStringify, createDb, ids, idempotency, schema, type Db } from '@twt/domain';
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { getValidity, getValidityAt, type ValidityCaller, type ValidityServiceDeps } from '../../src/index.js';
import { R12_PAYLOAD } from '../fixtures/r12-clause.js';
import { R7_PAYLOADS } from '../fixtures/r7-clauses.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);

describe.skipIf(!hasDatabase)('validity-service — canonical payload (live DB, own-committing) (:5433)', () => {
  let db: Db;
  let pool: pg.Pool;
  let deps: ValidityServiceDeps;
  const pariwars: string[] = [];
  const members: string[] = [];

  function track(pariwarId: string, memberId: string): void {
    pariwars.push(pariwarId);
    members.push(memberId);
  }

  async function seedR12(pariwarId: ids.PariwarId): Promise<ids.ClauseVersionId> {
    const clauseVersionId = ids.clauseVersionId(randomUUID());
    await db.insert(schema.clauseVersions).values({
      clauseVersionId,
      clauseId: ids.clauseId('niy.retirement-coverage.r12'),
      pariwarId,
      version: 1,
      effectiveDate: new Date('2000-01-01T00:00:00Z'),
      payload: { ...R12_PAYLOAD },
      benefitMechanism: 'pool',
    });
    return clauseVersionId;
  }

  /**
   * Seed the four ACTIVATED R7 clauses (mirrors `contribution-facts.spec.ts`'s `seedActivatedR7`).
   * Required since the 2026-08-06 fix: a Pariwar with NO R7 clause versions provisioned now correctly
   * degrades `contributionHistorySummary` to `producer_unavailable`/`niyamavali-registry` (the registry
   * gap is a different claim from "R7 provisioned but none applies") — so a test asserting the `ok`
   * arm must actually provision the registry, not merely provision R12.
   */
  async function seedActivatedR7(pariwarId: ids.PariwarId): Promise<void> {
    for (const clauseId of [
      'niy.contribution-discipline.r7-c',
      'niy.contribution-discipline.r7-d',
      'niy.contribution-discipline.r7-e',
      'niy.contribution-discipline.r7-f',
    ]) {
      await db.insert(schema.clauseVersions).values({
        clauseVersionId: ids.clauseVersionId(randomUUID()),
        clauseId: ids.clauseId(clauseId),
        pariwarId,
        version: 1,
        effectiveDate: new Date('2000-01-01T00:00:00Z'),
        payload: { ...R7_PAYLOADS[clauseId] },
        benefitMechanism: 'pool',
      });
    }
  }

  async function seedEvent(
    pariwarId: ids.PariwarId,
    memberId: ids.MemberId,
    version: number,
    eventType: string,
    occurredAt: Date,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await db.insert(schema.eventsLog).values({
      streamId: memberId,
      eventType,
      payload,
      eventVersion: version,
      actorId: null,
      pariwarId,
      occurredAt,
    });
  }

  /** Seed the event chain that replays to `active`, with signup at `joinedAt` (the tenure anchor). */
  async function seedActiveMember(
    pariwarId: ids.PariwarId,
    memberId: ids.MemberId,
    joinedAt: Date,
  ): Promise<void> {
    const at = (n: number): Date => new Date(joinedAt.getTime() + n * 1000);
    await seedEvent(pariwarId, memberId, 1, 'member.signup_initiated', joinedAt, {});
    await seedEvent(pariwarId, memberId, 2, 'member.kyc_completed', at(2), {});
    await seedEvent(pariwarId, memberId, 3, 'member.vyawastha_shulk_paid', at(3), {});
    await seedEvent(pariwarId, memberId, 4, 'member.lock_in_expired', at(4), { kyc_verified: true });
    // Story 10.24 (round-2 review): record the Pariwar's projection COVERAGE WATERMARK. Without it
    // `deriveContributionFacts` returns the `producer_unavailable` sentinel — correctly, because an
    // un-backfilled tenant's ledger is empty and "no rows" would otherwise read as a clean record
    // (⚖ "Unknown projection state must never fabricate a clean member"). A member seeded as genuinely
    // having NO contributions needs coverage present, so the zero it derives is DATA rather than a gap.
    await db
      .insert(schema.contributionProjectionCoverage)
      .values({ pariwarId, coveredFrom: new Date('2000-01-01T00:00:00Z') })
      .onConflictDoNothing();
  }

  /** Insert the members row (FK target for postings) + a retirement posting anchor. */
  async function seedRetirement(
    pariwarId: ids.PariwarId,
    memberId: ids.MemberId,
    retiredAt: Date,
  ): Promise<void> {
    await db.insert(schema.members).values({
      memberId,
      pariwarId,
      state: 'active',
      stateEventVersion: 4,
    });
    await db.insert(schema.memberPostings).values({
      memberId,
      pariwarId,
      district: 'Patna',
      isRetirement: true,
      createdAt: retiredAt,
    });
  }

  async function countValidityAudits(memberId: ids.MemberId): Promise<number> {
    const res = await pool.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM audit_log_entries WHERE action = 'validity.evaluate' AND resource_locator = $1`,
      [`member/${memberId}`],
    );
    return res.rows[0]?.n ?? 0;
  }

  function adminCaller(pariwarId: string): ValidityCaller {
    return {
      actorId: randomUUID(),
      grants: [{ pariwarId, role: 'super_admin', scopeDimension: 'global', scopeValue: null }],
      resource: { dimension: 'pariwar', value: pariwarId, pariwarId },
      isSelf: false,
    };
  }

  function selfCaller(pariwarId: string, memberId: string): ValidityCaller {
    return { actorId: memberId, grants: [], resource: { dimension: 'self', value: memberId, pariwarId }, isSelf: true };
  }

  beforeAll(() => {
    if (!hasDatabase) return;
    const created = createDb(DATABASE_URL!, { ssl: false, max: 8 });
    db = created.db;
    pool = created.pool;
    deps = { db, keyedStore: idempotency.createKeyedStore(pool), servicePool: pool };
  });

  afterAll(async () => {
    if (!hasDatabase) return;
    if (pariwars.length > 0) {
      await pool.query('DELETE FROM clause_versions WHERE pariwar_id::text = ANY($1)', [pariwars]).catch(() => undefined);
      await pool.query('DELETE FROM member_postings WHERE pariwar_id::text = ANY($1)', [pariwars]).catch(() => undefined);
      await pool.query('DELETE FROM members WHERE pariwar_id::text = ANY($1)', [pariwars]).catch(() => undefined);
      await pool.query('DELETE FROM events_log WHERE pariwar_id::text = ANY($1)', [pariwars]).catch(() => undefined);
    }
    for (const m of members) {
      await pool.query('DELETE FROM idempotency_keys WHERE key LIKE $1', [`rule-eval:v1:%:${m}:%`]).catch(() => undefined);
    }
    await pool.end();
  });

  it('assembles the canonical payload for an active non-retired member with real tenure-derived coverage', async () => {
    const pariwarId = ids.pariwarId(randomUUID());
    const memberId = ids.memberId(randomUUID());
    track(pariwarId, memberId);
    await seedActiveMember(pariwarId, memberId, new Date('2010-06-01T00:00:00Z'));
    const versionId = await seedR12(pariwarId);
    // 2026-08-06: the registry-unprovisioned guard now requires this — see seedActivatedR7's doc.
    await seedActivatedR7(pariwarId);

    const at = new Date('2025-06-01T00:00:00Z'); // 15 years of tenure → +3 earned
    const p = await getValidityAt(deps, { pariwarId, memberId }, at, { internal: true });

    expect(p.memberId).toBe(memberId);
    expect(p.isValid).toBe(true); // active
    expect(p.isActive).toBe(true);
    // ── Story 10.24: the producer EXISTS, so this member gets real facts, not the sentinel ────────
    // This member has a readable history and NO contributions, which genuinely derives
    // `total_count: 0` / `ever_contributed: false`. That is DATA, not a gap — and the distinction is
    // load-bearing (D6): the `producer_unavailable` sentinel is reserved for a member whose history
    // could not be derived AT ALL, so collapsing the two would make an un-assessed member
    // indistinguishable from a clean-record one on the surface that feeds a suspension decision.
    //
    // `months_since_last` is ABSENT (not 0, not large): a never-contributed member is exactly
    // R7(B)'s population, R7(B) is HELD, and supplying "months since signup" would fire R7(C)/(F) on
    // them — proxy evaluation, which `prd.md:346` forbids normatively.
    expect(p.contributionHistorySummary.status).toBe('ok');
    if (p.contributionHistorySummary.status === 'ok') {
      expect(p.contributionHistorySummary.facts).toEqual({
        'contribution.total_count': 0,
        'contribution.ever_contributed': false,
        'contribution.skips_current_year': 0,
        'contribution.in_lapse': false,
      });
      expect(p.contributionHistorySummary.facts).not.toHaveProperty('contribution.months_since_last');
      // ⚠ Story 10.25 (AC7) — `r7a_restorations_used` is ABSENT here too, and for a DIFFERENT reason
      // from `months_since_last`: this Pariwar seeds only R7(C)–(F), so R7(A) resolves to no clause
      // version and the restoration THRESHOLD is unknown. "We cannot tell how long a restoration is"
      // is not "this member has completed none" — and a `0` would be an affirmative claim about them
      // on the clause that decides whether their restoration path still exists. Production seeds all
      // seven (`niyamavali-v1-clauses.sql` row 0e1c0001), so this is the honest-gap path, not the
      // ordinary one; the ordinary one is proven in `contribution-facts.spec.ts`.
      expect(p.contributionHistorySummary.facts).not.toHaveProperty(
        'contribution.r7a_restorations_used',
      );
      expect(p.contributionHistorySummary.lapseSince).toBeNull();
      // The honest hold, on the wire: what is missing and who owns it. Story 10.25 DISCHARGED the
      // `story-10-25` half (it supplies `r7a_restorations_used`); the 10.26 half is still open.
      expect(p.contributionHistorySummary.heldFacts.map((f) => f.producer).sort()).toEqual([
        'story-10-26',
      ]);
      // Story 10.25 (AC4/D4) — no R7 clause applied to this member, so there is no consecutive
      // package to count. That is a different claim from `package_unavailable` ("we cannot tell you"),
      // which the render layer reaches from the summary's own `producer_unavailable` arm.
      expect(p.contributionHistorySummary.restorationPackage).toEqual({
        status: 'no_consecutive_requirement',
        clauseId: null,
      });
    }
    // R12 is still the ONLY applicable clause here: this Pariwar DOES provision R7(C)–(F) (seeded
    // above), but none of them APPLY to a member with no contribution history (D2 — only clauses
    // whose `on_pass` fired reach this list). R8 is not activated at all.
    expect(p.applicableNiyamavaliClauses.map((c) => String(c.clauseId))).toEqual(['niy.retirement-coverage.r12']);
    expect(p.provenanceTrace[0]?.clauseVersionId).toBe(versionId);
    expect(p.ruleRegistryVersion).toBe(versionId);
    // Non-retired: nonzero years earned (15yr → +3) but no active projection ([[CR-4.5-D3]]).
    expect(p.retirementCoverage).toMatchObject({
      isRetired: false,
      yearsOfCoverageEarned: 3,
      coverageThrough: null,
      active: false,
    });
    expect(p.validityPayloadHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('projects active retirement coverage for a retired member (real posting anchor)', async () => {
    const pariwarId = ids.pariwarId(randomUUID());
    const memberId = ids.memberId(randomUUID());
    track(pariwarId, memberId);
    await seedActiveMember(pariwarId, memberId, new Date('2005-06-01T00:00:00Z'));
    await seedRetirement(pariwarId, memberId, new Date('2023-06-01T00:00:00Z')); // 18yr tenure → +3
    await seedR12(pariwarId);

    const at = new Date('2024-06-01T00:00:00Z');
    const p = await getValidityAt(deps, { pariwarId, memberId }, at, { internal: true });

    expect(p.retirementCoverage).toMatchObject({ isRetired: true, active: true });
    if ('yearsOfCoverageEarned' in p.retirementCoverage) {
      expect(p.retirementCoverage.yearsOfCoverageEarned).toBe(3);
      // coverage_through = retiredAt (2023-06-01) + 3 years = 2026-06-01.
      expect(p.retirementCoverage.coverageThrough).toBe('2026-06-01T00:00:00.000Z');
    }
  });

  it('audits an ADMIN call and does NOT audit a self-call (PRD FR-12A)', async () => {
    const pariwarId = ids.pariwarId(randomUUID());
    const memberId = ids.memberId(randomUUID());
    track(pariwarId, memberId);
    await seedActiveMember(pariwarId, memberId, new Date('2015-06-01T00:00:00Z'));
    await seedR12(pariwarId);
    const at = new Date('2025-06-01T00:00:00Z');

    const before = await countValidityAudits(memberId);
    // Self-call first → no validity.evaluate audit line.
    await getValidityAt(deps, { pariwarId, memberId }, at, { caller: selfCaller(pariwarId, memberId) });
    const afterSelf = await countValidityAudits(memberId);
    expect(afterSelf - before).toBe(0);

    // Admin call → exactly one validity.evaluate audit line.
    await getValidityAt(deps, { pariwarId, memberId }, at, { caller: adminCaller(pariwarId) });
    const afterAdmin = await countValidityAudits(memberId);
    expect(afterAdmin - afterSelf).toBe(1);
  });

  it('is idempotent: identical pinned-instant evaluations are byte-identical', async () => {
    const pariwarId = ids.pariwarId(randomUUID());
    const memberId = ids.memberId(randomUUID());
    track(pariwarId, memberId);
    await seedActiveMember(pariwarId, memberId, new Date('2012-06-01T00:00:00Z'));
    await seedR12(pariwarId);
    const at = new Date('2025-06-01T00:00:00Z');

    const first = await getValidityAt(deps, { pariwarId, memberId }, at, { internal: true });
    const second = await getValidityAt(deps, { pariwarId, memberId }, at, { internal: true });
    expect(canonicalJsonStringify(second as never)).toBe(canonicalJsonStringify(first as never));
    expect(second.validityPayloadHash).toBe(first.validityPayloadHash);
  });

  it('getValidity pins one DB-authoritative instant across the payload', async () => {
    const pariwarId = ids.pariwarId(randomUUID());
    const memberId = ids.memberId(randomUUID());
    track(pariwarId, memberId);
    await seedActiveMember(pariwarId, memberId, new Date('2018-06-01T00:00:00Z'));
    const versionId = await seedR12(pariwarId);

    const p = await getValidity(deps, { pariwarId, memberId }, { internal: true });
    // One rule_registry_version (the single R12 clause) + a consistent provenance instant.
    expect(p.ruleRegistryVersion).toBe(versionId);
    expect(p.provenanceTrace.every((e) => e.evaluatedAt === p.provenanceTrace[0]?.evaluatedAt)).toBe(true);
  });
});
