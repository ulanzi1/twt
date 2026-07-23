// Member contribution-history read + pure status derivation — Story 8.6 (Task 1; AC1/AC2).
//
// The Yogdaan Bahi (contribution passbook) is a member's OWN self-view (FR-12A self-visibility): it
// lists the member's own attested contributions and, per row, the honestly-derived four-state status.
// `listMemberContributionHistory` is the load-bearing read: "which contributions has THIS member
// attested, and what is each one's status right now?" — every row derived from a
// `contribution.utr-attested` event the member authored (Story 8.4). A transport-free PRIMITIVE: NO
// HTTP, NO decryption — the apps/api boundary resolves per-pool identity (the deceased family name +
// letter code + curated name) exactly like the My Pool card (D6).
//
// ── A SELF-view, NOT a public/aggregate surface — the yellow-never-confirmed invariant does NOT bind it (D1)
// The load-bearing 8.3/8.4 invariant (yellow/attested must never render as confirmed on PUBLIC/AGGREGATE
// surfaces — the confirmed-only contributor list, the progress meter) governs OTHER people's / the pool's
// aggregate truth. The Yogdaan Bahi is the opposite: it is the member's private view of the member's OWN
// claims, so showing the member's own yellow (attested/pending) / green (confirmed) / red (mismatch) /
// grey (on-record) here IS the whole point (visible without asking). Two structural guards keep it honest:
//   (a) the read is HARD-SCOPED to the caller's own `memberId` — it NEVER lists another member's rows; and
//   (b) `green` still derives EXCLUSIVELY from `contribution.confirmed` (a yellow/attested row can NEVER
//       render as green — the status precedence is structural, an exact-event-type + member+pool match).
//
// ── The honest data source: the member's own `contribution.utr-attested` events (D2) ──────────────────
// Today the ONLY event that represents "this member contributed" is the member's own
// `contribution.utr-attested` claim (Story 8.4), on the ALERT stream (`stream_id = alertId`), payload
// `{ actor, trigger, poolId, memberId, tr, utr, attestation_only: true }`. This read lists those,
// member-scoped, one passbook row each. There is NO `contributions` projection table — that substrate is
// Epic 9's (8.3 D10); the domain reads `events_log` DIRECTLY (it owns the table, cannot import
// `@twt/events` — the turbo cycle; the member/read.ts precedent).
//
// ── Status derivation: honest now, populates later with ZERO code changes (D3) ────────────────────────
// `deriveContributionStatus` precedence (highest wins): green ≻ red ≻ yellow-while-open ≻ grey-when-closed.
//   · green — a `contribution.confirmed` event exists for (member, pool). Epic 9's producer — EMPTY today.
//   · red   — a `contribution.reconciliation-mismatch` event exists for (member, pool). Epic 9 — EMPTY today.
//   · yellow— attested, while the alert is NOT closed ("told us they paid, still verifying").
//   · grey  — the cycle closed with NO reconciliation verdict — a NEUTRAL "on record, unreconciled", NEVER a
//             "you missed"/shame state (the dignified register, AC6). `alert.closed` is Story 8.9's exclusive
//             emitter (backlog), so grey is UNREACHABLE today, exactly like green/red.
// The green/red arms + `CONTRIBUTION_MISMATCH_EVENT_TYPE` are the FORWARD CONTRACT OF RECORD for Epic 9's
// reconciliation producer (like read.ts's `CONFIRMED_*` constants). The confirmed/mismatch lookups are an
// EXACT event-type + member+pool scope match — never a widened set a yellow event could satisfy.

