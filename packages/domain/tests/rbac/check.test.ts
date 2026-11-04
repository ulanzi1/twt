// Fail-closed enforcement unit tests — Story 1.8 (AC-4 + AC-5, Task 7.1a).
//
// THE TRIPWIRE. Default-deny on every uncertain path: unknown key, no grant,
// unknown role, role-lacks-key, cross-Pariwar scope, exact-node mismatch,
// unresolved locator, missing geo-resolver. Every "allow" is explicit. Also covers
// the guard's structured 403 denial + the injectable audit seam (the seam fires on
// deny, never on allow; the actual FR-47 sink is Story 1.10).

import fs from 'node:fs';
import path from 'node:path';

import ts from 'typescript';

import { describe, expect, it } from 'vitest';

import {
  AUTHORIZATION_DENIED_CODE,
  AuthorizationDeniedError,
  type AuthorizationDenial,
} from '../../src/errors.js';
import {
  PERMISSION_CATALOG_VERSION,
  authorize,
  authorizingGrant,
  checkPermission,
  hasPermission,
  isVerifiedAuthorization,
  matchingGrantRole,
  requirePermission,
  type AuthzContext,
  type EffectiveGrant,
  type GeoTreeResolver,
  type ResourceLocator,
} from '../../src/rbac/index.js';

const PARIWAR_A = '11111111-1111-1111-1111-111111111111';
const PARIWAR_B = '22222222-2222-2222-2222-222222222222';
const ACTOR = '99999999-9999-9999-9999-999999999999';

// Patna ∈ Bihar; for the resolver-seam allow path.
const BIHAR_TREE: GeoTreeResolver = {
  contains: (a, d) => a.dimension === 'state' && a.value === 'Bihar' && d.value === 'Patna',
};

function resource(over: Partial<ResourceLocator> = {}): ResourceLocator {
  return { dimension: 'district', value: 'Patna', pariwarId: PARIWAR_A, ...over };
}

// ── ALLOW paths (explicit) ───────────────────────────────────────────────────

describe('hasPermission — explicit allow paths', () => {
  it('Super Admin (global) allows cross-Pariwar (the only global role)', () => {
    const grants: EffectiveGrant[] = [
      { pariwarId: PARIWAR_A, role: 'super_admin', scopeDimension: 'global', scopeValue: null },
    ];
    // Acts in Pariwar B even though the grant row is in A — global is cross-Pariwar.
    expect(hasPermission(grants, 'claim.approve', resource({ pariwarId: PARIWAR_B }))).toBe(true);
  });

  it('District Admin at district=Patna allows claim.approve on a Patna target', () => {
    const grants: EffectiveGrant[] = [
      { pariwarId: PARIWAR_A, role: 'district_admin', scopeDimension: 'district', scopeValue: 'Patna' },
    ];
    expect(hasPermission(grants, 'claim.approve', resource())).toBe(true);
  });

  it('Pariwar Admin (pariwar ceiling) allows an in-tenant geo action', () => {
    const grants: EffectiveGrant[] = [
      { pariwarId: PARIWAR_A, role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: PARIWAR_A },
    ];
    expect(hasPermission(grants, 'member.suspend', resource({ value: 'AnyDistrict' }))).toBe(true);
  });

  it('State Trustee at state=Bihar allows district=Patna ONLY with an injected resolver', () => {
    // ── PIN 2/9 — Story 1.18 disposition: ASSERTION UNCHANGED, PROSE UPDATED. ──────────────────
    // This pin already tested BOTH directions, so the resolver landing changes nothing about it —
    // it is the seam's contract, and the contract did not move. Only the prose was stale: it called
    // the injected stub "the Epic-3 geo tree", and Epic 3 never owned this (Epic 3 supplied the geo
    // DATA, which is precisely the dependency whose arrival was mistaken for the fix). The real
    // resolver is now `geoTree.createGeoTreeResolver`, built over a published `geo_tree_versions`
    // document; `tests/geo-tree/resolver.test.ts` proves it satisfies exactly this contract, and
    // `tests/integration/geo-tree/registry.spec.ts` proves the same end-to-end from a stored row.
    const grants: EffectiveGrant[] = [
      { pariwarId: PARIWAR_A, role: 'state_trustee', scopeDimension: 'state', scopeValue: 'Bihar' },
    ];
    // Without a resolver → fail-closed deny. STILL the behaviour for a Pariwar with no tree.
    expect(hasPermission(grants, 'claim.approve', resource())).toBe(false);
    // With a geo tree injected → allow. Story 1.18 is what makes this reachable in production.
    expect(hasPermission(grants, 'claim.approve', resource(), { resolver: BIHAR_TREE })).toBe(true);
  });
});

// ── FAIL-CLOSED matrix ───────────────────────────────────────────────────────

describe('hasPermission — fail-closed matrix (every uncertain path denies)', () => {
  const districtAdmin: EffectiveGrant[] = [
    { pariwarId: PARIWAR_A, role: 'district_admin', scopeDimension: 'district', scopeValue: 'Patna' },
  ];

  it('unknown key → deny', () => {
    expect(hasPermission(districtAdmin, 'claim.delete', resource())).toBe(false);
  });

  it('malformed key → deny', () => {
    expect(hasPermission(districtAdmin, 'not a key', resource())).toBe(false);
  });

  it('no grant → deny', () => {
    expect(hasPermission([], 'claim.approve', resource())).toBe(false);
  });

  it('cross-Pariwar scope → deny (grant in A, action in B)', () => {
    expect(hasPermission(districtAdmin, 'claim.approve', resource({ pariwarId: PARIWAR_B }))).toBe(false);
  });

  it('exact-node mismatch → deny (Patna grant, Vaishali target — the Anita case)', () => {
    expect(hasPermission(districtAdmin, 'claim.approve', resource({ value: 'Vaishali' }))).toBe(false);
  });

  it('unresolved locator (null value) → deny', () => {
    expect(hasPermission(districtAdmin, 'claim.approve', resource({ value: null }))).toBe(false);
  });

  it('unresolved locator still denies a Super Admin global grant', () => {
    const grants: EffectiveGrant[] = [
      { pariwarId: PARIWAR_A, role: 'super_admin', scopeDimension: 'global', scopeValue: null },
    ];
    expect(hasPermission(grants, 'claim.approve', resource({ value: null }))).toBe(false);
  });

  it('inconsistent Pariwar locator → deny (active pariwarId and target value disagree)', () => {
    const grants: EffectiveGrant[] = [
      { pariwarId: PARIWAR_A, role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: PARIWAR_A },
    ];
    expect(
      hasPermission(grants, 'pariwar.amend_rule', resource({ dimension: 'pariwar', value: PARIWAR_B })),
    ).toBe(false);
  });

  it('malformed grant scope → deny (pariwar grant value must match its pariwarId)', () => {
    const grants: EffectiveGrant[] = [
      { pariwarId: PARIWAR_A, role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: PARIWAR_B },
    ];
    expect(hasPermission(grants, 'member.suspend', resource())).toBe(false);
  });

  it('role scope ceiling is enforced → deny lower role granted broader scope', () => {
    const grants: EffectiveGrant[] = [
      { pariwarId: PARIWAR_A, role: 'district_admin', scopeDimension: 'global', scopeValue: null },
    ];
    expect(hasPermission(grants, 'claim.approve', resource({ pariwarId: PARIWAR_B }))).toBe(false);
  });

  it('role scope ceiling still allows a role granted at its ceiling', () => {
    const grants: EffectiveGrant[] = [
      { pariwarId: PARIWAR_A, role: 'district_admin', scopeDimension: 'district', scopeValue: 'Patna' },
    ];
    expect(hasPermission(grants, 'claim.approve', resource())).toBe(true);
  });

  it('unknown role → deny', () => {
    const grants: EffectiveGrant[] = [
      { pariwarId: PARIWAR_A, role: 'nonexistent_role', scopeDimension: 'district', scopeValue: 'Patna' },
    ];
    expect(hasPermission(grants, 'claim.approve', resource())).toBe(false);
  });

  it('role lacks the key → deny (Block Admin has member.suspend, not claim.approve)', () => {
    const grants: EffectiveGrant[] = [
      { pariwarId: PARIWAR_A, role: 'block_admin', scopeDimension: 'block', scopeValue: 'Block-1' },
    ];
    expect(hasPermission(grants, 'claim.approve', resource({ dimension: 'block', value: 'Block-1' }))).toBe(false);
  });

  it('empty-bundle role (Field Worker) carries no permissions → deny', () => {
    const grants: EffectiveGrant[] = [
      { pariwarId: PARIWAR_A, role: 'field_worker', scopeDimension: 'self', scopeValue: ACTOR },
    ];
    expect(hasPermission(grants, 'claim.approve', resource({ dimension: 'self', value: ACTOR }))).toBe(false);
  });
});

// ── Story 6.7 — ground-inspection district gate (D1/D6) ───────────────────────

