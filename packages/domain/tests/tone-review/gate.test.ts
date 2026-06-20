// Unit tests for the Story 2.2 pure tone-review gate evaluator (AC3).
//
// The gate is framework-agnostic: it decides allow/deny from an INJECTED sign-off
// record, enforcing two invariants — sign-off-present and non-author
// (reviewedBy !== authoredBy). No DB, no Fastify, no HTTP. The apps/api pre-handler
// (Story 2.2 Task 4) mounts this on a publish route; tests there prove the audit +
// 409 teeth. Here we nail the pure decision matrix + the error projector envelope.

import { describe, expect, it } from 'vitest';

import {
  ToneReviewRequiredError,
  TONE_REVIEW_REQUIRED_CODE,
  evaluateToneReviewGate,
  type ToneReviewSignoff,
} from '../../src/tone-review/index.js';

const AUTHOR = '11111111-1111-1111-1111-111111111111';
const REVIEWER = '22222222-2222-2222-2222-222222222222';
const LOCATOR = 'niyamavali:clause:7';
const CONTENT_HASH = 'a'.repeat(64);

function signoff(over: Partial<ToneReviewSignoff> = {}): ToneReviewSignoff {
  return {
    reviewedBy: REVIEWER,
    resourceLocator: LOCATOR,
    contentHash: CONTENT_HASH,
    ...over,
  };
}

describe('evaluateToneReviewGate (Story 2.2, AC3)', () => {
  it('DENIES when no sign-off exists (sign-off-present invariant)', () => {
    const result = evaluateToneReviewGate({
      signoff: null,
      authoredBy: AUTHOR,
      resourceLocator: LOCATOR,
    });
    expect(result.allowed).toBe(false);
    if (result.allowed) throw new Error('unreachable');
    expect(result.denial.reason).toBe('signoff-missing');
    expect(result.denial.resourceLocator).toBe(LOCATOR);
    expect(result.denial.authoredBy).toBe(AUTHOR);
    expect(result.denial.reviewedBy).toBeNull();
  });

  it('DENIES when the author is the reviewer (non-author invariant)', () => {
    const result = evaluateToneReviewGate({
      signoff: signoff({ reviewedBy: AUTHOR }),
      authoredBy: AUTHOR,
      resourceLocator: LOCATOR,
    });
    expect(result.allowed).toBe(false);
    if (result.allowed) throw new Error('unreachable');
    expect(result.denial.reason).toBe('author-is-reviewer');
    expect(result.denial.reviewedBy).toBe(AUTHOR);
    expect(result.denial.authoredBy).toBe(AUTHOR);
  });

  it('ALLOWS a valid non-author sign-off', () => {
    const result = evaluateToneReviewGate({
      signoff: signoff(),
      authoredBy: AUTHOR,
      resourceLocator: LOCATOR,
    });
    expect(result.allowed).toBe(true);
  });

  it('DENIES a sign-off recorded for a different resourceLocator (resource-bound invariant)', () => {
    const result = evaluateToneReviewGate({
      signoff: signoff({ resourceLocator: 'niyamavali:clause:99' }),
      authoredBy: AUTHOR,
      resourceLocator: LOCATOR,
    });
    expect(result.allowed).toBe(false);
    if (result.allowed) throw new Error('unreachable');
    expect(result.denial.reason).toBe('signoff-missing');
    expect(result.denial.resourceLocator).toBe(LOCATOR);
    expect(result.denial.reviewedBy).toBeNull();
  });

  it('falls closed: a sign-off with an empty reviewedBy is treated as missing-reviewer', () => {
    const result = evaluateToneReviewGate({
      signoff: signoff({ reviewedBy: '' }),
      authoredBy: AUTHOR,
      resourceLocator: LOCATOR,
    });
    expect(result.allowed).toBe(false);
    if (result.allowed) throw new Error('unreachable');
    expect(result.denial.reason).toBe('signoff-missing');
  });

  it('ToneReviewRequiredError.toErrorResponse projects the 409 envelope (mirrors AuthorizationDeniedError)', () => {
    const result = evaluateToneReviewGate({
      signoff: null,
      authoredBy: AUTHOR,
      resourceLocator: LOCATOR,
    });
    if (result.allowed) throw new Error('unreachable');
    const error = new ToneReviewRequiredError(result.denial);
    expect(error.name).toBe('ToneReviewRequiredError');
    expect(error.code).toBe(TONE_REVIEW_REQUIRED_CODE);
    const envelope = error.toErrorResponse('req-123');
    expect(envelope.error.code).toBe(TONE_REVIEW_REQUIRED_CODE);
    expect(envelope.error.request_id).toBe('req-123');
    expect(envelope.error.details).toEqual(result.denial);
    // The message carries the locator + reason, never raw copy material.
    expect(error.message).toContain(LOCATOR);
    expect(error.message).not.toContain(CONTENT_HASH);
  });
});
