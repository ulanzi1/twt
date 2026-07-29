// Helpdesk member-read pure helpers — DB-free unit tests (Story 10.2, Task 4/8; AC3/AC1).
//
// Covers the forward-compatible reply-thread reader (`replayTicketThread`) against BOTH the live
// genesis-only 10.2 stream AND a seeded genesis+reply stream (proving path (b) with ZERO reader
// change — AC3), plus the subject/body join+split round-trip (AC1). All PURE / DB-free.

import { describe, expect, it } from 'vitest';

import {
  type HelpdeskEventRow,
  joinMemberTicketSubjectBody,
  replayTicketThread,
  splitMemberTicketSubjectBody,
} from '../../src/helpdesk/read.js';

// A minimal event row — only the fields the reader inspects matter; the rest are filler so the
// object satisfies the Drizzle row type.
function row(overrides: Partial<HelpdeskEventRow> & { eventType: string; payload: unknown; eventVersion: number }): HelpdeskEventRow {
  return {
    eventId: `00000000-0000-0000-0000-00000000000${overrides.eventVersion}`,
    streamId: '11111111-1111-1111-1111-111111111111',
    eventType: overrides.eventType,
    payload: overrides.payload,
    eventVersion: overrides.eventVersion,
    occurredAt: new Date(2026, 6, 29, 10, overrides.eventVersion),
    actorId: '22222222-2222-2222-2222-222222222222',
    pariwarId: '33333333-3333-3333-3333-333333333333',
  } as HelpdeskEventRow;
}

const genesis = row({
  eventType: 'helpdesk.ticket_created',
  payload: { actor: 'member', body: 'My KYC upload keeps failing.' },
  eventVersion: 1,
});

describe('replayTicketThread — forward-compatible reply-thread reader (AC3)', () => {
  it('(a) genesis-only stream → a single opening entry from the member', () => {
    const thread = replayTicketThread([genesis]);
    expect(thread).toHaveLength(1);
    expect(thread[0]).toMatchObject({ kind: 'opening', author: 'member', body: 'My KYC upload keeps failing.' });
  });

  it('(b) genesis + seeded reply events → opening + reply entries, SAME reader, zero change', () => {
    // The 10.4 shape is not yet fixed; the reader accepts a `message` (or `body`) field on any
    // non-genesis event. Seed a staff reply and a member reply to prove path (b) now.
    const staffReply = row({
      eventType: 'helpdesk.awaiting_member',
      payload: { actor: 'staff', message: 'Could you re-take the photo in better light?' },
      eventVersion: 2,
    });
    const memberReply = row({
      eventType: 'helpdesk.member_replied',
      payload: { actor: 'member', message: 'Done — re-uploaded just now.' },
      eventVersion: 3,
    });
    const thread = replayTicketThread([genesis, staffReply, memberReply]);
    expect(thread.map((e) => e.kind)).toEqual(['opening', 'staff_reply', 'member_reply']);
    expect(thread.map((e) => e.author)).toEqual(['member', 'staff', 'member']);
    expect(thread[1]?.body).toBe('Could you re-take the photo in better light?');
  });

  it('a pure lifecycle transition (no message) contributes NOTHING to the thread', () => {
    const pickedUp = row({
      eventType: 'helpdesk.picked_up',
      payload: { actor: 'staff', from_state: 'open', to_state: 'in_progress', trigger: 'assignee pickup' },
      eventVersion: 2,
    });
    const thread = replayTicketThread([genesis, pickedUp]);
    expect(thread).toHaveLength(1);
    expect(thread[0]?.kind).toBe('opening');
  });

  it('never surfaces a NAMED individual — every staff/operator/system actor collapses to "staff" (AC2)', () => {
    const opReply = row({ eventType: 'helpdesk.member_replied', payload: { actor: 'operator', message: 'hi' }, eventVersion: 2 });
    const sysReply = row({ eventType: 'helpdesk.closed', payload: { actor: 'system', message: 'auto-closed' }, eventVersion: 3 });
    const thread = replayTicketThread([genesis, opReply, sysReply]);
    expect(thread.slice(1).every((e) => e.author === 'staff')).toBe(true);
  });

  it('ignores a blank/absent message on a non-genesis event', () => {
    const blank = row({ eventType: 'helpdesk.member_replied', payload: { actor: 'member', message: '   ' }, eventVersion: 2 });
    expect(replayTicketThread([genesis, blank])).toHaveLength(1);
  });
});

describe('subject/body join + split round-trip (AC1)', () => {
  it('joins then splits back to the same subject + body', () => {
    const stored = joinMemberTicketSubjectBody('Payment failed', 'I paid twice for this cycle.');
    expect(splitMemberTicketSubjectBody(stored)).toEqual({ subject: 'Payment failed', body: 'I paid twice for this cycle.' });
  });

  it('preserves blank lines WITHIN the body (splits on the FIRST delimiter only)', () => {
    const body = 'First paragraph.\n\nSecond paragraph.';
    const stored = joinMemberTicketSubjectBody('Long note', body);
    expect(splitMemberTicketSubjectBody(stored)).toEqual({ subject: 'Long note', body });
  });

  it('falls back gracefully for a stored body with no delimiter (admin/helpline-created)', () => {
    const result = splitMemberTicketSubjectBody('A single-line ticket body with no subject prefix.');
    expect(result.body).toBe('A single-line ticket body with no subject prefix.');
    expect(result.subject.length).toBeGreaterThan(0);
  });
});
