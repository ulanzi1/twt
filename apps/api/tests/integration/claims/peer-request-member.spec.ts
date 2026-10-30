// Story 6.27a (Task 4; AC5's API half) — the neighbours' MEMBER routes, E2E on a live DB (:5433).
//   · ONE indistinguishable 404 (`peer_request.not_found`, same message) on EVERY route for: a ping that was ⛔ never
//     texted, another member's ping, another Pariwar (a path that is ⛔ the session's), an unknown ping;
//   · 409 `peer_request.no_longer_open` (a closed claim) / `peer_request.submitted` (after Submit, a second Submit);
//   · the list returns ONLY texted, open requests and its `limit` is bounded (forced pagination);
//   · the detail carries the PINNED version's SERVED questions with words in en AND hi (⛔ the 'pending' health questions)
//     — v3 for a NEW reply; a reply STARTED on v2 keeps v2 and its words (Story 6.27b, `-329`);
//   · the auto-save needs an Idempotency-Key, replays it, stores a date ENCRYPTED with its three indexes and reads it back
//     to its owner; a bad value is 422; ⛔ no Turnstile header is ever needed; ⛔ no session ⇒ 401.

import { randomUUID } from 'node:crypto';

import { claim, ids } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { signAccessToken } from '../../../src/modules/auth/member/tokens.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { createTestApp, hasDatabase, teardown, type TestApp } from '../_setup.js';

type Json = Record<string, unknown>;
const ORIGIN = 'http://localhost:3001';

