// THE NEIGHBOURS' TEXT — the domain half of sending each of the five ONE text (Story 6.27c, Task 3; AC2–AC5b; `2026-10-10-303`
// Q1 A, `2026-10-10-311` PM1, PM4 [c], PM5, PM21, PM22; `2026-10-14-330` SW22–SW24, SW27; `2026-10-16-340` / `-341`;
// `2026-10-16-343`). The SHAPE of `suspicion-notice.ts` (6.24b / 6.29), ADAPTED: the record lives on an EXISTING ping row
// (0156), whose `send_outcome IS NULL` means "⛔ not yet begun" — once-ever is the compare-and-set FROM NULL.
// Transport-free; ⛔ nothing here unseals a ciphertext (the jobs child does, AFTER the claiming commit — Trap 9).
//
// ⭐ R1 — THE SEND-TIME ORDER, under the claim lock, then the ping lock (Trap 13 — the order every reply / approval writer uses):
//   ① the answer window (`isClaimInAnswerWindow` — PM8's ONE predicate) — out ⇒ `skipped_superseded` / `superseded:claim_decided`;
//   ② the CLAIM-WIDE name fault (read by the caller BEFORE this transaction — R9) ⇒ `no_target:name_<reason>`, ⛔ replaced;
//   ③ the peer's eligibility — the ONE predicate (`peerMeshEligibleMemberSql`, ⛔ re-composed); a failure is LABELLED (R4) ⇒
//     `no_target:<peer reason>` + ONE replacement (R2), in the SAME transaction;
//   ④ else the ping is begun `attempting` (the link code written ONCE).
// ⭐ A RE-CLAIMED `attempting` row (RN7 — a crash, or a parked row) runs the same ①–③: a window or peer failure is `-297` §2's
// form — `error` + `exhausted:recheck_<reason>` (the first attempt MAY have sent ⇒ ⛔ a skip outcome, ⛔ a replacement; the caller
// alarms); a NAME fault keeps its true reason (`no_target:name_<reason>`, `-298` A — the caller alarms "may have sent").
// ⭐ R2 — THE REPLACEMENT: the selection's STORED ranking, walked in order (⛔ re-ranked); the first member with ⛔ ping in this
// selection who passes the ONE predicate gets a NEW ping naming the one it replaces (`replaces_ping_id`). ORDER inside the one
// transaction: the skip FIRST, then the INSERT (0166's trigger admits only a ping already finished `no_target` with a peer detail
// at `attempt_count = 1`). A NULL ranking (`district_cohort_v1`) or ⛔ one left ⇒ ⛔ replacement (fewer are asked — `-310` CF4).
// ⭐ R5 (`-343`) — a `no_target` on a RE-CLAIMED row is ⛔ replaced (it may already have reached that neighbour ⇒ ⛔ a sixth text).
// ⭐ R6 — `no_sendable_number` is found AFTER the commit (the number's plaintext is unusable): `finalisePeerMeshNoSendableNumber`
// takes claim → ping again, finishes the row and replaces it there (unless R5).
// ⛔ NOTHING here writes a claim decision, event or state (AC5b — ⛔ new event; invariant 7).
// ⚠ ⛔ Never a Drizzle correlated subquery — raw SQL with explicit `pr_` aliases ([[project_epic6_drizzle_correlated_subquery_bug]]).

import { randomBytes } from 'node:crypto';

import { type SQL, sql } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import type pg from 'pg';

import { addCalendarDays, istDateOf, istMidnightAt } from '../cycle-calendar/holiday-resolver.js';
import { bindScopedDb, type Db } from '../db.js';
import type { ClaimId, MemberId, PariwarId, PeerMeshPingId, PeerMeshSelectionId } from '../ids/index.js';
import { namedByClaimSql } from '../member/known-people.js';
import { clampLimit } from '../pagination.js';
import {
  PEER_MESH_LINK_CODE_PATTERN,
  PEER_MESH_REQUEST_DETAIL_PATTERN,
  type PeerMeshRequestNameReason,
  type PeerMeshRequestReplaceableReason,
} from '../schema/claim_peer_mesh_pings.js';
import type { PeerMeshSource } from '../schema/claim_peer_mesh_selections.js';
import { getMemberMobileCiphertext } from '../wa-opt-in/read.js';
import { answerWindowSql, isClaimInAnswerWindow } from './answer-window.js';
import { CORRECTION_SEND_LEASE_MS } from './correction-reminder-record.js';
import { peerMeshEligibleMemberSql } from './peer-mesh-read.js';
import { SUSPICION_NOTICE_SEND_CONFIG_DETAILS, SUSPICION_NOTICE_SMS_ERROR_CLASSES, suspicionNoticeDetail } from './suspicion-notice.js';

/** The sweep's page size cap. */
export const PEER_MESH_REQUEST_PAGE_CAP = 1000;
/** The child's per-claim due-ping read cap — ≤ 5 live pings by construction (0166), clamped all the same. */
export const PEER_MESH_REQUEST_CLAIM_PING_CAP = 10;
/** RB3 / RN3 — a ping still `attempting` this many IST days of UN-parked time after its begin is given up (`error`). */
export const PEER_MESH_REQUEST_RECLAIM_DAYS = 3;
/** The claiming transaction's wait on the claim-row lock (`SET LOCAL` — the suspicion begin's form). */
export const PEER_MESH_REQUEST_LOCK_TIMEOUT = '30s';
/** THE PARKED MARKER (`-302` RN2) — `claimed_by_job` of an `attempting` ping a HELD sweep parked. ⚠ LOCKSTEP with 0156's CHECK and 0166's trigger. */
export const PEER_MESH_REQUEST_PARKED_BY = 'sweep:held';
/** How many fresh link codes a begin tries on a `link_code` collision (12 base62 ⇒ a collision is ~never; ⛔ unbounded). */
export const PEER_MESH_LINK_CODE_ATTEMPTS = 5;

type Queryable = Pick<pg.Pool, 'query'> | Pick<pg.PoolClient, 'query'>;

const dialect = new PgDialect();

async function run<T extends pg.QueryResultRow>(q: Queryable, statement: SQL): Promise<T[]> {
  const { sql: text, params } = dialect.sqlToQuery(statement);
  const { rows } = await q.query<T>(text, params as unknown[]);
  return rows;
}

function toDate(v: Date | string): Date {
  return v instanceof Date ? v : new Date(v);
}

// ── The `detail` grammar (PM4 [c]) — ONE builder; ⛔ free text, ⛔ a raw gateway code, ⛔ a phone number ─────────────────