describe('hasPermission — Story 6.7 ground-inspection district gate', () => {
  it('District Admin at district=Patna allows claim.conduct_ground_inspection on a Patna assignment (D6 exact-node)', () => {
    const grants: EffectiveGrant[] = [
      { pariwarId: PARIWAR_A, role: 'district_admin', scopeDimension: 'district', scopeValue: 'Patna' },
    ];
    expect(hasPermission(grants, 'claim.conduct_ground_inspection', resource())).toBe(true);
  });

  it('District Admin at district=Patna is DENIED on a Vaishali assignment (per-assignment district authz, D6)', () => {
    const grants: EffectiveGrant[] = [
      { pariwarId: PARIWAR_A, role: 'district_admin', scopeDimension: 'district', scopeValue: 'Patna' },
    ];
    expect(
      hasPermission(grants, 'claim.conduct_ground_inspection', resource({ value: 'Vaishali' })),
    ).toBe(false);
  });

  it('RANK-ORDER PIN: a BLOCK-scoped grant can NEVER satisfy a district-dimension check', () => {
    // ── PIN 3/9 — Story 1.18 disposition: ASSERTION UNCHANGED, PROSE CORRECTED. ────────────────
    // ⛔ THIS PIN WAS MISLABELLED, and the correction is the point (Story 1.18 D2). The old comment
    // ended "…and no geo-tree resolver maps block→parent-district YET", which reads as a deferral
    // waiting on Story 1.18. It was never a deferral. This is RANK ORDER, and no org tree — however
    // complete — lifts it:
    //
    //   GEO_RANK: state 2 < district 3 < block 4  (lower = BROADER)
    //   grant {block,'Block-1'} → gRank 4;  target {district,'Patna'} → tRank 3
    //   `if (tRank < gRank) return false`  →  3 < 4  →  DENIED, before any resolver runs.
    //
    // The parent district is BROADER than the block grant, not narrower. A resolver answers "is X
    // beneath Y" and can only ever narrow; this needs the opposite. Story 10.18 placed this in
    // Family B on the reasoning that "block→parent-district is same-tree ancestry with the target
    // strictly narrower" — the target is the PARENT, hence broader, so the premise was inverted.
    // See `rbac/scope.ts` §RANK-ORDER for the canonical explanation.
    //
    // ⇒ The assertion below STANDS EXACTLY AS WRITTEN and must keep passing forever.
    //
    // ── ✅ STORY 6.17 SHIPPED, AND THIS PIN DID NOT MOVE. THAT IS THE POINT. ──────────────────────
    // The honest path for FR-40's block-level actor was always a DIFFERENT GATE, not a resolver and
    // not a weaker pin. Story 6.17 delivered it (Decision `2026-08-13-104`) by making the
    // authorization DIMENSION a property of the ROW rather than of the route:
    //   · `claim_ground_inspections` gained a NULLABLE `block` (migration `0102`);
    //   · a block-tagged assignment is checked at `dimension: 'block'`, which authorizes block_admin
    //     by EXACT-NODE match and district_admin by district→block ANCESTRY (gRank 3 < tRank 4 →
    //     the Story 1.18 resolver, which narrows — the direction it actually points);
    //   · a legacy row (`block == null`) is still checked at `dimension: 'district'`, byte-identically.
    // ⭐ NOTHING ABOVE CONTRADICTS THIS PIN. A block grant against a DISTRICT target is still denied
    // at `tRank < gRank`, forever. 6.17 ROUTED AROUND the pin by changing the TARGET's dimension; it
    // did not lift, weaken or re-target the assertion. ⛔ If a future story finds this pin
    // inconvenient, the answer is another gate — never an edit here.
    // ⛔ block_admin now DOES hold claim.conduct_ground_inspection (roles.ts), and that grant is NOT
    // inert: it resolves by exact-node against a block-dimension target. The v1-deferral pin that
    // asserted the opposite lives in roles.test.ts and MOVED with 6.17 — a DIFFERENT pin from this
    // one, and the distinction matters.
    const grants: EffectiveGrant[] = [
      { pariwarId: PARIWAR_A, role: 'block_admin', scopeDimension: 'block', scopeValue: 'Block-1' },
    ];
    expect(
      hasPermission(grants, 'member.suspend', resource({ dimension: 'district', value: 'Patna' })),
    ).toBe(false);
  });

  it('Pariwar Admin holds claim.override_ground_inspection (D6 supervisor override) at pariwar scope', () => {
    const grants: EffectiveGrant[] = [
      { pariwarId: PARIWAR_A, role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: PARIWAR_A },
    ];
    expect(hasPermission(grants, 'claim.override_ground_inspection', resource())).toBe(true);
    // The district inspector role does NOT hold the override key.
    const districtAdmin: EffectiveGrant[] = [
      { pariwarId: PARIWAR_A, role: 'district_admin', scopeDimension: 'district', scopeValue: 'Patna' },
    ];
    expect(hasPermission(districtAdmin, 'claim.override_ground_inspection', resource())).toBe(false);
  });
});

// ── Story 6.17 — the BLOCK-dimension ground-inspection gate ───────────────────
//
// ⛔ A SEPARATE `describe` ON PURPOSE. The Story 6.7 block above contains the RANK-ORDER PIN, whose
// assertion is byte-frozen (AC4). These are the NEW behaviours: a block-DIMENSION target, which the
// rank-order pin says nothing about because it only ever asks about a DISTRICT-dimension target.
//
// ⭐ The whole story in one line: a block-tagged assignment authorizes BOTH FR-40 actors —
// `block_admin` by EXACT-NODE match (gRank === tRank → value compare), and `district_admin` by
// district→block ANCESTRY (gRank 3 < tRank 4 → the resolver, which narrows). A resolver can only
// ever narrow; this is the direction it points.

describe('hasPermission — Story 6.17 block-dimension ground-inspection gate', () => {
  /** A block-dimension target: the shape a block-TAGGED assignment resolves to. */
  const blockTarget = (value: string): ResourceLocator => ({
    dimension: 'block',
    value,
    pariwarId: PARIWAR_A,
  });

  /** A tree publishing `Block-1 ∈ Patna` — the AC3 ancestry edge. Nothing else resolves. */
  const PATNA_HAS_BLOCK1: GeoTreeResolver = {
    contains: (ancestor, descendant) =>
      ancestor.dimension === 'district' &&
      ancestor.value === 'Patna' &&
      descendant.dimension === 'block' &&
      descendant.value === 'Block-1',
  };

  /** A tree publishing `Block-1 ∈ Vaishali` — a DIFFERENT parent. Used to prove the ancestry test
   *  discriminates the EDGE, not merely the PRESENCE of a resolver (the Story 1.18 AC8 design). */
  const VAISHALI_HAS_BLOCK1: GeoTreeResolver = {
    contains: (ancestor, descendant) =>
      ancestor.dimension === 'district' &&
      ancestor.value === 'Vaishali' &&
      descendant.dimension === 'block' &&
      descendant.value === 'Block-1',
  };

  const blockAdmin: EffectiveGrant[] = [
    { pariwarId: PARIWAR_A, role: 'block_admin', scopeDimension: 'block', scopeValue: 'Block-1' },
  ];
  const districtAdminPatna: EffectiveGrant[] = [
    { pariwarId: PARIWAR_A, role: 'district_admin', scopeDimension: 'district', scopeValue: 'Patna' },
  ];

  it('block_admin@Block-1 ALLOWS claim.conduct_ground_inspection on a Block-1 assignment (exact node)', () => {
    // The grant this story shipped, resolving by exact-node match — NO resolver involved at all.
    // ⭐ This is why the fix was a gate and not a resolver: the block admin never needed one.
    expect(hasPermission(blockAdmin, 'claim.conduct_ground_inspection', blockTarget('Block-1'))).toBe(true);
  });

  it('block_admin@Block-1 is DENIED on a Block-2 assignment (exact-node mismatch, the Anita/Patna-vs-Vaishali rule)', () => {
    expect(hasPermission(blockAdmin, 'claim.conduct_ground_inspection', blockTarget('Block-2'))).toBe(false);
    // ⛔ And a resolver does not rescue it: same-dimension is decided by VALUE before the resolver
    // is ever consulted, so an over-eager tree cannot widen an exact-node mismatch.
    expect(
      hasPermission(blockAdmin, 'claim.conduct_ground_inspection', blockTarget('Block-2'), { resolver: PATNA_HAS_BLOCK1 }),
    ).toBe(false);
  });

  it('district_admin@Patna is DENIED on a Block-1 assignment when NO resolver is supplied (D6 — absence DENIES)', () => {
    // ⛔ THE POLARITY, at the pure-predicate layer. With no tree the default is
    // `denyDeeperGeoResolver`, and the strictly-narrower branch fails closed. Absence must DENY —
    // never fall back to the district gate, which would make the ABSENCE of data WIDEN authorization
    // and make PUBLISHING a tree narrow it (Decision `2026-08-13-104`, D6; ADR-0038's posture).
    expect(hasPermission(districtAdminPatna, 'claim.conduct_ground_inspection', blockTarget('Block-1'))).toBe(false);
  });

  it('district_admin@Patna is ALLOWED on a Block-1 assignment when a resolver places Block-1 UNDER Patna (AC3 ancestry)', () => {
    expect(
      hasPermission(districtAdminPatna, 'claim.conduct_ground_inspection', blockTarget('Block-1'), { resolver: PATNA_HAS_BLOCK1 }),
    ).toBe(true);
  });

  it('district_admin@Patna is DENIED when the resolver places Block-1 under VAISHALI — the test discriminates ANCESTRY, not resolver PRESENCE', () => {
    // ⭐ THE ONE THAT MATTERS (Story 1.18 AC8's design, repeated deliberately). A resolver is
    // supplied in BOTH this case and the one above; only the EDGE differs. Without this assertion the
    // ancestry test would pass on an implementation that allows whenever any resolver exists.
    expect(
      hasPermission(districtAdminPatna, 'claim.conduct_ground_inspection', blockTarget('Block-1'), { resolver: VAISHALI_HAS_BLOCK1 }),
    ).toBe(false);
  });

  it('block_admin@Block-1 is STILL DENIED on a district-dimension target — the rank order is untouched', () => {
    // The AC4 pin's behaviour, restated against THIS story's key so the two can never drift apart.
    // ⛔ Story 6.17 routed around the rank order by changing the TARGET's dimension. It did not lift
    // it, and no resolver ever will: `tRank 3 < gRank 4` denies before the resolver is consulted.
    expect(hasPermission(blockAdmin, 'claim.conduct_ground_inspection', resource())).toBe(false);
    expect(
      hasPermission(blockAdmin, 'claim.conduct_ground_inspection', resource(), { resolver: PATNA_HAS_BLOCK1 }),
    ).toBe(false);
  });

  it('a legacy (block == null) assignment still authorizes district_admin at the district dimension — byte-identical to Story 6.7', () => {
    // The D2 null path. Nothing about it changed, and this pins that it did not.
    expect(hasPermission(districtAdminPatna, 'claim.conduct_ground_inspection', resource())).toBe(true);
    expect(hasPermission(districtAdminPatna, 'claim.conduct_ground_inspection', resource({ value: 'Vaishali' }))).toBe(false);
  });

  it('block_admin does NOT hold claim.override_ground_inspection (D8 — the supervisor override is not re-gated)', () => {
    expect(hasPermission(blockAdmin, 'claim.override_ground_inspection', blockTarget('Block-1'))).toBe(false);
  });
});

// ── Story 4.6 — member.view_validity read key (D5 tripwire) ───────────────────

