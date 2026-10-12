// Migration 0156 — the neighbours' replies and answers, and the ping's delivery-record columns (Story 6.27a, Task 2; AC3).
// Live DB; per-test ROLLBACK. Every refusal runs under a SAVEPOINT so one test can assert several.
//   · the ping: the delivery columns, the structural CHECKs (`recorded` refused; `attempt_count` 0 ⇔ not begun; claimed /
//     parked; `locale_source`; the link code's form + uniqueness), the REVOKE + column GRANT (`UPDATE … SET message_key`
//     refused for `twt_app`), the finished-row trigger (a finished outcome never rewritten; never back to NULL;
//     `aging_since` forward-only; `link_code` written once), the partial index;
//   · the replies: the composite FK (⛔ another Pariwar's claim), ONE per ping, `UNIQUE (pariwar_id, reply_id)`,
//     `submitted_at` forward-only, every other column frozen;
//   · the answers — the trigger holds AT ALL TIMES: an INSERT and a `superseded_at` NULL → set ONLY while the reply is open
//     AND the claim is in the window; a CODES rewrite refused; the indexes set to a non-NULL value refused; `superseded_at`
//     cleared or moved refused; the 0143-form erasure arm ADMITS a ciphertext-only rewrite or an indexes → NULL write of ANY
//     row — an open one included (RECORDED — 0149's limit, ⛔ never claimed refused) and refuses any other column change;
//     the exactly-one-value, the indexes and the saved_via CHECKs; the partial UNIQUE;
//   · the plpgsql answer window is parity-tested against `isClaimInAnswerWindow` / `isStateInAnswerWindow` over EVERY
//     claim state × routed / not routed;
//   · RLS: per-command policies, FORCE, a cross-tenant reader sees nothing, the fail-closed probe, ⛔ no DELETE.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { isClaimInAnswerWindow, isStateInAnswerWindow } from '../../../src/claim/answer-window.js';
import { bindScopedDb } from '../../../src/db.js';
import { claimId as toClaimId, pariwarId as toPariwarId } from '../../../src/ids/index.js';
import { CLAIM_LIFECYCLE_STATES } from '../../../src/schema/claims.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { enterAppRoleNoScope, enterAppScope, PARIWAR_A, PARIWAR_B, seedClaim } from '../_helpers.js';

type Client = ReturnType<typeof getTx>['client'];

/** Run `text` under a SAVEPOINT; return the SQLSTATE (or null on success) and roll the savepoint back on failure. */
async function attempt(client: Client, text: string, params: unknown[] = []): Promise<{ code: string | null; message: string }> {
  await client.query('SAVEPOINT probe');
  try {
    await client.query(text, params);
    await client.query('RELEASE SAVEPOINT probe');
    return { code: null, message: '' };
  } catch (err) {
    await client.query('ROLLBACK TO SAVEPOINT probe');
    const e = err as { code?: string; message?: string };
    return { code: e.code ?? 'unknown', message: e.message ?? '' };
  }
}

/** As the superuser: a claim in `state`, its selection and ONE ping. */
async function seedPing(client: Client, pariwarId: string, state = 'verification_in_progress') {
  const { tx } = getTx();
  const claimCaseId = await seedClaim(tx, pariwarId, { currentState: state as never });
  const selectionId = randomUUID();
  const memberId = randomUUID();
  await client.query(
    `INSERT INTO claim_peer_mesh_selections (selection_id, claim_case_id, pariwar_id, deceased_member_id, deceased_created_at, metric_id,
       metric_version, selected_member_ids, candidate_snapshot, response_window_expires_at)
     VALUES ($1, $2, $3, $4, now(), 'm', 1, ARRAY[$5]::uuid[], '[]'::jsonb, now() + interval '72 hours')`,
    [selectionId, claimCaseId, pariwarId, randomUUID(), memberId],
  );
  const pingId = randomUUID();
  await client.query(`INSERT INTO claim_peer_mesh_pings (ping_id, selection_id, pariwar_id, member_id) VALUES ($1, $2, $3, $4)`, [
    pingId,
    selectionId,
    pariwarId,
    memberId,
  ]);
  return { claimCaseId, selectionId, pingId, memberId };
}