/** Why a re-claimed row's locked re-check failed (`-297` §2). ⚠ LOCKSTEP with 0166's grammar (a leg iterates this). */
export const PEER_MESH_REQUEST_RECHECK_REASONS = ['claim_decided', 'peer_ineligible'] as const;
export type PeerMeshRequestRecheckReason = (typeof PEER_MESH_REQUEST_RECHECK_REASONS)[number];
/** The child's transient faults BEFORE the send (the neighbour's number, the keyed hash — R6). ⚠ LOCKSTEP, as above. */
export const PEER_MESH_REQUEST_PRE_SEND_FAULTS = ['decrypt_failed:tier1', 'hash_failed:tier1'] as const;
/** The shared send core's fixed config details (BF8 — a fault AFTER the race guard). The SAME array as the suspicion notices'. */
export const PEER_MESH_REQUEST_SEND_CONFIG_DETAILS = SUSPICION_NOTICE_SEND_CONFIG_DETAILS;
/** The SMS gateway's failure classes — the SAME array as the suspicion notices' (pinned by a test). */
export const PEER_MESH_REQUEST_SMS_ERROR_CLASSES = SUSPICION_NOTICE_SMS_ERROR_CLASSES;

/** What a `detail` can say. `send` = the shared core's RAW `result.detail` — parsed and its gateway code sanitised. */
export type PeerMeshRequestDetailInput =
  | { readonly kind: 'no_target'; readonly reason: PeerMeshRequestReplaceableReason | PeerMeshRequestNameReason }
  | { readonly kind: 'superseded' }
  | { readonly kind: 'exhausted_three_days' }
  | { readonly kind: 'recheck'; readonly reason: PeerMeshRequestRecheckReason }
  | { readonly kind: 'pre_send'; readonly fault: (typeof PEER_MESH_REQUEST_PRE_SEND_FAULTS)[number] }
  | { readonly kind: 'send'; readonly detail: string };

/** ⭐ PM4 [c] — THE ONLY way a ping's `detail` / `first_detail` is built (0166 CHECKs the SAME grammar). */
export function peerMeshRequestDetail(d: PeerMeshRequestDetailInput): string {
  switch (d.kind) {
    case 'no_target':
      return `no_target:${d.reason}`;
    case 'superseded':
      return 'superseded:claim_decided';
    case 'exhausted_three_days':
      return 'exhausted:attempting_three_days';
    case 'recheck':
      return `exhausted:recheck_${d.reason}`;
    case 'pre_send':
      return d.fault;
    case 'send':
      // The suspicion notices' ONE parser of the core's raw detail (the SAME send-family grammar — ⛔ a second copy).
      return suspicionNoticeDetail({ kind: 'send', detail: d.detail });
  }
}

const DETAIL_PATTERN = new RegExp(PEER_MESH_REQUEST_DETAIL_PATTERN);

/** Does `detail` match the grammar (0166's CHECK — the SAME pattern)? */
export function isPeerMeshRequestDetail(detail: string): boolean {
  return DETAIL_PATTERN.test(detail);
}

/** ⛔ A writer stores a `detail` outside the grammar (0166 would refuse it too — this fails BEFORE the statement, ⛔ value echoed). */
function assertDetail(detail: string | null): void {
  if (detail !== null && !isPeerMeshRequestDetail(detail)) {
    throw new Error('[peer-mesh-request] a detail outside the fixed grammar — build it with peerMeshRequestDetail');
  }
}

// ── The link code (PM21 (a); BF25) ─────────────────────────────────────────────────────────────────────────────────────

const LINK_CODE_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const LINK_CODE_LENGTH = 12;
const LINK_CODE_PATTERN = new RegExp(PEER_MESH_LINK_CODE_PATTERN);

/**
 * A fresh link code — 12 base62 characters from the CSPRNG (`crypto.randomBytes`), modulo bias avoided by rejection
 * sampling (the telegram-opt-in precedent). ⛔ A credential (PM21 (a) — the by-link read also needs the member's session);
 * ⛔ ever logged. Asserts its own form (0156's CHECK, `APP_LINK_CODE_PATTERN` — pinned equal by a contracts test).
 */
export function generatePeerRequestLinkCode(): string {
  const limit = Math.floor(256 / LINK_CODE_ALPHABET.length) * LINK_CODE_ALPHABET.length;
  let code = '';
  while (code.length < LINK_CODE_LENGTH) {
    const bytes = randomBytes(LINK_CODE_LENGTH * 2);
    for (const b of bytes) {
      if (code.length >= LINK_CODE_LENGTH) break;
      if (b < limit) code += LINK_CODE_ALPHABET[b % LINK_CODE_ALPHABET.length];
    }
  }
  if (!LINK_CODE_PATTERN.test(code)) throw new Error('[peer-mesh-request] generated a link code outside its form');
  return code;
}

// ── R4 — the peer's eligibility: the ONE gate, then a LABEL ────────────────────────────────────────────────────────────

/** The gate's answer for one neighbour: eligible, or the FIRST matching reason (R4's order). */
export type PeerMeshRequestEligibility =
  | { readonly eligible: true }
  | { readonly eligible: false; readonly reason: PeerMeshRequestReplaceableReason };

/**
 * ⭐ R4 — the GATE is `peerMeshEligibleMemberSql`, EXACTLY as built (6.36a SW23 — ⛔ re-composed). Only when it fails, the SAME
 * row's labelling columns pick the FIRST matching reason: ⛔ `active` ⇒ `peer_not_active`; named as the deceased by any claim ⇒
 * `peer_reported_deceased`; ⛔ an identity row ⇒ `no_sendable_number`; the claimant of any claim / the filer of any intake attempt
 * for this death (`-340` call 2, `-341`) ⇒ `peer_filed_for_this_death`; none matched (or ⛔ member row) ⇒ `peer_not_eligible` (a
 * future conjunct of the gate ⛔ crashes the send — a test pins that the four labels cover today's predicate).
 */