describe('hasPermission — member.view_validity (Story 4.6 FR-12A read key)', () => {
  it('District Admin at district=Patna allows member.view_validity on a Patna target', () => {
    const grants: EffectiveGrant[] = [
      { pariwarId: PARIWAR_A, role: 'district_admin', scopeDimension: 'district', scopeValue: 'Patna' },
    ];
    expect(hasPermission(grants, 'member.view_validity', resource())).toBe(true);
  });

  it('Verifier (Epic 6 console) holds member.view_validity within its district ceiling', () => {
    const grants: EffectiveGrant[] = [
      { pariwarId: PARIWAR_A, role: 'verifier', scopeDimension: 'district', scopeValue: 'Patna' },
    ];
    expect(hasPermission(grants, 'member.view_validity', resource())).toBe(true);
  });

  it('a role WITHOUT the read key (Field Worker) is denied member.view_validity', () => {
    const grants: EffectiveGrant[] = [
      { pariwarId: PARIWAR_A, role: 'field_worker', scopeDimension: 'self', scopeValue: ACTOR },
    ];
    expect(hasPermission(grants, 'member.view_validity', resource({ dimension: 'self', value: ACTOR }))).toBe(false);
  });

  it('member.view_validity does NOT leak across Pariwar (grant in A, action in B → deny)', () => {
    const grants: EffectiveGrant[] = [
      { pariwarId: PARIWAR_A, role: 'district_admin', scopeDimension: 'district', scopeValue: 'Patna' },
    ];
    expect(hasPermission(grants, 'member.view_validity', resource({ pariwarId: PARIWAR_B }))).toBe(false);
  });
});

// ── The guard: structured 403 denial + audit seam ────────────────────────────

describe('requirePermission — guard + structured denial + audit seam', () => {
  const districtAdmin: EffectiveGrant[] = [
    { pariwarId: PARIWAR_A, role: 'district_admin', scopeDimension: 'district', scopeValue: 'Patna' },
  ];

  it('allows silently (no throw) when the check passes; seam does NOT fire', () => {
    const fired: AuthorizationDenial[] = [];
    const ctx: Partial<AuthzContext> = { onAuthorizationDenied: (d) => fired.push(d) };
    expect(() =>
      requirePermission({ actorId: ACTOR, grants: districtAdmin, key: 'claim.approve', resource: resource() }, ctx),
    ).not.toThrow();
    expect(fired).toHaveLength(0);
  });

  it('throws AuthorizationDeniedError with the structured {actorId, permissionKey, requiredScope, targetLocator}', () => {
    let caught: AuthorizationDeniedError | undefined;
    try {
      requirePermission({
        actorId: ACTOR,
        grants: districtAdmin,
        key: 'claim.approve',
        resource: resource({ value: 'Vaishali' }),
      });
    } catch (e) {
      caught = e as AuthorizationDeniedError;
    }
    expect(caught).toBeInstanceOf(AuthorizationDeniedError);
    expect(caught!.code).toBe(AUTHORIZATION_DENIED_CODE);
    expect(caught!.denial).toEqual({
      actorId: ACTOR,
      permissionKey: 'claim.approve',
      requiredScope: 'district',
      targetLocator: { dimension: 'district', value: 'Vaishali' },
    });
  });

  it('fires the audit seam on deny (FR-47 hook) with the denial value', () => {
    const fired: AuthorizationDenial[] = [];
    const ctx: Partial<AuthzContext> = { onAuthorizationDenied: (d) => fired.push(d) };
    expect(() =>
      requirePermission({ actorId: ACTOR, grants: [], key: 'claim.approve', resource: resource() }, ctx),
    ).toThrow(AuthorizationDeniedError);
    expect(fired).toHaveLength(1);
    expect(fired[0]?.permissionKey).toBe('claim.approve');
  });

  it('toErrorResponse maps the denial into the 403 ErrorResponse envelope shape', () => {
    const reqId = '33333333-3333-3333-3333-333333333333';
    let env;
    try {
      requirePermission({ actorId: ACTOR, grants: [], key: 'audit.export', resource: resource({ dimension: 'pariwar', value: PARIWAR_A }) });
    } catch (e) {
      env = (e as AuthorizationDeniedError).toErrorResponse(reqId);
    }
    expect(env).toEqual({
      error: {
        code: AUTHORIZATION_DENIED_CODE,
        message: expect.stringContaining('audit.export'),
        details: {
          actorId: ACTOR,
          permissionKey: 'audit.export',
          requiredScope: 'pariwar',
          targetLocator: { dimension: 'pariwar', value: PARIWAR_A },
        },
        request_id: reqId,
      },
    });
  });
});

describe('checkPermission — non-throwing result variant', () => {
  it('returns { ok: true } on allow', () => {
    const grants: EffectiveGrant[] = [
      { pariwarId: PARIWAR_A, role: 'super_admin', scopeDimension: 'global', scopeValue: null },
    ];
    expect(checkPermission({ actorId: ACTOR, grants, key: 'claim.approve', resource: resource() })).toEqual({
      ok: true,
    });
  });

  it('returns { ok: false, denial, error } on deny and fires the seam', () => {
    const fired: AuthorizationDenial[] = [];
    const result = checkPermission(
      { actorId: ACTOR, grants: [], key: 'claim.approve', resource: resource() },
      { onAuthorizationDenied: (d) => fired.push(d) },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(AuthorizationDeniedError);
      expect(result.denial.permissionKey).toBe('claim.approve');
    }
    expect(fired).toHaveLength(1);
  });
});

describe('Story 6.8 code review — claim.manage_nominee_bank / claim.correct_nominee_bank are independent keys', () => {
  // The tier-1 (route preHandler) and tier-2 (in-handler, claims.nominee-bank.handlers.ts
  // assertCorrectionAuthorized) checks must be genuinely separate hasPermission calls, not two
  // names for the same check — pin both directions with a `pariwar`-dimension resource (the
  // dimension the handler's checkPermission call actually uses).
  const pariwarResource = resource({ dimension: 'pariwar', value: PARIWAR_A });

  it('helpline_operator holds BOTH keys (preserves the pre-review claim.file-reuse capability)', () => {
    const grants: EffectiveGrant[] = [
      { pariwarId: PARIWAR_A, role: 'helpline_operator', scopeDimension: 'pariwar', scopeValue: PARIWAR_A },
    ];
    expect(hasPermission(grants, 'claim.manage_nominee_bank', pariwarResource)).toBe(true);
    expect(hasPermission(grants, 'claim.correct_nominee_bank', pariwarResource)).toBe(true);
  });

  it('a role holding an UNRELATED claim key (district_admin: conduct_ground_inspection) holds NEITHER nominee-bank key', () => {
    const grants: EffectiveGrant[] = [
      { pariwarId: PARIWAR_A, role: 'district_admin', scopeDimension: 'district', scopeValue: 'Patna' },
    ];
    expect(hasPermission(grants, 'claim.manage_nominee_bank', pariwarResource)).toBe(false);
    expect(hasPermission(grants, 'claim.correct_nominee_bank', pariwarResource)).toBe(false);
  });

  it('pariwar_admin holds the ESCALATION key (correct) but NOT the routine key (manage) — mirrors claim.override_ground_inspection not implying claim.conduct_ground_inspection', () => {
    const grants: EffectiveGrant[] = [
      { pariwarId: PARIWAR_A, role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: PARIWAR_A },
    ];
    expect(hasPermission(grants, 'claim.correct_nominee_bank', pariwarResource)).toBe(true);
    expect(hasPermission(grants, 'claim.manage_nominee_bank', pariwarResource)).toBe(false);
  });
});

// ── Story 6.9 code review — claim.file alone must NOT satisfy claim.manage_dpdpa_consent ─────
//
// No SEEDED role currently holds claim.file without ALSO holding claim.manage_dpdpa_consent
// (helpline_operator holds both), so the live-DB dpdpa-consent-helpline.spec.ts negative test can
// only demonstrate denial via an admin with NO relevant grants at all — it cannot isolate whether
// claim.file itself would be (wrongly) sufficient. This test closes that gap with a SYNTHETIC role
// bundle (hasPermission's `ctx.bundles` override, the same seam roles.ts's admin-edited-bundle
// support exists for) that holds ONLY claim.file, independent of what any seeded role happens to
// carry today — a permanent, catalog-independent proof that the two keys are checked separately.
describe('hasPermission — Story 6.9 code review: claim.file does not imply claim.manage_dpdpa_consent', () => {
  const pariwarResource = resource({ dimension: 'pariwar', value: PARIWAR_A });
  // `role`/`permissions` are branded/literal-union types not exported from the public rbac barrel
  // (by design — only the smart constructors in roles.ts/permissions.ts mint them). This cast
  // constructs a runtime-equivalent bundle shape purely to exercise `hasPermission`'s behavior; it
  // never touches the real seeded catalog.
  const claimFileOnlyCtx: Partial<AuthzContext> = {
    bundles: [
      { role: 'test_claim_file_only', permissions: ['claim.file'], scopeCeiling: 'pariwar' },
    ] as unknown as AuthzContext['bundles'],
  };

  it('a synthetic role holding ONLY claim.file is DENIED claim.manage_dpdpa_consent', () => {
    const grants: EffectiveGrant[] = [
      { pariwarId: PARIWAR_A, role: 'test_claim_file_only', scopeDimension: 'pariwar', scopeValue: PARIWAR_A },
    ];
    // Sanity: the synthetic bundle + grant resolution mechanics work (claim.file itself allows).
    expect(hasPermission(grants, 'claim.file', pariwarResource, claimFileOnlyCtx)).toBe(true);
    // The actual property under test: holding claim.file alone does NOT satisfy the dedicated
    // revocation key — the D5a permission split is a real, independently-enforced boundary, not
    // just two names that happen to always travel together on seeded roles.
    expect(hasPermission(grants, 'claim.manage_dpdpa_consent', pariwarResource, claimFileOnlyCtx)).toBe(false);
  });

  it('control: helpline_operator (holds BOTH keys on the real catalog) is allowed both', () => {
    const grants: EffectiveGrant[] = [
      { pariwarId: PARIWAR_A, role: 'helpline_operator', scopeDimension: 'pariwar', scopeValue: PARIWAR_A },
    ];
    expect(hasPermission(grants, 'claim.file', pariwarResource)).toBe(true);
    expect(hasPermission(grants, 'claim.manage_dpdpa_consent', pariwarResource)).toBe(true);
  });
});

