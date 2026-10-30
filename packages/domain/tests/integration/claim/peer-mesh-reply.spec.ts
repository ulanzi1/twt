// Story 6.27a (Task 3; AC4, AC5's domain half, AC6's domain half) — the neighbours' reply writer and reads, on a live DB.
// Per-test ROLLBACK; the fixtures run as the superuser, the writer as `twt_app` in scope.
//   · saved as they go: the FIRST `has_died` save writes the ONE event (CURRENT state, the right actor); a later edit
//     writes ⛔ no event and ⛔ never throws 6.6's already-answered error; an edit supersedes the old row; a changed
//     condition supersedes its dependants; idempotent by value;
//   · validated against the PINNED version (a `'pending'` question is ⛔ answerable; a bad code refused);
//   · the writer receives CIPHERTEXT (+ the date's three indexes) — it encrypts nothing (⛔ no KMS under a lock), and a
//     stale handler read is refused;
//   · the window: accepted in each review state, after the 72 hours resolved, after the District Admin approved, and in
//     `state_trustee_approved` under a live R9 routing; refused (no longer open) without one and in every closed /
//     refused state — incl. a claim CLOSED by 6.28's OP4 (`closeClaimsOfPaidDeath`, the real writer) and by OP13's
//     allowed suspicion appeal (`suspicion_appeal_allowed`) on a `state_trustee_approved` + live-R9 claim;
//   · ⛔ texted / ⛔ yours / another Pariwar ⇒ the SAME not-found; Submit locks (app AND helpline); a second Submit is
//     refused; `peerMeshReplyState`; the member's open list (texted, ⛔ submitted, in the window, clamped).

import { randomUUID } from 'node:crypto';

import type pg from 'pg';
import { describe, expect, it } from 'vitest';

import { bindScopedDb } from '../../../src/db.js';
import {
  closeClaimsOfPaidDeath,
  listOpenPeerRequestsForMember,
  peerMeshReplyState,
  PeerRequestInvalidAnswerError,
  PeerRequestNoLongerOpenError,
  PeerRequestNotFoundError,
  PeerRequestStaleError,
  PeerRequestSubmittedError,
  PeerRequestVersionStaleError,
  PeerRequestVersionUnreadableError,
  PEER_CONSOLE_ANSWERS_CAP,
  PEER_LIVE_ANSWERS_CAP,
  readLivePeerAnswers,
  readPeerAnswersForClaim,
  pinnedVersionFor,
  readPeerRequest,
  savePeerAnswer,
  submitPeerReply,
  type PreparedPeerAnswer,
} from '../../../src/claim/index.js';
import {
  claimId as toClaimId,
  memberId as toMemberId,
  pariwarId as toPariwarId,
  peerMeshPingId as toPingId,
  type MemberId,
  type PeerMeshPingId,
} from '../../../src/ids/index.js';
import {
  checkAnswer,
  PEER_MESH_QUESTIONNAIRE_V4,
  servedDefinition,
  type QuestionnaireAnswerValue,
} from '../../../src/questionnaires/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { driveClaimTo, enterAppScope, PARIWAR_A, PARIWAR_B, seedAcceptedDeathCertificate, seedGroundInspection } from '../_helpers.js';
import { isPeerSectionHiddenFromActor } from '../../../src/claim/index.js';
import { scheduleGroundInspection } from '../../../src/claim/ground-inspection-persist.js';
import { claimAt, emitClaim, type FixtureState } from './_one-payment-fixtures.js';
import { toStoredDefinition } from '../../../src/questionnaire-versions/index.js';
import { QUESTIONNAIRE_MAX_QUESTIONS } from '../../../src/questionnaires/index.js';
import { attachTextedPings } from './_peer-reply-fixtures.js';
import { assertClaimApprovable } from '../../../src/claim/nominee-name-check.js';
import { readClaimApprovalWarnings } from '../../../src/claim/approval-warnings.js';
import { groundInspectionApprovalState, readGroundInspectionApprovalFacts } from '../../../src/claim/ground-inspection-approval.js';
import { chainDefinition, chainQuestion } from '../../questionnaires/_chain-fixtures.js';

type Client = pg.PoolClient;
const TODAY = '2026-10-12';
// Story 6.27b — v3 was LIVE (`-329`); ⭐ Story 6.36 (AC16) — v4 is LIVE; a new reply's answers are checked against v4 (the
// same keys and codes as v2 / v3).
const SERVED = servedDefinition(PEER_MESH_QUESTIONNAIRE_V4);
const OPERATOR = 'a0a0a0a0-0000-4000-8000-0000000000aa';

/** As the superuser: a claim of a fresh death in `state` (events through the projector), its selection, and TWO pings —
 *  the neighbour's (TEXTED unless `texted: false`) and another's. */
