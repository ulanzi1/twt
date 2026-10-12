// The NEIGHBOURS' REPLY — save, submit, the reply state, the event-response mapping and the reads (Story 6.27a PM7 (b)–(g),
// PM8, PM11, PM12; `2026-10-10-311`).
//
// ⭐ SAVED AS THEY GO (BigDev 2026-10-10): every answer is saved the moment it is chosen; an edit stamps the old row's
// `superseded_at` FIRST, then inserts the new live row (the partial UNIQUE cannot be deferred); an answer whose condition
// stops holding (e.g. *"died"* → *"not sure"*) has its dependants superseded in the SAME transaction; Submit stamps
// `submitted_at` and locks the reply — ⛔ nothing else happens at Submit.
// ⭐ LOCK ORDER (Invariant 9): the CLAIM row, then the PING row, then the REPLY row — the order every approval writer uses,
// so a save racing an approval serializes on the claim row. ⛔ The death's intake key is ⛔ never taken here (6.28's
// closure takes it, then claim rows — Trap 5). ⛔ NO KMS under a lock (Trap 9): the HANDLER encrypts the sensitive value
// and computes the date's three keyed indexes FIRST, and decrypts the reply's live sensitive answers it needs; this writer
// receives ciphertext + indexes (+ the decrypted values keyed by `answer_id`, re-verified under the locks — a stale read
// is `PeerRequestStaleError`, a 409 the client retries).
// ⭐ THE EVENT: `claim.peer_mesh_responded` (6.6's payload, unchanged) is written ONCE, at the FIRST save of `has_died`
// (⛔ when a prior `has_died` row or a 6.6-era response event exists) — so 6.6's already-answered guard is ⛔ never hit on
// an edit; `died` ⇒ `confirmed`, `not_died` ⇒ `denied`, `not_sure` / `did_not_know` ⇒ `unknown`. ⚠ RECORDED: the event
// carries the FIRST answer; the live answer is the table's.
// ⭐ A request the Trust has ⛔ not texted (`send_outcome IS DISTINCT FROM 'accepted'`) is `PeerRequestNotFoundError` —
// the SAME answer as "not yours / unknown / another Pariwar" (PM11 — one indistinguishable 404).
// ⛔ No decrypt here (the decrypt fence); ⛔ no PII in an error message, a log or the event.

import { randomUUID } from 'node:crypto';

import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import type pg from 'pg';

import { bindScopedDb, type Db } from '../db.js';
import type { ClaimId, MemberId, PariwarId, PeerMeshPingId, PeerMeshReplyId, PeerMeshSelectionId } from '../ids/index.js';
import { clampLimit } from '../pagination.js';
import {
  checkAnswer,
  dependantsToSupersede,
  getQuestionnaireVersion,
  HAS_DIED_CODES,
  resolveLiveVersion,
  servedDefinition,
  type AnswerRefusalReason,
  type HasDiedCode,
  type LiveAnswerCodes,
  type QuestionnaireAnswerValue,
  type QuestionnaireDefinition,
} from '../questionnaires/index.js';
import { claimPeerMeshPings, type PeerMeshSendOutcome } from '../schema/claim_peer_mesh_pings.js';
import {
  claimPeerMeshReplies,
  claimPeerMeshReplyAnswers,
  type ClaimPeerMeshReplyAnswerRow,
  type PeerMeshAnswerSavedVia,
} from '../schema/claim_peer_mesh_replies.js';
import { claimPeerMeshSelections } from '../schema/claim_peer_mesh_selections.js';
import { claims } from '../schema/claims.js';
import { answerWindowSql, isClaimInAnswerWindow } from './answer-window.js';
import { getPeerMeshResponses } from './peer-mesh-read.js';
import { recordPeerMeshResponse } from './peer-mesh-persist.js';
import { lockClaimCase } from './read.js';

// ── the event-response MAPPING (PM7 (e)) — here, ⛔ never in `questionnaires/` (NW1) ─────────────────────────────────────

/** `has_died` code ⇒ 6.6's `response`. `denied` ⇔ *"they have not died"* ONLY (SEVEN FACTS #5). */
export const HAS_DIED_EVENT_RESPONSE: Readonly<Record<HasDiedCode, 'confirmed' | 'denied' | 'unknown'>> = {
  died: 'confirmed',
  not_died: 'denied',
  not_sure: 'unknown',
  did_not_know: 'unknown',
};