// ── Story 10.3 — helpdesk.create is a pariwar-dimension gate; district ceiling CANNOT satisfy it ────
//
// The FIRST helpdesk key gates the operator call-to-ticket route at `dimension: 'pariwar'` (no
// server-derived district for a helpdesk ticket). This pins BOTH halves of the AC4 grant decision:
// (1) helpline_operator (the SM-1 C3 actor, `pariwar` ceiling) satisfies it; (2) a `district`-ceiling
// holder can NEVER satisfy the pariwar check — the reason district_admin is DEFERRED, not granted (an
// inert grant would read as a capability that does not exist). Uses a synthetic district-ceiling bundle
// carrying helpdesk.create so the proof is catalog-independent (no seeded role holds this shape).
describe('hasPermission — Story 10.3: helpdesk.create pariwar gate + district-ceiling deferral', () => {
  const pariwarResource = resource({ dimension: 'pariwar', value: PARIWAR_A });

  it('helpline_operator (pariwar ceiling) IS allowed helpdesk.create at the pariwar target', () => {
    const grants: EffectiveGrant[] = [
      { pariwarId: PARIWAR_A, role: 'helpline_operator', scopeDimension: 'pariwar', scopeValue: PARIWAR_A },
    ];
    expect(hasPermission(grants, 'helpdesk.create', pariwarResource)).toBe(true);
  });

  it('pariwar_admin IS allowed helpdesk.create at the pariwar target', () => {
    const grants: EffectiveGrant[] = [
      { pariwarId: PARIWAR_A, role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: PARIWAR_A },
    ];
    expect(hasPermission(grants, 'helpdesk.create', pariwarResource)).toBe(true);
  });

  it('RANK-ORDER PIN: a district-ceiling holder of helpdesk.create is DENIED the pariwar check (inert grant)', () => {
    // ── PIN 4/9 — Story 1.18 disposition: UNCHANGED, and it MUST stay unchanged. ─────────────────
    // ⛔ FAMILY A (rank order), not a resolver deferral. `scopeWithinCeiling('pariwar','district')`
    // reads CEILING_RANK and is a PURE NUMERIC COMPARE WITH NO RESOLVER PARAMETER AT ALL:
    // 1 >= 3 → false. `scopeContains` denies independently at scope.ts:232 for the same ordering
    // reason. Neither line consults a resolver, so Story 1.18's geo tree changes NOTHING here —
    // by design, not by omission. `rbac/scope.ts` §RANK-ORDER is the canonical explanation.
    // Story 10.3 minted `helpdesk.create` with a `pariwar` dimension; the 10.3 finding was that district_admin is DEFERRED because a district-ceiling grant cannot satisfy a pariwar-dimension check.
    // ⚠ IF THIS PIN EVER FLIPS TO ALLOW, THE RESOLVER HAS REACHED INTO FAMILY A. These four pins
    // are the tripwire for exactly that: a narrower grant must never satisfy a broader check.
    // A synthetic role with helpdesk.create at a `district` ceiling, granted at district scope — the
    // exact shape a district_admin grant would take. It is denied because the pariwar target is broader
    // than the district grant (scopeContains: target broader than grant → deny).
    const districtCeilingCtx: Partial<AuthzContext> = {
      bundles: [
        { role: 'test_helpdesk_district', permissions: ['helpdesk.create'], scopeCeiling: 'district' },
      ] as unknown as AuthzContext['bundles'],
    };
    const grants: EffectiveGrant[] = [
      { pariwarId: PARIWAR_A, role: 'test_helpdesk_district', scopeDimension: 'district', scopeValue: 'Patna' },
    ];
    expect(hasPermission(grants, 'helpdesk.create', pariwarResource, districtCeilingCtx)).toBe(false);
  });
});

// ── Story 10.4 — helpdesk.respond is a pariwar-dimension gate; district ceiling CANNOT satisfy it ───
//
// The SECOND helpdesk key gates the responder console at `dimension: 'pariwar'`. Same asymmetry as
// helpdesk.create: (1) a `pariwar`-ceiling default-routing-target role (finance_officer / it_cell)
// satisfies it; (2) a `district`-ceiling holder can NEVER satisfy the pariwar check — the reason
// district_admin is DEFERRED, not granted. Synthetic district-ceiling bundle so the proof is
// catalog-independent (a revert-sanity pair with the roles.test.ts holder assertion).
describe('hasPermission — Story 10.4: helpdesk.respond pariwar gate + district-ceiling deferral', () => {
  const pariwarResource = resource({ dimension: 'pariwar', value: PARIWAR_A });

  it('finance_officer (pariwar ceiling) IS allowed helpdesk.respond at the pariwar target', () => {
    const grants: EffectiveGrant[] = [
      { pariwarId: PARIWAR_A, role: 'finance_officer', scopeDimension: 'pariwar', scopeValue: PARIWAR_A },
    ];
    expect(hasPermission(grants, 'helpdesk.respond', pariwarResource)).toBe(true);
  });

  it('it_cell (pariwar ceiling) IS allowed helpdesk.respond at the pariwar target', () => {
    const grants: EffectiveGrant[] = [
      { pariwarId: PARIWAR_A, role: 'it_cell', scopeDimension: 'pariwar', scopeValue: PARIWAR_A },
    ];
    expect(hasPermission(grants, 'helpdesk.respond', pariwarResource)).toBe(true);
  });

  it('RANK-ORDER PIN: a district-ceiling holder of helpdesk.respond is DENIED the pariwar check (inert grant)', () => {
    // ── PIN 5/9 — Story 1.18 disposition: UNCHANGED, and it MUST stay unchanged. ─────────────────
    // ⛔ FAMILY A (rank order), not a resolver deferral. `scopeWithinCeiling('pariwar','district')`
    // reads CEILING_RANK and is a PURE NUMERIC COMPARE WITH NO RESOLVER PARAMETER AT ALL:
    // 1 >= 3 → false. `scopeContains` denies independently at scope.ts:232 for the same ordering
    // reason. Neither line consults a resolver, so Story 1.18's geo tree changes NOTHING here —
    // by design, not by omission. `rbac/scope.ts` §RANK-ORDER is the canonical explanation.
    // Same shape as pin 4, for the responder surface (Story 10.4).
    // ⚠ IF THIS PIN EVER FLIPS TO ALLOW, THE RESOLVER HAS REACHED INTO FAMILY A. These four pins
    // are the tripwire for exactly that: a narrower grant must never satisfy a broader check.
    const districtCeilingCtx: Partial<AuthzContext> = {
      bundles: [
        { role: 'test_helpdesk_respond_district', permissions: ['helpdesk.respond'], scopeCeiling: 'district' },
      ] as unknown as AuthzContext['bundles'],
    };
    const grants: EffectiveGrant[] = [
      { pariwarId: PARIWAR_A, role: 'test_helpdesk_respond_district', scopeDimension: 'district', scopeValue: 'Patna' },
    ];
    expect(hasPermission(grants, 'helpdesk.respond', pariwarResource, districtCeilingCtx)).toBe(false);
  });
});

// ── Story 10.5 — news.manage is a pariwar-dimension gate; district ceiling CANNOT satisfy it ────────
//
// The News/Blog admin key gates every admin news route at `dimension: 'pariwar'`. Same asymmetry as the
// helpdesk keys: (1) pariwar_admin (pariwar ceiling) satisfies it; (2) a `district`-ceiling holder can
// NEVER satisfy the pariwar check — the reason district_admin is DEFERRED, not granted. A revert-sanity
// pair with the roles.test.ts holder assertion (pariwar_admin granted; district_admin denied here).
describe('hasPermission — Story 10.5: news.manage pariwar gate + district-ceiling deferral', () => {
  const pariwarResource = resource({ dimension: 'pariwar', value: PARIWAR_A });

  it('pariwar_admin (pariwar ceiling) IS allowed news.manage at the pariwar target', () => {
    const grants: EffectiveGrant[] = [
      { pariwarId: PARIWAR_A, role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: PARIWAR_A },
    ];
    expect(hasPermission(grants, 'news.manage', pariwarResource)).toBe(true);
  });

  it('RANK-ORDER PIN: a district-ceiling holder of news.manage is DENIED the pariwar check (inert grant)', () => {
    // ── PIN 6/9 — Story 1.18 disposition: UNCHANGED, and it MUST stay unchanged. ─────────────────
    // ⛔ FAMILY A (rank order), not a resolver deferral. `scopeWithinCeiling('pariwar','district')`
    // reads CEILING_RANK and is a PURE NUMERIC COMPARE WITH NO RESOLVER PARAMETER AT ALL:
    // 1 >= 3 → false. `scopeContains` denies independently at scope.ts:232 for the same ordering
    // reason. Neither line consults a resolver, so Story 1.18's geo tree changes NOTHING here —
    // by design, not by omission. `rbac/scope.ts` §RANK-ORDER is the canonical explanation.
    // Same shape, for the News/Blog surface (Story 10.5).
    // ⚠ IF THIS PIN EVER FLIPS TO ALLOW, THE RESOLVER HAS REACHED INTO FAMILY A. These four pins
    // are the tripwire for exactly that: a narrower grant must never satisfy a broader check.
    const districtCeilingCtx: Partial<AuthzContext> = {
      bundles: [
        { role: 'test_news_manage_district', permissions: ['news.manage'], scopeCeiling: 'district' },
      ] as unknown as AuthzContext['bundles'],
    };
    const grants: EffectiveGrant[] = [
      { pariwarId: PARIWAR_A, role: 'test_news_manage_district', scopeDimension: 'district', scopeValue: 'Patna' },
    ];
    expect(hasPermission(grants, 'news.manage', pariwarResource, districtCeilingCtx)).toBe(false);
  });
});

// ── Story 10.9 — banner.manage is a pariwar-dimension gate; district ceiling CANNOT satisfy it ─────
//
// The Banner/Popup admin key gates every admin banner route at `dimension: 'pariwar'`. The same
// asymmetry as the helpdesk / news / feature-flag keys: (1) pariwar_admin (pariwar ceiling) satisfies
// it; (2) a `district`-ceiling holder can NEVER satisfy the pariwar check — which is exactly why
// district_admin is DEFERRED rather than granted (granting it would seed an inert capability that reads
// as authorised in the catalog and is silently denied at every call site). A revert-sanity pair with the
// roles.test.ts holder assertion (pariwar_admin granted there; district_admin denied here).
describe('hasPermission — Story 10.9: banner.manage pariwar gate + district-ceiling deferral', () => {
  const pariwarResource = resource({ dimension: 'pariwar', value: PARIWAR_A });

  it('pariwar_admin (pariwar ceiling) IS allowed banner.manage at the pariwar target', () => {
    const grants: EffectiveGrant[] = [
      { pariwarId: PARIWAR_A, role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: PARIWAR_A },
    ];
    expect(hasPermission(grants, 'banner.manage', pariwarResource)).toBe(true);
  });

  it('RANK-ORDER PIN: a district-ceiling holder of banner.manage is DENIED the pariwar check (inert grant)', () => {
    // ── PIN 7/9 — Story 1.18 disposition: UNCHANGED, and it MUST stay unchanged. ─────────────────
    // ⛔ FAMILY A (rank order), not a resolver deferral. `scopeWithinCeiling('pariwar','district')`
    // reads CEILING_RANK and is a PURE NUMERIC COMPARE WITH NO RESOLVER PARAMETER AT ALL:
    // 1 >= 3 → false. `scopeContains` denies independently at scope.ts:232 for the same ordering
    // reason. Neither line consults a resolver, so Story 1.18's geo tree changes NOTHING here —
    // by design, not by omission. `rbac/scope.ts` §RANK-ORDER is the canonical explanation.
    // Same shape, for the banner/popup surface (Story 10.9).
    // ⚠ IF THIS PIN EVER FLIPS TO ALLOW, THE RESOLVER HAS REACHED INTO FAMILY A. These four pins
    // are the tripwire for exactly that: a narrower grant must never satisfy a broader check.
    const districtCeilingCtx: Partial<AuthzContext> = {
      bundles: [
        { role: 'test_banner_manage_district', permissions: ['banner.manage'], scopeCeiling: 'district' },
      ] as unknown as AuthzContext['bundles'],
    };
    const grants: EffectiveGrant[] = [
      { pariwarId: PARIWAR_A, role: 'test_banner_manage_district', scopeDimension: 'district', scopeValue: 'Patna' },
    ];
    expect(hasPermission(grants, 'banner.manage', pariwarResource, districtCeilingCtx)).toBe(false);
  });

  it('an actor with NO banner.manage grant is fail-closed at the pariwar target', () => {
    const grants: EffectiveGrant[] = [
      { pariwarId: PARIWAR_A, role: 'auditor', scopeDimension: 'pariwar', scopeValue: PARIWAR_A },
    ];
    expect(hasPermission(grants, 'banner.manage', pariwarResource)).toBe(false);
  });
});

