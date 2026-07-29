// Member-facing helpdesk surface — E2E (Story 10.2, Task 8; AC1/AC3/AC5/AC6/AC7). (:5433)
//
// The member ticket-filing + read surface end-to-end against real Postgres:
//   · create success — single-shot multipart, routes via the default policy, created_via=member_app,
//     subject_member_id = session member, an audit line is written, the attachment bytes are `put`.
//   · ownership guards — member B cannot read / mint an attachment URL for member A's ticket → 404.
//   · attachment validation — oversize → 413, combined-oversize → 413, disallowed MIME → 415, count
//     over cap → 400, a path-traversal filename is sanitized before it reaches storage.
//   · category read — returns the in-force default set (the nine FR-52 categories).
//   · Turnstile (`x-turnstile-token` header) — a rejecting verifier → 403; no session → 401.
//   · idempotency (`Idempotency-Key` header) — a replayed create with the SAME key returns the
//     ORIGINAL ticket (no duplicate row), a missing header → 400.
//
// Member routes open their OWN RLS-scoped tx (no admin RBAC hook), so no role_grants seeding is
// needed — a member JWT + a random pariwar/member id suffice. Own-committing audit writes accumulate,
// so we assert MEMBERSHIP for a per-test random member id, never a global count.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { signAccessToken } from '../../../src/modules/auth/member/tokens.js';
import { createTestApp, hasDatabase, teardown, type TestApp } from '../_setup.js';

const ACCESS_TTL_MS = 15 * 60 * 1000;
type Json = Record<string, unknown>;

function token(t: TestApp, memberId: string, pariwarId: string): string {
  return signAccessToken(t.app, { memberId, pariwarId, deviceId: 'test-device' }, ACCESS_TTL_MS);
}

/** One multipart part descriptor — a field (value) or a file (bytes + filename + contentType). */
type Part =
  | { kind: 'field'; name: string; value: string }
  | { kind: 'file'; name: string; filename: string; contentType: string; bytes: Buffer };

