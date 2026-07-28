// packages/contracts/src/contributions/self-verify.ts
//
// The Story 9.7 member self-verify RECOVERY contracts — the machine reason-code vocabulary, the
// `<SelfVerifySurface>` read DTO (default / uploaded / resolved), and the screenshot-upload request shape.
//
// ── Contracts discipline ──────────────────────────────────────────────────────────────────────────────
// MUST NOT import `@twt/domain` at source (the browser-bundle rule — [[project_contracts_domain_bundle_boundary]]).
// The mismatch-reason vocabulary MIRRORS `@twt/domain` `contribution.CONTRIBUTION_MISMATCH_REASONS`
// verbatim; `packages/contracts/tests/contributions.test.ts` mechanically asserts the two stay in lockstep
// (a test-only cross-package import is safe — tests never ship in a bundle; the `ContributionUtr` precedent).
// All objects `.strict()`. NO `.openapi()` — the multipart upload route is hand-documented (6.5/9.3 precedent).

import { z } from 'zod';

/**
 * The reconciliation-mismatch reason vocabulary the member RECOVERY surface maps to dignified Pattern-4
 * empathy copy (never "Error/Invalid/Failed"). Value-aligned with the `@twt/domain`
 * `CONTRIBUTION_MISMATCH_REASONS` (the RED verdict's reason-codes); kept in lockstep by the contracts
 * contributions test. The surface only ever renders copy for a reason it recognises — an unknown token
 * falls back to the generic dignified message rather than leaking the raw enum.
 */
export const CONTRIBUTION_MISMATCH_REASON_CODES = [
  'no_statement_entry',
  'wrong_pool',
  'amount_mismatch',
  'sender_vpa_mismatch',
  'entry_already_claimed',
] as const;
export const ContributionMismatchReasonCode = z.enum(CONTRIBUTION_MISMATCH_REASON_CODES);
export type ContributionMismatchReasonCode = z.output<typeof ContributionMismatchReasonCode>;

/**
 * The self-verify recovery lifecycle state (UX §11 `<SelfVerifySurface>`):
 *   · `default`  — an unresolved mismatch (or a "Trouble with UTR?" fallback entry), no screenshot yet.
 *   · `uploaded` — a self-verify screenshot has been uploaded, awaiting Story 9.8 staff review.
 *   · `resolved` — a LIVE `contribution.confirmed` exists (the matcher / trustee flow confirmed).
 * Mirrors the `@twt/domain` `SelfVerifyStatus` (the read producer).
 */
export const SelfVerifyStatus = z.enum(['default', 'uploaded', 'resolved']);
export type SelfVerifyStatus = z.output<typeof SelfVerifyStatus>;

/**
 * `GET /api/v1/member/self-verify/:poolId` response — the full state the `<SelfVerifySurface>` renders
 * (Decision D5: the surface reads its OWN detail state; the My Pool card carries only the tone + reason
 * for the Journey-1 entry). Member-session-gated, hard-scoped to the caller's own memberId (FR-12A).
 *
 *   · `mismatch`          — an UNRESOLVED reconciliation mismatch exists (red) for (member, pool).
 *   · `reason`            — the machine reason-code, mapped to empathy copy; `null` for a fallback entry.
 *   · `screenshotUploaded`— a self-verify screenshot has been uploaded at least once.
 *   · `status`            — the recovery lifecycle (default / uploaded / resolved).
 */
export const SelfVerifyStateResponse = z
  .object({
    mismatch: z.boolean(),
    reason: ContributionMismatchReasonCode.nullable(),
    screenshotUploaded: z.boolean(),
    status: SelfVerifyStatus,
    /**
     * Story 9.11 (AC4) — the OVER-payment discriminator. Non-null ONLY when there is a live mismatch whose
     * reason is `amount_mismatch` AND the canonical direction is `over`; the `<SelfVerifySurface>` then
     * renders the `amount_mismatch_over.*` empathy variant. `excessPaise` is the over-payment in PAISE
     * (deposited − expected, positive); the surface converts to ₹ at the display boundary. Null for an
     * under-payment / non-amount_mismatch → the generic `amount_mismatch.*` copy stays. Additive-optional.
     */
    overpayment: z.object({ excessPaise: z.number().int() }).strict().nullable().optional(),
  })
  .strict();
export type SelfVerifyStateResponse = z.output<typeof SelfVerifyStateResponse>;

/**
 * The non-file fields the self-verify screenshot upload endpoint accepts alongside the multipart file (the
 * bytes ride the multipart body). Ride the querystring (the 6.5/9.3 `documentType`/`bank_code` precedent).
 *   · `pool_id`  — the pool the screenshot is filed against (validated server-side against the member's own
 *                  live assigned pool — never a cross-pool oracle).
 *   · `fallback` — the explicit FR-32 "Trouble with UTR?" path: `true` lets a member on a still-verifying
 *                  (yellow) pool upload evidence even with no live mismatch. Absent/`false` ⇒ the upload is
 *                  accepted ONLY when the member has an unresolved mismatch (the mandatory-only-on-mismatch
 *                  guard — there is no happy-path screenshot door). `.strict()`.
 */
export const SelfVerifyScreenshotUploadRequest = z
  .object({
    pool_id: z.string().uuid(),
    // Querystring values arrive as strings — `z.coerce.boolean()` would coerce ANY non-empty string
    // (including the literal `"false"`) to `true`, silently defeating the AC3 "no happy-path door" guard.
    // Accept ONLY the two literal strings and reject anything else (a dignified 400, not a silent bypass).
    fallback: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
  })
  .strict();
export type SelfVerifyScreenshotUploadRequest = z.output<typeof SelfVerifyScreenshotUploadRequest>;

/**
 * The self-verify screenshot upload response (HTTP 200) — a first-class acknowledgement. The upload
 * SUCCEEDED as EVIDENCE INTAKE: the blob is stored, the evidence event is recorded, and the Story 9.8
 * reviewer is notified. It carries the resulting recovery `status` (always `uploaded` on success) so the
 * surface can advance without a second round-trip. It NEVER reports a reconciliation outcome — a
 * screenshot never confirms/remaps (AC4). A genuinely rejected upload (no mismatch + no fallback, too
 * large, empty, quarantined, wrong MIME) is a dignified 4xx, never this body. `.strict()`.
 */
export const SelfVerifyScreenshotUploadResponse = z
  .object({
    status: z.literal('uploaded'),
  })
  .strict();
export type SelfVerifyScreenshotUploadResponse = z.output<typeof SelfVerifyScreenshotUploadResponse>;
