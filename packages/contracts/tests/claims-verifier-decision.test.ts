// Verifier-decision contract tests — Story 6.11 (Task 7; AC1/AC8).
//
// The adjudication request DTOs + the superRefine. Focus:
//   · outcome↔reason-code compatibility (AC8) — a rejected combination is a validation failure;
//   · rationale required on `other` + on a Deny (AC1(b)); the 500-char cap;
//   · the request DTO is `.strict()` — a smuggled `actor_display` (or any unknown field) is rejected (R5);
//   · the compat map + helpers match the domain source of truth (value-aligned).

import { claim, schema } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import {
  APPROVAL_WARNING_GENERIC_REASON,
  APPROVAL_WARNING_KINDS,
  NOMINEE_VERSION_WARNING_KINDS,
  DeathCertificateRegisterCheck,
  APPROVAL_WARNING_REASON_LABEL_MAX,
  APPROVAL_WARNING_REASON_REFUSALS,
  APPROVAL_WARNING_REASON_WHEN_TO_USE_MAX,
  ApprovalWarningReasonWriteRequest,
  CLAIM_WARNING_APPROVAL_STEPS,
  LateWarningReasonRequest,
  isReasonCodeValidForOutcome,
  reasonCodesForOutcome,
  REASON_CODE_OUTCOME_COMPAT,
  VerifierDecisionRequest,
  VerifierDecisionReviseRequest,
  VerifierDecisionOutcome,
  VerifierReasonCode,
  VERIFIER_RATIONALE_MAX_CHARS,
} from '../src/claims/index.js';

describe('outcome↔reason-code compatibility (AC8)', () => {
  it('pins each reason code to its valid outcome(s); `other` is any', () => {
    expect(isReasonCodeValidForOutcome('approved', 'r5_d_natural_death')).toBe(true);
    expect(isReasonCodeValidForOutcome('approved', 'r8_90pct_met')).toBe(true);
    expect(isReasonCodeValidForOutcome('approved', 'concealment_flag_override')).toBe(true);
    expect(isReasonCodeValidForOutcome('denied', 'concealment_flag_uphold')).toBe(true);
    expect(isReasonCodeValidForOutcome('escalated', 'r9_routed_to_voting')).toBe(true);
    for (const outcome of ['approved', 'denied', 'escalated']) {
      expect(isReasonCodeValidForOutcome(outcome, 'other')).toBe(true);
    }
  });

  it('rejects incompatible combinations', () => {
    expect(isReasonCodeValidForOutcome('approved', 'concealment_flag_uphold')).toBe(false);
    expect(isReasonCodeValidForOutcome('denied', 'r5_d_natural_death')).toBe(false);
    expect(isReasonCodeValidForOutcome('approved', 'r9_routed_to_voting')).toBe(false);
    expect(isReasonCodeValidForOutcome('denied', 'concealment_flag_override')).toBe(false);
    expect(isReasonCodeValidForOutcome('bogus', 'other')).toBe(false);
    expect(isReasonCodeValidForOutcome('approved', 'bogus')).toBe(false);
  });

  it('reasonCodesForOutcome offers only compatible codes (drives the dropdown)', () => {
    expect(reasonCodesForOutcome('approved').sort()).toEqual(
      ['concealment_flag_override', 'other', 'r5_d_natural_death', 'r8_90pct_met'].sort(),
    );
    // Story 6.20 (D14) — the `-239` refusal on suspicion is a DENY-only code.
    expect(reasonCodesForOutcome('denied').sort()).toEqual(
      ['concealment_flag_uphold', 'other', 'post_death_nominee_change'].sort(),
    );
    expect(reasonCodesForOutcome('escalated').sort()).toEqual(['other', 'r9_routed_to_voting'].sort());
  });

  it('the compat map covers every reason code', () => {
    expect(Object.keys(REASON_CODE_OUTCOME_COMPAT).sort()).toEqual(
      [
        'concealment_flag_override',
        'concealment_flag_uphold',
        'other',
        'post_death_nominee_change',
        'r5_d_natural_death',
        'r8_90pct_met',
        'r9_routed_to_voting',
      ].sort(),
    );
  });
});

// ── AC8 lockstep (anti-drift guard) ──────────────────────────────────────────────────────────
// `@twt/domain` cannot import `@twt/contracts` (turbo cycle), so the domain write-path re-declares its
// own `REASON_CODE_OUTCOME_COMPAT` + outcome/reason-code enums rather than importing this package's copy
// — contracts → domain is the legal direction (the consent.ts / claims-filing.ts precedent), so THIS
// test is the anti-drift guard: it fails the moment either copy is edited without the other.
describe('Story 6.11 — outcome/reason-code lockstep (contracts ↔ domain, AC8 anti-drift guard)', () => {
  it('domain VERIFIER_DECISION_OUTCOMES === contracts VerifierDecisionOutcome.options', () => {
    expect([...claim.VERIFIER_DECISION_OUTCOMES].sort()).toEqual([...VerifierDecisionOutcome.options].sort());
  });

  it('domain VERIFIER_REASON_CODES === contracts VerifierReasonCode.options', () => {
    expect([...claim.VERIFIER_REASON_CODES].sort()).toEqual([...VerifierReasonCode.options].sort());
  });

  it('domain REASON_CODE_OUTCOME_COMPAT === contracts REASON_CODE_OUTCOME_COMPAT, key-for-key and value-for-value', () => {
    const domainKeys = Object.keys(claim.REASON_CODE_OUTCOME_COMPAT).sort();
    const contractsKeys = Object.keys(REASON_CODE_OUTCOME_COMPAT).sort();
    expect(domainKeys).toEqual(contractsKeys);
    for (const key of domainKeys) {
      const domainOutcomes = [...claim.REASON_CODE_OUTCOME_COMPAT[key as claim.VerifierReasonCode]].sort();
      const contractsOutcomes = [...REASON_CODE_OUTCOME_COMPAT[key as VerifierReasonCode]].sort();
      expect(contractsOutcomes).toEqual(domainOutcomes);
    }
  });
});