async function requestAt(client: Client, state: FixtureState | 'verification_in_progress', opts: { texted?: boolean; pariwarId?: string } = {}) {
  const pid = opts.pariwarId ?? PARIWAR_A;
  const mid = randomUUID();
  const cid =
    state === 'verification_in_progress'
      ? await (async () => {
          const id = randomUUID();
          await driveClaimTo(client, pid, id, mid, 'verification_in_progress');
          return id;
        })()
      : await claimAt(client, pid, mid, state, { bare: true });
  const neighbour = randomUUID();
  const other = randomUUID();
  const selectionId = randomUUID();
  await client.query(
    `INSERT INTO claim_peer_mesh_selections (selection_id, claim_case_id, pariwar_id, deceased_member_id, deceased_created_at, metric_id,
       metric_version, selected_member_ids, candidate_snapshot, response_window_expires_at)
     VALUES ($1, $2, $3, $4, now(), 'm', 1, ARRAY[$5, $6]::uuid[], '[]'::jsonb, now() + interval '72 hours')`,
    [selectionId, cid, pid, mid, neighbour, other],
  );
  const pingId = randomUUID();
  const otherPingId = randomUUID();
  for (const [ping, member] of [[pingId, neighbour], [otherPingId, other]] as const) {
    await client.query(`INSERT INTO claim_peer_mesh_pings (ping_id, selection_id, pariwar_id, member_id) VALUES ($1, $2, $3, $4)`, [ping, selectionId, pid, member]);
  }
  if (opts.texted !== false) {
    await client.query(
      `UPDATE claim_peer_mesh_pings SET send_outcome = 'accepted', attempt_count = 1, send_updated_at = clock_timestamp() WHERE ping_id = ANY($1)`,
      [[pingId, otherPingId]],
    );
  }
  return {
    pid: toPariwarId(pid),
    cid: toClaimId(cid),
    mid: toMemberId(mid),
    selectionId,
    pingId: toPingId(pingId),
    otherPingId: toPingId(otherPingId),
    neighbour: toMemberId(neighbour),
    other: toMemberId(other),
  };
}
type Req = Awaited<ReturnType<typeof requestAt>>;

/** The handler's job, faked: the storage form, with a TEST "ciphertext" that carries its plaintext (so the spec can
 *  "decrypt" it) and fake date indexes. */
function prep(key: string, value: QuestionnaireAnswerValue, live: Map<string, readonly string[] | null> = new Map([['has_died', ['died']]])): PreparedPeerAnswer {
  const c = checkAnswer(SERVED, key, value, live, TODAY);
  if (!c.ok) return { form: 'codes', codes: 'codes' in value ? value.codes : [] };
  return c.storage.form === 'codes'
    ? { form: 'codes', codes: c.storage.codes }
    : {
        form: 'encrypted',
        ciphertext: `enc:test:${c.storage.plaintext}`,
        dateWindowIndexes: c.storage.dateWindow === null ? null : (c.storage.dateWindow.map((d) => `idx:${d}`) as [string, string, string]),
        codeIndexes: null, // Story 6.32 — v4 serves ⛔ health question (counsel pending), so ⛔ encrypted answer here carries codes
      };
}

/** The handler's pre-lock decrypt of the reply's live sensitive answers, faked from the test ciphertext. */
async function decryptedLiveOf(client: Client, r: Req): Promise<Map<string, QuestionnaireAnswerValue>> {
  const out = new Map<string, QuestionnaireAnswerValue>();
  const view = await readPeerRequest(bindScopedDb(client), r.pid, r.pingId, r.neighbour).catch(() => null);
  if (!view?.reply) return out;
  for (const row of await readLivePeerAnswers(bindScopedDb(client), r.pid, view.reply.replyId)) {
    if (row.valueCiphertext === null) continue;
    const plain = row.valueCiphertext.replace(/^enc:test:/, '');
    out.set(row.answerId, /^\d{4}-\d{2}-\d{2}$/.test(plain) ? { date: plain } : { codes: JSON.parse(plain) as string[] });
  }
  return out;
}

async function save(client: Client, r: Req, key: string, value: QuestionnaireAnswerValue, opts: { via?: 'member_app' | 'helpline'; memberId?: MemberId; pingId?: PeerMeshPingId } = {}) {
  const via = opts.via ?? 'member_app';
  // The handler's pre-read (Story 6.33 R7): the reply's pinned version, else the one in force.
  const view = await readPeerRequest(bindScopedDb(client), r.pid, opts.pingId ?? r.pingId, opts.memberId ?? r.neighbour).catch(() => null);
  const preReadVersionId = view === null ? 'peer_mesh.v4' : (await pinnedVersionFor(bindScopedDb(client), view.reply, r.pid)).def.versionId;
  return savePeerAnswer(client, { preReadVersionId,
    pariwarId: r.pid,
    pingId: opts.pingId ?? r.pingId,
    memberId: opts.memberId ?? r.neighbour,
    questionKey: key,
    value,
    prepared: prep(key, value),
    decryptedLive: await decryptedLiveOf(client, r),
    savedVia: via,
    savedByActorId: via === 'helpline' ? OPERATOR : r.neighbour,
    todayIst: TODAY,
  });
}

async function responseEvents(client: Client, cid: string) {
  const { rows } = await client.query<{ payload: Record<string, unknown>; actor_id: string | null }>(
    `SELECT payload, actor_id FROM events_log WHERE stream_id = $1 AND event_type = 'claim.peer_mesh_responded' ORDER BY event_version`,
    [cid],
  );
  return rows;
}

async function routeToR9Raw(client: Client, r: Req) {
  await client.query(
    `INSERT INTO claim_state_trustee_decisions (claim_case_id, pariwar_id, phase, outcome, reason_code, actor_id, actor_display)
     VALUES ($1, $2, 'routing', 'routed_to_r9', 'r9_special_case', 'pa', 'Pariwar Admin')`,
    [r.cid, r.pid],
  );
}

