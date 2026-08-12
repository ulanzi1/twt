// The two-part ESCALATION JUSTIFICATION — Story 10.20 (Task 5; AC6, WS-C).
//
// ── The constitutional frame ────────────────────────────────────────────────────────────────────
// Niyamavali §8.6, ratified as Decision `2026-08-12-099`, opens with the sentence every rule in this
// module is subordinate to: **"Termination is an exceptional governance act, not a stronger
// suspension."** A termination therefore has to answer TWO questions that a suspension does not:
//
//   (a) WHY SUSPENSION IS INADEQUATE — what suspension would fail to protect, what risk would
//       persist through it, or why the restoration path it preserves is unavailable or futile;
//   (b) WHY TERMINATION IS PROPORTIONATE — why the chosen sanction fits the conduct.
//
// ⛔ THE TWO ARE NOT INTERCHANGEABLE, AND THAT IS THE WHOLE POINT. Part (a) is NOT satisfied by
// (i) asserting the seriousness of the conduct, (ii) citing the reason code, or (iii) restating (b).
// Only (iii) is machine-checkable, and this module checks it.
//
// ── Three layers, and this is the SECOND ────────────────────────────────────────────────────────
// 1. THE RECORD'S SHAPE (migration 0099, D2): two separate columns, plus the
//    `member_moderation_actions_escalation_iff_terminate` CHECK. Presence is structural, on every
//    write path including a raw-SQL one. One column would have let a UI concatenate the parts and
//    satisfy a presence check with a single paragraph.
// 2. THIS MODULE: the guards a CHECK constraint CANNOT express.
// 3. The admin surface: two controls with no copy-across affordance (AC12).
//
// ── ⛔ Why the anti-restatement rule can never move to the database (premise #5) ─────────────────
// `encryptModerationRationale` is a NON-DETERMINISTIC Tier-1 envelope encrypt. Two byte-identical
// plaintexts produce two different ciphertexts, so `CHECK (a <> b)` is satisfied by exactly the case
// it was written to catch. The comparison has ONE legitimate home: the PLAINTEXT, in the route,
// before encryption — alongside `assertRationalePresent`, which is also where it is cheapest,
// because a request that was always going to 422 never spends a KMS round-trip.

import {
  ModerationEscalationNotApplicableError,
  ModerationEscalationRequiredError,
  ModerationEscalationRestatementError,
  type EscalationPart,
} from './errors.js';
import type { ModerationAction } from './status.js';

/**
 * The minimum-substance floor, per part, applied INDEPENDENTLY.
 *
 * ⚠ A LENGTH FLOOR IS A FLOOR, NOT A QUALITY TEST — and saying so where it lives is the point of
 * this comment. It exists to reject `"n/a"`, `"see above"` and `"-"`; it cannot and does not judge
 * whether the reasoning is any good. That judgement belongs to the Trustee Panel and to a later
 * reviewer reading the record, which is precisely what the record model exists to make possible.
 */
export const ESCALATION_PART_MIN_CHARS = 40;

/**
 * The per-part ceiling. Aligned by VALUE with the contracts DTO's cap so the admin textarea's
 * `maxLength`, the boundary 400 and this backstop agree; the contracts copy is the one the client
 * reads (⛔ `@twt/domain` must never import `@twt/contracts` — turbo cycle, `errors.ts:41`).
 */
export const ESCALATION_PART_MAX_CHARS = 4_000;

/**
 * Normalize a part for the RESTATEMENT comparison only.
 *
 * ⚠ This value is never stored and never shown — it exists solely so that case, punctuation and
 * whitespace cannot defeat the check. Without normalization, pasting part (b) into part (a) and
 * capitalising a word would pass, which would make the guard decorative.
 *
 * ⛔ Deliberately NOT a similarity metric. A fuzzy match would reject two genuinely different
 * answers that happen to share vocabulary — and a guard that refuses honest input teaches operators
 * to write around it, which is worse than no guard.
 */
