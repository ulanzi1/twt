// Fastify type augmentations + shared request-scoped types.
//
// Decorations:
//   - request.requestContext — the {traceId, actorId?, pariwarId?} mirror of the
//     AsyncLocalStorage store (request-context middleware, Task 1.3 / §3 L3891).
//   - request.scopeTx — the per-request scope-bound transaction (scope-resolution
//     middleware, Task 3): a pg client with `SET LOCAL app.pariwar_id` set inside
//     an open tx + a Drizzle handle bound to it. Present ONLY on `/p/:pariwarId/…`
//     routes that ran scope resolution.
//
// Session data (the @fastify/session `Session` interface) carries the admin auth
// state. The session id rotates on every auth-state change (§2.4) — `regenerate()`
// mints a new id; we bump `authStateVersion` so a stale parallel cookie is detectable.

import type pg from 'pg';

import type { Db, rbac } from '@twt/domain';

export interface RequestContext {
  /** Request correlation id (architecture §3.2) — generated at entry. */
  traceId: string;
  /** The authenticated admin's user id, once a session is established. */
  actorId?: string;
  /** The active Pariwar, once scope resolution ran (URL-path scope, §2.5). */
  pariwarId?: string;
}

/** The scope-bound transaction a `/p/:pariwarId/…` request runs its DB work in. */
export interface ScopeTx {
  /** The checked-out client with an OPEN tx + `SET LOCAL app.pariwar_id`. */
  client: pg.PoolClient;
  /** Drizzle handle bound to `client` (NOT the pool — so RLS scope applies). */
  tx: Db;
  /** The validated active Pariwar id. */
  pariwarId: string;
  /** True once `setPariwarScope` has run on `client` (W9-CR1.6 tx-active guard). */
  scopeSet: boolean;
}

declare module 'fastify' {
  interface FastifyRequest {
    requestContext: RequestContext;
    scopeTx?: ScopeTx;
    /** The actor's effective grants in the active Pariwar (loaded by scope-resolution). */
    scopeGrants?: readonly rbac.EffectiveGrant[];
    /** Story 1.18 — the active Pariwar's in-force GEO TREE, loaded ONCE by scope-resolution
     *  alongside `scopeGrants` and consumed SYNCHRONOUSLY by every downstream permission gate.
     *  ⭐ `null` means this Pariwar has published NO tree — a first-class answer, not a degraded
     *  one: the gate then passes NO resolver and `denyDeeperGeoResolver` applies, i.e. deeper geo
     *  containment denies exactly as it did before Story 1.18 existed.
     *  ⛔ `rbac.hasPermission` is a pure synchronous predicate, so this MUST be preloaded — never
     *  fetch a tree inside a permission check, and never make `contains` async (freeze row 9). */
    geoTree?: import('@twt/domain').geoTree.LoadedGeoTree | null;
    /** Story 6.7 — the ground-inspection assignment a row-sourced route resolved (set by the
     *  `resolveGroundInspectionAssignment` preHandler so `requirePermissionHook`'s district
     *  resolveValue can read the assignment's own district; the handler reuses it). */
    groundInspection?: import('@twt/domain').schema.ClaimGroundInspectionRow;
    /** Story 6.10 — the deceased member's server-derived latest posting district, resolved by the
     *  `resolveVerifierConsoleDistrict` preHandler so `requirePermissionHook`'s (synchronous) district
     *  resolveValue reads it (the client NEVER submits the authz district). `null` when the deceased has
     *  no resolvable posting district → the district gate fails closed (the D3a no-district exception). */
    verifierConsoleDistrict?: string | null;
    /** Story 6.11 — the deceased member's server-derived latest posting district, resolved by the
     *  `resolveDecisionDistrict` preHandler so `requirePermissionHook`'s (synchronous) district
     *  resolveValue reads it for the `claim.approve` gate (the client NEVER submits the authz
     *  district — the 6.10 pattern). `null` when the deceased has no resolvable posting district →
     *  the district gate fails closed (403). */
    decisionDistrict?: string | null;
  }

  // @fastify/session merges this `Session` interface into the session data object.
  interface Session {
    /** The authenticated admin (set on full login completion). */
    userId?: string;
    /** Absolute session expiry (epoch ms) — the §2.4 7-day hard cap (idle is the cookie). */
    absoluteExpiry?: number;
    /** Bumped on every auth-state change; rotation tripwire. */
    authStateVersion?: number;
    /** First factor passed, awaiting WebAuthn / recovery code (2nd factor). */
    pendingMfaUserId?: string;
    /** Step-up elevated-context expiry (epoch ms). Undefined = not elevated. */
    elevatedUntil?: number;
    /** The action_context the current elevation authorizes. */
    elevatedAction?: string;
    /** In-flight WebAuthn ceremony challenge (base64url). */
    webauthnChallenge?: string;
    /** Which ceremony the pending challenge belongs to. */
    webauthnChallengeKind?: 'registration' | 'authentication';
  }
}
