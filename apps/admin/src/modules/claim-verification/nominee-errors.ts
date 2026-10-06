// Story 6.20 — the nominee declaration surfaces' error wording, shared by the verifier console, the
// Pariwar Admin's queue and the helpline's raise (one table, so the three can ⛔ never drift). PURE.

import { ApiError } from '../../api/client.js';
import { verifierConsoleEn as t } from './i18n-en.js';

/**
 * Story 6.20 (AC5) — the approval gate's `nominee_determination_required` 409, worded by its REASON
 * (`never_determined` | `empty_declaration` | `unversioned` | `incoherent`). Shared with the trustee
 * surfaces, which meet the same 409 when a correction supersedes the determination.
 */
export function nomineeDeterminationRequiredMessage(err: ApiError): string {
  const reason = (err.details as { reason?: string } | undefined)?.reason ?? 'never_determined';
  return t.nomineeDeclaration.approvalGate[reason] ?? t.nomineeDeclaration.approvalGate.never_determined!;
}

/**
 * The same 409 on a TRUSTEE surface (the cycle freeze, R9 voting), worded by its REASON (code review
 * 2026-09-24b) — `unversioned` / `empty_declaration` are ⛔ not "waiting for the District Admin to determine".
 */
export function trusteeDeterminationRequiredMessage(err: ApiError): string {
  const reason = (err.details as { reason?: string } | undefined)?.reason ?? 'never_determined';
  return t.nomineeDeclaration.trusteeApprovalGateByReason[reason] ?? t.nomineeDeclaration.trusteeApprovalGate;
}

/**
 * Story 6.21a (D7) — the approval gate's `…death_certificate_acceptance_required` 409, worded by its REASON
 * (`no_certificate` | `not_reviewed` | `rejected` | `determination_stale`). ⛔ Never a denial: the claim waits.
 */
export function deathCertificateAcceptanceRequiredMessage(err: ApiError): string {
  const reason = (err.details as { reason?: string } | undefined)?.reason ?? 'not_reviewed';
  return t.deathCertificate.approveBlocked[reason] ?? t.deathCertificate.approveBlocked.not_reviewed!;
}

/** The same 409 on a TRUSTEE surface (the cycle freeze, R9 voting) — the District Admin or the family acts. */
export function trusteeDeathCertificateAcceptanceRequiredMessage(err: ApiError): string {
  const reason = (err.details as { reason?: string } | undefined)?.reason ?? 'not_reviewed';
  return t.deathCertificate.trusteeApprovalGate[reason] ?? t.deathCertificate.trusteeApprovalGate.not_reviewed!;
}

/**
 * Story 6.19a (D14) — the approval gate's `…claim_contact_required` 409 (`verifier_decision.` / `cycle_freeze.` /
 * `r9_voting.`), worded by its REASON — the same words on every screen: the claim WAITS, and the helpline can add
 * the details. ⛔ Never a denial, ⛔ never "try again".
 */
export function claimContactRequiredMessage(err: ApiError): string {
  const reason = (err.details as { reason?: string } | undefined)?.reason ?? 'no_record';
  return t.claimContact.approvalGate[reason] ?? t.claimContact.approvalGate.no_record!;
}

/** Story 6.21a — the review's typed refusals (`death_certificate_review.<reason>`), each with its instruction. */
export function deathCertificateReviewErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === 'admin.display_name_missing') return t.decision.displayNameMissing;
    if (err.status === 401) return t.deathCertificate.sessionExpired;
    if (err.status === 403) return t.deathCertificate.forbidden;
    const reason = err.code.startsWith('death_certificate_review.') ? err.code.slice('death_certificate_review.'.length) : '';
    const text = t.deathCertificate.refused[reason];
    if (text) return text;
    if (err.status === 400) return t.deathCertificate.invalid;
  }
  return t.deathCertificate.refusedGeneric;
}

/** Story 6.20 — the determination's typed refusals, each with the instruction that fixes it. */
export function nomineeDeterminationErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === 'admin.display_name_missing') return t.decision.displayNameMissing;
    if (err.status === 401) return t.nomineeDeclaration.determine.sessionExpired;
    if (err.status === 403) return t.nomineeDeclaration.determine.forbidden;
    // The handler answers a missing claim as `claim.not_found`, ⛔ not a `nominee_determination.` code.
    if (err.code === 'claim.not_found') return t.nomineeDeclaration.determine.refused.not_found!;
    const reason = err.code.startsWith('nominee_determination.') ? err.code.slice('nominee_determination.'.length) : '';
    const text = t.nomineeDeclaration.determine.refused[reason];
    if (text) return text;
    // A schema refusal (`request.invalid`) — after the typed codes, so a typed 400 keeps its own words.
    if (err.status === 400) return t.nomineeDeclaration.determine.invalid;
  }
  return t.nomineeDeclaration.determine.refusedGeneric;
}

/**
 * Story 6.20 — a nominee correction's typed refusals. `kind` picks the schema-refusal wording: a RAISE is
 * about the name and mobile, a DECISION about the note (adversarial review 2026-09-24b).
 */