export async function readPeerMeshRequestEligibility(
  db: Db,
  input: { readonly pariwarId: PariwarId; readonly memberId: MemberId; readonly deceasedMemberId: MemberId },
): Promise<PeerMeshRequestEligibility> {
  const { pariwarId, memberId, deceasedMemberId } = input;
  const m = sql`pr_m`;
  const { rows } = await db.execute<{
    eligible: boolean;
    not_active: boolean;
    reported_deceased: boolean;
    no_identity: boolean;
    filed: boolean;
  }>(sql`
    SELECT ${peerMeshEligibleMemberSql(m, { deceasedMemberId })} AS eligible,
           pr_m.state::text <> 'active' AS not_active,
           ${namedByClaimSql(sql`pr_m.pariwar_id`, sql`pr_m.member_id`)} AS reported_deceased,
           NOT EXISTS (SELECT 1 FROM member_identities pr_i WHERE pr_i.pariwar_id = pr_m.pariwar_id AND pr_i.member_id = pr_m.member_id)
             AS no_identity,
           (EXISTS (SELECT 1 FROM claims pr_c WHERE pr_c.pariwar_id = pr_m.pariwar_id AND pr_c.deceased_member_id = ${deceasedMemberId}
                       AND pr_c.claimant_actor_id = pr_m.member_id)
            OR EXISTS (SELECT 1 FROM intake_attempts pr_ia WHERE pr_ia.pariwar_id = pr_m.pariwar_id
                          AND pr_ia.deceased_member_id = ${deceasedMemberId} AND pr_ia.claimant_actor_id = pr_m.member_id)) AS filed
      FROM members pr_m
     WHERE pr_m.pariwar_id = ${pariwarId} AND pr_m.member_id = ${memberId}`);
  const r = rows[0];
  if (r?.eligible === true) return { eligible: true };
  if (!r) return { eligible: false, reason: 'peer_not_eligible' };
  if (r.not_active) return { eligible: false, reason: 'peer_not_active' };
  if (r.reported_deceased) return { eligible: false, reason: 'peer_reported_deceased' };
  if (r.no_identity) return { eligible: false, reason: 'no_sendable_number' };
  if (r.filed) return { eligible: false, reason: 'peer_filed_for_this_death' };
  return { eligible: false, reason: 'peer_not_eligible' };
}

// ── R2 — the replacement inserter ──────────────────────────────────────────────────────────────────────────────────────

/**
 * ⭐ R2 — insert ONE replacement for `replacesPingId` (already finished `no_target` with a peer reason IN THIS TRANSACTION — 0166's
 * trigger reads it): the first member of the selection's STORED ranking, in order, with ⛔ ping in this selection, who passes the
 * ONE predicate. Returns the new `ping_id`, or `null` when the ranking is NULL (`district_cohort_v1`) or ⛔ one is left. The new
 * ping carries the selection's `source` (0163's trigger). ⛔ `persistPeerMeshPingIntents` (it returns a count, ⛔ an id or a link).
 * The caller holds the claim lock (the ONE writer of a claim's pings at send time).
 */
export async function insertPeerMeshReplacementPing(
  db: Db,
  input: {
    readonly pariwarId: PariwarId;
    readonly selectionId: PeerMeshSelectionId;
    readonly replacesPingId: PeerMeshPingId;
    readonly deceasedMemberId: MemberId;
  },
): Promise<PeerMeshPingId | null> {
  const { pariwarId, selectionId, replacesPingId, deceasedMemberId } = input;
  const { rows } = await db.execute<{ member_id: string; source: PeerMeshSource | null }>(sql`
    SELECT pr_r.member_id, pr_s.source
      FROM claim_peer_mesh_selections pr_s
     CROSS JOIN LATERAL unnest(pr_s.ranked_member_ids) WITH ORDINALITY AS pr_r(member_id, ord)
      JOIN members pr_m ON pr_m.pariwar_id = pr_s.pariwar_id AND pr_m.member_id = pr_r.member_id
     WHERE pr_s.pariwar_id = ${pariwarId} AND pr_s.selection_id = ${selectionId}
       AND NOT EXISTS (SELECT 1 FROM claim_peer_mesh_pings pr_x WHERE pr_x.selection_id = pr_s.selection_id AND pr_x.member_id = pr_r.member_id)
       AND ${peerMeshEligibleMemberSql(sql`pr_m`, { deceasedMemberId })}
     ORDER BY pr_r.ord
     LIMIT 1`);
  const next = rows[0];
  if (!next) return null;
  const inserted = await db.execute<{ ping_id: string }>(sql`
    INSERT INTO claim_peer_mesh_pings (selection_id, pariwar_id, member_id, source, replaces_ping_id)
    VALUES (${selectionId}, ${pariwarId}, ${next.member_id}, ${next.source}, ${replacesPingId})
    RETURNING ping_id`);
  const pingId = inserted.rows[0]?.ping_id;
  if (pingId === undefined) throw new Error('[peer-mesh-request] the replacement insert returned no row');
  return pingId as PeerMeshPingId;
}

// ── The claiming transaction (R1) ──────────────────────────────────────────────────────────────────────────────────────

/** What the locked begin decided. ⛔ Nothing unsealed. */
export type BeginPeerMeshRequestResult =
  | { readonly kind: 'already_final' }
  | { readonly kind: 'held_by_other' }
  /** ① a FRESH ping of a claim out of the window — `skipped_superseded` (⛔ alarm, ⛔ replacement). */
  | { readonly kind: 'superseded'; readonly detail: string }
  /**
   * ② / ③ — finished `no_target`. `reclaimed` ⇒ a prior attempt was claimed and MAY have sent (the caller alarms, `-298`);
   * `replacementPingId` is the new ping (R2) or `null`.
   */
  | {
      readonly kind: 'no_target';
      readonly detail: string;
      readonly reclaimed: boolean;
      readonly attemptCount: number;
      readonly replacementPingId: PeerMeshPingId | null;
    }
  /** A RE-CLAIMED row whose window / peer re-check failed — `error` (`-297` §2; the caller alarms). */
  | { readonly kind: 'expired'; readonly detail: string }
  | {
      readonly kind: 'begun';
      readonly pingId: PeerMeshPingId;
      readonly recipientMemberId: MemberId;
      /** ⛔ AS STORED (the caller unseals it AFTER the commit). `null` ⇒ ⛔ identity row (R6). */
      readonly mobileCiphertext: string | null;
      readonly linkCode: string;
      readonly attemptCount: number;
    };

interface LockedPing {
  ping_id: string;
  selection_id: string;
  member_id: string;
  send_outcome: string | null;
  attempt_count: number;
  claimed_at: Date | string | null;
  claimed_by_job: string | null;
  link_code: string | null;
}

/** Lock the claim row (`lock_timeout`), then the ping row — the ping must belong to the claim's selection. */
async function lockClaimThenPing(
  client: pg.PoolClient,
  input: { readonly pariwarId: PariwarId; readonly claimCaseId: ClaimId; readonly pingId: PeerMeshPingId },
): Promise<{ claim: { currentState: string; deceasedMemberId: MemberId }; ping: LockedPing }> {
  const { pariwarId, claimCaseId, pingId } = input;
  await client.query(`SET LOCAL lock_timeout = '${PEER_MESH_REQUEST_LOCK_TIMEOUT}'`);
  const locked = await client.query<{ current_state: string; deceased_member_id: string }>(
    `SELECT current_state::text AS current_state, deceased_member_id FROM claims
      WHERE pariwar_id = $1 AND claim_case_id = $2 FOR UPDATE`,
    [pariwarId, claimCaseId],
  );
  const claimRow = locked.rows[0];
  // The child read this claim moments ago under this same Pariwar; claims are ⛔ never deleted — a data fault.
  if (!claimRow) throw new Error(`[peer-mesh-request] claim ${claimCaseId} is missing under Pariwar ${pariwarId}`);
  const pingRow = (
    await client.query<LockedPing>(
      `SELECT p.ping_id, p.selection_id, p.member_id, p.send_outcome, p.attempt_count, p.claimed_at, p.claimed_by_job, p.link_code
         FROM claim_peer_mesh_pings p
         JOIN claim_peer_mesh_selections s ON s.pariwar_id = p.pariwar_id AND s.selection_id = p.selection_id
        WHERE p.pariwar_id = $1 AND p.ping_id = $2 AND s.claim_case_id = $3
        FOR UPDATE OF p`,
      [pariwarId, pingId, claimCaseId],
    )
  ).rows[0];
  if (!pingRow) throw new Error(`[peer-mesh-request] ping ${pingId} is not a ping of claim ${claimCaseId}`);
  return { claim: { currentState: claimRow.current_state, deceasedMemberId: claimRow.deceased_member_id as MemberId }, ping: pingRow };
}

