// THE NEIGHBOURS' WHATSAPP REMINDER — the domain half (Story 6.31, Task 4; AC2, AC3, AC7; WR1, WR2, WR4, WR5, WR10; I1, I3–I5, I8;
// `2026-10-10-303` Q1 A, `2026-10-10-305` §2 item 4, `2026-10-10-311` PM7 (g) / Trap 17; `2026-10-19-365`). ONE WhatsApp reminder
// per ping (per text sent), 48–72 hours after the text was ACCEPTED, to a neighbour who has ⛔ submitted, while the claim can still
// take an answer, where the Pariwar has WhatsApp ON and the neighbour said yes to WhatsApp. Its OWN record
// (`claim_peer_mesh_wa_reminders`, 0171) — ⛔ a ping column. Transport-free; ⛔ nothing here unseals a ciphertext (the jobs child
// does, AFTER the claiming commit — T15). ⛔ Event, ⛔ claim state, ⛔ ping column written (I8).
//
// ⭐ THE BEGIN — under the claim lock, then the ping lock, then the reminder row (T10 — the order every reply / approval writer
// uses; the reminder's FK takes a KEY SHARE on the ping, so the INSERT comes AFTER the ping lock):
//   · a FINISHED reminder ⇒ `already_final` (⛔ write); an `attempting` one with the in-flight marker set ⇒ `in_flight` (⛔ write,
//     ⛔ re-check — the lapsed-row finisher owns it); one held by another live job ⇒ `held_by_other`;
//   · the Pariwar's WhatsApp switch, re-read under the lock — OFF ⇒ `switch_off`, ⛔ write (an existing row is left to the late
//     marking);
//   · `clock_timestamp() < send_updated_at + 72 h` (WR5) — else `skipped_late` (a child deferred by quiet hours or a retry can
//     start late); before `+ 48 h` ⇒ `not_due`, ⛔ write (the sweep listed it on its own clock);
//   · the window (`isClaimInAnswerWindow`), "has ⛔ submitted" (`peerMeshReplyState !== 'submitted'` — WR2 (iii) (b)), the ONE
//     opt-in read (`isPeerMeshWaReminderOptedIn`), the neighbour still eligible (`readPeerMeshRequestEligibility`) — each false ⇒
//     a FINISHED `skipped_*` row, so the ping is ⛔ judged again;
//   · a CLAIM-WIDE name fault (read by the caller BEFORE this transaction) ⇒ `no_target:name_<reason>` (finished);
//   · else the row is begun (INSERT … ON CONFLICT (ping_id) DO NOTHING) or re-claimed (a CAS — own retry, a parked row, a lapsed
//     lease; ONLY while the marker is NULL) and the mobile ciphertext is returned AS STORED.
// ⭐ THE IN-FLIGHT MARKER (WR10) — `markPeerMeshWaReminderInFlight`: its OWN committed CAS immediately before the WhatsApp call,
// requiring the lease still to have `leaseMarginMs` left; ⛔ `marked` ⇒ ⛔ send. Cleared by THREE paths (`2026-10-19-366` 4 (b)):
// a park and a post-send transient (both require it SET), and R2's quiet-hours release; a PRE-send transient requires it UNSET,
// so a same-job-id twin's pre-send fault can ⛔ clear a live send's marker.
// ⚠ Code review R1 (2026-10-19): the SAME statement also rechecks WR5's `+ 72 h` bound (the ping's `send_updated_at`) —
// the begin's `in_time` check runs BEFORE the decrypt / hash work, so a slow send can cross the deadline between the two; the
// marker is the LAST gate before Meta is called, so it is the one that must ⛔ let a late send through. Past the deadline the
// SAME atomic statement finalises `skipped_late` instead of marking (⛔ a second statement, ⛔ a window between the two).
// ⚠ ⛔ Never a Drizzle correlated subquery — raw SQL with explicit `wr_` aliases ([[project_epic6_drizzle_correlated_subquery_bug]]).

import { type SQL, sql } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import type pg from 'pg';

import { getWaConfig } from '../channel-config/wa-config.js';
import { bindScopedDb, type Db } from '../db.js';
import type { ClaimId, MemberId, PariwarId, PeerMeshPingId } from '../ids/index.js';
import { clampLimit } from '../pagination.js';
import {
  PEER_MESH_WA_REMINDER_DETAIL_PATTERN,
  type PeerMeshWaReminderLocale,
  type PeerMeshWaReminderLocaleSource,
} from '../schema/claim_peer_mesh_wa_reminders.js';
import { getMemberMobileCiphertext, isPeerMeshWaReminderOptedIn } from '../wa-opt-in/read.js';
import { answerWindowSql, isClaimInAnswerWindow } from './answer-window.js';
import { CORRECTION_SEND_LEASE_MS } from './correction-reminder-record.js';
import type { PeerMeshNomineeMatch } from './peer-mesh-read.js';
import { peerMeshReplyState } from './peer-mesh-reply.js';
import { PEER_MESH_REQUEST_PARKED_BY, readPeerMeshRequestEligibility, resolvePeerRequestLocale } from './peer-mesh-request.js';

/** WR4 — the reminder is due this many hours after the text was ACCEPTED (`send_updated_at` of the accepted ping). */
export const PEER_MESH_WA_REMINDER_DUE_AFTER_HOURS = 48;
/** WR5 — ⛔ send attempt starts at or after this many hours after the text. */
export const PEER_MESH_WA_REMINDER_LATE_AFTER_HOURS = 72;
/** The sweep's page size cap. */
export const PEER_MESH_WA_REMINDER_PAGE_CAP = 1000;
/** The child's per-claim due-ping read cap — ≤ 5 live pings plus replacements by construction; clamped all the same. */
export const PEER_MESH_WA_REMINDER_CLAIM_PING_CAP = 20;
/** The claiming transaction's wait on the claim-row lock. */
export const PEER_MESH_WA_REMINDER_LOCK_TIMEOUT = '30s';
/** WR10 — the finalise's bounds (`SET LOCAL` inside its own transaction). Their sum + the send's timeout < the handoff margin. */
export const PEER_MESH_WA_REMINDER_FINALISE_LOCK_TIMEOUT_MS = 30_000;
export const PEER_MESH_WA_REMINDER_FINALISE_STATEMENT_TIMEOUT_MS = 30_000;
/** The in-flight marker's bound (`lock_timeout` AND `statement_timeout`) — round-2 P3; it counts against the handoff margin too. */
export const PEER_MESH_WA_REMINDER_MARKER_TIMEOUT_MS = 5_000;
/** The PARKED marker — the SAME value 6.27c's text uses (0171's parked CHECK pins it ⇔ `parked_at`). */
export const PEER_MESH_WA_REMINDER_PARKED_BY = PEER_MESH_REQUEST_PARKED_BY;
/** `claimed_by_job` of a row the sweep finished as LATE (WR5) / as LAPSED mid-flight (WR10). */
export const PEER_MESH_WA_REMINDER_LATE_BY = 'sweep:late';
export const PEER_MESH_WA_REMINDER_LAPSED_BY = 'sweep:lapsed';

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

// ── The `detail` grammar (WR10) — ONE builder; ⛔ free text, ⛔ a raw Meta message, ⛔ a phone number ──────────────────────

