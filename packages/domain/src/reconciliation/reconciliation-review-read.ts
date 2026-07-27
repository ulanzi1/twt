// The cross-member reconciliation-review queue read — Story 9.8 (Task 3, the crux; AC1/AC2, D4/D5).
//
// EVERY existing reconciliation/history read is single-scope (one alertId / cycleId / memberId). There is
// NO `reconciliation_cases` projection table (Decision D5: metadata-is-an-event, minimize new schema) and
// NO cross-member reader. This module builds the first one: a bounded, pariwar-scoped scan that enumerates
// every OPEN reconciliation case, deduped open-vs-resolved with the EXISTING `hasLiveConfirmation` chain +
// the new reject marker, ordered by a DERIVED deadline (no persisted deadline field exists).
//
// ── The bound that keeps it safe (D5) ─────────────────────────────────────────────────────────────────
// A case spans TWO stream families — mismatch / self-verify / confirmed / reversed / rejected ride the
// ALERT stream (stream_id = alertId), while statement-upload / manual-transcription ride the POOL stream
// (stream_id = poolId). The scan is bounded to currently-RECONCILING cycles (alerts in `live` / `closed` —
// `settled` is done, pre-live states have no reconciliation yet), so the working set is the handful of
// live cycles per Pariwar. That bound is what makes the final `limit` safe: the rows are sorted by deadline
// proximity BEFORE the slice, so the clamp can never hide the most-urgent case (it is, by construction,
// in-window). The scan excludes settled/pre-live cycles by design — logged as the deliberate bound.
//
// ── Deadline proximity is DERIVED, not a field (D4) ───────────────────────────────────────────────────
// FR-50: "closer to Day-15 = higher priority." No deadline column exists (schema/alerts.ts). For a CLOSED
// cycle the deadline is the calendar-aware reconciliation tail (`reconciliationTailDeadline` off the
// `alert.closed` instant); for a still-LIVE cycle we sort by the expected Day-15 close (pool-open + the
// standard window). Computed per case in memory over the bounded set.
//
// All reads are tenant-scoped (RLS + an explicit `pariwar_id` predicate) and live in @twt/domain (it owns
// events_log; it cannot import @twt/events — the turbo cycle). Transport-free + decryption-free: the
// apps/api boundary decrypts member identity + mints the screenshot signed URL (AC2).

import { and, eq, inArray, sql } from 'drizzle-orm';

import { reconciliationTailDeadline, type HolidayWindow } from '../cycle-calendar/holiday-resolver.js';
import type { Db } from '../db.js';
import type { AlertId, CycleFreezeCommitId, PariwarId, PoolId } from '../ids/index.js';
import { clampLimit } from '../pagination.js';
import { alerts } from '../schema/alerts.js';
import { eventsLog } from '../schema/events_log.js';
import { pools } from '../schema/pools.js';
import {
  CONFIRMED_EVENT_TYPE,
  CONFIRMED_PAYLOAD_MEMBER_KEY,
  CONFIRMED_PAYLOAD_POOL_KEY,
  hasLiveConfirmation,
  REVERSED_CONFIRMED_EVENT_ID_KEY,
} from '../contribution/read.js';
import { CONTRIBUTION_MISMATCH_EVENT_TYPE } from '../contribution/history.js';
import { CONTRIBUTION_UTR_ATTESTED_EVENT_TYPE } from '../contribution/write.js';
import { getPoolContributionContext } from '../pool/contribution-binding.js';
import { DEFAULT_STAFF_TAKEOVER_THRESHOLD_DAYS, computeStaffTakeover } from '../nominee-console/takeover.js';
import { POOL_OPENED_FOR_CONTRIBUTIONS_EVENT_TYPE } from '../nominee-console/read.js';
import { listEntriesForPools } from './entries.js';
import {
  RECONCILIATION_CONTRIBUTION_REJECTED_EVENT_TYPE,
  RECONCILIATION_MANUAL_TRANSCRIPTION_REQUESTED_EVENT_TYPE,
  RECONCILIATION_SELF_VERIFY_SCREENSHOT_UPLOADED_EVENT_TYPE,
  RECONCILIATION_STATEMENT_UPLOADED_EVENT_TYPE,
} from './events.js';

/** The four kinds of open reconciliation case the queue surfaces (each closes a reserved Epic-9 seam). */
export type ReconciliationCaseType = 'mismatch' | 'self_verify' | 'manual_transcription' | 'takeover';

