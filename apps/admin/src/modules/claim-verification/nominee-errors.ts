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
export function nomineeCorrectionErrorMessage(err: unknown, kind: 'raise' | 'decide' = 'decide'): string {
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