/** The child's transient faults BEFORE the send (the neighbour's number, the keyed hash). */
export const PEER_MESH_WA_REMINDER_PRE_SEND_FAULTS = ['decrypt_failed:tier1', 'hash_failed:tier1'] as const;
/** How a send MAY have reached Meta (`classifyDirectWaSendFailure`'s rule 1 / 2, and the lapsed-row finisher). */
export const PEER_MESH_WA_REMINDER_MAY_HAVE_SENT = ['network', 'timeout', 'no_wamid', 'lease_lapsed', 'gateway_502', 'gateway_504', 'unknown'] as const;
/** A CLAIM-WIDE name fault (the deceased's name could ⛔ be used). ⛔ `name_too_long` — the reminder has ⛔ SMS slot (WR13). */
export const PEER_MESH_WA_REMINDER_NAME_FAULTS = ['name_none', 'name_erased', 'name_unresolvable'] as const;
export type PeerMeshWaReminderNameFault = (typeof PEER_MESH_WA_REMINDER_NAME_FAULTS)[number];

export type PeerMeshWaReminderDetailInput =
  /** A classified transient's note — `rate_limited:<code|none>` / `api_unavailable:<status>` (the classifier's token). */
  | { readonly kind: 'transient'; readonly note: string }
  | { readonly kind: 'pre_send'; readonly fault: (typeof PEER_MESH_WA_REMINDER_PRE_SEND_FAULTS)[number] }
  | { readonly kind: 'may_have_sent'; readonly how: (typeof PEER_MESH_WA_REMINDER_MAY_HAVE_SENT)[number] }
  /** A park — `scope` (a scope-wide refusal) or `held` (a refusal of unknown scope); `token` is `[a-z0-9_]+`. */
  | { readonly kind: 'park'; readonly scope: 'scope' | 'held'; readonly token: string }
  | { readonly kind: 'no_target'; readonly reason: 'no_sendable_number' | PeerMeshWaReminderNameFault };

/** ⭐ WR10 — THE ONLY way a reminder's `detail` is built (0171 CHECKs the SAME grammar; asserted here before any statement). */
export function peerMeshWaReminderDetail(d: PeerMeshWaReminderDetailInput): string {
  let detail: string;
  switch (d.kind) {
    case 'transient':
      detail = d.note;
      break;
    case 'pre_send':
      detail = d.fault;
      break;
    case 'may_have_sent':
      detail = `may_have_sent:${d.how}`;
      break;
    case 'park':
      detail = `${d.scope}:${d.token}`;
      break;
    case 'no_target':
      detail = `no_target:${d.reason}`;
      break;
  }
  assertDetail(detail);
  return detail;
}

const DETAIL_PATTERN = new RegExp(PEER_MESH_WA_REMINDER_DETAIL_PATTERN);

/** Does `detail` match the grammar (0171's CHECK — the SAME pattern)? */
export function isPeerMeshWaReminderDetail(detail: string): boolean {
  return DETAIL_PATTERN.test(detail);
}

/** ⛔ A writer stores a `detail` outside the grammar — fails BEFORE the statement, ⛔ value echoed. */
function assertDetail(detail: string | null): void {
  if (detail !== null && !isPeerMeshWaReminderDetail(detail)) {
    throw new Error('[peer-mesh-wa-reminder] a detail outside the fixed grammar — build it with peerMeshWaReminderDetail');
  }
}

// ── The claiming transaction ──────────────────────────────────────────────────────────────────────────────────────────

/** What the locked begin decided. ⛔ Nothing unsealed. */
export type BeginPeerMeshWaReminderResult =
  | { readonly kind: 'already_final' }
  | { readonly kind: 'held_by_other' }
  /** The send it began is in flight (the marker is set) — ⛔ write, ⛔ re-check (WR2's first test). */
  | { readonly kind: 'in_flight' }
  /** ⛔ Due under the DB clock (before `+ 48 h`), or the text was never accepted — ⛔ write. */
  | { readonly kind: 'not_due' }
  /** The Pariwar's WhatsApp switch is OFF under the lock — ⛔ write (WR2 (v)). */
  | { readonly kind: 'switch_off' }
  /** A finished judgement written by this begin (WR2 / WR5 / WR13). */
  | {
      readonly kind: 'skipped';
      readonly outcome: 'skipped_late' | 'skipped_window_closed' | 'skipped_answered' | 'skipped_not_opted_in' | 'skipped_recipient_ineligible';
    }
  | { readonly kind: 'no_target'; readonly detail: string }
  /**
   * 📌 Story 6.35 (LS10 (b′)) — the recipient's language has ⛔ usable reminder template for its Pariwar, and ⛔ fallback applies (their
   * language IS the Pariwar's default — a non-chooser, or a chooser of the default): ⛔ write (⛔ row on a fresh begin; a re-claim's
   * row keeps its holder). Past `+ 72 h` it is never due again, or `skipped_late` (the sweep's late marking / a sibling's begin).
   */
  | { readonly kind: 'waiting_template'; readonly locale: PeerMeshWaReminderLocale }
  | {
      readonly kind: 'begun';
      readonly reminderId: string;
      readonly recipientMemberId: MemberId;
      /** ⛔ AS STORED (the caller unseals it AFTER the commit). `null` ⇒ ⛔ identity row. */
      readonly mobileCiphertext: string | null;
      /** The ping's link code — a credential (T11): `{{2}}` only, ⛔ logged. */
      readonly linkCode: string;
      readonly attemptCount: number;
      /** The claim time this begin stamped — the marker's lease check counts from it. */
      readonly claimedAt: Date;
      /** 📌 Story 6.35 (LS9, WR14) — the language this reminder goes in, WHY, and that language's template NAME — as recorded on the row. */
      readonly locale: PeerMeshWaReminderLocale;
      readonly localeSource: PeerMeshWaReminderLocaleSource;
      readonly templateName: string;
    };

/**
 * 📌 Story 6.35 (LS10 (b′); `2026-10-23-385` PQ1 A) — which template a reminder goes with, from its recipient's language (`effective`
 * — their choice, else the Pariwar's default), WHY, and the Pariwar's two template names (`null` ⇒ unusable — unset, invalid,
 * refused by Meta, or the other locale's key unreadable): the recipient's own ⇒ it; else, for a recipient whose language is ⛔ the
 * Pariwar's default (they CHOSE another), the default's ⇒ `pariwar_fallback`; else WAIT (`null`). Pure — the sweep and the begin
 * apply the SAME rule.
 */
export function choosePeerMeshWaReminderTemplate(input: {
  readonly effective: PeerMeshWaReminderLocale;
  readonly source: 'pariwar_default' | 'member_choice';
  readonly pariwarDefaultLocale: PeerMeshWaReminderLocale;
  readonly templates: Readonly<Record<PeerMeshWaReminderLocale, string | null>>;
}): { readonly locale: PeerMeshWaReminderLocale; readonly localeSource: PeerMeshWaReminderLocaleSource; readonly templateName: string } | null {
  const own = input.templates[input.effective];
  if (own !== null) return { locale: input.effective, localeSource: input.source, templateName: own };
  const fallback = input.templates[input.pariwarDefaultLocale];
  if (input.effective !== input.pariwarDefaultLocale && fallback !== null) {
    return { locale: input.pariwarDefaultLocale, localeSource: 'pariwar_fallback', templateName: fallback };
  }
  return null;
}

interface LockedPing {
  ping_id: string;
  selection_id: string;
  member_id: string;
  send_outcome: string | null;
  link_code: string | null;
  due: boolean;
  in_time: boolean;
}

interface LockedReminder {
  reminder_id: string;
  send_outcome: string;
  claimed_at: Date | string | null;
  claimed_by_job: string | null;
  send_started_at: Date | string | null;
}

