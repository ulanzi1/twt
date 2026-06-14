// packages/contracts/src/auth/session.ts
//
// Session-introspection wire shape (Story 1.11b, DD-6). GET /api/v1/auth/session
// returns the authenticated admin's id + the permission keys they hold at the
// GLOBAL ("national") scope ceiling — the minimal read every admin SPA surface
// needs to decide which nav entries + routes to show.
//
// ── Why a dedicated read (the session itself is permission-free) ───────────────
// The @fastify/session row carries only `userId` (apps/api/src/types.ts), and
// LoginResponse carries no roles (login.ts) — the SPA has no other way to learn an
// actor's grants. The full per-tenant RBAC loader (modules/rbac) needs a request
// `scopeTx` that a GLOBAL surface (no `/:pariwarId/`) cannot produce, so this
// endpoint computes the GLOBAL-scope grant union directly from `role_grants`.
//
// ── `nationalGrants` is a plain string[] (not the PermissionKey enum) ──────────
// Deliberately kept as `string[]` (matching the AuditIntegrityCheckResult
// `verifierActor`/`triggerSource` precedent): the permission catalog grows
// per-epic, so coupling this wire contract to the enum would make an additive
// catalog change a breaking contract change. The SPA only needs
// `nationalGrants.includes('audit.verify')`. "national" === `scope_dimension =
// 'global'` in the codebase (ADR-0008 reconciled the epics' "national" vocabulary
// to the canonical `global`); see packages/domain/src/rbac/scope.ts.
//
// The UI gate is ADVISORY — the server still enforces `requireAdminSession` on
// every endpoint; the endpoint-side `audit.verify` RBAC upgrade stays deferred
// (D4-1.11a) until a global-scope `requirePermission` preHandler exists.

import { z } from 'zod';

import { UuidString } from '../_common/primitives.js';

export const SessionResponse = z
  .object({
    /** The authenticated admin's user id. */
    userId: UuidString,
    /**
     * The union of permission keys the actor holds across all `role_grants`
     * rows at `scope_dimension = 'global'` (the national-scope ceiling). Empty
     * when the actor holds no global-scope grant. The SPA gates nav + routes on
     * membership (e.g. `audit.verify`).
     */
    nationalGrants: z.array(z.string()),
  })
  .strict();
export type SessionResponse = z.output<typeof SessionResponse>;
