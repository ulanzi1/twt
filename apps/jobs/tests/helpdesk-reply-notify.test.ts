// helpdesk_reply notification emitter — DB-free unit tests (Story 10.4, Task 3; AC3).
//
// Covers the PURE Alert builder (+ its wired deep-link), the actor-only skip (no member inbox), the
// fan-out reuse (it routes a real member into `fanOutAlertToMembers`), and the capturing fake.

import { deepLinkTargetForAlert } from '@twt/contracts';
import type pg from 'pg';
import { describe, expect, it, vi } from 'vitest';

import {
  buildHelpdeskReplyAlert,
  consoleHelpdeskReplyNotifier,
  createCapturingHelpdeskReplyNotifier,
  createHelpdeskReplyFanOutNotifier,
  type HelpdeskReplyEvent,
} from '../src/scheduler/helpdesk-reply-notify.js';
import type { ContributionNotifyDeps } from '../src/scheduler/contribution-notify.js';

const PARIWAR = '11111111-1111-1111-1111-111111111111';
const TICKET = '22222222-2222-2222-2222-222222222222';
const MEMBER = '33333333-3333-3333-3333-333333333333';
const ALERT = '44444444-4444-4444-4444-444444444444';
const STAFF = '55555555-5555-5555-5555-555555555555';

const event = (overrides: Partial<HelpdeskReplyEvent> = {}): HelpdeskReplyEvent => ({
  pariwarId: PARIWAR,
  ticketId: TICKET,
  subjectMemberId: MEMBER,
  alertId: ALERT,
  createdByActor: STAFF,
  occurredAt: '2026-08-05T12:00:00.000Z',
  ...overrides,
});

describe('buildHelpdeskReplyAlert', () => {
  it('builds a valid helpdesk_reply Alert addressed to the subject member', () => {
    const alert = buildHelpdeskReplyAlert({ ...event(), subjectMemberId: MEMBER });
    expect(alert.alert_category).toBe('helpdesk_reply');
    expect(alert.member_id).toBe(MEMBER);
    expect(alert.pariwar_id).toBe(PARIWAR);
    expect(alert.time_critical).toBe(false);
    expect(alert.alert_category === 'helpdesk_reply' && alert.payload_data.ticket_id).toBe(TICKET);
  });

  it('resolves the ALREADY-wired deep-link to tickets/:ticketId', () => {
    const alert = buildHelpdeskReplyAlert({ ...event(), subjectMemberId: MEMBER });
    const target = deepLinkTargetForAlert(alert);
    expect(target).toEqual({ pariwarId: PARIWAR, resource: 'tickets', resourceId: TICKET });
  });

  it('accepts a system actor (created_by_actor = "system")', () => {
    const alert = buildHelpdeskReplyAlert({ ...event({ createdByActor: 'system' }), subjectMemberId: MEMBER });
    expect(alert.created_by_actor).toBe('system');
  });
});

describe('createHelpdeskReplyFanOutNotifier — reuses the shipped fan-out', () => {
  /** A pool whose `connect()` is a spy — entering `fanOutAlertToMembers` calls it (via withPariwarScope). */
  function fakePoolWithConnectSpy(): { pool: pg.Pool; connect: ReturnType<typeof vi.fn> } {
    // connect() rejects — fanOutAlertToMembers catches the per-member error (records undelivered) and
    // never rethrows, so the notifier resolves; the spy proves it reached the fan-out for a real member.
    const connect = vi.fn(() => Promise.reject(new Error('connect-not-wired-in-test')));
    return { pool: { connect } as unknown as pg.Pool, connect };
  }

  it('routes a real member into fanOutAlertToMembers (pool.connect is called)', async () => {
    const { pool, connect } = fakePoolWithConnectSpy();
    const deps = { pool } as unknown as ContributionNotifyDeps;
    await createHelpdeskReplyFanOutNotifier(deps)(event());
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it('SKIPS an actor-only ticket (subjectMemberId null) — the fan-out is never entered', async () => {
    const { pool, connect } = fakePoolWithConnectSpy();
    const deps = { pool } as unknown as ContributionNotifyDeps;
    await createHelpdeskReplyFanOutNotifier(deps)(event({ subjectMemberId: null }));
    expect(connect).not.toHaveBeenCalled();
  });
});

describe('consoleHelpdeskReplyNotifier — the log-only production default', () => {
  it('never throws for a member ticket or an actor-only ticket', async () => {
    await expect(consoleHelpdeskReplyNotifier(event())).resolves.toBeUndefined();
    await expect(consoleHelpdeskReplyNotifier(event({ subjectMemberId: null }))).resolves.toBeUndefined();
  });
});

describe('createCapturingHelpdeskReplyNotifier — the test fake', () => {
  it('records every fired event', async () => {
    const cap = createCapturingHelpdeskReplyNotifier();
    await cap.notifier(event());
    await cap.notifier(event({ ticketId: '66666666-6666-6666-6666-666666666666' }));
    expect(cap.events).toHaveLength(2);
    expect(cap.events[0]?.ticketId).toBe(TICKET);
  });
});