/** The CAS from NULL — a FRESH skip writes its outcome with `attempt_count = 1` (0151's precedent). Returns whether it took. */
async function skipFresh(client: pg.PoolClient, pingId: string, outcome: 'skipped_superseded' | 'no_target', detail: string, jobId: string, now: Date): Promise<boolean> {
  assertDetail(detail);
  const r = await client.query(
    `UPDATE claim_peer_mesh_pings
        SET send_outcome = $2, attempt_count = 1, detail = $3, claimed_at = $4, claimed_by_job = $5, send_updated_at = clock_timestamp()
      WHERE ping_id = $1 AND send_outcome IS NULL`,
    [pingId, outcome, detail, now, jobId],
  );
  return (r.rowCount ?? 0) > 0;
}

/** Finish a held `attempting` row (this job holds the ping lock). Returns whether it took. */
async function finishAttempting(client: pg.PoolClient, pingId: string, outcome: 'error' | 'no_target', detail: string, jobId: string, now: Date): Promise<boolean> {
  assertDetail(detail);
  const r = await client.query(
    `UPDATE claim_peer_mesh_pings
        SET send_outcome = $2, first_detail = COALESCE(first_detail, detail), detail = $3, claimed_by_job = $4, claimed_at = $5,
            send_updated_at = clock_timestamp()
      WHERE ping_id = $1 AND send_outcome = 'attempting'`,
    [pingId, outcome, detail, jobId, now],
  );
  return (r.rowCount ?? 0) > 0;
}

/** Is a pg error a unique violation of `constraint`? */
function isUniqueViolation(err: unknown, constraint: string): boolean {
  const e = err as { code?: string; constraint?: string };
  return e.code === '23505' && e.constraint === constraint;
}

/**
 * ⭐ THE CLAIMING TRANSACTION (R1) — on the ONE client of the caller's scope transaction: lock the claim row, then the ping row,
 * re-check under them, and skip / finish / begin the ping. ⛔ Nothing unsealed here — the caller COMMITS, then reads the number
 * and sends. `nameFault` is the CLAIM-WIDE name fault the caller found BEFORE this transaction (R9), or `null`.
 * ⛔ Never catch a DB error inside this transaction — EXCEPT the link-code collision, retried inside a SAVEPOINT
 * ([[project_domain_limit_clamp_and_savepoint_retry]]).
 */
export async function beginPeerMeshRequest(
  client: pg.PoolClient,
  input: {
    readonly pariwarId: PariwarId;
    readonly claimCaseId: ClaimId;
    readonly pingId: PeerMeshPingId;
    readonly jobId: string;
    readonly now: Date;
    readonly nameFault: PeerMeshRequestNameReason | null;
  },
): Promise<BeginPeerMeshRequestResult> {
  const db = bindScopedDb(client);
  const { pariwarId, jobId, now, nameFault } = input;
  const claimCaseId = String(input.claimCaseId).toLowerCase() as ClaimId;
  const pingId = String(input.pingId).toLowerCase() as PeerMeshPingId;
  const { claim, ping } = await lockClaimThenPing(client, { pariwarId, claimCaseId, pingId });

  if (ping.send_outcome !== null && ping.send_outcome !== 'attempting') return { kind: 'already_final' };
  const existing = ping.send_outcome === 'attempting';
  if (existing) {
    const ownRetry = ping.claimed_by_job === jobId;
    const parked = ping.claimed_by_job === PEER_MESH_REQUEST_PARKED_BY;
    const leaseExpired = ping.claimed_at !== null && toDate(ping.claimed_at).getTime() < now.getTime() - CORRECTION_SEND_LEASE_MS;
    if (!ownRetry && !parked && !leaseExpired) return { kind: 'held_by_other' };
  }

  // ① the answer window — PM8's ONE predicate, on the LOCKED state.
  const inWindow = await isClaimInAnswerWindow(db, pariwarId, claimCaseId, claim.currentState);
  if (!inWindow) {
    if (!existing) {
      const detail = peerMeshRequestDetail({ kind: 'superseded' });
      return (await skipFresh(client, ping.ping_id, 'skipped_superseded', detail, jobId, now)) ? { kind: 'superseded', detail } : { kind: 'already_final' };
    }
    const detail = peerMeshRequestDetail({ kind: 'recheck', reason: 'claim_decided' });
    return (await finishAttempting(client, ping.ping_id, 'error', detail, jobId, now)) ? { kind: 'expired', detail } : { kind: 'already_final' };
  }

  // ② the claim-wide name fault — keeps its true reason on a re-claim too (`-298` A); ⛔ replaced (R3).
  if (nameFault !== null) {
    const detail = peerMeshRequestDetail({ kind: 'no_target', reason: nameFault });
    const took = existing
      ? await finishAttempting(client, ping.ping_id, 'no_target', detail, jobId, now)
      : await skipFresh(client, ping.ping_id, 'no_target', detail, jobId, now);
    if (!took) return { kind: 'already_final' };
    return { kind: 'no_target', detail, reclaimed: existing, attemptCount: existing ? ping.attempt_count : 1, replacementPingId: null };
  }

  // ③ the peer — the ONE predicate, then a label (R4).
  const eligibility = await readPeerMeshRequestEligibility(db, {
    pariwarId,
    memberId: ping.member_id as MemberId,
    deceasedMemberId: claim.deceasedMemberId,
  });
  if (!eligibility.eligible) {
    if (existing) {
      const detail = peerMeshRequestDetail({ kind: 'recheck', reason: 'peer_ineligible' });
      return (await finishAttempting(client, ping.ping_id, 'error', detail, jobId, now)) ? { kind: 'expired', detail } : { kind: 'already_final' };
    }
    const detail = peerMeshRequestDetail({ kind: 'no_target', reason: eligibility.reason });
    if (!(await skipFresh(client, ping.ping_id, 'no_target', detail, jobId, now))) return { kind: 'already_final' };
    // R2 — the skip FIRST, then the INSERT (0166's trigger reads the skipped row).
    const replacementPingId = await insertPeerMeshReplacementPing(db, {
      pariwarId,
      selectionId: ping.selection_id as PeerMeshSelectionId,
      replacesPingId: ping.ping_id as PeerMeshPingId,
      deceasedMemberId: claim.deceasedMemberId,
    });
    return { kind: 'no_target', detail, reclaimed: false, attemptCount: 1, replacementPingId };
  }

  // ④ begin — or re-claim (own retry at once; a parked row; another job's past the lease).
  let attemptCount: number;
  let linkCode: string;
  if (existing) {
    const reclaimed = (
      await client.query<{ attempt_count: number; link_code: string }>(
        `UPDATE claim_peer_mesh_pings
            SET claimed_at = $2, claimed_by_job = $3, attempt_count = attempt_count + 1,
                -- decision -302 RN3: a PARKED row is credited ONLY the time it sat parked (SET reads the OLD holder / parked_at);
                -- never backward (0156 / 0166's trigger), so a clock-skewed negative span credits nothing.
                aging_since = CASE WHEN claimed_by_job = $4
                                   THEN aging_since + GREATEST($2::timestamptz - parked_at, interval '0')
                                   ELSE aging_since END,
                parked_at = NULL,
                first_detail = COALESCE(first_detail, detail)
          WHERE ping_id = $1 AND send_outcome = 'attempting'
          RETURNING attempt_count, link_code`,
        [ping.ping_id, now, jobId, PEER_MESH_REQUEST_PARKED_BY],
      )
    ).rows[0];
    if (!reclaimed) return { kind: 'already_final' };
    attemptCount = reclaimed.attempt_count;
    linkCode = reclaimed.link_code;
  } else {
    const begun = await beginFresh(client, ping.ping_id, jobId, now);
    if (begun === null) return { kind: 'already_final' };
    attemptCount = 1;
    linkCode = begun;
  }
  const mobileCiphertext = await getMemberMobileCiphertext(db, { pariwarId, memberId: ping.member_id as MemberId });
  return {
    kind: 'begun',
    pingId: ping.ping_id as PeerMeshPingId,
    recipientMemberId: ping.member_id as MemberId,
    mobileCiphertext,
    linkCode,
    attemptCount,
  };
}

