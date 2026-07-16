// Internal 3-stage appeal vocabulary + the pure, FROZEN outcome computation — Story 6.16 (Task 1/5; D-B/D-C).
//
// The bounded vocabulary the appeal write-paths + read models turn on (five pgEnums + their TS tuples), PLUS
// the pure `computeAppealOutcome` tally helper (Stage 2's burden-of-persuasion rule) and the appeal quorum
// floor. This mirrors the STRUCTURE of `r9-voting.ts` (Story 6.14) MINUS the niyamavali clause registry — an
// appeal panel votes on the APPEAL, not on a clause, so there is no clause id / rule_code / voting_requirement
// derivation here. The single frozen majority rule replaces R9's DATA-driven `deriveVotingRequirement`.
//
// ── The FROZEN Stage-2 tie rule (AC3 — the burden of persuasion) ─────────────────────────────────────────
// The DENOMINATOR is the PANEL SIZE `N` (the immutable roster captured at open), NOT the number of cast
// votes — an absent or `deny` panelist counts AGAINST reversal (the R9 panel-size-denominator discipline):
//   · reversed ⟺ reverse_count ≥ ⌊N/2⌋ + 1  (a STRICT reverse-majority over the panel size)
//   · else     advance                       (a tie, or any non-reversing tally once quorum is met)
// A `quorum_required` (v1 default `⌊N/2⌋+1`, snapshotted at open) gates finalize BEFORE this runs (a
// below-quorum finalize is a 4xx, never a computed `advance`) — that gate lives in the write path, not here.
// Unlike R9 there is NO supermajority/unanimous variant: the appeal panel's rule is a single frozen literal.

import { pgEnum } from 'drizzle-orm/pg-core';

// ── The five bounded appeal enums (pgEnum + TS tuple) ────────────────────────────────────────

/**
 * The appeal stage a decision/session belongs to (`'1' | '2' | '3'`). Stored as a text enum (the story's
 * "pick one and be consistent" call) — `Number(stage)` yields the numeric `reversed_at_stage` the
 * `claim.reversed` publish-hook payload carries (D-A).
 */
export const APPEAL_STAGES = ['1', '2', '3'] as const;
export const appealStageEnum = pgEnum('appeal_stage', APPEAL_STAGES);
export type AppealStage = (typeof APPEAL_STAGES)[number];

/**
 * A recorded single-decider / finalized-panel decision. VALUE-ALIGNED with `appealReviewDecisionSchema`
 * (events.ts) — do NOT re-derive a divergent set. `advance` = the non-terminal auto-advance (Stage 1/2, D-C);
 * `reversed` = the denial is overturned; `upheld` = the denial stands (Stage 3 ONLY, D-C). The claim STATE is
 * derived from the paired `claim.appeal_stageN_reviewed` event, NEVER from this column.
 */
export const APPEAL_DECISIONS = ['reversed', 'advance', 'upheld'] as const;
export const appealDecisionEnum = pgEnum('appeal_decision', APPEAL_DECISIONS);
export type AppealDecision = (typeof APPEAL_DECISIONS)[number];

/** An individual Stage-2 panelist's vote (`reverse | deny`). Distinct from the finalized panel `outcome`. */
export const APPEAL_PANEL_VOTES = ['reverse', 'deny'] as const;
export const appealPanelVoteEnum = pgEnum('appeal_panel_vote', APPEAL_PANEL_VOTES);
export type AppealPanelVote = (typeof APPEAL_PANEL_VOTES)[number];

/**
 * The finalized Stage-2 panel outcome (`reversed | advance`). In v1 a panel NEVER `upheld`s (D-C — only
 * Stage 3 may terminally uphold); a non-reversing tally advances to Stage 3. Claim STATE is derived from the
 * paired `claim.appeal_stage2_reviewed` event, NEVER from this column.
 */
export const APPEAL_PANEL_OUTCOMES = ['reversed', 'advance'] as const;
export const appealPanelOutcomeEnum = pgEnum('appeal_panel_outcome', APPEAL_PANEL_OUTCOMES);
export type AppealPanelOutcome = (typeof APPEAL_PANEL_OUTCOMES)[number];

