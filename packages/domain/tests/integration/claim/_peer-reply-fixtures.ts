// Story 6.27b (Task 1.8, Task 2.3) — the SHARED domain fixture for a neighbour's answers on a live DB: a selection and
// TEXTED pings on an EXISTING claim, and saves through the REAL writer (`savePeerAnswer`). Lifted from 6.27a's
// `peer-mesh-reply-concurrency.spec.ts` (`seedRequest`) and `peer-mesh-reply.spec.ts` (`decryptedLiveOf`) — ⛔ never a
// copy in each spec.
//
// ⚠ THE INDEX TRAP (Trap 3): a `death_date` answer's three window indexes are built with the SAME function as the
// certificate's accepted-date index — the default is `fixtureDeathDateIndex`, the one every domain fixture review uses —
// over the SHIPPED window helper (`deathDateWindow`), ⛔ never a re-derived offset list. 6.27a's `prep` builds
// `idx:${date}`, which "differs" from EVERY certificate.

import { randomUUID } from 'node:crypto';

import type pg from 'pg';

import { addCalendarDays, istDateOf } from '../../../src/cycle-calendar/holiday-resolver.js';
import { bindScopedDb } from '../../../src/db.js';
import { readLivePeerAnswers, readPeerRequest, savePeerAnswer, type PreparedPeerAnswer } from '../../../src/claim/index.js';
import { memberId as toMemberId, peerMeshPingId as toPingId, type MemberId, type PariwarId, type PeerMeshPingId } from '../../../src/ids/index.js';
import { deathDateWindow } from '../../../src/questionnaires/answers.js';
import type { QuestionnaireAnswerValue } from '../../../src/questionnaires/index.js';
import { fixtureDeathDateIndex } from '../_helpers.js';

/** The writer's `todayIst` — a week past the REAL IST today: the domain fixture accepts its certificate for TOMORROW
 *  (IST), and a neighbour's date equal to it must ⛔ not be refused as a future date. */
export const PEER_FIXTURE_TODAY = addCalendarDays(istDateOf(new Date()), 7);

export interface TextedPing {
  readonly pingId: PeerMeshPingId;
  readonly neighbour: MemberId;
}

/**
 * As the SUPERUSER (the caller's role): the claim's ONE selection with `count` neighbours and a TEXTED ping each
 * (`send_outcome = 'accepted'` — the `visible()` test). ⛔ Never a second call per claim (one selection per claim).
 */
export async function attachTextedPings(
  client: pg.PoolClient,
  pariwarId: string,
  claimCaseId: string,
  deceasedMemberId: string,
  count = 1,
): Promise<TextedPing[]> {
  const neighbours = Array.from({ length: count }, () => randomUUID());
  const selectionId = randomUUID();
  await client.query(
    `INSERT INTO claim_peer_mesh_selections (selection_id, claim_case_id, pariwar_id, deceased_member_id, deceased_created_at, metric_id,
       metric_version, selected_member_ids, candidate_snapshot, response_window_expires_at)
     VALUES ($1, $2, $3, $4, now(), 'm', 1, $5::uuid[], '[]'::jsonb, now() + interval '72 hours')`,
    [selectionId, claimCaseId, pariwarId, deceasedMemberId, neighbours],
  );
  const out: TextedPing[] = [];
  for (const neighbour of neighbours) {
    const pingId = randomUUID();
    await client.query(
      `INSERT INTO claim_peer_mesh_pings (ping_id, selection_id, pariwar_id, member_id, send_outcome, attempt_count, send_updated_at)
       VALUES ($1, $2, $3, $4, 'accepted', 1, clock_timestamp())`,
      [pingId, selectionId, pariwarId, neighbour],
    );
    out.push({ pingId: toPingId(pingId), neighbour: toMemberId(neighbour) });
  }
  return out;
}

/** The handler's storage form, faked: codes as codes; a date as a TEST ciphertext carrying its plaintext + the window. */
export function preparePeerAnswer(
  key: string,
  value: QuestionnaireAnswerValue,
  indexOf: (date: string) => string = fixtureDeathDateIndex,
): PreparedPeerAnswer {
  if ('date' in value) {
    const window = key === 'death_date' ? (deathDateWindow(value.date).map(indexOf) as [string, string, string]) : null;
    return { form: 'encrypted', ciphertext: `enc:test:${value.date}`, dateWindowIndexes: window };
  }
  return { form: 'codes', codes: value.codes };
}

/** The handler's pre-lock decrypt of the reply's live sensitive answers, faked from the TEST ciphertext. */
export async function decryptedLiveOf(
  client: pg.PoolClient,
  pariwarId: PariwarId,
  ping: TextedPing,
): Promise<Map<string, QuestionnaireAnswerValue>> {
  const out = new Map<string, QuestionnaireAnswerValue>();
  const view = await readPeerRequest(bindScopedDb(client), pariwarId, ping.pingId, ping.neighbour).catch(() => null);
  if (!view?.reply) return out;
  for (const row of await readLivePeerAnswers(bindScopedDb(client), pariwarId, view.reply.replyId)) {
    if (row.valueCiphertext === null) continue;
    const plain = row.valueCiphertext.replace(/^enc:test:/, '');
    out.set(row.answerId, /^\d{4}-\d{2}-\d{2}$/.test(plain) ? { date: plain } : { codes: JSON.parse(plain) as string[] });
  }
  return out;
}

/** In `twt_app` scope: ONE answer saved by the neighbour through the REAL writer. */
export async function savePeerFixtureAnswer(
  client: pg.PoolClient,
  pariwarId: PariwarId,
  ping: TextedPing,
  key: string,
  value: QuestionnaireAnswerValue,
  opts: { indexOf?: (date: string) => string } = {},
) {
  return savePeerAnswer(client, {
    pariwarId,
    pingId: ping.pingId,
    memberId: ping.neighbour,
    questionKey: key,
    value,
    prepared: preparePeerAnswer(key, value, opts.indexOf),
    decryptedLive: await decryptedLiveOf(client, pariwarId, ping),
    savedVia: 'member_app',
    savedByActorId: ping.neighbour,
    todayIst: PEER_FIXTURE_TODAY,
  });
}

/** The LIVE answer id of `key` on the claim (⛔ none ⇒ `null`). */
export async function liveAnswerId(client: pg.PoolClient, pariwarId: string, claimCaseId: string, pingId: string, key: string): Promise<string | null> {
  const { rows } = await client.query<{ answer_id: string }>(
    `SELECT a.answer_id
       FROM claim_peer_mesh_reply_answers a
       JOIN claim_peer_mesh_replies r ON r.pariwar_id = a.pariwar_id AND r.reply_id = a.reply_id
      WHERE a.pariwar_id = $1 AND a.claim_case_id = $2 AND r.ping_id = $3 AND a.question_key = $4 AND a.superseded_at IS NULL`,
    [pariwarId, claimCaseId, pingId, key],
  );
  return rows[0]?.answer_id ?? null;
}