/**
 * Lock the claim row (`lock_timeout`), then the ping row (it must belong to the claim's selection), then the ping's reminder row
 * if one exists — 6.27c's `lockClaimThenPing` ORDER (its SQL shape copied: ⛔ the private function exported — the file is frozen).
 * The 48 h / 72 h tests are read on the DB clock, in the same statement as the ping lock.
 */
async function lockClaimPingReminder(
  client: pg.PoolClient,
  input: { readonly pariwarId: PariwarId; readonly claimCaseId: ClaimId; readonly pingId: PeerMeshPingId },
): Promise<{ claim: { currentState: string; deceasedMemberId: MemberId }; ping: LockedPing; reminder: LockedReminder | null }> {
  const { pariwarId, claimCaseId, pingId } = input;
  await client.query(`SET LOCAL lock_timeout = '${PEER_MESH_WA_REMINDER_LOCK_TIMEOUT}'`);
  const claimRow = (
    await client.query<{ current_state: string; deceased_member_id: string }>(
      `SELECT current_state::text AS current_state, deceased_member_id FROM claims
        WHERE pariwar_id = $1 AND claim_case_id = $2 FOR UPDATE`,
      [pariwarId, claimCaseId],
    )
  ).rows[0];
  // The child read this claim moments ago under this same Pariwar; claims are ⛔ never deleted — a data fault.
  if (!claimRow) throw new Error(`[peer-mesh-wa-reminder] claim ${claimCaseId} is missing under Pariwar ${pariwarId}`);
  const pingRow = (
    await client.query<LockedPing>(
      `SELECT p.ping_id, p.selection_id, p.member_id, p.send_outcome, p.link_code,
              p.send_updated_at + make_interval(hours => $4) <= clock_timestamp() AS due,
              clock_timestamp() < p.send_updated_at + make_interval(hours => $5) AS in_time
         FROM claim_peer_mesh_pings p
         JOIN claim_peer_mesh_selections s ON s.pariwar_id = p.pariwar_id AND s.selection_id = p.selection_id
        WHERE p.pariwar_id = $1 AND p.ping_id = $2 AND s.claim_case_id = $3
        FOR UPDATE OF p`,
      [pariwarId, pingId, claimCaseId, PEER_MESH_WA_REMINDER_DUE_AFTER_HOURS, PEER_MESH_WA_REMINDER_LATE_AFTER_HOURS],
    )
  ).rows[0];
  if (!pingRow) throw new Error(`[peer-mesh-wa-reminder] ping ${pingId} is not a ping of claim ${claimCaseId}`);
  const reminderRow = (
    await client.query<LockedReminder>(
      `SELECT reminder_id, send_outcome, claimed_at, claimed_by_job, send_started_at
         FROM claim_peer_mesh_wa_reminders WHERE pariwar_id = $1 AND ping_id = $2 FOR UPDATE`,
      [pariwarId, pingId],
    )
  ).rows[0];
  return {
    claim: { currentState: claimRow.current_state, deceasedMemberId: claimRow.deceased_member_id as MemberId },
    ping: pingRow,
    reminder: reminderRow ?? null,
  };
}

type FinishedJudgement =
  | 'skipped_late'
  | 'skipped_window_closed'
  | 'skipped_answered'
  | 'skipped_not_opted_in'
  | 'skipped_recipient_ineligible'
  | 'no_target';

/**
 * Write a FINISHED judgement: a FRESH row (⛔ reminder yet) or a re-claimable `attempting` one (⛔ marker). Returns whether it took.
 * An existing row keeps its previous `detail` in `first_detail` (6.27c's RN6 form); a name fault writes its own `detail`.
 */
async function writeFinished(
  client: pg.PoolClient,
  ctx: { readonly pariwarId: PariwarId; readonly claimCaseId: ClaimId; readonly ping: LockedPing; readonly reminder: LockedReminder | null },
  outcome: FinishedJudgement,
  detail: string | null,
  jobId: string,
  now: Date,
): Promise<boolean> {
  assertDetail(detail);
  if (ctx.reminder === null) {
    const r = await client.query(
      `INSERT INTO claim_peer_mesh_wa_reminders
         (ping_id, pariwar_id, claim_case_id, selection_id, member_id, send_outcome, attempt_count, claimed_at, claimed_by_job, detail)
       VALUES ($1, $2, $3, $4, $5, $6, 1, $7, $8, $9)
       ON CONFLICT (ping_id) DO NOTHING`,
      [ctx.ping.ping_id, ctx.pariwarId, ctx.claimCaseId, ctx.ping.selection_id, ctx.ping.member_id, outcome, now, jobId, detail],
    );
    return (r.rowCount ?? 0) > 0;
  }
  const r = await client.query(
    `UPDATE claim_peer_mesh_wa_reminders
        SET send_outcome = $2, claimed_at = $3, claimed_by_job = $4, parked_at = NULL,
            first_detail = COALESCE(first_detail, detail), detail = COALESCE($5, detail), send_updated_at = clock_timestamp()
      WHERE reminder_id = $1 AND send_outcome = 'attempting' AND send_started_at IS NULL`,
    [ctx.reminder.reminder_id, outcome, now, jobId, detail],
  );
  return (r.rowCount ?? 0) > 0;
}

/**
 * ⭐ THE CLAIMING TRANSACTION — on the ONE client of the caller's scope transaction. See the module header for the order.
 * `nameFault` is the CLAIM-WIDE name fault the caller found BEFORE this transaction, or `null`; `template` is what the race guard
 * resolved (recorded on the row). ⛔ Nothing unsealed here — the caller COMMITS, then reads the number and sends.
 * ⛔ Never catch a DB error inside this transaction.
 */
