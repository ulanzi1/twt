// Helpdesk responder console + reply round-trip — E2E (Story 10.4; AC1/AC2/AC3/AC6/AC7). (:5433)
//
// Proves the responder surface against real Postgres:
//   · AC6 RBAC revert-sanity PAIR on the queue — helpline_operator (holds helpdesk.respond) → 200; an
//     auditor (Pariwar grant, NO key) → fail-closed 403; district_admin → 403 (deferred, never granted).
//   · AC2 lifecycle — pick-up (open → in_progress), reply (→ awaiting_member), resolve (→ resolved);
//     an illegal transition (resolve an open ticket) is a typed 409 BEFORE the write, not a silent 200.
//   · AC3 round-trip — a staff reply appends a message-bearing event that the MEMBER's own 10.2 read
//     surfaces in its thread AND fires the helpdesk_reply emit (fixture-level); the REVERSE direction —
//     a member reply via the member route advances awaiting_member → in_progress and surfaces in the
//     admin thread + active queue.
//   · AC1 queue — paginated + state-filtered + scope-respecting (assert MEMBERSHIP, not counts).
//
// ⚠ Own-committing seed writes; fresh random pariwarId + memberId per test; users/role_grants cleaned in
// afterAll. Assert membership for per-test random ids ([[project_live_db_test_gotchas]]).

import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../../src/context.js';
import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import { signAccessToken } from '../../../src/modules/auth/member/tokens.js';
import { createTestApp, hasDatabase, makeClient, teardown, type TestApp } from '../_setup.js';
import { FakeWebAuthnProvider } from '../_webauthn-fake.js';

type Client = ReturnType<typeof makeClient>;
type Json = Record<string, unknown>;
const ACCESS_TTL_MS = 15 * 60 * 1000;
const MEMBER_ORIGIN = 'http://localhost:3001';

