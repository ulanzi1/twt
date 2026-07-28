// Helpdesk ticket lifecycle reducer — pure, DB-free unit tests (Story 10.1, Task 7; AC4).
//
// Covers every legal transition; identity on an inapplicable event from EVERY state; unknown /
// forward-compat event → identity; and the load-bearing total/idempotent/prefix-replay property.
// Tests construct HelpdeskEventInput objects directly (no DB). The reducer authors ALL arms; this
// story emits only the genesis, but every transition arm is exercised here.

import { describe, expect, it } from 'vitest';

import {
  HELPDESK_TICKET_STATES,
  type HelpdeskEventInput,
  type HelpdeskTicketState,
  helpdeskTicketStateMachine,
} from '../../src/helpdesk/state.js';

const ev = (type: string, payload: unknown = {}): HelpdeskEventInput => ({ type, payload });
const fold = (events: HelpdeskEventInput[]): HelpdeskTicketState => helpdeskTicketStateMachine.fold(events);
const step = (s: HelpdeskTicketState, e: HelpdeskEventInput): HelpdeskTicketState =>
  helpdeskTicketStateMachine.step(s, e);

const created = ev('helpdesk.ticket_created');

describe('helpdesk ticket reducer — transitions', () => {
  it('initial state is open; genesis is a no-op from initial', () => {
    expect(helpdeskTicketStateMachine.initial).toBe('open');
    expect(fold([created])).toBe('open');
  });

  it('happy path: open → in_progress → awaiting_member → in_progress → resolved → closed', () => {
    expect(
      fold([
        created,
        ev('helpdesk.picked_up'),
        ev('helpdesk.awaiting_member'),
        ev('helpdesk.member_replied'),
        ev('helpdesk.resolved'),
        ev('helpdesk.closed'),
      ]),
    ).toBe('closed');
  });

  it('reopen path: … resolved → reopened → in_progress', () => {
    expect(
      fold([created, ev('helpdesk.picked_up'), ev('helpdesk.resolved'), ev('helpdesk.reopened'), ev('helpdesk.picked_up')]),
    ).toBe('in_progress');
  });

  it('closed → reopened is a legal reducer transition (the 30-day post-close reopen WINDOW itself is enforced by the emitter, not this pure reducer — it has no clock input)', () => {
    expect(
      fold([created, ev('helpdesk.picked_up'), ev('helpdesk.resolved'), ev('helpdesk.closed'), ev('helpdesk.reopened')]),
    ).toBe('reopened');
  });

  it('each single transition advances exactly as specified', () => {
    expect(step('open', ev('helpdesk.picked_up'))).toBe('in_progress');
    expect(step('open', ev('helpdesk.awaiting_member'))).toBe('awaiting_member');
    expect(step('in_progress', ev('helpdesk.awaiting_member'))).toBe('awaiting_member');
    expect(step('awaiting_member', ev('helpdesk.member_replied'))).toBe('in_progress');
    expect(step('in_progress', ev('helpdesk.resolved'))).toBe('resolved');
    expect(step('awaiting_member', ev('helpdesk.resolved'))).toBe('resolved');
    expect(step('resolved', ev('helpdesk.closed'))).toBe('closed');
    expect(step('resolved', ev('helpdesk.reopened'))).toBe('reopened');
    expect(step('closed', ev('helpdesk.reopened'))).toBe('reopened');
    expect(step('reopened', ev('helpdesk.picked_up'))).toBe('in_progress');
  });
});

describe('helpdesk ticket reducer — identity on inapplicable events (TOTAL)', () => {
  it('HELPDESK_TICKET_STATES is exactly the ratified six-state union (pins the array itself, not just its current length, so a silently-dropped/renamed state fails here first)', () => {
    expect(HELPDESK_TICKET_STATES).toEqual(['open', 'in_progress', 'awaiting_member', 'resolved', 'closed', 'reopened']);
  });

  it('genesis from any non-initial state is identity (never regresses to open)', () => {
    for (const s of HELPDESK_TICKET_STATES) {
      expect(step(s, created)).toBe(s);
    }
  });

  it('an unknown / forward-compat event type is identity from every state', () => {
    for (const s of HELPDESK_TICKET_STATES) {
      expect(step(s, ev('helpdesk.some_future_event'))).toBe(s);
      expect(step(s, ev('member.signup_initiated'))).toBe(s);
    }
  });

  it('every transition is a no-op from every state it does not apply to', () => {
    // picked_up only applies from open | reopened.
    for (const s of HELPDESK_TICKET_STATES) {
      if (s !== 'open' && s !== 'reopened') expect(step(s, ev('helpdesk.picked_up'))).toBe(s);
    }
    // awaiting_member only applies from open | in_progress.
    for (const s of HELPDESK_TICKET_STATES) {
      if (s !== 'open' && s !== 'in_progress') expect(step(s, ev('helpdesk.awaiting_member'))).toBe(s);
    }
    // member_replied only applies from awaiting_member.
    for (const s of HELPDESK_TICKET_STATES) {
      if (s !== 'awaiting_member') expect(step(s, ev('helpdesk.member_replied'))).toBe(s);
    }
    // resolved only applies from in_progress | awaiting_member.
    for (const s of HELPDESK_TICKET_STATES) {
      if (s !== 'in_progress' && s !== 'awaiting_member') expect(step(s, ev('helpdesk.resolved'))).toBe(s);
    }
    // closed only applies from resolved.
    for (const s of HELPDESK_TICKET_STATES) {
      if (s !== 'resolved') expect(step(s, ev('helpdesk.closed'))).toBe(s);
    }
    // reopened only applies from resolved | closed.
    for (const s of HELPDESK_TICKET_STATES) {
      if (s !== 'resolved' && s !== 'closed') expect(step(s, ev('helpdesk.reopened'))).toBe(s);
    }
  });
});

describe('helpdesk ticket reducer — determinism + idempotency (load-bearing)', () => {
  const path = [created, ev('helpdesk.picked_up'), ev('helpdesk.awaiting_member'), ev('helpdesk.member_replied'), ev('helpdesk.resolved')];

  it('replaying the same stream twice yields the same state', () => {
    expect(fold(path)).toBe(fold(path));
    expect(fold(path)).toBe('resolved');
  });

  it('re-appending the tail (idempotent redelivery) does not advance past the terminal-for-now state', () => {
    // A duplicated resolve does not move resolved anywhere.
    expect(fold([...path, ev('helpdesk.resolved')])).toBe('resolved');
  });

  it('prefix replay: folding 1..k then k..N equals folding 1..N', () => {
    for (let k = 0; k <= path.length; k += 1) {
      const prefix = helpdeskTicketStateMachine.fold(path.slice(0, k));
      let s = prefix;
      for (const e of path.slice(k)) s = step(s, e);
      expect(s).toBe(fold(path));
    }
  });
});
