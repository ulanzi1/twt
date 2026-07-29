// Helpdesk operator call-to-ticket surface — E2E (Story 10.3, Task 7; AC1/AC2/AC3/AC4/AC6). (:5433)
//
// Story 10.3 adds NO new create handler — it (1) permission-gates the EXISTING 10.1 create route with
// the new `helpdesk.create` key, and (2) surfaces `created_via` + `operator_attribution` to the 10.2
// member reads. This spec proves both against real Postgres:
//   · AC4 RBAC revert-sanity PAIR — an actor holding `helpdesk.create` (helpline_operator) → 201; an
//     actor with a Pariwar grant but WITHOUT the key (auditor) → fail-closed 403. The pair has teeth:
//     removing the grant flips the 201 to 403, and the with-key path proves the gate isn't vacuously
//     denying (the AI-8-1 / gate-scope discipline).
//   · AC2/AC3 cross-surface read-back — the operator files for a member; that MEMBER then reads the
//     ticket through their OWN 10.2 route (member JWT), and it carries `created_via='helpline_call'` +
//     `operator_attribution` = the operator's session display_name (the "We filed this for you" fields).
//   · AC2 fail-closed — an operator with NO display name → 409 (no ticket, no settled audit), the
//     server-resolved-attribution contract.
//
// ⚠ Own-committing seed writes; fresh random pariwarId + memberId per test; role_grants/users cleaned in
// afterAll. Assert MEMBERSHIP for a per-test random id, never a global count ([[project_live_db_test_gotchas]]).

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

describe.skipIf(!hasDatabase)('helpdesk operator call-to-ticket surface — E2E (:5433)', () => {
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

  /** Authenticate a fresh admin operator (passkey flow), optionally with a display name. */
  async function authenticate(opts: { displayName?: string | null } = {}): Promise<{ client: Client; userId: string }> {
    const email = `hd-op-${randomUUID()}@example.test`;
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

  const ticketsUrl = (p: string) => `/api/v1/p/${p}/helpdesk/tickets`;

  function filePayload(memberId: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return { subject_member_id: memberId, category: 'utr-mismatch', body: 'my UTR does not match', created_via: 'helpline_call', ...overrides };
  }

  // ── AC4 — the RBAC revert-sanity PAIR ─────────────────────────────────────────────────────────
  it('AC4 with-key: an actor holding helpdesk.create (helpline_operator) → 201', async () => {
    const p = randomUUID();
    const a = await authenticate({ displayName: 'Operator With Key' });
    await grant(a.userId, p, 'helpline_operator');
    const res = await a.client.inject({ method: 'POST', url: ticketsUrl(p), payload: filePayload(randomUUID()) });
    expect(res.statusCode).toBe(201);
  });

  it('AC4 without-key: an actor with a Pariwar grant but WITHOUT helpdesk.create (auditor) → fail-closed 403', async () => {
    const p = randomUUID();
    // auditor has a `pariwar` scopeCeiling (so scope resolves — NOT a 404) but does NOT hold helpdesk.create.
    const a = await authenticate({ displayName: 'Auditor No Key' });
    await grant(a.userId, p, 'auditor');
    const res = await a.client.inject({ method: 'POST', url: ticketsUrl(p), payload: filePayload(randomUUID()) });
    expect(res.statusCode).toBe(403);
  });

  it('AC4: pariwar_admin also holds helpdesk.create → 201', async () => {
    const p = randomUUID();
    const a = await authenticate({ displayName: 'Pariwar Admin' });
    await grant(a.userId, p, 'pariwar_admin');
    const res = await a.client.inject({ method: 'POST', url: ticketsUrl(p), payload: filePayload(randomUUID()) });
    expect(res.statusCode).toBe(201);
  });

  // ── AC2/AC3 — the cross-surface "We filed this for you" read-back ──────────────────────────────
  it('AC2/AC3: an operator-filed ticket is readable by the MEMBER with created_via + operator_attribution', async () => {
    const p = randomUUID();
    const memberId = randomUUID();
    const a = await authenticate({ displayName: 'Operator Priya' });
    await grant(a.userId, p, 'helpline_operator');

    // (1) The operator files on the member's behalf.
    const filed = await a.client.inject({ method: 'POST', url: ticketsUrl(p), payload: filePayload(memberId, { category: 'kyc-trouble' }) });
    expect(filed.statusCode).toBe(201);
    const ticket = filed.json() as { ticket_id: string; created_via: string; operator_attribution: string | null; routed_to_role: string };
    expect(ticket.created_via).toBe('helpline_call');
    expect(ticket.operator_attribution).toBe('Operator Priya');

    // (2) That MEMBER reads their OWN inbox (10.2 route, member JWT) — the operator-filed ticket appears.
    const memberTok = signAccessToken(t.app, { memberId, pariwarId: p, deviceId: 'test-device' }, ACCESS_TTL_MS);
    const list = await t.app.inject({
      method: 'GET',
      url: `/api/v1/p/${p}/member/helpdesk/tickets`,
      headers: { origin: 'http://localhost:3001', authorization: `Bearer ${memberTok}` },
    });
    expect(list.statusCode).toBe(200);
    const tickets = (list.json() as { tickets: Array<{ ticket_id: string; created_via: string }> }).tickets;
    const mine = tickets.find((x) => x.ticket_id === ticket.ticket_id);
    expect(mine).toBeDefined();
    expect(mine!.created_via).toBe('helpline_call'); // the inbox can badge it

    // (3) The member detail carries the FILING operator's name (the "We filed this for you" header field).
    const detail = await t.app.inject({
      method: 'GET',
      url: `/api/v1/p/${p}/member/helpdesk/tickets/${ticket.ticket_id}`,
      headers: { origin: 'http://localhost:3001', authorization: `Bearer ${memberTok}` },
    });
    expect(detail.statusCode).toBe(200);
    const body = detail.json() as Json;
    expect(body['created_via']).toBe('helpline_call');
    expect(body['operator_attribution']).toBe('Operator Priya');
  });

  // ── AC2 — server-resolved attribution fail-closes with no display name ─────────────────────────
  it('AC2: an operator with NO display name → 409 (no ticket, no settled audit) even though gated-in', async () => {
    const p = randomUUID();
    const a = await authenticate({ displayName: null });
    await grant(a.userId, p, 'helpline_operator');
    const res = await a.client.inject({ method: 'POST', url: ticketsUrl(p), payload: filePayload(randomUUID()) });
    expect(res.statusCode).toBe(409);
    expect((res.json() as { error: { code: string } }).error.code).toBe('admin.display_name_missing');
  });
});
