// packages/contracts/src/degraded-mode/declarations.ts
//
// Per-Pariwar degraded-mode declaration transport DTOs — Story 5.8 (Task 4; AC4). The request/response
// shapes for the trustee declare/revoke/read endpoints (admin-session + `pariwar.declare_degraded_mode`-
// gated):
//   · POST /api/v1/p/{pariwarId}/admin/degraded-mode/declarations            — declare degraded mode.
//   · POST /api/v1/p/{pariwarId}/admin/degraded-mode/declarations/{id}/revoke — manual revocation.
//   · GET  /api/v1/p/{pariwarId}/admin/degraded-mode/active                  — the active declaration | null.
//
// ── Contracts discipline ──────────────────────────────────────────────────────────────────────────────
// A contracts SOURCE file MUST NOT import `@twt/domain` (the browser-bundle rule). Plain `z` only. ALL
// objects `.strict()`. HTTP endpoints → these DO register in openapi/v1.yaml. Timestamps are Iso8601
// strings (apps/api serializes `Date` at the boundary).

import { z } from 'zod';

import { Iso8601Datetime } from '../_common/primitives.js';

/** The degraded-mode modes (value-aligned with the DB CHECK). v1 = cycle-open SMS bridge only, extensible. */
export const DegradedMode = z.enum(['cycle_open_sms_bridge']);
export type DegradedMode = z.output<typeof DegradedMode>;

/**
 * Clock-skew tolerance for the NO-BACKDATING refine (AC4 #8). A declared `effectiveFrom` at (or after) now
 * is accepted; a value more than this grace BEFORE now is rejected as backdating (backdating could
 * retroactively auto-revoke a currently-active declaration and leave the Pariwar with zero coverage). The
 * grace absorbs request latency + client/server clock skew without opening a real backdating window.
 */
export const NO_BACKDATE_GRACE_MS = 5 * 60 * 1000;

/**
 * POST declare degraded mode. `mode` is the single v1 enum. `effectiveFrom` is OPTIONAL (defaults to now
 * server-side) and — when supplied — is refined to reject backdated values (NO BACKDATING, AC4 #8).
 * `expiresAt` is OPTIONAL + nullable (null / omitted ⇒ open-ended until manual revocation). `reason` is a
 * non-empty bounded justification.
 */
export const DegradedModeDeclareRequest = z
  .object({
    mode: DegradedMode,
    effectiveFrom: Iso8601Datetime.refine(
      (v) => new Date(v).getTime() >= Date.now() - NO_BACKDATE_GRACE_MS,
      { message: 'effectiveFrom cannot be backdated (NO BACKDATING)' },
    ).optional(),
    expiresAt: Iso8601Datetime.nullable().optional(),
    reason: z.string().trim().min(1).max(2000),
  })
  .strict()
  .refine(
    (v) => {
      if (!v.expiresAt) return true;
      const effectiveFromMs = v.effectiveFrom ? new Date(v.effectiveFrom).getTime() : Date.now();
      return new Date(v.expiresAt).getTime() > effectiveFromMs;
    },
    // A dead-on-arrival window (expiresAt <= effectiveFrom) would still auto-revoke whatever declaration was
    // genuinely active before inserting an already-expired row, silently stripping the Pariwar of coverage
    // (Review Finding). Reject it at the boundary instead.
    { message: 'expiresAt must be after effectiveFrom', path: ['expiresAt'] },
  );
export type DegradedModeDeclareRequest = z.output<typeof DegradedModeDeclareRequest>;

/**
 * The declaration DTO (the response element). `revokedAt` non-null ⇒ the declaration was manually revoked
 * (or auto-revoked by a superseding declare). `declaredByActor` is an actor UUID or null (system/seed).
 * Timestamps are Iso8601 strings.
 */
export const DegradedModeDeclarationResponse = z
  .object({
    id: z.string().uuid(),
    mode: DegradedMode,
    effectiveFrom: Iso8601Datetime,
    expiresAt: Iso8601Datetime.nullable(),
    revokedAt: Iso8601Datetime.nullable(),
    declaredByActor: z.string().uuid().nullable(),
    reason: z.string(),
  })
  .strict();
export type DegradedModeDeclarationResponse = z.output<typeof DegradedModeDeclarationResponse>;

/** GET the currently-active declaration, or null when none is active (the banner read). */
export const DegradedModeActiveResponse = z
  .object({
    active: DegradedModeDeclarationResponse.nullable(),
  })
  .strict();
export type DegradedModeActiveResponse = z.output<typeof DegradedModeActiveResponse>;