describe.skipIf(!hasDatabase)('Story 6.27a — the neighbours\' reply writer', { timeout: 20000 }, () => {
  setupLiveDb();

  describe('saved as they go (PM7 (b), (e))', () => {
    it('the FIRST has_died save pins v4 (Story 6.36 — the LIVE version), writes the ONE event (CURRENT state, actor member); an edit writes ⛔ no event and supersedes', async () => {
      const { client } = getTx();
      const r = await requestAt(client, 'verification_in_progress');
      await enterAppScope(client, r.pid);
      const first = await save(client, r, 'has_died', { codes: ['died'] });
      expect(first).toMatchObject({ written: true, eventWritten: true });
      const { rows: reply } = await client.query(`SELECT questionnaire_version_id, submitted_at FROM claim_peer_mesh_replies WHERE ping_id = $1`, [r.pingId]);
      expect(reply[0]).toEqual({ questionnaire_version_id: 'peer_mesh.v4', submitted_at: null });
      let events = await responseEvents(client, r.cid);
      expect(events).toHaveLength(1);
      expect(events[0]!.payload).toMatchObject({ from_state: 'verification_in_progress', to_state: 'verification_in_progress', actor: 'member', response: 'confirmed', responder_member_id: r.neighbour });
      expect(events[0]!.actor_id).toBe(r.neighbour);

      const edit = await save(client, r, 'has_died', { codes: ['not_died'] });
      expect(edit).toMatchObject({ written: true, eventWritten: false });
      events = await responseEvents(client, r.cid);
      expect(events).toHaveLength(1); // ⚠ RECORDED: the event carries the FIRST answer
      const { rows } = await client.query(`SELECT value_codes, superseded_at IS NULL AS live FROM claim_peer_mesh_reply_answers WHERE reply_id = $1 AND question_key = 'has_died' ORDER BY saved_at`, [first.replyId]);
      expect(rows).toEqual([{ value_codes: ['died'], live: false }, { value_codes: ['not_died'], live: true }]);
    });

    it('idempotent by value: the same answer twice writes nothing', async () => {
      const { client } = getTx();
      const r = await requestAt(client, 'verification_in_progress');
      await enterAppScope(client, r.pid);
      await save(client, r, 'has_died', { codes: ['died'] });
      await save(client, r, 'how_known', { codes: ['family_told'] });
      expect((await save(client, r, 'how_known', { codes: ['family_told'] })).written).toBe(false);
      await save(client, r, 'death_date', { date: '2026-10-01' });
      expect((await save(client, r, 'death_date', { date: '2026-10-01' })).written).toBe(false);
      expect((await save(client, r, 'death_date', { date: '2026-10-02' })).written).toBe(true);
    });

    it('"died" → "not sure" supersedes the date in the SAME save; how_known is kept', async () => {
      const { client } = getTx();
      const r = await requestAt(client, 'verification_in_progress');
      await enterAppScope(client, r.pid);
      await save(client, r, 'has_died', { codes: ['died'] });
      await save(client, r, 'death_date', { date: '2026-10-01' });
      await save(client, r, 'how_known', { codes: ['family_told'] });
      const res = await save(client, r, 'has_died', { codes: ['not_sure'] });
      expect(res.supersededDependants).toEqual(['death_date']);
      expect(res.live.map((a) => a.questionKey).sort()).toEqual(['has_died', 'how_known']);
    });

    it('the writer receives CIPHERTEXT + the three indexes (it encrypts nothing); "I don\'t know the date" is a plaintext code', async () => {
      const { client } = getTx();
      const r = await requestAt(client, 'verification_in_progress');
      await enterAppScope(client, r.pid);
      await save(client, r, 'has_died', { codes: ['died'] });
      await save(client, r, 'death_date', { date: '2024-03-01' });
      const { rows } = await client.query(`SELECT value_codes, value_ciphertext, death_date_window_indexes FROM claim_peer_mesh_reply_answers WHERE claim_case_id = $1 AND question_key = 'death_date'`, [r.cid]);
      expect(rows[0]).toEqual({ value_codes: null, value_ciphertext: 'enc:test:2024-03-01', death_date_window_indexes: ['idx:2024-02-29', 'idx:2024-03-01', 'idx:2024-03-02'] });
      await save(client, r, 'death_date', { codes: ['unknown'] });
      const live = await client.query(`SELECT value_codes, value_ciphertext, death_date_window_indexes FROM claim_peer_mesh_reply_answers WHERE claim_case_id = $1 AND question_key = 'death_date' AND superseded_at IS NULL`, [r.cid]);
      expect(live.rows[0]).toEqual({ value_codes: ['unknown'], value_ciphertext: null, death_date_window_indexes: null });
    });

    it('a stale handler read (a live sensitive answer it did not decrypt) is refused', async () => {
      const { client } = getTx();
      const r = await requestAt(client, 'verification_in_progress');
      await enterAppScope(client, r.pid);
      await save(client, r, 'has_died', { codes: ['died'] });
      await save(client, r, 'death_date', { date: '2026-10-01' });
      await expect(
        savePeerAnswer(client, { preReadVersionId: 'peer_mesh.v4', pariwarId: r.pid, pingId: r.pingId, memberId: r.neighbour, questionKey: 'how_known', value: { codes: ['other'] }, prepared: { form: 'codes', codes: ['other'] }, decryptedLive: new Map(), savedVia: 'member_app', savedByActorId: r.neighbour, todayIst: TODAY }),
      ).rejects.toBeInstanceOf(PeerRequestStaleError);
    });

    it("validated against the pinned version: a bad code, a future date, and a 'pending' question (death_cause) are refused", async () => {
      const { client } = getTx();
      const r = await requestAt(client, 'verification_in_progress');
      await enterAppScope(client, r.pid);
      await expect(save(client, r, 'has_died', { codes: ['dead'] })).rejects.toMatchObject({ reason: 'invalid_value' });
      await save(client, r, 'has_died', { codes: ['died'] });
      await expect(save(client, r, 'death_date', { date: '2026-10-13' })).rejects.toMatchObject({ reason: 'date_in_future' });
      await expect(save(client, r, 'death_cause', { codes: ['old_age'] })).rejects.toBeInstanceOf(PeerRequestInvalidAnswerError);
      await expect(save(client, r, 'death_cause', { codes: ['old_age'] })).rejects.toMatchObject({ reason: 'unknown_question' });
    });

    it('a reply PINNED to peer_mesh.v1 is validated against v1 — a v2-only question is unknown (review S8 (c))', async () => {
      const { client } = getTx();
      const r = await requestAt(client, 'verification_in_progress');
      await client.query(
        `INSERT INTO claim_peer_mesh_replies (pariwar_id, claim_case_id, selection_id, ping_id, responder_member_id, questionnaire_version_id)
         SELECT pariwar_id, $2, selection_id, ping_id, member_id, 'peer_mesh.v1' FROM claim_peer_mesh_pings WHERE ping_id = $1`,
        [r.pingId, r.cid],
      );
      await enterAppScope(client, r.pid);
      await save(client, r, 'has_died', { codes: ['died'] });
      await expect(save(client, r, 'how_known', { codes: ['other'] })).rejects.toMatchObject({ reason: 'unknown_question' });
      const { rows } = await client.query(`SELECT questionnaire_version_id FROM claim_peer_mesh_replies WHERE ping_id = $1`, [r.pingId]);
      expect(rows).toEqual([{ questionnaire_version_id: 'peer_mesh.v1' }]); // the pin is never re-resolved to the live v2
    });

    it('a helpline save: saved_via helpline, the operator as saver, and the event actor operator', async () => {
      const { client } = getTx();
      const r = await requestAt(client, 'verification_in_progress');
      await enterAppScope(client, r.pid);
      await save(client, r, 'has_died', { codes: ['not_died'] }, { via: 'helpline' });
      const events = await responseEvents(client, r.cid);
      expect(events[0]!.payload).toMatchObject({ actor: 'operator', response: 'denied', responder_member_id: r.neighbour });
      expect(events[0]!.actor_id).toBe(OPERATOR);
      const { rows } = await client.query(`SELECT saved_via, saved_by_actor_id FROM claim_peer_mesh_reply_answers WHERE claim_case_id = $1`, [r.cid]);
      expect(rows).toEqual([{ saved_via: 'helpline', saved_by_actor_id: OPERATOR }]);
    });

    it('a 6.6-era response event already on the stream ⇒ the first has_died save writes ⛔ a second one (⛔ never the already-answered error)', async () => {
      const { client } = getTx();
      const r = await requestAt(client, 'verification_in_progress');
      await enterAppScope(client, r.pid);
      await emitClaim(client, r.pid, r.cid, r.mid, 'verification_in_progress', 'verification_in_progress', 'claim.peer_mesh_responded', { actor: 'member', responder_member_id: r.neighbour, response: 'confirmed', trigger: 'peer_mesh_response' });
      expect((await save(client, r, 'has_died', { codes: ['died'] })).eventWritten).toBe(false);
      expect(await responseEvents(client, r.cid)).toHaveLength(1);
    });
  });

  describe('who may save — ONE indistinguishable not-found (PM11)', () => {
    it('⛔ texted / ⛔ yours / another Pariwar ⇒ PeerRequestNotFoundError (save, submit and read alike)', async () => {
      const { client } = getTx();
      const untexted = await requestAt(client, 'verification_in_progress', { texted: false });
      const r = await requestAt(client, 'verification_in_progress');
      const inB = await requestAt(client, 'verification_in_progress', { pariwarId: PARIWAR_B });
      await enterAppScope(client, PARIWAR_A);
      const db = bindScopedDb(client);
      await expect(save(client, untexted, 'has_died', { codes: ['died'] })).rejects.toBeInstanceOf(PeerRequestNotFoundError);
      await expect(save(client, untexted, 'has_died', { codes: ['died'] }, { via: 'helpline' })).rejects.toBeInstanceOf(PeerRequestNotFoundError);
      await expect(readPeerRequest(db, untexted.pid, untexted.pingId, untexted.neighbour)).rejects.toBeInstanceOf(PeerRequestNotFoundError);
      await expect(submitPeerReply(client, { pariwarId: untexted.pid, pingId: untexted.pingId, memberId: untexted.neighbour })).rejects.toBeInstanceOf(PeerRequestNotFoundError);
      // another member's ping
      await expect(save(client, r, 'has_died', { codes: ['died'] }, { memberId: r.other })).rejects.toBeInstanceOf(PeerRequestNotFoundError);
      await expect(readPeerRequest(db, r.pid, r.pingId, r.other)).rejects.toBeInstanceOf(PeerRequestNotFoundError);
      // ⭐ Review S12 — the HELPLINE is bound too: recording neighbour X, a ping of neighbour Y is the SAME not-found.
      await expect(save(client, r, 'has_died', { codes: ['died'] }, { via: 'helpline', memberId: r.other })).rejects.toBeInstanceOf(PeerRequestNotFoundError);
      await expect(submitPeerReply(client, { pariwarId: r.pid, pingId: r.pingId, memberId: r.other })).rejects.toBeInstanceOf(PeerRequestNotFoundError);
      // another Pariwar's ping (scope A)
      await expect(readPeerRequest(db, PARIWAR_A, inB.pingId, inB.neighbour)).rejects.toBeInstanceOf(PeerRequestNotFoundError);
      await expect(save(client, { ...inB, pid: toPariwarId(PARIWAR_A) }, 'has_died', { codes: ['died'] })).rejects.toBeInstanceOf(PeerRequestNotFoundError);
      // an unknown ping
      await expect(readPeerRequest(db, PARIWAR_A, toPingId(randomUUID()), r.neighbour)).rejects.toBeInstanceOf(PeerRequestNotFoundError);
    });
  });

  describe('the answer window (PM8)', () => {
    it.each(['verification_in_progress', 'verifier_review', 'verifier_approved', 'reversed', 'state_trustee_freeze'] as const)(
      'accepted in %s — the event carries the CURRENT state',
      async (state) => {
        const { client } = getTx();
        const r = await requestAt(client, state);
        await enterAppScope(client, r.pid);
        await save(client, r, 'has_died', { codes: ['died'] });
        const events = await responseEvents(client, r.cid);
        expect(events[0]!.payload).toMatchObject({ from_state: state, to_state: state });
        const { rows } = await client.query(`SELECT current_state FROM claims WHERE claim_case_id = $1`, [r.cid]);
        expect(rows[0]!.current_state).toBe(state); // identity — the state never moves
      },
    );

    it('accepted after the 72 hours resolved (the label ⛔ not recounted)', async () => {
      const { client } = getTx();
      const r = await requestAt(client, 'verification_in_progress');
      await client.query(`UPDATE claim_peer_mesh_selections SET outcome = 'insufficient_responses_fallback' WHERE selection_id = $1`, [r.selectionId]);
      await enterAppScope(client, r.pid);
      await save(client, r, 'has_died', { codes: ['died'] });
      const { rows } = await client.query(`SELECT outcome FROM claim_peer_mesh_selections WHERE selection_id = $1`, [r.selectionId]);
      expect(rows[0]!.outcome).toBe('insufficient_responses_fallback');
    });

    it('state_trustee_approved: accepted WITH a live R9 routing; refused without one', async () => {
      const { client } = getTx();
      const routed = await requestAt(client, 'state_trustee_approved');
      await routeToR9Raw(client, routed);
      const plain = await requestAt(client, 'state_trustee_approved');
      await enterAppScope(client, PARIWAR_A);
      await save(client, routed, 'has_died', { codes: ['died'] });
      expect((await responseEvents(client, routed.cid))[0]!.payload).toMatchObject({ from_state: 'state_trustee_approved' });
      await expect(save(client, plain, 'has_died', { codes: ['died'] })).rejects.toBeInstanceOf(PeerRequestNoLongerOpenError);
    });

    it.each(['denied', 'appeal_stage_1', 'approved', 'settled', 'closed'] as const)('refused (no longer open) in %s', async (state) => {
      const { client } = getTx();
      const r = await requestAt(client, state);
      await enterAppScope(client, r.pid);
      await expect(save(client, r, 'has_died', { codes: ['died'] })).rejects.toBeInstanceOf(PeerRequestNoLongerOpenError);
      await expect(submitPeerReply(client, { pariwarId: r.pid, pingId: r.pingId, memberId: r.neighbour })).rejects.toBeInstanceOf(PeerRequestNoLongerOpenError);
      const v = await readPeerRequest(bindScopedDb(client), r.pid, r.pingId, r.neighbour);
      expect(v).toMatchObject({ open: false, inWindow: false });
    });

    it('6.28 OP4 — a claim CLOSED at payment commit (the real closeClaimsOfPaidDeath) refuses the save', async () => {
      const { client } = getTx();
      const r = await requestAt(client, 'verification_in_progress');
      await claimAt(client, r.pid, r.mid, 'approved', { bare: true }); // the death's PAID claim
      await enterAppScope(client, r.pid);
      await save(client, r, 'has_died', { codes: ['died'] });
      const out = await closeClaimsOfPaidDeath(client, { pariwarId: r.pid, deceasedMemberId: r.mid, actor: 'system', actorId: OPERATOR });
      expect(out.closed).toContain(r.cid);
      await expect(save(client, r, 'how_known', { codes: ['other'] })).rejects.toBeInstanceOf(PeerRequestNoLongerOpenError);
    });

    it("6.28 OP13 — a state_trustee_approved + live-R9 claim CLOSED by an allowed suspicion appeal (`suspicion_appeal_allowed`) refuses the save", async () => {
      const { client } = getTx();
      const r = await requestAt(client, 'state_trustee_approved');
      await routeToR9Raw(client, r);
      await enterAppScope(client, r.pid);
      await save(client, r, 'has_died', { codes: ['died'] });
      await emitClaim(client, r.pid, r.cid, r.mid, 'state_trustee_approved', 'closed', 'claim.closed', { trigger: 'suspicion_appeal_allowed', held_by_claim_case_id: randomUUID(), deceased_member_id: r.mid });
      await expect(save(client, r, 'how_known', { codes: ['other'] })).rejects.toBeInstanceOf(PeerRequestNoLongerOpenError);
    });
  });

  describe('Submit (PM7 (d), (f))', () => {
    it('locks the reply for the app AND the helpline; a second Submit is refused; ⛔ has_died ⇒ refused', async () => {
      const { client } = getTx();
      const r = await requestAt(client, 'verification_in_progress');
      await enterAppScope(client, r.pid);
      await expect(submitPeerReply(client, { pariwarId: r.pid, pingId: r.pingId, memberId: r.neighbour })).rejects.toMatchObject({ reason: 'has_died_required' });
      await save(client, r, 'has_died', { codes: ['died'] }, { via: 'helpline' }); // mixed: the helpline …
      await save(client, r, 'how_known', { codes: ['family_told'] }); // … and the app, ONE reply
      const { rows } = await client.query(`SELECT saved_via FROM claim_peer_mesh_reply_answers WHERE claim_case_id = $1 ORDER BY saved_at`, [r.cid]);
      expect(rows.map((x) => x.saved_via)).toEqual(['helpline', 'member_app']);
      await submitPeerReply(client, { pariwarId: r.pid, pingId: r.pingId, memberId: r.neighbour });
      await expect(submitPeerReply(client, { pariwarId: r.pid, pingId: r.pingId, memberId: r.neighbour })).rejects.toBeInstanceOf(PeerRequestSubmittedError);
      await expect(save(client, r, 'how_known', { codes: ['other'] })).rejects.toBeInstanceOf(PeerRequestSubmittedError);
      await expect(save(client, r, 'how_known', { codes: ['other'] }, { via: 'helpline' })).rejects.toBeInstanceOf(PeerRequestSubmittedError);
    });

    it('peerMeshReplyState: none → started → submitted', async () => {
      const { client } = getTx();
      const r = await requestAt(client, 'verification_in_progress');
      await enterAppScope(client, r.pid);
      const db = bindScopedDb(client);
      expect(await peerMeshReplyState(db, r.pid, r.pingId)).toBe('none');
      await save(client, r, 'has_died', { codes: ['did_not_know'] });
      expect(await peerMeshReplyState(db, r.pid, r.pingId)).toBe('started');
      await submitPeerReply(client, { pariwarId: r.pid, pingId: r.pingId, memberId: r.neighbour });
      expect(await peerMeshReplyState(db, r.pid, r.pingId)).toBe('submitted');
    });
  });

  describe("the member's open list (PM11)", () => {
    it('ONLY texted, ⛔ submitted, in-window requests; clamped', async () => {
      const { client } = getTx();
      const neighbour = randomUUID();
      const make = async (state: FixtureState | 'verification_in_progress', texted = true) => {
        const r = await requestAt(client, state, { texted });
        await client.query(`UPDATE claim_peer_mesh_pings SET member_id = $1 WHERE ping_id = $2`, [neighbour, r.pingId]);
        await client.query(`UPDATE claim_peer_mesh_selections SET selected_member_ids = ARRAY[$1, $2]::uuid[] WHERE selection_id = $3`, [neighbour, r.other, r.selectionId]);
        return { ...r, neighbour: toMemberId(neighbour) };
      };
      const open = await make('verification_in_progress');
      const untexted = await make('verification_in_progress', false);
      const closed = await make('denied');
      const submitted = await make('verifier_review');
      await enterAppScope(client, PARIWAR_A);
      await save(client, submitted, 'has_died', { codes: ['died'] });
      await submitPeerReply(client, { pariwarId: submitted.pid, pingId: submitted.pingId, memberId: submitted.neighbour });
      const list = await listOpenPeerRequestsForMember(bindScopedDb(client), toPariwarId(PARIWAR_A), toMemberId(neighbour), 50);
      expect(list.map((x) => x.pingId)).toEqual([open.pingId]);
      expect(list[0]).toMatchObject({ claimCaseId: open.cid, deceasedMemberId: open.mid });
      expect(list.map((x) => x.pingId)).not.toContain(untexted.pingId);
      expect(list.map((x) => x.pingId)).not.toContain(closed.pingId);
      expect(await listOpenPeerRequestsForMember(bindScopedDb(client), toPariwarId(PARIWAR_A), toMemberId(neighbour), 0)).toHaveLength(1);
      // ⭐ Review S8 (b) — the cap has teeth: SIX open requests ⇒ FIVE listed (PEER_REQUEST_LIST_CAP), even when 50 are asked.
      await client.query('RESET ROLE'); // the fixtures are the superuser's
      for (let i = 0; i < 5; i += 1) await make('verification_in_progress');
      await enterAppScope(client, PARIWAR_A);
      expect(await listOpenPeerRequestsForMember(bindScopedDb(client), toPariwarId(PARIWAR_A), toMemberId(neighbour), 50)).toHaveLength(5);
      expect(await listOpenPeerRequestsForMember(bindScopedDb(client), toPariwarId(PARIWAR_A), toMemberId(neighbour))).toHaveLength(5);
    });
  });

  describe('PM25 (c) — the inspector forms their own view first (the console hides the section)', () => {
    it('hidden while the actor holds an UN-completed assignment and ⛔ completed FULL visit; a certificate_check alone does ⛔ not lift it; a completed initial visit does', async () => {
      const { client } = getTx();
      const r = await requestAt(client, 'verification_in_progress');
      await seedAcceptedDeathCertificate(client, { pariwarId: r.pid, claimCaseId: r.cid });
      const inspector = randomUUID();
      const db = bindScopedDb(client);
      expect(await isPeerSectionHiddenFromActor(db, r.pid, r.cid, inspector)).toBe(false); // ⛔ assignment at all
      await scheduleGroundInspection(client, {
        claimCaseId: r.cid,
        pariwarId: r.pid,
        district: 'Patna',
        inspectionStage: 'initial',
        inspectionSiteType: 'family_residence',
        inspectorActorId: inspector,
        scheduledAt: new Date(),
        scheduledByActor: inspector,
        idempotencyKey: randomUUID(),
      });
      expect(await isPeerSectionHiddenFromActor(db, r.pid, r.cid, inspector)).toBe(true);
      expect(await isPeerSectionHiddenFromActor(db, r.pid, r.cid, randomUUID())).toBe(false); // another actor
      // a COMPLETED certificate_check alone — still hidden (it records ⛔ no family account)
      await seedGroundInspection(client, r.pid, r.cid, { stage: 'certificate_check', inspectorActorId: inspector, force: true });
      expect(await isPeerSectionHiddenFromActor(db, r.pid, r.cid, inspector)).toBe(true);
      // a COMPLETED full visit — shown (even with an un-completed assignment still open)
      await seedGroundInspection(client, r.pid, r.cid, { stage: 'initial', inspectorActorId: inspector, force: true });
      expect(await isPeerSectionHiddenFromActor(db, r.pid, r.cid, inspector)).toBe(false);
    });
  });
});