/** The CAS from NULL into `attempting`, writing the link code ONCE — a `link_code` collision retried with a new code. */
async function beginFresh(client: pg.PoolClient, pingId: string, jobId: string, now: Date): Promise<string | null> {
  for (let i = 0; i < PEER_MESH_LINK_CODE_ATTEMPTS; i += 1) {
    const code = generatePeerRequestLinkCode();
    await client.query('SAVEPOINT peer_mesh_link_code');
    try {
      const r = await client.query(
        `UPDATE claim_peer_mesh_pings
            SET send_outcome = 'attempting', attempt_count = 1, claimed_at = $2, claimed_by_job = $3, aging_since = clock_timestamp(),
                locale_source = 'pariwar_default', link_code = $4
          WHERE ping_id = $1 AND send_outcome IS NULL`,
        [pingId, now, jobId, code],
      );
      await client.query('RELEASE SAVEPOINT peer_mesh_link_code');
      return (r.rowCount ?? 0) > 0 ? code : null;
    } catch (err) {
      await client.query('ROLLBACK TO SAVEPOINT peer_mesh_link_code');
      if (!isUniqueViolation(err, 'claim_peer_mesh_pings_link_code_uq')) throw err;
    }
  }
  throw new Error(`[peer-mesh-request] ${String(PEER_MESH_LINK_CODE_ATTEMPTS)} link-code collisions in a row`);
}

// ── The compare-and-set, the transient note, R6 ────────────────────────────────────────────────────────────────────────

/**
 * ⭐ THE COMPARE-AND-SET: `attempting` → final, only from `attempting` and only by the job holding the row. A provider-accepted
 * send writes EXACTLY `accepted`, `provider_message_id`, `recipient_number_hash` and `send_updated_at = clock_timestamp()` (AC2c —
 * the member list's "asked on"; `-329` decision 4: ⛔ a new "sent" value). Returns `false` when the row moved on.
 */
export async function finalisePeerMeshRequest(
  db: Db,
  input: {
    readonly pariwarId: PariwarId;
    readonly pingId: PeerMeshPingId;
    readonly jobId: string;
    readonly outcome: 'accepted' | 'rejected_invalid_number' | 'rejected_unreachable' | 'error';
    readonly providerMessageId?: string | null;
    /** ⭐ Built by `peerMeshRequestDetail` — asserted here, BEFORE the statement. */
    readonly detail?: string | null;
    readonly recipientNumberHash?: string | null;
  },
): Promise<boolean> {
  assertDetail(input.detail ?? null);
  const result = await db.execute<{ ping_id: string }>(sql`
    UPDATE claim_peer_mesh_pings
       SET send_outcome = ${input.outcome},
           provider_message_id = ${input.providerMessageId ?? null},
           detail = ${input.detail ?? null},
           recipient_number_hash = ${input.recipientNumberHash ?? null},
           send_updated_at = clock_timestamp()
     WHERE pariwar_id = ${input.pariwarId}
       AND ping_id = ${input.pingId}::uuid
       AND send_outcome = 'attempting'
       AND claimed_by_job = ${input.jobId}
    RETURNING ping_id
  `);
  return (result.rows?.length ?? 0) > 0;
}

/**
 * A TRANSIENT failure: keep the row `attempting` (the retry re-claims it at once) and record the classified detail (`detail` +
 * `send_updated_at` only — the re-claim moves it to `first_detail`). Returns `false` when the row moved on.
 */
export async function notePeerMeshRequestTransient(
  db: Db,
  input: { readonly pariwarId: PariwarId; readonly pingId: PeerMeshPingId; readonly jobId: string; readonly detail: string },
): Promise<boolean> {
  assertDetail(input.detail);
  const result = await db.execute<{ ping_id: string }>(sql`
    UPDATE claim_peer_mesh_pings
       SET detail = ${input.detail}, send_updated_at = clock_timestamp()
     WHERE pariwar_id = ${input.pariwarId}
       AND ping_id = ${input.pingId}::uuid
       AND send_outcome = 'attempting'
       AND claimed_by_job = ${input.jobId}
     RETURNING ping_id
  `);
  return (result.rows?.length ?? 0) > 0;
}

