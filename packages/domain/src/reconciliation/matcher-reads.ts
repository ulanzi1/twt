// Matcher input reads — Story 9.4 (Task 3; AC1/AC2/AC5). The DB-scoped reads the apps/jobs matcher worker
// loads before calling the pure `matchPool` engine, plus the monotonic-confirmation pre-read (AC5a).
//
// All reads are tenant-scoped (RLS + an explicit `pariwar_id` predicate) and live in @twt/domain (it owns
// events_log + the pools/alerts tables; it cannot import @twt/events — the turbo cycle, the read.ts/member
// precedent). The worker owns the EVENT APPENDS (via @twt/events) + the AR-45 blob fetch; this module is
// transport-free.

import { and, asc, eq, inArray, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { AlertId, ClaimId, CycleFreezeCommitId, PariwarId, PoolId } from '../ids/index.js';
import { alerts, type AlertLifecycleState } from '../schema/alerts.js';
import { pools } from '../schema/pools.js';
import { eventsLog } from '../schema/events_log.js';
import { CONFIRMED_EVENT_TYPE, CONFIRMED_PAYLOAD_MEMBER_KEY, CONFIRMED_PAYLOAD_POOL_KEY } from '../contribution/read.js';
import { CONTRIBUTION_MISMATCH_EVENT_TYPE } from '../contribution/history.js';
import { CONTRIBUTION_UTR_ATTESTED_EVENT_TYPE } from '../contribution/write.js';
import {
  RECONCILIATION_STATEMENT_UPLOADED_EVENT_TYPE,
} from './events.js';
import type { MatcherAttestation } from './matcher.js';

/** The cycle's alert (the contribution-window anchor). The matcher only works LIVE alerts (AC1 cron scope). */
export interface CycleAlert {
  readonly alertId: AlertId;
  readonly currentState: AlertLifecycleState;
}

/**
 * Resolve the cycle's alert (1:1 with the cycle via the `alerts_cycle_id_uq` index). `null` when no alert has
 * been minted yet (a cycle whose cycle-open trigger has not run). The worker checks `currentState === 'live'`
 * before doing any matching work — a producer-less/alert-less tick is a cheap no-op (AC1 cron scope note).
 */
export async function getCycleAlert(
  db: Db,
  { pariwarId, cycleId }: { readonly pariwarId: PariwarId; readonly cycleId: CycleFreezeCommitId },
): Promise<CycleAlert | null> {
  const rows = await db
    .select({ alertId: alerts.alertId, currentState: alerts.currentState })
    .from(alerts)
    .where(and(eq(alerts.pariwarId, pariwarId), eq(alerts.cycleId, cycleId)))
    .limit(1);
  const row = rows[0];
  return row ? { alertId: row.alertId, currentState: row.currentState } : null;
}

/** A pool in the cycle + its amount-lock — the matcher's per-pool `fixedAmount` (whole INR, Story 7.5). */
export interface CyclePool {
  readonly poolId: PoolId;
  readonly claimCaseId: ClaimId;
  readonly fixedAmount: number;
  /** The pool's canonical identifier — a stable, NON-PII reference the D6 confirmed-notify seam surfaces. */
  readonly poolCanonicalIdentifier: string;
}

/**
 * List the cycle's pools + each pool's snapshotted `fixed_amount` (the amount-lock) + originating claim +
 * canonical identifier. Tenant-scoped. Ordered by pool_id for a stable, replay-deterministic set.
 */
export async function listCyclePools(
  db: Db,
  { pariwarId, cycleId }: { readonly pariwarId: PariwarId; readonly cycleId: CycleFreezeCommitId },
): Promise<CyclePool[]> {
  const rows = await db
    .select({
      poolId: pools.poolId,
      claimCaseId: pools.claimCaseId,
      fixedAmount: pools.fixedAmount,
      poolCanonicalIdentifier: pools.poolCanonicalIdentifier,
    })
    .from(pools)
    .where(and(eq(pools.pariwarId, pariwarId), eq(pools.cycleId, cycleId)))
    .orderBy(asc(pools.poolId));
  return rows.map((r) => ({
    poolId: r.poolId,
    claimCaseId: r.claimCaseId,
    fixedAmount: r.fixedAmount,
    poolCanonicalIdentifier: r.poolCanonicalIdentifier,
  }));
}

/** A statement-uploaded provenance record — the matcher re-reads the blob at `objectKey` to re-parse it. */
export interface StatementUpload {
  /** The reconciliation.statement-uploaded events_log event id (the persisted entries' provenance). */
  readonly statementEventId: string;
  readonly poolId: PoolId;
  readonly claimCaseId: ClaimId;
  readonly bankCode: string;
  readonly objectKey: string;
  /** Whether the CSV normalized into ≥1 entry inline (a `false`/fallback upload has no parseable entries). */
  readonly parsed: boolean;
}

/**
 * List a pool's `reconciliation.statement-uploaded` events (on the POOL stream — Story 9.3 Decision D6) —
 * the matcher's input index: the object keys it re-reads + re-parses (Task 2). Only `parsed: true` uploads
 * carry matchable entries; the worker skips the rest. Ordered by event version (deterministic replay).
 */
export async function listPoolStatementUploads(
  db: Db,
  { pariwarId, poolId }: { readonly pariwarId: PariwarId; readonly poolId: PoolId },
): Promise<StatementUpload[]> {
  const rows = await db
    .select({
      statementEventId: eventsLog.eventId,
      poolId: sql<string | null>`${eventsLog.payload} ->> 'poolId'`,
      claimCaseId: sql<string | null>`${eventsLog.payload} ->> 'claimCaseId'`,
      bankCode: sql<string | null>`${eventsLog.payload} ->> 'bankCode'`,
      objectKey: sql<string | null>`${eventsLog.payload} ->> 'objectKey'`,
      parsed: sql<boolean | null>`(${eventsLog.payload} ->> 'parsed')::boolean`,
    })
    .from(eventsLog)
    .where(
      and(
        eq(eventsLog.pariwarId, pariwarId),
        eq(eventsLog.streamId, poolId),
        eq(eventsLog.eventType, RECONCILIATION_STATEMENT_UPLOADED_EVENT_TYPE),
      ),
    )
    .orderBy(asc(eventsLog.eventVersion));
  const out: StatementUpload[] = [];
  for (const r of rows) {
    if (
      typeof r.poolId !== 'string' ||
      typeof r.claimCaseId !== 'string' ||
      typeof r.bankCode !== 'string' ||
      typeof r.objectKey !== 'string'
    ) {
      continue; // a malformed provenance row can never re-parse to a real blob — drop it (never a crash).
    }
    out.push({
      statementEventId: r.statementEventId,
      poolId: r.poolId as PoolId,
      claimCaseId: r.claimCaseId as ClaimId,
      bankCode: r.bankCode,
      objectKey: r.objectKey,
      parsed: r.parsed === true,
    });
  }
  return out;
}

/**
 * List the cycle's UTR attestations (on the ALERT stream — Story 8.4), projected to the pure-matcher
 * `MatcherAttestation` shape. The worker groups these by `poolId` and calls `matchPool` per pool. Malformed
 * attestations (missing poolId/memberId/tr/utr) are dropped (integrity anomaly, never a blank verdict).
 * Ordered by event id for a stable set. Tenant-scoped.
 */
export async function listAlertAttestations(
  db: Db,
  { pariwarId, alertId }: { readonly pariwarId: PariwarId; readonly alertId: AlertId },
): Promise<MatcherAttestation[]> {
  const rows = await db
    .select({
      attestationEventId: eventsLog.eventId,
      memberId: sql<string | null>`${eventsLog.payload} ->> ${CONFIRMED_PAYLOAD_MEMBER_KEY}`,
      poolId: sql<string | null>`${eventsLog.payload} ->> ${CONFIRMED_PAYLOAD_POOL_KEY}`,
      tr: sql<string | null>`${eventsLog.payload} ->> 'tr'`,
      utr: sql<string | null>`${eventsLog.payload} ->> 'utr'`,
    })
    .from(eventsLog)
    .where(
      and(
        eq(eventsLog.pariwarId, pariwarId),
        eq(eventsLog.streamId, alertId),
        eq(eventsLog.eventType, CONTRIBUTION_UTR_ATTESTED_EVENT_TYPE),
      ),
    )
    .orderBy(asc(eventsLog.eventId));
  const out: MatcherAttestation[] = [];
  for (const r of rows) {
    if (
      typeof r.memberId !== 'string' ||
      typeof r.poolId !== 'string' ||
      typeof r.tr !== 'string' ||
      typeof r.utr !== 'string' ||
      r.memberId.length === 0 ||
      r.poolId.length === 0 ||
      r.utr.length === 0
    ) {
      continue;
    }
    out.push({
      attestationEventId: r.attestationEventId,
      memberId: r.memberId,
      poolId: r.poolId,
      alertId,
      tr: r.tr,
      utr: r.utr,
    });
  }
  return out;
}

/** The set of `(pool, member)` pairs already carrying a verdict on the alert stream (prior runs). */
export interface ExistingVerdictKeys {
  /** `${poolId}:${memberId}` keys with a `contribution.confirmed` (the monotonic guard input, AC5a). */
  readonly confirmed: ReadonlySet<string>;
  /** `${poolId}:${memberId}:${reason}` keys with a `contribution.reconciliation-mismatch` (the dedup guard
   *  input) — keyed by REASON too, so a member re-flagged with a NEW reason on a later tick re-emits instead
   *  of being silently absorbed by a stale, different-reason mismatch. */
  readonly mismatched: ReadonlySet<string>;
}

/**
 * Compose the batched-verdict key from a pool + member (+ optionally a mismatch reason). The monotonic
 * confirmed-guard never carries a reason (a confirmation has none); the mismatch dedup guard keys on
 * `(pool, member, reason)` so a CHANGED reason on a later tick is a distinct key, not a stale no-op.
 */
export function verdictKey(poolId: string, memberId: string, reason?: string): string {
  return reason === undefined ? `${poolId}:${memberId}` : `${poolId}:${memberId}:${reason}`;
}

/**
 * Batch-load the `(pool, member)` verdict keys already emitted on the alert stream (AC5a monotonic guard +
 * the mismatch dedup guard) — ONE query over the two verdict event types, so the worker does not round-trip
 * per member at 4L scale. `confirmed` drives the monotonic no-op (skip ALL re-emits for an already-confirmed
 * member — never a red-after-green); `mismatched` drives mismatch dedup keyed on `(pool, member, reason)` — a
 * member already flagged for THIS reason is not re-flagged every tick, but a NEW reason (e.g. a later tick's
 * `amount_mismatch` after an earlier `wrong_pool`) re-emits. Tenant-scoped. Malformed rows are dropped.
 */
export async function listExistingVerdictKeys(
  db: Db,
  { pariwarId, alertId }: { readonly pariwarId: PariwarId; readonly alertId: AlertId },
): Promise<ExistingVerdictKeys> {
  const rows = await db
    .select({
      eventType: eventsLog.eventType,
      poolId: sql<string | null>`${eventsLog.payload} ->> ${CONFIRMED_PAYLOAD_POOL_KEY}`,
      memberId: sql<string | null>`${eventsLog.payload} ->> ${CONFIRMED_PAYLOAD_MEMBER_KEY}`,
      reason: sql<string | null>`${eventsLog.payload} ->> 'reason'`,
    })
    .from(eventsLog)
    .where(
      and(
        eq(eventsLog.pariwarId, pariwarId),
        eq(eventsLog.streamId, alertId),
        sql`${eventsLog.eventType} IN (${CONFIRMED_EVENT_TYPE}, ${CONTRIBUTION_MISMATCH_EVENT_TYPE})`,
      ),
    );
  const confirmed = new Set<string>();
  const mismatched = new Set<string>();
  for (const r of rows) {
    if (typeof r.poolId !== 'string' || typeof r.memberId !== 'string' || r.poolId.length === 0 || r.memberId.length === 0) {
      continue;
    }
    if (r.eventType === CONFIRMED_EVENT_TYPE) {
      confirmed.add(verdictKey(r.poolId, r.memberId));
    } else if (typeof r.reason === 'string' && r.reason.length > 0) {
      mismatched.add(verdictKey(r.poolId, r.memberId, r.reason));
    }
  }
  return { confirmed, mismatched };
}

/**
 * The set of bank-statement `entry_id`s already bound to a `contribution.confirmed` on this alert stream
 * (extracted from each confirmation's `matchProvenance.bankStatementEntryId`). The matcher's entry-exclusivity
 * spine ACROSS ticks: an entry a prior tick already confirmed can never back a second, different member's
 * confirmation on a later tick — the pure `matchPool` engine treats these as pre-claimed (`claimedEntryIds`)
 * and reports any attestation resolving to one as `entry_already_claimed`, never a second confirmation.
 */
export async function listConfirmedEntryIds(
  db: Db,
  { pariwarId, alertId }: { readonly pariwarId: PariwarId; readonly alertId: AlertId },
): Promise<ReadonlySet<string>> {
  const rows = await db
    .select({
      entryId: sql<string | null>`${eventsLog.payload} -> 'matchProvenance' ->> 'bankStatementEntryId'`,
    })
    .from(eventsLog)
    .where(
      and(
        eq(eventsLog.pariwarId, pariwarId),
        eq(eventsLog.streamId, alertId),
        eq(eventsLog.eventType, CONFIRMED_EVENT_TYPE),
      ),
    );
  const out = new Set<string>();
  for (const r of rows) {
    if (typeof r.entryId === 'string' && r.entryId.length > 0) out.add(r.entryId);
  }
  return out;
}

/** The AC2 secondary timestamp window, resolved from the alert's OWN lifecycle (no new config). */
export interface AlertLiveWindow {
  /** The `alert.live` event's occurredAt (contribution window opened) — undefined if never observed. */
  readonly startInclusive?: string;
  /** The `alert.closed` event's occurredAt (contribution window closed) — undefined while still live. */
  readonly endInclusive?: string;
}

/**
 * Resolve the AC2 secondary timestamp window from the alert's OWN lifecycle events (`alert.live` →
 * `alert.closed`) rather than a new config constant — a deposit must fall within the alert's own live period.
 * An alert still `live` (no `alert.closed` yet) resolves an open-ended window (`endInclusive` undefined —
 * `inWindow` treats an absent bound as unbounded on that side). Tenant-scoped.
 */
export async function resolveAlertLiveWindow(
  db: Db,
  { pariwarId, alertId }: { readonly pariwarId: PariwarId; readonly alertId: AlertId },
): Promise<AlertLiveWindow> {
  const rows = await db
    .select({ eventType: eventsLog.eventType, occurredAt: eventsLog.occurredAt })
    .from(eventsLog)
    .where(
      and(
        eq(eventsLog.pariwarId, pariwarId),
        eq(eventsLog.streamId, alertId),
        inArray(eventsLog.eventType, ['alert.live', 'alert.closed']),
      ),
    );
  let startInclusive: string | undefined;
  let endInclusive: string | undefined;
  for (const r of rows) {
    const iso = r.occurredAt.toISOString();
    if (r.eventType === 'alert.live' && (startInclusive === undefined || iso < startInclusive)) {
      startInclusive = iso;
    }
    if (r.eventType === 'alert.closed' && (endInclusive === undefined || iso > endInclusive)) {
      endInclusive = iso;
    }
  }
  return { startInclusive, endInclusive };
}

/**
 * The monotonic-confirmation PRE-READ (AC5a): does a `contribution.confirmed` already exist for this
 * `(member, pool)`? Keyed on the load-bearing forward-contract payload keys (poolId + memberId). When true,
 * the worker SHORT-CIRCUITS — a re-run over an already-confirmed contribution emits nothing (idempotent
 * no-op). This is what makes "confirmation only moves forward" true ACROSS runs (the keyed-store claim
 * covers concurrent ticks within a run). Tenant-scoped.
 */
export async function hasConfirmedContribution(
  db: Db,
  {
    pariwarId,
    poolId,
    memberId,
  }: { readonly pariwarId: PariwarId; readonly poolId: string; readonly memberId: string },
): Promise<boolean> {
  const rows = await db
    .select({ eventId: eventsLog.eventId })
    .from(eventsLog)
    .where(
      and(
        eq(eventsLog.pariwarId, pariwarId),
        eq(eventsLog.eventType, CONFIRMED_EVENT_TYPE),
        sql`${eventsLog.payload} ->> ${CONFIRMED_PAYLOAD_POOL_KEY} = ${poolId}`,
        sql`${eventsLog.payload} ->> ${CONFIRMED_PAYLOAD_MEMBER_KEY} = ${memberId}`,
      ),
    )
    .limit(1);
  return rows.length > 0;
}