/** A resolved case's lifecycle status (queue rows are always `open`; the detail read can be any). */
export type ReconciliationCaseStatus = 'open' | 'confirmed' | 'rejected';

/** The standard contribution window in whole days (FR-22 Day-15 hard close) — the live-cycle proximity clock. */
export const CONTRIBUTION_STANDARD_WINDOW_DAYS = 15;

/** Defensive cap on the reconciling-cycle scan (a Pariwar never has this many live cycles at once). MUST
 *  match the `.limit(500)` literal below — the domain-accessor-invariants gate requires an inline integer
 *  literal there (not an identifier), so this constant exists only for the truncation-detection compare. */
const RECONCILING_CYCLE_SCAN_CAP = 500;

/** Default/cap for the returned queue length (mirrors the r9-voting / cycle-freeze queue ceiling). */
const QUEUE_DEFAULT_LIMIT = 50;
const QUEUE_MAX_LIMIT = 200;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** A logical-case key: `${poolId}:${memberId}` for member cases, `${poolId}` for pool-level cases. */
function memberCaseId(poolId: string, memberId: string): string {
  return `${poolId}:${memberId}`;
}

/** Build the stable synthetic case key (the detail + action path segment). */
export function buildCaseKey(caseType: ReconciliationCaseType, poolId: string, memberId: string | null): string {
  return `${caseType}:${poolId}:${memberId ?? ''}`;
}

/** Parse a case key back into its parts. Returns null on a malformed key. */
export function parseCaseKey(
  caseKey: string,
): { caseType: ReconciliationCaseType; poolId: string; memberId: string | null } | null {
  const parts = caseKey.split(':');
  if (parts.length !== 3) return null;
  const [caseType, poolId, memberRaw] = parts as [string, string, string];
  if (
    caseType !== 'mismatch' &&
    caseType !== 'self_verify' &&
    caseType !== 'manual_transcription' &&
    caseType !== 'takeover'
  ) {
    return null;
  }
  if (poolId.length === 0) return null;
  return { caseType, poolId, memberId: memberRaw.length > 0 ? memberRaw : null };
}

/** One open reconciliation case (queue row) — NON-PII provenance; the boundary assembles identity/URLs. */
export interface ReconciliationCaseRow {
  readonly caseKey: string;
  readonly caseType: ReconciliationCaseType;
  readonly poolId: PoolId;
  readonly alertId: AlertId | null;
  readonly memberId: string | null;
  /** The machine mismatch reason for a mismatch/self-verify case; null otherwise. */
  readonly mismatchReason: string | null;
  /** The derived reconciliation-tail deadline (calendar-aware); null when not derivable. */
  readonly deadlineAt: Date | null;
  /** When the latest case-marking event was raised. */
  readonly raisedAt: Date;
  /** The latest self-verify screenshot object key for this case (null if none) — the detail mints the URL. */
  readonly screenshotObjectKey: string | null;
}

export interface ListOpenReconciliationCasesResult {
  readonly rows: ReconciliationCaseRow[];
  /** True when the deadline-sorted set exceeded `limit` — the operator is told the list may be truncated. */
  readonly truncated: boolean;
}

interface CycleInfo {
  readonly cycleId: CycleFreezeCommitId;
  readonly alertId: AlertId;
  readonly currentState: string;
  /** The `alert.closed` instant (undefined while live). */
  closeInstant?: Date;
  /** The pool-open instant (earliest `pool.opened_for_contributions` across the cycle's pools). */
  poolOpenAt?: Date;
}

/**
 * List every OPEN reconciliation case in the Pariwar, ordered by deadline proximity (closest first) —
 * AC1. A case is OPEN iff it has no live confirmation AND no reject/close marker (via the existing
 * {@link hasLiveConfirmation} chain + the new reject marker). Case types:
 *   · mismatch / self_verify — a member's (pool, member) reconciliation is unresolved. MERGED per
 *     (pool, member): a mismatch with an attached self-verify screenshot is ONE case (type=mismatch,
 *     screenshot attached), never two rows. Per-logical-case dedup keeps the LATEST provenance
 *     (closes the 9.7 duplicate-self-verify-upload re-trigger).
 *   · manual_transcription — a pool-level staff-transcription request (closes the 9.3 duplicate-upload
 *     re-trigger: one row per pool, latest task).
 *   · takeover — a pool whose nominee has been disengaged ≥ N days (`computeStaffTakeover`).
 * Scoped to reconciling cycles (alerts in live/closed). Deadline-sorted, then clamped.
 */