// ── errors (the routes map them: 404 / 409 / 422) ────────────────────────────────────────────────────────────────────────

/** ⛔ Not yours, unknown, another Pariwar's — or ⛔ never texted. ONE indistinguishable answer (404). */
export class PeerRequestNotFoundError extends Error {
  public readonly name = 'PeerRequestNotFoundError';
  public constructor() {
    super('[peer-request] not found');
  }
}
/** Yours, texted, but the claim is outside the answer window (409 `peer_request.no_longer_open` — ⛔ never why). */
export class PeerRequestNoLongerOpenError extends Error {
  public readonly name = 'PeerRequestNoLongerOpenError';
  public constructor() {
    super('[peer-request] no longer open');
  }
}
/** The reply is submitted — locked (409 `peer_request.submitted`). */
export class PeerRequestSubmittedError extends Error {
  public readonly name = 'PeerRequestSubmittedError';
  public constructor() {
    super('[peer-request] already submitted');
  }
}
/** The answer fails the pinned version's check (422 `peer_request.invalid_answer`). The reason is a CODE, ⛔ never the value. */
export class PeerRequestInvalidAnswerError extends Error {
  public readonly name = 'PeerRequestInvalidAnswerError';
  public constructor(public readonly reason: AnswerRefusalReason | 'has_died_required') {
    super(`[peer-request] invalid answer: ${reason}`);
  }
}
/** The handler's pre-lock read of the reply went stale (409 `peer_request.stale` — the client retries the save). */
export class PeerRequestStaleError extends Error {
  public readonly name = 'PeerRequestStaleError';
  public constructor() {
    super('[peer-request] stale read — retry');
  }
}

// ── reads ─────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Cap of the member's / the helpline's request list (PM11 — forced pagination). */
export const PEER_REQUEST_LIST_CAP = 5;

export interface PeerRequestRow {
  readonly pingId: PeerMeshPingId;
  readonly selectionId: PeerMeshSelectionId;
  readonly claimCaseId: ClaimId;
  readonly deceasedMemberId: MemberId;
  /** The neighbour (the ping's member). */
  readonly memberId: MemberId;
  readonly sendOutcome: PeerMeshSendOutcome | null;
  /** When the text was accepted (`send_updated_at`, else `claimed_at`) — null before 6.27c sends. */
  readonly askedAt: Date | null;
  readonly claimState: string;
  readonly reply: {
    readonly replyId: PeerMeshReplyId;
    readonly questionnaireVersionId: string;
    readonly startedAt: Date;
    readonly submittedAt: Date | null;
  } | null;
}

async function readPeerRequestRow(db: Db, pariwarId: PariwarId, pingId: PeerMeshPingId): Promise<PeerRequestRow | null> {
  const rows = await db
    .select({
      pingId: claimPeerMeshPings.pingId,
      selectionId: claimPeerMeshPings.selectionId,
      memberId: claimPeerMeshPings.memberId,
      sendOutcome: claimPeerMeshPings.sendOutcome,
      sendUpdatedAt: claimPeerMeshPings.sendUpdatedAt,
      claimedAt: claimPeerMeshPings.claimedAt,
      claimCaseId: claimPeerMeshSelections.claimCaseId,
      deceasedMemberId: claims.deceasedMemberId,
      claimState: claims.currentState,
      replyId: claimPeerMeshReplies.replyId,
      questionnaireVersionId: claimPeerMeshReplies.questionnaireVersionId,
      startedAt: claimPeerMeshReplies.startedAt,
      submittedAt: claimPeerMeshReplies.submittedAt,
    })
    .from(claimPeerMeshPings)
    .innerJoin(claimPeerMeshSelections, eq(claimPeerMeshSelections.selectionId, claimPeerMeshPings.selectionId))
    .innerJoin(claims, and(eq(claims.pariwarId, claimPeerMeshSelections.pariwarId), eq(claims.claimCaseId, claimPeerMeshSelections.claimCaseId)))
    .leftJoin(claimPeerMeshReplies, eq(claimPeerMeshReplies.pingId, claimPeerMeshPings.pingId))
    .where(and(eq(claimPeerMeshPings.pariwarId, pariwarId), eq(claimPeerMeshPings.pingId, pingId)))
    .limit(1);
  const r = rows[0];
  if (!r) return null;
  return {
    pingId: r.pingId,
    selectionId: r.selectionId,
    claimCaseId: r.claimCaseId as ClaimId,
    deceasedMemberId: r.deceasedMemberId,
    memberId: r.memberId,
    sendOutcome: r.sendOutcome ?? null,
    askedAt: r.sendUpdatedAt ?? r.claimedAt ?? null,
    claimState: r.claimState,
    reply:
      r.replyId === null
        ? null
        : { replyId: r.replyId, questionnaireVersionId: r.questionnaireVersionId!, startedAt: r.startedAt!, submittedAt: r.submittedAt ?? null },
  };
}

