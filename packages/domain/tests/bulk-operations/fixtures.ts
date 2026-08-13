// Test-only fixture operations for the Story 10.6 bulk-operations harness.
//
// Not a `.test.ts`/`.spec.ts`, so vitest does not collect this as its own suite — it is imported by
// the harness unit tests (parity, dry-run, scope, cap, no-rollback, CSV) and the AC7b Open/Closed
// proof. Two DIFFERENT fixture operations (divergent evaluate/apply/csvRow + item shape) prove the
// harness treats every `BulkOperation` identically — no behavior comes from the harness itself.
//
// Both reuse the REAL `claim.approve` catalog key (district_admin + state_trustee both hold it,
// district_admin at `district` ceiling, state_trustee at `state` ceiling) — bulkExecute always
// checks against the seeded default role bundles, so a fixture permissionKey must be a real,
// grounded key, not an invented one (`checkPermission` fails closed on any key outside
// PERMISSION_CATALOG).

import type { EffectiveGrant } from '../../src/rbac/check.js';
import type { BulkActorContext, BulkOperation } from '../../src/bulk-operations/types.js';

export const FIXTURE_PARIWAR_ID = '11111111-1111-1111-1111-111111111111';
export const FIXTURE_ACTOR_ID = '99999999-9999-9999-9999-999999999999';

/** A district_admin grant scoped to Patna — exact-node match on a Patna-district item. */
export const DISTRICT_ADMIN_PATNA_GRANT: EffectiveGrant = {
  pariwarId: FIXTURE_PARIWAR_ID,
  role: 'district_admin',
  scopeDimension: 'district',
  scopeValue: 'Patna',
};

/** A state_trustee grant scoped to Bihar — BROADER than any single district; the default
 *  deny-deeper geo resolver denies it against a district-level target (10.3/10.4/10.5's documented
 *  asymmetry, not a bug — the Epic-3 geo-tree resolver is what would let this succeed). */
export const STATE_TRUSTEE_BIHAR_GRANT: EffectiveGrant = {
  pariwarId: FIXTURE_PARIWAR_ID,
  role: 'state_trustee',
  scopeDimension: 'state',
  scopeValue: 'Bihar',
};

export function actorContext(
  grants: readonly EffectiveGrant[],
  /** Story 1.18 — the optional geo-tree resolver. OMITTED by default, deliberately: every existing
   *  caller of this helper keeps the deny-deeper posture with no edit, which is the same guarantee
   *  the production contract change makes. Pass one only where the resolver is the thing under test. */
  geoResolver?: BulkActorContext['geoResolver'],
): BulkActorContext {
  return {
    actorId: FIXTURE_ACTOR_ID,
    actorRole: null,
    pariwarId: FIXTURE_PARIWAR_ID,
    grants,
    geoResolver,
  };
}

// ── Fixture A — the primary harness-exercising operation ────────────────────────────────────────

export interface FixtureItemA {
  id: string;
  /** A district value the RBAC scope-check resource locator targets. */
  district: string;
  /** Even → `would_succeed`; odd → `would_fail`. Deterministic, no I/O — the PURE evaluate contract. */
  parity: 'even' | 'odd';
}

export interface FixtureContextA {
  /** Ids whose `apply` should throw — the silent-divergence mutation proof (AC7). */
  failIds: Set<string>;
  /** Every id `apply` actually ran for — proves apply is never called in dry-run (AC2). */
  applied: string[];
}

export function createFixtureContextA(failIds: readonly string[] = []): FixtureContextA {
  return { failIds: new Set(failIds), applied: [] };
}

export const fixtureOperationA: BulkOperation<FixtureItemA, FixtureContextA> = {
  operationType: 'test.fixture_a',
  permissionKey: 'claim.approve',
  scopeDimension: 'district',
  auditAction: 'test.fixture_a_processed',
  targetLocatorOf: (item) => ({ dimension: 'district', value: item.district }),
  // Distinct from the scope locator on purpose (Review Findings): items commonly share a district
  // (the RBAC scope node), but each has its own id — itemId proves the harness keys audit/
  // divergence tracking on THIS, not on the (possibly shared) locator value.
  itemId: (item) => item.id,
  evaluate: (item) =>
    item.parity === 'even'
      ? { outcome: 'would_succeed' }
      : { outcome: 'would_fail', reason: 'odd_id' },
  apply: async (item, ctx) => {
    if (ctx.failIds.has(item.id)) {
      throw new Error(`fixture_a: apply failed for ${item.id}`);
    }
    ctx.applied.push(item.id);
  },
  csvRow: (item, outcome) => ({
    id: item.id,
    district: item.district,
    status: outcome.status,
    reason: outcome.reason ?? '',
  }),
};

export function fixtureItemsA(count: number, district = 'Patna'): FixtureItemA[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `a-${String(i)}`,
    district,
    parity: i % 2 === 0 ? 'even' : 'odd',
  }));
}

// ── Fixture B — deliberately DIVERGENT (AC7b Open/Closed proof) ─────────────────────────────────
// Different item shape, different evaluate rule (tier threshold, not parity), different apply side
// effect (a separate tracking array), different csvRow columns. Proves NOTHING in the harness reads
// operation identity — all behavior difference comes from the contract, not a harness branch.

export interface FixtureItemB {
  id: string;
  district: string;
  tier: number;
}

export interface FixtureContextB {
  appliedTiers: number[];
}

export function createFixtureContextB(): FixtureContextB {
  return { appliedTiers: [] };
}

const FIXTURE_B_TIER_THRESHOLD = 5;

export const fixtureOperationB: BulkOperation<FixtureItemB, FixtureContextB> = {
  operationType: 'test.fixture_b',
  permissionKey: 'claim.approve',
  scopeDimension: 'district',
  auditAction: 'test.fixture_b_processed',
  targetLocatorOf: (item) => ({ dimension: 'district', value: item.district }),
  evaluate: (item) =>
    item.tier >= FIXTURE_B_TIER_THRESHOLD
      ? { outcome: 'would_succeed' }
      : { outcome: 'would_fail', reason: 'tier_too_low' },
  apply: async (item, ctx) => {
    ctx.appliedTiers.push(item.tier);
  },
  csvRow: (item, outcome) => ({
    itemId: item.id,
    tier: String(item.tier),
    outcome: outcome.status,
  }),
};

export function fixtureItemsB(count: number, district = 'Patna'): FixtureItemB[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `b-${String(i)}`,
    district,
    tier: i % 10,
  }));
}