/** Story 6.33 — a `peer_mesh` DB version on v4 (one chain question), inserted as the superuser, made live for `pid`. */
async function peerDbVersion(client: Client, pid: string, over: { warning?: boolean; madeLive?: boolean } = {}): Promise<string> {
  const version = 500_000 + Math.floor(Math.random() * 499_999);
  const { id, def } = chainDefinition(PEER_MESH_QUESTIONNAIRE_V4, version, randomUUID(), (cid) => [chainQuestion(cid, { warning: over.warning ?? false })]);
  await client.query('RESET ROLE');
  await client.query(
    `INSERT INTO questionnaire_versions (id, kind, version, version_id, base_version_id, ruled_base_code_version_id, origin_pariwar_id, definition, authored_by_actor, authored_by_display, direct, reason)
     VALUES ($1, 'peer_mesh', $2, $3, 'peer_mesh.v4', 'peer_mesh.v4', $4, $5, 'pa', 'Pariwar Admin', false, NULL)`,
    [id, version, def.versionId, pid, JSON.stringify(toStoredDefinition(def))],
  );
  if (over.madeLive !== false) {
    await client.query(
      `INSERT INTO questionnaire_version_steps (version_id, step, target_pariwar_id, scope_pariwar_id, actor, actor_display) VALUES ($1, 'made_live', $2, $2, 'sa', 'Super Admin')`,
      [def.versionId, pid],
    );
  }
  await enterAppScope(client, pid);
  return def.versionId;
}