/** What R6's second transaction did. */
export interface PeerMeshNoSendableNumberResult {
  /** `false` ⇒ the row moved on before this finalise (the give-up, or a job that re-claimed it). */
  readonly moved: boolean;
  /** The attempt the row was finished on (`> 1` ⇒ the caller alarms "may have sent", `-298`). */
  readonly attemptCount: number;
  /** The replacement (R2), or `null` — ⛔ one left, a NULL ranking, a re-claimed row (R5), or the claim left the window (P11). */
  readonly replacementPingId: PeerMeshPingId | null;
}

/**
 * ⭐ R6 — the neighbour's number is UNUSABLE (⛔ ciphertext / ⛔ identity row, the erased sentinel, or ⛔ a valid Indian mobile —
 * found AFTER the begin's commit): a SECOND transaction takes claim → ping again, finishes this job's `attempting` row
 * `no_target:no_sendable_number` (the CAS) and — ONLY at `attempt_count = 1` (R5, `-343`; read from the LOCKED row, ⛔ the
 * caller's copy) — inserts the replacement (R2). ⛔ An unsealing or hashing THROW is never this (a transient — the caller's).
 */
export async function finalisePeerMeshNoSendableNumber(
  client: pg.PoolClient,
  input: { readonly pariwarId: PariwarId; readonly claimCaseId: ClaimId; readonly pingId: PeerMeshPingId; readonly jobId: string },
): Promise<PeerMeshNoSendableNumberResult> {
  const db = bindScopedDb(client);
  const { pariwarId, jobId } = input;
  const claimCaseId = String(input.claimCaseId).toLowerCase() as ClaimId;
  const pingId = String(input.pingId).toLowerCase() as PeerMeshPingId;
  const { claim, ping } = await lockClaimThenPing(client, { pariwarId, claimCaseId, pingId });
  if (ping.send_outcome !== 'attempting' || ping.claimed_by_job !== jobId) {
    return { moved: false, attemptCount: ping.attempt_count, replacementPingId: null };
  }
  const detail = peerMeshRequestDetail({ kind: 'no_target', reason: 'no_sendable_number' });
  assertDetail(detail);
  const r = await client.query(
    `UPDATE claim_peer_mesh_pings SET send_outcome = 'no_target', detail = $2, send_updated_at = clock_timestamp()
      WHERE ping_id = $1 AND send_outcome = 'attempting' AND claimed_by_job = $3`,
    [ping.ping_id, detail, jobId],
  );
  if ((r.rowCount ?? 0) === 0) return { moved: false, attemptCount: ping.attempt_count, replacementPingId: null };
  if (ping.attempt_count !== 1) return { moved: true, attemptCount: ping.attempt_count, replacementPingId: null };
  // 6.27c review round 2 P11 — the claim may have been DECIDED since the begin's commit: ⛔ a replacement it could never text
  // (the window is re-judged on the LOCKED state, PM8's ONE predicate). The row keeps its true reason.
  if (!(await isClaimInAnswerWindow(db, pariwarId, claimCaseId, claim.currentState))) {
    return { moved: true, attemptCount: 1, replacementPingId: null };
  }
  const replacementPingId = await insertPeerMeshReplacementPing(db, {
    pariwarId,
    selectionId: ping.selection_id as PeerMeshSelectionId,
    replacesPingId: ping.ping_id as PeerMeshPingId,
    deceasedMemberId: claim.deceasedMemberId,
  });
  return { moved: true, attemptCount: 1, replacementPingId };
}

// ── The child's reads ──────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The claim's DUE pings — ⛔ begun, or `attempting` (a crash left it; the begin judges its lease) — in `ping_id` order. Clamped
 * (`PEER_MESH_REQUEST_CLAIM_PING_CAP`). ⛔ A window filter here: the begin judges the window under the lock (R1 ①).
 */
export async function listDuePeerMeshRequestPings(
  db: Db,
  input: { readonly pariwarId: PariwarId; readonly claimCaseId: ClaimId; readonly limit?: number },
): Promise<PeerMeshPingId[]> {
  const n = clampLimit(input.limit, { default: PEER_MESH_REQUEST_CLAIM_PING_CAP, cap: PEER_MESH_REQUEST_CLAIM_PING_CAP });
  const { rows } = await db.execute<{ ping_id: string }>(sql`
    SELECT pr_p.ping_id
      FROM claim_peer_mesh_pings pr_p
      JOIN claim_peer_mesh_selections pr_s ON pr_s.pariwar_id = pr_p.pariwar_id AND pr_s.selection_id = pr_p.selection_id
     WHERE pr_p.pariwar_id = ${input.pariwarId} AND pr_s.claim_case_id = ${input.claimCaseId}
       AND (pr_p.send_outcome IS NULL OR pr_p.send_outcome = 'attempting')
     ORDER BY pr_p.ping_id
     LIMIT ${n}`);
  return rows.map((r) => r.ping_id as PeerMeshPingId);
}

/** The language a text is sent in, and WHY (PM22 — `locale_source`). */
export interface PeerRequestLocale {
  readonly locale: 'hi' | 'en';
  readonly source: 'pariwar_default';
}

/**
 * The Pariwar has ⛔ default language (⛔ passport row — `claims.pariwar_id` carries ⛔ FK to it): a DATA fault that a retry ⛔ fixes —
 * the jobs child HOLDS on it (`config:locale_unavailable`), unlike a failed read (a transient — 6.27c review round 2 P7).
 */
export class PeerRequestLocaleMissingError extends Error {
  constructor(pariwarId: PariwarId) {
    super(`[peer-mesh-request] Pariwar ${pariwarId} has no default language`);
    this.name = 'PeerRequestLocaleMissingError';
  }
}

/**
 * ⭐ R10 / PM22 — THE ONE read row 6-35 will change (to *"the member's choice, else the Pariwar's default"*): today the Pariwar's
 * default language (`pariwar_passport.locale_default`, NOT NULL), recorded on begin as `locale_source = 'pariwar_default'`.
 * @throws PeerRequestLocaleMissingError  the Pariwar has ⛔ passport — a data gap (the jobs child HOLDS); any other throw is a
 *   failed read (the jobs child retries)
 */
export async function resolvePeerRequestLocale(db: Db, pariwarId: PariwarId): Promise<PeerRequestLocale> {
  const { rows } = await db.execute<{ locale_default: string }>(sql`
    SELECT locale_default::text AS locale_default FROM pariwar_passport WHERE pariwar_id = ${pariwarId} LIMIT 1`);
  const locale = rows[0]?.locale_default;
  if (locale !== 'hi' && locale !== 'en') throw new PeerRequestLocaleMissingError(pariwarId);
  return { locale, source: 'pariwar_default' };
}