export async function beginPeerMeshWaReminder(
  client: pg.PoolClient,
  input: {
    readonly pariwarId: PariwarId;
    readonly claimCaseId: ClaimId;
    readonly pingId: PeerMeshPingId;
    readonly jobId: string;
    readonly now: Date;
    readonly nameFault: PeerMeshWaReminderNameFault | null;
    /**
     * 📌 Story 6.35 (LS9 / LS10 (b′)) — the Pariwar's template NAME per locale from the race guard (`null` ⇒ unusable). The begin
     * resolves THIS recipient's language under the lock (WR14 — read again, ⛔ copied from the ping) and picks by
     * `choosePeerMeshWaReminderTemplate`.
     */
    readonly templates: Readonly<Record<PeerMeshWaReminderLocale, string | null>>;
    /** Story 6.36d (ND4; AC6) — the deceased's nominee indexes, computed by the caller OUTSIDE any transaction. */
    readonly nomineeMatch: PeerMeshNomineeMatch;
  },
): Promise<BeginPeerMeshWaReminderResult> {
  const db = bindScopedDb(client);
  const { pariwarId, jobId, now, nameFault, nomineeMatch } = input;
  const claimCaseId = String(input.claimCaseId).toLowerCase() as ClaimId;
  const pingId = String(input.pingId).toLowerCase() as PeerMeshPingId;
  const { claim, ping, reminder } = await lockClaimPingReminder(client, { pariwarId, claimCaseId, pingId });

  if (reminder !== null) {
    if (reminder.send_outcome !== 'attempting') return { kind: 'already_final' };
    // ⭐ WR2 — the FIRST test on an existing row: a send it began is in flight (a pg-boss retry / expiry re-run of the SAME job id
    // passes the own-retry ground) ⇒ ⛔ write, ⛔ re-check. The lapsed-row finisher owns it.
    if (reminder.send_started_at !== null) return { kind: 'in_flight' };
    const ownRetry = reminder.claimed_by_job === jobId;
    const parked = reminder.claimed_by_job === PEER_MESH_WA_REMINDER_PARKED_BY;
    const leaseExpired = reminder.claimed_at !== null && toDate(reminder.claimed_at).getTime() < now.getTime() - CORRECTION_SEND_LEASE_MS;
    if (!ownRetry && !parked && !leaseExpired) return { kind: 'held_by_other' };
  }
  // I3 — only after a text that went (a delivery report is ⛔ read — §0 edge (i)).
  if (ping.send_outcome !== 'accepted' || ping.link_code === null) return { kind: 'not_due' };

  // WR2 (v) — the switch, under the lock. OFF ⇒ ⛔ row (an existing parked / transient row is the late marking's).
  const wa = await getWaConfig(db, pariwarId);
  if (wa === null || !wa.enabled) return { kind: 'switch_off' };

  const ctx = { pariwarId, claimCaseId, ping, reminder };
  const finish = async (outcome: FinishedJudgement, detail: string | null = null): Promise<BeginPeerMeshWaReminderResult> => {
    if (!(await writeFinished(client, ctx, outcome, detail, jobId, now))) return { kind: 'already_final' };
    return outcome === 'no_target' ? { kind: 'no_target', detail: detail! } : { kind: 'skipped', outcome };
  };

  // WR5 — ⛔ attempt starts at or after `+ 72 h` (a child deferred by quiet hours or a retry can start late).
  if (!ping.in_time) return finish('skipped_late');
  if (!ping.due) {
    // The sweep listed it on its clock; the DB clock says ⛔ yet. A re-claimable row is left as it is.
    return { kind: 'not_due' };
  }
  // I4 — the answer window, PM8's ONE predicate, on the LOCKED state.
  if (!(await isClaimInAnswerWindow(db, pariwarId, claimCaseId, claim.currentState))) return finish('skipped_window_closed');
  // WR2 (iii) (b) — "has ⛔ answered" = ⛔ submitted; a `started` reply still gets the reminder (PM7 (g) — the seam unchanged).
  if ((await peerMeshReplyState(db, pariwarId, pingId)) === 'submitted') return finish('skipped_answered');
  // I5 / WR3 — the ONE opt-in read.
  if (!(await isPeerMeshWaReminderOptedIn(db, { pariwarId, memberId: ping.member_id as MemberId }))) return finish('skipped_not_opted_in');
  // WR2 (ix) — a neighbour who has since died, left, or filed is ⛔ one of the five; ⭐ Story 6.36d (`-386`) — nor is one who
  // signs in with one of the deceased's nominee numbers (the shared predicate carries the conjunct).
  const eligibility = await readPeerMeshRequestEligibility(db, {
    pariwarId,
    memberId: ping.member_id as MemberId,
    deceasedMemberId: claim.deceasedMemberId,
    nomineeMatch,
  });
  if (!eligibility.eligible) return finish('skipped_recipient_ineligible');
  // WR13 — a claim-wide name fault (an erasure since the text, …) ⇒ finished `no_target`.
  if (nameFault !== null) return finish('no_target', peerMeshWaReminderDetail({ kind: 'no_target', reason: nameFault }));

  // 📌 Story 6.35 (WR14 per RECIPIENT; LS10 (b′), `-385`) — the recipient's language, read again here (after ⑨ proved the member row
  // is in this Pariwar), and the template for it — or the Pariwar's, for a chooser — or WAIT (⛔ write).
  const language = await resolvePeerRequestLocale(db, { pariwarId, memberId: ping.member_id as MemberId });
  const template = choosePeerMeshWaReminderTemplate({
    effective: language.locale,
    source: language.source,
    pariwarDefaultLocale: language.pariwarDefaultLocale,
    templates: input.templates,
  });
  if (template === null) return { kind: 'waiting_template', locale: language.locale };

  // Begin — or re-claim (own retry at once; a parked row; another job's past the lease) — ONLY while the marker is NULL.
  let reminderId: string;
  let attemptCount: number;
  if (reminder === null) {
    const inserted = (
      await client.query<{ reminder_id: string }>(
        `INSERT INTO claim_peer_mesh_wa_reminders
           (ping_id, pariwar_id, claim_case_id, selection_id, member_id, send_outcome, attempt_count, claimed_at, claimed_by_job,
            aging_since, template_name, locale, locale_source)
         VALUES ($1, $2, $3, $4, $5, 'attempting', 1, $6, $7, clock_timestamp(), $8, $9, $10)
         ON CONFLICT (ping_id) DO NOTHING
         RETURNING reminder_id`,
        [ping.ping_id, pariwarId, claimCaseId, ping.selection_id, ping.member_id, now, jobId, template.templateName, template.locale, template.localeSource],
      )
    ).rows[0];
    // ⛔ Reachable while this transaction holds the ping lock (every writer takes it first) — defensive.
    if (!inserted) return { kind: 'held_by_other' };
    reminderId = inserted.reminder_id;
    attemptCount = 1;
  } else {
    const reclaimed = (
      await client.query<{ attempt_count: number }>(
        `UPDATE claim_peer_mesh_wa_reminders
            SET claimed_at = $2, claimed_by_job = $3, attempt_count = attempt_count + 1, parked_at = NULL,
                first_detail = COALESCE(first_detail, detail), template_name = $4, locale = $5, locale_source = $6
          WHERE reminder_id = $1 AND send_outcome = 'attempting' AND send_started_at IS NULL
          RETURNING attempt_count`,
        [reminder.reminder_id, now, jobId, template.templateName, template.locale, template.localeSource],
      )
    ).rows[0];
    if (!reclaimed) return { kind: 'already_final' };
    reminderId = reminder.reminder_id;
    attemptCount = reclaimed.attempt_count;
  }
  const mobileCiphertext = await getMemberMobileCiphertext(db, { pariwarId, memberId: ping.member_id as MemberId });
  return {
    kind: 'begun',
    reminderId,
    recipientMemberId: ping.member_id as MemberId,
    mobileCiphertext,
    linkCode: ping.link_code,
    attemptCount,
    claimedAt: now,
    locale: template.locale,
    localeSource: template.localeSource,
    templateName: template.templateName,
  };
}

// ── The child's writes after the commit — each ONE row, only by the job holding it ─────────────────────────────────────

interface RowRef {
  readonly pariwarId: PariwarId;
  readonly reminderId: string;
  readonly jobId: string;
}

/**
 * The marker's three answers (round-2 P4): `marked` ⇒ send; `late` ⇒ THIS statement just finalised `skipped_late` (R1 — ⛔ send,
 * ⛔ retry); `lost` ⇒ the lease was lost or the row moved on (⛔ send).
 */
export type PeerMeshWaReminderMarkResult = 'marked' | 'late' | 'lost';

/**
 * ⭐ WR10 — THE IN-FLIGHT MARKER: `send_started_at = clock_timestamp()` in its OWN committed UPDATE, as a CAS — only on this job's
 * `attempting` row, ⛔ already marked, whose claim still has `leaseMarginMs` of lease left (`claimed_at > now − (lease − margin)`).
 * ⛔ `marked` ⇒ ⛔ send (`lost` — the lease was lost or the row moved on; `late` — R1 — the ping's `+ 72 h` bound (WR5) passed between
 * the begin and this call: the SAME statement then finalises `skipped_late` atomically, so a slow decrypt / hash never lets a send
 * cross the deadline). ⚠ `now` is the CHILD's clock for the LEASE only (`2026-10-19-366` 4 (a)): `claimed_at` is stamped from it, and the re-claim and the lapsed-row
 * finisher judge the lease on the same clock (6.27c's form) — ⛔ a host stamp compared to the DB clock. The `+ 72 h` recheck reads
 * the ping's OWN `send_updated_at` against `clock_timestamp()` (the DB clock) — the SAME comparison `lockClaimPingReminder`'s
 * `in_time` column and the due lists use, computed ONCE per row (a `LATERAL` subquery) so every branch agrees.
 */
