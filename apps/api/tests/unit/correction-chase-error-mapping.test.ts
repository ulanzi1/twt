// Story 6.19b (fourth review pass) — the correction chase's error seams, DB-free.
//
//   · `translateLetterError` — J1: the letter precondition's fail-CLOSED hash fault is a RETRYABLE 503
//     `correction_letter.number_unverified` (⛔ never a 409: nothing about the claim is wrong); J4: `-231` D's chronology
//     refusal is a 409 `correction_letter.posted_before_first_delivery`. The live legs are in
//     `tests/integration/claims/correction-chase.spec.ts`; this pins the mapping without a database.
//   · `isDatabaseError` — J3: the correction queue rethrows a DATABASE error at once (it has aborted the shared scope
//     tx; a no-crypto retry could only bury its SQLSTATE under 25P02) and retries only other faults.
//   · `buildServer` — the test-only `logStream` (a `trace`-level logger) is refused outside `nodeEnv === 'test'`.

import { Writable } from 'node:stream';

import { claim } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import type { AppDeps } from '../../src/context.js';
import { ApiError } from '../../src/http-errors.js';
import { translateLetterError } from '../../src/modules/claims/claims.correction-chase.handlers.js';
import { isDatabaseError } from '../../src/modules/claims/claims.nominee-name-check.handlers.js';
import { buildServer } from '../../src/server.js';

const CLAIM = '0b7a3c1e-4d2f-4a8b-9c6d-1e2f3a4b5c6d';

function mapped(err: unknown): ApiError {
  try {
    translateLetterError(err);
  } catch (thrown) {
    if (thrown instanceof ApiError) return thrown;
    throw thrown;
  }
  throw new Error('translateLetterError returned instead of throwing');
}

describe('translateLetterError (Story 6.19b — J1, J4)', () => {
  it('J1 — CorrectionNumberUnverifiedError ⇒ 503 correction_letter.number_unverified, ⛔ carrying no person key', () => {
    const err = mapped(new claim.CorrectionNumberUnverifiedError(CLAIM, 'nominee:7f1c2d3e-0000-4000-8000-000000000001'));
    expect(err.statusCode).toBe(503);
    expect(err.code).toBe('correction_letter.number_unverified');
    expect(err.message).not.toContain('nominee:');
  });

  it('J4 — posted_before_first_delivery ⇒ 409; posted_before_run stays 409', () => {
    const first = mapped(new claim.CorrectionLetterRefusedError(CLAIM, 'posted_before_first_delivery'));
    expect([first.statusCode, first.code]).toEqual([409, 'correction_letter.posted_before_first_delivery']);
    const run = mapped(new claim.CorrectionLetterRefusedError(CLAIM, 'posted_before_run'));
    expect([run.statusCode, run.code]).toEqual([409, 'correction_letter.posted_before_run']);
  });

  it('anything else is rethrown untouched', () => {
    const boom = new Error('boom');
    expect(() => translateLetterError(boom)).toThrow(boom);
  });
});

describe('isDatabaseError (Story 6.19b — J3)', () => {
  it('a SQLSTATE on the error itself, or on a wrapped `.cause` (drizzle), is a database error', () => {
    expect(isDatabaseError(Object.assign(new Error('duplicate key'), { code: '23505' }))).toBe(true);
    expect(isDatabaseError(Object.assign(new Error('aborted'), { code: '25P02' }))).toBe(true);
    expect(isDatabaseError(Object.assign(new Error('fdw'), { code: 'HV00B' }))).toBe(true);
    const wrapped = Object.assign(new Error('Failed query'), { name: 'DrizzleQueryError', cause: Object.assign(new Error('x'), { code: '40P01' }) });
    expect(isDatabaseError(wrapped)).toBe(true);
    expect(isDatabaseError(Object.assign(new Error('x'), { name: 'DatabaseError' }))).toBe(true);
  });

  it('a crypto / network fault is ⛔ not — incl. a five-character Node errno (with or without a digit), a gRPC number, no code at all', () => {
    expect(isDatabaseError(new Error('Unsupported envelope'))).toBe(false);
    expect(isDatabaseError(Object.assign(new Error('pipe'), { code: 'EPIPE' }))).toBe(false);
    // ⭐ A Node errno WITH a digit — the digit lookahead alone would have read it as a SQLSTATE.
    expect(isDatabaseError(Object.assign(new Error('arg list too long'), { code: 'E2BIG' }))).toBe(false);
    expect(isDatabaseError(Object.assign(new Error('x'), { name: 'DrizzleQueryError', cause: Object.assign(new Error('y'), { code: 'E2BIG' }) }))).toBe(false);
    expect(isDatabaseError(Object.assign(new Error('reset'), { code: 'ECONNRESET' }))).toBe(false);
    expect(isDatabaseError(Object.assign(new Error('kms'), { code: 14 }))).toBe(false);
    expect(isDatabaseError(undefined)).toBe(false);
    expect(isDatabaseError('23505')).toBe(false);
  });
});

describe('buildServer — the test-only logStream (Story 6.19b, fourth pass)', () => {
  const sink = new Writable({ write: (_c, _e, cb) => cb() });
  it.each(['production', 'development'])('is refused when nodeEnv is %s', async (nodeEnv) => {
    const deps = { config: { nodeEnv } } as unknown as AppDeps;
    await expect(buildServer(deps, { logStream: sink })).rejects.toThrow(/logStream is test-only/);
  });
});
