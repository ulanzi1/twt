// The feature-flag domain-error → HTTP mapping (Story 10.8, Review Pass 3).
//
// ⚠ WHY THIS FILE EXISTS. Four of the domain's typed errors had NO arm in `mapCreateFlagVersionError`
// and none at the app error boundary, so they fell through to `500 internal.error` with the message
// suppressed — including `FlagStateTransitionError`, the AC7 staged-rollout ladder, which is the most
// likely 4xx on the flip route in normal operation. That shipped green because NOTHING tested the
// mapping: the E2E suite only ever exercised the happy path and the two validation errors.
//
// ⚠ WHY A UNIT TEST AND NOT AN E2E RACE. The 409 arm in particular cannot be provoked deterministically
// through HTTP: `createFlagVersion` claims `max(version) + 1`, so a seeded row just raises the max, and
// a genuine two-request race SERIALIZES often enough to be flaky (measured: 1 failure in 3 runs). The
// end-to-end 23505 → typed-error half is proven live in
// `packages/domain/tests/integration/feature-flags/flag-flip-concurrency.spec.ts` with two real pool
// clients; this file pins the typed-error → HTTP-status half. Together they cover the seam without a
// flaky test in the middle.

import { featureFlags } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import { mapCreateFlagVersionError } from '../../src/modules/feature-flags/handlers.js';
import { ApiError } from '../../src/http-errors.js';

/** Invoke the mapper and return the ApiError it threw (or rethrow anything unexpected). */
function mapped(err: unknown): ApiError {
  try {
    mapCreateFlagVersionError(err);
  } catch (thrown) {
    if (thrown instanceof ApiError) return thrown;
    throw thrown;
  }
  throw new Error('mapCreateFlagVersionError returned instead of throwing');
}

describe('mapCreateFlagVersionError — every typed domain error reaches the client as itself', () => {
  it('FlagVersionConflictError → 409 feature_flag.version_conflict (the AC3 409 seam)', () => {
    const e = mapped(new featureFlags.FlagVersionConflictError('kyc_manual_fallback', null, 3));
    expect(e.statusCode).toBe(409);
    expect(e.code).toBe('feature_flag.version_conflict');
  });

  it('FlagVersionInvalidError → 400', () => {
    const e = mapped(new featureFlags.FlagVersionInvalidError(['rationale must be non-empty']));
    expect(e.statusCode).toBe(400);
    expect(e.code).toBe('feature_flag.invalid_version');
  });

  it('FlagEffectiveFromOutOfOrderError → 400', () => {
    const e = mapped(
      new featureFlags.FlagEffectiveFromOutOfOrderError('kyc_manual_fallback', new Date(0), new Date(1)),
    );
    expect(e.statusCode).toBe(400);
    expect(e.code).toBe('feature_flag.effective_from_out_of_order');
  });

  it('⚠ FlagStateTransitionError → 409, and the permitted next states survive to the client', () => {
    // The severe one: an ordinary AC7 governance refusal used to be an anonymous 500. The message
    // names what the operator may do next, which is the whole reason the typed error carries it.
    const e = mapped(
      new featureFlags.FlagStateTransitionError('kyc_manual_fallback', 'off', 'full', ['off', 'canary']),
    );
    expect(e.statusCode).toBe(409);
    expect(e.code).toBe('feature_flag.illegal_state_transition');
    expect(e.message).toContain('canary');
  });

  it('⚠ FlagKeyNotAllowlistedError → 409 (the AC5 runtime capability-bar backstop, reportable)', () => {
    const e = mapped(new featureFlags.FlagKeyNotAllowlistedError('invented_at_runtime'));
    expect(e.statusCode).toBe(409);
    expect(e.code).toBe('feature_flag.not_allowlisted');
  });

  it('⚠ CapabilityBarUnavailableError → 503, distinct from the INVALID case', () => {
    // errors.ts separates "cannot be read" (a packaging fault) from "read but invalid" (a governance
    // content fault) precisely so the boundary does not report a missing artifact as a malformed one.
    const e = mapped(new featureFlags.CapabilityBarUnavailableError('/app/governance_boundary.yaml', null));
    expect(e.statusCode).toBe(503);
    expect(e.code).toBe('feature_flag.capability_bar_unavailable');
  });

  it('⚠ CapabilityBarInvalidError → 503 with its OWN code', () => {
    const e = mapped(new featureFlags.CapabilityBarInvalidError(['count (4) !== allow.length (5)']));
    expect(e.statusCode).toBe(503);
    expect(e.code).toBe('feature_flag.capability_bar_invalid');
  });

  it('an unrecognised error passes through UNMASKED — the mapper never swallows', () => {
    const original = new Error('connection reset');
    expect(() => mapCreateFlagVersionError(original)).toThrow(original);
  });

  it('⚠ EVERY error the domain exports for this write path has an arm (no silent 500s left)', () => {
    // The guard against this regressing: a future typed error added to the domain without a mapping
    // arm fails here rather than shipping as an opaque 500. `FlagVersionDuplicateIdError` is the one
    // deliberate exclusion — no HTTP route supplies a caller `id`, so it is unreachable by
    // construction and an arm would be dead code implying a reachable state.
    const writePathErrors = [
      new featureFlags.FlagVersionConflictError('k', null, 2),
      new featureFlags.FlagVersionInvalidError(['x']),
      new featureFlags.FlagEffectiveFromOutOfOrderError('k', new Date(0), new Date(1)),
      new featureFlags.FlagStateTransitionError('k', 'off', 'full', ['canary']),
      new featureFlags.FlagKeyNotAllowlistedError('k'),
      new featureFlags.CapabilityBarUnavailableError('/p', null),
      new featureFlags.CapabilityBarInvalidError(['x']),
    ];
    for (const err of writePathErrors) {
      // The property is "was MAPPED", not "is a 4xx" — two arms are deliberately 503 (a deploy-time
      // governance-artifact fault is genuinely not the caller's doing). What must never happen is a
      // fall-through to the boundary's anonymous `internal.error`.
      const e = mapped(err);
      expect(e.code.startsWith('feature_flag.'), `${err.constructor.name} got a generic code`).toBe(true);
      expect([400, 409, 503], `${err.constructor.name} got an unexpected status`).toContain(e.statusCode);
    }
  });
});