export async function listOpenReconciliationCases(
  db: Db,
  {
    pariwarId,
    now,
    limit,
    holidayWindows,
    takeoverThresholdDays = DEFAULT_STAFF_TAKEOVER_THRESHOLD_DAYS,
  }: {
    readonly pariwarId: PariwarId;
    readonly now: Date;
    readonly limit?: number;
    /** The Pariwar's curated holiday windows (calendar-aware tail). Read once by the caller; [] = plain tail. */
    readonly holidayWindows?: readonly HolidayWindow[];
    readonly takeoverThresholdDays?: number;
  },
): Promise<ListOpenReconciliationCasesResult> {
  const windows = holidayWindows ?? [];

  // (1) The reconciling cycles: alerts in `live` / `closed`. `settled` is done; pre-live has no
  //     reconciliation yet. Bounded by a fixed literal cap (a Pariwar never has this many live at once).
  const alertRows = await db
    .select({ alertId: alerts.alertId, cycleId: alerts.cycleId, currentState: alerts.currentState })
    .from(alerts)
    .where(and(eq(alerts.pariwarId, pariwarId), inArray(alerts.currentState, ['live', 'closed'])))
    .limit(500);
  if (alertRows.length === 0) return { rows: [], truncated: false };
  // If the query itself hit the cap, cycles beyond it were never scanned — that must surface as truncation
  // even if the resulting (deduped, per-case) row count stays under the display limit below.
  const alertScanCapped = alertRows.length === RECONCILING_CYCLE_SCAN_CAP;

  const cycleByAlert = new Map<string, CycleInfo>();
  const cycleIdToAlert = new Map<string, AlertId>();
  for (const a of alertRows) {
    cycleByAlert.set(a.alertId, { cycleId: a.cycleId, alertId: a.alertId, currentState: a.currentState });
    cycleIdToAlert.set(a.cycleId, a.alertId);
  }

  // (2) The pools of those cycles → poolId ↦ alertId (the two-stream join key).
  const cycleIds = [...cycleIdToAlert.keys()] as CycleFreezeCommitId[];
  const poolRows = await db
    .select({ poolId: pools.poolId, cycleId: pools.cycleId })
    .from(pools)
    .where(and(eq(pools.pariwarId, pariwarId), inArray(pools.cycleId, cycleIds)));
  const poolToAlert = new Map<string, AlertId>();
  const poolIds: PoolId[] = [];
  for (const p of poolRows) {
    const alertId = cycleIdToAlert.get(p.cycleId);
    if (alertId === undefined) continue;
    poolToAlert.set(p.poolId, alertId);
    poolIds.push(p.poolId);
  }
  if (poolIds.length === 0) return { rows: [], truncated: false };

  const scannedStreamIds = [...new Set<string>([...cycleByAlert.keys(), ...poolIds])];

  // (3) ONE bounded scan over the reconciling streams for every case-marking + resolution + clock event.
  //     Bounded structurally by the reconciling stream set (no caller-controlled limit).
  const eventRows = await db
    .select({
      eventType: eventsLog.eventType,
      eventId: eventsLog.eventId,
      streamId: eventsLog.streamId,
      occurredAt: eventsLog.occurredAt,
      poolId: sql<string | null>`${eventsLog.payload} ->> ${CONFIRMED_PAYLOAD_POOL_KEY}`,
      memberId: sql<string | null>`${eventsLog.payload} ->> ${CONFIRMED_PAYLOAD_MEMBER_KEY}`,
      reason: sql<string | null>`${eventsLog.payload} ->> 'reason'`,
      mismatchReason: sql<string | null>`${eventsLog.payload} ->> 'mismatchReason'`,
      objectKey: sql<string | null>`${eventsLog.payload} ->> 'objectKey'`,
      uploadedByRole: sql<string | null>`${eventsLog.payload} ->> 'uploadedByRole'`,
      reversedConfirmedEventId: sql<string | null>`${eventsLog.payload} ->> ${REVERSED_CONFIRMED_EVENT_ID_KEY}`,
    })
    .from(eventsLog)
    .where(
      and(
        eq(eventsLog.pariwarId, pariwarId),
        inArray(eventsLog.streamId, scannedStreamIds),
        inArray(eventsLog.eventType, [
          CONTRIBUTION_MISMATCH_EVENT_TYPE,
          RECONCILIATION_SELF_VERIFY_SCREENSHOT_UPLOADED_EVENT_TYPE,
          RECONCILIATION_MANUAL_TRANSCRIPTION_REQUESTED_EVENT_TYPE,
          CONFIRMED_EVENT_TYPE,
          RECONCILIATION_CONTRIBUTION_REJECTED_EVENT_TYPE,
          // The reversal + clock events (deadline + takeover derivation); reject/confirmed above.
          'reconciliation.confirmation-reversed',
          POOL_OPENED_FOR_CONTRIBUTIONS_EVENT_TYPE,
          RECONCILIATION_STATEMENT_UPLOADED_EVENT_TYPE,
          'alert.closed',
        ]),
      ),
    );

  // (4) Fold the scan into per-(pool,member) member cases + per-pool cases + resolution/clock indexes.
  const confirmedEventIdsByMemberCase = new Map<string, string[]>();
  const reversedConfirmedEventIds = new Set<string>();
  const rejectedMemberCases = new Set<string>();
  const confirmedEventIdByMemberCase = new Map<string, string>(); // latest live confirmation (detail reverse target)

  interface MemberCaseAccum {
    poolId: string;
    memberId: string;
    hasMismatch: boolean;
    mismatchReason: string | null;
    raisedAt: Date;
    screenshotObjectKey: string | null;
    screenshotAt: Date | null;
  }
  const memberCases = new Map<string, MemberCaseAccum>();

  interface PoolCaseAccum {
    poolId: string;
    raisedAt: Date;
  }
  const transcriptionCases = new Map<string, PoolCaseAccum>();

  for (const r of eventRows) {
    const poolId = typeof r.poolId === 'string' && r.poolId.length > 0 ? r.poolId : r.streamId; // pool-stream events
    switch (r.eventType) {
      case CONFIRMED_EVENT_TYPE: {
        if (typeof r.memberId === 'string' && r.memberId.length > 0) {
          const key = memberCaseId(poolId, r.memberId);
          const ids = confirmedEventIdsByMemberCase.get(key);
          if (ids) ids.push(r.eventId);
          else confirmedEventIdsByMemberCase.set(key, [r.eventId]);
        }
        break;
      }
      case 'reconciliation.confirmation-reversed': {
        if (typeof r.reversedConfirmedEventId === 'string' && r.reversedConfirmedEventId.length > 0) {
          reversedConfirmedEventIds.add(r.reversedConfirmedEventId);
        }
        break;
      }
      case RECONCILIATION_CONTRIBUTION_REJECTED_EVENT_TYPE: {
        if (typeof r.memberId === 'string' && r.memberId.length > 0) {
          rejectedMemberCases.add(memberCaseId(poolId, r.memberId));
        }
        break;
      }
      case CONTRIBUTION_MISMATCH_EVENT_TYPE: {
        if (typeof r.memberId !== 'string' || r.memberId.length === 0) break;
        const key = memberCaseId(poolId, r.memberId);
        const acc = memberCases.get(key);
        if (acc === undefined) {
          memberCases.set(key, {
            poolId,
            memberId: r.memberId,
            hasMismatch: true,
            mismatchReason: r.reason ?? null,
            raisedAt: r.occurredAt,
            screenshotObjectKey: null,
            screenshotAt: null,
          });
        } else {
          acc.hasMismatch = true;
          if (r.occurredAt >= acc.raisedAt) {
            acc.raisedAt = r.occurredAt;
            acc.mismatchReason = r.reason ?? acc.mismatchReason;
          }
        }
        break;
      }
      case RECONCILIATION_SELF_VERIFY_SCREENSHOT_UPLOADED_EVENT_TYPE: {
        if (typeof r.memberId !== 'string' || r.memberId.length === 0) break;
        const key = memberCaseId(poolId, r.memberId);
        const acc = memberCases.get(key);
        if (acc === undefined) {
          memberCases.set(key, {
            poolId,
            memberId: r.memberId,
            hasMismatch: false,
            mismatchReason: r.mismatchReason ?? null,
            raisedAt: r.occurredAt,
            screenshotObjectKey: r.objectKey ?? null,
            screenshotAt: r.occurredAt,
          });
        } else {
          if (r.occurredAt >= acc.raisedAt) acc.raisedAt = r.occurredAt;
          // Per-logical-case dedup: keep the LATEST screenshot object key (9.7 re-trigger).
          if (acc.screenshotAt === null || r.occurredAt >= acc.screenshotAt) {
            acc.screenshotObjectKey = r.objectKey ?? acc.screenshotObjectKey;
            acc.screenshotAt = r.occurredAt;
          }
        }
        break;
      }
      case RECONCILIATION_MANUAL_TRANSCRIPTION_REQUESTED_EVENT_TYPE: {
        // Per-logical-case dedup: one row per pool, latest task (9.3 re-trigger).
        const acc = transcriptionCases.get(poolId);
        if (acc === undefined) transcriptionCases.set(poolId, { poolId, raisedAt: r.occurredAt });
        else if (r.occurredAt >= acc.raisedAt) acc.raisedAt = r.occurredAt;
        break;
      }
      case POOL_OPENED_FOR_CONTRIBUTIONS_EVENT_TYPE: {
        const alertId = poolToAlert.get(poolId);
        const cyc = alertId ? cycleByAlert.get(alertId) : undefined;
        if (cyc && (cyc.poolOpenAt === undefined || r.occurredAt < cyc.poolOpenAt)) cyc.poolOpenAt = r.occurredAt;
        break;
      }
      case 'alert.closed': {
        const cyc = cycleByAlert.get(r.streamId);
        if (cyc && (cyc.closeInstant === undefined || r.occurredAt > cyc.closeInstant)) cyc.closeInstant = r.occurredAt;
        break;
      }
      default:
        break;
    }
  }

  // Track nominee-engagement heartbeat for takeover (latest nominee statement-upload per pool).
  const lastNomineeEngagedAt = new Map<string, Date>();
  for (const r of eventRows) {
    if (r.eventType !== RECONCILIATION_STATEMENT_UPLOADED_EVENT_TYPE) continue;
    if (r.uploadedByRole !== 'nominee') continue;
    const poolId = typeof r.poolId === 'string' && r.poolId.length > 0 ? r.poolId : r.streamId;
    const prev = lastNomineeEngagedAt.get(poolId);
    if (prev === undefined || r.occurredAt > prev) lastNomineeEngagedAt.set(poolId, r.occurredAt);
  }
  // Latest live confirmation per member-case (detail reverse target).
  for (const [key, ids] of confirmedEventIdsByMemberCase) {
    for (const id of ids) {
      if (!reversedConfirmedEventIds.has(id)) confirmedEventIdByMemberCase.set(key, id);
    }
  }

  // (5) Deadline per cycle (D4): closed → calendar-aware tail; live → expected Day-15 close.
  const deadlineByAlert = new Map<string, Date | null>();
  for (const cyc of cycleByAlert.values()) {
    deadlineByAlert.set(cyc.alertId, deriveCaseDeadline(cyc, windows));
  }

  // (6) Emit rows. Member cases that are neither live-confirmed nor rejected are OPEN.
  const rows: ReconciliationCaseRow[] = [];

  for (const [key, acc] of memberCases) {
    const confirmedIds = confirmedEventIdsByMemberCase.get(key) ?? [];
    if (hasLiveConfirmation(confirmedIds, reversedConfirmedEventIds)) continue; // resolved: confirmed
    if (rejectedMemberCases.has(key)) continue; // resolved: rejected/closed
    const alertId = poolToAlert.get(acc.poolId) ?? null;
    const caseType: ReconciliationCaseType = acc.hasMismatch ? 'mismatch' : 'self_verify';
    rows.push({
      caseKey: buildCaseKey(caseType, acc.poolId, acc.memberId),
      caseType,
      poolId: acc.poolId as PoolId,
      alertId,
      memberId: acc.memberId,
      mismatchReason: acc.mismatchReason,
      deadlineAt: alertId ? (deadlineByAlert.get(alertId) ?? null) : null,
      raisedAt: acc.raisedAt,
      screenshotObjectKey: acc.screenshotObjectKey,
    });
  }

  for (const [poolId, acc] of transcriptionCases) {
    const alertId = poolToAlert.get(poolId) ?? null;
    rows.push({
      caseKey: buildCaseKey('manual_transcription', poolId, null),
      caseType: 'manual_transcription',
      poolId: poolId as PoolId,
      alertId,
      memberId: null,
      mismatchReason: null,
      deadlineAt: alertId ? (deadlineByAlert.get(alertId) ?? null) : null,
      raisedAt: acc.raisedAt,
      screenshotObjectKey: null,
    });
  }

  // Takeover cases: a reconciling pool whose nominee has been disengaged ≥ N days.
  for (const poolId of poolIds) {
    const alertId = poolToAlert.get(poolId);
    const cyc = alertId ? cycleByAlert.get(alertId) : undefined;
    if (cyc?.poolOpenAt === undefined) continue; // no clock origin → cannot derive takeover
    const verdict = computeStaffTakeover({
      lastEngagedAt: lastNomineeEngagedAt.get(poolId) ?? null,
      poolOpenAt: cyc.poolOpenAt,
      thresholdDays: takeoverThresholdDays,
      now,
    });
    if (!verdict.takeoverEligible) continue;
    rows.push({
      caseKey: buildCaseKey('takeover', poolId, null),
      caseType: 'takeover',
      poolId: poolId as PoolId,
      alertId: alertId ?? null,
      memberId: null,
      mismatchReason: null,
      deadlineAt: alertId ? (deadlineByAlert.get(alertId) ?? null) : null,
      raisedAt: verdict.effectiveLastEngagedAt,
      screenshotObjectKey: null,
    });
  }

  // (7) Sort by deadline proximity ascending (nulls last), tiebreak raisedAt asc then caseKey asc; clamp.
  rows.sort((a, b) => {
    const da = a.deadlineAt?.getTime() ?? Number.POSITIVE_INFINITY;
    const dbb = b.deadlineAt?.getTime() ?? Number.POSITIVE_INFINITY;
    if (da !== dbb) return da - dbb;
    const ra = a.raisedAt.getTime();
    const rb = b.raisedAt.getTime();
    if (ra !== rb) return ra - rb;
    return a.caseKey < b.caseKey ? -1 : a.caseKey > b.caseKey ? 1 : 0;
  });

  const effectiveLimit = clampLimit(limit, { default: QUEUE_DEFAULT_LIMIT, cap: QUEUE_MAX_LIMIT });
  const truncated = alertScanCapped || rows.length > effectiveLimit;
  return { rows: rows.slice(0, effectiveLimit), truncated };
}

