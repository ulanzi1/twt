// The emergency attesting panel's ELIGIBILITY predicate + its directory read — Story 10.13
// (Tasks 4/5; AC2/AC3). Transport-free.
//
// ── What this module exists to fix ────────────────────────────────────────────
// Story 7.5 shipped a complete fixed-amount schedule whose emergency path writes an IMMUTABLE
// Emergency Adjustment Record naming a "State-Trustee attesting panel". Every guard on that panel was
// ARITHMETIC — non-empty, >= 2, no duplicates (fixed-amount.ts) — and the one identity check was
// `getDisplayName(deps.pool, actorId)` -> `SELECT display_name FROM users WHERE id = $1` run on the
// UNSCOPED pool against a table documented GLOBAL, not pariwar-scoped (schema/users.ts). No tenant
// predicate, no role predicate, no grant predicate. ⇒ ANY admin of ANY Pariwar could be written onto
// THIS Pariwar's immutable attestation record. Every box in that chain was correct in isolation; the
// composition had no authorization in it.
//
// ── The predicate, as RULED ───────────────────────────────────────────────────
// Decision `2026-08-16-123` clause 2 (Story 10.13 routing note, Q2.1 option (a)) — KEY-AS-CREDENTIAL:
// an eligible emergency attestor is exactly "an actor holding `pool.fixed_amount_emergency` at this
// Pariwar", resolved from `role_grants` INSIDE the request's scope transaction and evaluated by the
// PURE `hasPermission` predicate over the seeded bundles.
//
// This is the THIRD instance of a pattern already in the tree, NOT a new one: `claim.r9_vote`
// (r9-voting-persist.ts) and `claim.appeal_vote` (appeal-panel-persist.ts) are each "ALSO the
// panel-membership eligibility credential", with the same load-grants-then-run-the-pure-predicate
// shape. ⚠ Per [[feedback_no_premature_package]] a third instance is where extraction becomes
// ARGUABLE — and arguable is not now. Shipped as the third instance; the two shipped call sites are
// NOT refactored. The extraction question is recorded in deferred-work.md.
//
// ── Why cross-tenant closes BY CONSTRUCTION ───────────────────────────────────
// `role_grants` is a SCOPED RLS table (policies/role-grants-rls.ts) and every caller is already inside
// a scope tx (`SET LOCAL app.pariwar_id`) because RLS is transaction-scoped. A grant held by an actor
// in a DIFFERENT Pariwar is therefore INVISIBLE to these queries — it folds to "no grants", which
// `hasPermission` refuses. The explicit `pariwar_id` predicate on the directory read is belt-and-braces
// on top of that (the `resolveShepherdCandidates` posture), never the only guard.
//
// ── What this module deliberately does NOT do ─────────────────────────────────
// ⛔ NO trustee_directory table, registry or new primitive. The eligibility predicate and the directory
//    read both already existed as patterns; this composes them (epics.md's explicit fence).
// ⛔ NO R9 voting lifecycle. fixed-amount.ts's header forbids it in terms (D3): the emergency path's
//    governance posture is EQUIVALENT to R9 (step-up + recorded attestation + auditability) and is
//    deliberately NOT its voting machinery. Nothing here imports from `claim/`.
// ⛔ NO change to POOL_FIXED_AMOUNT_MIN_PANEL_SIZE. Decision `2026-08-16-123` clauses 4-5 (Q3) — the
//    constant is a FLOOR and is NOT the Deed Clause 19(b) quorum. See its doc comment in fixed-amount.ts.
// ⛔ NO submitter-distinctness check. Q2.1 option (c) was OFFERED AND NOT TAKEN (Decision
//    `2026-08-16-123` clause 3), so a submitting trustee may still list THEMSELVES among the attestors
//    and count toward the >= 2 floor. Recorded as an open, un-owned observation with a re-trigger in
//    deferred-work.md — ⛔ do not "fix" it here without a Panel ruling; it is a ruled absence, not an
//    oversight.
//
// ⚠ ELIGIBILITY IS CAPABILITY, NEVER ASSENT. This module proves every listed attestor COULD have
// attested. Nothing anywhere proves any of them DID — only the SUBMITTING actor is authenticated and
// step-up gated. FR-15's "multi-trustee approval" therefore remains PARTIALLY implemented after this
// story (Decision `2026-08-16-123` clause 14). Do not let a green test here read as more than it is.
//
// ── Support-category-token-free ([[project_pool_primitive_substrate]]) ─────────
// Auto-scanned by the pool-support-category-invariant gate's recursive pool/ walk — this module carries
// NO hardcoded support-category string branches (it never inspects support_category at all).