/**
 * ⭐ R14 — the by-link answer: the ping whose `link_code` is `code` iff the code has the link form AND the ping is `memberId`'s own
 * in `pariwarId` AND it was TEXTED (`send_outcome = 'accepted'`) — submitted or closed included (the detail read then answers
 * 409). Everything else ⇒ `null` (the route's ONE 404). ⛔ The code is never logged or echoed.
 * @throws PeerRequestByLinkReadError  the read failed — a SANITISED error (the SQLSTATE only; 6.27c review F1)
 */
export async function resolvePeerRequestByLinkCode(
  db: Db,
  input: { readonly pariwarId: PariwarId; readonly memberId: MemberId; readonly code: string },
): Promise<PeerMeshPingId | null> {
  if (!LINK_CODE_PATTERN.test(input.code)) return null;
  let rows: { ping_id: string }[];
  try {
    ({ rows } = await db.execute<{ ping_id: string }>(sql`
      SELECT ping_id FROM claim_peer_mesh_pings
       WHERE pariwar_id = ${input.pariwarId} AND member_id = ${input.memberId} AND link_code = ${input.code} AND send_outcome = 'accepted'
       LIMIT 1`));
  } catch (err) {
    // ⚠ Drizzle's wrapper carries the statement's PARAMETERS (the code) in its message, and its `cause` is the driver's error —
    // both reach a logger's `err` serializer. ⛔ Rethrown: a fresh error with the SQLSTATE only, ⛔ `cause`.
    throw new PeerRequestByLinkReadError(peerMeshSqlStateOf(err));
  }
  const r = rows[0];
  return r ? (r.ping_id as PeerMeshPingId) : null;
}

/** The by-link read failed. Its message, its fields and its stack carry ⛔ the code — the SQLSTATE only (PM21 (e); R13). */
export class PeerRequestByLinkReadError extends Error {
  public readonly name = 'PeerRequestByLinkReadError';
  public constructor(public readonly sqlState: string | null) {
    super(`[peer-mesh-request] the by-link read failed (sqlstate ${sqlState ?? 'none'})`);
  }
}

/** A pg error's five-character SQLSTATE — on the error itself or on Drizzle's `cause` — or `null` (⛔ a message is read). */
/** The SQLSTATE of a failed query — on the error itself or on Drizzle's wrapper's `cause` — or `null` (ids-free; ⛔ the message). */
export function peerMeshSqlStateOf(err: unknown): string | null {
  for (const e of [err, (err as { cause?: unknown } | null)?.cause]) {
    const code = (e as { code?: unknown } | null)?.code;
    if (typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code)) return code;
  }
  return null;
}

// ── The sweep's reads and writes (RN2 / RN3; R16) — cross-tenant, BYPASSRLS pool ──────────────────────────────────────

/** One due claim. */
export interface DuePeerMeshRequestClaim {
  readonly pariwarId: PariwarId;
  readonly claimCaseId: ClaimId;
}

export interface DuePeerMeshRequestPage {
  readonly due: readonly DuePeerMeshRequestClaim[];
  /** The page's last claim id — the next page's cursor (`null` ⇒ an empty page). */
  readonly lastClaimCaseId: ClaimId | null;
  readonly scanned: number;
}

/**
 * ⭐ R16 — the claims due a send, one keyset page on `claim_case_id`: ≥ 1 ping ⛔ begun whose claim is in the answer window
 * (`answerWindowSql` — PM8's set-based twin, ⛔ hand-composed), OR ≥ 1 ping `attempting` past the send lease (a crash left it; the
 * sweep holds its Pariwar first). ⚠ RECORDED: an unsent ping of a claim that LEFT the window before any child reached it stays
 * NULL — the console's `'not_sent'`, which is true; ⛔ drained.
 *
 * ── DELIBERATE: a CROSS-TENANT READ on the BYPASSRLS pool (family 9) ──
 * The sweep has ⛔ tenant to start from (the suspicion selectors' reasoning). It RETURNS ids only (`pariwar_id`, `claim_case_id`)
 * — ⛔ PII, ⛔ value from one tenant reaches another; every write that follows runs in the child's own `withPariwarScope`
 * transaction, under RLS, after a locked re-check. `allow` (tests) narrows it. RE-EXAMINE when: the result ever carries more than
 * ids, the read projects PII, a write is added on this pool, the pool loses BYPASSRLS, or a per-tenant scheduler exists.
 */
export async function listDuePeerMeshRequestClaims(
  q: Queryable,
  input: { readonly now: Date; readonly after: string | null; readonly limit?: number; readonly allow: readonly string[] | null },
): Promise<DuePeerMeshRequestPage> {
  const n = clampLimit(input.limit, { default: PEER_MESH_REQUEST_PAGE_CAP, cap: PEER_MESH_REQUEST_PAGE_CAP });
  const lease = new Date(input.now.getTime() - CORRECTION_SEND_LEASE_MS);
  const after = input.after === null ? sql`` : sql` AND pr_c.claim_case_id > ${input.after}::uuid`;
  // ⚠ `sql.param` — a bare array in a Drizzle template is EXPANDED into one parameter per element.
  const allow = input.allow === null ? sql`` : sql` AND pr_c.pariwar_id = ANY(${sql.param([...input.allow])}::uuid[])`;
  const rows = await run<{ pariwar_id: string; claim_case_id: string }>(
    q,
    sql`
      SELECT pr_c.pariwar_id, pr_c.claim_case_id
        FROM claims pr_c
       WHERE EXISTS (
               SELECT 1 FROM claim_peer_mesh_selections pr_s
                 JOIN claim_peer_mesh_pings pr_p ON pr_p.pariwar_id = pr_s.pariwar_id AND pr_p.selection_id = pr_s.selection_id
                WHERE pr_s.pariwar_id = pr_c.pariwar_id AND pr_s.claim_case_id = pr_c.claim_case_id
                  AND ((pr_p.send_outcome IS NULL AND ${answerWindowSql('pr_c')})
                       OR (pr_p.send_outcome = 'attempting' AND pr_p.claimed_at < ${lease})))${after}${allow}
       ORDER BY pr_c.claim_case_id
       LIMIT ${sql.raw(String(n))}`,
  );
  const last = rows[rows.length - 1];
  return {
    due: rows.map((r) => ({ pariwarId: r.pariwar_id as PariwarId, claimCaseId: r.claim_case_id as ClaimId })),
    lastClaimCaseId: last ? (last.claim_case_id as ClaimId) : null,
    scanned: rows.length,
  };
}

/** RN3 — rows whose (credited) `aging_since` is before this instant and still `attempting` are given up: 00:00 IST of (today − 2). */
export function peerMeshRequestReclaimCutoff(now: Date): Date {
  return istMidnightAt(addCalendarDays(istDateOf(now), -(PEER_MESH_REQUEST_RECLAIM_DAYS - 1)));
}