export function normalizeEscalationPart(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** The two parts as supplied by an untrusted caller (either may be absent). */
export interface EscalationJustificationInput {
  inadequacy?: string | null;
  proportionality?: string | null;
}

/** The two parts, validated and trimmed — what the route encrypts. */
export interface EscalationJustificationPlaintext {
  inadequacy: string;
  proportionality: string;
}

function assertPart(part: EscalationPart, raw: string | null | undefined): string {
  const trimmed = (raw ?? '').trim();
  if (trimmed.length === 0) {
    throw new ModerationEscalationRequiredError(part, 'missing', ESCALATION_PART_MIN_CHARS);
  }
  if (trimmed.length < ESCALATION_PART_MIN_CHARS) {
    throw new ModerationEscalationRequiredError(part, 'too_short', ESCALATION_PART_MIN_CHARS);
  }
  if (trimmed.length > ESCALATION_PART_MAX_CHARS) {
    throw new ModerationEscalationRequiredError(part, 'too_long', ESCALATION_PART_MAX_CHARS);
  }
  return trimmed;
}

/**
 * The AC6 guard, as a PURE function over the plaintext. Returns the validated pair on `terminate`
 * and `null` on every other action.
 *
 * ⛔ The `null` return is not "nothing to do" — a `suspend` or `restore` that CARRIES a part is a
 * typed 422, not a silent drop. The DB CHECK is an `iff` and bites both ways, so such a row is
 * impossible anyway; this error is what makes the refusal readable instead of a `23514` surfacing
 * as a 500.
 *
 * @throws ModerationEscalationNotApplicableError (→ 422) a part on a non-termination.
 * @throws ModerationEscalationRequiredError      (→ 422) a part missing or below the floor.
 * @throws ModerationEscalationRestatementError   (→ 422) part (a) merely restates part (b).
 */
export function assertEscalationJustification(
  action: ModerationAction,
  input: EscalationJustificationInput,
): EscalationJustificationPlaintext | null {
  if (action !== 'terminate') {
    const supplied =
      (input.inadequacy ?? '').trim().length > 0 ||
      (input.proportionality ?? '').trim().length > 0;
    if (supplied) throw new ModerationEscalationNotApplicableError(action);
    return null;
  }

  const inadequacy = assertPart('inadequacy', input.inadequacy);
  const proportionality = assertPart('proportionality', input.proportionality);

  if (normalizeEscalationPart(inadequacy) === normalizeEscalationPart(proportionality)) {
    throw new ModerationEscalationRestatementError();
  }

  return { inadequacy, proportionality };
}

/**
 * The IMMEDIATE-TERMINATION EXCEPTION REASON — Story 10.20 (Task 6; AC8, Q4.1).
 *
 * The Panel preserved an immediate path past the 7-day dwell, conditioned on *"the authorised actor
 * records the reason/justification for using that exception"*. A recorded reason with no substance
 * is not recorded, so the same floor applies.
 *
 * ── ⛔ THIS IS A THIRD FIELD, NOT A RE-USE OF EITHER ESCALATION PART ────────────────────────────
 * The two-part test answers **why termination**; this answers **why NOW**. Collapsing them makes
 * both unfalsifiable — a single paragraph could be read as satisfying whichever one is being
 * questioned. It is `NULL` on the ordinary path and non-`NULL` exactly when the exception was
 * invoked, which is what makes *"how often is the exception used?"* an answerable question. That is
 * the point of recording it.
 *
 * Returns the trimmed reason, or `null` when the exception was not invoked.
 *
 * @throws ModerationEscalationNotApplicableError (→ 422) supplied on a non-termination.
 * @throws ModerationEscalationRequiredError      (→ 422) supplied but below the substance floor.
 */
export function assertImmediateTerminationReason(
  action: ModerationAction,
  raw: string | null | undefined,
): string | null {
  const trimmed = (raw ?? '').trim();
  if (action !== 'terminate') {
    if (trimmed.length > 0) throw new ModerationEscalationNotApplicableError(action);
    return null;
  }
  // ⚠ ABSENT IS LEGAL AND MEANS "the ordinary path" — this field is what SELECTS the immediate
  // route, so requiring it would eliminate the ordinary route entirely.
  if (trimmed.length === 0) return null;
  if (trimmed.length < ESCALATION_PART_MIN_CHARS) {
    throw new ModerationEscalationRequiredError(
      'immediate_termination_reason',
      'too_short',
      ESCALATION_PART_MIN_CHARS,
    );
  }
  if (trimmed.length > ESCALATION_PART_MAX_CHARS) {
    throw new ModerationEscalationRequiredError(
      'immediate_termination_reason',
      'too_long',
      ESCALATION_PART_MAX_CHARS,
    );
  }
  return trimmed;
}
