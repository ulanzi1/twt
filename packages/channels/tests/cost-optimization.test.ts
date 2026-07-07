// In-app-engagement cost-optimization policy primitive — Story 5.7 (Task 4; AC1, AC2, AC3, AC5).
// DETERMINISTIC: `now` is injected (a fixed Date), NO real clock — mirror cascade.test.ts's discipline.
// Covers the load-bearing decision order (time-critical bypass wins), the fail-safe non-suppression paths,
// the exact-boundary + clock-skew guards, the per-category staleness window, and the PII-free audit line.

import { describe, expect, it } from 'vitest';

import {
  auditCostSuppression,
  COST_OPTIMIZED_CHANNELS,
  DEFAULT_STALENESS_WINDOW_MS,
  evaluateCostOptimization,
  STALENESS_WINDOW_BY_CATEGORY,
  stalenessWindowFor,
  type AuditPort,
  type CostOptimizationInput,
  type CostSuppressionReason,
} from '../src/index.js';

const NOW = new Date('2026-07-07T12:00:00.000Z');

/** A default input: toggle ON, non-time-critical, engaged 1 minute ago (well within any window). */
function baseInput(overrides: Partial<CostOptimizationInput> = {}): CostOptimizationInput {
  return {
    category: 'contribution_confirmed',
    timeCritical: false,
    toggleEnabled: true,
    lastEngagementAt: new Date(NOW.getTime() - 60_000),
    now: NOW,
    ...overrides,
  };
}

describe('COST_OPTIMIZED_CHANNELS — the two PAID cost channels only (AC1 #2)', () => {
  it('is exactly [whatsapp, sms] — push is NEVER in it; telegram is NEVER in it', () => {
    expect([...COST_OPTIMIZED_CHANNELS]).toEqual(['whatsapp', 'sms']);
    expect(COST_OPTIMIZED_CHANNELS).not.toContain('push');
    expect(COST_OPTIMIZED_CHANNELS).not.toContain('telegram');
  });
});

describe('evaluateCostOptimization — decision order (AC3, load-bearing)', () => {
  it('time-critical BYPASSES suppression — even with toggle ON and a within-window engagement', () => {
    const decision = evaluateCostOptimization(baseInput({ timeCritical: true }));
    expect(decision).toEqual({ suppressed: false, reason: 'time_critical' });
  });

  it('time-critical wins even when every other condition would otherwise suppress', () => {
    // Toggle ON + engaged 1s ago: without the override this would suppress; the override must win FIRST.
    const decision = evaluateCostOptimization(
      baseInput({ timeCritical: true, lastEngagementAt: new Date(NOW.getTime() - 1_000) }),
    );
    expect(decision.suppressed).toBe(false);
    expect(decision).toMatchObject({ reason: 'time_critical' });
  });

  it('toggle OFF ⇒ no suppression (fail-safe default), even with a within-window engagement', () => {
    const decision = evaluateCostOptimization(baseInput({ toggleEnabled: false }));
    expect(decision).toEqual({ suppressed: false, reason: 'toggle_off' });
  });

  it('null engagement signal ⇒ no suppression (fail toward reach)', () => {
    const decision = evaluateCostOptimization(baseInput({ lastEngagementAt: null }));
    expect(decision).toEqual({ suppressed: false, reason: 'no_engagement_signal' });
  });
});