/** Build a multipart/form-data body from an ordered list of field + file parts. */
function multipart(parts: Part[]): { body: Buffer; ct: string } {
  const boundary = `----twt${randomUUID().replace(/-/g, '')}`;
  const chunks: Buffer[] = [];
  for (const p of parts) {
    if (p.kind === 'field') {
      chunks.push(
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${p.name}"\r\n\r\n${p.value}\r\n`),
      );
    } else {
      chunks.push(
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="${p.name}"; filename="${p.filename}"\r\n` +
            `Content-Type: ${p.contentType}\r\n\r\n`,
        ),
      );
      chunks.push(p.bytes);
      chunks.push(Buffer.from('\r\n'));
    }
  }
  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  return { body: Buffer.concat(chunks), ct: `multipart/form-data; boundary=${boundary}` };
}

function field(name: string, value: string): Part {
  return { kind: 'field', name, value };
}
function file(filename: string, contentType: string, bytes: Buffer): Part {
  return { kind: 'file', name: 'attachment', filename, contentType, bytes };
}

const PDF = Buffer.from('%PDF-1.4 fake pdf bytes');

interface CreateTicketOpts {
  turnstileToken?: string | null;
  idempotencyKey?: string | null;
}

/** Turnstile + Idempotency-Key ride HEADERS, not multipart fields (review-hardening). Both default
 *  to present + a fresh-per-call key; pass `null` to omit a header for the missing-header tests. */
async function createTicket(
  t: TestApp,
  tok: string | null,
  pariwarId: string,
  parts: Part[],
  opts: CreateTicketOpts = {},
): Promise<{ status: number; body: Json }> {
  const { body, ct } = multipart(parts);
  const turnstileToken = opts.turnstileToken === undefined ? 'test-turnstile-token' : opts.turnstileToken;
  const idempotencyKey = opts.idempotencyKey === undefined ? randomUUID() : opts.idempotencyKey;
  const res = await t.app.inject({
    method: 'POST',
    url: `/api/v1/p/${pariwarId}/member/helpdesk/tickets`,
    payload: body as unknown as object,
    headers: {
      'content-type': ct,
      origin: 'http://localhost:3001',
      ...(tok ? { authorization: `Bearer ${tok}` } : {}),
      ...(turnstileToken !== null ? { 'x-turnstile-token': turnstileToken } : {}),
      ...(idempotencyKey !== null ? { 'idempotency-key': idempotencyKey } : {}),
    },
  });
  let json: Json = {};
  try {
    json = res.json();
  } catch {
    json = {};
  }
  return { status: res.statusCode, body: json };
}

function defaultFields(overrides: Partial<Record<string, string>> = {}): Part[] {
  return [
    field('category', overrides.category ?? 'kyc-trouble'),
    field('subject', overrides.subject ?? 'My KYC photo keeps failing'),
    field('body', overrides.body ?? 'I tried three times and it will not verify.'),
  ];
}

describe.skipIf(!hasDatabase)('member helpdesk surface — E2E (:5433)', () => {
  it('AC1: files a ticket via multipart → 201, member_app-attributed, routed by default policy, audit + bytes', async () => {
    const t = await createTestApp();
    try {
      const memberId = randomUUID();
      const pariwarId = randomUUID();
      const tok = token(t, memberId, pariwarId);

      const res = await createTicket(t, tok, pariwarId, [
        ...defaultFields(),
        file('proof.pdf', 'application/pdf', PDF),
      ]);

      expect(res.status).toBe(201);
      // Default policy routes kyc-trouble → helpline_operator at the pariwar dimension.
      expect(res.body.routed_to_role).toBe('helpline_operator');
      expect(res.body.subject).toBe('My KYC photo keeps failing');
      expect(res.body.current_state).toBe('open');
      // The read-only thread carries the single opening entry (member author).
      const thread = res.body.thread as Json[];
      expect(thread).toHaveLength(1);
      expect(thread[0]).toMatchObject({ kind: 'opening', author: 'member' });
      // Attachment metadata is present (no object_key leaked).
      const attachments = res.body.attachments as Json[];
      expect(attachments).toHaveLength(1);
      expect(attachments[0]).toMatchObject({ filename: 'proof.pdf', content_type: 'application/pdf' });
      expect(attachments[0]).not.toHaveProperty('object_key');
      // The bytes were `put` to the object store (exactly one object for this ticket).
      const storedKeys = [...t.helpdeskAttachmentStorage.store.keys()];
      expect(storedKeys.filter((k) => k.includes(String(res.body.ticket_id)))).toHaveLength(1);

      // An audit line for the member actor was written.
      const audit = await t.pool.query<Json>(
        `SELECT action, resource_locator FROM audit_log_entries WHERE actor_id = $1`,
        [memberId],
      );
      expect(audit.rows.length).toBeGreaterThanOrEqual(1);
      expect(audit.rows.some((r) => r.action === 'helpdesk.ticket_created')).toBe(true);
    } finally {
      await teardown(t);
    }
  });

  it('AC3: a member cannot read (404) another member’s ticket — nor mint its attachment URL', async () => {
    const t = await createTestApp();
    try {
      const pariwarId = randomUUID();
      const memberA = randomUUID();
      const memberB = randomUUID();
      const tokA = token(t, memberA, pariwarId);
      const tokB = token(t, memberB, pariwarId);

      const created = await createTicket(t, tokA, pariwarId, [
        ...defaultFields(),
        file('a.pdf', 'application/pdf', PDF),
      ]);
      expect(created.status).toBe(201);
      const ticketId = String(created.body.ticket_id);

      // Member A reads their own — 200.
      const own = await t.app.inject({
        method: 'GET',
        url: `/api/v1/p/${pariwarId}/member/helpdesk/tickets/${ticketId}`,
        headers: { authorization: `Bearer ${tokA}`, origin: 'http://localhost:3001' },
      });
      expect(own.statusCode).toBe(200);

      // Member B reads A's ticket — 404 (not 403 — no enumeration oracle).
      const cross = await t.app.inject({
        method: 'GET',
        url: `/api/v1/p/${pariwarId}/member/helpdesk/tickets/${ticketId}`,
        headers: { authorization: `Bearer ${tokB}`, origin: 'http://localhost:3001' },
      });
      expect(cross.statusCode).toBe(404);

      // Member B cannot mint an attachment URL for A's ticket — 404.
      const crossUrl = await t.app.inject({
        method: 'GET',
        url: `/api/v1/p/${pariwarId}/member/helpdesk/tickets/${ticketId}/attachments/0/url`,
        headers: { authorization: `Bearer ${tokB}`, origin: 'http://localhost:3001' },
      });
      expect(crossUrl.statusCode).toBe(404);

      // Member A CAN mint the URL for their own attachment — 200.
      const ownUrl = await t.app.inject({
        method: 'GET',
        url: `/api/v1/p/${pariwarId}/member/helpdesk/tickets/${ticketId}/attachments/0/url`,
        headers: { authorization: `Bearer ${tokA}`, origin: 'http://localhost:3001' },
      });
      expect(ownUrl.statusCode).toBe(200);
      expect(typeof ownUrl.json().url).toBe('string');

      // An out-of-range attachment index → 404 (no oracle).
      const oob = await t.app.inject({
        method: 'GET',
        url: `/api/v1/p/${pariwarId}/member/helpdesk/tickets/${ticketId}/attachments/9/url`,
        headers: { authorization: `Bearer ${tokA}`, origin: 'http://localhost:3001' },
      });
      expect(oob.statusCode).toBe(404);
    } finally {
      await teardown(t);
    }
  });

  it('AC6: attachment validation — disallowed MIME → 415, count over cap → 400, filename sanitized', async () => {
    const t = await createTestApp();
    try {
      const pariwarId = randomUUID();
      const memberId = randomUUID();
      const tok = token(t, memberId, pariwarId);

      // Disallowed MIME (text/plain) → 415.
      const badMime = await createTicket(t, tok, pariwarId, [
        ...defaultFields(),
        file('note.txt', 'text/plain', Buffer.from('hello')),
      ]);
      expect(badMime.status).toBe(415);

      // Count over cap (6 files > 5) → 400.
      const tooMany = await createTicket(t, tok, pariwarId, [
        ...defaultFields(),
        ...Array.from({ length: 6 }, (_v, i) => file(`f${i}.pdf`, 'application/pdf', PDF)),
      ]);
      expect(tooMany.status).toBe(400);

      // A path-traversal filename is sanitized to its basename before storage.
      const traversal = await createTicket(t, tok, pariwarId, [
        ...defaultFields(),
        file('../../etc/passwd.pdf', 'application/pdf', PDF),
      ]);
      expect(traversal.status).toBe(201);
      const attachments = traversal.body.attachments as Json[];
      expect(attachments[0]?.filename).toBe('passwd.pdf');
    } finally {
      await teardown(t);
    }
  });

  it('AC6: an oversize attachment (single file over the per-file cap, or several files over the combined cap) → 413', async () => {
    const t = await createTestApp();
    try {
      const pariwarId = randomUUID();
      const memberId = randomUUID();
      const tok = token(t, memberId, pariwarId);

      // A single file over the 10 MiB per-file cap → 413.
      const oversizeSingle = await createTicket(t, tok, pariwarId, [
        ...defaultFields(),
        file('huge.pdf', 'application/pdf', Buffer.alloc(11 * 1024 * 1024, 1)),
      ]);
      expect(oversizeSingle.status).toBe(413);

      // Several files each under the per-file cap but over the 25 MiB COMBINED cap → 413.
      const oversizeCombined = await createTicket(t, tok, pariwarId, [
        ...defaultFields(),
        file('a.pdf', 'application/pdf', Buffer.alloc(9 * 1024 * 1024, 1)),
        file('b.pdf', 'application/pdf', Buffer.alloc(9 * 1024 * 1024, 1)),
        file('c.pdf', 'application/pdf', Buffer.alloc(9 * 1024 * 1024, 1)),
      ]);
      expect(oversizeCombined.status).toBe(413);
    } finally {
      await teardown(t);
    }
  });

  it('AC1: Turnstile + Idempotency-Key ride HEADERS — a missing header → 400', async () => {
    const t = await createTestApp();
    try {
      const pariwarId = randomUUID();
      const memberId = randomUUID();
      const tok = token(t, memberId, pariwarId);

      const noTurnstile = await createTicket(t, tok, pariwarId, defaultFields(), { turnstileToken: null });
      expect(noTurnstile.status).toBe(400);

      const noIdempotencyKey = await createTicket(t, tok, pariwarId, defaultFields(), { idempotencyKey: null });
      expect(noIdempotencyKey.status).toBe(400);
    } finally {
      await teardown(t);
    }
  });

  it('AC1: a replayed create with the SAME Idempotency-Key returns the ORIGINAL ticket, not a duplicate', async () => {
    const t = await createTestApp();
    try {
      const pariwarId = randomUUID();
      const memberId = randomUUID();
      const tok = token(t, memberId, pariwarId);
      const idempotencyKey = randomUUID();

      const first = await createTicket(t, tok, pariwarId, defaultFields({ subject: 'Idempotent request' }), {
        idempotencyKey,
      });
      expect(first.status).toBe(201);

      // A second call with the SAME key (as if the client retried after a dropped response) → 200,
      // the SAME ticket_id, no second row created.
      const replay = await createTicket(t, tok, pariwarId, defaultFields({ subject: 'Idempotent request' }), {
        idempotencyKey,
      });
      expect(replay.status).toBe(200);
      expect(replay.body.ticket_id).toBe(first.body.ticket_id);

      const res = await t.app.inject({
        method: 'GET',
        url: `/api/v1/p/${pariwarId}/member/helpdesk/tickets`,
        headers: { authorization: `Bearer ${tok}`, origin: 'http://localhost:3001' },
      });
      const tickets = (res.json() as Json).tickets as Json[];
      expect(tickets.filter((x) => x.subject === 'Idempotent request')).toHaveLength(1);

      // A DIFFERENT key for the same member → a genuinely new ticket.
      const second = await createTicket(t, tok, pariwarId, defaultFields({ subject: 'Idempotent request' }), {
        idempotencyKey: randomUUID(),
      });
      expect(second.status).toBe(201);
      expect(second.body.ticket_id).not.toBe(first.body.ticket_id);
    } finally {
      await teardown(t);
    }
  });

  it('AC5: the category read returns the in-force default policy set (nine FR-52 categories)', async () => {
    const t = await createTestApp();
    try {
      const pariwarId = randomUUID();
      const memberId = randomUUID();
      const tok = token(t, memberId, pariwarId);

      const res = await t.app.inject({
        method: 'GET',
        url: `/api/v1/p/${pariwarId}/member/helpdesk/categories`,
        headers: { authorization: `Bearer ${tok}`, origin: 'http://localhost:3001' },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json() as Json;
      expect(body.policy_version).toBe(1);
      const categories = body.categories as Json[];
      expect(categories).toHaveLength(9);
      const keys = categories.map((c) => c.category);
      expect(keys).toContain('kyc-trouble');
      expect(keys).toContain('other');
    } finally {
      await teardown(t);
    }
  });

  it('AC3: the inbox lists the member’s OWN tickets, newest-first', async () => {
    const t = await createTestApp();
    try {
      const pariwarId = randomUUID();
      const memberId = randomUUID();
      const tok = token(t, memberId, pariwarId);

      await createTicket(t, tok, pariwarId, defaultFields({ subject: 'First request' }));
      await createTicket(t, tok, pariwarId, defaultFields({ subject: 'Second request' }));

      const res = await t.app.inject({
        method: 'GET',
        url: `/api/v1/p/${pariwarId}/member/helpdesk/tickets`,
        headers: { authorization: `Bearer ${tok}`, origin: 'http://localhost:3001' },
      });
      expect(res.statusCode).toBe(200);
      const tickets = (res.json() as Json).tickets as Json[];
      expect(tickets.length).toBeGreaterThanOrEqual(2);
      // Newest-first — the second request precedes the first for this member.
      const subjects = tickets.map((x) => x.subject);
      const idxSecond = subjects.indexOf('Second request');
      const idxFirst = subjects.indexOf('First request');
      expect(idxSecond).toBeGreaterThanOrEqual(0);
      expect(idxFirst).toBeGreaterThan(idxSecond);
    } finally {
      await teardown(t);
    }
  });

  it('AC1: a rejecting Turnstile verifier → 403; no session → 401', async () => {
    const t = await createTestApp({ turnstile: { verify: async () => false } });
    try {
      const pariwarId = randomUUID();
      const memberId = randomUUID();
      const tok = token(t, memberId, pariwarId);

      const rejected = await createTicket(t, tok, pariwarId, defaultFields());
      expect(rejected.status).toBe(403);

      const noAuth = await createTicket(t, null, pariwarId, defaultFields());
      expect(noAuth.status).toBe(401);
    } finally {
      await teardown(t);
    }
  });
});