/** Visibility: a ping exists in scope, was TEXTED, and (for the member route) is the member's own. */
function visible(row: PeerRequestRow | null, memberId: MemberId | null): row is PeerRequestRow {
  return row !== null && row.sendOutcome === 'accepted' && (memberId === null || row.memberId === memberId);
}

export interface PeerRequestView extends PeerRequestRow {
  /** In the answer window AND ⛔ not submitted. */
  readonly open: boolean;
  readonly inWindow: boolean;
}

/**
 * One request as its owner sees it — or `PeerRequestNotFoundError` (⛔ yours / unknown / another Pariwar / ⛔ texted).
 * `memberId` = the session member (the member routes) or `null` (the helpline — any TEXTED ping in scope).
 */
export async function readPeerRequest(
  db: Db,
  pariwarId: PariwarId,
  pingId: PeerMeshPingId,
  memberId: MemberId | null,
): Promise<PeerRequestView> {
  const row = await readPeerRequestRow(db, pariwarId, pingId);
  if (!visible(row, memberId)) throw new PeerRequestNotFoundError();
  const inWindow = await isClaimInAnswerWindow(db, pariwarId, row.claimCaseId, row.claimState);
  return { ...row, inWindow, open: inWindow && row.reply?.submittedAt == null };
}

export interface OpenPeerRequestRow {
  readonly pingId: PeerMeshPingId;
  readonly claimCaseId: ClaimId;
  readonly deceasedMemberId: MemberId;
  readonly askedAt: Date | null;
}

/**
 * The member's OPEN requests (PM11): TEXTED (`send_outcome = 'accepted'`) AND ⛔ submitted AND the claim in the answer
 * window (`answerWindowSql` — ⛔ never a hand-composed copy). Newest first; `clampLimit` (cap 5). ⭐ DARK until 6.27c texts
 * anyone. The helpline's list is the same read for the member on the phone.
 */
export async function listOpenPeerRequestsForMember(
  db: Db,
  pariwarId: PariwarId,
  memberId: MemberId,
  limit?: number,
): Promise<OpenPeerRequestRow[]> {
  const n = clampLimit(limit, { default: PEER_REQUEST_LIST_CAP, cap: PEER_REQUEST_LIST_CAP });
  const { rows } = await db.execute<{ ping_id: string; claim_case_id: string; deceased_member_id: string; asked_at: Date | null }>(sql`
    SELECT p.ping_id, s.claim_case_id, c.deceased_member_id, COALESCE(p.send_updated_at, p.claimed_at) AS asked_at
      FROM claim_peer_mesh_pings p
      JOIN claim_peer_mesh_selections s ON s.selection_id = p.selection_id
      JOIN claims c ON c.pariwar_id = s.pariwar_id AND c.claim_case_id = s.claim_case_id
      LEFT JOIN claim_peer_mesh_replies r ON r.ping_id = p.ping_id
     WHERE p.pariwar_id = ${pariwarId}::uuid
       AND p.member_id = ${memberId}::uuid
       AND p.send_outcome = 'accepted'
       AND r.submitted_at IS NULL
       AND ${answerWindowSql('c')}
     ORDER BY COALESCE(p.send_updated_at, p.claimed_at) DESC NULLS LAST, p.ping_id
     LIMIT ${n}`);
  return rows.map((r) => ({
    pingId: r.ping_id as PeerMeshPingId,
    claimCaseId: r.claim_case_id as ClaimId,
    deceasedMemberId: r.deceased_member_id as MemberId,
    askedAt: r.asked_at === null ? null : new Date(r.asked_at),
  }));
}

/** The reply's LIVE answer rows (ciphertext AS STORED — the handler decrypts). */
export async function readLivePeerAnswers(db: Db, pariwarId: PariwarId, replyId: PeerMeshReplyId): Promise<ClaimPeerMeshReplyAnswerRow[]> {
  return db
    .select()
    .from(claimPeerMeshReplyAnswers)
    .where(
      and(
        eq(claimPeerMeshReplyAnswers.pariwarId, pariwarId),
        eq(claimPeerMeshReplyAnswers.replyId, replyId),
        isNull(claimPeerMeshReplyAnswers.supersededAt),
      ),
    )
    .orderBy(asc(claimPeerMeshReplyAnswers.savedAt));
}