async function seedReply(client: Client, pariwarId: string, state = 'verification_in_progress') {
  const ping = await seedPing(client, pariwarId, state);
  const replyId = randomUUID();
  await client.query(
    `INSERT INTO claim_peer_mesh_replies (reply_id, pariwar_id, claim_case_id, selection_id, ping_id, responder_member_id, questionnaire_version_id)
     VALUES ($1, $2, $3, $4, $5, $6, 'peer_mesh.v2')`,
    [replyId, pariwarId, ping.claimCaseId, ping.selectionId, ping.pingId, ping.memberId],
  );
  return { ...ping, replyId, pariwarId };
}

const INSERT_ANSWER = `INSERT INTO claim_peer_mesh_reply_answers (answer_id, pariwar_id, claim_case_id, reply_id, question_key, value_codes,
    value_ciphertext, death_date_window_indexes, saved_via, saved_by_actor_id)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'member_app', 'm')`;

async function insertAnswer(
  client: Client,
  r: { pariwarId: string; claimCaseId: string; replyId: string },
  key: string,
  v: { codes?: string[] | null; cipher?: string | null; indexes?: string[] | null } = { codes: ['died'] },
) {
  const answerId = randomUUID();
  await client.query(INSERT_ANSWER, [answerId, r.pariwarId, r.claimCaseId, r.replyId, key, v.codes ?? null, v.cipher ?? null, v.indexes ?? null]);
  return answerId;
}

async function setClaimState(client: Client, pariwarId: string, claimCaseId: string, state: string) {
  await client.query(`SET LOCAL app.claim_state_writer = 'on'`);
  await client.query(`UPDATE claims SET current_state = $3 WHERE pariwar_id = $1 AND claim_case_id = $2`, [pariwarId, claimCaseId, state]);
  await client.query(`SET LOCAL app.claim_state_writer = 'off'`);
}

async function routeToR9(client: Client, pariwarId: string, claimCaseId: string) {
  await client.query(
    `INSERT INTO claim_state_trustee_decisions (claim_case_id, pariwar_id, phase, outcome, reason_code, actor_id, actor_display)
     VALUES ($1, $2, 'routing', 'routed_to_r9', 'r9_special_case', 'pa', 'Pariwar Admin')`,
    [claimCaseId, pariwarId],
  );
}

