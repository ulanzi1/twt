// AR-45 resilience wrapper — Story 9.3 (Task 4; AC4). DB-free, deterministic (injected clock + no-op sleep).
//
// The seam earns its keep on the FAILING-adapter path, not the happy path ([[feedback_gate_scope_semantic_coverage]]):
// a green pass over an in-process fake proves nothing, so these vectors drive the retry counts, the
// per-attempt timeout, and the circuit-breaker open/cooldown with a fake that throws N times / always /
// hangs. The upload handler wraps `storage.put` + `scanner.scan` in one of these per dependency.

import { describe, expect, it, vi } from 'vitest';

import { ResilientCall, StorageUnavailableError } from '../../src/modules/reconciliation/resilience.js';

/** A no-op sleep so backoff never burns real time; a controllable clock for breaker-cooldown vectors. */
const noSleep = async (): Promise<void> => undefined;

describe('ResilientCall — retry-with-backoff (AR-45)', () => {
  it('returns immediately on a first-attempt success (no retries — the fake-adapter happy path, no theatre)', async () => {
    const call = new ResilientCall('dep', { sleep: noSleep });
    const fn = vi.fn(async () => 'ok');
    expect(await call.run(fn)).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries a transient failure and succeeds within the budget', async () => {
    const call = new ResilientCall('dep', { attempts: 3, sleep: noSleep });
    let n = 0;
    const fn = vi.fn(async () => {
      n += 1;
      if (n < 3) throw new Error('transient');
      return 'ok';
    });
    expect(await call.run(fn)).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('exhausts the retry budget → StorageUnavailableError(exhausted), original error on .cause', async () => {
    const call = new ResilientCall('bank-statement-storage', { attempts: 3, sleep: noSleep });
    const boom = new Error('gcs down');
    const fn = vi.fn(async () => {
      throw boom;
    });
    await expect(call.run(fn)).rejects.toMatchObject({
      name: 'StorageUnavailableError',
      dependency: 'bank-statement-storage',
      kind: 'exhausted',
      cause: boom,
    });
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('enforces a per-attempt timeout (a hanging call counts as a failed attempt)', async () => {
    const call = new ResilientCall('dep', { attempts: 1, timeoutMs: 10, sleep: noSleep });
    const fn = vi.fn(() => new Promise<string>(() => undefined)); // never resolves
    await expect(call.run(fn)).rejects.toBeInstanceOf(StorageUnavailableError);
  });

  it('a timed-out call that resolves LATE never surfaces as an unhandled promise rejection', async () => {
    const call = new ResilientCall('dep', { attempts: 1, timeoutMs: 10, sleep: noSleep });
    const fn = (): Promise<string> =>
      new Promise((_, reject) => setTimeout(() => reject(new Error('late failure')), 50));
    await expect(call.run(fn)).rejects.toBeInstanceOf(StorageUnavailableError);
    // Let the discarded call's own rejection settle — if it were unobserved, this would surface as an
    // unhandled rejection and fail the test run (vitest's default unhandled-rejection behavior).
    await new Promise((resolve) => setTimeout(resolve, 60));
  });

  it('does NOT retry a programming-bug error (TypeError/RangeError) — fails immediately, no backoff burned', async () => {
    const call = new ResilientCall('dep', { attempts: 3, sleep: noSleep });
    const fn = vi.fn(async () => {
      throw new TypeError('cannot read property of undefined');
    });
    await expect(call.run(fn)).rejects.toMatchObject({ kind: 'exhausted' });
    expect(fn).toHaveBeenCalledTimes(1); // no retries — a bug, not a flaky dependency
  });

  it('a non-retryable error still counts toward the circuit breaker (a real, if instant, failure)', async () => {
    const call = new ResilientCall('dep', { attempts: 3, breakerThreshold: 1, sleep: noSleep });
    await expect(
      call.run(async () => {
        throw new TypeError('bug');
      }),
    ).rejects.toMatchObject({ kind: 'exhausted' });
    expect(call.isOpen).toBe(true);
  });
});

describe('ResilientCall — circuit-breaker (AR-45)', () => {
  it('opens after `breakerThreshold` consecutive exhausted failures, then fast-fails', async () => {
    const clock = 1_000;
    const call = new ResilientCall('dep', {
      attempts: 1,
      breakerThreshold: 2,
      breakerCooldownMs: 5_000,
      sleep: noSleep,
      now: () => clock,
    });
    const fn = async (): Promise<string> => {
      throw new Error('down');
    };

    // Two exhausted failures reach the threshold → breaker opens.
    await expect(call.run(fn)).rejects.toMatchObject({ kind: 'exhausted' });
    await expect(call.run(fn)).rejects.toMatchObject({ kind: 'exhausted' });
    expect(call.isOpen).toBe(true);

    // While open, the next call FAST-FAILS (circuit_open) without invoking fn.
    const spy = vi.fn(async () => 'should-not-run');
    await expect(call.run(spy)).rejects.toMatchObject({ kind: 'circuit_open' });
    expect(spy).not.toHaveBeenCalled();
  });

  it('recovers after the cooldown — a probe runs again and a success closes the breaker', async () => {
    let clock = 0;
    const call = new ResilientCall('dep', {
      attempts: 1,
      breakerThreshold: 1,
      breakerCooldownMs: 1_000,
      sleep: noSleep,
      now: () => clock,
    });
    await expect(call.run(async () => Promise.reject(new Error('down')))).rejects.toMatchObject({
      kind: 'exhausted',
    });
    expect(call.isOpen).toBe(true);

    // Advance past the cooldown → the breaker allows a probe again.
    clock = 2_000;
    expect(call.isOpen).toBe(false);
    expect(await call.run(async () => 'recovered')).toBe('recovered');
    expect(call.isOpen).toBe(false);
  });
});
