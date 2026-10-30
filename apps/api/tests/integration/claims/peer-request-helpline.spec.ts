// Story 6.27a (Task 6; AC6) — the helpline records the answers of a neighbour who phones (PM12, PM25 (b)), E2E (:5433).
//   · 6.3's chain: ⛔ a fresh `claim_file` step-up ⇒ refused (403 auth.step_up_required); ⛔ claim.file ⇒ 403;
//   · the list returns ONLY texted pings (a ping whose `send_outcome` is NULL is ABSENT) and each item carries ONLY that
//     neighbour's answers;
//   · the PUT and the submit answer 404 for a ping whose `send_outcome IS DISTINCT FROM 'accepted'` (a leg each);
//   · `saved_via = 'helpline'` and the operator as saver; a MIXED app + helpline reply works and locks for BOTH at Submit.

import { randomUUID } from 'node:crypto';

import { claim, ids } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../../src/context.js';
import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import { signAccessToken } from '../../../src/modules/auth/member/tokens.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { buildServer } from '../../../src/server.js';
import { buildTestDeps, hasDatabase, makeClient, type CapturingStepUpDelivery, type TestDeps } from '../_setup.js';
import { FakeWebAuthnProvider } from '../_webauthn-fake.js';

type Client = ReturnType<typeof makeClient>;
type Json = Record<string, unknown>;

