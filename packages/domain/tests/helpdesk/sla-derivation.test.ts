// Helpdesk SLA-timer / breach / severity derivations — DB-free unit tests (Story 10.4, Task 2; AC4).
//
// Covers the PURE presentation derivations in helpdesk/sla.ts: `slaTimerRunning` (per state),
// `slaBreached` (running + past-due), `slaTimerStatus`, `ticketSeverity`, and the composite
// `deriveSlaStatus`. No DB — these are the yogdaan-status-style pure derivations.

import { describe, expect, it } from 'vitest';

import { HELPDESK_TICKET_STATES, type HelpdeskTicketState } from '../../src/helpdesk/state.js';
import {
  SLA_DUE_SOON_WINDOW_MS,
  deriveSlaStatus,
  slaBreached,
  slaTimerRunning,
  slaTimerStatus,
  ticketSeverity,
} from '../../src/helpdesk/sla.js';

const NOW = new Date('2026-08-05T12:00:00.000Z');
const RUNNING: HelpdeskTicketState[] = ['open', 'in_progress', 'reopened'];
const STOPPED: HelpdeskTicketState[] = ['awaiting_member', 'resolved', 'closed'];

describe('slaTimerRunning — running iff the ticket awaits staff action', () => {
  it('runs in open / in_progress / reopened', () => {
    for (const s of RUNNING) expect(slaTimerRunning(s)).toBe(true);
  });
  it('is stopped in awaiting_member / resolved / closed', () => {
    for (const s of STOPPED) expect(slaTimerRunning(s)).toBe(false);
  });
  it('covers every state (the union has no unclassified member)', () => {
    for (const s of HELPDESK_TICKET_STATES) expect(typeof slaTimerRunning(s)).toBe('boolean');
  });
});

describe('slaBreached — running AND strictly past due', () => {
  const pastDue = new Date(NOW.getTime() - 60_000);
  const future = new Date(NOW.getTime() + 60_000);

  it('a running, past-due timer is breached', () => {
    expect(slaBreached(pastDue, NOW, 'in_progress')).toBe(true);
  });
  it('a running, not-yet-due timer is NOT breached', () => {
    expect(slaBreached(future, NOW, 'open')).toBe(false);
  });
  it('a STOPPED ticket is never breached even when past its original due instant', () => {
    for (const s of STOPPED) expect(slaBreached(pastDue, NOW, s)).toBe(false);
  });
  it('exactly at the due instant is NOT breached (strict past-due; boundary)', () => {
    expect(slaBreached(NOW, NOW, 'open')).toBe(false);
  });
});

describe('slaTimerStatus — per-timer status', () => {
  it('reports msRemaining, running, and breached together', () => {
    const t = slaTimerStatus(new Date(NOW.getTime() + 3_600_000), NOW, 'open');
    expect(t.running).toBe(true);
    expect(t.breached).toBe(false);
    expect(t.msRemaining).toBe(3_600_000);
  });
  it('a stopped timer reports running:false + breached:false but keeps msRemaining for display', () => {
    const t = slaTimerStatus(new Date(NOW.getTime() - 3_600_000), NOW, 'resolved');
    expect(t.running).toBe(false);
    expect(t.breached).toBe(false);
    expect(t.msRemaining).toBe(-3_600_000);
  });
});

describe('ticketSeverity — breached ≻ due_soon ≻ on_track', () => {
  const running = (msRemaining: number) => slaTimerStatus(new Date(NOW.getTime() + msRemaining), NOW, 'open');
  const stopped = (msRemaining: number) => slaTimerStatus(new Date(NOW.getTime() + msRemaining), NOW, 'resolved');

  it('breached when either timer is breached', () => {
    expect(ticketSeverity(running(-1), running(10_000_000))).toBe('breached');
    expect(ticketSeverity(running(10_000_000), running(-1))).toBe('breached');
  });
  it('due_soon when a running timer is within the window but none breached', () => {
    expect(ticketSeverity(running(SLA_DUE_SOON_WINDOW_MS - 1), running(10_000_000))).toBe('due_soon');
  });
  it('on_track when both running timers are comfortably ahead (beyond the due-soon window)', () => {
    // Both timers must be MORE than SLA_DUE_SOON_WINDOW_MS (4h) ahead — a value inside the window is
    // correctly due_soon (asserted below), so use a comfortably-larger lead.
    const ahead = SLA_DUE_SOON_WINDOW_MS + 10_000_000;
    expect(ticketSeverity(running(ahead), running(ahead))).toBe('on_track');
  });
  it('a stopped, past-due timer never escalates severity (on_track)', () => {
    expect(ticketSeverity(stopped(-10_000_000), stopped(-10_000_000))).toBe('on_track');
  });
  it('exactly at the window boundary is due_soon (inclusive)', () => {
    expect(ticketSeverity(running(SLA_DUE_SOON_WINDOW_MS), running(10_000_000))).toBe('due_soon');
  });
});

describe('deriveSlaStatus — the composite the console renders', () => {
  it('a fresh open ticket well ahead of both due instants → on_track, both running', () => {
    const status = deriveSlaStatus(
      {
        currentState: 'open',
        slaFirstResponseDue: new Date(NOW.getTime() + 20 * 3_600_000),
        slaResolutionDue: new Date(NOW.getTime() + 5 * 24 * 3_600_000),
      },
      NOW,
    );
    expect(status.severity).toBe('on_track');
    expect(status.firstResponse.running).toBe(true);
    expect(status.resolution.running).toBe(true);
  });

  it('an in_progress ticket past its first-response due → breached', () => {
    const status = deriveSlaStatus(
      {
        currentState: 'in_progress',
        slaFirstResponseDue: new Date(NOW.getTime() - 3_600_000),
        slaResolutionDue: new Date(NOW.getTime() + 3 * 24 * 3_600_000),
      },
      NOW,
    );
    expect(status.severity).toBe('breached');
    expect(status.firstResponse.breached).toBe(true);
  });

  it('an awaiting_member ticket past both due instants → on_track (timers paused)', () => {
    const status = deriveSlaStatus(
      {
        currentState: 'awaiting_member',
        slaFirstResponseDue: new Date(NOW.getTime() - 3_600_000),
        slaResolutionDue: new Date(NOW.getTime() - 3_600_000),
      },
      NOW,
    );
    expect(status.severity).toBe('on_track');
    expect(status.resolution.running).toBe(false);
    expect(status.resolution.breached).toBe(false);
  });
});