describe.skipIf(!hasDatabase)('Story 6.27a — the neighbours\' member routes (:5433)', { timeout: 30000 }, () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });
  /** Chain (database) versions the review legs insert — removed after (append-only ⇒ superuser, replica role). */
  const chainVersionIds: string[] = [];
  afterAll(async () => {
    if (chainVersionIds.length > 0) {
      const c = await t.pool.connect();
      try {
        await c.query('BEGIN');
        await c.query("SET LOCAL session_replication_role = 'replica'");
        await c.query(`DELETE FROM claim_peer_mesh_reply_answers WHERE reply_id IN (SELECT reply_id FROM claim_peer_mesh_replies WHERE questionnaire_version_id = ANY($1))`, [chainVersionIds]);
        await c.query(`DELETE FROM claim_peer_mesh_replies WHERE questionnaire_version_id = ANY($1)`, [chainVersionIds]);
        await c.query(`DELETE FROM questionnaire_version_steps WHERE version_id = ANY($1)`, [chainVersionIds]);
        await c.query(`DELETE FROM questionnaire_versions WHERE version_id = ANY($1)`, [chainVersionIds]);
        await c.query('COMMIT');
      } catch (e) {
        await c.query('ROLLBACK').catch(() => undefined);
        console.error('[peer-request-member.spec] cleanup:', (e as Error).message);
      } finally {
        c.release();
      }
    }
    await teardown(t);
  });

  /** A database version row of `peer_mesh` for `p` — `junk` ⇒ a definition that cannot even be PARSED (R1). */
  async function junkVersion(p: string): Promise<string> {
    const n = 1_900_000 + Math.floor(Math.random() * 99_999);
    const versionId = `peer_mesh.v${n}`;
    await t.pool.query(
      `INSERT INTO questionnaire_versions (id, kind, version, version_id, base_version_id, ruled_base_code_version_id, origin_pariwar_id, definition, authored_by_actor, authored_by_display, direct, reason)
       VALUES ($1, 'peer_mesh', $2, $3, 'peer_mesh.v4', 'peer_mesh.v4', $4, $5, 'pa', 'Pariwar Admin', false, NULL)`,
      [randomUUID(), n, versionId, p, JSON.stringify({ kind: 'peer_mesh', versionId, version: n, junk: true })],
    );
    chainVersionIds.push(versionId);
    return versionId;
  }

  async function seedMember(pariwarId: string): Promise<string> {
    const memberId = randomUUID();
    await t.pool.query(`INSERT INTO members (member_id, pariwar_id, state, state_event_version) VALUES ($1, $2, 'active', 1)`, [memberId, pariwarId]);
    return memberId;
  }

  /** A claim in `verification_in_progress` (through the projector), a selection naming `neighbour` + one other, and a
   *  ping each — the neighbour's TEXTED unless `texted: false`. */
  async function seedRequest(pariwarId: string, neighbour: string, opts: { texted?: boolean } = {}) {
    const deceased = ids.memberId(randomUUID());
    const cid = ids.claimId(randomUUID());
    const scopeTx = await openScopeTx(t.deps, pariwarId);
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
    await t.pool.query(
      `INSERT INTO claim_peer_mesh_selections (selection_id, claim_case_id, pariwar_id, deceased_member_id, deceased_created_at, metric_id,
         metric_version, selected_member_ids, candidate_snapshot, response_window_expires_at)
       VALUES ($1, $2, $3, $4, now(), 'm', 1, ARRAY[$5, $6]::uuid[], '[]'::jsonb, now() + interval '72 hours')`,
      [selectionId, cid, pariwarId, deceased, neighbour, other],
    );
    const pingId = randomUUID();
    const otherPingId = randomUUID();
    await t.pool.query(`INSERT INTO claim_peer_mesh_pings (ping_id, selection_id, pariwar_id, member_id) VALUES ($1, $2, $3, $4), ($5, $2, $3, $6)`, [
      pingId,
      selectionId,
      pariwarId,
      neighbour,
      otherPingId,
      other,
    ]);
    if (opts.texted !== false) {
      await t.pool.query(`UPDATE claim_peer_mesh_pings SET send_outcome = 'accepted', attempt_count = 1, send_updated_at = clock_timestamp() WHERE ping_id = ANY($1)`, [[pingId, otherPingId]]);
    }
    return { cid, deceased, pingId, otherPingId };
  }

  function token(memberId: string, pariwarId: string): string {
    return signAccessToken(t.app, { memberId, pariwarId, deviceId: 'test-device' }, 15 * 60 * 1000);
  }

  async function call(method: 'GET' | 'PUT' | 'POST', url: string, tok: string | null, payload?: Json, headers: Record<string, string> = {}) {
    const res = await t.app.inject({
      method,
      url,
      headers: { origin: ORIGIN, ...(tok ? { authorization: `Bearer ${tok}` } : {}), ...headers },
      ...(payload !== undefined ? { payload } : {}),
    });
    let body: Json = {};
    try {
      body = res.json() as Json;
    } catch {
      // empty
    }
    return { status: res.statusCode, body };
  }

  const base = (p: string) => `/api/v1/p/${p}/member/peer-requests`;
  /** Story 6.36 (AC16) — the words of the `relationship` option `school_colleague` in a detail body. */
  const schoolOption = (body: Json) =>
    (body['questionnaire'] as { pages: { questions: { key: string; options: { code: string; words: { en: string; hi: string } }[] }[] }[] }).pages
      .flatMap((pg) => pg.questions)
      .find((x) => x.key === 'relationship')!
      .options.find((o) => o.code === 'school_colleague')!.words;
  const put = (p: string, tok: string, ping: string, key: string, value: Json, idem = randomUUID()) =>
    call('PUT', `${base(p)}/${ping}/answers/${key}`, tok, { value }, { 'idempotency-key': idem });
  const submit = (p: string, tok: string, ping: string, idem = randomUUID()) => call('POST', `${base(p)}/${ping}/submit`, tok, undefined, { 'idempotency-key': idem });

  it('⛔ session ⇒ 401 — on EVERY route (review S26: the detail, the PUT and the submit, ⛔ only the list)', async () => {
    const p = randomUUID();
    const ping = randomUUID();
    expect((await call('GET', base(p), null)).status).toBe(401);
    expect((await call('GET', `${base(p)}/${ping}`, null)).status).toBe(401);
    expect((await call('PUT', `${base(p)}/${ping}/answers/has_died`, null, { value: { codes: ['died'] } }, { 'idempotency-key': randomUUID() })).status).toBe(401);
    expect((await call('POST', `${base(p)}/${ping}/submit`, null, undefined, { 'idempotency-key': randomUUID() })).status).toBe(401);
    // a token that is ⛔ a member ACCESS token (garbage) is refused the same way
    expect((await call('PUT', `${base(p)}/${ping}/answers/has_died`, 'not-a-token', { value: { codes: ['died'] } }, { 'idempotency-key': randomUUID() })).status).toBe(401);
  });

  it('the list: ONLY texted, open requests; the limit is bounded', async () => {
    const p = randomUUID();
    const m = await seedMember(p);
    const texted = await seedRequest(p, m);
    const untexted = await seedRequest(p, m, { texted: false });
    const tok = token(m, p);
    const res = await call('GET', `${base(p)}?limit=5`, tok);
    expect(res.status).toBe(200);
    const items = res.body['items'] as { pingId: string; memberName: string; askedOn: string }[];
    expect(items.map((i) => i.pingId)).toEqual([texted.pingId]);
    expect(items.map((i) => i.pingId)).not.toContain(untexted.pingId);
    expect(items[0]!.askedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Object.keys(items[0]!).sort()).toEqual(['askedOn', 'memberName', 'pingId']); // ⛔ claim, family or amount
    expect((await call('GET', `${base(p)}?limit=6`, tok)).status).toBe(400);
  });

  it('the detail: v2 SERVED (⛔ the pending health questions), words in en AND hi, ⛔ a claim / family / amount', async () => {
    const p = randomUUID();
    const m = await seedMember(p);
    const r = await seedRequest(p, m);
    const res = await call('GET', `${base(p)}/${r.pingId}`, token(m, p));
    expect(res.status).toBe(200);
    expect(Object.keys(res.body).sort()).toEqual(['answers', 'memberName', 'pingId', 'questionnaire', 'submitted']);
    const q = res.body['questionnaire'] as { versionId: string; pages: { questions: { key: string; words: { en: string; hi: string } }[] }[]; closingNote: { en: string } };
    // Story 6.27b (`-329`) — v3 was LIVE; ⭐ Story 6.36 (AC16, `-331` SC4 A) — v4 is LIVE (RED BY DESIGN: amended by NAMING v4).
    expect(q.versionId).toBe('peer_mesh.v4');
    expect(q.pages.flatMap((pg) => pg.questions.map((x) => x.key))).toEqual(['has_died', 'death_date', 'how_known', 'relationship', 'callback_consent']);
    expect(q.pages[0]!.questions[0]!.words.en).toMatch(/died\?$/);
    expect(q.pages[0]!.questions[0]!.words.hi).toMatch(/निधन/);
    expect(q.closingNote.en).toMatch(/^Your answers are saved as you go\./);
    expect(res.body['submitted']).toBe(false);
  });

  // ⭐ Story 6.27b (Task 3c.6; AC11; `-328` read with `-329`) — the call-back question's words follow the reply's PINNED version.
  // ⭐ Story 6.36 (AC16; `-331` SC4 A) — v4 is LIVE: a new reply pins v4, keeps v3's call-back words, and its relationship
  // option reads "school or office" — through the REAL `t()` in en AND hi.
  it('v4 — a NEW reply pins `peer_mesh.v4`, asks "May the Admin phone you about this?" and offers "A colleague at the same school or office" in en AND hi', async () => {
    const p = randomUUID();
    const m = await seedMember(p);
    const r = await seedRequest(p, m);
    const tok = token(m, p);
    const before = await call('GET', `${base(p)}/${r.pingId}`, tok);
    const words = (body: Json) =>
      (body['questionnaire'] as { pages: { questions: { key: string; words: { en: string; hi: string } }[] }[] }).pages
        .flatMap((pg) => pg.questions)
        .find((x) => x.key === 'callback_consent')!.words;
    expect(words(before.body)).toEqual({ en: 'May the Admin phone you about this?', hi: 'क्या एडमिन इस बारे में आपको फ़ोन कर सकते हैं?' });
    expect(schoolOption(before.body)).toEqual({ en: 'A colleague at the same school or office', hi: 'एक ही स्कूल या दफ़्तर में सहकर्मी' });
    expect((await put(p, tok, r.pingId, 'has_died', { codes: ['died'] })).status).toBe(200);
    const { rows } = await t.pool.query(`SELECT questionnaire_version_id FROM claim_peer_mesh_replies WHERE ping_id = $1`, [r.pingId]);
    expect(rows).toEqual([{ questionnaire_version_id: 'peer_mesh.v4' }]);
  });

  it('v3 is HISTORICAL (Story 6.36) — a reply STARTED on v3 keeps v3 and its words ("A colleague at the same school"); a save keeps the pin', async () => {
    const p = randomUUID();
    const m = await seedMember(p);
    const r = await seedRequest(p, m);
    const tok = token(m, p);
    const { rows: [sel] } = await t.pool.query<{ selection_id: string }>(`SELECT selection_id FROM claim_peer_mesh_pings WHERE ping_id = $1`, [r.pingId]);
    await t.pool.query(
      `INSERT INTO claim_peer_mesh_replies (reply_id, pariwar_id, claim_case_id, selection_id, ping_id, responder_member_id, questionnaire_version_id)
       VALUES ($1, $2, $3, $4, $5, $6, 'peer_mesh.v3')`,
      [randomUUID(), p, r.cid, sel!.selection_id, r.pingId, m],
    );
    const res = await call('GET', `${base(p)}/${r.pingId}`, tok);
    expect(res.status).toBe(200);
    expect((res.body['questionnaire'] as { versionId: string }).versionId).toBe('peer_mesh.v3');
    expect(schoolOption(res.body)).toEqual({ en: 'A colleague at the same school', hi: 'एक ही स्कूल में सहकर्मी' });
    expect((await put(p, tok, r.pingId, 'relationship', { codes: ['school_colleague'] })).status).toBe(200);
    const { rows } = await t.pool.query(`SELECT questionnaire_version_id FROM claim_peer_mesh_replies WHERE ping_id = $1`, [r.pingId]);
    expect(rows).toEqual([{ questionnaire_version_id: 'peer_mesh.v3' }]);
  });

  it('v2 is HISTORICAL — a reply STARTED on v2 keeps v2 and its old words ("May the District Admin …"); a save keeps the pin', async () => {
    const p = randomUUID();
    const m = await seedMember(p);
    const r = await seedRequest(p, m);
    const tok = token(m, p);
    const { rows: [sel] } = await t.pool.query<{ selection_id: string }>(`SELECT selection_id FROM claim_peer_mesh_pings WHERE ping_id = $1`, [r.pingId]);
    await t.pool.query(
      `INSERT INTO claim_peer_mesh_replies (reply_id, pariwar_id, claim_case_id, selection_id, ping_id, responder_member_id, questionnaire_version_id)
       VALUES ($1, $2, $3, $4, $5, $6, 'peer_mesh.v2')`,
      [randomUUID(), p, r.cid, sel!.selection_id, r.pingId, m],
    );
    const res = await call('GET', `${base(p)}/${r.pingId}`, tok);
    expect(res.status).toBe(200);
    const q = res.body['questionnaire'] as { versionId: string; pages: { questions: { key: string; words: { en: string; hi: string } }[] }[] };
    expect(q.versionId).toBe('peer_mesh.v2');
    expect(q.pages.flatMap((pg) => pg.questions).find((x) => x.key === 'callback_consent')!.words).toEqual({
      en: 'May the District Admin phone you about this?',
      hi: 'क्या ज़िला एडमिन इस बारे में आपको फ़ोन कर सकते हैं?',
    });
    expect((await put(p, tok, r.pingId, 'has_died', { codes: ['died'] })).status).toBe(200);
    const { rows } = await t.pool.query(`SELECT questionnaire_version_id FROM claim_peer_mesh_replies WHERE ping_id = $1`, [r.pingId]);
    expect(rows).toEqual([{ questionnaire_version_id: 'peer_mesh.v2' }]);
  });

  it('ONE indistinguishable 404 on EVERY route: ⛔ texted, another member\'s, another Pariwar\'s path, unknown', async () => {
    const p = randomUUID();
    const m = await seedMember(p);
    const r = await seedRequest(p, m);
    const untexted = await seedRequest(p, m, { texted: false });
    const tok = token(m, p);
    const otherPariwar = randomUUID();
    const cases: [string, string][] = [
      ['untexted', untexted.pingId],
      ["another member's", r.otherPingId],
      ['unknown', randomUUID()],
    ];
    const bodies: Json[] = [];
    for (const [why, ping] of cases) {
      for (const res of [
        await call('GET', `${base(p)}/${ping}`, tok),
        await put(p, tok, ping, 'has_died', { codes: ['died'] }),
        await submit(p, tok, ping),
      ]) {
        expect(res.status, why).toBe(404);
        bodies.push((res.body['error'] as Json) ?? {});
      }
    }
    // another Pariwar in the PATH (the session's is `p`)
    for (const res of [
      await call('GET', `${base(otherPariwar)}/${r.pingId}`, tok),
      await put(otherPariwar, tok, r.pingId, 'has_died', { codes: ['died'] }),
      await submit(otherPariwar, tok, r.pingId),
    ]) {
      expect(res.status).toBe(404);
      bodies.push((res.body['error'] as Json) ?? {});
    }
    for (const b of bodies) expect({ code: b['code'], message: b['message'] }).toEqual({ code: 'peer_request.not_found', message: 'Not found' });
  });

  it('the auto-save: Idempotency-Key required and replayed; a date stored ENCRYPTED with three indexes and read back to its owner; 422 on a bad value; ⛔ Turnstile', async () => {
    const p = randomUUID();
    const m = await seedMember(p);
    const r = await seedRequest(p, m);
    const tok = token(m, p);
    expect((await call('PUT', `${base(p)}/${r.pingId}/answers/has_died`, tok, { value: { codes: ['died'] } })).status).toBe(400);
    const key = randomUUID();
    const first = await put(p, tok, r.pingId, 'has_died', { codes: ['died'] }, key);
    expect(first.status).toBe(200);
    const auditCount = async () =>
      (await t.pool.query(`SELECT count(*)::int AS n FROM audit_log_entries WHERE resource_locator = $1 AND action = 'claim.peer_answer_saved'`, [`claim:${String(r.cid).toLowerCase()}`])).rows[0]!.n as number;
    const rowCount = async () => (await t.pool.query(`SELECT count(*)::int AS n FROM claim_peer_mesh_reply_answers WHERE claim_case_id = $1`, [r.cid])).rows[0]!.n as number;
    const [auditsBefore, rowsBefore] = [await auditCount(), await rowCount()];
    const replay = await put(p, tok, r.pingId, 'has_died', { codes: ['died'] }, key);
    expect(replay.status).toBe(200);
    expect(replay.body['answers']).toEqual(first.body['answers']);
    // ⭐ Review S27 (a) — a REPLAY, ⛔ a silent second write: ⛔ a new row, ⛔ a new audit line.
    expect([await auditCount(), await rowCount()]).toEqual([auditsBefore, rowsBefore]);
    // ⭐ Review S20 — a re-save of the SAME value under a NEW key is a no-op: ⛔ a row, ⛔ a "saved" audit line.
    const same = await put(p, tok, r.pingId, 'has_died', { codes: ['died'] });
    expect(same.status).toBe(200);
    expect([await auditCount(), await rowCount()]).toEqual([auditsBefore, rowsBefore]);
    const date = await put(p, tok, r.pingId, 'death_date', { date: '2026-10-01' });
    expect(date.status).toBe(200);
    const { rows } = await t.pool.query(`SELECT value_codes, value_ciphertext, death_date_window_indexes FROM claim_peer_mesh_reply_answers WHERE claim_case_id = $1 AND question_key = 'death_date'`, [r.cid]);
    expect(rows[0]!.value_codes).toBeNull();
    expect(rows[0]!.value_ciphertext).toMatch(/^enc:v1:/);
    expect(rows[0]!.value_ciphertext).not.toContain('2026-10-01');
    expect(rows[0]!.death_date_window_indexes).toHaveLength(3);
    const detail = await call('GET', `${base(p)}/${r.pingId}`, tok);
    const answers = detail.body['answers'] as { questionKey: string; value: Json }[];
    expect(answers.find((a) => a.questionKey === 'death_date')!.value).toEqual({ date: '2026-10-01' });
    // ⛔ PII escapes (AC9): the audit rows carry the claim and a HASH only; the ONE event carries the 6.6 payload only.
    const audits = await t.pool.query(`SELECT action, resource_locator, request_payload_hash FROM audit_log_entries WHERE resource_locator = $1`, [`claim:${String(r.cid).toLowerCase()}`]);
    expect(audits.rows.map((a) => a.action)).toContain('claim.peer_answer_saved');
    expect(JSON.stringify(audits.rows)).not.toContain('2026-10-01');
    const events = await t.pool.query(`SELECT event_type, payload FROM events_log WHERE stream_id = $1 AND event_type = 'claim.peer_mesh_responded'`, [r.cid]);
    expect(events.rows).toHaveLength(1);
    expect(Object.keys(events.rows[0]!.payload as object).sort()).toEqual(['actor', 'from_state', 'responder_member_id', 'response', 'to_state', 'trigger']);
    expect(JSON.stringify(events.rows)).not.toContain('2026-10-01');
    const bad = await put(p, tok, r.pingId, 'death_cause', { codes: ['old_age'] });
    expect(bad.status).toBe(422);
    expect((bad.body['error'] as Json)['code']).toBe('peer_request.invalid_answer');
    // ⛔ the value in the error body
    expect(JSON.stringify(bad.body)).not.toContain('old_age');
  });

  it('⭐ Story 6.33 (R7) — the save carries the RENDERED version: matching ⇒ 200; another ⇒ 409 questionnaire_version_stale (RELOAD, ⛔ the retryable stale); a malformed id ⇒ 400', async () => {
    const p = randomUUID();
    const m = await seedMember(p);
    const r = await seedRequest(p, m);
    const tok = token(m, p);
    const send = (versionId: string) =>
      call('PUT', `${base(p)}/${r.pingId}/answers/has_died`, tok, { value: { codes: ['died'] }, questionnaireVersionId: versionId }, { 'idempotency-key': randomUUID() });
    const stale = await send('peer_mesh.v3');
    expect(stale.status).toBe(409);
    expect((stale.body['error'] as Json)['code']).toBe('peer_request.questionnaire_version_stale');
    expect((await send('ground_inspection.v1')).status).toBe(400);
    expect((await send('peer_mesh.v4')).status).toBe(200);
  });

  it('⭐ review RV31 / R7 (v) — a reply PINNED to a version that cannot be PARSED: the detail ⇒ 409 `peer_request.questionnaire_version_unreadable` and the save ⇒ 409 the same (⛔ a 500, ⛔ the retryable stale)', async () => {
    const p = randomUUID();
    const m = await seedMember(p);
    const r = await seedRequest(p, m);
    const tok = token(m, p);
    const junk = await junkVersion(p);
    const { rows: [sel] } = await t.pool.query<{ selection_id: string }>(`SELECT selection_id FROM claim_peer_mesh_pings WHERE ping_id = $1`, [r.pingId]);
    await t.pool.query(
      `INSERT INTO claim_peer_mesh_replies (reply_id, pariwar_id, claim_case_id, selection_id, ping_id, responder_member_id, questionnaire_version_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [randomUUID(), p, r.cid, sel!.selection_id, r.pingId, m, junk],
    );
    const detail = await call('GET', `${base(p)}/${r.pingId}`, tok);
    expect(detail.status, JSON.stringify(detail.body)).toBe(409);
    expect((detail.body['error'] as Json)['code']).toBe('peer_request.questionnaire_version_unreadable');
    const save = await call('PUT', `${base(p)}/${r.pingId}/answers/has_died`, tok, { value: { codes: ['died'] }, questionnaireVersionId: junk }, { 'idempotency-key': randomUUID() });
    expect(save.status, JSON.stringify(save.body)).toBe(409);
    expect((save.body['error'] as Json)['code']).toBe('peer_request.questionnaire_version_unreadable');
  });

  it('an undecryptable saved date remains explicitly unavailable to its owner (review R10)', async () => {
    const p = randomUUID();
    const m = await seedMember(p);
    const r = await seedRequest(p, m);
    const tok = token(m, p);
    expect((await put(p, tok, r.pingId, 'has_died', { codes: ['died'] })).status).toBe(200);
    expect((await put(p, tok, r.pingId, 'death_date', { date: '2026-10-01' })).status).toBe(200);
    await t.pool.query("UPDATE claim_peer_mesh_reply_answers SET value_ciphertext = 'broken-envelope' WHERE claim_case_id = $1 AND question_key = 'death_date'", [r.cid]);
    const detail = await call('GET', `${base(p)}/${r.pingId}`, tok);
    expect(detail.status).toBe(200);
    expect(detail.body['answers']).toContainEqual(expect.objectContaining({ questionKey: 'death_date', value: { unavailable: true } }));
  });

  it('Submit: 200, then 409 submitted (a second Submit, a save, the detail); a closed claim is 409 no_longer_open', async () => {
    const p = randomUUID();
    const m = await seedMember(p);
    const r = await seedRequest(p, m);
    const tok = token(m, p);
    expect((await put(p, tok, r.pingId, 'has_died', { codes: ['not_died'] })).status).toBe(200);
    const key = randomUUID();
    expect((await submit(p, tok, r.pingId, key)).status).toBe(200);
    expect((await submit(p, tok, r.pingId, key)).status).toBe(200); // the replay
    // ⭐ Review S19 — a SAVE that committed, replayed after the Submit, still answers 200 with the answers (⛔ a 409).
    const saveKey = randomUUID();
    const late = await seedRequest(p, m);
    expect((await put(p, tok, late.pingId, 'has_died', { codes: ['died'] }, saveKey)).status).toBe(200);
    expect((await submit(p, tok, late.pingId)).status).toBe(200);
    const replayed = await put(p, tok, late.pingId, 'has_died', { codes: ['died'] }, saveKey);
    expect(replayed.status).toBe(200);
    expect(replayed.body['answers']).toEqual([expect.objectContaining({ questionKey: 'has_died', value: { codes: ['died'] } })]);
    for (const res of [await submit(p, tok, r.pingId), await put(p, tok, r.pingId, 'how_known', { codes: ['other'] }), await call('GET', `${base(p)}/${r.pingId}`, tok)]) {
      expect(res.status).toBe(409);
      expect((res.body['error'] as Json)['code']).toBe('peer_request.submitted');
    }
    // a closed claim
    const closed = await seedRequest(p, m);
    const c = await t.pool.connect();
    try {
      await c.query('BEGIN');
      await c.query(`SET LOCAL app.claim_state_writer = 'on'`);
      await c.query(`UPDATE claims SET current_state = 'closed' WHERE claim_case_id = $1`, [closed.cid]);
      await c.query('COMMIT');
    } finally {
      c.release();
    }
    const res = await put(p, tok, closed.pingId, 'has_died', { codes: ['died'] });
    expect(res.status).toBe(409);
    expect((res.body['error'] as Json)['code']).toBe('peer_request.no_longer_open');
    expect((await call('GET', `${base(p)}?limit=5`, tok)).body['items']).toEqual([]);
  });
});
