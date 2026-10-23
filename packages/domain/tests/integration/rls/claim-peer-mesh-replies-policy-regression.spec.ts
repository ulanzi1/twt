// Migration 0156 — the neighbours' replies and answers, and the ping's delivery-record columns (Story 6.27a, Task 2; AC3).
// ⭐ Migration 0166 (Story 6.27c, Task 2; AC1b) — the ping's `detail` grammar (lockstep with the constant), the replacement link
// (`replaces_ping_id`: UNIQUE, the BEFORE INSERT trigger's three refusals, RLS, ⛔ in the UPDATE grant, ON DELETE CASCADE) and the
// attempting-row backstops (R15).
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
//   · the plpgsql answer window AND the set-based `answerWindowSql` are parity-tested against `isClaimInAnswerWindow` /
//     `isStateInAnswerWindow` over EVERY claim state × routed / not routed (second-pass review S3);
//   · 0158: the three ruled Tier-1 questions are stored ENCRYPTED (lockstep with `PEER_MESH_SENSITIVE_QUESTION_KEYS`) —
//     review S4; the new tables' indexes asserted by definition — review S6;
//   · RLS: per-command policies, FORCE, a cross-tenant reader sees nothing, the fail-closed probe, ⛔ no DELETE.

import { randomUUID } from 'node:crypto';

import { sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { answerWindowSql, isClaimInAnswerWindow, isStateInAnswerWindow } from '../../../src/claim/answer-window.js';
import { bindScopedDb } from '../../../src/db.js';
import { claimId as toClaimId, pariwarId as toPariwarId } from '../../../src/ids/index.js';
import { PEER_MESH_SENSITIVE_QUESTION_KEYS } from '../../../src/questionnaires/keys.js';
import {
  PEER_MESH_LINK_CODE_PATTERN,
  PEER_MESH_REQUEST_DETAIL_PATTERN,
  PEER_MESH_REQUEST_REPLACEABLE_REASONS,
} from '../../../src/schema/claim_peer_mesh_pings.js';
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

  describe('0157 — reply and answer ownership backstops (review R8/R9)', () => {
    it('an answer cannot borrow another claim\'s open window, even in the same tenant', async () => {
      const { client } = getTx();
      const closed = await seedReply(client, PARIWAR_A, 'closed');
      const open = await seedPing(client, PARIWAR_A);
      await enterAppScope(client, PARIWAR_A);
      expect((await attempt(client, INSERT_ANSWER, [randomUUID(), PARIWAR_A, open.claimCaseId, closed.replyId, 'has_died', ['died'], null, null])).code).toBe('23503');
    });

    it('a reply cannot reserve another tenant\'s ping or mix selection / claim / responder identities', async () => {
      const { client } = getTx();
      const own = await seedPing(client, PARIWAR_A);
      const other = await seedPing(client, PARIWAR_A);
      const foreign = await seedPing(client, PARIWAR_B);
      const insert = `INSERT INTO claim_peer_mesh_replies(reply_id, pariwar_id, claim_case_id, selection_id, ping_id, responder_member_id, questionnaire_version_id)
        VALUES ($1, $2, $3, $4, $5, $6, 'peer_mesh.v2')`;
      await enterAppScope(client, PARIWAR_A);
      for (const p of [
        [randomUUID(), PARIWAR_A, own.claimCaseId, foreign.selectionId, foreign.pingId, foreign.memberId],
        [randomUUID(), PARIWAR_A, own.claimCaseId, other.selectionId, other.pingId, other.memberId],
        [randomUUID(), PARIWAR_A, own.claimCaseId, own.selectionId, other.pingId, other.memberId],
        [randomUUID(), PARIWAR_A, own.claimCaseId, own.selectionId, own.pingId, other.memberId],
      ]) expect((await attempt(client, insert, p)).code).toBe('23503');
      // Failed reservations leave the foreign ping available to its rightful tenant.
      await client.query('RESET ROLE');
      await enterAppScope(client, PARIWAR_B);
      expect((await attempt(client, insert, [randomUUID(), PARIWAR_B, foreign.claimCaseId, foreign.selectionId, foreign.pingId, foreign.memberId])).code).toBeNull();
    });

    it('a ping cannot itself claim another tenant\'s selection', async () => {
      const { client } = getTx();
      const foreign = await seedPing(client, PARIWAR_B);
      await enterAppScope(client, PARIWAR_A);
      expect((await attempt(client, 'INSERT INTO claim_peer_mesh_pings(ping_id, pariwar_id, selection_id, member_id) VALUES($1,$2,$3,$4)', [randomUUID(), PARIWAR_A, foreign.selectionId, randomUUID()])).code).toBe('23503');
    });
  });

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
      // 📌 FLIPPED 2026-10-23 (Story 6.35, migration 0179 — W8): `member_choice` is now ADMITTED (the recipient's own choice);
      // the reminder's `pariwar_fallback` (`-385`) is ⛔ a ping value; anything else still refused.
      expect((await upd(`locale_source = 'member_choice'`)).code).toBeNull();
      expect((await upd(`locale_source = 'pariwar_fallback'`)).code).toBe('23514');
      expect((await upd(`locale_source = 'device'`)).code).toBe('23514');
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

  describe('0166 — the detail grammar, the replacement, the attempting-row backstops (Story 6.27c AC1b)', () => {
    /** Begin `pingId` as `attempting` (job `job`), with the anchor and a link code. */
    const begin = (client: Client, pingId: string, job = 'job-1', code = 'Ab3dEf7hIj9K') =>
      attempt(
        client,
        `UPDATE claim_peer_mesh_pings SET send_outcome = 'attempting', attempt_count = 1, claimed_at = clock_timestamp(),
           claimed_by_job = $2, aging_since = clock_timestamp(), locale_source = 'pariwar_default', link_code = $3 WHERE ping_id = $1`,
        [pingId, job, code],
      );
    /** One more ping in `p`'s selection (optionally a replacement) — `seedPing` rows are PARIWAR_A's unless `pariwarId` says. */
    const addPing = (client: Client, p: { selectionId: string; pariwarId?: string }, replaces: string | null = null) =>
      attempt(
        client,
        `INSERT INTO claim_peer_mesh_pings (ping_id, selection_id, pariwar_id, member_id, replaces_ping_id) VALUES (gen_random_uuid(), $1, $2, gen_random_uuid(), $3)`,
        [p.selectionId, p.pariwarId ?? PARIWAR_A, replaces],
      );
    const skip = (client: Client, pingId: string, detail: string | null, attempts = 1) =>
      attempt(client, `UPDATE claim_peer_mesh_pings SET send_outcome = 'no_target', attempt_count = $2, detail = $3 WHERE ping_id = $1`, [
        pingId,
        attempts,
        detail,
      ]);

    it('(a) ⭐ LOCKSTEP — both vocabulary CHECKs carry EXACTLY `PEER_MESH_REQUEST_DETAIL_PATTERN`; the link-code CHECK carries `PEER_MESH_LINK_CODE_PATTERN`', async () => {
      const { client } = getTx();
      const { rows } = await client.query<{ conname: string; def: string }>(
        `SELECT conname, pg_get_constraintdef(oid) AS def FROM pg_constraint
          WHERE conname IN ('claim_peer_mesh_pings_detail_vocabulary_check', 'claim_peer_mesh_pings_first_detail_vocabulary_check')`,
      );
      expect(rows).toHaveLength(2);
      for (const r of rows) expect(r.def.match(/~ '(.*)'::text/)?.[1], r.conname).toBe(PEER_MESH_REQUEST_DETAIL_PATTERN);
      const code = await client.query<{ def: string }>(
        `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = 'claim_peer_mesh_pings_link_code_check'`,
      );
      expect(code.rows[0]?.def.match(/~ '(.*)'::text/)?.[1]).toBe(PEER_MESH_LINK_CODE_PATTERN);
    });

    it.each([
      ['no_target (peer)', 'no_target:peer_filed_for_this_death'],
      ['no_target (name)', 'no_target:name_too_long'],
      ['superseded', 'superseded:claim_decided'],
      ['exhausted (three days)', 'exhausted:attempting_three_days'],
      ['exhausted (re-check)', 'exhausted:recheck_peer_ineligible'],
      ['pre-send fault', 'decrypt_failed:tier1'],
      ['send config (fixed)', 'config:helpline_number_missing'],
      ['send config (Secret Manager)', 'config:secret_manager_PERMISSION_DENIED'],
      ['gateway class', `api_unavailable:http_503`],
    ])('(a) the grammar ADMITS a %s detail (%s) — on `detail` AND `first_detail`', async (_family, value) => {
      const { client } = getTx();
      const p = await seedPing(client, PARIWAR_A);
      expect((await attempt(client, `UPDATE claim_peer_mesh_pings SET send_outcome = 'error', attempt_count = 1, detail = $2, first_detail = $2 WHERE ping_id = $1`, [p.pingId, value])).code).toBeNull();
    });

    it('(a) the grammar REFUSES free text, a raw gateway code, a phone number and every HOLD code (alarm-only — ⛔ stored)', async () => {
      const { client } = getTx();
      const p = await seedPing(client, PARIWAR_A);
      const bad = [
        'x',
        'Message rejected',
        'unknown:a b',
        'invalid_number:+919876543210',
        'invalid_number:9876543210',
        'carrier_reject:E003 at 9876543210',
        `auth:${'A'.repeat(65)}`,
        'no_target:not_effective',
        'name:none',
        'decrypt_failed:kyc',
        'config:app_links_base_url_invalid',
        'config:questionnaire_unavailable',
        'config:counsel_basis_pending',
        'config:secret_manager',
        'held:config',
      ];
      for (const value of bad) {
        const r = await attempt(client, `UPDATE claim_peer_mesh_pings SET send_outcome = 'error', attempt_count = 1, detail = $2 WHERE ping_id = $1`, [p.pingId, value]);
        expect(r.message, value).toMatch(/claim_peer_mesh_pings_detail_vocabulary_check/);
        const f = await attempt(client, `UPDATE claim_peer_mesh_pings SET send_outcome = 'error', attempt_count = 1, first_detail = $2 WHERE ping_id = $1`, [p.pingId, value]);
        expect(f.message, value).toMatch(/claim_peer_mesh_pings_first_detail_vocabulary_check/);
      }
    });

    it.each(PEER_MESH_REQUEST_REPLACEABLE_REASONS)('(b) a ping skipped `no_target:%s` at its FIRST attempt is replaced — ONCE', async (reason) => {
      const { client } = getTx();
      const p = await seedPing(client, PARIWAR_A);
      expect((await skip(client, p.pingId, `no_target:${reason}`)).code).toBeNull();
      expect((await addPing(client, p, p.pingId)).code).toBeNull();
      // UNIQUE (replaces_ping_id) — a second replacement of the same ping is refused.
      expect((await addPing(client, p, p.pingId)).code).toBe('23505');
    });

    it('(b) the replacement trigger refuses: another selection\'s ping, an unfinished / sent / name / superseded skip, a re-claimed skip (R5)', async () => {
      const { client } = getTx();
      const p = await seedPing(client, PARIWAR_A);
      const other = await seedPing(client, PARIWAR_A);
      expect((await skip(client, other.pingId, 'no_target:peer_not_active')).code).toBeNull();
      expect((await addPing(client, p, other.pingId)).message).toMatch(/replaces a ping of its own selection/);
      // ⛔ begun / ⛔ finished: the ping itself is not yet skipped.
      expect((await addPing(client, p, p.pingId)).message).toMatch(/only a ping skipped for a peer reason/);
      const named = await seedPing(client, PARIWAR_A);
      expect((await skip(client, named.pingId, 'no_target:name_too_long')).code).toBeNull();
      expect((await addPing(client, named, named.pingId)).message).toMatch(/only a ping skipped for a peer reason/);
      const nodetail = await seedPing(client, PARIWAR_A);
      expect((await skip(client, nodetail.pingId, null)).code).toBeNull();
      expect((await addPing(client, nodetail, nodetail.pingId)).message).toMatch(/only a ping skipped for a peer reason/);
      const decided = await seedPing(client, PARIWAR_A);
      expect((await attempt(client, `UPDATE claim_peer_mesh_pings SET send_outcome = 'skipped_superseded', attempt_count = 1, detail = 'superseded:claim_decided' WHERE ping_id = $1`, [decided.pingId])).code).toBeNull();
      expect((await addPing(client, decided, decided.pingId)).message).toMatch(/only a ping skipped for a peer reason/);
      const sent = await seedPing(client, PARIWAR_A);
      expect((await begin(client, sent.pingId, 'j', 'Sent0000000A')).code).toBeNull();
      expect((await attempt(client, `UPDATE claim_peer_mesh_pings SET send_outcome = 'accepted', provider_message_id = 'pm' WHERE ping_id = $1`, [sent.pingId])).code).toBeNull();
      expect((await addPing(client, sent, sent.pingId)).message).toMatch(/only a ping skipped for a peer reason/);
      const reclaimed = await seedPing(client, PARIWAR_A);
      expect((await skip(client, reclaimed.pingId, 'no_target:no_sendable_number', 2)).code).toBeNull();
      expect((await addPing(client, reclaimed, reclaimed.pingId)).message).toMatch(/a re-claimed send is never replaced/);
    });

    it('(b) the trigger\'s replaceable-reason list EQUALS `PEER_MESH_REQUEST_REPLACEABLE_REASONS` — both ways (review round 2 P12)', async () => {
      const { client } = getTx();
      const { rows } = await client.query<{ def: string }>(`SELECT pg_get_functiondef('claim_peer_mesh_pings_replacement_guard'::regproc) AS def`);
      const listed = [...rows[0]!.def.matchAll(/'no_target:([a-z_]+)'/g)].map((m) => m[1]).sort();
      expect(listed).toEqual([...PEER_MESH_REQUEST_REPLACEABLE_REASONS].sort());
    });

    it('(b) another Pariwar\'s ping is refused as a replaced ping — RLS hides it from the (SECURITY INVOKER) trigger; `replaces_ping_id` is ⛔ in the UPDATE grant', async () => {
      const { client } = getTx();
      const foreign = await seedPing(client, PARIWAR_B);
      expect((await skip(client, foreign.pingId, 'no_target:peer_not_active')).code).toBeNull();
      const own = await seedPing(client, PARIWAR_A);
      expect((await skip(client, own.pingId, 'no_target:peer_not_active')).code).toBeNull();
      await enterAppScope(client, PARIWAR_A);
      // RLS: under PARIWAR_A the foreign ping is ⛔ visible — so the trigger's lookup (an invoker read) finds ⛔ row. (The refusal
      // message below is the "own selection" arm either way — this SELECT is what proves the RLS half.)
      expect((await client.query(`SELECT 1 FROM claim_peer_mesh_pings WHERE ping_id = $1`, [foreign.pingId])).rows).toHaveLength(0);
      const cross = await attempt(
        client,
        `INSERT INTO claim_peer_mesh_pings (selection_id, pariwar_id, member_id, replaces_ping_id) VALUES ($1, $2, gen_random_uuid(), $3)`,
        [own.selectionId, PARIWAR_A, foreign.pingId],
      );
      expect(cross.message).toMatch(/replaces a ping of its own selection/);
      expect((await addPing(client, { pariwarId: PARIWAR_A, selectionId: own.selectionId }, own.pingId)).code).toBeNull();
      expect((await attempt(client, `UPDATE claim_peer_mesh_pings SET replaces_ping_id = NULL WHERE replaces_ping_id = $1`, [own.pingId])).code).toBe('42501');
    });

    it('(b) ON DELETE CASCADE — deleting a replaced ping by id does ⛔ fail on the FK (its replacement goes with it)', async () => {
      const { client } = getTx();
      const p = await seedPing(client, PARIWAR_A);
      expect((await skip(client, p.pingId, 'no_target:peer_reported_deceased')).code).toBeNull();
      expect((await addPing(client, p, p.pingId)).code).toBeNull();
      expect((await attempt(client, `DELETE FROM claim_peer_mesh_pings WHERE ping_id = $1`, [p.pingId])).code).toBeNull();
      const { rows } = await client.query(`SELECT 1 FROM claim_peer_mesh_pings WHERE replaces_ping_id = $1`, [p.pingId]);
      expect(rows).toHaveLength(0);
    });

    it('(c) R15 — an `attempting` row carries `aging_since` (CHECK)', async () => {
      const { client } = getTx();
      const p = await seedPing(client, PARIWAR_A);
      const r = await attempt(client, `UPDATE claim_peer_mesh_pings SET send_outcome = 'attempting', attempt_count = 1, claimed_at = now(), claimed_by_job = 'j' WHERE ping_id = $1`, [p.pingId]);
      expect(r.message).toMatch(/claim_peer_mesh_pings_attempting_aging_check/);
    });

    it('(c) R15 — while `attempting`: attempt_count ⛔ decreases; first_detail is written once; aging_since moves ONLY on a parked re-claim', async () => {
      const { client } = getTx();
      const p = await seedPing(client, PARIWAR_A);
      const upd = (set: string) => attempt(client, `UPDATE claim_peer_mesh_pings SET ${set} WHERE ping_id = $1`, [p.pingId]);
      expect((await begin(client, p.pingId)).code).toBeNull();
      expect((await upd(`attempt_count = 2`)).code).toBeNull();
      expect((await upd(`attempt_count = 1`)).message).toMatch(/attempt_count never decreases/);
      expect((await upd(`first_detail = 'rate_limited:x'`)).code).toBeNull();
      expect((await upd(`first_detail = 'api_unavailable:y'`)).message).toMatch(/first_detail is written once/);
      expect((await upd(`first_detail = COALESCE(first_detail, detail)`)).code).toBeNull(); // the re-claim's own form
      // ⛔ an unparked forward move; the 0156 backward rule keeps its message.
      expect((await upd(`aging_since = aging_since + interval '1 hour'`)).message).toMatch(/only on the re-claim of a parked row/);
      expect((await upd(`aging_since = aging_since - interval '1 hour'`)).message).toMatch(/aging_since moves only forward/);
      // park, then re-claim: the anchor moves forward in the SAME statement that clears `parked_at`.
      expect((await upd(`claimed_by_job = 'sweep:held', parked_at = clock_timestamp()`)).code).toBeNull();
      expect((await upd(`aging_since = aging_since + interval '1 hour'`)).message).toMatch(/only on the re-claim of a parked row/);
      expect((await upd(`aging_since = aging_since + interval '1 hour', claimed_by_job = 'job-2', parked_at = NULL, send_outcome = 'error'`)).message).toMatch(/only on the re-claim of a parked row/);
      expect((await upd(`aging_since = aging_since + interval '1 hour', claimed_by_job = 'job-2', parked_at = NULL, attempt_count = attempt_count + 1`)).code).toBeNull();
      // the begin (from NULL) still sets the anchor — R15's arms apply only to an `attempting` OLD row.
      const q = await seedPing(client, PARIWAR_A);
      expect((await begin(client, q.pingId, 'job-1', 'Zz3dEf7hIj9K')).code).toBeNull();
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

    it('0158 — the ruled Tier-1 questions are stored ENCRYPTED; death_date keeps ONLY "I don\'t know" as a code (review S4)', async () => {
      const { client } = getTx();
      const r = await seedReply(client, PARIWAR_A);
      const ins = (key: string, codes: string[] | null, cipher: string | null) =>
        attempt(client, INSERT_ANSWER, [randomUUID(), r.pariwarId, r.claimCaseId, r.replyId, key, codes, cipher, null]);
      expect((await ins('death_cause', ['illness_long'], null)).message).toMatch(/sensitive_encrypted_check/);
      expect((await ins('death_illness', ['heart'], null)).message).toMatch(/sensitive_encrypted_check/);
      expect((await ins('death_date', ['2026-09-30'], null)).message).toMatch(/sensitive_encrypted_check/);
      expect((await ins('death_date', ['unknown', 'x'], null)).message).toMatch(/sensitive_encrypted_check/);
      expect((await ins('death_date', ['unknown'], null)).code).toBeNull();
      expect((await ins('death_cause', null, 'enc:v1:x')).code).toBeNull();
      expect((await ins('how_known', ['other'], null)).code).toBeNull(); // a non-sensitive question keeps its codes
      // ⭐ LOCKSTEP: the CHECK names exactly the keys the domain encrypts.
      const { rows } = await client.query<{ def: string }>(
        `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = 'claim_peer_mesh_reply_answers_sensitive_encrypted_check'`,
      );
      const named = [...rows[0]!.def.matchAll(/'([a-z_]+)'::text/g)].map((m) => m[1]).filter((k) => k !== 'unknown');
      expect(new Set(named)).toEqual(new Set(PEER_MESH_SENSITIVE_QUESTION_KEYS));
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
          // ⭐ Review S3 — the SET-BASED twin (`listOpenPeerRequestsForMember`'s filter) agrees on the same row.
          const twin = await db.execute<{ open: boolean }>(
            sql`SELECT ${answerWindowSql('c')} AS open FROM claims c WHERE c.pariwar_id = ${PARIWAR_A}::uuid AND c.claim_case_id = ${cid}::uuid`,
          );
          expect(twin.rows[0]!.open, `answerWindowSql ${state} / routed=${routed}`).toBe(ts);
        }
      }
    });
  });

  describe('the indexes (review S6 — asserted by definition, ⛔ only by behaviour)', () => {
    it('the claim index, the live-reply partial index (6.27b\'s bulk readers) and the live partial UNIQUE', async () => {
      const { client } = getTx();
      const { rows } = await client.query<{ indexname: string; indexdef: string }>(
        `SELECT indexname, indexdef FROM pg_indexes
          WHERE tablename IN ('claim_peer_mesh_replies', 'claim_peer_mesh_reply_answers') ORDER BY indexname`,
      );
      const def = (name: string) => rows.find((r) => r.indexname === name)?.indexdef ?? `<missing ${name}>`;
      expect(def('claim_peer_mesh_replies_claim_idx')).toMatch(/ON public\.claim_peer_mesh_replies USING btree \(pariwar_id, claim_case_id\)$/);
      expect(def('claim_peer_mesh_reply_answers_claim_idx')).toMatch(/USING btree \(pariwar_id, claim_case_id\)$/);
      expect(def('claim_peer_mesh_reply_answers_live_reply_idx')).toMatch(/USING btree \(pariwar_id, reply_id\) WHERE \(superseded_at IS NULL\)$/);
      expect(def('claim_peer_mesh_reply_answers_live_uq')).toMatch(/^CREATE UNIQUE INDEX .* USING btree \(pariwar_id, reply_id, question_key\) WHERE \(superseded_at IS NULL\)$/);
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
