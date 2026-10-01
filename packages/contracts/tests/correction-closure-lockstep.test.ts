// Story 6.19c — the correction CLOSURE's wire vocabularies are in LOCKSTEP with the domain, and the request shapes
// refuse at the boundary what the domain would refuse (the serialize-time 500 class
// `nominee-name-check-vocabulary-lockstep` pins). The contracts ⛔ never import `@twt/domain` at runtime
// ([[project_contracts_domain_bundle_boundary]]) — this TEST is the only bridge.

import { describe, expect, it } from 'vitest';

import { claim, schema } from '@twt/domain';

import {
  ApprovalNameHighlight,
  CLOSURE_SUPER_ADMIN_REASONS,
  ClosureOrigin,
  ClosureRequestBlocker,
  ClosureState,
  ClosureSuperAdminReason,
  CorrectionClosureDecisionRequest,
  DirectionKind,
  DirectionRole,
  EscalatedClosureDecisionRequest,
  RefileConfirmationResponse,
  SuperAdminRefusalReasonCode,
} from '../src/index.js';

describe('the correction closure vocabularies (Story 6.19c)', () => {
  it('⭐ origin, state, direction role / kind and the re-file `via` EQUAL the domain tuples, in order', () => {
    expect(ClosureOrigin.options).toEqual([...schema.CLOSURE_ORIGINS]);
    expect(ClosureState.options).toEqual([...schema.CLOSURE_STATES]);
    expect(DirectionRole.options).toEqual([...schema.DIRECTION_ROLES]);
    expect(DirectionKind.options).toEqual([...schema.DIRECTION_KINDS]);
    expect(RefileConfirmationResponse.shape.via.options).toEqual([...schema.REFILE_CONFIRMATION_VIA]);
  });

  it('⭐ `-273` §10 — the closure-scoped reasons per decision equal the domain map (the wire names the ACT, the domain its terminal state)', () => {
    expect([...CLOSURE_SUPER_ADMIN_REASONS.close]).toEqual([...schema.CLOSURE_SUPER_ADMIN_REASONS.closed]);
    expect([...CLOSURE_SUPER_ADMIN_REASONS.refuse]).toEqual([...schema.CLOSURE_SUPER_ADMIN_REASONS.refused]);
    expect([...CLOSURE_SUPER_ADMIN_REASONS.approve]).toEqual([...schema.CLOSURE_SUPER_ADMIN_REASONS.approved]);
    const all = new Set(Object.values(schema.CLOSURE_SUPER_ADMIN_REASONS).flat());
    expect(new Set(ClosureSuperAdminReason.options)).toEqual(all);
  });

  it('⭐ the refusal reason codes are EXACTLY the ones the domain lets a Super Admin refusal carry', () => {
    const domainAllowed = claim.STATE_TRUSTEE_REASON_CODES.filter((c) => claim.isSuperAdminRefusalReasonCode(c));
    expect([...SuperAdminRefusalReasonCode.options].sort()).toEqual([...domainAllowed].sort());
  });

  it('the request blocker carries AC6\'s codes in their order, then D14 and the retryable hash fault', () => {
    expect(ClosureRequestBlocker.options).toEqual([
      'no_live_return',
      'escalated',
      'request_pending',
      'not_family_action',
      'too_early',
      'claim_routed_to_r9',
      'claim_corrected',
      'not_reached',
      'claim_contact_required',
      'number_unverified',
    ]);
  });

  it('the highlight carries the two `-273` §7 wordings', () => {
    expect(ApprovalNameHighlight.options).toEqual(['approved_without_passing_check', 'approved_despite_name_mismatch']);
  });
});

describe('the closure request shapes refuse at the boundary', () => {
  it('a DECLINE needs a note (`-232` H); an approve does not', () => {
    expect(CorrectionClosureDecisionRequest.safeParse({ decision: 'decline' }).success).toBe(false);
    expect(CorrectionClosureDecisionRequest.safeParse({ decision: 'decline', note: '   ' }).success).toBe(false);
    expect(CorrectionClosureDecisionRequest.safeParse({ decision: 'decline', note: 'reached once only' }).success).toBe(true);
    expect(CorrectionClosureDecisionRequest.safeParse({ decision: 'approve' }).success).toBe(true);
  });

  it('a Super Admin decision needs a reason FROM ITS OWN SET, a note, and — only on a refusal — a refusal reason code', () => {
    const ok = { decision: 'close', reason: 'family_silent_after_reached', note: 'n' };
    expect(EscalatedClosureDecisionRequest.safeParse(ok).success).toBe(true);
    expect(EscalatedClosureDecisionRequest.safeParse({ ...ok, reason: 'details_verified' }).success).toBe(false);
    expect(EscalatedClosureDecisionRequest.safeParse({ ...ok, note: '' }).success).toBe(false);
    expect(EscalatedClosureDecisionRequest.safeParse({ ...ok, refusal_reason_code: 'other' }).success).toBe(false);
    const refuse = { decision: 'refuse', reason: 'claim_not_payable', note: 'n' };
    expect(EscalatedClosureDecisionRequest.safeParse(refuse).success).toBe(false);
    expect(EscalatedClosureDecisionRequest.safeParse({ ...refuse, refusal_reason_code: 'documents_insufficient' }).success).toBe(true);
    // ⛔ No "no response" reason on a refusal (`-274` 1a).
    expect(EscalatedClosureDecisionRequest.safeParse({ ...refuse, reason: 'family_silent_after_reached', refusal_reason_code: 'other' }).success).toBe(false);
  });
});
