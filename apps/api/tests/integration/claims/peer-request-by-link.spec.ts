// Story 6.27c (Task 5.1; AC6, R13 / R14) — the BY-LINK resolver, E2E on a live DB (:5433).
//   · 200 `{ pingId }` for the session member's TEXTED ping — a submitted one included (its detail then answers 409);
//   · ONE 404 (`peer_request.not_found`, the same message) for an unknown code, another member's code, another Pariwar's path,
//     an UNTEXTED ping's code (begun, ⛔ accepted) and a malformed code — identical status, code and message (the envelope's
//     `request_id` differs per request — the 6.27a precedent) — and another Pariwar's ping on the member's OWN path; ⛔ session ⇒
//     401; the per-member READ budget ⇒ 429 (and a second member from the same address still 200); a CLOSED claim's ping resolves;
//   · R13 — a code planted in the URL reaches ⛔ log line on a 200, a 404 AND an injected 500 (`logStream`; the route runs at
//     `logLevel: 'warn'`, and the error mapper logs `{ err, traceId }` only);
//   · review F1 — a failure of the resolver's OWN query (Drizzle's wrapper carries the parameters) logs the SANITISED error.

import { randomUUID } from 'node:crypto';
import { Writable } from 'node:stream';

import { claim, ids } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { signAccessToken } from '../../../src/modules/auth/member/tokens.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { createTestApp, hasDatabase, teardown, type TestApp } from '../_setup.js';

type Json = Record<string, unknown>;
const ORIGIN = 'http://localhost:3001';

/** A fresh 12-character base62 code (the link form). */
const code = (): string => claim.generatePeerRequestLinkCode();

