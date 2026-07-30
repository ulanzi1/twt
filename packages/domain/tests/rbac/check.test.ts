// Fail-closed enforcement unit tests — Story 1.8 (AC-4 + AC-5, Task 7.1a).
//
// THE TRIPWIRE. Default-deny on every uncertain path: unknown key, no grant,
// unknown role, role-lacks-key, cross-Pariwar scope, exact-node mismatch,
// unresolved locator, missing geo-resolver. Every "allow" is explicit. Also covers
// the guard's structured 403 denial + the injectable audit seam (the seam fires on
// deny, never on allow; the actual FR-47 sink is Story 1.10).

import { describe, expect, it } from 'vitest';

import {
  AUTHORIZATION_DENIED_CODE,
  AuthorizationDeniedError,
  type AuthorizationDenial,
} from '../../src/errors.js';
import {
  checkPermission,
  hasPermission,
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
    const grants: EffectiveGrant[] = [
      { pariwarId: PARIWAR_A, role: 'state_trustee', scopeDimension: 'state', scopeValue: 'Bihar' },
    ];
    // Without a resolver → fail-closed deny.
    expect(hasPermission(grants, 'claim.approve', resource())).toBe(false);
    // With the Epic-3 geo tree injected → allow.
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

  it('D1 DEFERRAL PIN: a BLOCK-scoped grant can NEVER satisfy a district-dimension check', () => {
    // This is WHY block_admin is not granted claim.conduct_ground_inspection in v1 (roles.ts D1
    // reconciliation). block_admin holds member.suspend at block scope; even so, that block grant
    // cannot authorize a district-dimension target — the district target is BROADER than a block
    // grant (scope.ts: tRank < gRank → deny), and no geo-tree resolver maps block→parent-district
    // yet. Granting the conduct key to block_admin would therefore be inert under the district gate.
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

  it('DEFERRAL PIN: a district-ceiling holder of helpdesk.create is DENIED the pariwar check (inert grant)', () => {
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

  it('DEFERRAL PIN: a district-ceiling holder of helpdesk.respond is DENIED the pariwar check (inert grant)', () => {
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

  it('DEFERRAL PIN: a district-ceiling holder of news.manage is DENIED the pariwar check (inert grant)', () => {
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
