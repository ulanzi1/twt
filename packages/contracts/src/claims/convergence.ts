// packages/contracts/src/claims/convergence.ts
//
// ICP convergence-resolution transport DTOs (Story 6.4, Task 7). The request/response wire
// shapes for the operator/trustee <ConvergenceDecisionStrip>:
//   · GET  /api/v1/p/:pariwarId/admin/claims/convergence/pending  → the pending cross-channel
//     attempts + their candidate canonical claims (AC2/AC3).
//   · POST /api/v1/p/:pariwarId/admin/claims/convergence/merge    → confirm convergence (union
//     the channel into the canonical claim + flip the attempt converged; AC2).
//   · POST /api/v1/p/:pariwarId/admin/claims/convergence/override → treat as separate (record the
//     override ledger row + mint a DISTINCT canonical claim; AC4).
//
// ── Contracts discipline ──────────────────────────────────────────────────────────────
// A contracts SOURCE file MUST NOT import `@twt/domain` (the browser-bundle rule). The claim-
// lifecycle-state literal is REUSED from ./filing.ts (value-aligned with @twt/domain); the
// intake-channel enum is RE-DECLARED here (value-aligned with CLAIM_INTAKE_CHANNELS). This
// file describes ONLY the REST wire shape. ALL objects `.strict()`.
//
// ── PII discipline ────────────────────────────────────────────────────────────────────
// No caller/nominee PII on any convergence wire shape — only ids + channels + lifecycle state
// + the override reason (an operator-authored, non-PII rationale) + timestamps.

import { z } from 'zod';

import { UuidString } from '../_common/primitives.js';
import { ClaimLifecycleState } from './filing.js';

/**
 * The intake channel (re-declared; value-aligned with @twt/domain CLAIM_INTAKE_CHANNELS). An
 * attempt originates on exactly ONE channel; a claim's `intakeChannels` is the converged SET.
 */
export const ClaimIntakeChannel = z.enum(['member_app', 'helpline', 'trustee_initiated']);
export type ClaimIntakeChannel = z.output<typeof ClaimIntakeChannel>;

// ── pending list (AC2/AC3) ──────────────────────────────────────────────────────────────

/** A candidate canonical claim a pending attempt might converge onto (cross-channel visible). */
export const ConvergenceCandidateClaim = z
  .object({
    claimCaseId: z.string().uuid(),
    intakeChannels: z.array(ClaimIntakeChannel),
    currentState: ClaimLifecycleState,
    createdAt: z.string(),
  })
  .strict();
export type ConvergenceCandidateClaim = z.output<typeof ConvergenceCandidateClaim>;

/** One pending intake attempt + its candidate canonical claim(s) — a strip row. */
export const PendingIntakeAttempt = z
  .object({
    intakeAttemptId: z.string().uuid(),
    deceasedMemberId: z.string().uuid(),
    intakeChannel: ClaimIntakeChannel,
    createdAt: z.string(),
    candidates: z.array(ConvergenceCandidateClaim),
  })
  .strict();
export type PendingIntakeAttempt = z.output<typeof PendingIntakeAttempt>;

/** `GET .../convergence/pending` — the <ConvergenceDecisionStrip> feed. */
export const PendingIntakeAttemptsResponse = z
  .object({ pending: z.array(PendingIntakeAttempt) })
  .strict();
export type PendingIntakeAttemptsResponse = z.output<typeof PendingIntakeAttemptsResponse>;

// ── merge (AC2) ─────────────────────────────────────────────────────────────────────────

/**
 * `POST .../convergence/merge` — the operator CONFIRMS convergence: union the attempt's channel
 * into the canonical claim + flip the attempt `pending → converged`. Idempotent (a re-submitted
 * merge of an already-converged attempt is a no-op 200).
 */
export const ConvergenceMergeRequest = z
  .object({
    intakeAttemptId: UuidString,
    claimCaseId: UuidString,
  })
  .strict();
export type ConvergenceMergeRequest = z.output<typeof ConvergenceMergeRequest>;

export const ConvergenceMergeResponse = z
  .object({
    /** True when this call performed the merge; false on an idempotent no-op (already converged). */
    merged: z.boolean(),
    claimCaseId: z.string().uuid(),
    /** The canonical claim's channel set AFTER the union (order-insensitive). */
    intakeChannels: z.array(ClaimIntakeChannel),
  })
  .strict();
export type ConvergenceMergeResponse = z.output<typeof ConvergenceMergeResponse>;

// ── override (AC4) ────────────────────────────────────────────────────────────────────────

/** The minimum override-reason length (a real rationale, not a stray keystroke). */
export const CONVERGENCE_OVERRIDE_REASON_MIN = 10;

/**
 * `POST .../convergence/override` — the operator treats the attempt as SEPARATE: record the
 * `convergence_overrides` ledger row (reason required) + mint a DISTINCT canonical claim. The
 * reason is mandatory + min-length (mirrors the <ReasonCodeDropdown> "explanation before submit"
 * discipline). `againstClaimCaseId` is the canonical claim it was NOT merged into.
 *
 * The mutation ships live: the account-frozen overlay (`packages/domain/src/member/overlay.ts`)
 * is AGGREGATE-safe — it folds ALL non-terminal claims for a `deceased_member_id`, so minting a
 * second claim here can never weaken the freeze. The Task-7 shipping-gate precondition this
 * endpoint depends on is satisfied; there is no conditional "not yet available" response path.
 */
export const ConvergenceOverrideRequest = z
  .object({
    intakeAttemptId: UuidString,
    againstClaimCaseId: UuidString,
    reason: z.string().trim().min(CONVERGENCE_OVERRIDE_REASON_MIN).max(1000),
  })
  .strict();
export type ConvergenceOverrideRequest = z.output<typeof ConvergenceOverrideRequest>;

export const ConvergenceOverrideResponse = z
  .object({
    overridden: z.literal(true),
    /** The NEW distinct canonical claim minted for the separated attempt. */
    newClaimCaseId: z.string().uuid(),
    state: ClaimLifecycleState,
  })
  .strict();
export type ConvergenceOverrideResponse = z.output<typeof ConvergenceOverrideResponse>;