/**
 * The bounded, NON-PII public disposition tag a reviewer selects on a REVERSAL (D-A). Copied onto the
 * `claim.reversed` publish-hook payload for Epic 11b's "Reversed by appeal" narrative — it NEVER carries the
 * Tier-1 rationale ciphertext or an individually-identifying reviewer name. The exact member list + its
 * public wording template is a D-G legal-counsel sign-off item (Task 10); kept easy to extend via migration.
 * Set ONLY alongside a `reversed` decision — never populated for `advance`/`upheld`.
 */
export const APPEAL_DISPOSITION_CATEGORIES = [
  'new_evidence_presented',
  'procedural_correction',
  'reconsideration_on_merits',
] as const;
export const appealDispositionCategoryEnum = pgEnum('appeal_disposition_category', APPEAL_DISPOSITION_CATEGORIES);
export type AppealDispositionCategory = (typeof APPEAL_DISPOSITION_CATEGORIES)[number];

/** The `claim_appeals` anchor journey status (`open` → terminal `reversed` | `upheld_final`, D-F). */
export const APPEAL_JOURNEY_STATUSES = ['open', 'reversed', 'upheld_final'] as const;
export const appealJourneyStatusEnum = pgEnum('appeal_journey_status', APPEAL_JOURNEY_STATUSES);
export type AppealJourneyStatus = (typeof APPEAL_JOURNEY_STATUSES)[number];

// ── Panel-size bounds (D-B) ──────────────────────────────────────────────────────────────────

/**
 * Stage-2 appeal panel MINIMUM roster size (D-B — PRD-mandated, STRICTER than R9's ≥1-derived floor; do NOT
 * copy that floor verbatim). A two-person minimum is the smallest panel that can express a genuine tie.
 */
export const APPEAL_PANEL_MIN_MEMBERS = 2;

/** Stage-2 appeal panel roster upper bound — value-shared with `@twt/contracts` (the R9 ceiling reused). */
export const APPEAL_PANEL_MAX_MEMBERS = 25;

// ── The quorum floor + the FROZEN outcome computation (panel-size denominator, AC3) ───────────

/**
 * The v1 quorum default: a strict majority of the panel, `⌊N/2⌋ + 1`. Snapshotted at open
 * (`claim_appeal_panel_sessions.quorum_required`) and gating finalize. Identical formula to `r9QuorumFor`
 * (the story confirms that helper is already clause-free) — defined here so the appeal vocabulary is
 * self-contained + cannot silently drift if the R9 helper is ever re-tuned for a clause-specific quorum.
 */
export function appealQuorumFor(panelSize: number): number {
  return Math.floor(panelSize / 2) + 1;
}

export interface AppealOutcomeComputation {
  outcome: AppealPanelOutcome;
  reverse_count: number;
  deny_count: number;
}

/**
 * Compute the Stage-2 panel outcome — PURE, FROZEN (AC3). The DENOMINATOR is the immutable `panelSize` `N`
 * (NOT the number of cast votes); an absent or `deny` panelist counts AGAINST reversal:
 *   · reversed ⟺ reverse_count ≥ ⌊N/2⌋ + 1   (a STRICT reverse-majority over the panel size)
 *   · else     advance                        (a tie, or any quorum-met sub-majority tally)
 * Returns `reversed` iff the strict-majority threshold is met, else `advance`, with the tally. The QUORUM gate
 * (`castLiveVotes ≥ quorum_required`) is checked in the finalize write-path BEFORE this runs (a below-quorum
 * finalize is a 4xx, never a computed `advance`). There is deliberately NO supermajority/unanimous branch —
 * the appeal panel's burden of persuasion is a single frozen rule (contrast R9's DATA-driven requirement).
 */
export function computeAppealOutcome(
  liveVotes: readonly { vote: AppealPanelVote }[],
  panelSize: number,
): AppealOutcomeComputation {
  const reverse_count = liveVotes.filter((v) => v.vote === 'reverse').length;
  const deny_count = liveVotes.filter((v) => v.vote === 'deny').length;
  const threshold = appealQuorumFor(panelSize); // ⌊N/2⌋+1 — a strict reverse-majority over the panel size
  const outcome: AppealPanelOutcome = reverse_count >= threshold ? 'reversed' : 'advance';
  return { outcome, reverse_count, deny_count };
}