import { and, asc, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import type pg from 'pg';

import type { Db } from '../db.js';
import type { PariwarId } from '../ids/index.js';
import { defaultRoleBundles, hasPermission, type EffectiveGrant } from '../rbac/index.js';
import { roleGrants } from '../schema/role_grants.js';
import { users } from '../schema/users.js';
import { PoolFixedAmountPanelMemberUnauthorizedError } from './errors.js';

/**
 * The permission key that IS the emergency attesting-panel membership credential (Decision
 * `2026-08-16-123` clause 2). ⚠ Held by `trustee_panel` AND `pariwar_admin` concurrently (clause 1) —
 * see the bundle note in rbac/roles.ts for why that concurrency is deliberate.
 */
export const POOL_FIXED_AMOUNT_EMERGENCY_PERMISSION_KEY = 'pool.fixed_amount_emergency';

/**
 * The roles whose SEEDED bundle carries the emergency key — derived at call time from
 * `defaultRoleBundles`, never a hardcoded role-name string.
 *
 * ⛔ THIS IS A PRE-FILTER, NOT THE PREDICATE. It exists only to bound the rows the directory read
 * pulls; the ACTUAL eligibility verdict is always the pure `hasPermission` call below, which alone
 * evaluates scope dimension, scope containment and the role's `scopeCeiling`. Pre-filtering here is
 * LOSSLESS because `hasPermission` can only allow via `bundle.permissions.includes(key)` (rbac/check.ts),
 * so an actor holding no grant with a key-carrying role can never be eligible.
 *
 * ⚠ Why not hardcode `eq(roleGrants.role, 'trustee_panel')` the way `resolveShepherdCandidates` hardcodes
 * `district_admin`? Because eligibility here is PERMISSION-KEY-DEFINED, not single-role-defined:
 * `role_grants.role` is plain `text` and stores ROLES, never permission keys, and TWO roles carry this
 * key today with more possible tomorrow. Copying that precedent's join/tenant/order SHAPE is correct;
 * copying its role-resolution SHORTCUT would silently drop a holder the moment a bundle changes.
 */
function rolesCarryingEmergencyKey(): string[] {
  return defaultRoleBundles
    .filter((b) => (b.permissions as readonly string[]).includes(POOL_FIXED_AMOUNT_EMERGENCY_PERMISSION_KEY))
    .map((b) => b.role);
}

/** Fold raw `role_grants` rows into the `EffectiveGrant[]` shape the pure predicate consumes, per actor. */
function groupGrantsByActor(
  rows: readonly {
    user_id: string;
    pariwar_id: string;
    role: string;
    scope_dimension: EffectiveGrant['scopeDimension'];
    scope_value: string | null;
  }[],
): Map<string, EffectiveGrant[]> {
  const byActor = new Map<string, EffectiveGrant[]>();
  for (const r of rows) {
    const list = byActor.get(r.user_id) ?? [];
    list.push({
      pariwarId: r.pariwar_id,
      role: r.role,
      scopeDimension: r.scope_dimension,
      scopeValue: r.scope_value,
    });
    byActor.set(r.user_id, list);
  }
  return byActor;
}

/**
 * ⭐ THE TEETH (AC3). Validate that EVERY submitted panel member holds
 * `pool.fixed_amount_emergency` @ this Pariwar. Loads each actor's grants from `role_grants` on the
 * SCOPED client (RLS returns only this Pariwar's grants — the same source as the route's own gate) and
 * runs the PURE `hasPermission` predicate over the seeded bundles, matching the route gate's
 * authorization semantics exactly. **Fail-closed on the FIRST unauthorized member.**
 *
 * Takes the raw `pg.PoolClient` rather than the Drizzle `Db` — `ScopeTx` exposes BOTH `client` and
 * `tx`, so no new plumbing is needed, and this is the `assertPanelAuthorized` shape verbatim.
 *
 * ⚠ MUST be called BEFORE the caller's per-member display resolution. An ineligible actor who ALSO has
 * no display name would otherwise report the wrong error (a 409 `AdminDisplayNameMissing` instead of
 * the eligibility refusal) and the audit line would record the wrong reason.
 *
 * ⚠ Evaluates against `defaultRoleBundles` (the `hasPermission` default), exactly as the two shipped
 * `assertPanelAuthorized` call sites do. A store that has EDITED a bundle at runtime (FR-44) is not
 * consulted here — consistent with the precedent, and noted rather than silently diverged.
 *
 * @throws PoolFixedAmountPanelMemberUnauthorizedError naming the FIRST ineligible actor.
 */
export async function assertFixedAmountPanelAuthorized(
  client: pg.PoolClient,
  pariwarId: PariwarId,
  panelActorIds: readonly string[],
): Promise<void> {
  if (panelActorIds.length === 0) return; // the empty-panel case is the caller's own typed guard.

  const res = await client.query<{
    user_id: string;
    pariwar_id: string;
    role: string;
    scope_dimension: EffectiveGrant['scopeDimension'];
    scope_value: string | null;
  }>(
    `SELECT user_id, pariwar_id, role, scope_dimension, scope_value FROM role_grants WHERE user_id = ANY($1)`,
    [[...panelActorIds]],
  );
  const grantsByActor = groupGrantsByActor(res.rows);

  for (const actorId of panelActorIds) {
    const grants = grantsByActor.get(actorId) ?? [];
    const ok = hasPermission(grants, POOL_FIXED_AMOUNT_EMERGENCY_PERMISSION_KEY, {
      dimension: 'pariwar',
      value: pariwarId,
      pariwarId,
    });
    if (!ok) throw new PoolFixedAmountPanelMemberUnauthorizedError(actorId);
  }
}

/** One eligible attestor, as offered to the trustee's picker. */
export interface FixedAmountEligibleAttestor {
  readonly actorId: string;
  readonly displayName: string;
}

/**
 * The eligible-attestor directory for a Pariwar (AC2) — the actors who may sit on an emergency
 * attesting panel, as `{ actorId, displayName }`, ordered deterministically by `actorId`.
 *
 * Query shape copied from `resolveShepherdCandidates` (the repo's only existing "who is eligible for
 * this role-bound duty" read): `role_grants` ⋈ `users`, an EXPLICIT `pariwar_id` predicate on top of
 * RLS, `users.status = 'active'`, non-blank `display_name`, deterministic ORDER BY, integer-literal
 * limit. ⛔ Its role-resolution MECHANISM is deliberately NOT copied — see `rolesCarryingEmergencyKey`.
 *
 * ⚠ A NULL/whitespace `display_name` EXCLUDES the actor from this directory even when they hold the
 * key. That is not a cosmetic filter: the attestation record's `actor_display` is the R5 controlled
 * staff attribution ([[project_admin_display_name_attribution]]) and the route resolves it fail-closed,
 * so surfacing such an actor as pickable would offer a choice guaranteed to 409. Excluding them here
 * means the picker never offers a trustee the system will refuse.
 * ⚠ Consequence, stated rather than hidden: this directory can be NARROWER than the set
 * {@link assertFixedAmountPanelAuthorized} accepts. That asymmetry is deliberate — the picker is
 * CONVENIENCE and the assertion is the BOUNDARY. A display-less key-holder submitted directly is
 * refused by the display resolution, not by the eligibility check, and reports that as its reason.
 */
export async function resolveEligibleFixedAmountAttestors(
  db: Db,
  pariwarId: PariwarId,
): Promise<FixedAmountEligibleAttestor[]> {
  const candidateRoles = rolesCarryingEmergencyKey();
  if (candidateRoles.length === 0) return []; // no seeded role carries the key ⇒ nobody is eligible.

  const rows = await db
    .select({
      actorId: users.id,
      displayName: users.displayName,
      role: roleGrants.role,
      grantPariwarId: roleGrants.pariwarId,
      scopeDimension: roleGrants.scopeDimension,
      scopeValue: roleGrants.scopeValue,
    })
    .from(roleGrants)
    .innerJoin(users, eq(users.id, roleGrants.userId))
    .where(
      and(
        eq(roleGrants.pariwarId, pariwarId), // explicit tenant predicate ON TOP of RLS (belt + braces)
        inArray(roleGrants.role, candidateRoles),
        eq(users.status, 'active'),
        isNotNull(users.displayName),
        sql`btrim(${users.displayName}) <> ''`,
      ),
    )
    .orderBy(asc(users.id))
    // Fixed bounded window, an INTEGER LITERAL — the domain-accessor-invariants forced-pagination
    // clamp gate accepts only a literal or a literal `clampLimit(...)`, and a named `const` (however
    // obviously constant) reads to its static scan as a dynamic limit. The `resolveShepherdCandidates`
    // `.limit(100)` form, deliberately. Bounds GRANT ROWS, not actors — one actor may hold several
    // key-carrying grants — so it is generous by design; a Pariwar with more key-carrying grant rows
    // than this is far outside any realistic trustee-body size.
    .limit(500);

  // The VERDICT is the pure predicate, never the SQL pre-filter: only `hasPermission` evaluates the
  // grant's scope dimension, its containment of the target, and the role's own scopeCeiling. A
  // `state`/`district`-ceiling holder appears in `rows` and is correctly refused HERE.
  const displayByActor = new Map<string, string>();
  const grantsByActor = new Map<string, EffectiveGrant[]>();
  for (const r of rows) {
    if (r.displayName === null) continue; // narrowing only — SQL already excluded these.
    displayByActor.set(r.actorId, r.displayName);
    const list = grantsByActor.get(r.actorId) ?? [];
    list.push({
      pariwarId: r.grantPariwarId,
      role: r.role,
      scopeDimension: r.scopeDimension,
      scopeValue: r.scopeValue,
    });
    grantsByActor.set(r.actorId, list);
  }

  const eligible: FixedAmountEligibleAttestor[] = [];
  for (const [actorId, grants] of grantsByActor) {
    const ok = hasPermission(grants, POOL_FIXED_AMOUNT_EMERGENCY_PERMISSION_KEY, {
      dimension: 'pariwar',
      value: pariwarId,
      pariwarId,
    });
    if (!ok) continue;
    const displayName = displayByActor.get(actorId);
    if (displayName === undefined) continue;
    eligible.push({ actorId, displayName });
  }
  // Deterministic, replayable order (no Math.random, no insertion-order dependence).
  eligible.sort((a, b) => (a.actorId < b.actorId ? -1 : a.actorId > b.actorId ? 1 : 0));
  return eligible;
}