import { and, desc, eq, inArray, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { AlertId, MemberId, PariwarId, PoolId } from '../ids/index.js';
import { alerts, type AlertLifecycleState } from '../schema/alerts.js';
import { eventsLog } from '../schema/events_log.js';
import {
  CONFIRMED_EVENT_TYPE,
  CONFIRMED_PAYLOAD_MEMBER_KEY,
  CONFIRMED_PAYLOAD_POOL_KEY,
} from './read.js';
import { CONTRIBUTION_UTR_ATTESTED_EVENT_TYPE } from './write.js';

/**
 * The reconciliation-MISMATCH (red) event type — the FORWARD contract of record for Epic 9's producer
 * (mirrors read.ts's `CONFIRMED_EVENT_TYPE` for green). EMPTY today: Epic 9 owns the reconciliation
 * matcher and is unbuilt, so no row can ever render red yet. The green/red arms of the derivation ship
 * complete now so the moment Epic 9 emits this event (scoped by the SAME `memberId` + `poolId` payload
 * keys the confirmed event uses), the passbook populates with ZERO changes here.
 *
 * Vocabulary note: FR-50's `invalid` is the human-TRIAGE reject verdict from the reconciliation review
 * queue; the RED passbook tone reflects a reconciliation MISMATCH (the FR-71 `contribution-mismatch`
 * signal — an auto-detected UTR/amount discrepancy). Epic 9's producer story is the counterparty that
 * emits THIS exact type; because the arm is structurally empty today, Epic 9 may re-tune the string here
 * (its single source of truth) with no consumer breakage.
 */
export const CONTRIBUTION_MISMATCH_EVENT_TYPE = 'contribution.reconciliation-mismatch' as const;

/** The four passbook status tones (AC2). Green/red are Epic-9-derived (empty today); grey needs Story 8.9. */
export const CONTRIBUTION_STATUSES = ['yellow', 'green', 'red', 'grey'] as const;

/** A contribution's honestly-derived status tone (AC2). Mirrors the contract's `ContributionStatus`. */
export type ContributionStatus = (typeof CONTRIBUTION_STATUSES)[number];

/**
 * Whether an alert's cached lifecycle state means the cycle is NO LONGER OPEN (grey-eligible). `closed`
 * (Story 8.9's emitter) and `settled` (Epic 9's terminal) both mean "not accepting contributions"; the
 * pre-live/live states (`draft`/`frozen`/`published`/`live`) mean the contribution is still in an open
 * window → yellow. Keeping this a single predicate (not scattered string checks) makes the grey boundary
 * one line to audit.
 */
export function isAlertClosedState(state: AlertLifecycleState): boolean {
  return state === 'closed' || state === 'settled';
}

/**
 * Derive a contribution's status tone (AC2) — PURE, DB-free, exhaustively unit-testable. Precedence
 * (highest wins): green ≻ red ≻ yellow-while-open ≻ grey-when-closed. `confirmed`/`mismatch` are the
 * results of the EXACT event-type + member+pool lookups (a yellow event can never set either true, so a
 * yellow/attested row can never render green/red). `alertClosed` is {@link isAlertClosedState} over the
 * alert's cached `current_state`. Today green/red/grey are all legitimately unreachable (Epic 9 + Story
 * 8.9 unbuilt) — the function ships complete so those states need NO code change when their producers land.
 */
export function deriveContributionStatus({
  confirmed,
  mismatch,
  alertClosed,
}: {
  readonly confirmed: boolean;
  readonly mismatch: boolean;
  readonly alertClosed: boolean;
}): ContributionStatus {
  if (confirmed) return 'green';
  if (mismatch) return 'red';
  if (!alertClosed) return 'yellow';
  return 'grey';
}

/**
 * A defensive upper bound on the number of history rows a single read returns. A member's lifetime
 * contribution count is small (one per cycle they participate in), but this is NOT a user-controlled
 * `.limit()` — it is a fixed guard against a pathological/corrupt event log producing an unbounded
 * result set. The `.limit()` call below uses the INTEGER LITERAL `500` (the domain-accessor-invariants
 * forced-pagination gate accepts a literal for a fixed bound, but not a named-const reference — it cannot
 * prove a const is not caller-influenced); this exported constant MUST stay in sync with that literal and
 * exists for documentation + tests. The mobile passbook's own contract is 50–500 rows (AC4), under this.
 */
export const MAX_CONTRIBUTION_HISTORY_ROWS = 500;

/**
 * One row of a member's contribution history — the member's own attested contribution + its derived
 * status. Identity (deceased family name, pool letter/name, amount, cycle ref) is resolved at the
 * apps/api boundary (D6), NOT here (this primitive is transport-free + decryption-free).
 */
export interface MemberContributionHistoryEntry {
  /** The `contribution.utr-attested` event id — the row's stable identity (the contract's `contributionId`). */
  readonly contributionId: string;
  /** The alert stream the claim was appended on (`stream_id = alertId`; 1:1 with the cycle). */
  readonly alertId: AlertId;
  /** The pool the contribution belongs to — the boundary resolves its identity/amount/cycle. */
  readonly poolId: PoolId;
  /** The contribution instant — the attestation event's `occurred_at`. */
  readonly attestedAt: Date;
  /** The raw member-pasted UTR (audit/support field — the boundary does NOT put it on the wire). */
  readonly utr: string;
  /** The honestly-derived status tone (AC2). */
  readonly status: ContributionStatus;
}

/** A raw attested-contribution row before status derivation (internal). */
interface RawAttestedRow {
  readonly contributionId: string;
  readonly alertId: string;
  readonly poolId: string;
  readonly attestedAt: Date;
  readonly utr: string;
}

/**
 * Resolve ONE of the member's OWN attested contributions by id, with its derived status — the Story 8.7
 * Contribution Note's ownership+status read. Deliberately a TARGETED equality lookup on `eventId` (the
 * primary key), not a slice of {@link listMemberContributionHistory}'s `.limit(500)` list: a member with
 * more than 500 attested contributions must still be able to regenerate a Note for an older one (AC7 —
 * "regenerable for any past contribution"), which the capped list read cannot guarantee. Reuses the SAME
 * status-derivation steps (D3) — never a second derivation — just scoped to one row instead of many.
 * `null` when no such attested contribution exists FOR THIS MEMBER (unknown id or another member's — the
 * `memberId` payload-key scope in the query makes the two indistinguishable by construction, D9).
 */
export async function getMemberAttestedContribution(
  db: Db,
  { pariwarId, memberId, contributionId }: { readonly pariwarId: PariwarId; readonly memberId: MemberId; readonly contributionId: string },
): Promise<MemberContributionHistoryEntry | null> {
  // (1) The ONE attested contribution, matched on its primary key (`event_id`) — at most one row can ever
  //     satisfy this, so no `.limit()` is needed. Hard-scoped to `memberId` (D1) + tenant, same as the list read.
  const [row] = await db
    .select({
      contributionId: eventsLog.eventId,
      alertId: eventsLog.streamId,
      attestedAt: eventsLog.occurredAt,
      poolId: sql<string | null>`${eventsLog.payload} ->> ${CONFIRMED_PAYLOAD_POOL_KEY}`,
      utr: sql<string | null>`${eventsLog.payload} ->> 'utr'`,
    })
    .from(eventsLog)
    .where(
      and(
        eq(eventsLog.pariwarId, pariwarId),
        eq(eventsLog.eventType, CONTRIBUTION_UTR_ATTESTED_EVENT_TYPE),
        eq(eventsLog.eventId, contributionId),
        sql`${eventsLog.payload} ->> ${CONFIRMED_PAYLOAD_MEMBER_KEY} = ${memberId}`,
      ),
    );
  if (row === undefined || typeof row.poolId !== 'string' || row.poolId.length === 0) return null;
  if (typeof row.utr !== 'string' || row.utr.length === 0) return null;

  // (2) The SAME confirmed/mismatch verdict check as the list read, scoped to this one pool.
  const verdictRows = await db
    .select({ eventType: eventsLog.eventType })
    .from(eventsLog)
    .where(
      and(
        eq(eventsLog.pariwarId, pariwarId),
        inArray(eventsLog.eventType, [CONFIRMED_EVENT_TYPE, CONTRIBUTION_MISMATCH_EVENT_TYPE]),
        sql`${eventsLog.payload} ->> ${CONFIRMED_PAYLOAD_MEMBER_KEY} = ${memberId}`,
        sql`${eventsLog.payload} ->> ${CONFIRMED_PAYLOAD_POOL_KEY} = ${row.poolId}`,
      ),
    )
    .limit(500);
  const confirmed = verdictRows.some((v) => v.eventType === CONFIRMED_EVENT_TYPE);
  const mismatch = verdictRows.some((v) => v.eventType === CONTRIBUTION_MISMATCH_EVENT_TYPE);

  // (3) The alert's cached lifecycle state (grey/yellow boundary) — same rule as the list read: no
  //     projection row is treated as NOT closed (yellow), never grey without proof of closure.
  const [alertRow] = await db
    .select({ currentState: alerts.currentState })
    .from(alerts)
    .where(and(eq(alerts.pariwarId, pariwarId), eq(alerts.alertId, row.alertId as AlertId)));
  const alertClosed = alertRow !== undefined && isAlertClosedState(alertRow.currentState);

  const status = deriveContributionStatus({ confirmed, mismatch, alertClosed });
  return {
    contributionId: row.contributionId,
    alertId: row.alertId as AlertId,
    poolId: row.poolId as PoolId,
    attestedAt: row.attestedAt,
    utr: row.utr,
    status,
  };
}

/**
 * List the member's OWN attested contributions, newest-first, each with its derived status (AC1/AC2).
 * Hard-scoped to the caller's `memberId` (D1) + tenant (`pariwar_id` + RLS). Sources the member's
 * `contribution.utr-attested` events (D2), then resolves each row's status structurally:
 *   · green iff a `contribution.confirmed` event exists for (member, pool) — Epic 9, empty today;
 *   · red   iff a `contribution.reconciliation-mismatch` event exists for (member, pool) — Epic 9, empty today;
 *   · else yellow while the row's alert is not closed; else grey (cycle closed, no verdict).
 * Malformed attested events (missing `poolId`/`utr`) are DROPPED (they can never resolve to a real pool
 * — an integrity anomaly, never a blank row). The confirmed/mismatch/alert-state lookups are BATCHED
 * (one query each) rather than per-row, so the read is three queries regardless of history length.
 * Ordered `occurred_at DESC, event_id DESC` (the second key is a deterministic total-order tiebreak for
 * rows sharing an instant — no time significance). Bounded by {@link MAX_CONTRIBUTION_HISTORY_ROWS}.
 */
export async function listMemberContributionHistory(
  db: Db,
  { pariwarId, memberId }: { readonly pariwarId: PariwarId; readonly memberId: MemberId },
): Promise<MemberContributionHistoryEntry[]> {
  // (1) The member's OWN attested contributions (the honest data source, D2). Hard-scoped to `memberId`
  //     via the payload key (D1) + tenant. Newest-first with a deterministic tiebreak.
  const attestedRows = await db
    .select({
      contributionId: eventsLog.eventId,
      alertId: eventsLog.streamId,
      attestedAt: eventsLog.occurredAt,
      poolId: sql<string | null>`${eventsLog.payload} ->> ${CONFIRMED_PAYLOAD_POOL_KEY}`,
      utr: sql<string | null>`${eventsLog.payload} ->> 'utr'`,
    })
    .from(eventsLog)
    .where(
      and(
        eq(eventsLog.pariwarId, pariwarId),
        eq(eventsLog.eventType, CONTRIBUTION_UTR_ATTESTED_EVENT_TYPE),
        // The member-scope guard (D1) — the read NEVER lists another member's contributions.
        sql`${eventsLog.payload} ->> ${CONFIRMED_PAYLOAD_MEMBER_KEY} = ${memberId}`,
      ),
    )
    .orderBy(desc(eventsLog.occurredAt), desc(eventsLog.eventId))
    // Integer literal (NOT MAX_CONTRIBUTION_HISTORY_ROWS) — the forced-pagination invariant gate accepts a
    // literal for a fixed bound but flags a named-const reference. Keep this `500` in sync with the constant.
    .limit(500);

  // Drop malformed rows (a corrupt event missing poolId/utr can never resolve to a real pool).
  const raw: RawAttestedRow[] = [];
  for (const r of attestedRows) {
    if (typeof r.poolId === 'string' && r.poolId.length > 0 && typeof r.utr === 'string' && r.utr.length > 0) {
      raw.push({
        contributionId: r.contributionId,
        alertId: r.alertId,
        poolId: r.poolId,
        attestedAt: r.attestedAt,
        utr: r.utr,
      });
    }
  }
  if (raw.length === 0) return [];

  // (2) The member's reconciliation VERDICTS (green/red), batched — the EXACT confirmed/mismatch event
  //     types, scoped to THIS member (D1) + tenant. Build per-pool sets so a yellow event (a different
  //     event type) can NEVER satisfy either. Empty today (Epic 9 unbuilt, D3).
  const confirmedPoolIds = new Set<string>();
  const mismatchPoolIds = new Set<string>();
  const verdictRows = await db
    .select({
      eventType: eventsLog.eventType,
      poolId: sql<string | null>`${eventsLog.payload} ->> ${CONFIRMED_PAYLOAD_POOL_KEY}`,
    })
    .from(eventsLog)
    .where(
      and(
        eq(eventsLog.pariwarId, pariwarId),
        inArray(eventsLog.eventType, [CONFIRMED_EVENT_TYPE, CONTRIBUTION_MISMATCH_EVENT_TYPE]),
        sql`${eventsLog.payload} ->> ${CONFIRMED_PAYLOAD_MEMBER_KEY} = ${memberId}`,
      ),
    )
    // Same defensive bound as query (1) — a pathological/corrupt event log must not produce an unbounded
    // verdict set. Empty today (Epic 9 unbuilt); the cap only matters once that producer ships.
    .limit(500);
  for (const v of verdictRows) {
    if (typeof v.poolId !== 'string' || v.poolId.length === 0) continue;
    if (v.eventType === CONFIRMED_EVENT_TYPE) confirmedPoolIds.add(v.poolId);
    else if (v.eventType === CONTRIBUTION_MISMATCH_EVENT_TYPE) mismatchPoolIds.add(v.poolId);
  }

  // (3) The alerts' cached lifecycle states (for the grey/yellow boundary), batched over the distinct
  //     alert ids in the history. Reads the Story 8.1 projection (`alerts.current_state`) — NEVER replays.
  const distinctAlertIds = [...new Set(raw.map((r) => r.alertId))];
  const alertStateById = new Map<string, AlertLifecycleState>();
  if (distinctAlertIds.length > 0) {
    const alertRows = await db
      .select({ alertId: alerts.alertId, currentState: alerts.currentState })
      .from(alerts)
      .where(and(eq(alerts.pariwarId, pariwarId), inArray(alerts.alertId, distinctAlertIds as AlertId[])));
    for (const a of alertRows) alertStateById.set(a.alertId, a.currentState);
  }

  // (4) Derive each row's status structurally. An alert with no projection row (should not happen — 8.1
  //     mints the alert at cycle-open) is treated as NOT closed → yellow (never grey without proof of closure).
  return raw.map((r) => {
    const state = alertStateById.get(r.alertId);
    const alertClosed = state !== undefined && isAlertClosedState(state);
    const status = deriveContributionStatus({
      confirmed: confirmedPoolIds.has(r.poolId),
      mismatch: mismatchPoolIds.has(r.poolId),
      alertClosed,
    });
    return {
      contributionId: r.contributionId,
      alertId: r.alertId as AlertId,
      poolId: r.poolId as PoolId,
      attestedAt: r.attestedAt,
      utr: r.utr,
      status,
    };
  });
}