/** `'none' | 'started' | 'submitted'` — row 6-31's *"has ⛔ not answered"* reads THIS (PM7 (g)), ⛔ never its own copy. */
export type PeerMeshReplyState = 'none' | 'started' | 'submitted';
export async function peerMeshReplyState(db: Db, pariwarId: PariwarId, pingId: PeerMeshPingId): Promise<PeerMeshReplyState> {
  const rows = await db
    .select({ submittedAt: claimPeerMeshReplies.submittedAt })
    .from(claimPeerMeshReplies)
    .where(and(eq(claimPeerMeshReplies.pariwarId, pariwarId), eq(claimPeerMeshReplies.pingId, pingId)))
    .limit(1);
  if (rows.length === 0) return 'none';
  return rows[0]!.submittedAt === null ? 'started' : 'submitted';
}

/** The version a reply is (or will be) pinned to: its own, else the live one at this first save (PM23 (c)). */
export function pinnedVersionFor(reply: PeerRequestRow['reply'], pariwarId: PariwarId): QuestionnaireDefinition {
  const def = reply ? getQuestionnaireVersion(reply.questionnaireVersionId) : resolveLiveVersion('peer_mesh', pariwarId);
  if (!def) throw new Error('[peer-request] no questionnaire version to pin');
  return def;
}

// ── save ──────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** How the HANDLER prepared the value BEFORE the locks — plaintext codes, or a ciphertext (+ the date's three indexes). */
export type PreparedPeerAnswer =
  | { readonly form: 'codes'; readonly codes: readonly string[] }
  | { readonly form: 'encrypted'; readonly ciphertext: string; readonly dateWindowIndexes: readonly [string, string, string] | null };

export interface SavePeerAnswerInput {
  readonly pariwarId: PariwarId;
  readonly pingId: PeerMeshPingId;
  /** The session member (the member routes) — or `null` for the helpline. */
  readonly memberId: MemberId | null;
  readonly questionKey: string;
  /** The PLAINTEXT value — validation only; ⛔ never stored for a sensitive question. */
  readonly value: QuestionnaireAnswerValue;
  readonly prepared: PreparedPeerAnswer;
  /** The reply's live SENSITIVE answers, DECRYPTED by the handler before the locks, keyed by `answer_id`. */
  readonly decryptedLive: ReadonlyMap<string, QuestionnaireAnswerValue>;
  readonly savedVia: PeerMeshAnswerSavedVia;
  /** The neighbour (app) or the operator (helpline). */
  readonly savedByActorId: string;
  /** Today in IST (`YYYY-MM-DD`) — a date answer is ⛔ never in the future. */
  readonly todayIst: string;
}

export interface SavePeerAnswerResult {
  readonly replyId: PeerMeshReplyId;
  /** `false` ⇔ the same value was already live (idempotent by value) — ⛔ nothing written. */
  readonly written: boolean;
  /** The keys superseded as dependants in this save. */
  readonly supersededDependants: readonly string[];
  /** Every LIVE answer row after the save. */
  readonly live: readonly ClaimPeerMeshReplyAnswerRow[];
  /** `true` ⇔ this save wrote the ONE `claim.peer_mesh_responded` event. */
  readonly eventWritten: boolean;
}

function valueOfRow(row: ClaimPeerMeshReplyAnswerRow, decrypted: ReadonlyMap<string, QuestionnaireAnswerValue>): QuestionnaireAnswerValue | undefined {
  if (row.valueCodes !== null) return { codes: row.valueCodes };
  return decrypted.get(row.answerId);
}

function sameValue(a: QuestionnaireAnswerValue, b: QuestionnaireAnswerValue): boolean {
  if ('date' in a || 'date' in b) return 'date' in a && 'date' in b && a.date === b.date;
  return a.codes.length === b.codes.length && a.codes.every((c, i) => c === b.codes[i]);
}

/**
 * Lock claim → ping → reply, check visibility, the window and Submit, then re-validate against the PINNED version and
 * the live answers read UNDER the locks. Returns what the caller needs; throws the mapped errors.
 */
