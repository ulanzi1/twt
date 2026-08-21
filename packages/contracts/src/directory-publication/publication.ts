// packages/contracts/src/directory-publication/publication.ts
//
// Per-Pariwar directory-publication KILL-SWITCH transport DTOs — Story 10.30 (Task 2; AC1). The
// request/response shapes for the admin read/write endpoints (admin-session +
// `pariwar.manage_directory_publication`-gated, super_admin ONLY):
//   · GET /api/v1/p/{pariwarId}/admin/directory-publication/status — the current state.
//   · PUT /api/v1/p/{pariwarId}/admin/directory-publication/status — the governed flip.
//
// Governance of record: Decision `2026-08-21-148` (this story) over `2026-08-21-146` cl.5 (the UI
// directive) and `2026-08-21-147` cl.1/cl.2 (the launch gate + Epic 10 ownership).
//
// ⚠ THE MECHANISM IS NOT DEFINED HERE. `packages/domain/src/member/directory-publication.ts` owns
// every rule (rationale, audit anchor, actor/display consistency, the grant check). These shapes are
// the WIRE ONLY. ⛔ Do not re-implement a domain rule in a `.refine()`.
//
// ── Contracts discipline ──────────────────────────────────────────────────────────────────────────
// A contracts SOURCE file MUST NOT import `@twt/domain` (the browser-bundle rule). Plain `z` only.
// ALL objects `.strict()`. HTTP endpoints → these DO register in openapi/v1.yaml. Timestamps are
// Iso8601 strings (apps/api serializes `Date` at the boundary).

import { z } from 'zod';

import { Iso8601Datetime } from '../_common/primitives.js';

/**
 * The current per-Pariwar directory-publication state.
 *
 * ⭐ `configured` is LOAD-BEARING and ⛔ is not inferrable from the other fields. An unconfigured
 * Pariwar (no row was ever written) and a Pariwar somebody deliberately RE-ENABLED both report
 * `enabled: true` — they are different facts and the operator is shown WHICH ONE they are looking
 * at. ⛔ Absence must never be signalled only by all-null attribution fields.
 *
 * ⚠ The default is `enabled: true, configured: false`, mirroring
 * `resolveDirectoryPublicationEnabled`'s own asymmetry: an absent row means "this Pariwar has not
 * been individually disabled", ⛔ not "shielded".
 */
export const DirectoryPublicationStatusResponse = z
  .object({
    /** Whether the Pariwar's directory is currently published. Absent row ⇒ `true`. */
    enabled: z.boolean(),
    /** Whether a config row exists at all. `false` ⇒ never individually configured. */
    configured: z.boolean(),
    /** The last-changing admin's `users.display_name`, SNAPSHOT at write time. Null when unconfigured. */
    changedByDisplay: z.string().nullable(),
    /** WHY it was last changed. Null when unconfigured. */
    rationale: z.string().nullable(),
    /** When it was last changed. Null when unconfigured. */
    updatedAt: Iso8601Datetime.nullable(),
  })
  .strict();
export type DirectoryPublicationStatusResponse = z.output<typeof DirectoryPublicationStatusResponse>;

/**
 * PUT the Pariwar's directory-publication state. Moves in BOTH directions — a disabled directory may
 * be re-enabled under the same authority (`setDirectoryPublicationEnabled`'s own guarantee).
 *
 * ⭐ `rationale` is `.trim().min(1)` — ⛔ THIS is the rejection boundary, and it must stay here.
 * `UngovernedDirectoryPublicationChangeError` `extends Error` (⛔ not `ApiError`) and is NOT
 * registered in `apps/api/src/middleware/error-mapping/index.ts`, whose documented default is
 * "Anything else → 500 `internal.error`". ⇒ if a whitespace rationale ever reaches the domain
 * throw, an operator sees an opaque 500 on what is a plain input error. The domain check is the
 * BACKSTOP; this contract is the boundary a caller actually hits, with a `400`.
 *
 * ⛔ THERE IS DELIBERATELY NO `changedByDisplay` FIELD. The acting admin's display name is resolved
 * SERVER-SIDE from `users.display_name` (`getDisplayName`, fail-closed) and is never accepted from
 * the caller — a client-supplied display name would let an operator's browser lie about who made
 * the change, defeating the accountability `2026-08-21-146` cl.4/5 requires. `.strict()` makes the
 * field UNREPRESENTABLE on the wire rather than merely unused.
 */
export const SetDirectoryPublicationRequest = z
  .object({
    enabled: z.boolean(),
    rationale: z.string().trim().min(1).max(2000),
  })
  .strict();
export type SetDirectoryPublicationRequest = z.output<typeof SetDirectoryPublicationRequest>;