describe('VerifierDecisionRequest superRefine (AC1/AC8)', () => {
  it('accepts a compatible approve with no rationale', () => {
    const parsed = VerifierDecisionRequest.safeParse({ outcome: 'approved', reason_code: 'r8_90pct_met' });
    expect(parsed.success).toBe(true);
  });

  it('rejects an incompatible outcome↔reason-code (400 at the boundary)', () => {
    const parsed = VerifierDecisionRequest.safeParse({ outcome: 'approved', reason_code: 'concealment_flag_uphold' });
    expect(parsed.success).toBe(false);
  });

  it('requires a rationale on a Deny', () => {
    const noRationale = VerifierDecisionRequest.safeParse({ outcome: 'denied', reason_code: 'concealment_flag_uphold' });
    expect(noRationale.success).toBe(false);
    const withRationale = VerifierDecisionRequest.safeParse({
      outcome: 'denied',
      reason_code: 'concealment_flag_uphold',
      rationale: 'Concealment upheld after review.',
    });
    expect(withRationale.success).toBe(true);
  });

  it('requires a rationale on the `other` reason code', () => {
    const noRationale = VerifierDecisionRequest.safeParse({ outcome: 'approved', reason_code: 'other' });
    expect(noRationale.success).toBe(false);
    const withRationale = VerifierDecisionRequest.safeParse({
      outcome: 'approved',
      reason_code: 'other',
      rationale: 'Special circumstance approved.',
    });
    expect(withRationale.success).toBe(true);
  });

  it('caps the rationale at 500 chars', () => {
    const parsed = VerifierDecisionRequest.safeParse({
      outcome: 'approved',
      reason_code: 'r8_90pct_met',
      rationale: 'x'.repeat(VERIFIER_RATIONALE_MAX_CHARS + 1),
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects a smuggled actor_display / unknown field (.strict(), R5)', () => {
    const parsed = VerifierDecisionRequest.safeParse({
      outcome: 'approved',
      reason_code: 'r8_90pct_met',
      actor_display: 'Not Anita',
    });
    expect(parsed.success).toBe(false);
  });
});

describe('VerifierDecisionReviseRequest (AC5)', () => {
  it('accepts an optional supersedes_decision_id', () => {
    const parsed = VerifierDecisionReviseRequest.safeParse({
      outcome: 'denied',
      reason_code: 'concealment_flag_uphold',
      rationale: 'Corrected rationale.',
      supersedes_decision_id: '11111111-1111-1111-1111-111111111111',
    });
    expect(parsed.success).toBe(true);
  });

  it('enforces the same compat + rationale rules as the decision request', () => {
    expect(
      VerifierDecisionReviseRequest.safeParse({ outcome: 'denied', reason_code: 'r5_d_natural_death' }).success,
    ).toBe(false);
  });
});

// ── Story 6.23a (NW5, AC2) — the WARNING REASON, in its own field ─────────────────────────────────────────────
describe('Story 6.23a — `warning_reason_code` on the decision request ONLY (NW5; AC2)', () => {
  const approve = { outcome: 'approved', reason_code: 'r5_d_natural_death', rationale: 'seen in person' };

  it('accepted with an approval and a non-blank rationale', () => {
    const parsed = VerifierDecisionRequest.parse({ ...approve, warning_reason_code: 'warnings_reviewed' });
    expect(parsed.warning_reason_code).toBe('warnings_reviewed');
    // The REAL approval reason is untouched (invariant 11).
    expect(parsed.reason_code).toBe('r5_d_natural_death');
  });

  it('⛔ with a deny or an escalate (400)', () => {
    for (const body of [
      { outcome: 'denied', reason_code: 'other', rationale: 'x', warning_reason_code: 'warnings_reviewed' },
      { outcome: 'escalated', reason_code: 'r9_routed_to_voting', rationale: 'x', warning_reason_code: 'warnings_reviewed' },
    ]) {
      const r = VerifierDecisionRequest.safeParse(body);
      expect(r.success).toBe(false);
      expect(r.error?.issues.map((i) => i.path.join('.'))).toContain('warning_reason_code');
    }
  });

  it('⛔ without a rationale, or with a blank one (400 — the note `-262` FQ2 asks for)', () => {
    for (const rationale of [undefined, '   ']) {
      const r = VerifierDecisionRequest.safeParse({ outcome: 'approved', reason_code: 'r8_90pct_met', rationale, warning_reason_code: 'warnings_reviewed' });
      expect(r.success).toBe(false);
      expect(r.error?.issues.map((i) => i.path.join('.'))).toContain('rationale');
    }
  });

  it('a blank or over-long code is a 400', () => {
    expect(VerifierDecisionRequest.safeParse({ ...approve, warning_reason_code: ' ' }).success).toBe(false);
    expect(VerifierDecisionRequest.safeParse({ ...approve, warning_reason_code: 'x'.repeat(65) }).success).toBe(false);
  });

  it('⛔ the REVISE request does ⛔ not take it (a warned approval is never revised — NW7)', () => {
    expect(VerifierDecisionReviseRequest.safeParse({ ...approve, warning_reason_code: 'warnings_reviewed' }).success).toBe(false);
  });

  it('LateWarningReasonRequest — both fields required; the note ≤ 500', () => {
    expect(LateWarningReasonRequest.safeParse({ warning_reason_code: 'warnings_reviewed', note: 'the date moved' }).success).toBe(true);
    expect(LateWarningReasonRequest.safeParse({ warning_reason_code: 'warnings_reviewed' }).success).toBe(false);
    expect(LateWarningReasonRequest.safeParse({ note: 'x' }).success).toBe(false);
    expect(LateWarningReasonRequest.safeParse({ warning_reason_code: 'warnings_reviewed', note: 'x'.repeat(501) }).success).toBe(false);
    expect(LateWarningReasonRequest.safeParse({ warning_reason_code: 'warnings_reviewed', note: 'x', extra: 1 }).success).toBe(false);
  });
});

describe('Story 6.23a — contracts ↔ domain lockstep (the kinds, the record\'s steps, the generic, the bounds)', () => {
  it('APPROVAL_WARNING_KINDS', () => {
    expect([...APPROVAL_WARNING_KINDS]).toEqual([...claim.APPROVAL_WARNING_KINDS]);
  });
  it('Story 6.26b (RD8) — NOMINEE_VERSION_WARNING_KINDS', () => {
    expect([...NOMINEE_VERSION_WARNING_KINDS]).toEqual([...claim.NOMINEE_VERSION_WARNING_KINDS]);
  });
  it('Story 6.26b (GI8; RD14) — the register check\'s value set (the death-certificate contract)', () => {
    expect([...DeathCertificateRegisterCheck.options]).toEqual([...schema.DEATH_CERTIFICATE_REGISTER_CHECKS]);
  });
  it('CLAIM_WARNING_APPROVAL_STEPS', () => {
    expect([...CLAIM_WARNING_APPROVAL_STEPS]).toEqual([...schema.CLAIM_WARNING_APPROVAL_STEPS]);
  });
  it('APPROVAL_WARNING_GENERIC_REASON', () => {
    expect(APPROVAL_WARNING_GENERIC_REASON).toEqual(claim.APPROVAL_WARNING_GENERIC_REASON);
  });
  it('the reason-list refusals (code review round 4 — the admin\'s words are checked against THIS list)', () => {
    expect([...APPROVAL_WARNING_REASON_REFUSALS]).toEqual([...claim.APPROVAL_WARNING_REASON_WRITE_REFUSALS]);
  });
  it('the reason-text bounds', () => {
    expect(APPROVAL_WARNING_REASON_LABEL_MAX).toBe(schema.APPROVAL_WARNING_REASON_LABEL_MAX);
    expect(APPROVAL_WARNING_REASON_WHEN_TO_USE_MAX).toBe(schema.APPROVAL_WARNING_REASON_WHEN_TO_USE_MAX);
  });
  it('the reason write request — ⛔ blank, ⛔ too long, ⛔ an unknown field', () => {
    expect(ApprovalWarningReasonWriteRequest.safeParse({ label: 'Seen', when_to_use: 'Use when seen.' }).success).toBe(true);
    expect(ApprovalWarningReasonWriteRequest.safeParse({ label: ' ', when_to_use: 'x' }).success).toBe(false);
    expect(ApprovalWarningReasonWriteRequest.safeParse({ label: 'x'.repeat(121), when_to_use: 'x' }).success).toBe(false);
    // Code review round 3 — counted in CODE POINTS (the DB's `char_length()`): 120 emoji are 240 UTF-16 units yet fit.
    expect(ApprovalWarningReasonWriteRequest.safeParse({ label: '🙏'.repeat(120), when_to_use: '🙏'.repeat(1000) }).success).toBe(true);
    expect(ApprovalWarningReasonWriteRequest.safeParse({ label: '🙏'.repeat(121), when_to_use: 'x' }).success).toBe(false);
    expect(ApprovalWarningReasonWriteRequest.safeParse({ label: 'x', when_to_use: '🙏'.repeat(1001) }).success).toBe(false);
    expect(ApprovalWarningReasonWriteRequest.safeParse({ label: 'x', when_to_use: 'x', code: 'awr_00000000' }).success).toBe(false);
  });
});