async function lockForWrite(db: Db, pariwarId: PariwarId, pingId: PeerMeshPingId, memberId: MemberId | null) {
  const pre = await readPeerRequestRow(db, pariwarId, pingId);
  if (!visible(pre, memberId)) throw new PeerRequestNotFoundError();

  // (1) the CLAIM row, (2) the PING row, (3) the REPLY row — Invariant 9.
  const claimRow = await lockClaimCase(db, pariwarId, pre.claimCaseId);
  if (!claimRow) throw new PeerRequestNotFoundError();
  if (!(await isClaimInAnswerWindow(db, pariwarId, pre.claimCaseId, claimRow.currentState))) throw new PeerRequestNoLongerOpenError();
  await db.select({ pingId: claimPeerMeshPings.pingId }).from(claimPeerMeshPings).where(eq(claimPeerMeshPings.pingId, pingId)).for('update');
  const replies = await db
    .select()
    .from(claimPeerMeshReplies)
    .where(and(eq(claimPeerMeshReplies.pariwarId, pariwarId), eq(claimPeerMeshReplies.pingId, pingId)))
    .for('update');
  const reply = replies[0] ?? null;
  if (reply?.submittedAt != null) throw new PeerRequestSubmittedError();
  return { pre, claimRow, reply };
}

/**
 * Save ONE answer (PM7 (b)). Idempotent by value. Validates against the reply's PINNED version (the live version at the
 * first save); supersedes the old live row and any dependant whose condition stops holding; writes the ONE event at the
 * first `has_died` save. ⛔ No KMS here.
 */
export async function savePeerAnswer(client: pg.PoolClient, input: SavePeerAnswerInput): Promise<SavePeerAnswerResult> {
  const db = bindScopedDb(client);
  const { pre, reply } = await lockForWrite(db, input.pariwarId, input.pingId, input.memberId);
  const def = pinnedVersionFor(reply ? { ...reply, submittedAt: reply.submittedAt ?? null } : null, input.pariwarId);
  const served = servedDefinition(def);

  const liveRows = reply ? await readLivePeerAnswers(db, input.pariwarId, reply.replyId) : [];
  const live = new Map<string, readonly string[] | null>();
  const liveValues = new Map<string, QuestionnaireAnswerValue>();
  for (const row of liveRows) {
    const v = valueOfRow(row, input.decryptedLive);
    if (v === undefined) throw new PeerRequestStaleError();
    liveValues.set(row.questionKey, v);
    live.set(row.questionKey, 'codes' in v ? v.codes : null);
  }

  const check = checkAnswer(served, input.questionKey, input.value, live as LiveAnswerCodes, input.todayIst);
  if (!check.ok) throw new PeerRequestInvalidAnswerError(check.reason);

  // The handler's prepared form must be the form the re-check stores (a programmer error otherwise — ⛔ a 4xx).
  const s = check.storage;
  const p = input.prepared;
  if (s.form !== p.form) throw new Error('[peer-request] prepared form does not match the answer');
  if (s.form === 'codes' && p.form === 'codes' && !sameValue({ codes: s.codes }, { codes: p.codes })) {
    throw new Error('[peer-request] prepared codes do not match the answer');
  }
  if (s.form === 'encrypted' && p.form === 'encrypted' && (s.dateWindow === null) !== (p.dateWindowIndexes === null)) {
    throw new Error('[peer-request] prepared date indexes do not match the answer');
  }

  const normalized: QuestionnaireAnswerValue = check.codes === null ? input.value : { codes: check.codes };
  const current = liveValues.get(input.questionKey);
  if (current !== undefined && sameValue(current, normalized)) {
    return { replyId: reply!.replyId, written: false, supersededDependants: [], live: liveRows, eventWritten: false };
  }

  // The reply — pinned at its FIRST save.
  let replyId = reply?.replyId ?? null;
  if (replyId === null) {
    replyId = randomUUID() as PeerMeshReplyId;
    await db.insert(claimPeerMeshReplies).values({
      replyId,
      pariwarId: input.pariwarId,
      claimCaseId: pre.claimCaseId,
      selectionId: pre.selectionId,
      pingId: input.pingId,
      responderMemberId: pre.memberId,
      questionnaireVersionId: def.versionId,
    });
  }

  // Stamp the old live row FIRST, then the dependants, then insert (the partial UNIQUE is ⛔ deferrable).
  const dependants = dependantsToSupersede(served, input.questionKey, check.codes, live as LiveAnswerCodes);
  const toStamp = [...(current !== undefined ? [input.questionKey] : []), ...dependants];
  for (const key of toStamp) {
    await db
      .update(claimPeerMeshReplyAnswers)
      .set({ supersededAt: sql`clock_timestamp()` })
      .where(
        and(
          eq(claimPeerMeshReplyAnswers.pariwarId, input.pariwarId),
          eq(claimPeerMeshReplyAnswers.replyId, replyId),
          eq(claimPeerMeshReplyAnswers.questionKey, key),
          isNull(claimPeerMeshReplyAnswers.supersededAt),
        ),
      );
  }

  // Was there EVER a `has_died` row (before this save)? Read before the insert.
  let firstHasDied = false;
  if (input.questionKey === 'has_died') {
    const prior = await db
      .select({ id: claimPeerMeshReplyAnswers.answerId })
      .from(claimPeerMeshReplyAnswers)
      .where(
        and(
          eq(claimPeerMeshReplyAnswers.pariwarId, input.pariwarId),
          eq(claimPeerMeshReplyAnswers.replyId, replyId),
          eq(claimPeerMeshReplyAnswers.questionKey, 'has_died'),
        ),
      )
      .limit(1);
    firstHasDied = prior.length === 0;
  }

  await db.insert(claimPeerMeshReplyAnswers).values({
    pariwarId: input.pariwarId,
    claimCaseId: pre.claimCaseId,
    replyId,
    questionKey: input.questionKey,
    valueCodes: p.form === 'codes' ? [...p.codes] : null,
    valueCiphertext: p.form === 'encrypted' ? p.ciphertext : null,
    deathDateWindowIndexes: p.form === 'encrypted' && p.dateWindowIndexes !== null ? [...p.dateWindowIndexes] : null,
    savedVia: input.savedVia,
    savedByActorId: input.savedByActorId,
  });

  // ⭐ The ONE event — at the first `has_died` save, unless a 6.6-era response already exists for this neighbour.
  let eventWritten = false;
  if (firstHasDied) {
    const responses = await getPeerMeshResponses(db, pre.claimCaseId);
    if (!responses.some((r) => r.responderMemberId === pre.memberId)) {
      const code = check.codes![0] as HasDiedCode;
      if (!(HAS_DIED_CODES as readonly string[]).includes(code)) throw new Error('[peer-request] unmapped has_died code');
      await recordPeerMeshResponse(client, {
        claimCaseId: pre.claimCaseId,
        pariwarId: input.pariwarId,
        responderMemberId: pre.memberId,
        response: HAS_DIED_EVENT_RESPONSE[code],
        actor: input.savedVia === 'helpline' ? 'operator' : 'member',
        actorId: input.savedByActorId,
      });
      eventWritten = true;
    }
  }

  return {
    replyId,
    written: true,
    supersededDependants: dependants,
    live: await readLivePeerAnswers(db, input.pariwarId, replyId),
    eventWritten,
  };
}