export async function markPeerMeshWaReminderInFlight(
  db: Db,
  input: RowRef & { readonly leaseMarginMs: number; readonly now: Date },
): Promise<PeerMeshWaReminderMarkResult> {
  if (!(input.leaseMarginMs > 0 && input.leaseMarginMs < CORRECTION_SEND_LEASE_MS)) {
    throw new Error(`[peer-mesh-wa-reminder] leaseMarginMs must be inside (0, ${String(CORRECTION_SEND_LEASE_MS)})`);
  }
  const notBefore = new Date(input.now.getTime() - (CORRECTION_SEND_LEASE_MS - input.leaseMarginMs));
  // Round-2 P3 — BOUNDED: its wait counts against the handoff margin (the caller samples `now` inside this transaction).
  await db.execute(sql.raw(`SET LOCAL lock_timeout = '${String(PEER_MESH_WA_REMINDER_MARKER_TIMEOUT_MS)}ms'`));
  await db.execute(sql.raw(`SET LOCAL statement_timeout = '${String(PEER_MESH_WA_REMINDER_MARKER_TIMEOUT_MS)}ms'`));
  const result = await db.execute<{ reminder_id: string; marked: boolean }>(sql`
    UPDATE claim_peer_mesh_wa_reminders wr
       SET send_started_at = CASE WHEN still.in_time THEN clock_timestamp() ELSE NULL END,
           send_outcome    = CASE WHEN still.in_time THEN wr.send_outcome ELSE 'skipped_late' END,
           claimed_by_job  = CASE WHEN still.in_time THEN wr.claimed_by_job ELSE ${PEER_MESH_WA_REMINDER_LATE_BY} END,
           parked_at       = CASE WHEN still.in_time THEN wr.parked_at ELSE NULL END,
           first_detail    = CASE WHEN still.in_time THEN wr.first_detail ELSE COALESCE(wr.first_detail, wr.detail) END,
           send_updated_at = clock_timestamp()
      FROM claim_peer_mesh_pings p
      CROSS JOIN LATERAL (
        SELECT clock_timestamp() < p.send_updated_at + make_interval(hours => ${PEER_MESH_WA_REMINDER_LATE_AFTER_HOURS}) AS in_time
      ) still
     WHERE wr.pariwar_id = ${input.pariwarId}
       AND wr.reminder_id = ${input.reminderId}::uuid
       AND wr.send_outcome = 'attempting'
       AND wr.claimed_by_job = ${input.jobId}
       AND wr.send_started_at IS NULL
       AND wr.claimed_at > ${notBefore}
       AND p.pariwar_id = wr.pariwar_id
       AND p.ping_id = wr.ping_id
    RETURNING wr.reminder_id, still.in_time AS marked
  `);
  const row = result.rows?.[0];
  return row === undefined ? 'lost' : row.marked === true ? 'marked' : 'late';
}

/**
 * ⭐ R2 — RELEASE the in-flight marker WITHOUT a send: quiet hours arrived in the gap between the marker's CAS (committed) and
 * the actual Meta call — the pooled-connection wait + that CAS's own commit can itself cross 20:00 IST. Meta was ⛔ called
 * (⛔ a transient — a transient records a PROVIDER signal), so the row is left `attempting`, un-noted, owned by this job; the
 * CHILD re-enqueues itself for the next morning, where a fresh begin / marker re-judges everything (incl. the `+ 72 h` bound).
 * ⛔ On a row ⛔ in flight (already released, finished, or held by another job) — returns `false`.
 */
export async function releasePeerMeshWaReminderInFlight(db: Db, input: RowRef): Promise<boolean> {
  const result = await db.execute<{ reminder_id: string }>(sql`
    UPDATE claim_peer_mesh_wa_reminders
       SET send_started_at = NULL, send_updated_at = clock_timestamp()
     WHERE pariwar_id = ${input.pariwarId}
       AND reminder_id = ${input.reminderId}::uuid
       AND send_outcome = 'attempting'
       AND claimed_by_job = ${input.jobId}
       AND send_started_at IS NOT NULL
    RETURNING reminder_id
  `);
  return (result.rows?.length ?? 0) > 0;
}

/**
 * ⭐ THE COMPARE-AND-SET after the WhatsApp call: `attempting` → `accepted` (the wamid, the number hash) / `rejected_recipient` /
 * `error` (`may_have_sent:*` only), only by the job holding the row with the marker SET. BOUNDED (WR10): `SET LOCAL lock_timeout`
 * and `statement_timeout` inside the caller's transaction (`client` is that transaction's), so the send's whole tail fits inside
 * the handoff margin. Returns `false` when the row moved on.
 */
export async function finalisePeerMeshWaReminder(
  client: pg.PoolClient,
  input: RowRef & {
    readonly outcome: 'accepted' | 'rejected_recipient' | 'error';
    readonly providerMessageId?: string | null;
    readonly detail?: string | null;
    readonly recipientNumberHash?: string | null;
  },
): Promise<boolean> {
  assertDetail(input.detail ?? null);
  // Round-2 P9 — the outcome and its fields agree, BEFORE the statement (⛔ a 23514 in the send's tail).
  if (input.outcome === 'error' && !(input.detail ?? '').startsWith('may_have_sent:')) {
    throw new Error('[peer-mesh-wa-reminder] an error finalise carries a may_have_sent:* detail');
  }
  if (input.outcome === 'accepted' && (!input.providerMessageId || !input.recipientNumberHash)) {
    throw new Error('[peer-mesh-wa-reminder] an accepted finalise carries the wamid and the number hash');
  }
  await client.query(`SET LOCAL lock_timeout = '${String(PEER_MESH_WA_REMINDER_FINALISE_LOCK_TIMEOUT_MS)}ms'`);
  await client.query(`SET LOCAL statement_timeout = '${String(PEER_MESH_WA_REMINDER_FINALISE_STATEMENT_TIMEOUT_MS)}ms'`);
  const r = await client.query(
    `UPDATE claim_peer_mesh_wa_reminders
        SET send_outcome = $4, provider_message_id = $5, first_detail = COALESCE(first_detail, detail), detail = $6,
            recipient_number_hash = $7, send_updated_at = clock_timestamp()
      WHERE pariwar_id = $1 AND reminder_id = $2::uuid AND send_outcome = 'attempting' AND claimed_by_job = $3
        AND send_started_at IS NOT NULL`,
    [input.pariwarId, input.reminderId, input.jobId, input.outcome, input.providerMessageId ?? null, input.detail ?? null, input.recipientNumberHash ?? null],
  );
  return (r.rowCount ?? 0) > 0;
}

/**
 * A TRANSIENT (WR10 rule 3 — Meta answered 429 / a 5xx / a connection that never opened — or a pre-send decrypt / hash fault): the
 * row stays `attempting` under this job (its retry re-claims it at once), the note is recorded and the marker CLEARED (the send never
 * began, or Meta refused it). ⭐ Round-2 P2 — `phase` is CAS'd on the marker: a `pre_send` note requires it UNSET and a `post_send`
 * one requires it SET, so a same-job-id twin (a pg-boss expiry re-run) can ⛔ clear the marker of a send the other run began.
 */