// ⚠ `kind` is REQUIRED (review 2026-09-24c): a default let a raise caller that forgot it show the note wording.
export function nomineeCorrectionErrorMessage(err: unknown, kind: 'raise' | 'decide'): string {
  if (err instanceof ApiError) {
    if (err.code === 'admin.display_name_missing') return t.decision.displayNameMissing;
    if (err.status === 401) return t.nomineeDeclaration.corrections.sessionExpired;
    if (err.status === 403) return t.nomineeDeclaration.corrections.forbidden;
    if (err.code === 'claim.not_found') return t.nomineeDeclaration.corrections.refused.claim_not_found!;
    const reason = err.code.startsWith('nominee_correction.') ? err.code.slice('nominee_correction.'.length) : '';
    const text = t.nomineeDeclaration.corrections.refused[reason];
    if (text) return text;
    // A schema refusal (`request.invalid`) — after the typed codes, so a typed 400 keeps its own words.
    if (err.status === 400) {
      return kind === 'raise' ? t.nomineeDeclaration.corrections.invalid : t.nomineeDeclaration.corrections.invalidDecision;
    }
  }
  return t.nomineeDeclaration.corrections.refusedGeneric;
}

// ── Story 6.23b — the LATER approvers' warning refusals (`cycle_freeze.` / `r9_voting.` / `closure.`), one helper per
// code suffix, wired by each page's `errorMessage` through an `endsWith` arm (RD6). ⛔ Never "try again", ⛔ never a code.

/** `….warning_reason_required` — a reason (or its note) is missing while a warning shows. */
export function warningReasonRequiredMessage(err: ApiError): string {
  // Code review 2026-10-06 (P36): a runtime check, not a blind `as` cast — `details` crosses the HTTP wire
  // untyped (`Record<string, unknown>`), so a differently-shaped payload must not silently pick the wrong copy.
  const details = err.details as Record<string, unknown> | undefined;
  const missing = typeof details?.['missing'] === 'string' ? details['missing'] : undefined;
  return missing === 'note' ? t.approvalWarnings.noteRequiredError : t.approvalWarnings.errors.warningReasonRequired;
}

/** `….warning_reason_ungrounded` — a reason was sent while ⛔ no warning shows. */
export function warningReasonUngroundedMessage(): string {
  return t.approvalWarnings.errors.warningReasonUngrounded;
}

/** `….warning_reason_unavailable` — the chosen reason was replaced since the page loaded. */
export function warningReasonUnavailableMessage(): string {
  return t.approvalWarnings.errors.warningReasonUnavailable;
}

/** `….late_warning_reason_required` — THE WAIT; with `own_reason_excluded`, why the approver's own reason cannot clear their own approval. */
export function lateWarningReasonRequiredMessage(err: ApiError, surface: 'trustee' | 'r9' = 'trustee'): string {
  const details = err.details as Record<string, unknown> | undefined;
  const own = details?.['own_reason_excluded'] === true;
  const base = t.approvalWarnings.errors.lateWarningReasonRequired;
  if (!own) return base;
  return `${base} ${surface === 'r9' ? t.approvalWarnings.later.ownReasonExcludedR9 : t.approvalWarnings.later.ownReasonExcluded}`;
}

/** `r9_voting.approve_votes_need_warning_reason` — the voters named must revise. */
export function approveVotesNeedWarningReasonMessage(err: ApiError): string {
  const details = err.details as Record<string, unknown> | undefined;
  const rawIds = details?.['vote_ids'];
  const ids = Array.isArray(rawIds) ? rawIds.filter((i): i is string => typeof i === 'string') : [];
  // Code review 2026-10-06 (P37): `vote_ids` is always non-empty when the server throws this error — but if a
  // malformed/missing payload ever slipped through, `Math.max(ids.length, 1)` would confidently show "One approve
  // vote…" even when the true count is higher. Say so without a number instead of guessing one.
  if (ids.length === 0) return t.approvalWarnings.errors.approveVotesNeedWarningReasonUnknownCount;
  return t.approvalWarnings.errors.approveVotesNeedWarningReason(ids.length);
}

/**
 * Every 6.23b warning refusal in ONE place for a page's `errorMessage` (each arm keyed on the code SUFFIX, so the same
 * words reach `cycle_freeze.`, `r9_voting.` and `closure.`). `undefined` ⇔ none of them.
 */
export function laterApprovalWarningErrorMessage(err: unknown, surface: 'trustee' | 'r9' = 'trustee'): string | undefined {
  if (!(err instanceof ApiError)) return undefined;
  if (err.code.endsWith('.warning_reason_required')) return warningReasonRequiredMessage(err);
  if (err.code.endsWith('.warning_reason_ungrounded')) return warningReasonUngroundedMessage();
  if (err.code.endsWith('.warning_reason_unavailable')) return warningReasonUnavailableMessage();
  if (err.code.endsWith('.late_warning_reason_required')) return lateWarningReasonRequiredMessage(err, surface);
  if (err.code.endsWith('.approve_votes_need_warning_reason')) return approveVotesNeedWarningReasonMessage(err);
  return undefined;
}
