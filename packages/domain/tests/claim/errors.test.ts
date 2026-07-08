// Claim typed-error detectors — pure, DB-free unit tests (Story 6.1 review finding).
//
// `isClaimStateDirectWriteError` / `isClaimStreamVersionConflict` match on a
// hardcoded SQLSTATE + message-prefix / constraint name. Neither had a dedicated
// test proving the detector actually recognizes the shape drizzle-orm wraps a raw
// pg error in (`.cause`) — these fixtures mirror that wrapping without touching a
// live DB, so a drift in the hardcoded strings fails loudly here instead of only
// showing up as a silently-unclassified error at runtime.

import { describe, expect, it } from 'vitest';

import {
  CLAIM_STATE_DIRECT_WRITE_MESSAGE_PREFIX,
  CLAIM_STATE_DIRECT_WRITE_SQLSTATE,
  ClaimStateDirectWriteError,
  isClaimStateDirectWriteError,
  isClaimStreamVersionConflict,
} from '../../src/claim/errors.js';

/** Mimic drizzle-orm's wrapped pg error: the driver's raw error sits on `.cause`. */
const wrappedPgError = (cause: { code?: string; message: string; constraint?: string }): Error => {
  const err = new Error('drizzle query failed');
  (err as { cause?: unknown }).cause = cause;
  return err;
};

describe('isClaimStateDirectWriteError', () => {
  it('recognizes the trigger rejection shape (P0001 + message prefix)', () => {
    const err = wrappedPgError({
      code: CLAIM_STATE_DIRECT_WRITE_SQLSTATE,
      message: `${CLAIM_STATE_DIRECT_WRITE_MESSAGE_PREFIX} — attempted "verifier_review" -> "denied" on claim x`,
    });
    expect(isClaimStateDirectWriteError(err)).toBe(true);
  });

  it('rejects a same-SQLSTATE error with an unrelated message', () => {
    const err = wrappedPgError({ code: CLAIM_STATE_DIRECT_WRITE_SQLSTATE, message: 'some other raise_exception' });
    expect(isClaimStateDirectWriteError(err)).toBe(false);
  });

  it('rejects the right message text under the wrong SQLSTATE', () => {
    const err = wrappedPgError({ code: '23505', message: CLAIM_STATE_DIRECT_WRITE_MESSAGE_PREFIX });
    expect(isClaimStateDirectWriteError(err)).toBe(false);
  });

  it('matches by prefix, not substring — a message merely containing the prefix later does not match', () => {
    const err = wrappedPgError({
      code: CLAIM_STATE_DIRECT_WRITE_SQLSTATE,
      message: `some unrelated wrapper text: ${CLAIM_STATE_DIRECT_WRITE_MESSAGE_PREFIX}`,
    });
    expect(isClaimStateDirectWriteError(err)).toBe(false);
  });

  it('rejects a non-Error / non-object input', () => {
    expect(isClaimStateDirectWriteError('nope')).toBe(false);
    expect(isClaimStateDirectWriteError(null)).toBe(false);
    expect(isClaimStateDirectWriteError(undefined)).toBe(false);
  });

  it('ClaimStateDirectWriteError.toErrorResponse carries the code + requestId', () => {
    const e = new ClaimStateDirectWriteError('detail text');
    const response = e.toErrorResponse('req-1');
    expect(response.error.code).toBe('claim.state_direct_write_rejected');
    expect(response.error.request_id).toBe('req-1');
  });
});

describe('isClaimStreamVersionConflict', () => {
  it('recognizes the (stream_id, event_version) unique-violation constraint', () => {
    const err = wrappedPgError({
      code: '23505',
      message: 'duplicate key value violates unique constraint "events_log_stream_id_event_version_uq"',
      constraint: 'events_log_stream_id_event_version_uq',
    });
    expect(isClaimStreamVersionConflict(err)).toBe(true);
  });

  it('rejects a 23505 on a different constraint (e.g. the events_log primary key)', () => {
    const err = wrappedPgError({
      code: '23505',
      message: 'duplicate key value violates unique constraint "events_log_pkey"',
      constraint: 'events_log_pkey',
    });
    expect(isClaimStreamVersionConflict(err)).toBe(false);
  });

  it('rejects a non-23505 error even on the right constraint name', () => {
    const err = wrappedPgError({
      code: '23503',
      message: 'foreign key violation',
      constraint: 'events_log_stream_id_event_version_uq',
    });
    expect(isClaimStreamVersionConflict(err)).toBe(false);
  });
});