export async function notePeerMeshWaReminderTransient(
  db: Db,
  input: RowRef & { readonly detail: string; readonly phase: 'pre_send' | 'post_send' },
): Promise<boolean> {
  assertDetail(input.detail);
  const marker = input.phase === 'pre_send' ? sql`send_started_at IS NULL` : sql`send_started_at IS NOT NULL`;
  const result = await db.execute<{ reminder_id: string }>(sql`
    UPDATE claim_peer_mesh_wa_reminders
       SET detail = ${input.detail}, send_started_at = NULL, send_updated_at = clock_timestamp()
     WHERE pariwar_id = ${input.pariwarId}
       AND reminder_id = ${input.reminderId}::uuid
       AND send_outcome = 'attempting'
       AND claimed_by_job = ${input.jobId}
       AND ${marker}
    RETURNING reminder_id
  `);
  return (result.rows?.length ?? 0) > 0;
}

/**
 * ⭐ WR10 rules 4 / 6 — THE PARK: Meta REFUSED the send for a reason about the scope (`scope:<token>`) or of unknown scope
 * (`held:<token>`): the row returns to `sweep:held` with `parked_at`, the note, and the marker CLEARED — ⛔ finished (a once-ever
 * reminder is ⛔ spent on what may be the account's fault); the sweep lists it again, subject to the 72-hour bound. ONE row, only
 * by the job holding it with the marker SET (a park follows a send attempt — round-2 P2) — ⛔ a set-based park.
 */
export async function parkPeerMeshWaReminder(db: Db, input: RowRef & { readonly detail: string }): Promise<boolean> {
  assertDetail(input.detail);
  const result = await db.execute<{ reminder_id: string }>(sql`
    UPDATE claim_peer_mesh_wa_reminders
       SET claimed_by_job = ${PEER_MESH_WA_REMINDER_PARKED_BY}, parked_at = clock_timestamp(), send_started_at = NULL,
           detail = ${input.detail}, send_updated_at = clock_timestamp()
     WHERE pariwar_id = ${input.pariwarId}
       AND reminder_id = ${input.reminderId}::uuid
       AND send_outcome = 'attempting'
       AND claimed_by_job = ${input.jobId}
       AND send_started_at IS NOT NULL
    RETURNING reminder_id
  `);
  return (result.rows?.length ?? 0) > 0;
}

/**
 * The neighbour's number is UNUSABLE (⛔ identity row, the erased sentinel, ⛔ a valid Indian mobile — found AFTER the commit,
 * BEFORE any send): finished `no_target:no_sendable_number`. ⛔ A decrypt or hash THROW is never this (a transient).
 */
export async function finishPeerMeshWaReminderNoSendableNumber(db: Db, input: RowRef): Promise<boolean> {
  const detail = peerMeshWaReminderDetail({ kind: 'no_target', reason: 'no_sendable_number' });
  const result = await db.execute<{ reminder_id: string }>(sql`
    UPDATE claim_peer_mesh_wa_reminders
       SET send_outcome = 'no_target', first_detail = COALESCE(first_detail, detail), detail = ${detail}, send_updated_at = clock_timestamp()
     WHERE pariwar_id = ${input.pariwarId}
       AND reminder_id = ${input.reminderId}::uuid
       AND send_outcome = 'attempting'
       AND claimed_by_job = ${input.jobId}
       AND send_started_at IS NULL
    RETURNING reminder_id
  `);
  return (result.rows?.length ?? 0) > 0;
}

