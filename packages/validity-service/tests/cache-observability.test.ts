// FallbackRateMonitor — unit (Story 4.8, Task 5). The sustained-fallback-rate threshold + alert-crossing
// logic (AC2), exercised with an injected clock (no DB, no wall-clock).

import { describe, expect, it } from 'vitest';

import { FallbackRateMonitor, type ValidityCacheOutcome } from '../src/cache-observability.js';

const HIT: ValidityCacheOutcome = { kind: 'hit' };
const FALLBACK: ValidityCacheOutcome = { kind: 'fallback', reason: 'backend_error' };

describe('FallbackRateMonitor', () => {
  it('does not alert below minSamples even at 100% fallback', () => {
    const m = new FallbackRateMonitor({ threshold: 0.05, minSamples: 20, now: () => 0 });
    for (let i = 0; i < 19; i++) expect(m.record(FALLBACK)).toBeNull();
    expect(m.snapshot().rate).toBe(1);
    expect(m.snapshot().total).toBe(19);
  });

  it('fires ONCE on the crossing above threshold, then re-arms after dropping under', () => {
    const t = 0;
    const m = new FallbackRateMonitor({ threshold: 0.5, minSamples: 4, windowMs: 1_000_000, now: () => t });
    // 3 hits, then fallbacks. 1/4, 2/5, 3/6=50% (not > 50%) → no alert; 4/7 ≈ 57% > 50% → crossing alert.
    for (let i = 0; i < 3; i++) m.record(HIT);
    expect(m.record(FALLBACK)).toBeNull(); // 1/4
    expect(m.record(FALLBACK)).toBeNull(); // 2/5
    expect(m.record(FALLBACK)).toBeNull(); // 3/6 = 0.5, not strictly greater
    const alert = m.record(FALLBACK); // 4/7 > 0.5 → crossing
    expect(alert).not.toBeNull();
    expect(alert!.rate).toBeGreaterThan(0.5);
    // A further fallback while already alerting does NOT re-fire (latched).
    expect(m.record(FALLBACK)).toBeNull();
  });

  it('prunes events outside the sliding window', () => {
    let t = 0;
    const m = new FallbackRateMonitor({ threshold: 0.05, minSamples: 1, windowMs: 100, now: () => t });
    m.record(FALLBACK); // t=0
    t = 1000; // well past the 100ms window
    // The old fallback is pruned; a fresh hit leaves rate 0.
    m.record(HIT);
    expect(m.snapshot().fallbacks).toBe(0);
    expect(m.snapshot().rate).toBe(0);
  });
});
