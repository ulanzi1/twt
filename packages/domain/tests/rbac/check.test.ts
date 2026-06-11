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
