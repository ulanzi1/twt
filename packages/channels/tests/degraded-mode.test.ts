// Pariwar-degraded-mode cycle-open SMS-bridge primitive — Story 5.8 (Task 7; AC2).
// PURE + DETERMINISTIC: every input is injected, no clock/DB. Covers the load-bearing decision order and
// the direct-to-SMS channel set (the AR-20 cycle-open carve-out — never push/WA/telegram).

import type { AlertCategory } from '@twt/contracts';
import { describe, expect, it } from 'vitest';

import {
  CYCLE_OPEN_CATEGORY,
  DEGRADED_MODE_BRIDGE_CHANNELS,
  evaluateDegradedModeBridge,
} from '../src/index.js';

describe('DEGRADED_MODE_BRIDGE_CHANNELS — direct-to-SMS only (AC2 #4)', () => {
  it('is exactly [sms] — never push / whatsapp / telegram', () => {
    expect([...DEGRADED_MODE_BRIDGE_CHANNELS]).toEqual(['sms']);
    expect(DEGRADED_MODE_BRIDGE_CHANNELS).not.toContain('push');
    expect(DEGRADED_MODE_BRIDGE_CHANNELS).not.toContain('whatsapp');
    expect(DEGRADED_MODE_BRIDGE_CHANNELS).not.toContain('telegram');
  });

  it('cycle-open maps to alert_published', () => {
    expect(CYCLE_OPEN_CATEGORY).toBe('alert_published');
  });
});

describe('evaluateDegradedModeBridge — decision order (AC2, load-bearing)', () => {
  it('no active declaration ⇒ NOT bridged (no_active_declaration), even for a cycle-open alert', () => {
    const decision = evaluateDegradedModeBridge({ category: 'alert_published', degradedModeActive: false });
    expect(decision).toEqual({ bridged: false, reason: 'no_active_declaration' });
  });

  it('active declaration but a non-cycle-open category ⇒ NOT bridged (category_not_cycle_open)', () => {
    // A representative non-cycle-open category.
    const decision = evaluateDegradedModeBridge({ category: 'deadline_reminder', degradedModeActive: true });
    expect(decision).toEqual({ bridged: false, reason: 'category_not_cycle_open' });
  });

  it('active declaration + cycle-open (alert_published) ⇒ BRIDGE to exactly [sms]', () => {
    const decision = evaluateDegradedModeBridge({ category: 'alert_published', degradedModeActive: true });
    expect(decision.bridged).toBe(true);
    if (!decision.bridged) throw new Error('expected bridge');
    expect([...decision.channels]).toEqual(['sms']);
    expect(decision.channels).not.toContain('push');
    expect(decision.channels).not.toContain('whatsapp');
    expect(decision.channels).not.toContain('telegram');
    expect(decision.reason).toBe('degraded_mode_cycle_open');
  });

  it('NO active declaration wins over cycle-open — the fail-safe default is checked FIRST', () => {
    // Even for alert_published, an inactive declaration must not bridge (the normal ladder applies).
    const decision = evaluateDegradedModeBridge({ category: 'alert_published', degradedModeActive: false });
    expect(decision.bridged).toBe(false);
  });

  it('never bridges any non-cycle-open category, even under an active declaration', () => {
    const nonCycleOpen: AlertCategory[] = [
      'deadline_reminder',
      'contribution_confirmed',
      'contribution_mismatch',
      'claim_status_change',
      'helpdesk_reply',
      'module_new',
      'step_up_otp',
      'niyamavali_amended',
    ];
    for (const category of nonCycleOpen) {
      const decision = evaluateDegradedModeBridge({ category, degradedModeActive: true });
      expect(decision).toEqual({ bridged: false, reason: 'category_not_cycle_open' });
    }
  });

  it('is PURE — same inputs ⇒ same output', () => {
    const input = { category: 'alert_published' as const, degradedModeActive: true };
    expect(evaluateDegradedModeBridge(input)).toEqual(evaluateDegradedModeBridge(input));
  });
});
