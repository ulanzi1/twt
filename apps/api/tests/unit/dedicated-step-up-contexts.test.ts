// Story 11b.4 (MA19, AC20) — the generic member step-up route may ⛔ never mint a context whose code goes to someone other
// than the session member. The set is pinned EQUAL to the handover context (a by-value literal in the auth module).

import { describe, expect, it } from 'vitest';

import { DEDICATED_STEP_UP_CONTEXTS, isDedicatedStepUpContext } from '../../src/modules/auth/member/dedicated-step-up-contexts.js';
import { CLAIM_HANDOVER_ACTION_CONTEXT } from '../../src/modules/claims/claims.service.js';

describe('DEDICATED_STEP_UP_CONTEXTS', () => {
  it('is exactly [CLAIM_HANDOVER_ACTION_CONTEXT]', () => {
    expect([...DEDICATED_STEP_UP_CONTEXTS]).toEqual([CLAIM_HANDOVER_ACTION_CONTEXT]);
  });

  it('refuses claim_handover and nothing else', () => {
    expect(isDedicatedStepUpContext('claim_handover')).toBe(true);
    expect(isDedicatedStepUpContext('nominee_update')).toBe(false);
    expect(isDedicatedStepUpContext('Claim_Handover')).toBe(false);
  });
});