/** Derive a cycle's reconciliation deadline (D4). Closed → calendar-aware tail; live → expected Day-15 close. */
function deriveCaseDeadline(cyc: CycleInfo, windows: readonly HolidayWindow[]): Date | null {
  if (cyc.closeInstant !== undefined) {
    // The window year is resolved inside reconciliationTailDeadline; pass the Pariwar's curated set.
    return reconciliationTailDeadline(cyc.closeInstant, windows).tailDeadlineAt;
  }
  if (cyc.poolOpenAt !== undefined) {
    // Still live: the proximity clock is the expected Day-15 hard close (FR-22).
    return new Date(cyc.poolOpenAt.getTime() + CONTRIBUTION_STANDARD_WINDOW_DAYS * MS_PER_DAY);
  }
  return null;
}

// ── The per-case detail assembler (AC2) ────────────────────────────────────────────────────────────────

/** A bank-statement entry near the case window (amounts are integer paise; date is the raw string date). */
export interface CaseBankEntry {
  readonly entryId: string;
  readonly amountPaise: number;
  readonly valueDate: string | null;
  readonly transactionIdUtr: string | null;
}

/** A provenance note surfaced on the case (statement-upload / manual-transcription context). */
export interface CaseNote {
  readonly kind: string;
  readonly at: Date;
  readonly detail: string | null;
}

