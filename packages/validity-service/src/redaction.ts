// Scope-keyed field redaction at the service boundary — Story 4.6 (Task 5; AC1, confirmed D5).
//
// The service assembles the FULL, redaction-FREE canonical payload (payload.ts), then this applies a
// scope-keyed redaction keyed by the caller's grants so EVERY consumer (apps/admin, apps/mobile,
// Epic 6/10) inherits IDENTICAL redaction (D5-A — the canonical service owns its own scope contract,
// not each app). Two gates:
//
//   1. READ access (AC1 scope-respecting): a non-self caller must hold `member.view_validity` at a
//      scope covering the member (Story 1.8 `hasPermission`); the member's own-profile self-call is
//      allowed via the `self` dimension. `assertCanReadValidity` throws `AuthorizationDeniedError`
//      (fail-closed) on deny.
//   2. FIELD redaction (State-Trustee-only): `pendingConcealmentFlag` + the internal
//      `concealment_review_required` special flag are visible ONLY to a State-Trustee-scope (or global
//      super-admin) caller — reusing the ROLE/SCOPE grant model, NOT a second permission key (D5: a
//      per-field key would be the "manufacture keys for endpoints that don't exist" anti-pattern).
//      Member-self + any narrower admin caller sees the payload with the flag forced `false` + the
//      internal flag stripped. FAIL-CLOSED: any uncertain scope → redact.
//
// The `validityPayloadHash` is UNCHANGED by redaction (it is over the full pre-redaction payload), so a
// redacted payload still carries the canonical hash for replay/audit correlation (AC2).

import { CONCEALMENT_REVIEW_FLAG } from '@twt/niyamavali-engine';
import { rbac } from '@twt/domain';

import type { MemberValidityPayload, RedactedMemberValidityPayload } from './types.js';

/** The special flags visible ONLY to a State-Trustee-scope caller (PRD FR-12A). */
const STATE_TRUSTEE_ONLY_FLAGS: ReadonlySet<string> = new Set([CONCEALMENT_REVIEW_FLAG]);

/** The `member.view_validity` permission key (D5 — the confirmed new read key; catalog v3). */
export const MEMBER_VIEW_VALIDITY_KEY = 'member.view_validity';

/** Roles whose grant covering the member unlocks the State-Trustee-scope concealment fields. */
const CONCEALMENT_VISIBLE_ROLES: ReadonlySet<string> = new Set(['state_trustee', 'super_admin']);

/** The caller context for a validity read (grants loaded by the app layer; Story 1.9 HTTP adapter). */
export interface ValidityCaller {
  /** The acting subject id (echoed into a denial + the admin audit line). */
  actorId: string;
  /** The caller's effective grants (loaded from `role_grants`). */
  grants: readonly rbac.EffectiveGrant[];
  /** The resource locator addressing THIS member (dimension + value + active pariwarId). */
  resource: rbac.ResourceLocator;
  /** True when this is the member's OWN-profile self-call (own payload minus internal flags; NOT audited). */
  isSelf: boolean;
  /** Optional AuthzContext (admin-edited bundles + geo resolver); defaults to the seeded defaults. */
  authz?: Partial<rbac.AuthzContext>;
}

/**
 * Enforce READ access (AC1 scope-respecting). A self-call is permitted ONLY when the resource
 * locator independently confirms it — `resource.dimension === 'self'` AND `resource.value` (the
 * `self`-target owner id) matches `caller.actorId` — mirroring the `self`-grant match `scopeContains`
 * already performs (`scope.ts`: "a `self` grant covers ONLY a `self` target whose owner value matches
 * the grant's value"). This independently verifies `isSelf` rather than trusting the flag verbatim, so
 * a mis-constructed `ValidityCaller` (e.g. a bug in the future HTTP adapter) cannot bypass the gate by
 * asserting `isSelf: true` for someone else's member id. A non-self (or unverified-self) caller must
 * hold `member.view_validity` at a scope covering the member — `requirePermission` throws
 * `AuthorizationDeniedError` (fail-closed) + fires the FR-47 audit seam on deny.
 */
export function assertCanReadValidity(caller: ValidityCaller): void {
  if (caller.isSelf && caller.resource.dimension === 'self' && caller.resource.value === caller.actorId) {
    return;
  }
  rbac.requirePermission(
    {
      actorId: caller.actorId,
      grants: caller.grants,
      key: MEMBER_VIEW_VALIDITY_KEY,
      resource: caller.resource,
    },
    caller.authz,
  );
}

/**
 * Does the caller hold a State-Trustee-scope (or global super-admin) grant covering the member? Reuses
 * the domain's vetted `scopeContains` (+ the injected geo resolver) over each qualifying grant. PURE +
 * FAIL-CLOSED: a self-call, a malformed grant, or an unresolved locator → `false` (redact).
 */
export function canSeeConcealment(caller: ValidityCaller): boolean {
  if (caller.isSelf) return false;
  const resolver = caller.authz?.resolver ?? rbac.denyDeeperGeoResolver;
  const target = { dimension: caller.resource.dimension, value: caller.resource.value };
  for (const grant of caller.grants) {
    if (!CONCEALMENT_VISIBLE_ROLES.has(grant.role)) continue;
    // Active-Pariwar filter (mirror hasPermission): a non-global grant only applies in its own Pariwar.
    if (grant.scopeDimension !== 'global' && grant.pariwarId !== caller.resource.pariwarId) continue;
    if (
      rbac.scopeContains(
        { dimension: grant.scopeDimension, value: grant.scopeValue },
        target,
        resolver,
      )
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Apply the scope-keyed field redaction over the FULL payload. When the caller is NOT State-Trustee-
 * scoped: force `pendingConcealmentFlag = false` and strip the State-Trustee-only special flags. The
 * hash is left intact (it is the canonical full-payload hash). PURE (no I/O) — the read-access check
 * (`assertCanReadValidity`) is a SEPARATE gate the service calls first.
 */
export function redactForCaller(
  payload: MemberValidityPayload,
  caller: ValidityCaller,
): RedactedMemberValidityPayload {
  if (canSeeConcealment(caller)) return payload;
  return {
    ...payload,
    medicalDisclosureFlags: {
      ...payload.medicalDisclosureFlags,
      pendingConcealmentFlag: false,
    },
    specialFlags: payload.specialFlags.filter((f) => !STATE_TRUSTEE_ONLY_FLAGS.has(f)),
  };
}