/**
 * ⭐ RN2 — THE STALLED SCOPES: the distinct Pariwars of every `attempting` ping past the send lease (the unit a config gap HOLDS —
 * every gap here is per Pariwar or global), so the sweep decides which are HELD before it parks or gives up anything.
 *
 * ── DELIBERATE: a CROSS-TENANT READ on the BYPASSRLS pool (family 9) ── the suspicion twin's reasoning: ids only (a Pariwar id),
 * `allow` (tests) narrows it. RE-EXAMINE when: the result carries more than ids, the pool loses BYPASSRLS, or a per-tenant
 * scheduler exists.
 */
export async function listStalledPeerMeshRequestScopes(
  q: Queryable,
  input: { readonly now: Date; readonly allow: readonly string[] | null },
): Promise<PariwarId[]> {
  const { rows } = await q.query<{ pariwar_id: string }>(
    `SELECT DISTINCT pariwar_id FROM claim_peer_mesh_pings
      WHERE send_outcome = 'attempting' AND claimed_at < $1
        AND ($2::uuid[] IS NULL OR pariwar_id = ANY($2::uuid[]))
      ORDER BY pariwar_id`,
    [new Date(input.now.getTime() - CORRECTION_SEND_LEASE_MS), input.allow === null ? null : [...input.allow]],
  );
  return rows.map((r) => r.pariwar_id as PariwarId);
}

/**
 * ⭐ RN2 — THE HOLD PARK: every `attempting` ping of a HELD Pariwar past the send lease, ⛔ already parked, is marked
 * `claimed_by_job` = `PEER_MESH_REQUEST_PARKED_BY` with `parked_at` = the run's instant. ⛔ `detail`, ⛔ `claimed_at` touched; a ping
 * already parked keeps its `parked_at` (its credit). Returns the pings parked (+ their claims), for the caller's ONE alarm (ids).
 *
 * ── DELIBERATE: a CROSS-TENANT WRITE on the BYPASSRLS pool (family 9) ── `parkHeldSuspicionNotices`' twin: its predicate and its
 * effect (one marker value, the run's instant) read and write ⛔ nothing tenant-derived; a child re-claiming the row concurrently
 * holds the ping lock, so this UPDATE waits and re-evaluates (`claimed_at` inside the lease ⇒ ⛔ parked). RE-EXAMINE when: the
 * statement writes a value derived from another row or tenant, the pool loses BYPASSRLS, or a per-tenant scheduler exists.
 */
export async function parkHeldPeerMeshRequests(
  q: Queryable,
  input: { readonly now: Date; readonly allow: readonly string[] | null; readonly held: readonly string[] },
): Promise<{ readonly pingId: PeerMeshPingId; readonly claimCaseId: ClaimId }[]> {
  if (input.held.length === 0) return [];
  const { rows } = await q.query<{ ping_id: string; claim_case_id: string }>(
    `UPDATE claim_peer_mesh_pings p
        SET claimed_by_job = $3, parked_at = $4::timestamptz
       FROM claim_peer_mesh_selections s
      WHERE s.pariwar_id = p.pariwar_id AND s.selection_id = p.selection_id
        AND p.send_outcome = 'attempting' AND p.claimed_at < $1 AND p.claimed_by_job <> $3
        AND ($2::uuid[] IS NULL OR p.pariwar_id = ANY($2::uuid[]))
        AND p.pariwar_id = ANY($5::uuid[])
      RETURNING p.ping_id, s.claim_case_id`,
    [
      new Date(input.now.getTime() - CORRECTION_SEND_LEASE_MS),
      input.allow === null ? null : [...input.allow],
      PEER_MESH_REQUEST_PARKED_BY,
      input.now,
      input.held.map((x) => String(x).toLowerCase()),
    ],
  );
  return rows.map((r) => ({ pingId: r.ping_id as PeerMeshPingId, claimCaseId: r.claim_case_id as ClaimId }));
}

/**
 * ⭐ RN3 — THE EXHAUSTED-PING FINALISER, over the UN-HELD Pariwars ONLY (the caller passes them): every ping still `attempting`
 * whose anchor is before `cutoff` — `aging_since`, or for a PARKED ping `aging_since + (now − parked_at)` — and whose LAST claim is
 * older than the send lease becomes `error` / `exhausted:attempting_three_days` (the transient detail kept in `first_detail`).
 * Returns the pings finalised (+ their claims), for the caller's alarm (ids only).
 *
 * ── DELIBERATE: a CROSS-TENANT WRITE on the BYPASSRLS pool (family 9) ── `expireExhaustedSuspicionNotices`' twin: a time bound
 * over every tenant's rows; predicate and effect read and write ⛔ nothing tenant-derived; the lease guard leaves a ping claimed
 * within the lease to its live child. A child still in `beginPeerMeshRequest` holds the ping lock, so this UPDATE waits and
 * re-evaluates. RE-EXAMINE when: the statement writes a value derived from another row or tenant, the pool loses BYPASSRLS, a
 * per-tenant scheduler exists, or `CORRECTION_SEND_LEASE_MS` moves.
 */
export async function expireExhaustedPeerMeshRequests(
  q: Queryable,
  input: { readonly cutoff: Date; readonly now: Date; readonly allow: readonly string[] | null; readonly scopes: readonly string[] },
): Promise<{ readonly pingId: PeerMeshPingId; readonly claimCaseId: ClaimId }[]> {
  if (input.scopes.length === 0) return [];
  const detail = peerMeshRequestDetail({ kind: 'exhausted_three_days' });
  assertDetail(detail);
  const { rows } = await q.query<{ ping_id: string; claim_case_id: string }>(
    `UPDATE claim_peer_mesh_pings p
        SET send_outcome = 'error', first_detail = COALESCE(p.first_detail, p.detail), detail = $5, send_updated_at = clock_timestamp()
       FROM claim_peer_mesh_selections s
      WHERE s.pariwar_id = p.pariwar_id AND s.selection_id = p.selection_id
        AND p.send_outcome = 'attempting' AND p.claimed_at < $3
        AND (CASE WHEN p.claimed_by_job = $6
                  THEN p.aging_since + GREATEST($4::timestamptz - p.parked_at, interval '0')
                  ELSE p.aging_since END) < $1
        AND ($2::uuid[] IS NULL OR p.pariwar_id = ANY($2::uuid[]))
        AND p.pariwar_id = ANY($7::uuid[])
      RETURNING p.ping_id, s.claim_case_id`,
    [
      input.cutoff,
      input.allow === null ? null : [...input.allow],
      new Date(input.now.getTime() - CORRECTION_SEND_LEASE_MS),
      input.now,
      detail,
      PEER_MESH_REQUEST_PARKED_BY,
      input.scopes.map((x) => String(x).toLowerCase()),
    ],
  );
  return rows.map((r) => ({ pingId: r.ping_id as PeerMeshPingId, claimCaseId: r.claim_case_id as ClaimId }));
}