const flipSave = (client: Client, r: Req, key: string, value: QuestionnaireAnswerValue, prepared: PreparedPeerAnswer, preRead: string, clientId?: string) =>
  savePeerAnswer(client, {
    pariwarId: r.pid,
    pingId: r.pingId,
    memberId: r.neighbour,
    questionKey: key,
    value,
    prepared,
    decryptedLive: new Map(),
    preReadVersionId: preRead,
    ...(clientId !== undefined ? { clientVersionId: clientId } : {}),
    savedVia: 'member_app',
    savedByActorId: r.neighbour,
    todayIst: TODAY,
  });

async function probe<T>(client: Client, fn: () => Promise<T>): Promise<T> {
  await client.query('SAVEPOINT flip_probe');
  try {
    const out = await fn();
    await client.query('RELEASE SAVEPOINT flip_probe');
    return out;
  } catch (err) {
    await client.query('ROLLBACK TO SAVEPOINT flip_probe');
    throw err;
  }
}

describe.skipIf(!hasDatabase)('Story 6.33 — the neighbours\' reply after a version FLIP (R7; D8)', { timeout: 20000 }, () => {
  setupLiveDb();
  const died: PreparedPeerAnswer = { form: 'codes', codes: ['died'] };

  it('a NEW reply pins the version in force — a chain version', async () => {
    const { client } = getTx();
    const r = await requestAt(client, 'verification_in_progress', { pariwarId: randomUUID() });
    const v = await peerDbVersion(client, r.pid);
    await flipSave(client, r, 'has_died', { codes: ['died'] }, died, v, v);
    const { rows } = await client.query(`SELECT questionnaire_version_id FROM claim_peer_mesh_replies WHERE ping_id = $1`, [r.pingId]);
    expect(rows).toEqual([{ questionnaire_version_id: v }]);
  });

  it("a flip between the client's load and its first save: its id ⇒ VERSION-stale (reload); ⛔ id (an installed app) ⇒ the retryable stale", async () => {
    const { client } = getTx();
    const r = await requestAt(client, 'verification_in_progress', { pariwarId: randomUUID() });
    await peerDbVersion(client, r.pid);
    await expect(probe(client, () => flipSave(client, r, 'has_died', { codes: ['died'] }, died, 'peer_mesh.v4', 'peer_mesh.v4'))).rejects.toBeInstanceOf(PeerRequestVersionStaleError);
    await expect(probe(client, () => flipSave(client, r, 'has_died', { codes: ['died'] }, died, 'peer_mesh.v4'))).rejects.toBeInstanceOf(PeerRequestStaleError);
  });

  it('⭐ D8 — the compare runs FIRST: a save prepared on the chain version after a revert is VERSION-stale, ⛔ a 422 / a bare Error', async () => {
    const { client } = getTx();
    const r = await requestAt(client, 'verification_in_progress', { pariwarId: randomUUID() });
    const v = await peerDbVersion(client, r.pid);
    await client.query('RESET ROLE');
    await client.query(
      `INSERT INTO questionnaire_version_steps (version_id, step, target_pariwar_id, scope_pariwar_id, actor, actor_display) VALUES ($1, 'pariwar_reverted', $2, $2, 'sa', 'Super Admin')`,
      [v, r.pid],
    );
    await enterAppScope(client, r.pid);
    const sealed: PreparedPeerAnswer = { form: 'encrypted', ciphertext: 'enc:test:["well"]', dateWindowIndexes: null, codeIndexes: null };
    await expect(probe(client, () => flipSave(client, r, 'water_source', { codes: ['well'] }, sealed, v, v))).rejects.toBeInstanceOf(PeerRequestVersionStaleError);
  });

  it('R7 (v) — a reply PINNED to a version that fails validation at read: a save is REFUSED unreadable', async () => {
    const { client } = getTx();
    const r = await requestAt(client, 'verification_in_progress', { pariwarId: randomUUID() });
    const bad = await peerDbVersion(client, r.pid, { warning: true, madeLive: false });
    await client.query('RESET ROLE');
    await client.query(
      `INSERT INTO claim_peer_mesh_replies (pariwar_id, claim_case_id, selection_id, ping_id, responder_member_id, questionnaire_version_id)
       SELECT pariwar_id, $2, selection_id, ping_id, member_id, $3 FROM claim_peer_mesh_pings WHERE ping_id = $1`,
      [r.pingId, r.cid, bad],
    );
    await enterAppScope(client, r.pid);
    await expect(probe(client, () => flipSave(client, r, 'has_died', { codes: ['died'] }, died, bad, bad))).rejects.toBeInstanceOf(PeerRequestVersionUnreadableError);
  });
});