/** The raw one-screen review context (AC2). Identity decryption + the screenshot signed URL are the
 *  apps/api boundary's job — this primitive is transport-free + decryption-free. */
export interface ReconciliationCaseDetail {
  readonly caseKey: string;
  readonly caseType: ReconciliationCaseType;
  readonly status: ReconciliationCaseStatus;
  readonly poolId: PoolId;
  readonly alertId: AlertId | null;
  readonly memberId: string | null;
  readonly mismatchReason: string | null;
  readonly deadlineAt: Date | null;
  readonly raisedAt: Date | null;
  /** The member's UTR attestation for this cycle, if any (member cases only). */
  readonly attestation: {
    readonly utr: string | null;
    readonly attestedAt: Date | null;
    readonly expectedAmountInr: number | null;
  } | null;
  readonly bankEntries: CaseBankEntry[];
  /** The latest self-verify screenshot object key (member cases); null if none. The boundary mints the URL. */
  readonly screenshotObjectKey: string | null;
  readonly notes: CaseNote[];
  /** The live confirmed event id — the reverse target (AC6). Non-null only for a `confirmed` case. */
  readonly confirmedEventId: string | null;
}

/**
 * Assemble ONE case's full review context (AC2). Resolves the case's cycle (pool → alert), the member's
 * attestation + the pool's expected amount, the pool's bank-statement entries, the latest self-verify
 * screenshot key, provenance notes, and the case status (confirmed/rejected/open + the reverse target).
 * Works for a confirmed case too (NOT in the open queue) so the `reverse` action can reach it (AC6). Returns
 * `null` when the pool is absent in this Pariwar. Compound-read failure is the caller's posture: each section
 * degrades independently (a null field = "unavailable"), never a throw.
 */
