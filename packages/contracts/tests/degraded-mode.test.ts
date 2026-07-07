// Degraded-mode contract tests — Story 5.8 (Task 7; AC4).
//
// (1) `.strict()` discipline; (2) the NO-BACKDATING refine on effectiveFrom (AC4 #8); (3) the mode enum;
// (4) the declaration + active response shapes.

import { describe, expect, it } from 'vitest';

import {
  DegradedModeActiveResponse,
  DegradedModeDeclarationResponse,
  DegradedModeDeclareRequest,
  NO_BACKDATE_GRACE_MS,
} from '../src/degraded-mode/index.js';

describe('DegradedModeDeclareRequest', () => {
  it('accepts a minimal declaration (mode + reason; effectiveFrom omitted ⇒ server defaults to now)', () => {
    const parsed = DegradedModeDeclareRequest.parse({ mode: 'cycle_open_sms_bridge', reason: 'push infra down' });
    expect(parsed.mode).toBe('cycle_open_sms_bridge');
    expect(parsed.effectiveFrom).toBeUndefined();
    expect(parsed.reason).toBe('push infra down');
  });

  it('accepts a now-or-future effectiveFrom', () => {
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    expect(() =>
      DegradedModeDeclareRequest.parse({ mode: 'cycle_open_sms_bridge', effectiveFrom: future, reason: 'r' }),
    ).not.toThrow();
  });

  it('REJECTS a backdated effectiveFrom (NO BACKDATING — AC4 #8)', () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // a day ago, well past the grace
    const result = DegradedModeDeclareRequest.safeParse({
      mode: 'cycle_open_sms_bridge',
      effectiveFrom: past,
      reason: 'r',
    });
    expect(result.success).toBe(false);
  });

  it('accepts a value within the clock-skew grace (not treated as backdating)', () => {
    const withinGrace = new Date(Date.now() - NO_BACKDATE_GRACE_MS / 2).toISOString();
    expect(() =>
      DegradedModeDeclareRequest.parse({ mode: 'cycle_open_sms_bridge', effectiveFrom: withinGrace, reason: 'r' }),
    ).not.toThrow();
  });

  it('accepts a null / omitted expiresAt (open-ended)', () => {
    expect(() =>
      DegradedModeDeclareRequest.parse({ mode: 'cycle_open_sms_bridge', expiresAt: null, reason: 'r' }),
    ).not.toThrow();
    expect(() =>
      DegradedModeDeclareRequest.parse({ mode: 'cycle_open_sms_bridge', reason: 'r' }),
    ).not.toThrow();
  });

  it('REJECTS an expiresAt at or before effectiveFrom (would auto-revoke real coverage with a dead-on-arrival row)', () => {
    const effectiveFrom = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const sameInstant = effectiveFrom;
    const before = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    expect(
      DegradedModeDeclareRequest.safeParse({ mode: 'cycle_open_sms_bridge', effectiveFrom, expiresAt: sameInstant, reason: 'r' }).success,
    ).toBe(false);
    expect(
      DegradedModeDeclareRequest.safeParse({ mode: 'cycle_open_sms_bridge', effectiveFrom, expiresAt: before, reason: 'r' }).success,
    ).toBe(false);
  });

  it('REJECTS an expiresAt in the past when effectiveFrom is omitted (compared against now)', () => {
    const past = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    expect(
      DegradedModeDeclareRequest.safeParse({ mode: 'cycle_open_sms_bridge', expiresAt: past, reason: 'r' }).success,
    ).toBe(false);
  });

  it('accepts an expiresAt safely after effectiveFrom', () => {
    const effectiveFrom = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    expect(
      DegradedModeDeclareRequest.safeParse({ mode: 'cycle_open_sms_bridge', effectiveFrom, expiresAt, reason: 'r' }).success,
    ).toBe(true);
  });

  it('rejects an unknown mode, an empty reason, and unknown keys (.strict())', () => {
    expect(DegradedModeDeclareRequest.safeParse({ mode: 'something_else', reason: 'r' }).success).toBe(false);
    expect(DegradedModeDeclareRequest.safeParse({ mode: 'cycle_open_sms_bridge', reason: '' }).success).toBe(false);
    expect(
      DegradedModeDeclareRequest.safeParse({ mode: 'cycle_open_sms_bridge', reason: 'r', extra: 1 }).success,
    ).toBe(false);
  });
});

describe('DegradedModeDeclarationResponse / DegradedModeActiveResponse', () => {
  const decl = {
    id: '11111111-1111-1111-1111-111111111111',
    mode: 'cycle_open_sms_bridge' as const,
    effectiveFrom: '2026-07-07T12:00:00.000Z',
    expiresAt: null,
    revokedAt: null,
    declaredByActor: '22222222-2222-2222-2222-222222222222',
    reason: 'push infra down',
  };

  it('parses a declaration DTO', () => {
    expect(() => DegradedModeDeclarationResponse.parse(decl)).not.toThrow();
  });

  it('the active response carries the declaration or null', () => {
    expect(DegradedModeActiveResponse.parse({ active: decl }).active).not.toBeNull();
    expect(DegradedModeActiveResponse.parse({ active: null }).active).toBeNull();
  });

  it('rejects unknown keys (.strict())', () => {
    expect(DegradedModeDeclarationResponse.safeParse({ ...decl, extra: 1 }).success).toBe(false);
    expect(DegradedModeActiveResponse.safeParse({ active: null, extra: 1 }).success).toBe(false);
  });
});
