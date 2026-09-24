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

/** Story 6.20 — the determination's typed refusals, each with the instruction that fixes it. */
export function nomineeDeterminationErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === 'admin.display_name_missing') return t.decision.displayNameMissing;
    if (err.status === 403) return t.nomineeDeclaration.determine.forbidden;
    const reason = err.code.startsWith('nominee_determination.') ? err.code.slice('nominee_determination.'.length) : '';
    const text = t.nomineeDeclaration.determine.refused[reason];
    if (text) return text;
  }
  return t.nomineeDeclaration.determine.refusedGeneric;
}

/** Story 6.20 — a nominee correction's typed refusals. */
export function nomineeCorrectionErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === 'admin.display_name_missing') return t.decision.displayNameMissing;
    if (err.status === 403) return t.nomineeDeclaration.corrections.forbidden;
    const reason = err.code.startsWith('nominee_correction.') ? err.code.slice('nominee_correction.'.length) : '';
    const text = t.nomineeDeclaration.corrections.refused[reason];
    if (text) return text;
  }
  return t.nomineeDeclaration.corrections.refusedGeneric;
}
