// AR-45 resilience — the jobs-side `ResilientCall` port (Story 9.4, Task 5; AC8). DB-free, timer-free
// (injected clock + sleep). The code-review gap this closes: the only prior AR-45 coverage
// (reconciliation-match.test.ts) constructed `ResilientCall` with `attempts: 1`, so nothing exercised a
// retry-then-succeed path, asserted retry counts, or drove the breaker into its open state — despite the
// story's own Testing Standards requiring exactly that ("throws N then succeeds / always-throws → breaker
// opens... assert retry counts + audit lines + next-tick deferral").

import { describe, expect, it, vi } from 'vitest';

import { ResilientCall, StorageUnavailableError } from '../src/matcher/resilience.js';

/** A deterministic, instant fake clock + sleep — no real timers, no flakiness. */
function fakeClock(startMs = 0) {
  let now = startMs;
  return {
    now: () => now,
    advance: (ms: number) => {
      now += ms;
    },
    sleep: vi.fn(async (ms: number) => {
      now += ms;
    }),
  };
}

describe('ResilientCall — retry-with-backoff', () => {
  it('succeeds on the first attempt without sleeping', async () => {
    const clock = fakeClock();
    const call = new ResilientCall('bank-statement-storage', { now: clock.now, sleep: clock.sleep });
    const fn = vi.fn().mockResolvedValue('bytes');

    await expect(call.run(fn)).resolves.toBe('bytes');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(clock.sleep).not.toHaveBeenCalled();
  });

  it('retries N times then succeeds — asserts the exact retry count + backoff calls', async () => {
    const clock = fakeClock();
    const call = new ResilientCall('bank-statement-storage', { attempts: 3, baseDelayMs: 10, now: clock.now, sleep: clock.sleep });
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('transient 1'))
      .mockRejectedValueOnce(new Error('transient 2'))
      .mockResolvedValueOnce('bytes');

    await expect(call.run(fn)).resolves.toBe('bytes');
    expect(fn).toHaveBeenCalledTimes(3); // 2 failures + 1 success — the exact retry count.
    expect(clock.sleep).toHaveBeenCalledTimes(2); // backoff BETWEEN attempts only, none after the final success.
    expect(call.isOpen).toBe(false); // a recovered call never trips the breaker.
  });

  it('exhausts all attempts and throws StorageUnavailableError("exhausted")', async () => {
    const clock = fakeClock();
    const call = new ResilientCall('bank-statement-storage', { attempts: 3, baseDelayMs: 5, now: clock.now, sleep: clock.sleep });
    const fn = vi.fn().mockRejectedValue(new Error('always down'));

    await expect(call.run(fn)).rejects.toMatchObject({ dependency: 'bank-statement-storage', kind: 'exhausted' });
    expect(fn).toHaveBeenCalledTimes(3); // exactly `attempts` tries, no more.
    expect(clock.sleep).toHaveBeenCalledTimes(2); // backoff between the 3 attempts (2 gaps).
  });

  it('a non-retryable error (TypeError) breaks immediately without exhausting the attempt budget', async () => {
    const clock = fakeClock();
    const call = new ResilientCall('bank-statement-storage', { attempts: 5, now: clock.now, sleep: clock.sleep });
    const fn = vi.fn().mockRejectedValue(new TypeError('bad argument — a real bug, not a transient outage'));

    await expect(call.run(fn)).rejects.toBeInstanceOf(StorageUnavailableError);
    expect(fn).toHaveBeenCalledTimes(1); // never retries a bug.
    expect(clock.sleep).not.toHaveBeenCalled();
  });

  it('a per-attempt timeout counts as a failed attempt and is retried', async () => {
    const clock = fakeClock();
    const call = new ResilientCall('bank-statement-storage', {
      attempts: 2,
      timeoutMs: 5,
      baseDelayMs: 1,
      now: clock.now,
      sleep: clock.sleep,
    });
    // Never resolves within the timeout window on the first attempt; succeeds on the second.
    let attempt = 0;
    const fn = vi.fn(() => {
      attempt += 1;
      if (attempt === 1) return new Promise<string>(() => undefined); // hangs forever — the timeout must fire
      return Promise.resolve('bytes');
    });

    await expect(call.run(fn)).resolves.toBe('bytes');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('ResilientCall — circuit breaker', () => {
  it('opens the breaker after `breakerThreshold` consecutive exhausted runs, then fast-fails without calling fn', async () => {
    const clock = fakeClock();
    const call = new ResilientCall('bank-statement-storage', {
      attempts: 1,
      breakerThreshold: 3,
      breakerCooldownMs: 30_000,
      now: clock.now,
      sleep: clock.sleep,
    });
    const fn = vi.fn().mockRejectedValue(new Error('down'));

    // 3 consecutive exhausted runs trip the breaker (breakerThreshold = 3).
    await expect(call.run(fn)).rejects.toMatchObject({ kind: 'exhausted' });
    await expect(call.run(fn)).rejects.toMatchObject({ kind: 'exhausted' });
    await expect(call.run(fn)).rejects.toMatchObject({ kind: 'exhausted' });
    expect(call.isOpen).toBe(true);
    expect(fn).toHaveBeenCalledTimes(3);

    // The breaker is now OPEN — a 4th call must fast-fail as `circuit_open` WITHOUT invoking fn at all.
    fn.mockClear();
    await expect(call.run(fn)).rejects.toMatchObject({ dependency: 'bank-statement-storage', kind: 'circuit_open' });
    expect(fn).not.toHaveBeenCalled();
  });

  it('closes again after the cooldown elapses, allowing a fresh attempt', async () => {
    const clock = fakeClock();
    const call = new ResilientCall('bank-statement-storage', {
      attempts: 1,
      breakerThreshold: 1,
      breakerCooldownMs: 1_000,
      now: clock.now,
      sleep: clock.sleep,
    });
    const fn = vi.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce('bytes');

    await expect(call.run(fn)).rejects.toMatchObject({ kind: 'exhausted' });
    expect(call.isOpen).toBe(true);

    clock.advance(1_000); // exactly the cooldown window
    expect(call.isOpen).toBe(false);
    await expect(call.run(fn)).resolves.toBe('bytes');
  });

  it('a success resets consecutiveFailures — the breaker only trips on CONSECUTIVE exhausted runs', async () => {
    const clock = fakeClock();
    const call = new ResilientCall('bank-statement-storage', {
      attempts: 1,
      breakerThreshold: 2,
      now: clock.now,
      sleep: clock.sleep,
    });
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('down'))
      .mockResolvedValueOnce('bytes')
      .mockRejectedValueOnce(new Error('down again'));

    await expect(call.run(fn)).rejects.toMatchObject({ kind: 'exhausted' }); // failure 1
    await expect(call.run(fn)).resolves.toBe('bytes'); // success resets the counter
    await expect(call.run(fn)).rejects.toMatchObject({ kind: 'exhausted' }); // failure 1 again (not 2)
    expect(call.isOpen).toBe(false); // never reached breakerThreshold=2 CONSECUTIVELY
  });
});