describe('evaluateCostOptimization — the staleness window (AC1 #3, AC2)', () => {
  it('within the window ⇒ SUPPRESS exactly [whatsapp, sms] (never push / telegram)', () => {
    // contribution_confirmed window = 12h; engaged 1h ago ⇒ within.
    const decision = evaluateCostOptimization(baseInput({ lastEngagementAt: new Date(NOW.getTime() - 3_600_000) }));
    expect(decision.suppressed).toBe(true);
    if (!decision.suppressed) throw new Error('expected suppression');
    expect([...decision.channels]).toEqual(['whatsapp', 'sms']);
    expect(decision.channels).not.toContain('push');
    expect(decision.channels).not.toContain('telegram');
  });

  it('outside the window ⇒ no suppression (member has not engaged recently)', () => {
    // deadline_reminder window = 30 min; engaged 31 min ago ⇒ outside.
    const decision = evaluateCostOptimization(
      baseInput({ category: 'deadline_reminder', lastEngagementAt: new Date(NOW.getTime() - 31 * 60_000) }),
    );
    expect(decision).toEqual({ suppressed: false, reason: 'no_recent_engagement' });
  });

  it('a future-dated engagement (ageMs < 0, clock skew) ⇒ no suppression', () => {
    const decision = evaluateCostOptimization(baseInput({ lastEngagementAt: new Date(NOW.getTime() + 5_000) }));
    expect(decision).toEqual({ suppressed: false, reason: 'no_recent_engagement' });
  });

  it('an invalid Date (ageMs is NaN) ⇒ no suppression, never a silent fall-through to suppress', () => {
    const decision = evaluateCostOptimization(baseInput({ lastEngagementAt: new Date('not-a-date') }));
    expect(decision).toEqual({ suppressed: false, reason: 'no_recent_engagement' });
  });

  it('the EXACT window boundary (ageMs === window) ⇒ suppress (the window is inclusive)', () => {
    // deadline_reminder window = 30 min; engaged EXACTLY 30 min ago.
    const decision = evaluateCostOptimization(
      baseInput({ category: 'deadline_reminder', lastEngagementAt: new Date(NOW.getTime() - 30 * 60_000) }),
    );
    expect(decision.suppressed).toBe(true);
    if (!decision.suppressed) throw new Error('expected suppression');
    expect(decision.reason.ageMs).toBe(30 * 60_000);
    expect(decision.reason.stalenessWindowMs).toBe(30 * 60_000);
  });

  it('one ms past the boundary (ageMs === window + 1) ⇒ no suppression', () => {
    const decision = evaluateCostOptimization(
      baseInput({ category: 'deadline_reminder', lastEngagementAt: new Date(NOW.getTime() - (30 * 60_000 + 1)) }),
    );
    expect(decision).toEqual({ suppressed: false, reason: 'no_recent_engagement' });
  });
});

describe('stalenessWindowFor — per-category window (AC2)', () => {
  it('the default window is 6 hours (architecture §3.4-committed)', () => {
    expect(DEFAULT_STALENESS_WINDOW_MS).toBe(6 * 60 * 60 * 1000);
  });

  it('deadline_reminder is SHORTER than the default; contribution_confirmed is LONGER', () => {
    expect(stalenessWindowFor('deadline_reminder')).toBeLessThan(DEFAULT_STALENESS_WINDOW_MS);
    expect(stalenessWindowFor('contribution_confirmed')).toBeGreaterThan(DEFAULT_STALENESS_WINDOW_MS);
    expect(stalenessWindowFor('deadline_reminder')).toBe(STALENESS_WINDOW_BY_CATEGORY.deadline_reminder);
  });

  it('an unlisted category falls back to the 6-hour default', () => {
    // claim_status_change has no explicit override.
    expect(STALENESS_WINDOW_BY_CATEGORY.claim_status_change).toBeUndefined();
    expect(stalenessWindowFor('claim_status_change')).toBe(DEFAULT_STALENESS_WINDOW_MS);
  });

  it('an injected override map REPLACES the default map (a later config source overrides without editing the primitive)', () => {
    const overrides = { claim_status_change: 90_000 };
    expect(stalenessWindowFor('claim_status_change', overrides)).toBe(90_000);
    // deadline_reminder is NOT in the injected map ⇒ falls back to the default (map replaced, not merged).
    expect(stalenessWindowFor('deadline_reminder', overrides)).toBe(DEFAULT_STALENESS_WINDOW_MS);
  });

  it('evaluateCostOptimization honours an injected windowMsByCategory override', () => {
    // Inject a tiny 10s window for claim_status_change; engaged 20s ago ⇒ now OUTSIDE ⇒ no suppression.
    const decision = evaluateCostOptimization(
      baseInput({
        category: 'claim_status_change',
        lastEngagementAt: new Date(NOW.getTime() - 20_000),
        windowMsByCategory: { claim_status_change: 10_000 },
      }),
    );
    expect(decision).toEqual({ suppressed: false, reason: 'no_recent_engagement' });
  });
});

