// Pure view-logic for the Niyamavali admin surface — Story 2.4 (Task 6). No hooks,
// no router, no fetch → unit-testable in isolation (the audit-integrity derive.ts
// precedent).

import type {
  ClauseDraftResponse,
  ClauseIdSchema,
  CreateDraftBody,
  UpdateClauseDraftRequest,
} from '@twt/contracts';

/** Human label for a draft lifecycle state. */
export function draftStatusLabel(status: string): string {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'in_review':
      return 'In review';
    case 'signed_off':
      return 'Signed off';
    case 'published':
      return 'Published';
    case 'discarded':
      return 'Discarded';
    default:
      return status;
  }
}

/**
 * AC4 UI: the user-facing resolution path for a publish/sign-off rejection. Maps the
 * server's error code to a clear, non-author-friendly next step. Returns null for an
 * unrecognised code (the generic error message is shown instead).
 */
export function publishErrorGuidance(code: string): string | null {
  switch (code) {
    case 'tone_review.required':
      return 'This clause needs a tone-review sign-off from a non-author reviewer before it can be published. Submit it for review, then ask a colleague who holds the reviewer permission to sign off on the exact content.';
    case 'niyamavali.draft_self_review':
      return 'You authored this draft, so you cannot tone-review it yourself — a different reviewer must sign off.';
    case 'niyamavali.draft_invalid_state':
      return 'This draft is not in a publishable state. It must be submitted for review and signed off first.';
    case 'niyamavali.clause_id_conflict':
      return 'That clause id is already in the registry. Choose a new id, or amend the existing clause instead of creating a new one.';
    case 'niyamavali.clause_not_found':
      return 'No clause with that id exists yet, so it cannot be amended. Create it first.';
    default:
      return null;
  }
}

/** True for a draft whose only remaining step is a non-author sign-off. */
export function awaitsSignoff(status: string): boolean {
  return status === 'in_review';
}

/** True for a draft ready to publish (signed off, content-current). */
export function isPublishable(status: string): boolean {
  return status === 'signed_off';
}

/** True for a draft that can still be edited by the authoring workflow. */
export function isEditable(status: string): boolean {
  return status === 'draft' || status === 'in_review' || status === 'signed_off';
}

export interface DraftFormFields {
  operation: 'create' | 'amend';
  clauseId: string;
  ruleCode: string;
  titleEn: string;
  titleHi?: string;
  effectiveDate: string; // ISO date (yyyy-mm-dd from the date input)
  benefitMechanism: 'pool' | 'reserve';
  /** Required for `amend` — the affected-member scope kind (the simple kinds at 2.4). */
  affectedMemberScopeKind?: 'all_members' | 'past_lockin';
}

/**
 * Build the create/amend draft request body from the guided form fields. The payload
 * is OPAQUE (freeze row 14) — we assemble the trustee-entered DISPLAY fields into it;
 * Epic 4 owns rule-specific semantics. Empty optional fields are omitted.
 */
export function buildDraftBody(f: DraftFormFields): CreateDraftBody {
  const payload: Record<string, unknown> = {
    rule_code: f.ruleCode,
    title_en: f.titleEn,
    ...(f.titleHi && f.titleHi.trim() !== '' ? { title_hi: f.titleHi } : {}),
  };
  // A date input yields `yyyy-mm-dd`; normalise to an ISO-8601 instant (UTC midnight).
  const effectiveDate = new Date(`${f.effectiveDate}T00:00:00.000Z`).toISOString();

  // Only `clauseId` needs a brand cast (the wire format is validated + branded by
  // the server's Zod schema when it arrives) — every other field is left structurally
  // checked against its discriminated-union arm.
  const clauseId = f.clauseId as ClauseIdSchema;

  if (f.operation === 'amend') {
    return {
      operation: 'amend',
      clauseId,
      payload,
      effectiveDate,
      affectedMemberScope: { kind: f.affectedMemberScopeKind ?? 'all_members' },
    };
  }
  return {
    operation: 'create',
    clauseId,
    payload,
    effectiveDate,
    benefitMechanism: f.benefitMechanism,
  };
}

/** Build a partial update body from the same guided draft form. */
export function buildDraftPatch(f: DraftFormFields): UpdateClauseDraftRequest {
  const body = buildDraftBody(f);
  return {
    payload: body.payload,
    effectiveDate: body.effectiveDate,
    ...(body.operation === 'create'
      ? { benefitMechanism: body.benefitMechanism }
      : { affectedMemberScope: body.affectedMemberScope }),
  };
}

function scopeKind(
  scope: ClauseDraftResponse['affectedMemberScope'],
): DraftFormFields['affectedMemberScopeKind'] {
  if (scope?.kind === 'past_lockin') return 'past_lockin';
  return 'all_members';
}

function payloadString(payload: ClauseDraftResponse['payload'], key: string): string {
  const value = payload[key];
  return typeof value === 'string' ? value : '';
}

/** Project a persisted draft row into editable form fields. */
export function draftToFormFields(draft: ClauseDraftResponse): DraftFormFields {
  return {
    operation: draft.operation,
    clauseId: draft.clauseId,
    ruleCode: payloadString(draft.payload, 'rule_code'),
    titleEn: payloadString(draft.payload, 'title_en'),
    titleHi: payloadString(draft.payload, 'title_hi'),
    effectiveDate: draft.effectiveDate.slice(0, 10),
    benefitMechanism: draft.benefitMechanism,
    affectedMemberScopeKind: scopeKind(draft.affectedMemberScope),
  };
}