describe.skipIf(!hasDatabase)('Story 6.27a — the helpline records a neighbour\'s answers (:5433)', { timeout: 30000 }, () => {
  let td: TestDeps;
  let deps: AppDeps;
  let fakeWebauthn: FakeWebAuthnProvider;
  let adminStepUp: CapturingStepUpDelivery;
  let app: Awaited<ReturnType<typeof buildServer>>;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    fakeWebauthn = new FakeWebAuthnProvider();
    td = buildTestDeps({ webauthn: fakeWebauthn });
    deps = td.deps;
    adminStepUp = td.adminStepUpDelivery;
    app = await buildServer(deps);
  });

  /** Chain (database) versions the review leg inserts — removed after (append-only ⇒ superuser, replica role). */
  const chainVersionIds: string[] = [];
  afterAll(async () => {
    await app.close();
    const c = await td.pool.connect();
    try {
      if (chainVersionIds.length > 0) {
        try {
          await c.query('BEGIN');
          await c.query("SET LOCAL session_replication_role = 'replica'");
          await c.query(`DELETE FROM claim_peer_mesh_reply_answers WHERE reply_id IN (SELECT reply_id FROM claim_peer_mesh_replies WHERE questionnaire_version_id = ANY($1))`, [chainVersionIds]);
          await c.query(`DELETE FROM claim_peer_mesh_replies WHERE questionnaire_version_id = ANY($1)`, [chainVersionIds]);
          await c.query(`DELETE FROM questionnaire_version_steps WHERE version_id = ANY($1)`, [chainVersionIds]);
          await c.query(`DELETE FROM questionnaire_versions WHERE version_id = ANY($1)`, [chainVersionIds]);
          await c.query('COMMIT');
        } catch (e) {
          // Review RP16 — ROLLBACK, so a failing DELETE leaves ⛔ an aborted transaction on a pooled client or skips the user cleanup below.
          await c.query('ROLLBACK').catch(() => undefined);
          console.error('[peer-request-helpline.spec] chain cleanup:', (e as Error).message);
        }
      }
      if (createdUserIds.length > 0) {
        await c.query(`DELETE FROM admin_sessions WHERE sess ->> 'userId' = ANY($1)`, [createdUserIds]);
        await c.query(`DELETE FROM role_grants WHERE user_id = ANY($1)`, [createdUserIds]);
        await c.query(`DELETE FROM users WHERE id = ANY($1)`, [createdUserIds]);
      }
    } finally {
      c.release();
    }
    await td.pool.end();
  });

  async function operator(pariwarId: string, opts: { role?: string; elevate?: boolean } = {}): Promise<{ client: Client; userId: string }> {
    const email = `pr-${randomUUID()}@example.test`;
    const password = 'CorrectHorseBatteryStaple9';
    const userId = await service.createAdminAccount(deps, { email, password, displayName: 'Helpline Operator' });
    createdUserIds.push(userId);
    const credentialId = `cred-${userId}`;
    fakeWebauthn.nextRegistration = { verified: true, credential: { id: credentialId, publicKey: 'pk', counter: 0 } };
    fakeWebauthn.nextAuthentication = { verified: true, newCounter: 1 };
    const client = makeClient(app);
    const token = service.mintEnrollmentToken(deps, userId);
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/options', payload: { enrollmentToken: token } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/verify', payload: { response: { id: 'b' }, enrollmentToken: token } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/options', payload: {} });
    const verify = await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/verify', payload: { response: { id: credentialId } } });
    expect(verify.statusCode).toBe(200);
    await td.pool.query(`INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value) VALUES ($1, $2, $3, 'pariwar', $4)`, [
      userId,
      pariwarId,
      opts.role ?? 'helpline_operator',
      pariwarId,
    ]);
    if (opts.elevate !== false) {
      const req = await client.inject({ method: 'POST', url: '/api/v1/auth/step-up/request', payload: { actionContext: 'claim_file' } });
      expect(req.statusCode).toBe(200);
      const ver = await client.inject({ method: 'POST', url: '/api/v1/auth/step-up/verify', payload: { otp: adminStepUp.last?.code } });
      expect(ver.statusCode).toBe(200);
    }
    return { client, userId };
  }

  /** A claim in verification, a selection of the neighbour + another, both pinged; the neighbour's TEXTED unless not. */
  async function seedRequest(pariwarId: string, neighbour: string, opts: { texted?: boolean } = {}) {
    const deceased = ids.memberId(randomUUID());
    const cid = ids.claimId(randomUUID());
    const scopeTx = await openScopeTx(deps, pariwarId);
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
    const other = randomUUID();
    const selectionId = randomUUID();
    await td.pool.query(
      `INSERT INTO claim_peer_mesh_selections (selection_id, claim_case_id, pariwar_id, deceased_member_id, deceased_created_at, metric_id,
         metric_version, selected_member_ids, candidate_snapshot, response_window_expires_at)
       VALUES ($1, $2, $3, $4, now(), 'm', 1, ARRAY[$5, $6]::uuid[], '[]'::jsonb, now() + interval '72 hours')`,
      [selectionId, cid, pariwarId, deceased, neighbour, other],
    );
    const pingId = randomUUID();
    const otherPingId = randomUUID();
    await td.pool.query(`INSERT INTO claim_peer_mesh_pings (ping_id, selection_id, pariwar_id, member_id) VALUES ($1, $2, $3, $4), ($5, $2, $3, $6)`, [
      pingId,
      selectionId,
      pariwarId,
      neighbour,
      otherPingId,
      other,
    ]);
    await td.pool.query(`UPDATE claim_peer_mesh_pings SET send_outcome = 'accepted', attempt_count = 1, send_updated_at = clock_timestamp() WHERE ping_id = $1`, [otherPingId]);
    if (opts.texted !== false) {
      await td.pool.query(`UPDATE claim_peer_mesh_pings SET send_outcome = 'accepted', attempt_count = 1, send_updated_at = clock_timestamp() WHERE ping_id = $1`, [pingId]);
    }
    return { cid, pingId, otherPingId, other };
  }

  const listUrl = (p: string, m: string) => `/api/v1/p/${p}/admin/claims/helpline/members/${m}/peer-requests?limit=5`;
  // ⭐ Second-pass review S12 — the writes sit under the CALLER (`members/:memberId/…`) and take an Idempotency-Key (S18).
  const putUrl = (p: string, m: string, ping: string, key: string) => `/api/v1/p/${p}/admin/claims/helpline/members/${m}/peer-requests/${ping}/answers/${key}`;
  const submitUrl = (p: string, m: string, ping: string) => `/api/v1/p/${p}/admin/claims/helpline/members/${m}/peer-requests/${ping}/submit`;
  const idem = () => ({ 'idempotency-key': randomUUID() });

  it('6.3\'s chain: ⛔ a fresh claim_file step-up ⇒ 403 auth.step_up_required; ⛔ claim.file ⇒ 403', async () => {
    const p = randomUUID();
    const m = randomUUID();
    const r = await seedRequest(p, m);
    const noStepUp = await operator(p, { elevate: false });
    for (const res of [
      await noStepUp.client.inject({ method: 'GET', url: listUrl(p, m) }),
      await noStepUp.client.inject({ method: 'PUT', headers: idem(), url: putUrl(p, m, r.pingId, 'has_died'), payload: { value: { codes: ['died'] } } }),
      await noStepUp.client.inject({ method: 'POST', headers: idem(), url: submitUrl(p, m, r.pingId) }),
    ]) {
      expect(res.statusCode).toBe(403);
      expect(res.json<{ error: { code: string } }>().error.code).toBe('auth.step_up_required');
    }
    const verifier = await operator(p, { role: 'district_verifier', elevate: false });
    expect((await verifier.client.inject({ method: 'GET', url: listUrl(p, m) })).statusCode).toBe(403);
  });

  it('the list: ONLY texted pings (a NULL send_outcome is absent); each item carries ONLY that neighbour\'s answers', async () => {
    const p = randomUUID();
    const m = randomUUID();
    const texted = await seedRequest(p, m);
    await seedRequest(p, m, { texted: false });
    const op = await operator(p);
    // the OTHER neighbour of the texted request answers first (recorded under THEIR caller) — the operator must ⛔ see it
    expect((await op.client.inject({ method: 'PUT', headers: idem(), url: putUrl(p, texted.other, texted.otherPingId, 'has_died'), payload: { value: { codes: ['not_died'] } } })).statusCode).toBe(200);
    expect((await op.client.inject({ method: 'PUT', headers: idem(), url: putUrl(p, m, texted.pingId, 'has_died'), payload: { value: { codes: ['died'] } } })).statusCode).toBe(200);
    const res = await op.client.inject({ method: 'GET', url: listUrl(p, m) });
    expect(res.statusCode).toBe(200);
    const items = res.json<{ items: { pingId: string; answers: { questionKey: string; value: Json }[] }[] }>().items;
    expect(items.map((i) => i.pingId)).toEqual([texted.pingId]);
    expect(items[0]!.answers).toEqual([{ questionKey: 'has_died', value: { codes: ['died'] }, savedAt: expect.any(String) }]);
    expect(JSON.stringify(items.map((i) => i.answers))).not.toContain('not_died'); // ⛔ the other neighbour's answer
    // ⭐ Review S12 — the list is an AUDITED read naming the neighbour (⛔ a name, ⛔ an answer).
    const read = td.auditSink.events.filter((e) => e.type === 'helpline_claim.peer_requests_read');
    expect(read.at(-1)).toMatchObject({ resourceLocator: `member:${m}`, context: { member_id: m, requests: 1, answers: 1 } });
    expect(Object.keys(read.at(-1)!.context ?? {}).sort()).toEqual(['answers', 'member_id', 'requests']); // ⛔ a name / an answer
    expect(JSON.stringify(read.at(-1)!.context)).not.toContain('died');
  });

  it('⭐ review RV32 / R7 (v) — ONE open request pinned to an UNREADABLE version is left out of the list (logged, counted on the audit line); the neighbour\'s OTHER open requests are still shown (⛔ a 409 for all)', async () => {
    const p = randomUUID();
    const m = randomUUID();
    const good = await seedRequest(p, m);
    const bad = await seedRequest(p, m);
    const n = 1_950_000 + Math.floor(Math.random() * 49_999);
    const junk = `peer_mesh.v${n}`;
    await td.pool.query(
      `INSERT INTO questionnaire_versions (id, kind, version, version_id, base_version_id, ruled_base_code_version_id, origin_pariwar_id, definition, authored_by_actor, authored_by_display, direct, reason)
       VALUES ($1, 'peer_mesh', $2, $3, 'peer_mesh.v4', 'peer_mesh.v4', $4, $5, 'pa', 'Pariwar Admin', false, NULL)`,
      [randomUUID(), n, junk, p, JSON.stringify({ kind: 'peer_mesh', versionId: junk, version: n, junk: true })],
    );
    chainVersionIds.push(junk);
    const { rows: [sel] } = await td.pool.query<{ selection_id: string }>(`SELECT selection_id FROM claim_peer_mesh_pings WHERE ping_id = $1`, [bad.pingId]);
    await td.pool.query(
      `INSERT INTO claim_peer_mesh_replies (reply_id, pariwar_id, claim_case_id, selection_id, ping_id, responder_member_id, questionnaire_version_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [randomUUID(), p, bad.cid, sel!.selection_id, bad.pingId, m, junk],
    );
    const op = await operator(p);
    const res = await op.client.inject({ method: 'GET', url: listUrl(p, m) });
    expect(res.statusCode, res.body).toBe(200);
    expect(res.json<{ items: { pingId: string }[] }>().items.map((i) => i.pingId)).toEqual([good.pingId]);
    expect(Object.keys(res.json<Json>())).toEqual(['items']); // ⛔ the count on the wire — it is on the audit line
    const read = td.auditSink.events.filter((e) => e.type === 'helpline_claim.peer_requests_read');
    expect(read.at(-1)).toMatchObject({ resourceLocator: `member:${m}`, context: { member_id: m, requests: 1, unreadable_requests: 1 } });
  });

  it('BOUND to the caller (review S12): recording neighbour M, the OTHER neighbour\'s ping is the SAME 404 on the PUT and the submit', async () => {
    const p = randomUUID();
    const m = randomUUID();
    const r = await seedRequest(p, m);
    const op = await operator(p);
    for (const res of [
      await op.client.inject({ method: 'PUT', headers: idem(), url: putUrl(p, m, r.otherPingId, 'has_died'), payload: { value: { codes: ['died'] } } }),
      await op.client.inject({ method: 'POST', headers: idem(), url: submitUrl(p, m, r.otherPingId) }),
    ]) {
      expect(res.statusCode).toBe(404);
      expect(res.json<{ error: { code: string } }>().error.code).toBe('peer_request.not_found');
    }
    const { rows } = await td.pool.query(`SELECT 1 FROM claim_peer_mesh_reply_answers WHERE claim_case_id = $1`, [r.cid]);
    expect(rows).toHaveLength(0);
  });

  it('the writes take an Idempotency-Key (review S18): missing ⇒ 400; a replayed Submit ⇒ 200, ⛔ a 409', async () => {
    const p = randomUUID();
    const m = randomUUID();
    const r = await seedRequest(p, m);
    const op = await operator(p);
    const bare = await op.client.inject({ method: 'PUT', url: putUrl(p, m, r.pingId, 'has_died'), payload: { value: { codes: ['died'] } } });
    expect(bare.statusCode).toBe(400);
    expect(bare.json<{ error: { code: string } }>().error.code).toBe('peer_request.idempotency_key_required');
    expect((await op.client.inject({ method: 'PUT', headers: idem(), url: putUrl(p, m, r.pingId, 'has_died'), payload: { value: { codes: ['died'] } } })).statusCode).toBe(200);
    const key = idem();
    expect((await op.client.inject({ method: 'POST', headers: key, url: submitUrl(p, m, r.pingId) })).statusCode).toBe(200);
    const replay = await op.client.inject({ method: 'POST', headers: key, url: submitUrl(p, m, r.pingId) });
    expect(replay.statusCode).toBe(200); // the lost-response retry — ⛔ "already sent"
  });

  it('per-route actor denial on the WRITES (review S26): ⛔ a session ⇒ 401; ⛔ claim.file ⇒ 403', async () => {
    const p = randomUUID();
    const m = randomUUID();
    const r = await seedRequest(p, m);
    for (const res of [
      await app.inject({ method: 'PUT', headers: idem(), url: putUrl(p, m, r.pingId, 'has_died'), payload: { value: { codes: ['died'] } } }),
      await app.inject({ method: 'POST', headers: idem(), url: submitUrl(p, m, r.pingId) }),
    ]) {
      expect(res.statusCode).toBe(401);
    }
    const verifier = await operator(p, { role: 'district_verifier' });
    for (const res of [
      await verifier.client.inject({ method: 'PUT', headers: idem(), url: putUrl(p, m, r.pingId, 'has_died'), payload: { value: { codes: ['died'] } } }),
      await verifier.client.inject({ method: 'POST', headers: idem(), url: submitUrl(p, m, r.pingId) }),
    ]) {
      expect(res.statusCode).toBe(403);
    }
  });

  it('the PUT and the submit answer 404 for an untexted ping (a leg each)', async () => {
    const p = randomUUID();
    const m = randomUUID();
    const untexted = await seedRequest(p, m, { texted: false });
    const op = await operator(p);
    const put = await op.client.inject({ method: 'PUT', headers: idem(), url: putUrl(p, m, untexted.pingId, 'has_died'), payload: { value: { codes: ['died'] } } });
    expect(put.statusCode).toBe(404);
    expect(put.json<{ error: { code: string } }>().error.code).toBe('peer_request.not_found');
    const sub = await op.client.inject({ method: 'POST', headers: idem(), url: submitUrl(p, m, untexted.pingId) });
    expect(sub.statusCode).toBe(404);
    expect(sub.json<{ error: { code: string } }>().error.code).toBe('peer_request.not_found');
  });

  it('an undecryptable saved date remains explicitly unavailable to the operator (review R10)', async () => {
    const p = randomUUID();
    const m = randomUUID();
    const r = await seedRequest(p, m);
    const op = await operator(p);
    expect((await op.client.inject({ method: 'PUT', headers: idem(), url: putUrl(p, m, r.pingId, 'has_died'), payload: { value: { codes: ['died'] } } })).statusCode).toBe(200);
    expect((await op.client.inject({ method: 'PUT', headers: idem(), url: putUrl(p, m, r.pingId, 'death_date'), payload: { value: { date: '2026-10-01' } } })).statusCode).toBe(200);
    await td.pool.query("UPDATE claim_peer_mesh_reply_answers SET value_ciphertext = 'broken-envelope' WHERE claim_case_id = $1 AND question_key = 'death_date'", [r.cid]);
    const list = await op.client.inject({ method: 'GET', url: `/api/v1/p/${p}/admin/claims/helpline/members/${m}/peer-requests` });
    expect(list.statusCode).toBe(200);
    expect(list.json<{ items: { answers: unknown[] }[] }>().items[0]!.answers).toContainEqual(expect.objectContaining({ questionKey: 'death_date', value: { unavailable: true } }));
  });

  it('saved_via helpline + the operator as saver; a MIXED app + helpline reply locks for BOTH at Submit', async () => {
    const p = randomUUID();
    const m = randomUUID();
    await td.pool.query(`INSERT INTO members (member_id, pariwar_id, state, state_event_version) VALUES ($1, $2, 'active', 1)`, [m, p]);
    const r = await seedRequest(p, m);
    const op = await operator(p);
    expect((await op.client.inject({ method: 'PUT', headers: idem(), url: putUrl(p, m, r.pingId, 'has_died'), payload: { value: { codes: ['died'] } } })).statusCode).toBe(200);
    // the member, in the app, answers the next question on the SAME reply
    const tok = signAccessToken(app, { memberId: m, pariwarId: p, deviceId: 'd' }, 15 * 60 * 1000);
    const memberPut = await app.inject({
      method: 'PUT',
      url: `/api/v1/p/${p}/member/peer-requests/${r.pingId}/answers/how_known`,
      headers: { authorization: `Bearer ${tok}`, origin: 'http://localhost:3001', 'idempotency-key': randomUUID() },
      payload: { value: { codes: ['family_told'] } },
    });
    expect(memberPut.statusCode).toBe(200);
    const { rows } = await td.pool.query(`SELECT question_key, saved_via, saved_by_actor_id FROM claim_peer_mesh_reply_answers WHERE claim_case_id = $1 ORDER BY saved_at`, [r.cid]);
    expect(rows).toEqual([
      { question_key: 'has_died', saved_via: 'helpline', saved_by_actor_id: op.userId },
      { question_key: 'how_known', saved_via: 'member_app', saved_by_actor_id: m },
    ]);
    const ev = await td.pool.query(`SELECT payload, actor_id FROM events_log WHERE stream_id = $1 AND event_type = 'claim.peer_mesh_responded'`, [r.cid]);
    expect(ev.rows[0]!.payload).toMatchObject({ actor: 'operator', response: 'confirmed', responder_member_id: m });
    expect(ev.rows[0]!.actor_id).toBe(op.userId);
    // the operator submits — the app is locked too
    expect((await op.client.inject({ method: 'POST', headers: idem(), url: submitUrl(p, m, r.pingId) })).statusCode).toBe(200);
    const after = await app.inject({
      method: 'PUT',
      url: `/api/v1/p/${p}/member/peer-requests/${r.pingId}/answers/how_known`,
      headers: { authorization: `Bearer ${tok}`, origin: 'http://localhost:3001', 'idempotency-key': randomUUID() },
      payload: { value: { codes: ['other'] } },
    });
    expect(after.statusCode).toBe(409);
    expect(after.json<{ error: { code: string } }>().error.code).toBe('peer_request.submitted');
    const again = await op.client.inject({ method: 'PUT', headers: idem(), url: putUrl(p, m, r.pingId, 'how_known'), payload: { value: { codes: ['other'] } } });
    expect(again.statusCode).toBe(409);
  });
});