// ── The child's read ─────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The claim's DUE pings (AC2's predicate within one claim, ⛔ the switch — the child's race guard read it), in `ping_id` order.
 * Clamped. The begin re-judges every conjunct under the lock. ⚠ Unlike the sweep's list, an `attempting` row WITHOUT the marker is
 * listed whoever holds it (6.27c's `listDuePeerMeshRequestPings` form): the begin judges the holder — the SAME job's pg-boss retry
 * re-claims its own transient row at once, another live job's row is `held_by_other`.
 */
export async function listClaimDuePeerMeshWaReminderPings(
  db: Db,
  input: {
    readonly pariwarId: PariwarId;
    readonly claimCaseId: ClaimId;
    readonly now: Date;
    /** The DB-clock instant of the sweep page that listed this claim due (the payload's `dueAsOf`; a deferral keeps it) — R5's bound. */
    readonly dueAsOf: Date;
    readonly limit?: number;
  },
): Promise<PeerMeshPingId[]> {
  const n = clampLimit(input.limit, { default: PEER_MESH_WA_REMINDER_CLAIM_PING_CAP, cap: PEER_MESH_WA_REMINDER_CLAIM_PING_CAP });
  const { rows } = await db.execute<{ ping_id: string }>(sql`
    SELECT wr_p.ping_id
      FROM claim_peer_mesh_pings wr_p
      JOIN claim_peer_mesh_selections wr_s ON wr_s.pariwar_id = wr_p.pariwar_id AND wr_s.selection_id = wr_p.selection_id
      JOIN claims wr_c ON wr_c.pariwar_id = wr_s.pariwar_id AND wr_c.claim_case_id = wr_s.claim_case_id
     WHERE wr_p.pariwar_id = ${input.pariwarId} AND wr_s.claim_case_id = ${input.claimCaseId}
       AND ${dueConjunctsSql(input.now, { mode: 'child', dueAsOf: input.dueAsOf })}
     ORDER BY wr_p.ping_id
     LIMIT ${n}`);
  return rows.map((r) => r.ping_id as PeerMeshPingId);
}

/**
 * ⭐ AC2's per-ping conjuncts over aliases `wr_p` (the ping) and `wr_c` (its claim): the text ACCEPTED; `+ 48 h ≤ now` on the DB
 * clock (the SWEEP also bounds it `< + 72 h` — WR5; the CHILD bounds it at `dueAsOf`, R5 below); the claim in the answer window
 * (`answerWindowSql` — ⛔ hand-composed); and EITHER ⛔ reminder row, a PARKED one, or a re-claimable `attempting` one (⛔ marker;
 * for the SWEEP its lease lapsed — a live child's row is ⛔ enqueued again; for the CHILD any holder — the begin judges it).
 * ⛔ The switch (the callers add it).
 *
 * ⭐ R5 — the CHILD keeps a ping visible PAST `+ 72 h` when it was inside its window at `dueAsOf` — the DB-clock instant of the
 * sweep page that listed the claim due (`DuePeerMeshWaReminderPage.asOf`; carried in the payload; a quiet-hours deferral keeps it)
 * — ⛔ a host stamp compared to the DB clock. A child deferred past `+ 72 h` BEFORE any row exists would
 * otherwise never surface that ping again (the sweep's list stops at `< + 72 h` and `markLatePeerMeshWaReminders` has ⛔ row), and
 * AC3's *"the child queued at + 71 h and deferred overnight… records `skipped_late` at its late begin"* would be unreachable; the
 * begin's OWN `in_time` recheck refuses the SEND. ⚠ Round-2 P1 — the bound is `dueAsOf`, ⛔ none: a sibling ping whose window had
 * already passed when the sweep looked (the switch OFF, a hold) was NEVER due and gets ⛔ row (WR5; `2026-10-19-366` Consequence 1).
 */
function dueConjunctsSql(now: Date, opts: { readonly mode: 'sweep' } | { readonly mode: 'child'; readonly dueAsOf: Date }): SQL {
  const reclaimable =
    opts.mode === 'child'
      ? sql`true`
      : sql`(wr_r.claimed_by_job = ${PEER_MESH_WA_REMINDER_PARKED_BY} OR wr_r.claimed_at < ${new Date(now.getTime() - CORRECTION_SEND_LEASE_MS)})`;
  const upperBound =
    opts.mode === 'sweep'
      ? sql`AND clock_timestamp() < wr_p.send_updated_at + make_interval(hours => ${PEER_MESH_WA_REMINDER_LATE_AFTER_HOURS})`
      : sql`AND ${opts.dueAsOf} < wr_p.send_updated_at + make_interval(hours => ${PEER_MESH_WA_REMINDER_LATE_AFTER_HOURS})`;
  return sql`wr_p.send_outcome = 'accepted'
       AND wr_p.send_updated_at + make_interval(hours => ${PEER_MESH_WA_REMINDER_DUE_AFTER_HOURS}) <= clock_timestamp()
       ${upperBound}
       AND ${answerWindowSql('wr_c')}
       AND NOT EXISTS (
             SELECT 1 FROM claim_peer_mesh_wa_reminders wr_r
              WHERE wr_r.ping_id = wr_p.ping_id
                AND NOT (wr_r.send_outcome = 'attempting' AND wr_r.send_started_at IS NULL AND ${reclaimable}))`;
}

// ── The sweep's reads and writes — cross-tenant, BYPASSRLS pool ──────────────────────────────────────────────────────────

/** One due ping (ids, and — 📌 Story 6.35 — its recipient's language codes). */
export interface DuePeerMeshWaReminderPing {
  readonly pariwarId: PariwarId;
  readonly claimCaseId: ClaimId;
  readonly pingId: PeerMeshPingId;
  /**
   * 📌 Story 6.35 (LS10 (b′)) — the recipient's EFFECTIVE language (their choice, else the Pariwar's default), why, and the default —
   * so the sweep skips a ping that will WAIT before it costs a child. `null` ⇒ ⛔ passport (the ping still reaches the
   * `config:locale_unavailable` hold). Language CODES only (⛔ PII).
   */
  readonly effectiveLocale: PeerMeshWaReminderLocale | null;
  readonly localeSource: 'pariwar_default' | 'member_choice';
  readonly pariwarDefaultLocale: PeerMeshWaReminderLocale | null;
}

export interface DuePeerMeshWaReminderPage {
  readonly due: readonly DuePeerMeshWaReminderPing[];
  /** The page's last (claim, ping) — the next page's cursor (`null` ⇒ an empty page). */
  readonly last: { readonly claimCaseId: ClaimId; readonly pingId: PeerMeshPingId } | null;
  readonly scanned: number;
  /** ⭐ Round-2 P1 — the DB clock (`statement_timestamp()`) of the statement that listed the page: the child's `dueAsOf` (`null` ⇒ an empty page). */
  readonly asOf: Date | null;
}

/**
 * ⭐ AC2 — the DUE pings, one keyset page on `(claim_case_id, ping_id)`: `dueConjunctsSql` AND the Pariwar's WhatsApp switch ON
 * (`pariwar_wa_config.enabled` — a switch-OFF Pariwar is ⛔ offered at all: ⛔ row, ⛔ alarm). ⛔ A row is written here.
 *
 * ── DELIBERATE: a CROSS-TENANT READ on the BYPASSRLS pool (family 9) ──
 * The sweep has ⛔ tenant to start from (6.27c's `listDuePeerMeshRequestClaims` reasoning). It RETURNS ids only (`pariwar_id`,
 * `claim_case_id`, `ping_id`) — ⛔ PII, ⛔ value from one tenant reaches another; every write that follows runs in the child's own
 * `withPariwarScope` transaction, under RLS, after a locked re-check. The caller checks `canReadAcrossPariwars` FIRST (an RLS-bound
 * role would see ⛔ row and report "nothing due"). `allow` (tests) narrows it. RE-EXAMINE when: the result ever carries more than
 * ids, the read projects PII, a write is added on this pool, the pool loses BYPASSRLS, or a per-tenant scheduler exists.
 * 📌 2026-10-23 (Story 6.35): it ALSO returns each ping's recipient's language codes (their choice, else the Pariwar's default) —
 * joined on the PING's own `pariwar_id` (`members`, `pariwar_passport`); two-letter codes, ⛔ PII, ⛔ another tenant's value.
 */
export async function listDuePeerMeshWaReminderPings(
  q: Queryable,
  input: {
    readonly now: Date;
    readonly after: { readonly claimCaseId: string; readonly pingId: string } | null;
    readonly limit?: number;
    readonly allow: readonly string[] | null;
  },
): Promise<DuePeerMeshWaReminderPage> {
  const n = clampLimit(input.limit, { default: PEER_MESH_WA_REMINDER_PAGE_CAP, cap: PEER_MESH_WA_REMINDER_PAGE_CAP });
  const after =
    input.after === null ? sql`` : sql` AND (wr_c.claim_case_id, wr_p.ping_id) > (${input.after.claimCaseId}::uuid, ${input.after.pingId}::uuid)`;
  // ⚠ `sql.param` — a bare array in a Drizzle template is EXPANDED into one parameter per element.
  const allow = input.allow === null ? sql`` : sql` AND wr_c.pariwar_id = ANY(${sql.param([...input.allow])}::uuid[])`;
  const rows = await run<{
    pariwar_id: string;
    claim_case_id: string;
    ping_id: string;
    as_of: Date;
    preferred_locale: string | null;
    locale_default: string | null;
  }>(
    q,
    sql`
      SELECT wr_c.pariwar_id, wr_c.claim_case_id, wr_p.ping_id, statement_timestamp() AS as_of,
             wr_m.preferred_locale::text AS preferred_locale, wr_pp.locale_default::text AS locale_default
        FROM claim_peer_mesh_pings wr_p
        JOIN claim_peer_mesh_selections wr_s ON wr_s.pariwar_id = wr_p.pariwar_id AND wr_s.selection_id = wr_p.selection_id
        JOIN claims wr_c ON wr_c.pariwar_id = wr_s.pariwar_id AND wr_c.claim_case_id = wr_s.claim_case_id
        JOIN pariwar_wa_config wr_w ON wr_w.pariwar_id = wr_p.pariwar_id AND wr_w.enabled = true
        LEFT JOIN members wr_m ON wr_m.pariwar_id = wr_p.pariwar_id AND wr_m.member_id = wr_p.member_id
        LEFT JOIN pariwar_passport wr_pp ON wr_pp.pariwar_id = wr_p.pariwar_id
       WHERE ${dueConjunctsSql(input.now, { mode: 'sweep' })}${after}${allow}
       ORDER BY wr_c.claim_case_id, wr_p.ping_id
       LIMIT ${sql.raw(String(n))}`,
  );
  const last = rows[rows.length - 1];
  return {
    due: rows.map((r) => {
      const chosen = r.preferred_locale === 'hi' || r.preferred_locale === 'en' ? r.preferred_locale : null;
      const pariwarDefaultLocale = r.locale_default === 'hi' || r.locale_default === 'en' ? r.locale_default : null;
      return {
        pariwarId: r.pariwar_id as PariwarId,
        claimCaseId: r.claim_case_id as ClaimId,
        pingId: r.ping_id as PeerMeshPingId,
        effectiveLocale: chosen ?? pariwarDefaultLocale,
        localeSource: chosen !== null ? ('member_choice' as const) : ('pariwar_default' as const),
        pariwarDefaultLocale,
      };
    }),
    last: last ? { claimCaseId: last.claim_case_id as ClaimId, pingId: last.ping_id as PeerMeshPingId } : null,
    scanned: rows.length,
    asOf: last ? new Date(last.as_of) : null,
  };
}

/** A row a sweep finisher wrote (ids only — the caller's alarm). */
export interface FinishedPeerMeshWaReminder {
  readonly reminderId: string;
  readonly claimCaseId: ClaimId;
}

/**
 * ⭐ R3 — the two maintenance passes' (the lapsed finisher, the late marking) per-call BATCH cap: `FOR UPDATE SKIP LOCKED` so a
 * single locked row is SKIPPED rather than stalling the whole cross-tenant scan, and a bound so the caller can check the tick's
 * remaining budget between batches (`claimDueSmsDeliveryReports`'s shape — [[project_in_subquery_limit_skip_locked_overclaim]]).
 */
export const PEER_MESH_WA_REMINDER_MAINTENANCE_BATCH = 200;

/**
 * ⭐ WR10 — THE LAPSED IN-FLIGHT FINISHER (runs FIRST): every `attempting` row WITH the marker whose claim is older than the send
 * lease died mid-flight — it MAY have reached Meta ⇒ `error` / `may_have_sent:lease_lapsed` (the previous note kept in
 * `first_detail`), ⛔ ever re-claimed or parked. REGARDLESS of the switch, the answer window and the 72-hour bound, so ⛔ such row is
 * stranded. (A live send can ⛔ be caught: the marker CAS leaves at least the handoff margin, and the send + the bounded finalise fit
 * inside it — pinned by a test.) R3 — ONE bounded, `SKIP LOCKED` batch per call (oldest `claimed_at` first); the caller loops it
 * between budget checks.
 *
 * ── DELIBERATE: a CROSS-TENANT WRITE on the BYPASSRLS pool (family 9) ── 6.27c's `expireExhaustedPeerMeshRequests` reasoning: a
 * time bound over every tenant's rows; predicate and effect read and write ⛔ nothing tenant-derived. A child holding the row
 * finalises under a row lock — SKIP LOCKED now passes it by instead of waiting. RE-EXAMINE when: the statement writes a value
 * derived from another row or tenant, the pool loses BYPASSRLS, a per-tenant scheduler exists, or `CORRECTION_SEND_LEASE_MS` moves.
 * ⚠ The due set is a `MATERIALIZED` CTE, evaluated ONCE — `claimDueSmsDeliveryReports`'s `IN (SELECT … LIMIT n FOR UPDATE SKIP
 * LOCKED)` is NOT bounded by its LIMIT under a re-run subquery plan ([[project_in_subquery_limit_skip_locked_overclaim]]).
 */
export async function finishLapsedInFlightPeerMeshWaReminders(
  q: Queryable,
  input: { readonly now: Date; readonly allow: readonly string[] | null; readonly limit?: number },
): Promise<FinishedPeerMeshWaReminder[]> {
  const detail = peerMeshWaReminderDetail({ kind: 'may_have_sent', how: 'lease_lapsed' });
  const limit = clampLimit(input.limit, { default: PEER_MESH_WA_REMINDER_MAINTENANCE_BATCH, cap: PEER_MESH_WA_REMINDER_MAINTENANCE_BATCH });
  const { rows } = await q.query<{ reminder_id: string; claim_case_id: string }>(
    `WITH due AS MATERIALIZED (
       SELECT reminder_id FROM claim_peer_mesh_wa_reminders
        WHERE send_outcome = 'attempting' AND send_started_at IS NOT NULL AND claimed_at < $3
          AND ($4::uuid[] IS NULL OR pariwar_id = ANY($4::uuid[]))
        ORDER BY claimed_at
        LIMIT $5
        FOR UPDATE SKIP LOCKED)
     UPDATE claim_peer_mesh_wa_reminders r
        SET send_outcome = 'error', first_detail = COALESCE(r.first_detail, r.detail), detail = $1, claimed_by_job = $2,
            send_updated_at = clock_timestamp()
       FROM due
      WHERE r.reminder_id = due.reminder_id
      RETURNING r.reminder_id, r.claim_case_id`,
    [detail, PEER_MESH_WA_REMINDER_LAPSED_BY, new Date(input.now.getTime() - CORRECTION_SEND_LEASE_MS), input.allow === null ? null : [...input.allow], limit],
  );
  return rows.map((r) => ({ reminderId: r.reminder_id, claimCaseId: r.claim_case_id as ClaimId }));
}

/**
 * ⭐ WR5 — THE LATE MARKING (after the lapsed finisher): every EXISTING ⛔-finished row WITHOUT the marker (parked, or a transient)
 * whose text is `+ 72 h` old or more becomes `skipped_late` (⛔ send; its note kept in `first_detail` / `detail`; `claimed_by_job`
 * and `parked_at` cleared together — 0171's biconditional). REGARDLESS of the switch, a config hold and the answer window (a row
 * parked before the Pariwar was switched OFF or its claim decided still finishes — the due list requires both, so ⛔ other path
 * reaches it). An in-flight row (the marker set) is ⛔ touched. ⛔ A row is CREATED (⛔ backfill — a ping never begun gets ⛔ row).
 * A live child whose row this finishes loses its marker CAS (`attempting` required) ⇒ ⛔ send. R3 — ONE bounded, `SKIP LOCKED`
 * batch per call (oldest text first); `FOR UPDATE OF r` ONLY — the ping join is read-only and must ⛔ take the ping lock begins
 * and finalises contend on.
 *
 * ── DELIBERATE: a CROSS-TENANT WRITE on the BYPASSRLS pool (family 9) ── the lapsed finisher's reasoning; the 72-hour test reads
 * the row's OWN ping (its FK owner — the same tenant). RE-EXAMINE as above.
 */
export async function markLatePeerMeshWaReminders(
  q: Queryable,
  input: { readonly allow: readonly string[] | null; readonly limit?: number },
): Promise<FinishedPeerMeshWaReminder[]> {
  const limit = clampLimit(input.limit, { default: PEER_MESH_WA_REMINDER_MAINTENANCE_BATCH, cap: PEER_MESH_WA_REMINDER_MAINTENANCE_BATCH });
  const { rows } = await q.query<{ reminder_id: string; claim_case_id: string }>(
    `WITH due AS MATERIALIZED (
       SELECT r.reminder_id FROM claim_peer_mesh_wa_reminders r
         JOIN claim_peer_mesh_pings p ON p.pariwar_id = r.pariwar_id AND p.ping_id = r.ping_id
        WHERE r.send_outcome = 'attempting' AND r.send_started_at IS NULL
          AND p.send_updated_at + make_interval(hours => $2) <= clock_timestamp()
          AND ($3::uuid[] IS NULL OR r.pariwar_id = ANY($3::uuid[]))
        ORDER BY p.send_updated_at
        LIMIT $4
        FOR UPDATE OF r SKIP LOCKED)
     UPDATE claim_peer_mesh_wa_reminders r
        SET send_outcome = 'skipped_late', claimed_by_job = $1, parked_at = NULL, first_detail = COALESCE(r.first_detail, r.detail),
            send_updated_at = clock_timestamp()
       FROM due
      WHERE r.reminder_id = due.reminder_id
      RETURNING r.reminder_id, r.claim_case_id`,
    [PEER_MESH_WA_REMINDER_LATE_BY, PEER_MESH_WA_REMINDER_LATE_AFTER_HOURS, input.allow === null ? null : [...input.allow], limit],
  );
  return rows.map((r) => ({ reminderId: r.reminder_id, claimCaseId: r.claim_case_id as ClaimId }));
}