describe('CostSuppressionReason — PII-free (AC5)', () => {
  it('carries category + timestamps + config numbers ONLY — no mobile / name / device token', () => {
    const decision = evaluateCostOptimization(baseInput({ lastEngagementAt: new Date(NOW.getTime() - 3_600_000) }));
    if (!decision.suppressed) throw new Error('expected suppression');
    const reason: CostSuppressionReason = decision.reason;
    expect(Object.keys(reason).sort()).toEqual(['ageMs', 'category', 'lastEngagementAt', 'stalenessWindowMs']);
    expect(reason.category).toBe('contribution_confirmed');
    expect(reason.lastEngagementAt).toBe(new Date(NOW.getTime() - 3_600_000).toISOString());
    expect(reason.ageMs).toBe(3_600_000);
    // A PII-free serialization: no '+', '@', or digit-run that looks like a mobile number leaks through.
    const serialized = JSON.stringify(reason);
    expect(serialized).not.toMatch(/\+?\d{10,}/);
  });
});

describe('auditCostSuppression — one best-effort audit line (AC5)', () => {
  const reason: CostSuppressionReason = {
    category: 'contribution_confirmed',
    lastEngagementAt: '2026-07-07T11:00:00.000Z',
    stalenessWindowMs: 12 * 60 * 60 * 1000,
    ageMs: 3_600_000,
  };
  const AUDIT_INPUT = {
    pariwarId: '11111111-1111-1111-1111-111111111111',
    memberId: '22222222-2222-2222-2222-222222222222',
    alertId: '33333333-3333-3333-3333-333333333333',
    reason,
  };

  it('writes ONE line with action=alert.cost_suppression, the reason fields, a 64-hex payload hash + traceId', async () => {
    const calls: Parameters<AuditPort>[0][] = [];
    const audit: AuditPort = (input) => {
      calls.push(input);
      return Promise.resolve();
    };

    await auditCostSuppression(audit, AUDIT_INPUT);

    expect(calls).toHaveLength(1);
    const line = calls[0]!;
    expect(line.action).toBe('alert.cost_suppression');
    expect(line.actorId).toBeNull();
    expect(line.actorRole).toBeNull();
    expect(line.pariwarId).toBe(AUDIT_INPUT.pariwarId);
    expect(line.traceId).toBe(AUDIT_INPUT.alertId);
    expect(line.responseStatus).toBe(200);
    // requestPayloadHash is a SHA-256 hex digest (the writer's Zod regex-validates 64 hex chars).
    expect(line.requestPayloadHash).toMatch(/^[0-9a-f]{64}$/);
    // The resourceLocator carries the non-PII reason fields.
    expect(line.resourceLocator).toContain(`alert:${AUDIT_INPUT.alertId}`);
    expect(line.resourceLocator).toContain(`member:${AUDIT_INPUT.memberId}`);
    expect(line.resourceLocator).toContain('category=contribution_confirmed');
    expect(line.resourceLocator).toContain(`window_ms=${reason.stalenessWindowMs}`);
    expect(line.resourceLocator).toContain(`last_engagement=${reason.lastEngagementAt}`);
    expect(line.resourceLocator).toContain(`age_ms=${reason.ageMs}`);
    // The action satisfies the writer's dotted-lowercase pattern.
    expect(line.action).toMatch(/^[a-z0-9_]+(\.[a-z0-9_]+)+$/);
  });

  it('SWALLOWS a throwing port — a broken audit path never poisons the caller (best-effort)', async () => {
    const throwingPort: AuditPort = () => Promise.reject(new Error('audit DB down'));
    await expect(auditCostSuppression(throwingPort, AUDIT_INPUT)).resolves.toBeUndefined();
  });
});