// ── Story 10.18 — member.moderate is a pariwar-dimension gate; the trustee_panel satisfies it ───────
//
// The moderation gate is the story's own subject. Three things are pinned here, and NONE of the four
// pins above is modified — D6 freezes them, and this is an ADDITION.
//
// ⚠ THE ASYMMETRY THIS FILE CANNOT SEE. These proofs use SYNTHETIC bundles so they are
// catalog-INDEPENDENT — deliberately, per the revert-sanity convention. That means the `verifier`
// deferral pin below holds whether or not `verifier` actually still holds `member.moderate`. It pins the
// SCOPE ALGEBRA, not the grant. The catalog-DEPENDENT half lives in `roles.test.ts` and is what fails if
// the grant is removed. Neither is sufficient alone; together they are a revert-sanity pair.
describe('hasPermission — Story 10.18: member.moderate pariwar gate + verifier inert-grant deferral', () => {
  const pariwarResource = resource({ dimension: 'pariwar', value: PARIWAR_A });

  it('trustee_panel (pariwar ceiling) IS allowed member.moderate at the pariwar target', () => {
    // The Niyamavali §8.7 body, seeded at a `pariwar` ceiling precisely so it satisfies this gate by
    // construction (Decision `2026-08-10-096`). This is the capability the whole story exists to express.
    const grants: EffectiveGrant[] = [
      { pariwarId: PARIWAR_A, role: 'trustee_panel', scopeDimension: 'pariwar', scopeValue: PARIWAR_A },
    ];
    expect(hasPermission(grants, 'member.moderate', pariwarResource)).toBe(true);
  });

  it('pariwar_admin RETAINS member.moderate — Panel authority is CONCURRENT, not exclusive', () => {
    // Decision `2026-08-10-096` clause 3 ruled Q3 concurrent. If this ever flips to `false`, someone has
    // read §8.7 as exclusive and removed a grant the Panel did not authorize removing.
    const grants: EffectiveGrant[] = [
      { pariwarId: PARIWAR_A, role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: PARIWAR_A },
    ];
    expect(hasPermission(grants, 'member.moderate', pariwarResource)).toBe(true);
  });

  it('DEFERRAL PIN: a district-ceiling holder of member.moderate is DENIED the pariwar check (inert grant)', () => {
    // The `verifier` shape, proven catalog-independently: `member.moderate` at a `district` ceiling,
    // granted at district scope. Denied because the pariwar target is broader than the district grant.
    // ⛔ RANK-ORDER BLOCKED (scope.ts §RANK-ORDER) — no geo-tree resolver lifts this.
    // ACCEPTANCE CONDITION: enable only if a moderation target gains a server-derived district AND the
    // gate moves to `dimension: 'district'` — never by widening the pariwar gate.
    const districtCeilingCtx: Partial<AuthzContext> = {
      bundles: [
        { role: 'test_member_moderate_district', permissions: ['member.moderate'], scopeCeiling: 'district' },
      ] as unknown as AuthzContext['bundles'],
    };
    const grants: EffectiveGrant[] = [
      {
        pariwarId: PARIWAR_A,
        role: 'test_member_moderate_district',
        scopeDimension: 'district',
        scopeValue: 'Patna',
      },
    ];
    expect(hasPermission(grants, 'member.moderate', pariwarResource, districtCeilingCtx)).toBe(false);
  });

  it('a state-ceiling holder of member.moderate is DENIED — the state_trustee case the story answers', () => {
    // `epics.md:3540` originally cast a State Trustee as the moderation actor. This pins WHY that could
    // never work and why the answer was a new pariwar-ceiling body rather than a resolver: `state` is
    // NARROWER than `pariwar` in the ceiling ordering (rank 2 vs 1), so the grant is asking to act above
    // its own ceiling. No org tree changes this.
    const stateCeilingCtx: Partial<AuthzContext> = {
      bundles: [
        { role: 'test_member_moderate_state', permissions: ['member.moderate'], scopeCeiling: 'state' },
      ] as unknown as AuthzContext['bundles'],
    };
    const grants: EffectiveGrant[] = [
      { pariwarId: PARIWAR_A, role: 'test_member_moderate_state', scopeDimension: 'state', scopeValue: 'Bihar' },
    ];
    expect(hasPermission(grants, 'member.moderate', pariwarResource, stateCeilingCtx)).toBe(false);
  });

  it('an actor with NO member.moderate grant is fail-closed at the pariwar target', () => {
    const grants: EffectiveGrant[] = [
      { pariwarId: PARIWAR_A, role: 'auditor', scopeDimension: 'pariwar', scopeValue: PARIWAR_A },
    ];
    expect(hasPermission(grants, 'member.moderate', pariwarResource)).toBe(false);
  });
});

// ── Story 13.1 (QE18, AC9) — the VERIFIED authorization result ───────────────────────────────────────