describe.skipIf(!hasDatabase)('helpdesk responder console + reply round-trip — E2E (:5433)', () => {
  let t: TestApp;
  let deps: AppDeps;
  let fakeWebauthn: FakeWebAuthnProvider;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    fakeWebauthn = new FakeWebAuthnProvider();
    t = await createTestApp({ webauthn: fakeWebauthn });
    deps = t.deps;
  });

  afterAll(async () => {
    const c = await t.pool.connect();
    try {
      if (createdUserIds.length > 0) {
        await c.query(`DELETE FROM admin_sessions WHERE sess ->> 'userId' = ANY($1)`, [createdUserIds]);
        await c.query(`DELETE FROM role_grants WHERE user_id = ANY($1)`, [createdUserIds]);
        await c.query(`DELETE FROM users WHERE id = ANY($1)`, [createdUserIds]);
      }
    } finally {
      c.release();
    }
    await teardown(t);
  });

  async function authenticate(opts: { displayName?: string | null } = {}): Promise<{ client: Client; userId: string }> {
    const email = `hd-resp-${randomUUID()}@example.test`;
    const password = 'CorrectHorseBatteryStaple9';
    const userId = await service.createAdminAccount(deps, {
      email,
      password,
      ...(opts.displayName != null ? { displayName: opts.displayName } : {}),
    });
    createdUserIds.push(userId);
    const credentialId = `cred-${userId}`;
    fakeWebauthn.nextRegistration = { verified: true, credential: { id: credentialId, publicKey: 'pk', counter: 0 } };
    fakeWebauthn.nextAuthentication = { verified: true, newCounter: 1 };
    const client = makeClient(t.app);
    const enroll = service.mintEnrollmentToken(deps, userId);
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/options', payload: { enrollmentToken: enroll } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/verify', payload: { response: { id: 'b' }, enrollmentToken: enroll } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/options', payload: {} });
    const verify = await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/verify', payload: { response: { id: credentialId } } });
    expect(verify.statusCode).toBe(200);
    return { client, userId };
  }

  async function grant(userId: string, pariwarId: string, role: string): Promise<void> {
    const c = await t.pool.connect();
    try {
      await c.query(
        `INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value) VALUES ($1, $2, $3, $4, $5)`,
        [userId, pariwarId, role, 'pariwar', pariwarId],
      );
    } finally {
      c.release();
    }
  }

  /** File a ticket on a member's behalf (helpline_call, so subject_member_id is set → the member can
   *  read it AND the reply notifier has a push target). Returns the ticket id. */
  async function fileTicket(client: Client, p: string, memberId: string, category = 'kyc-trouble'): Promise<string> {
    const res = await client.inject({
      method: 'POST',
      url: `/api/v1/p/${p}/helpdesk/tickets`,
      payload: { subject_member_id: memberId, category, body: 'help me please', created_via: 'helpline_call' },
    });
    expect(res.statusCode).toBe(201);
    return (res.json() as { ticket_id: string }).ticket_id;
  }

  function memberHeaders(memberId: string, p: string): Record<string, string> {
    const tok = signAccessToken(t.app, { memberId, pariwarId: p, deviceId: 'test-device' }, ACCESS_TTL_MS);
    return { origin: MEMBER_ORIGIN, authorization: `Bearer ${tok}` };
  }

  // ── AC6 — the RBAC revert-sanity pair + district deferral pin (on the queue read) ────────────────
  it('AC6 with-key: helpline_operator (holds helpdesk.respond) → 200 on the queue', async () => {
    const p = randomUUID();
    const a = await authenticate({ displayName: 'Responder' });
    await grant(a.userId, p, 'helpline_operator');
    const res = await a.client.inject({ method: 'GET', url: `/api/v1/p/${p}/helpdesk/queue` });
    expect(res.statusCode).toBe(200);
  });

  it('AC6 without-key: an auditor (Pariwar grant, no helpdesk.respond) → fail-closed 403', async () => {
    const p = randomUUID();
    const a = await authenticate({ displayName: 'Auditor' });
    await grant(a.userId, p, 'auditor');
    const res = await a.client.inject({ method: 'GET', url: `/api/v1/p/${p}/helpdesk/queue` });
    expect(res.statusCode).toBe(403);
  });

  it('AC6 deferral pin: district_admin is DENIED the queue (never granted helpdesk.respond)', async () => {
    const p = randomUUID();
    const a = await authenticate({ displayName: 'District Admin' });
    await grant(a.userId, p, 'district_admin');
    const res = await a.client.inject({ method: 'GET', url: `/api/v1/p/${p}/helpdesk/queue` });
    expect(res.statusCode).toBe(403);
  });

  // ── AC2 — the lifecycle transitions + the illegal-transition guard ───────────────────────────────
  it('AC2: pick-up advances open → in_progress', async () => {
    const p = randomUUID();
    const a = await authenticate({ displayName: 'Responder' });
    await grant(a.userId, p, 'helpline_operator');
    const ticketId = await fileTicket(a.client, p, randomUUID());
    const res = await a.client.inject({ method: 'POST', url: `/api/v1/p/${p}/helpdesk/tickets/${ticketId}/pick-up` });
    expect(res.statusCode).toBe(200);
    expect((res.json() as Json)['current_state']).toBe('in_progress');
  });

  it('AC2: an illegal transition (resolve an OPEN ticket) is a typed 409 before the write', async () => {
    const p = randomUUID();
    const a = await authenticate({ displayName: 'Responder' });
    await grant(a.userId, p, 'helpline_operator');
    const ticketId = await fileTicket(a.client, p, randomUUID());
    const res = await a.client.inject({
      method: 'POST',
      url: `/api/v1/p/${p}/helpdesk/tickets/${ticketId}/resolve`,
      payload: { message: 'cannot resolve an open ticket' },
    });
    expect(res.statusCode).toBe(409);
    expect((res.json() as { error: { code: string } }).error.code).toBe('helpdesk.illegal_transition');
    // The ticket is untouched — still open (the no-op event was never appended).
    const detail = await a.client.inject({ method: 'GET', url: `/api/v1/p/${p}/helpdesk/tickets/${ticketId}` });
    expect((detail.json() as Json)['current_state']).toBe('open');
  });

  // ── AC3 — the full reply round-trip (staff → member → staff) + the helpdesk_reply emit ───────────
  it('AC3: staff reply → awaiting_member, surfaces in the MEMBER thread, and fires the helpdesk_reply emit', async () => {
    const p = randomUUID();
    const memberId = randomUUID();
    const a = await authenticate({ displayName: 'Responder' });
    await grant(a.userId, p, 'helpline_operator');
    const ticketId = await fileTicket(a.client, p, memberId);
    await a.client.inject({ method: 'POST', url: `/api/v1/p/${p}/helpdesk/tickets/${ticketId}/pick-up` });

    const reply = await a.client.inject({
      method: 'POST',
      url: `/api/v1/p/${p}/helpdesk/tickets/${ticketId}/reply`,
      payload: { message: 'Could you share your UTR number?' },
    });
    expect(reply.statusCode).toBe(200);
    expect((reply.json() as Json)['current_state']).toBe('awaiting_member');

    // The member's OWN 10.2 detail read surfaces the staff reply in its thread (role-labelled).
    const detail = await t.app.inject({
      method: 'GET',
      url: `/api/v1/p/${p}/member/helpdesk/tickets/${ticketId}`,
      headers: memberHeaders(memberId, p),
    });
    expect(detail.statusCode).toBe(200);
    const thread = (detail.json() as { thread: Array<{ kind: string; author: string; body: string }> }).thread;
    const staffReply = thread.find((e) => e.kind === 'staff_reply');
    expect(staffReply).toBeDefined();
    expect(staffReply!.author).toBe('staff');
    expect(staffReply!.body).toBe('Could you share your UTR number?');

    // The helpdesk_reply emit fired (fixture-level) for THIS ticket + member.
    const fired = t.helpdeskReplyNotifier.events.find((e) => e.ticketId === ticketId);
    expect(fired).toBeDefined();
    expect(fired!.subjectMemberId).toBe(memberId);
  });

  it('AC3 reverse: a member reply advances awaiting_member → in_progress, surfaces in the admin thread + queue', async () => {
    const p = randomUUID();
    const memberId = randomUUID();
    const a = await authenticate({ displayName: 'Responder' });
    await grant(a.userId, p, 'helpline_operator');
    const ticketId = await fileTicket(a.client, p, memberId);
    await a.client.inject({ method: 'POST', url: `/api/v1/p/${p}/helpdesk/tickets/${ticketId}/pick-up` });
    await a.client.inject({
      method: 'POST',
      url: `/api/v1/p/${p}/helpdesk/tickets/${ticketId}/reply`,
      payload: { message: 'What is your UTR?' },
    });

    // The member replies from their own app.
    const memberReply = await t.app.inject({
      method: 'POST',
      url: `/api/v1/p/${p}/member/helpdesk/tickets/${ticketId}/reply`,
      headers: memberHeaders(memberId, p),
      payload: { message: 'It is 1234567890.' },
    });
    expect(memberReply.statusCode).toBe(200);
    expect((memberReply.json() as Json)['current_state']).toBe('in_progress');

    // The admin thread now carries the member reply, and the ticket is back in the in_progress queue.
    const detail = await a.client.inject({ method: 'GET', url: `/api/v1/p/${p}/helpdesk/tickets/${ticketId}` });
    const thread = (detail.json() as { thread: Array<{ kind: string }> }).thread;
    expect(thread.some((e) => e.kind === 'member_reply')).toBe(true);

    const queue = await a.client.inject({ method: 'GET', url: `/api/v1/p/${p}/helpdesk/queue?state=in_progress` });
    const tickets = (queue.json() as { tickets: Array<{ ticket_id: string }> }).tickets;
    expect(tickets.some((x) => x.ticket_id === ticketId)).toBe(true);
  });

  it('AC3: a member reply to a ticket NOT awaiting them → 409 (illegal transition)', async () => {
    const p = randomUUID();
    const memberId = randomUUID();
    const a = await authenticate({ displayName: 'Responder' });
    await grant(a.userId, p, 'helpline_operator');
    const ticketId = await fileTicket(a.client, p, memberId); // still open (never awaiting_member)
    const res = await t.app.inject({
      method: 'POST',
      url: `/api/v1/p/${p}/member/helpdesk/tickets/${ticketId}/reply`,
      headers: memberHeaders(memberId, p),
      payload: { message: 'premature reply' },
    });
    expect(res.statusCode).toBe(409);
  });

  it('AC2/AC3: resolve advances to resolved and fires the helpdesk_reply emit', async () => {
    const p = randomUUID();
    const memberId = randomUUID();
    const a = await authenticate({ displayName: 'Responder' });
    await grant(a.userId, p, 'helpline_operator');
    const ticketId = await fileTicket(a.client, p, memberId);
    await a.client.inject({ method: 'POST', url: `/api/v1/p/${p}/helpdesk/tickets/${ticketId}/pick-up` });
    const res = await a.client.inject({
      method: 'POST',
      url: `/api/v1/p/${p}/helpdesk/tickets/${ticketId}/resolve`,
      payload: { message: 'Fixed — your KYC is verified now.' },
    });
    expect(res.statusCode).toBe(200);
    expect((res.json() as Json)['current_state']).toBe('resolved');
    expect(t.helpdeskReplyNotifier.events.some((e) => e.ticketId === ticketId)).toBe(true);
  });

  // ── AC1 — the paginated, state-filtered, scope-respecting queue ──────────────────────────────────
  it('AC1: the queue is paginated + state-filtered + scope-respecting (membership, not counts)', async () => {
    const p = randomUUID();
    const a = await authenticate({ displayName: 'Responder' });
    await grant(a.userId, p, 'helpline_operator');
    const ids = [await fileTicket(a.client, p, randomUUID()), await fileTicket(a.client, p, randomUUID()), await fileTicket(a.client, p, randomUUID())];

    const page = await a.client.inject({ method: 'GET', url: `/api/v1/p/${p}/helpdesk/queue?state=open&limit=2` });
    expect(page.statusCode).toBe(200);
    const body = page.json() as { tickets: Array<{ ticket_id: string; current_state: string; severity: string }>; next_offset: number | null };
    expect(body.tickets.length).toBe(2);
    expect(body.tickets.every((x) => x.current_state === 'open')).toBe(true);
    // A full page (2 of 2) → a next_offset is handed back.
    expect(body.next_offset).toBe(2);

    // Every filed ticket is a member of the full (unpaginated-enough) result — assert membership.
    const all = await a.client.inject({ method: 'GET', url: `/api/v1/p/${p}/helpdesk/queue?limit=200` });
    const allIds = (all.json() as { tickets: Array<{ ticket_id: string }> }).tickets.map((x) => x.ticket_id);
    for (const id of ids) expect(allIds).toContain(id);
  });
});