describe.skipIf(!hasDatabase)('0156 — the ping delivery record, the replies, the answers', { timeout: 20000 }, () => {
  setupLiveDb();

  describe('the ping', () => {
    it('the structural CHECKs: `recorded` refused; attempt_count 0 ⇔ not begun; attempting names its holder; parked; locale; link code', async () => {
      const { client } = getTx();
      const p = await seedPing(client, PARIWAR_A);
      const upd = (set: string) => attempt(client, `UPDATE claim_peer_mesh_pings SET ${set} WHERE ping_id = $1`, [p.pingId]);
      expect((await upd(`send_outcome = 'recorded', attempt_count = 1`)).code).toBe('23514');
      expect((await upd(`send_outcome = 'accepted', attempt_count = 0`)).code).toBe('23514');
      expect((await upd(`attempt_count = 1`)).code).toBe('23514');
      expect((await upd(`send_outcome = 'attempting', attempt_count = 1`)).code).toBe('23514');
      expect((await upd(`send_outcome = 'attempting', attempt_count = 1, claimed_at = now(), claimed_by_job = 'sweep:held'`)).code).toBe('23514');
      expect((await upd(`locale_source = 'member_choice'`)).code).toBe('23514');
      expect((await upd(`link_code = 'short'`)).code).toBe('23514');
      expect((await upd(`detail = repeat('x', 201)`)).code).toBe('23514');
      expect((await upd(`send_outcome = 'attempting', attempt_count = 1, claimed_at = now(), claimed_by_job = 'job-1', locale_source = 'pariwar_default', link_code = 'Ab3dEf7hIj9K', aging_since = now()`)).code).toBeNull();
      // a second ping may ⛔ not carry the same link code
      const q = await seedPing(client, PARIWAR_A);
      expect((await attempt(client, `UPDATE claim_peer_mesh_pings SET link_code = 'Ab3dEf7hIj9K' WHERE ping_id = $1`, [q.pingId])).code).toBe('23505');
    });

    it('the finished-row trigger: a finished send is never rewritten; never back to NULL; aging_since forward-only; link_code written once', async () => {
      const { client } = getTx();
      const p = await seedPing(client, PARIWAR_A);
      const upd = (set: string) => attempt(client, `UPDATE claim_peer_mesh_pings SET ${set} WHERE ping_id = $1`, [p.pingId]);
      expect((await upd(`send_outcome = 'attempting', attempt_count = 1, claimed_at = now(), claimed_by_job = 'j', aging_since = now(), link_code = 'Ab3dEf7hIj9K'`)).code).toBeNull();
      expect((await upd(`aging_since = aging_since - interval '1 hour'`)).message).toMatch(/aging_since moves only forward/);
      expect((await upd(`link_code = 'Zz3dEf7hIj9K'`)).message).toMatch(/link_code is written once/);
      expect((await upd(`detail = 'rate_limited:x', send_updated_at = now()`)).code).toBeNull(); // the transient note
      expect((await upd(`send_outcome = 'accepted', provider_message_id = 'pm-1'`)).code).toBeNull();
      expect((await upd(`send_outcome = 'error'`)).message).toMatch(/a finished send \(accepted\) is never rewritten/);
      expect((await upd(`detail = 'x'`)).message).toMatch(/never rewritten/);
      expect((await upd(`send_outcome = NULL, attempt_count = 0`)).message).toMatch(/never rewritten/);
    });

    it('a skip at the locked re-check is a finished outcome straight from NULL (0151\'s no_target precedent)', async () => {
      const { client } = getTx();
      const p = await seedPing(client, PARIWAR_A);
      expect((await attempt(client, `UPDATE claim_peer_mesh_pings SET send_outcome = 'no_target', attempt_count = 1, detail = 'no_target:peer_not_active' WHERE ping_id = $1`, [p.pingId])).code).toBeNull();
      expect((await attempt(client, `UPDATE claim_peer_mesh_pings SET send_outcome = 'attempting', claimed_at = now(), claimed_by_job = 'j' WHERE ping_id = $1`, [p.pingId])).message).toMatch(/never rewritten/);
    });

    it('the REVOKE + column GRANT: twt_app may update the delivery columns, ⛔ never message_key (or any 6.6 column)', async () => {
      const { client } = getTx();
      const p = await seedPing(client, PARIWAR_A);
      await enterAppScope(client, PARIWAR_A);
      expect((await attempt(client, `UPDATE claim_peer_mesh_pings SET message_key = 'other' WHERE ping_id = $1`, [p.pingId])).code).toBe('42501');
      expect((await attempt(client, `UPDATE claim_peer_mesh_pings SET member_id = gen_random_uuid() WHERE ping_id = $1`, [p.pingId])).code).toBe('42501');
      const r = await client.query(`UPDATE claim_peer_mesh_pings SET send_outcome = 'no_target', attempt_count = 1 WHERE ping_id = $1`, [p.pingId]);
      expect(r.rowCount).toBe(1);
    });

    it('the partial index on attempting rows exists by name', async () => {
      const { client } = getTx();
      const { rows } = await client.query(`SELECT indexdef FROM pg_indexes WHERE indexname = 'claim_peer_mesh_pings_attempting_idx'`);
      expect(rows[0]?.indexdef).toMatch(/\(aging_since, claimed_at\) WHERE \(send_outcome = 'attempting'::text\)/);
    });
  });

  describe('the replies', () => {
    it('ONE per ping; the composite FK refuses another Pariwar\'s claim; UNIQUE (pariwar_id, reply_id) exists', async () => {
      const { client } = getTx();
      const r = await seedReply(client, PARIWAR_A);
      const dup = await attempt(
        client,
        `INSERT INTO claim_peer_mesh_replies (pariwar_id, claim_case_id, selection_id, ping_id, responder_member_id, questionnaire_version_id)
         VALUES ($1, $2, $3, $4, $5, 'peer_mesh.v2')`,
        [PARIWAR_A, r.claimCaseId, r.selectionId, r.pingId, r.memberId],
      );
      expect(dup.code).toBe('23505');
      const other = await seedPing(client, PARIWAR_A);
      const cross = await attempt(
        client,
        `INSERT INTO claim_peer_mesh_replies (pariwar_id, claim_case_id, selection_id, ping_id, responder_member_id, questionnaire_version_id)
         VALUES ($1, $2, $3, $4, $5, 'peer_mesh.v2')`,
        [PARIWAR_B, other.claimCaseId, other.selectionId, other.pingId, other.memberId],
      );
      expect(cross.code).toBe('23503');
      const { rows } = await client.query(`SELECT 1 FROM pg_constraint WHERE conname = 'claim_peer_mesh_replies_pariwar_reply_uq'`);
      expect(rows).toHaveLength(1);
    });

    it('submitted_at is forward-only; every other column is frozen', async () => {
      const { client } = getTx();
      const r = await seedReply(client, PARIWAR_A);
      const upd = (set: string) => attempt(client, `UPDATE claim_peer_mesh_replies SET ${set} WHERE reply_id = $1`, [r.replyId]);
      expect((await upd(`questionnaire_version_id = 'peer_mesh.v1'`)).message).toMatch(/only submitted_at/);
      expect((await upd(`submitted_at = clock_timestamp()`)).code).toBeNull();
      expect((await upd(`submitted_at = NULL`)).message).toMatch(/stays submitted/);
      expect((await upd(`submitted_at = submitted_at + interval '1 minute'`)).message).toMatch(/stays submitted/);
    });
  });

  describe('the answers — the trigger holds AT ALL TIMES', () => {
    it('an INSERT and a supersede while open AND in the window', async () => {
      const { client } = getTx();
      const r = await seedReply(client, PARIWAR_A);
      const a1 = await insertAnswer(client, r, 'has_died', { codes: ['died'] });
      expect((await attempt(client, `UPDATE claim_peer_mesh_reply_answers SET superseded_at = clock_timestamp() WHERE answer_id = $1`, [a1])).code).toBeNull();
      await insertAnswer(client, r, 'has_died', { codes: ['not_sure'] });
    });

    it('ONE live answer per question per reply (the partial UNIQUE)', async () => {
      const { client } = getTx();
      const r = await seedReply(client, PARIWAR_A);
      await insertAnswer(client, r, 'has_died');
      const second = await attempt(client, INSERT_ANSWER, [randomUUID(), r.pariwarId, r.claimCaseId, r.replyId, 'has_died', ['not_died'], null, null]);
      expect(second.code).toBe('23505');
    });

    it('after Submit: an insert AND a supersede are refused', async () => {
      const { client } = getTx();
      const r = await seedReply(client, PARIWAR_A);
      const a1 = await insertAnswer(client, r, 'has_died');
      await client.query(`UPDATE claim_peer_mesh_replies SET submitted_at = clock_timestamp() WHERE reply_id = $1`, [r.replyId]);
      expect((await attempt(client, INSERT_ANSWER, [randomUUID(), r.pariwarId, r.claimCaseId, r.replyId, 'how_known', ['other'], null, null])).message).toMatch(/submitted/);
      expect((await attempt(client, `UPDATE claim_peer_mesh_reply_answers SET superseded_at = clock_timestamp() WHERE answer_id = $1`, [a1])).message).toMatch(/submitted/);
    });

    it('outside the window: an insert AND a supersede are refused (closed; state_trustee_approved without a live R9 routing)', async () => {
      const { client } = getTx();
      for (const state of ['closed', 'state_trustee_approved', 'denied', 'approved']) {
        const r = await seedReply(client, PARIWAR_A);
        const a1 = await insertAnswer(client, r, 'has_died');
        await setClaimState(client, PARIWAR_A, r.claimCaseId, state);
        expect((await attempt(client, INSERT_ANSWER, [randomUUID(), r.pariwarId, r.claimCaseId, r.replyId, 'how_known', ['other'], null, null])).message, state).toMatch(/outside the answer window/);
        expect((await attempt(client, `UPDATE claim_peer_mesh_reply_answers SET superseded_at = clock_timestamp() WHERE answer_id = $1`, [a1])).message, state).toMatch(/outside the answer window/);
      }
    });

    it('state_trustee_approved WITH a live R9 routing is in the window', async () => {
      const { client } = getTx();
      const r = await seedReply(client, PARIWAR_A, 'state_trustee_approved');
      await routeToR9(client, PARIWAR_A, r.claimCaseId);
      await insertAnswer(client, r, 'has_died');
    });

    it('while OPEN: a CODES rewrite, the indexes set to a non-NULL value, superseded_at cleared or moved — each refused', async () => {
      const { client } = getTx();
      const r = await seedReply(client, PARIWAR_A);
      const a = await insertAnswer(client, r, 'has_died', { codes: ['died'] });
      const d = await insertAnswer(client, r, 'death_date', { cipher: 'enc:v1:d', indexes: ['i1', 'i2', 'i3'] });
      const upd = (id: string, set: string) => attempt(client, `UPDATE claim_peer_mesh_reply_answers SET ${set} WHERE answer_id = $1`, [id]);
      expect((await upd(a, `value_codes = ARRAY['not_died']`)).message).toMatch(/append-only/);
      expect((await upd(d, `death_date_window_indexes = ARRAY['x1', 'x2', 'x3']`)).message).toMatch(/append-only/);
      expect((await upd(a, `saved_at = saved_at + interval '1 second'`)).message).toMatch(/append-only/);
      expect((await upd(a, `superseded_at = clock_timestamp()`)).code).toBeNull();
      expect((await upd(a, `superseded_at = NULL`)).message).toMatch(/append-only/);
      expect((await upd(a, `superseded_at = superseded_at + interval '1 minute'`)).message).toMatch(/append-only/);
    });

    it('the ERASURE ARM (0143\'s form): ⚠ RECORDED — a ciphertext-only rewrite or an indexes → NULL write is ADMITTED, even on an OPEN row and after the claim closed (0149\'s limit, ⛔ never claimed refused)', async () => {
      const { client } = getTx();
      const r = await seedReply(client, PARIWAR_A);
      const d = await insertAnswer(client, r, 'death_date', { cipher: 'enc:v1:d', indexes: ['i1', 'i2', 'i3'] });
      const upd = (set: string) => attempt(client, `UPDATE claim_peer_mesh_reply_answers SET ${set} WHERE answer_id = $1`, [d]);
      expect((await upd(`value_ciphertext = 'enc:v1:sentinel-1'`)).code).toBeNull(); // OPEN row — admitted (RECORDED)
      expect((await upd(`death_date_window_indexes = NULL`)).code).toBeNull();
      await client.query(`UPDATE claim_peer_mesh_replies SET submitted_at = clock_timestamp() WHERE reply_id = $1`, [r.replyId]);
      await setClaimState(client, PARIWAR_A, r.claimCaseId, 'closed');
      expect((await upd(`value_ciphertext = 'enc:v1:sentinel-2'`)).code).toBeNull(); // after Submit AND closure
      // …and it refuses any other column change, the ciphertext to NULL, and the indexes back to a value.
      expect((await upd(`value_ciphertext = 'enc:v1:s3', question_key = 'other'`)).message).toMatch(/append-only/);
      expect((await upd(`value_ciphertext = NULL, value_codes = ARRAY['unknown']`)).message).toMatch(/append-only/);
      expect((await upd(`death_date_window_indexes = ARRAY['a', 'b', 'c']`)).message).toMatch(/append-only/);
    });

    it('the CHECKs: exactly one value form; the indexes only on the date beside a ciphertext, three of them; saved_via', async () => {
      const { client } = getTx();
      const r = await seedReply(client, PARIWAR_A);
      const ins = (key: string, codes: string[] | null, cipher: string | null, idx: string[] | null) =>
        attempt(client, INSERT_ANSWER, [randomUUID(), r.pariwarId, r.claimCaseId, r.replyId, key, codes, cipher, idx]);
      expect((await ins('has_died', null, null, null)).code).toBe('23514');
      expect((await ins('has_died', ['died'], 'enc:v1:x', null)).code).toBe('23514');
      expect((await ins('has_died', [], null, null)).code).toBe('23514');
      expect((await ins('death_cause', null, 'enc:v1:x', ['a', 'b', 'c'])).code).toBe('23514');
      expect((await ins('death_date', null, 'enc:v1:x', ['a', 'b'])).code).toBe('23514');
      expect((await ins('death_date', ['unknown'], null, ['a', 'b', 'c'])).code).toBe('23514');
      expect((await ins('death_date', ['unknown'], null, null)).code).toBeNull(); // "I don't know the date"
      const via = await attempt(
        client,
        `INSERT INTO claim_peer_mesh_reply_answers (pariwar_id, claim_case_id, reply_id, question_key, value_codes, saved_via, saved_by_actor_id)
         VALUES ($1, $2, $3, 'how_known', ARRAY['other'], 'sms', 'm')`,
        [r.pariwarId, r.claimCaseId, r.replyId],
      );
      expect(via.code).toBe('23514');
    });
  });

  describe('the plpgsql answer window ⇔ claim/answer-window.ts (parity)', () => {
    it('every claim state × routed / not routed', async () => {
      const { client } = getTx();
      const db = bindScopedDb(client);
      for (const state of CLAIM_LIFECYCLE_STATES) {
        for (const routed of [false, true]) {
          const { tx } = getTx();
          const cid = await seedClaim(tx, PARIWAR_A, { currentState: state });
          if (routed) await routeToR9(client, PARIWAR_A, cid);
          const { rows } = await client.query<{ open: boolean }>(`SELECT claim_peer_mesh_answer_window_open($1, $2) AS open`, [PARIWAR_A, cid]);
          const ts = await isClaimInAnswerWindow(db, toPariwarId(PARIWAR_A), toClaimId(cid), state);
          expect(rows[0]!.open, `${state} / routed=${routed}`).toBe(ts);
          expect(ts, `${state} / routed=${routed}`).toBe(isStateInAnswerWindow(state, routed));
        }
      }
    });
  });

  describe('RLS', () => {
    it('RLS is ENABLED + FORCED; per-command policies; ⛔ no DELETE grant', async () => {
      const { client } = getTx();
      for (const t of ['claim_peer_mesh_replies', 'claim_peer_mesh_reply_answers']) {
        const { rows } = await client.query(`SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = $1`, [t]);
        expect(rows[0]).toEqual({ relrowsecurity: true, relforcerowsecurity: true });
        const pol = await client.query(`SELECT polname, polcmd FROM pg_policy WHERE polrelid = $1::regclass ORDER BY polname`, [t]);
        expect(pol.rows.map((r) => `${r.polname}:${r.polcmd}`)).toEqual([
          `${t}_tenant_isolation_insert:a`,
          `${t}_tenant_isolation_select:r`,
          `${t}_tenant_isolation_update:w`,
        ]);
        const del = await client.query(`SELECT has_table_privilege('twt_app', $1, 'DELETE') AS d`, [t]);
        expect(del.rows[0].d).toBe(false);
      }
    });

    it('a cross-tenant reader sees nothing; the unscoped probe sees nothing; WITH CHECK refuses another Pariwar', async () => {
      const { client } = getTx();
      const r = await seedReply(client, PARIWAR_A);
      await insertAnswer(client, r, 'has_died');
      await client.query('SAVEPOINT scope');
      await enterAppScope(client, PARIWAR_B);
      expect((await client.query(`SELECT 1 FROM claim_peer_mesh_replies WHERE reply_id = $1`, [r.replyId])).rows).toHaveLength(0);
      expect((await client.query(`SELECT 1 FROM claim_peer_mesh_reply_answers WHERE reply_id = $1`, [r.replyId])).rows).toHaveLength(0);
      // Refused — by the trigger, which cannot see Pariwar A's reply from B's scope, before RLS's WITH CHECK would.
      const ins = await attempt(client, INSERT_ANSWER, [randomUUID(), PARIWAR_A, r.claimCaseId, r.replyId, 'how_known', ['other'], null, null]);
      expect(ins.message).toMatch(/the reply is not in scope/);
      await client.query('ROLLBACK TO SAVEPOINT scope');
      await enterAppRoleNoScope(client);
      expect((await client.query(`SELECT 1 FROM claim_peer_mesh_replies WHERE reply_id = $1`, [r.replyId])).rows).toHaveLength(0);
    });

    it('IN SCOPE, twt_app can insert, supersede and run the erasure scrub (the per-command UPDATE policy)', async () => {
      const { client } = getTx();
      const r = await seedReply(client, PARIWAR_A);
      await enterAppScope(client, PARIWAR_A);
      const d = await insertAnswer(client, r, 'death_date', { cipher: 'enc:v1:d', indexes: ['i1', 'i2', 'i3'] });
      const scrub = await client.query(
        `UPDATE claim_peer_mesh_reply_answers SET value_ciphertext = 'enc:v1:sentinel', death_date_window_indexes = NULL
          WHERE pariwar_id = $1 AND claim_case_id = $2 AND value_ciphertext IS NOT NULL`,
        [PARIWAR_A, r.claimCaseId],
      );
      expect(scrub.rowCount).toBe(1);
      const sup = await client.query(`UPDATE claim_peer_mesh_reply_answers SET superseded_at = clock_timestamp() WHERE answer_id = $1`, [d]);
      expect(sup.rowCount).toBe(1);
    });
  });
});