describe('Story 13.1 — authorizingGrant / authorize / VerifiedAuthorization (QE18)', () => {
  const G = {
    superA: { pariwarId: PARIWAR_A, role: 'super_admin', scopeDimension: 'global', scopeValue: null },
    pariwarA: { pariwarId: PARIWAR_A, role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: PARIWAR_A },
    pariwarBadValue: { pariwarId: PARIWAR_A, role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: PARIWAR_B },
    districtPatna: { pariwarId: PARIWAR_A, role: 'district_admin', scopeDimension: 'district', scopeValue: 'Patna' },
    districtGlobal: { pariwarId: PARIWAR_A, role: 'district_admin', scopeDimension: 'global', scopeValue: null },
    stateBihar: { pariwarId: PARIWAR_A, role: 'state_trustee', scopeDimension: 'state', scopeValue: 'Bihar' },
    blockOne: { pariwarId: PARIWAR_A, role: 'block_admin', scopeDimension: 'block', scopeValue: 'Block-1' },
    unknownRole: { pariwarId: PARIWAR_A, role: 'nonexistent_role', scopeDimension: 'district', scopeValue: 'Patna' },
    fieldWorkerSelf: { pariwarId: PARIWAR_A, role: 'field_worker', scopeDimension: 'self', scopeValue: ACTOR },
  } satisfies Record<string, EffectiveGrant>;

  // The existing matrix above, as (grants, key, resource, ctx) cases — allow AND deny paths.
  const MATRIX: readonly (readonly [string, EffectiveGrant[], string, ResourceLocator, Partial<AuthzContext>?])[] = [
    ['global cross-Pariwar', [G.superA], 'claim.approve', resource({ pariwarId: PARIWAR_B })],
    ['district exact node', [G.districtPatna], 'claim.approve', resource()],
    ['pariwar in-tenant geo', [G.pariwarA], 'member.suspend', resource({ value: 'AnyDistrict' })],
    ['state without resolver', [G.stateBihar], 'claim.approve', resource()],
    ['state with resolver', [G.stateBihar], 'claim.approve', resource(), { resolver: BIHAR_TREE }],
    ['unknown key', [G.districtPatna], 'claim.delete', resource()],
    ['malformed key', [G.districtPatna], 'not a key', resource()],
    ['no grant', [], 'claim.approve', resource()],
    ['cross-Pariwar', [G.districtPatna], 'claim.approve', resource({ pariwarId: PARIWAR_B })],
    ['exact-node mismatch', [G.districtPatna], 'claim.approve', resource({ value: 'Vaishali' })],
    ['unresolved locator', [G.districtPatna], 'claim.approve', resource({ value: null })],
    ['unresolved locator, global', [G.superA], 'claim.approve', resource({ value: null })],
    ['inconsistent Pariwar locator', [G.pariwarA], 'pariwar.amend_rule', resource({ dimension: 'pariwar', value: PARIWAR_B })],
    ['malformed grant scope', [G.pariwarBadValue], 'member.suspend', resource()],
    ['ceiling exceeded', [G.districtGlobal], 'claim.approve', resource({ pariwarId: PARIWAR_B })],
    ['unknown role', [G.unknownRole], 'claim.approve', resource()],
    ['role lacks key', [G.blockOne], 'claim.approve', resource({ dimension: 'block', value: 'Block-1' })],
    ['empty bundle', [G.fieldWorkerSelf], 'claim.approve', resource({ dimension: 'self', value: ACTOR })],
    ['field_worker.register — district own', [G.districtPatna], 'field_worker.register', resource()],
    ['field_worker.register — district other', [G.districtPatna], 'field_worker.register', resource({ value: 'Vaishali' })],
    ['field_worker.register — pariwar any', [G.pariwarA], 'field_worker.register', resource({ value: 'Gaya' })],
    ['field_worker.register — state with tree', [G.stateBihar], 'field_worker.register', resource(), { resolver: BIHAR_TREE }],
    ['mixed: deny then allow', [G.blockOne, G.unknownRole, G.districtPatna], 'claim.approve', resource()],
  ];

  it('hasPermission and authorize AGREE on every case (allowed ⇔ a result, denied ⇔ null)', () => {
    let allows = 0;
    for (const [name, grants, key, res, ctx] of MATRIX) {
      const allowed = hasPermission(grants, key, res, ctx);
      const result = authorize({ actorId: ACTOR, grants, key, resource: res }, ctx);
      expect(result !== null, name).toBe(allowed);
      expect(authorizingGrant(grants, key, res, ctx) !== null, name).toBe(allowed);
      if (allowed) allows += 1;
    }
    // Non-vacuity: the matrix carries both directions.
    expect(allows).toBeGreaterThanOrEqual(6);
    expect(MATRIX.length - allows).toBeGreaterThanOrEqual(12);
  });

  it('matchingGrantRole (re-pointed) and authorizingGrant(…)?.role AGREE on every case', () => {
    for (const [name, grants, key, res, ctx] of MATRIX) {
      expect(matchingGrantRole(grants, key, res, ctx), name).toBe(authorizingGrant(grants, key, res, ctx)?.role ?? null);
    }
  });

  it('two satisfying grants ⇒ the MORE SPECIFIC, whichever order they are loaded in', () => {
    const ctx = { resolver: BIHAR_TREE };
    const sets: EffectiveGrant[][] = [
      [G.superA, G.pariwarA, G.districtPatna],
      [G.districtPatna, G.pariwarA, G.superA],
      [G.pariwarA, G.superA, G.districtPatna],
    ];
    for (const grants of sets) {
      expect(authorize({ actorId: ACTOR, grants, key: 'field_worker.register', resource: resource() }, ctx)?.role).toBe('district_admin');
    }
    expect(authorize({ actorId: ACTOR, grants: [G.superA, G.pariwarA], key: 'field_worker.register', resource: resource() })?.role).toBe('pariwar_admin');
    expect(authorize({ actorId: ACTOR, grants: [G.pariwarA, G.superA], key: 'field_worker.register', resource: resource() })?.role).toBe('pariwar_admin');
  });

  it('a SAME-dimension tie is broken deterministically (role, scope value, grant id) — never by load order', () => {
    const a: EffectiveGrant = { ...G.pariwarA, grantId: 'aaaaaaaa-0000-4000-8000-000000000001' };
    const b: EffectiveGrant = { ...G.pariwarA, grantId: 'bbbbbbbb-0000-4000-8000-000000000002' };
    expect(authorizingGrant([a, b], 'field_worker.register', resource())?.grantId).toBe(a.grantId);
    expect(authorizingGrant([b, a], 'field_worker.register', resource())?.grantId).toBe(a.grantId);
  });

  it('the result is VERIFIED; an object literal with the same fields is NOT', () => {
    const result = authorize({ actorId: ACTOR, grants: [G.districtPatna], key: 'field_worker.register', resource: resource() });
    expect(result).not.toBeNull();
    expect(isVerifiedAuthorization(result)).toBe(true);
    const literal = JSON.parse(JSON.stringify(result)) as unknown;
    expect(literal).toEqual(result);
    expect(isVerifiedAuthorization(literal)).toBe(false);
    expect(isVerifiedAuthorization({ ...result! })).toBe(false);
    expect(isVerifiedAuthorization(null)).toBe(false);
    expect(isVerifiedAuthorization('field_worker.register')).toBe(false);
  });

  it('the result is DEEP-FROZEN: assigning to any field — of it, its grant or its target — throws in strict mode', () => {
    const result = authorize({ actorId: ACTOR, grants: [G.districtPatna], key: 'field_worker.register', resource: resource() })!;
    expect(Object.isFrozen(result) && Object.isFrozen(result.grant) && Object.isFrozen(result.target)).toBe(true);
    const r = result as unknown as Record<string, unknown> & { grant: Record<string, unknown>; target: Record<string, unknown> };
    expect(() => {
      r.role = 'pariwar_admin';
    }).toThrow(TypeError);
    expect(() => {
      r.grant.value = 'Vaishali';
    }).toThrow(TypeError);
    expect(() => {
      r.target.value = 'Vaishali';
    }).toThrow(TypeError);
    expect(result.role).toBe('district_admin');
  });

  it('carries the act: key, role, the RESOURCE Pariwar, the params actor, the grant tuple (+ grantId), the target, the catalog version', () => {
    const grant: EffectiveGrant = { ...G.districtPatna, grantId: 'cccccccc-0000-4000-8000-000000000003' };
    const result = authorize({ actorId: ACTOR, grants: [grant], key: 'field_worker.register', resource: resource() });
    expect(result).toEqual({
      permissionKey: 'field_worker.register',
      role: 'district_admin',
      pariwarId: PARIWAR_A,
      actorId: ACTOR,
      grant: { dimension: 'district', value: 'Patna', grantId: grant.grantId },
      target: { dimension: 'district', value: 'Patna' },
      catalogVersion: PERMISSION_CATALOG_VERSION,
    });
    // A test-built grant without an id ⇒ no grantId key at all.
    const bare = authorize({ actorId: ACTOR, grants: [G.districtPatna], key: 'field_worker.register', resource: resource() })!;
    expect('grantId' in bare.grant).toBe(false);
  });

  it('a GLOBAL grant: grant.value is null and pariwarId is the RESOURCE’s (⛔ the grant’s home Pariwar); a global GATE has target.value null', () => {
    const inB = authorize({ actorId: ACTOR, grants: [G.superA], key: 'field_worker.register', resource: resource({ pariwarId: PARIWAR_B }) })!;
    expect(inB.grant).toEqual({ dimension: 'global', value: null });
    expect(inB.pariwarId).toBe(PARIWAR_B);
    const globalGate = authorize({
      actorId: ACTOR,
      grants: [G.superA],
      key: 'questionnaire.publish',
      resource: { dimension: 'global', value: null, pariwarId: '00000000-0000-0000-0000-000000000000' },
    })!;
    expect(globalGate.target).toEqual({ dimension: 'global', value: null });
  });

  it('requirePermission RETURNS the verified result on allow (seam silent) and throws exactly as before on deny (seam fires)', () => {
    const denials: AuthorizationDenial[] = [];
    const ctx = { onAuthorizationDenied: (d: AuthorizationDenial) => denials.push(d) };
    const ok = requirePermission({ actorId: ACTOR, grants: [G.districtPatna], key: 'field_worker.register', resource: resource() }, ctx);
    expect(isVerifiedAuthorization(ok)).toBe(true);
    expect(ok.actorId).toBe(ACTOR);
    expect(denials).toEqual([]);
    expect(() =>
      requirePermission({ actorId: ACTOR, grants: [G.districtPatna], key: 'field_worker.register', resource: resource({ value: 'Vaishali' }) }, ctx),
    ).toThrow(AuthorizationDeniedError);
    expect(denials).toEqual([
      { actorId: ACTOR, permissionKey: 'field_worker.register', requiredScope: 'district', targetLocator: { dimension: 'district', value: 'Vaishali' } },
    ]);
  });

  it('checkPermission is UNCHANGED: { ok: true } exactly, no result attached', () => {
    expect(checkPermission({ actorId: ACTOR, grants: [G.districtPatna], key: 'field_worker.register', resource: resource() })).toEqual({ ok: true });
  });
});

// ── Story 13.1 (QE18 (e), AC9) — the source fence on `authorize(` callers ──────────────────────────────

/**
 * Review R7 / R2-3 — does this source REACH `authorize`? Read on the TypeScript AST, so a COMMENT or a string ("decrypt-AFTER-
 * authorize (…)") never matches. Not only a plain call (`authorize(…)`, `rbac.authorize(…)`): every STATICALLY VISIBLE way to hold a
 * REFERENCE to it that a call-only scan misses — an import specifier whose IMPORTED name is `authorize` (an alias included), an
 * export specifier (`export { authorize as mint } from …`), a `.authorize` property read that is not a call, element access with the
 * string, a destructured binding whose key is `authorize` (bare, a string literal or a computed literal), an ASSIGNMENT destructuring
 * with that key (`({ authorize: m } = rbac)` — review R3-26) and `Reflect.get` / `Object.getOwnPropertyDescriptor` with the LITERAL
 * name (R3-26). ⚠ What NO static fence can see: a DYNAMIC key (`rbac[k]`, `Reflect.get(rbac, name)`) — this fence is a drift guard
 * against an honest mistake, not a security boundary. `.astro` files are scanned as TS text (their frontmatter is TS).
 */
/** `node` with any wrapping parentheses removed. */
function unparen(node: ts.Expression): ts.Expression {
  let n = node;
  while (ts.isParenthesizedExpression(n)) n = n.expression;
  return n;
}

/** The text of a property name that is an identifier, a string literal or a computed literal — else null. */
function staticKeyOf(name: ts.PropertyName | ts.Identifier): string | null {
  const keyed = ts.isComputedPropertyName(name) ? name.expression : name;
  return ts.isIdentifier(keyed) || ts.isStringLiteralLike(keyed) ? keyed.text : null;
}

/** An object-literal ASSIGNMENT pattern (`({ … } = x)`), nested patterns included, that names `key`. */
function assignmentPatternNames(pattern: ts.Expression, key: string): boolean {
  const p = unparen(pattern);
  if (ts.isArrayLiteralExpression(p)) return p.elements.some((e) => assignmentPatternNames(e, key));
  if (!ts.isObjectLiteralExpression(p)) return false;
  return p.properties.some((prop) => {
    if (ts.isShorthandPropertyAssignment(prop)) return prop.name.text === key;
    if (ts.isPropertyAssignment(prop)) return staticKeyOf(prop.name) === key || assignmentPatternNames(prop.initializer, key);
    return false;
  });
}

/**
 * A LITERAL reflective read of `name`: `Reflect.get(x, 'name')`, `Reflect.getOwnPropertyDescriptor(x, 'name')`,
 * `Object.getOwnPropertyDescriptor(x, 'name')` — the `Reflect` / `Object` reached bare, through `globalThis` / `window` / `self`,
 * and the method by name or by a literal element access (`Reflect['get']`) — reviews R3-26 and R4-6.
 */
function isLiteralReflectiveRead(node: ts.Node, name: string): boolean {
  if (!ts.isCallExpression(node)) return false;
  const arg = node.arguments[1];
  if (arg === undefined || !ts.isStringLiteralLike(arg) || arg.text !== name) return false;
  const callee = unparen(node.expression);
  let method: string | null = null;
  let target: ts.Expression | null = null;
  if (ts.isPropertyAccessExpression(callee)) {
    method = callee.name.text;
    target = unparen(callee.expression);
  } else if (ts.isElementAccessExpression(callee) && ts.isStringLiteralLike(callee.argumentExpression)) {
    method = callee.argumentExpression.text;
    target = unparen(callee.expression);
  }
  if (method === null || target === null) return false;
  const holder = ts.isIdentifier(target)
    ? target.text
    : ts.isPropertyAccessExpression(target) && ts.isIdentifier(target.expression) && ['globalThis', 'window', 'self'].includes(target.expression.text)
      ? target.name.text
      : null;
  if (holder === 'Reflect') return method === 'get' || method === 'getOwnPropertyDescriptor';
  if (holder === 'Object') return method === 'getOwnPropertyDescriptor';
  return false;
}

