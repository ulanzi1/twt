// Story 6.38 (DL6) — the claim door's refusal vocabulary is DOMAIN-OWNED and MIRRORED here; this pins the two in lockstep
// (the `APPROVAL_WARNING_REASON_REFUSALS` precedent in `claims-verifier-decision.test.ts`).

import { claim } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import { CLAIM_INTAKE_REFUSAL_REASONS, CLAIM_INTAKE_REFUSED_CODE, isClaimIntakeRefusalReason } from '../src/index.js';

describe('Story 6.38 — the claim door vocabulary', () => {
  it('the contracts tuple equals the domain tuple, in order', () => {
    expect([...CLAIM_INTAKE_REFUSAL_REASONS]).toEqual([...claim.CLAIM_INTAKE_REFUSAL_REASONS]);
  });

  it('the 409 code', () => {
    expect(CLAIM_INTAKE_REFUSED_CODE).toBe('claim.intake_refused');
  });

  it('the guard admits the five and nothing else', () => {
    for (const r of CLAIM_INTAKE_REFUSAL_REASONS) expect(isClaimIntakeRefusalReason(r)).toBe(true);
    for (const r of ['suspended', 'active', '', null, undefined, 3]) expect(isClaimIntakeRefusalReason(r)).toBe(false);
  });
});