export async function getReconciliationCaseDetail(
  db: Db,
  {
    pariwarId,
    caseKey,
    holidayWindows,
  }: {
    readonly pariwarId: PariwarId;
    readonly caseKey: string;
    readonly holidayWindows?: readonly HolidayWindow[];
  },
): Promise<ReconciliationCaseDetail | null> {
  const parsed = parseCaseKey(caseKey);
  if (parsed === null) return null;
  const { caseType, poolId, memberId } = parsed;
  const windows = holidayWindows ?? [];

  // The pool's cycle + amount context (also the existence check).
  const poolCtx = await getPoolContributionContext(db, pariwarId, poolId as PoolId);
  if (poolCtx === null) return null;

  // The cycle's alert + its live/closed instants (for the deadline).
  const [alertRow] = await db
    .select({ alertId: alerts.alertId, currentState: alerts.currentState })
    .from(alerts)
    .where(and(eq(alerts.pariwarId, pariwarId), eq(alerts.cycleId, poolCtx.cycleId)))
    .limit(1);
  const alertId = alertRow?.alertId ?? null;

  // Resolve close instant (deadline) + the case markers/attestation/screenshot from one scan of the streams.
  const streamIds = [poolId, ...(alertId ? [alertId] : [])];
  const rows = await db
    .select({
      eventType: eventsLog.eventType,
      eventId: eventsLog.eventId,
      streamId: eventsLog.streamId,
      occurredAt: eventsLog.occurredAt,
      pPoolId: sql<string | null>`${eventsLog.payload} ->> ${CONFIRMED_PAYLOAD_POOL_KEY}`,
      pMemberId: sql<string | null>`${eventsLog.payload} ->> ${CONFIRMED_PAYLOAD_MEMBER_KEY}`,
      utr: sql<string | null>`${eventsLog.payload} ->> 'utr'`,
      reason: sql<string | null>`${eventsLog.payload} ->> 'reason'`,
      mismatchReason: sql<string | null>`${eventsLog.payload} ->> 'mismatchReason'`,
      objectKey: sql<string | null>`${eventsLog.payload} ->> 'objectKey'`,
      reversedConfirmedEventId: sql<string | null>`${eventsLog.payload} ->> ${REVERSED_CONFIRMED_EVENT_ID_KEY}`,
    })
    .from(eventsLog)
    .where(
      and(
        eq(eventsLog.pariwarId, pariwarId),
        inArray(eventsLog.streamId, streamIds),
        inArray(eventsLog.eventType, [
          CONTRIBUTION_UTR_ATTESTED_EVENT_TYPE,
          CONTRIBUTION_MISMATCH_EVENT_TYPE,
          RECONCILIATION_SELF_VERIFY_SCREENSHOT_UPLOADED_EVENT_TYPE,
          RECONCILIATION_MANUAL_TRANSCRIPTION_REQUESTED_EVENT_TYPE,
          RECONCILIATION_STATEMENT_UPLOADED_EVENT_TYPE,
          CONFIRMED_EVENT_TYPE,
          RECONCILIATION_CONTRIBUTION_REJECTED_EVENT_TYPE,
          'reconciliation.confirmation-reversed',
          'alert.closed',
        ]),
      ),
    );

  let closeInstant: Date | undefined;
  let attestationUtr: string | null = null;
  let attestationAt: Date | null = null;
  let mismatchReason: string | null = null;
  let raisedAt: Date | null = null;
  let screenshotObjectKey: string | null = null;
  let screenshotAt: Date | null = null;
  let rejected = false;
  const confirmedIds: string[] = [];
  const reversedIds = new Set<string>();
  const confirmedLiveIds: string[] = [];
  const notes: CaseNote[] = [];

  // A pool-level case (memberId === null: takeover/manual_transcription) has NO member-scoped provenance
  // of its own — it must never fold another member's mismatch/screenshot/confirmed/rejected events off the
  // shared alert/pool stream (a cross-member data leak + a false confirmed/rejected status for this case).
  const belongsToMember = (rowMember: string | null): boolean =>
    memberId !== null && typeof rowMember === 'string' && rowMember === memberId;

  for (const r of rows) {
    switch (r.eventType) {
      case 'alert.closed':
        if (closeInstant === undefined || r.occurredAt > closeInstant) closeInstant = r.occurredAt;
        break;
      case CONTRIBUTION_UTR_ATTESTED_EVENT_TYPE:
        if (belongsToMember(r.pMemberId) && (attestationAt === null || r.occurredAt >= attestationAt)) {
          attestationUtr = r.utr ?? attestationUtr;
          attestationAt = r.occurredAt;
        }
        break;
      case CONTRIBUTION_MISMATCH_EVENT_TYPE:
        if (belongsToMember(r.pMemberId)) {
          mismatchReason = r.reason ?? mismatchReason;
          if (raisedAt === null || r.occurredAt >= raisedAt) raisedAt = r.occurredAt;
        }
        break;
      case RECONCILIATION_SELF_VERIFY_SCREENSHOT_UPLOADED_EVENT_TYPE:
        if (belongsToMember(r.pMemberId)) {
          if (screenshotAt === null || r.occurredAt >= screenshotAt) {
            screenshotObjectKey = r.objectKey ?? screenshotObjectKey;
            screenshotAt = r.occurredAt;
          }
          if (mismatchReason === null) mismatchReason = r.mismatchReason ?? null;
          if (raisedAt === null || r.occurredAt >= raisedAt) raisedAt = r.occurredAt;
        }
        break;
      case RECONCILIATION_MANUAL_TRANSCRIPTION_REQUESTED_EVENT_TYPE:
        notes.push({ kind: 'manual_transcription', at: r.occurredAt, detail: r.reason ?? null });
        if (raisedAt === null || r.occurredAt >= raisedAt) raisedAt = r.occurredAt;
        break;
      case RECONCILIATION_STATEMENT_UPLOADED_EVENT_TYPE:
        notes.push({ kind: 'statement_uploaded', at: r.occurredAt, detail: null });
        break;
      case CONFIRMED_EVENT_TYPE:
        if (belongsToMember(r.pMemberId)) confirmedIds.push(r.eventId);
        break;
      case 'reconciliation.confirmation-reversed':
        if (typeof r.reversedConfirmedEventId === 'string' && r.reversedConfirmedEventId.length > 0) {
          reversedIds.add(r.reversedConfirmedEventId);
        }
        break;
      case RECONCILIATION_CONTRIBUTION_REJECTED_EVENT_TYPE:
        if (belongsToMember(r.pMemberId)) rejected = true;
        break;
      default:
        break;
    }
  }
  for (const id of confirmedIds) if (!reversedIds.has(id)) confirmedLiveIds.push(id);
  const confirmed = hasLiveConfirmation(confirmedIds, reversedIds);
  const status: ReconciliationCaseStatus = confirmed ? 'confirmed' : rejected ? 'rejected' : 'open';

  // Bank entries for the pool (integer paise). Bounded by the cycle's uploaded statements.
  let bankEntries: CaseBankEntry[] = [];
  try {
    const entries = await listEntriesForPools(db, { pariwarId, poolIds: [poolId as PoolId] });
    bankEntries = entries.map((e) => ({
      entryId: e.entryId,
      amountPaise: e.amount,
      valueDate: e.transactionDate ?? null,
      transactionIdUtr: e.transactionIdUtr ?? null,
    }));
  } catch {
    bankEntries = []; // section degrades to empty — never a throw (the AR-45 compound-read posture)
  }

  const deadlineAt =
    closeInstant !== undefined
      ? reconciliationTailDeadline(closeInstant, windows).tailDeadlineAt
      : null;

  const attestation =
    memberId === null
      ? null
      : { utr: attestationUtr, attestedAt: attestationAt, expectedAmountInr: poolCtx.fixedAmount };

  return {
    caseKey,
    caseType,
    status,
    poolId: poolId as PoolId,
    alertId,
    memberId,
    mismatchReason,
    deadlineAt,
    raisedAt,
    attestation,
    bankEntries,
    screenshotObjectKey,
    notes: notes.sort((a, b) => a.at.getTime() - b.at.getTime()),
    confirmedEventId: confirmed ? (confirmedLiveIds[0] ?? null) : null,
  };
}