/** An assignment destructuring that names `key`: `({ … } = x)`, and the for-of / for-in assignment form `for ({ … } of xs)` (R4-6). */
function assignmentDestructures(node: ts.Node, key: string): boolean {
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) return assignmentPatternNames(node.left, key);
  if ((ts.isForOfStatement(node) || ts.isForInStatement(node)) && !ts.isVariableDeclarationList(node.initializer)) {
    return assignmentPatternNames(node.initializer as ts.Expression, key);
  }
  return false;
}

function reachesAuthorize(fileName: string, text: string): boolean {
  if (!text.includes('authorize')) return false;
  const sf = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, fileName.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  let reached = false;
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'authorize') {
      reached = true; // authorize(…)
    } else if (ts.isPropertyAccessExpression(node) && node.name.text === 'authorize') {
      reached = true; // rbac.authorize(…), or the property read `const a = rbac.authorize`
    } else if (ts.isElementAccessExpression(node) && ts.isStringLiteralLike(node.argumentExpression) && node.argumentExpression.text === 'authorize') {
      reached = true; // rbac['authorize'](…)
    } else if (ts.isImportSpecifier(node) && ((node.propertyName ?? node.name) as ts.Identifier).text === 'authorize') {
      reached = true; // import { authorize } / import { authorize as mint }
    } else if (ts.isExportSpecifier(node) && ((node.propertyName ?? node.name) as ts.Identifier).text === 'authorize') {
      reached = true; // export { authorize } from … / export { authorize as mint } from …
    } else if (ts.isBindingElement(node)) {
      const key = node.propertyName ?? node.name;
      const keyed = ts.isComputedPropertyName(key) ? key.expression : key;
      // const { authorize } = rbac / { authorize: mint } / { 'authorize': mint } / { ['authorize']: mint }
      if ((ts.isIdentifier(keyed) || ts.isStringLiteralLike(keyed)) && keyed.text === 'authorize') reached = true;
    } else if (assignmentDestructures(node, 'authorize')) {
      reached = true; // ({ authorize: m } = rbac) / ({ 'authorize': m } = rbac) — R3-26; for ({ authorize: m } of [rbac]) — R4-6
    } else if (isLiteralReflectiveRead(node, 'authorize')) {
      reached = true; // Reflect.get / getOwnPropertyDescriptor with the literal — R3-26; via globalThis / Reflect['get'] — R4-6
    }
    if (!reached) ts.forEachChild(node, visit);
  };
  visit(sf);
  return reached;
}

describe('Review R7 / R2-3 — the fence recognises every STATICALLY visible way to reach `authorize`, and only those', () => {
  const file = 'apps/api/src/some/file.ts';
  it.each([
    ['a plain call', "import { authorize } from './check.js'; authorize({});"],
    // The call-expression branch ALONE (no import specifier, no binding to match first): a local function of that name.
    ['a bare call of a function named authorize that is not imported', 'function authorize(): void {} authorize();'],
    ['a RE-EXPORT under an alias', "export { authorize as mint } from './check.js';"],
    ['a plain re-export by name', "export { authorize } from './check.js';"],
    ['a destructuring key written as a STRING literal', "import { rbac } from '@twt/domain'; const { 'authorize': mint } = rbac; mint({});"],
    ['a destructuring key written as a COMPUTED literal', "import { rbac } from '@twt/domain'; const { ['authorize']: mint } = rbac; mint({});"],
    ['a namespace call', "import { rbac } from '@twt/domain'; rbac.authorize({});"],
    ['an ALIASED import', "import { authorize as mint } from './check.js'; mint({});"],
    ['a property read that is not a call', "import { rbac } from '@twt/domain'; const a = rbac.authorize; a({});"],
    ['element access with the string', "import { rbac } from '@twt/domain'; rbac['authorize']({});"],
    ['a destructured binding', "import { rbac } from '@twt/domain'; const { authorize } = rbac; authorize({});"],
    ['a RENAMED destructured binding', "import { rbac } from '@twt/domain'; const { authorize: mint } = rbac; mint({});"],
    // Review R3-26 — the two forms the R2-3 fence missed (replayed by two reviewers).
    ['an ASSIGNMENT destructuring with a renamed key', "import { rbac } from '@twt/domain'; let m; ({ authorize: m } = rbac); m({});"],
    ['an ASSIGNMENT destructuring with a STRING key', "import { rbac } from '@twt/domain'; let m; ({ 'authorize': m } = rbac); m({});"],
    ['a NESTED assignment destructuring', "import * as d from '@twt/domain'; let m; ({ rbac: { authorize: m } } = d); m({});"],
    ['Reflect.get with the LITERAL name', "import { rbac } from '@twt/domain'; const m = Reflect.get(rbac, 'authorize'); m({});"],
    ['Object.getOwnPropertyDescriptor with the LITERAL name', "import { rbac } from '@twt/domain'; const m = Object.getOwnPropertyDescriptor(rbac, 'authorize')!.value; m({});"],
    // Review R4-6 — four literal-key forms of the same kind.
    ['a for-of ASSIGNMENT destructuring', "import { rbac } from '@twt/domain'; let m; for ({ authorize: m } of [rbac]) m({});"],
    ['Reflect.get reached through globalThis', "import { rbac } from '@twt/domain'; const m = globalThis.Reflect.get(rbac, 'authorize'); m({});"],
    ["Reflect['get'] with the literal", "import { rbac } from '@twt/domain'; const m = Reflect['get'](rbac, 'authorize'); m({});"],
    ['Reflect.getOwnPropertyDescriptor with the literal', "import { rbac } from '@twt/domain'; const m = Reflect.getOwnPropertyDescriptor(rbac, 'authorize')!.value; m({});"],
  ])('flags %s', (_label, source) => {
    expect(reachesAuthorize(file, source)).toBe(true);
  });

  it.each([
    ['a comment', '// authorize( is called by check.ts only\nexport const x = 1;'],
    ['a string', "export const s = 'decrypt-AFTER-authorize (the gate)';"],
    ['a different identifier', 'export const authorized = true; export function authorizeLater(): void {}'],
    ['`export *` — a barrel names no reference (its USE sites are what the fence flags)', "export * from './check.js';"],
    ['a local variable that merely HAS the name, bound from ANOTHER key', 'const { a: authorize } = obj;'],
    ['an assignment destructuring of ANOTHER key into a variable of that name', 'let authorize; ({ a: authorize } = obj);'],
    ['Reflect.get of another literal', "const m = Reflect.get(rbac, 'authorized');"],
  ])('does not flag %s', (_label, source) => {
    expect(reachesAuthorize(file, source)).toBe(false);
  });

  // KNOWN blind spot, pinned so it is stated, not assumed: a dynamic key is invisible to any static scan.
  it('KNOWN BLIND SPOT — a dynamic key is NOT flagged (no static fence sees it; the fence is a drift guard, not a security boundary)', () => {
    expect(reachesAuthorize(file, "import { rbac } from '@twt/domain'; const k = ['auth', 'orize'].join(''); rbac[k]({});")).toBe(false);
  });
});

/** The trees both source fences walk (review R3-25: the ROOT `scripts/` and `tests/` too, not only the workspaces). */
const FENCE_ROOTS = ['apps', 'packages', 'scripts', 'tests'] as const;
/** Directories neither fence walks — dependencies and BUILD OUTPUT (a bundled copy of `check.ts` would be a false hit — review R4-11). */
const FENCE_SKIPPED_DIRS = new Set(['node_modules', 'dist', '.turbo', 'coverage', 'build', '.next', 'out']);

/**
 * Walk every source file of the fence trees (`.ts` … `.astro`, ⛔ `.d.ts`), calling `visit(rel, text)`. A root that is ABSENT (a sparse
 * checkout) is skipped, ⛔ an ENOENT (review R4-11); the per-root file counts are returned for the floors.
 */
function walkFenceTrees(repoRoot: string, visit: (rel: string, text: string) => void): Partial<Record<(typeof FENCE_ROOTS)[number], number>> {
  const scannedIn: Partial<Record<(typeof FENCE_ROOTS)[number], number>> = {};
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (FENCE_SKIPPED_DIRS.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx|mts|cts|js|mjs|cjs|astro)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
        const rel = path.relative(repoRoot, full);
        const top = rel.split(path.sep)[0] as (typeof FENCE_ROOTS)[number];
        scannedIn[top] = (scannedIn[top] ?? 0) + 1;
        visit(rel, fs.readFileSync(full, 'utf8'));
      }
    }
  };
  for (const r of FENCE_ROOTS) if (fs.existsSync(path.join(repoRoot, r))) walk(path.join(repoRoot, r));
  return scannedIn;
}

/**
 * Review R3-29 (BigDev 2026-11-04, R3-DN2 "1"), widened by R4-4 / R4-5 — how does this source TREAT `requirePermission`?
 * `requirePermission` is as pure as `authorize` and returns the same `VerifiedAuthorization`, so a caller with made-up grants could mint
 * one through it. Its long-standing callers call it as a GUARD and drop the result; only the rbac hook stores it.
 * `used` — the result is kept, or the function is reachable under ANOTHER name: a call whose value is kept (assigned, returned, passed,
 * spread, property-read, `await`ed into anything but a bare statement); a `.requirePermission` / `['requirePermission']` read that is not
 * a call; a bare `requirePermission` reference that is not a callee (`const g = requirePermission`, `.call` / `.apply` / `.bind`,
 * `(0, requirePermission)(p)`, `[x].map(requirePermission)`, `{ requirePermission }` passed on, `export default`); a RENAMING import or
 * re-export (`requirePermission as rp`); a renaming / string-keyed destructuring (declaration or assignment); a literal `Reflect.get`.
 * `discardedCalls` — the guard calls (a bare statement, `await …;`, `void …;`), counted in the AST so the floor sees real callers, ⛔
 * comments (R4-5). Not flagged: a plain import / re-export by the same name, a function declaration, a type query.
 * ⚠ Blind spot (as the `authorize` fence's): a DYNAMIC key.
 */