// ── The prepared-ciphertext boundary type (AC2/AC3) ───────────────────────────────────────────
//
// Mirrors `PreparedR9VoteCiphertext` (r9-voting.ts): the ≤500-char plaintext bound is a business rule the
// CONTRACT enforces ONCE at the trusted pre-encryption boundary; the domain write-path receives ONLY
// ciphertext and can never re-derive plaintext length from it. So the appeal write-paths accept a BRANDED
// ciphertext (proof it passed the sanctioned validate-then-encrypt path) + enforce only a storage-safety
// ceiling — NOT a business-rule proxy — guarding the `piiColumn` from a pathological oversized envelope.

/** Storage-safety ceiling for a Tier-1 appeal rationale envelope, in bytes (mirrors R9). */
export const APPEAL_CIPHERTEXT_MAX_BYTES = 8192;

/** Thrown by `prepareAppealCiphertext` when a ciphertext exceeds the storage-safety ceiling, or is empty. */
export class AppealCiphertextStorageError extends Error {
  public readonly name = 'AppealCiphertextStorageError';
  public constructor(
    public readonly reason: 'empty' | 'too_large',
    public readonly byteLength: number,
  ) {
    super(
      reason === 'empty'
        ? '[appeal] rationale ciphertext must not be empty'
        : `[appeal] rationale ciphertext of ${byteLength} bytes exceeds the ${APPEAL_CIPHERTEXT_MAX_BYTES}-byte storage-safety ceiling`,
    );
  }
}

/** A rationale ciphertext that has passed the sanctioned pre-encryption boundary (AC2/AC3). Opaque brand —
 *  the ONLY way to obtain one is `prepareAppealCiphertext`, called from the route AFTER the contract's
 *  ≤500-char plaintext check + AFTER encryption. The appeal write-paths accept ONLY this type. */
export type PreparedAppealCiphertext = string & { readonly __brand: 'PreparedAppealCiphertext' };

/** Stamp a ciphertext as prepared (AC2/AC3). Enforces ONLY non-emptiness + the storage-safety ceiling — NOT
 *  a re-derivation of the plaintext-length business rule (structurally impossible post-encryption). */
export function prepareAppealCiphertext(ciphertext: string): PreparedAppealCiphertext {
  const byteLength = Buffer.byteLength(ciphertext, 'utf-8');
  if (byteLength === 0) throw new AppealCiphertextStorageError('empty', byteLength);
  if (byteLength > APPEAL_CIPHERTEXT_MAX_BYTES) throw new AppealCiphertextStorageError('too_large', byteLength);
  return ciphertext as PreparedAppealCiphertext;
}

// ── The trust-side per-stage SLA config shape (D-H) ────────────────────────────────────────────

/**
 * The Pariwar-scoped per-stage SLA durations, in DAYS (D-H). Read-only context for `computeStageSlaStatus`
 * (appeal-eligibility.ts) — NEVER a write-path gate. Held on `pariwar_appeal_config`. Internal/trust-side
 * ONLY: a breach surfaces as a flag/indicator and feeds Story 0.7's SLA framework; it never blocks, expires,
 * or gates the claimant's right to initiate or continue an appeal (D-E).
 */
export interface AppealStageSlaDays {
  stage1: number;
  stage2: number;
  stage3: number;
}

/** The v1 default per-stage SLA durations (days), used when a Pariwar has no `pariwar_appeal_config` row. */
export const DEFAULT_APPEAL_STAGE_SLA_DAYS: AppealStageSlaDays = { stage1: 14, stage2: 21, stage3: 14 };

/** The go-live gate status for a Pariwar's appeal flow (D-G). `pending_legal_review` = fail-closed default
 *  (the flow is gated OFF until counsel returns); `cleared` = counsel signed off, the flow may go live. */
export const APPEAL_LEGAL_REVIEW_STATUSES = ['pending_legal_review', 'cleared'] as const;
export const appealLegalReviewStatusEnum = pgEnum('appeal_legal_review_status', APPEAL_LEGAL_REVIEW_STATUSES);
export type AppealLegalReviewStatus = (typeof APPEAL_LEGAL_REVIEW_STATUSES)[number];