describe.skipIf(!hasDatabase)('Story 6.33 (AC4; G16) — the answer read caps hold at the version cap: 20 questions × 5 replies', { timeout: 20000 }, () => {
  setupLiveDb();

  it('the console read returns ALL 100 live answers (⛔ silent truncation); one reply\'s live read returns its 20', async () => {
    expect(QUESTIONNAIRE_MAX_QUESTIONS).toBe(20);
    expect(PEER_CONSOLE_ANSWERS_CAP).toBeGreaterThanOrEqual(5 * QUESTIONNAIRE_MAX_QUESTIONS);
    expect(PEER_LIVE_ANSWERS_CAP).toBeGreaterThanOrEqual(QUESTIONNAIRE_MAX_QUESTIONS);
    const { client } = getTx();
    const pid = randomUUID();
    const cid = randomUUID();
    const mid = randomUUID();
    await driveClaimTo(client, pid, cid, mid, 'verification_in_progress');
    const pings = await attachTextedPings(client, pid, cid, mid, 5);
    for (const ping of pings) {
      const { rows } = await client.query<{ reply_id: string }>(
        `INSERT INTO claim_peer_mesh_replies (pariwar_id, claim_case_id, selection_id, ping_id, responder_member_id, questionnaire_version_id)
         SELECT pariwar_id, $2, selection_id, ping_id, member_id, 'peer_mesh.v4' FROM claim_peer_mesh_pings WHERE ping_id = $1 RETURNING reply_id`,
        [ping.pingId, cid],
      );
      for (let i = 0; i < QUESTIONNAIRE_MAX_QUESTIONS; i += 1) {
        await client.query(
          `INSERT INTO claim_peer_mesh_reply_answers (pariwar_id, claim_case_id, reply_id, question_key, value_ciphertext, saved_via, saved_by_actor_id)
           VALUES ($1, $2, $3, $4, 'enc:test:["x"]', 'member_app', 'm')`,
          [pid, cid, rows[0]!.reply_id, `chain_q_${i}`],
        );
      }
    }
    const read = await readPeerAnswersForClaim(bindScopedDb(client), toPariwarId(pid), toClaimId(cid));
    expect(read.replies).toHaveLength(5);
    expect(read.answers).toHaveLength(100);
    const view = await readPeerRequest(bindScopedDb(client), toPariwarId(pid), toPingId(pings[0]!.pingId), toMemberId(pings[0]!.neighbour));
    expect(await readLivePeerAnswers(bindScopedDb(client), toPariwarId(pid), view.reply!.replyId)).toHaveLength(20);
  });
});