// ── submit ────────────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Submit (PM7 (d)): stamps `submitted_at` — the reply is locked for the app AND the helpline. ⛔ Nothing else happens.
 * A reply with ⛔ no live `has_died` answer is refused (the one required question); a second Submit is
 * `PeerRequestSubmittedError` (409).
 */
export async function submitPeerReply(
  client: pg.PoolClient,
  input: { readonly pariwarId: PariwarId; readonly pingId: PeerMeshPingId; readonly memberId: MemberId | null },
): Promise<{ readonly replyId: PeerMeshReplyId; readonly submittedAt: Date }> {
  const db = bindScopedDb(client);
  const { reply } = await lockForWrite(db, input.pariwarId, input.pingId, input.memberId);
  if (!reply) throw new PeerRequestInvalidAnswerError('has_died_required');
  const live = await readLivePeerAnswers(db, input.pariwarId, reply.replyId);
  if (!live.some((a) => a.questionKey === 'has_died')) throw new PeerRequestInvalidAnswerError('has_died_required');
  const rows = await db
    .update(claimPeerMeshReplies)
    .set({ submittedAt: sql`clock_timestamp()` })
    .where(and(eq(claimPeerMeshReplies.pariwarId, input.pariwarId), eq(claimPeerMeshReplies.replyId, reply.replyId), isNull(claimPeerMeshReplies.submittedAt)))
    .returning({ submittedAt: claimPeerMeshReplies.submittedAt });
  if (rows.length === 0) throw new PeerRequestSubmittedError();
  return { replyId: reply.replyId, submittedAt: rows[0]!.submittedAt! };
}