function analyseRequirePermission(fileName: string, text: string): { used: boolean; discardedCalls: number } {
  const NAME = 'requirePermission';
  if (!text.includes(NAME)) return { used: false, discardedCalls: 0 };
  const sf = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, fileName.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const isCallee = (n: ts.Node): boolean => (ts.isCallExpression(n.parent) || ts.isNewExpression(n.parent)) && n.parent.expression === n;
  const discarded = (call: ts.Node): boolean => {
    let n: ts.Node = call;
    while (ts.isParenthesizedExpression(n.parent) || ts.isAwaitExpression(n.parent) || ts.isVoidExpression(n.parent)) {
      if (ts.isVoidExpression(n.parent)) return true;
      n = n.parent;
    }
    return ts.isExpressionStatement(n.parent);
  };
  let used = false;
  let discardedCalls = 0;
  /** A reference (a property read, an element access, a bare identifier) — a discarded call counts, anything else is a USE. */
  const reference = (ref: ts.Node): void => {
    if (isCallee(ref) && ts.isCallExpression(ref.parent) && discarded(ref.parent)) discardedCalls += 1;
    else used = true;
  };
  const visit = (node: ts.Node): void => {
    if (ts.isPropertyAccessExpression(node) && node.name.text === NAME) {
      reference(node);
    } else if (ts.isElementAccessExpression(node) && ts.isStringLiteralLike(node.argumentExpression) && node.argumentExpression.text === NAME) {
      reference(node);
    } else if (ts.isIdentifier(node) && node.text === NAME) {
      const parent = node.parent;
      if (ts.isPropertyAccessExpression(parent) && parent.name === node) {
        // the `.requirePermission` NAME — handled at the property access
      } else if (ts.isImportSpecifier(parent) || ts.isExportSpecifier(parent)) {
        if (parent.propertyName !== undefined && parent.name.text !== NAME) used = true; // a RENAMING import / re-export
      } else if (ts.isFunctionDeclaration(parent) || ts.isTypeQueryNode(parent) || ts.isQualifiedName(parent)) {
        // its own declaration, or a type position
      } else if (ts.isBindingElement(parent)) {
        if (parent.propertyName !== undefined) used = true; // `{ requirePermission: m }` — a rename (the bound name is m)
      } else if (ts.isPropertyAssignment(parent) && parent.name === node) {
        // a property KEY of that name (`{ requirePermission: … }` as data) — its value is visited on its own
      } else {
        reference(node); // a callee (counted or a use), or ANY other use of the bare function
      }
    } else if (ts.isBindingElement(node) && node.propertyName !== undefined && ts.isStringLiteralLike(node.propertyName) && node.propertyName.text === NAME) {
      used = true; // const { 'requirePermission': m } = rbac
    } else if (assignmentDestructures(node, NAME) || isLiteralReflectiveRead(node, NAME)) {
      used = true;
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return { used, discardedCalls };
}

const usesRequirePermissionResult = (fileName: string, text: string): boolean => analyseRequirePermission(fileName, text).used;

describe('Review R3-29 / R4-4 — the fence recognises a USE of requirePermission’s result (or the function under another name), and only that', () => {
  const file = 'apps/api/src/some/file.ts';
  it.each([
    ['an assigned result', "import { rbac } from '@twt/domain'; const a = rbac.requirePermission(p);"],
    ['a returned result', "import { rbac } from '@twt/domain'; function f() { return rbac.requirePermission(p); }"],
    ['a result passed on', "import { rbac, fieldWorker } from '@twt/domain'; register(c, { authorization: rbac.requirePermission(p) });"],
    ['an awaited result kept', "import { requirePermission } from './check.js'; async function f() { const a = await requirePermission(p); }"],
    ['a bare-imported call whose result is kept', "import { requirePermission } from './check.js'; const a = requirePermission(p);"],
    ['a property read of the result', "import { rbac } from '@twt/domain'; const r = rbac.requirePermission(p).role;"],
    ['an alias of the function', "import { rbac } from '@twt/domain'; const f = rbac.requirePermission; f(p);"],
    // Review R4-4 — the forms the R3-29 fence missed (probed by three reviewers).
    ['a RENAMING import', "import { requirePermission as rp } from './check.js'; rp(p);"],
    ['a RENAMING re-export', "export { requirePermission as rp } from './check.js';"],
    ['export default', "import { requirePermission } from './check.js'; export default requirePermission;"],
    ['a bare-identifier alias', "import { requirePermission } from './check.js'; const g = requirePermission; g(p);"],
    ['.call', "import { requirePermission } from './check.js'; const a = requirePermission.call(undefined, p);"],
    ['.apply on the namespace member', "import { rbac } from '@twt/domain'; rbac.requirePermission.apply(undefined, [p]);"],
    ['.bind', "import { requirePermission } from './check.js'; const g = requirePermission.bind(null);"],
    ['a comma-expression call', "import { requirePermission } from './check.js'; const a = (0, requirePermission)(p);"],
    ['the function passed as a value', "import { requirePermission } from './check.js'; [p].map(requirePermission);"],
    ['a shorthand property passed on', "import { requirePermission } from './check.js'; run({ requirePermission }, p);"],
    ['element access with the literal, result kept', "import { rbac } from '@twt/domain'; const a = rbac['requirePermission'](p);"],
    ['Reflect.get with the literal', "import { rbac } from '@twt/domain'; const g = Reflect.get(rbac, 'requirePermission'); g(p);"],
    ['a renaming destructured binding', "import { rbac } from '@twt/domain'; const { requirePermission: m } = rbac; m(p);"],
    ['a string-keyed destructured binding', "import { rbac } from '@twt/domain'; const { 'requirePermission': m } = rbac; m(p);"],
    ['an ASSIGNMENT destructuring', "import { rbac } from '@twt/domain'; let m; ({ requirePermission: m } = rbac); m(p);"],
  ])('flags %s', (_label, source) => {
    expect(usesRequirePermissionResult(file, source)).toBe(true);
  });

  it.each([
    ['a bare call statement (the guard)', "import { rbac } from '@twt/domain'; rbac.requirePermission(p);"],
    ['a bare imported call statement', "import { requirePermission } from './check.js'; requirePermission(p);"],
    ['a bare await statement', "import { rbac } from '@twt/domain'; async function f() { await rbac.requirePermission(p); }"],
    ['a void statement', "import { rbac } from '@twt/domain'; void rbac.requirePermission(p);"],
    ['a multi-line bare call inside a block', "import { rbac } from '@twt/domain'; function g() { if (x) {\n rbac.requirePermission(\n p,\n ctx,\n );\n } }"],
    ['a bare element-access call statement', "import { rbac } from '@twt/domain'; rbac['requirePermission'](p);"],
    ['the hook factory (another name)', "import { requirePermissionHook } from './index.js'; const h = requirePermissionHook(deps, 'k');"],
    ['an import or a comment', "// const a = requirePermission(p)\nimport { requirePermission } from './check.js';"],
    ['a plain re-export by the same name', "export { requirePermission } from './check.js';"],
    ['a type query', "import { requirePermission } from './check.js'; type F = typeof requirePermission;"],
  ])('does not flag %s', (_label, source) => {
    expect(usesRequirePermissionResult(file, source)).toBe(false);
  });

  it('counts DISCARDED guard calls in the AST — a call, never a comment (review R4-5)', () => {
    expect(analyseRequirePermission(file, "import { rbac } from '@twt/domain'; rbac.requirePermission(p); requirePermission(q);").discardedCalls).toBe(2);
    expect(analyseRequirePermission(file, '/** the chain [session, scope, requirePermission(view)] has run */ export const x = 1;').discardedCalls).toBe(0);
  });
});

describe('Review R3-29 — requirePermission’s RESULT is used only by check.ts and the rbac hook (and test files)', () => {
  it('scans the same trees as the authorize fence; every other caller DROPS the result — and the scan SEES those callers, in the AST', () => {
    const repoRoot = path.resolve(__dirname, '../../../..');
    const hits: string[] = [];
    const guardCallers: string[] = [];
    const allowed = (f: string): boolean =>
      f === 'packages/domain/src/rbac/check.ts' || f === 'apps/api/src/modules/rbac/index.ts' || /\.(test|spec)\.tsx?$/.test(f);
    walkFenceTrees(repoRoot, (rel, text) => {
      const a = analyseRequirePermission(rel, text);
      if (a.used) hits.push(rel);
      if (a.discardedCalls > 0 && !allowed(rel)) guardCallers.push(rel);
    });
    expect(hits.filter((f) => !allowed(f))).toEqual([]);
    expect(hits).toContain('apps/api/src/modules/rbac/index.ts'); // the fence sees the one real keeper
    // Non-vacuity (review R4-5): the long-standing GUARD callers — FOUR at 2026-11-04, seen as discarded CALLS in the AST (three files
    // that only mention it in a comment no longer count) — are named, so losing sight of one turns this red.
    expect(guardCallers.sort()).toEqual(
      expect.arrayContaining([
        'apps/api/src/modules/member-moderation/handlers.ts',
        'apps/api/src/modules/rules/index.ts',
        'apps/api/src/modules/workplaces/routes.ts',
        'packages/validity-service/src/redaction.ts',
      ]),
    );
  });
});

describe('Story 13.1 — `authorize(` is called only by check.ts, the two field-worker test fixtures and test files', () => {
  it('scans apps/, packages/ and the ROOT scripts/ and tests/ trees; the only hits are the allowed files', () => {
    const repoRoot = path.resolve(__dirname, '../../../..');
    // Review R3-25 — the root `scripts/` (e.g. `provision-admin.ts`, run against production, imports the domain) and `tests/` too;
    // R4-11 — one shared walk: an absent root is skipped, build output is not walked.
    const hits: string[] = [];
    let scanned = 0;
    const scannedIn = walkFenceTrees(repoRoot, (rel, text) => {
      scanned += 1;
      if (reachesAuthorize(rel, text)) hits.push(rel);
    });
    expect(scannedIn.scripts, 'the walk reached the root scripts/ tree').toBeGreaterThan(20);
    // The root `tests/` holds only READMEs today (2026-11-04) — walked so the first spec placed there is scanned; no floor until then.
    const allowed = (f: string): boolean =>
      f === 'packages/domain/src/rbac/check.ts' ||
      f === 'apps/api/tests/integration/_field-worker-fixture.ts' ||
      // The DOMAIN twin of that fixture (a test-tree file, the same kind — named exactly, ⛔ a widened rule; Debug Log (c)).
      f === 'packages/domain/tests/integration/field-worker/_fixtures.ts' ||
      /\.(test|spec)\.tsx?$/.test(f);
    expect(scanned).toBeGreaterThan(1500); // non-vacuity: the walk reached the trees
    expect(hits.filter((f) => !allowed(f))).toEqual([]);
    expect(hits).toContain('packages/domain/src/rbac/check.ts'); // the fence sees the real caller
  });
});