describe.skipIf(!hasDatabase)('Story 6.33 (AC10; I1) — NOTHING GATES: a staff question answered leaves every gate byte-identical', { timeout: 20000 }, () => {
  setupLiveDb();

  /** Every reader that decides, flags or delays a claim — its outcome, serialised. */
  async function gates(client: Client, r: Req): Promise<string> {
    const db = bindScopedDb(client);
    let approvable: string;
    try {
      await assertClaimApprovable(db, r.pid, r.cid, r.mid, { approvingActorIds: [OPERATOR], step: 'final' });
      approvable = 'ok';
    } catch (err) {
      approvable = `${(err as Error).name}: ${(err as Error).message}`;
    }
    const warnings = await readClaimApprovalWarnings(db, r.pid, r.cid);
    const completion = groundInspectionApprovalState(await readGroundInspectionApprovalFacts(db, r.pid, r.cid));
    return JSON.stringify({ approvable, warnings, completion }, (_k, v: unknown) => (v instanceof Map ? [...v] : v));
  }

  it('a chain question (any value) answered on a claim ⇒ assertClaimApprovable, the completion predicate and the warnings summary are UNCHANGED', async () => {
    const { client } = getTx();
    const r = await requestAt(client, 'verification_in_progress', { pariwarId: randomUUID() });
    const v = await peerDbVersion(client, r.pid);
    await flipSave(client, r, 'has_died', { codes: ['died'] }, { form: 'codes', codes: ['died'] }, v, v);
    const before = await gates(client, r);
    for (const code of ['well', 'tap']) {
      const sealed: PreparedPeerAnswer = { form: 'encrypted', ciphertext: `enc:test:${JSON.stringify([code])}`, dateWindowIndexes: null, codeIndexes: null };
      await savePeerAnswer(client, {
        pariwarId: r.pid,
        pingId: r.pingId,
        memberId: r.neighbour,
        questionKey: 'water_source',
        value: { codes: [code] },
        prepared: sealed,
        decryptedLive: await decryptedLiveOf(client, r),
        preReadVersionId: v,
        clientVersionId: v,
        savedVia: 'member_app',
        savedByActorId: r.neighbour,
        todayIst: TODAY,
      });
      expect(await gates(client, r)).toBe(before);
    }
    const { rows } = await client.query(`SELECT count(*)::int AS n FROM claim_peer_mesh_reply_answers WHERE claim_case_id = $1 AND question_key = 'water_source'`, [r.cid]);
    expect(rows[0].n).toBe(2); // the staff answers WERE written (⛔ a vacuous comparison)
  });
});