describe.skipIf(!hasDatabase)('Story 6.27c — the by-link resolver (:5433)', { timeout: 30000 }, () => {
  let t: TestApp;
  let budget: TestApp;
  const logLines: string[] = [];
  const logStream = new Writable({
    write(chunk: Buffer | string, _enc, cb) {
      logLines.push(chunk.toString());
      cb();
    },
  });

  beforeAll(async () => {
    t = await createTestApp({ logStream });
    budget = await createTestApp({ env: { READ_RATE_MAX: '3' } });
  });
  afterAll(async () => {
    await teardown(t);
    await teardown(budget);
  });

  async function seedMember(app: TestApp, pariwarId: string): Promise<string> {
    const memberId = randomUUID();
    await app.pool.query(`INSERT INTO members (member_id, pariwar_id, state, state_event_version) VALUES ($1, $2, 'active', 1)`, [memberId, pariwarId]);
    return memberId;
  }

  /** A claim in the window (the projector), a selection naming `neighbour` + one other; each ping carries a link code. */
  async function seedRequest(app: TestApp, pariwarId: string, neighbour: string, opts: { texted?: boolean } = {}) {
    const deceased = ids.memberId(randomUUID());
    const cid = ids.claimId(randomUUID());
    const scopeTx = await openScopeTx(app.deps, pariwarId);
    const emit = (from: string | null, to: string, eventType: string, extra: Json = {}) =>
      claim.projectClaimState(scopeTx.client, {
        claimCaseId: cid,
        pariwarId: ids.pariwarId(pariwarId),
        deceasedMemberId: deceased,
        intakeChannels: ['helpline'],
        claimantActorId: null,
        eventType: eventType as never,
        payload: { from_state: from, to_state: to, trigger: 'seed', actor: 'system', ...extra },
        actorId: null,
      });
    try {
      await emit(null, 'intake_pending', 'claim.intake_initiated', { deceased_member_id: String(deceased), intake_channel: 'helpline', claimant_actor_id: null });
      await emit('intake_pending', 'intake_converged', 'claim.intake_converged');
      await emit('intake_converged', 'documents_pending', 'claim.documents_received');
      await emit('documents_pending', 'verification_in_progress', 'claim.peer_mesh_pinged', { selected_member_ids: [neighbour], metric_id: 'm', metric_version: 1 });
      await closeScopeTx(scopeTx, true);
    } catch (err) {
      await closeScopeTx(scopeTx, false);
      throw err;
    }
    // a REAL active member of the same Pariwar (review round 2 P13 — a resolver that dropped the member predicate but joined
    // `members` would still 404 a ping of a member who does not exist)
    const other = await seedMember(app, pariwarId);
    const selectionId = randomUUID();
    await app.pool.query(
      `INSERT INTO claim_peer_mesh_selections (selection_id, claim_case_id, pariwar_id, deceased_member_id, deceased_created_at, metric_id,
         metric_version, selected_member_ids, candidate_snapshot, response_window_expires_at)
       VALUES ($1, $2, $3, $4, now(), 'm', 1, ARRAY[$5, $6]::uuid[], '[]'::jsonb, now() + interval '72 hours')`,
      [selectionId, cid, pariwarId, deceased, neighbour, other],
    );
    const pingId = randomUUID();
    const otherPingId = randomUUID();
    const pingCode = code();
    const otherCode = code();
    await app.pool.query(`INSERT INTO claim_peer_mesh_pings (ping_id, selection_id, pariwar_id, member_id) VALUES ($1, $2, $3, $4), ($5, $2, $3, $6)`, [
      pingId,
      selectionId,
      pariwarId,
      neighbour,
      otherPingId,
      other,
    ]);
    // Begun — the code is written at the begin; TEXTED only when accepted.
    for (const [id, c] of [
      [pingId, pingCode],
      [otherPingId, otherCode],
    ] as const) {
      await app.pool.query(
        `UPDATE claim_peer_mesh_pings SET send_outcome = 'attempting', attempt_count = 1, claimed_at = clock_timestamp(), claimed_by_job = 'j',
           aging_since = clock_timestamp(), locale_source = 'pariwar_default', link_code = $2 WHERE ping_id = $1`,
        [id, c],
      );
    }
    if (opts.texted !== false) {
      await app.pool.query(`UPDATE claim_peer_mesh_pings SET send_outcome = 'accepted', send_updated_at = clock_timestamp() WHERE ping_id = ANY($1)`, [
        [pingId, otherPingId],
      ]);
    }
    return { cid, pingId, pingCode, otherPingId, otherCode, other };
  }

  const token = (app: TestApp, memberId: string, pariwarId: string): string =>
    signAccessToken(app.app, { memberId, pariwarId, deviceId: 'test-device' }, 15 * 60 * 1000);

  async function call(app: TestApp, method: 'GET' | 'POST', url: string, tok: string | null, headers: Record<string, string> = {}) {
    const res = await app.app.inject({ method, url, headers: { origin: ORIGIN, ...(tok ? { authorization: `Bearer ${tok}` } : {}), ...headers } });
    let body: Json = {};
    try {
      body = res.json() as Json;
    } catch {
      // empty
    }
    return { status: res.statusCode, body };
  }

  const base = (p: string) => `/api/v1/p/${p}/member/peer-requests`;
  const byLink = (app: TestApp, p: string, c: string, tok: string | null) => call(app, 'GET', `${base(p)}/by-link/${encodeURIComponent(c)}`, tok);

  it('⛔ session ⇒ 401', async () => {
    expect((await byLink(t, randomUUID(), code(), null)).status).toBe(401);
  });

  it('⭐ 200 `{ pingId }` for the session member\'s TEXTED ping — a SUBMITTED one too (its detail then answers 409)', async () => {
    const p = randomUUID();
    const m = await seedMember(t, p);
    const r = await seedRequest(t, p, m);
    const tok = token(t, m, p);
    const res = await byLink(t, p, r.pingCode, tok);
    expect(res).toEqual({ status: 200, body: { pingId: r.pingId } });
    await t.pool.query(
      `INSERT INTO claim_peer_mesh_replies (pariwar_id, claim_case_id, selection_id, ping_id, responder_member_id, questionnaire_version_id)
       SELECT pariwar_id, $2, selection_id, ping_id, member_id, 'peer_mesh.v4' FROM claim_peer_mesh_pings WHERE ping_id = $1`,
      [r.pingId, r.cid],
    );
    await t.pool.query(`UPDATE claim_peer_mesh_replies SET submitted_at = clock_timestamp() WHERE ping_id = $1`, [r.pingId]);
    expect(await byLink(t, p, r.pingCode, tok)).toEqual({ status: 200, body: { pingId: r.pingId } });
    const detail = await call(t, 'GET', `${base(p)}/${r.pingId}`, tok);
    expect(detail.status).toBe(409);
    expect((detail.body['error'] as Json)['code']).toBe('peer_request.submitted');
  });

  it('⭐ ONE 404 — unknown / another member\'s / another Pariwar\'s / UNTEXTED / malformed: identical status, code and message', async () => {
    const p = randomUUID();
    const m = await seedMember(t, p);
    const texted = await seedRequest(t, p, m);
    const untexted = await seedRequest(t, p, m, { texted: false });
    const tok = token(t, m, p);
    // the RESOLVER'S SCOPE (⛔ the member predicate, ⛔ the path check): member `n` of Pariwar `q`, on `q`'s own path, with the
    // code of a ping that names `n` but lives in Pariwar `p` (the ping's `member_id` carries ⛔ FK to `members`) — only the
    // resolver's `pariwar_id` predicate / RLS refuse it; the positive control below shows the member match alone would pass
    const q = randomUUID();
    const n = await seedMember(t, q);
    const tokQ = token(t, n, q);
    const crossed = await seedRequest(t, p, n);
    const bodies: Json[] = [];
    for (const res of [
      await byLink(t, q, crossed.pingCode, tokQ), // a ping of `n`'s, but in ANOTHER Pariwar, on `n`'s own path
      await byLink(t, p, code(), tok), // unknown
      await byLink(t, p, texted.otherCode, tok), // another member's ping
      await byLink(t, randomUUID(), texted.pingCode, tok), // a path Pariwar ⛔ the session's
      await byLink(t, p, untexted.pingCode, tok), // begun, ⛔ texted
      await byLink(t, p, 'short', tok), // malformed — ⛔ a 400
      await byLink(t, p, `${texted.pingCode.slice(0, 11)}-`, tok), // malformed
    ]) {
      expect(res.status).toBe(404);
      bodies.push(res.body['error'] as Json);
    }
    for (const b of bodies) expect({ code: b['code'], message: b['message'] }).toEqual({ code: 'peer_request.not_found', message: 'Not found' });
    // POSITIVE CONTROL: the same code, on the ping's OWN Pariwar's path with a session there for `n`, resolves
    expect(await byLink(t, p, crossed.pingCode, token(t, n, p))).toEqual({ status: 200, body: { pingId: crossed.pingId } });
  });

  it('the per-member READ budget ⇒ 429', async () => {
    const p = randomUUID();
    const m = await seedMember(budget, p);
    const r = await seedRequest(budget, p, m);
    const tok = token(budget, m, p);
    const statuses: number[] = [];
    for (let i = 0; i < 5; i += 1) statuses.push((await byLink(budget, p, r.pingCode, tok)).status);
    expect(statuses.slice(0, 3)).toEqual([200, 200, 200]);
    expect(statuses.slice(3)).toEqual([429, 429]);
    // PER MEMBER (review round 2 P13): another member, from the SAME address, still has a budget — ⛔ an IP or route-wide counter
    const m2 = await seedMember(budget, p);
    const r2 = await seedRequest(budget, p, m2);
    expect((await byLink(budget, p, r2.pingCode, token(budget, m2, p))).status).toBe(200);
  });

  it('a texted ping of a CLOSED claim still resolves (R14) — its detail then answers 409 `peer_request.no_longer_open`', async () => {
    const p = randomUUID();
    const m = await seedMember(t, p);
    const r = await seedRequest(t, p, m);
    const tok = token(t, m, p);
    const c = await t.pool.connect();
    try {
      await c.query('BEGIN');
      await c.query(`SET LOCAL app.claim_state_writer = 'on'`);
      await c.query(`UPDATE claims SET current_state = 'denied' WHERE claim_case_id = $1`, [r.cid]);
      await c.query('COMMIT');
    } catch (err) {
      await c.query('ROLLBACK');
      throw err;
    } finally {
      c.release();
    }
    expect(await byLink(t, p, r.pingCode, tok)).toEqual({ status: 200, body: { pingId: r.pingId } });
    const detail = await call(t, 'GET', `${base(p)}/${r.pingId}`, tok);
    expect(detail.status).toBe(409);
    expect((detail.body['error'] as Json)['code']).toBe('peer_request.no_longer_open');
  });

  it('⭐ R13 — a planted code reaches ⛔ log line on a 200, a 404 AND an injected 500', async () => {
    const p = randomUUID();
    const m = await seedMember(t, p);
    const r = await seedRequest(t, p, m);
    const tok = token(t, m, p);
    const planted = code();
    logLines.length = 0;
    expect((await byLink(t, p, r.pingCode, tok)).status).toBe(200);
    expect((await byLink(t, p, planted, tok)).status).toBe(404);
    // an injected 500: the route's own transaction cannot connect
    const connect = t.deps.pool.connect.bind(t.deps.pool);
    const failing = code();
    (t.deps.pool as { connect: unknown }).connect = () => Promise.reject(new Error('injected connection failure'));
    let failed: number;
    try {
      failed = (await byLink(t, p, failing, tok)).status;
    } finally {
      (t.deps.pool as { connect: unknown }).connect = connect;
    }
    expect(failed).toBe(500);
    // the logger DID write for the 500 (⛔ a vacuous pass) — and ⛔ line carries any of the three codes
    expect(logLines.some((l) => l.includes('injected connection failure'))).toBe(true);
    for (const c of [r.pingCode, planted, failing]) {
      for (const line of logLines) expect(line).not.toContain(c);
    }
    // ⭐ TEETH — the SAME capture sees an `info` request line on a route WITHOUT the override (the URL is logged there).
    logLines.length = 0;
    await call(t, 'GET', `${base(p)}?limit=5&probe=${planted}`, tok);
    expect(logLines.some((l) => l.includes(planted))).toBe(true);
  });

  it('⭐ review F1 — a failure of the resolver\'s QUERY (⛔ the connection) logs ⛔ the code — the sanitised error, its SQLSTATE', async () => {
    const p = randomUUID();
    const m = await seedMember(t, p);
    const r = await seedRequest(t, p, m);
    const tok = token(t, m, p);
    // The route's own client fails ONLY the resolver's statement — Drizzle wraps it with the statement's parameters (the code).
    const connect = t.deps.pool.connect.bind(t.deps.pool);
    const patched: { client: object; query: unknown }[] = [];
    (t.deps.pool as { connect: unknown }).connect = async () => {
      const client = await connect();
      patched.push({ client, query: client.query });
      const query = client.query.bind(client) as (...args: unknown[]) => unknown;
      (client as { query: unknown }).query = (...args: unknown[]) => {
        const text = typeof args[0] === 'string' ? args[0] : (args[0] as { text?: string } | undefined)?.text;
        if (text?.includes('link_code =')) {
          return Promise.reject(Object.assign(new Error(`injected query failure ${r.pingCode}`), { code: '57014' }));
        }
        return query(...args);
      };
      return client;
    };
    logLines.length = 0;
    let status: number;
    try {
      status = (await byLink(t, p, r.pingCode, tok)).status;
    } finally {
      (t.deps.pool as { connect: unknown }).connect = connect;
      // ⛔ a failing client left in the pool for a later test — each pooled client gets its own `query` back
      for (const { client, query } of patched) (client as { query: unknown }).query = query;
    }
    expect(status).toBe(500);
    // the logger DID write the 500 (⛔ a vacuous pass) — the sanitised error with its SQLSTATE — and ⛔ line carries the code
    expect(logLines.some((l) => l.includes('PeerRequestByLinkReadError') && l.includes('57014'))).toBe(true);
    for (const line of logLines) expect(line).not.toContain(r.pingCode);
  });
});
