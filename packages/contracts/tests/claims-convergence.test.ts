// ICP convergence-resolution contract tests — Story 6.4 (Task 7; AC2/AC3/AC4).
//
// The <ConvergenceDecisionStrip> wire shapes: pending list (GET) + merge (POST) + override
// (POST). Focus areas:
//   · strict() on every DTO;
//   · the override reason enforces the min-length gate AND trims whitespace-only reasons
//     (Review Finding — a padded-with-spaces reason must not satisfy the minimum);
//   · ClaimIntakeChannel accepts exactly the three channels;
//   · the merge/override responses carry their required discriminators.

import { describe, expect, it } from 'vitest';

import { assertStrict } from '../src/_common/strict.js';
import {
  CONVERGENCE_OVERRIDE_REASON_MIN,
  ClaimIntakeChannel,
  ConvergenceCandidateClaim,
  ConvergenceMergeRequest,
  ConvergenceMergeResponse,
  ConvergenceOverrideRequest,
  ConvergenceOverrideResponse,
  PendingIntakeAttempt,
  PendingIntakeAttemptsResponse,
} from '../src/claims/index.js';

const ATTEMPT = '11111111-1111-1111-1111-111111111111';
const CLAIM_A = '22222222-2222-2222-2222-222222222222';
const CLAIM_B = '33333333-3333-3333-3333-333333333333';
const MEMBER = '44444444-4444-4444-4444-444444444444';

describe('Convergence-resolution DTOs (strict + shapes)', () => {
  it('all convergence DTOs are .strict()', () => {
    assertStrict(ConvergenceCandidateClaim);
    assertStrict(PendingIntakeAttempt);
    assertStrict(PendingIntakeAttemptsResponse);
    assertStrict(ConvergenceMergeRequest);
    assertStrict(ConvergenceMergeResponse);
    assertStrict(ConvergenceOverrideRequest);
    assertStrict(ConvergenceOverrideResponse);
  });

  it('ClaimIntakeChannel accepts exactly member_app | helpline | trustee_initiated', () => {
    for (const c of ['member_app', 'helpline', 'trustee_initiated'] as const) {
      expect(ClaimIntakeChannel.parse(c)).toBe(c);
    }
    expect(() => ClaimIntakeChannel.parse('sms')).toThrow();
  });

  it('PendingIntakeAttemptsResponse accepts a well-formed pending list with cross-channel candidates', () => {
    const payload = {
      pending: [
        {
          intakeAttemptId: ATTEMPT,
          deceasedMemberId: MEMBER,
          intakeChannel: 'helpline' as const,
          createdAt: '2026-07-09T10:00:00.000Z',
          candidates: [
            {
              claimCaseId: CLAIM_A,
              intakeChannels: ['member_app' as const],
              currentState: 'intake_converged' as const,
              createdAt: '2026-07-09T09:00:00.000Z',
            },
          ],
        },
      ],
    };
    expect(PendingIntakeAttemptsResponse.parse(payload)).toEqual(payload);
  });

  it('PendingIntakeAttemptsResponse accepts a pending attempt with an EMPTY candidates array', () => {
    // The sole candidate may have already turned terminal (Review Finding) — an empty array
    // is a valid, meaningful state, not a malformed payload.
    const payload = {
      pending: [
        {
          intakeAttemptId: ATTEMPT,
          deceasedMemberId: MEMBER,
          intakeChannel: 'member_app' as const,
          createdAt: '2026-07-09T10:00:00.000Z',
          candidates: [],
        },
      ],
    };
    expect(PendingIntakeAttemptsResponse.parse(payload).pending[0]?.candidates).toEqual([]);
  });

  it('ConvergenceMergeRequest requires intakeAttemptId + claimCaseId as UUIDs, rejects unknown keys', () => {
    const req = { intakeAttemptId: ATTEMPT, claimCaseId: CLAIM_A };
    expect(ConvergenceMergeRequest.parse(req)).toEqual(req);
    expect(() => ConvergenceMergeRequest.parse({ ...req, claimCaseId: 'not-a-uuid' })).toThrow();
    expect(() => ConvergenceMergeRequest.parse({ ...req, extra: 1 })).toThrow();
  });

  it('ConvergenceMergeResponse carries the merged discriminator + the unioned channel set', () => {
    const res = { merged: true, claimCaseId: CLAIM_A, intakeChannels: ['member_app', 'helpline'] as const };
    expect(ConvergenceMergeResponse.parse(res)).toEqual(res);
    // The idempotent no-op case (merged: false) is equally valid.
    expect(ConvergenceMergeResponse.parse({ ...res, merged: false }).merged).toBe(false);
  });

  it(`ConvergenceOverrideRequest rejects a reason shorter than ${CONVERGENCE_OVERRIDE_REASON_MIN} chars`, () => {
    const base = { intakeAttemptId: ATTEMPT, againstClaimCaseId: CLAIM_A };
    expect(() => ConvergenceOverrideRequest.parse({ ...base, reason: 'short' })).toThrow();
    expect(
      ConvergenceOverrideRequest.parse({ ...base, reason: 'a real rationale for keeping these separate' })
        .reason,
    ).toBe('a real rationale for keeping these separate');
  });

  it('ConvergenceOverrideRequest TRIMS the reason and rejects a whitespace-padded too-short reason (Review Finding)', () => {
    const base = { intakeAttemptId: ATTEMPT, againstClaimCaseId: CLAIM_A };
    // Padded with spaces to reach the raw min-length — must still fail post-trim.
    const padded = ' '.repeat(CONVERGENCE_OVERRIDE_REASON_MIN + 5);
    expect(() => ConvergenceOverrideRequest.parse({ ...base, reason: padded })).toThrow();
    // A real reason with incidental leading/trailing whitespace is trimmed, not rejected.
    const leaded = `  distinct claimant, unrelated dispute  `;
    expect(ConvergenceOverrideRequest.parse({ ...base, reason: leaded }).reason).toBe(
      'distinct claimant, unrelated dispute',
    );
  });

  it('ConvergenceOverrideResponse requires overridden: true literal + a newClaimCaseId + state', () => {
    const res = { overridden: true as const, newClaimCaseId: CLAIM_B, state: 'intake_converged' as const };
    expect(ConvergenceOverrideResponse.parse(res)).toEqual(res);
    expect(() => ConvergenceOverrideResponse.parse({ ...res, overridden: false })).toThrow();
  });
});
