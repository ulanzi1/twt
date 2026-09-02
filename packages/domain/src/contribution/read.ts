// Confirmed-contributor read accessors — Story 8.3 (Task 1; AC1/AC2).
//
// The Live Contributor List reads CONFIRMED contributions and nothing else. `listConfirmedContributorsForPool`
// is the load-bearing read: "who has a RECONCILIATION-CONFIRMED contribution in this pool?" — every member
// carried by a `contribution.confirmed` event scoped to the pool. A transport-free PRIMITIVE: NO HTTP, NO
// decryption — the apps/api boundary decrypts each returned member's own KYC name to first-name + last-initial.
//
// ── The confirmed-only invariant is the ENTIRE point of this read (D1) ──────────────────────────────────
// Contributor visibility derives EXCLUSIVELY from `contribution.confirmed` (green-pill, Epic 9's producer).
// A yellow / self-attested / pending contribution (Story 8.4's `contribution.utr-attested`) is a member's
// CLAIM that they paid — not confirmed money — and must NEVER appear here. The guard is STRUCTURAL: this
// function has NO `status` / `state` parameter that could admit a non-confirmed row; it hard-filters
// `event_type = 'contribution.confirmed'` in the query. Yellow is structurally unable to reach this list —
// encoded NOW, before 8.4 introduces yellow and before Epic 9 introduces green, so the leak is impossible
// the moment either lands (epics.md:2911-2915).
//
// ── Honestly empty today (D2) ───────────────────────────────────────────────────────────────────────────
// Epic 9 owns the `contribution.confirmed` producer and is unbuilt, so this returns `[]` right now. That is
// CORRECT and honest, not a stub to fake ([[feedback_record_unattested_no_backfill]]). When Epic 9 lands and
// emits `contribution.confirmed`, this surface populates with ZERO code changes here (the 8.1→8.2
// "read the projection the producer will fill" pattern).
//
// ── The forward read↔producer PAYLOAD CONTRACT (Epic 9) ─────────────────────────────────────────────────
// This read DEFINES the shape Epic 9's `contribution.confirmed` producer MUST emit so the list populates:
//   payload.poolId   — the pool the confirmed contribution belongs to (the scope key; poolId is 1:1 with a
//                       cycle, so it alone authoritatively scopes the read)
//   payload.memberId — the CONTRIBUTING member (whose own KYC name the boundary decrypts to first+last-initial)
// Epic 9's producer story is the counterparty; this header + the `CONFIRMED_EVENT_TYPE` / payload-key
// constants below are the contract of record. The domain reads `events_log` DIRECTLY (domain owns the table,
// cannot import `@twt/events` — the cycle; see member/read.ts + project.ts headers,
// [[project_member_lifecycle_domain_substrate]]). There is NO `contributions` projection table and 8.3 does
// NOT create one — that substrate is Epic 9's (D10).
//
// ── Decrypt-cost seam (D5) ──────────────────────────────────────────────────────────────────────────────
// This returns member IDs only. The apps/api boundary decrypts each confirmed member's Tier-1 KMS name
// per-request. Today: 0 confirmed → 0 decrypts. Once Epic 9 populates: up to the confirmed-subset size
// (≪ roster early in a cycle) decrypts per read. Flagged as a batch-decrypt + short-TTL read-model-cache
// seam (NEVER a plaintext cache at rest — [[project_validity_cache_failopen_pattern]]); the Sahyog Vivran
// public render (Epic 11b) is where it actually bites (not member-session-gated). Do NOT build the cache here.

import { and, eq, inArray, or, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { AlertId, CycleFreezeCommitId, MemberId, PariwarId, PoolId } from '../ids/index.js';
import { RECONCILIATION_CONFIRMATION_REVERSED_EVENT_TYPE } from '../reconciliation/events.js';
import { eventsLog } from '../schema/events_log.js';
/**
 * The SELF-ATTESTED (yellow) event type — Story 8.4's own constant, imported rather than re-spelled so
 * the two can never drift. (`write.ts` does NOT import this module, so this edge introduces no cycle.)
 *
 * Its presence in a READ module changes nothing about the confirmed-only invariant: it is used ONLY by
 * {@link listActedMemberIdsForPool}, whose `attested` set feeds a nudge-suppression courtesy decision
 * and is structurally separate from every confirmed surface. `listConfirmedContributorsForPool` still
 * hard-filters `CONFIRMED_EVENT_TYPE` alone, with no parameter that could admit a yellow row.
 */
import { CONTRIBUTION_UTR_ATTESTED_EVENT_TYPE as ATTESTED_EVENT_TYPE } from './write.js';

/**
 * The ONLY event type that confers confirmed-contributor visibility (AC1/AC4, load-bearing). The read
 * hard-filters on this exact string — never a parameter — so no yellow / attested / pending state can
 * reach the confirmed list. Do NOT widen this to a set; the invariant is exactly-one confirmed source.
 */
export const CONFIRMED_EVENT_TYPE = 'contribution.confirmed' as const;

/** The `contribution.confirmed` payload key carrying the pool scope (the forward Epic-9 producer contract). */
export const CONFIRMED_PAYLOAD_POOL_KEY = 'poolId' as const;
/** The `contribution.confirmed` payload key carrying the contributing member (the forward Epic-9 contract). */
export const CONFIRMED_PAYLOAD_MEMBER_KEY = 'memberId' as const;

/**
 * The `reconciliation.confirmation-reversed` payload key (Story 9.4 Decision D1) carrying the EXACT
 * `contribution.confirmed` event id being walked back — the monotonic link that makes the per-confirmation
 * event-id chain possible (Story 9.5 AC3; imported, never re-spelled). A reversal un-confirms exactly the
 * confirmation it names, never a whole (member, pool) — so a fresh confirmation always re-greens.
 */
export const REVERSED_CONFIRMED_EVENT_ID_KEY = 'reversedConfirmedEventId' as const;

/**
 * The per-confirmation-event-id chain predicate (Story 9.5 AC3, D2/D4) — PURE, DB-free, the SINGLE shared
 * derivation every confirmed-reading surface routes through so the reversal backing-out is never
 * re-implemented twice. A subject (a member in a pool) is LIVE-confirmed iff it holds ≥1
 * `contribution.confirmed` event id that is NOT named by any `reconciliation.confirmation-reversed`'s
 * `reversedConfirmedEventId`. This keeps the confirmation monotonic on the read side: a reversal walks back
 * exactly the confirmation it names, a later fresh confirmation (a new event id) re-greens, and a reversal
 * naming an id the subject never held cannot un-confirm anything. Callers derive `held` as
 * `confirmedEventIds.length > 0 && !hasLiveConfirmation(...)` (confirmations exist, all reversed).
 */
export function hasLiveConfirmation(
  confirmedEventIds: Iterable<string>,
  reversedConfirmedEventIds: ReadonlySet<string>,
): boolean {
  for (const eventId of confirmedEventIds) {
    if (!reversedConfirmedEventIds.has(eventId)) return true;
  }
  return false;
}

/** The scope tuple for a pool's confirmed-contributor read. */
export interface ListConfirmedContributorsParams {
  readonly pariwarId: PariwarId;
  /**
   * The cycle the pool belongs to — part of the scope tuple for caller symmetry (mirrors the pool/alert
   * read signatures). `poolId` is 1:1 with a cycle, so it alone authoritatively scopes the query; `cycleId`
   * is accepted here but the read keys on `poolId` (no redundant payload filter that could silently empty
   * the list if Epic 9's payload omits a cycle key).
   */
  readonly cycleId: CycleFreezeCommitId;
  readonly poolId: PoolId;
}

/** A confirmed contributor — the member IDENTITY only. The boundary decrypts to first-name + last-initial. */
export interface ConfirmedContributor {
  readonly memberId: MemberId;
}

/**
 * List the pool's LIVE reconciliation-confirmed contributors (AC1/AC3) — the members carried by a
 * `contribution.confirmed` event scoped to the pool WHOSE confirmation has not been walked back, returned
 * as bare `{ memberId }` (identities only; the boundary decrypts). Sources EXCLUSIVELY from
 * `contribution.confirmed` for confirmation truth (the structural confirmed-only guard — there is no
 * status/state parameter), then SUBTRACTS any confirmation named by a `reconciliation.confirmation-reversed`
 * compensating event (Story 9.4 Decision D1; Story 9.8 is the producer, so this subtraction is a no-op
 * until 9.8 emits). A member lists iff ≥1 of their confirmed event ids is NOT reversed (the per-event-id
 * chain, {@link hasLiveConfirmation}) — a re-confirmed member (a fresh event id after a reversal) re-lists;
 * a member all of whose confirmations are reversed drops off. DISTINCT by member (a re-confirmed/duplicate
 * event does not double-list).
 *
 * ⭐⛔ ORDERED BY THE **EARLIEST LIVE CONFIRMATION'S `event_version`** — Story 11b.3 (AC9). ⚠ THIS
 * REPLACED A SORT; IT DID ⛔ NOT ADD A MISSING ONE. From Story 8.3 (`afce9e0`) through 9.5 (`318f88b`)
 * this read ended `liveMemberIds.sort()` — i.e. `member_id` ASCENDING — which is ⛔ EXACTLY the key a
 * PII-shielded public surface must not order by: it leaks an arbitrary identifier ordering onto the
 * render. ⚠ `deferred-work.md`'s *"carries ⛔ NO `ORDER BY` at all … not stable across runs"* was FALSE
 * when it was filed; that item is amended IN PLACE, ⛔ never re-filed.
 *
 * ⭐ WHY THE **EARLIEST**, AND WHY `event_version`: a member may hold SEVERAL live confirmations (a
 * re-confirmation after a reversal re-lists them), so the row needs ONE key. The earliest live
 * confirmation is the instant that member FIRST became confirmed — the member-meaningful moment, and
 * the one that is STABLE under a later re-confirmation. ⛔ Not the latest (which moves under a
 * re-confirmation), and ⛔ not `occurred_at` (wall-clock, ⛔ not the append order).
 * ⚠ `event_version` is PER-STREAM monotonic (`events_log_stream_id_event_version_uq`), and
 * `contribution.confirmed` is appended on the ALERT stream (`contribution/events.ts`) — one alert per
 * pool cycle ⇒ every confirmation for one pool shares ONE stream, so `event_version` IS a total order
 * within the pool. ⛔ Do not let the next reader re-derive whether it is comparable.
 * ⚠ `member_id` survives ONLY as the final tie-break for total determinism — ⛔ never as the primary
 * key of the ordering.
 *
 * ⚠ THIS CHANGES A SHIPPED READ'S BEHAVIOUR for both existing consumers
 * (`apps/api/src/modules/member-pool/handlers.ts` and the mobile contributor list). Both consume the
 * result as an order-carrying sequence and neither asserts `member_id` order, so this is a
 * RE-ORDERING, ⛔ not a contract break.
 * Legitimately `[]` today for confirmations (Epic 9's producer landed at 9.4; the reversal producer is 9.8).
 * ONE batched read (the confirmed + reversal types in a single `inArray`, reconciled in JS by event id —
 * the set is bounded by the pool roster). Tenant-scoped (RLS + the explicit `pariwar_id` predicate). No
 * user-controlled `.limit()`, so no domain-invariants clamp.
 */
export async function listConfirmedContributorsForPool(
  db: Db,
  { pariwarId, poolId }: ListConfirmedContributorsParams,
): Promise<ConfirmedContributor[]> {
  const rows = await db
    .select({
      eventType: eventsLog.eventType,
      eventId: eventsLog.eventId,
      // ⭐ THE SORT KEY (Story 11b.3, AC9). ⛔ A `.sort()` over the previous row shape could not
      // express the ordering at all — the version has to be PROJECTED to be carried through the
      // `Map` reconciliation below. Per-stream monotonic, and one alert stream per pool ⇒ a total
      // order within the pool.
      eventVersion: eventsLog.eventVersion,
      memberId: sql<string | null>`${eventsLog.payload} ->> ${CONFIRMED_PAYLOAD_MEMBER_KEY}`,
      reversedConfirmedEventId: sql<string | null>`${eventsLog.payload} ->> ${REVERSED_CONFIRMED_EVENT_ID_KEY}`,
    })
    .from(eventsLog)
    .where(
      and(
        eq(eventsLog.pariwarId, pariwarId),
        // Confirmations (green) + their compensating reversals — the ONLY two event types that bear on
        // live-confirmed truth. Yellow / attested / pending cannot satisfy this, structurally (AC1/AC4);
        // the reversal is `reconciliation.*`, off the 8.10 contribution.* fence (Story 9.4 D1).
        inArray(eventsLog.eventType, [
          CONFIRMED_EVENT_TYPE,
          RECONCILIATION_CONFIRMATION_REVERSED_EVENT_TYPE,
        ]),
        // Scope both types to the pool via the forward payload contract (poolId is 1:1 with the cycle;
        // the reversal payload carries the same `poolId` key — Story 9.4 events.ts).
        sql`${eventsLog.payload} ->> ${CONFIRMED_PAYLOAD_POOL_KEY} = ${poolId}`,
      ),
    );

  // Reconcile by the per-confirmation event-id chain (AC3), in JS — the set is bounded by the pool roster.
  // A malformed confirmed event missing the member key yields SQL NULL → filtered out (never a blank
  // contributor); a reversal missing its `reversedConfirmedEventId` cannot walk anything back.
  // ⚠ Each confirmation is carried as `{eventId, eventVersion}`, ⛔ not a bare id — the version is the
  // ORDER KEY (see the docstring) and is knowable only PER CONFIRMATION, so it must survive this
  // reconciliation. ⛔ Collapsing back to `string[]` silently restores the `member_id` ordering.
  const confirmationsByMember = new Map<string, { eventId: string; eventVersion: number }[]>();
  const reversedConfirmedEventIds = new Set<string>();
  for (const r of rows) {
    if (r.eventType === RECONCILIATION_CONFIRMATION_REVERSED_EVENT_TYPE) {
      if (typeof r.reversedConfirmedEventId === 'string' && r.reversedConfirmedEventId.length > 0) {
        reversedConfirmedEventIds.add(r.reversedConfirmedEventId);
      }
      continue;
    }
    if (typeof r.memberId !== 'string' || r.memberId.length === 0) continue;
    const entry = { eventId: r.eventId, eventVersion: r.eventVersion };
    const held = confirmationsByMember.get(r.memberId);
    if (held) held.push(entry);
    else confirmationsByMember.set(r.memberId, [entry]);
  }

  // ⭐ THE EARLIEST **LIVE** CONFIRMATION, ⛔ not the earliest confirmation. A member whose first
  // confirmation was REVERSED and who was later re-confirmed sorts by the RE-confirmation: a reversed
  // confirmation is not a moment at which they were confirmed, so it cannot be their key.
  const ordered: { memberId: string; sortKey: number }[] = [];
  for (const [memberId, confirmations] of confirmationsByMember) {
    // ⚠ The membership test is {@link hasLiveConfirmation}'s, kept as the SHARED derivation of record
    // so the reversal backing-out is never re-implemented. This loop additionally needs the SURVIVING
    // version, which that predicate does not return — hence the second pass, ⛔ not a second rule.
    if (!hasLiveConfirmation(confirmations.map((c) => c.eventId), reversedConfirmedEventIds)) continue;
    let earliestLive = Number.POSITIVE_INFINITY;
    for (const c of confirmations) {
      if (reversedConfirmedEventIds.has(c.eventId)) continue;
      if (c.eventVersion < earliestLive) earliestLive = c.eventVersion;
    }
    ordered.push({ memberId, sortKey: earliestLive });
  }

  // ⭐ Earliest live confirmation ASCENDING, with `member_id` as the FINAL tie-break ONLY — ⛔ never
  // the primary key of the ordering (it leaks an arbitrary identifier ordering onto a PII-shielded
  // public render). Deterministic and replay-stable.
  ordered.sort((a, b) =>
    a.sortKey !== b.sortKey ? a.sortKey - b.sortKey : a.memberId.localeCompare(b.memberId),
  );
  return ordered.map(({ memberId }) => ({ memberId: memberId as MemberId }));
}

/**
 * Whether THIS member has self-attested a contribution (yellow) for the alert (Story 8.4, AC4) — a
 * MEMBER-SCOPED self-state read, NEVER an aggregate. Checks for a `contribution.utr-attested` event carrying
 * the member's deterministic `tr` on the alert stream (the caller derives `tr =
 * deriveContributionReference({ memberId, alertId })`). Transport-free. Tenant-scoped (RLS + the explicit
 * `pariwar_id` predicate). This drives the card's `myContribution: 'none' | 'attested'` pill — it does NOT
 * touch the confirmed-only aggregate meter (that stays `contribution.confirmed`-derived).
 */
export async function hasAttestedContribution(
  db: Db,
  { pariwarId, alertId, tr }: { readonly pariwarId: PariwarId; readonly alertId: AlertId; readonly tr: string },
): Promise<boolean> {
  const rows = await db
    .select({ eventId: eventsLog.eventId })
    .from(eventsLog)
    .where(
      and(
        eq(eventsLog.pariwarId, pariwarId),
        eq(eventsLog.streamId, alertId),
        // Yellow (attestation) ONLY — the exact single WRITE event type. Never widened to include green.
        eq(eventsLog.eventType, 'contribution.utr-attested'),
        sql`${eventsLog.payload} ->> 'tr' = ${tr}`,
      ),
    )
    .limit(1);
  return rows.length > 0;
}

/** The aggregate pending signal (AC2) — a count + an integer percentage, NO member-identifying detail. */
export interface PendingAggregate {
  /** `rosterSize − confirmedCount`, clamped ≥0 — the number of roster members not yet confirmed. */
  readonly pendingCount: number;
  /** `round(pendingCount / rosterSize * 100)`, Latin integer; `0` for an empty roster (0 of 0 → 0%). */
  readonly pendingPercentage: number;
}

/**
 * Compute the AGGREGATE pending signal (AC2 / D3) — PURE, DB-free, unit-testable. Pending is
 * `rosterSize − confirmedCount` (clamped ≥0) over the pool roster, NOT an attested/yellow-derived count
 * (which doesn't exist yet and would leak intent-as-shortfall). Percentage is integer-rounded Latin.
 * Empty roster → `{ pendingCount: 0, pendingPercentage: 0 }` (0 of 0 → 0%, never a divide-by-zero).
 * A defensive `confirmedCount > rosterSize` clamps to 0 pending (never a negative count).
 *
 * This is the DELIBERATE privacy hardening over PRD FR-24/25's "see WHO has not yet contributed": the
 * peer-accountability signal is aggregate, never a per-member "who hasn't paid" shame list (epics.md:2906).
 */
export function computePendingAggregate({
  rosterSize,
  confirmedCount,
}: {
  readonly rosterSize: number;
  readonly confirmedCount: number;
}): PendingAggregate {
  const pendingCount = Math.max(0, rosterSize - confirmedCount);
  const pendingPercentage = rosterSize > 0 ? Math.round((pendingCount / rosterSize) * 100) : 0;
  return { pendingCount, pendingPercentage };
}

// ── Reminder-suppression read — Story 8.8 (Task 6; AC2 / D3) ─────────────────────────────────────────

/**
 * The two ways a member can have ALREADY ACTED on a pool, kept as DISTINCT sets. Story 8.8's ratified
 * Decision 2 is explicit that `already_confirmed` (a `contribution.confirmed` exists) and
 * `already_attested` (a `contribution.utr-attested` exists) are separate machine-readable reasons and
 * must NEVER be conflated in analytics or any read model.
 */
export interface ActedMemberIdsForPool {
  /** Members with a RECONCILIATION-CONFIRMED contribution (green). Epic 9's producer — empty today. */
  readonly confirmed: readonly string[];
  /** Members with a SELF-ATTESTED payment claim (yellow, Story 8.4). A claim, never confirmed money. */
  readonly attested: readonly string[];
}

/**
 * List, per pool, the members who have already acted — the input to Story 8.8's deadline-reminder
 * SUPPRESSION decision (AC2 / D3). ONE batched read per pool; at 4L scale a per-member round-trip is
 * not viable.
 *
 * ── This read is a COURTESY signal, never a promotion (the load-bearing invariant) ──────────────────
 * Suppressing a *reminder* for an attested member is a decision about whether to interrupt them. It is
 * NOT a claim that their payment is confirmed. Nothing that consumes this may count, display, or imply
 * confirmation from the `attested` set: `progress.confirmedCount`, the confirmed contributor list, and
 * every "raised so far" figure stay sourced EXCLUSIVELY from {@link listConfirmedContributorsForPool}
 * (epics.md:2912, :2935-2941). The two sets are returned separately precisely so a caller cannot merge
 * them by accident — there is deliberately no combined "acted" set on this shape.
 *
 * Green is scoped by the forward Epic-9 payload contract (`poolId`); yellow is scoped by the Story 8.4
 * payload's `poolId` on the ALERT stream. Both are EXACT event-type matches — never a widened set.
 * Tenant-scoped (RLS + the explicit `pariwar_id` predicate). No user-controlled `.limit()` (both sets
 * are bounded by the pool roster), so no domain-invariants clamp.
 */
export async function listActedMemberIdsForPool(
  db: Db,
  {
    pariwarId,
    alertId,
    poolId,
  }: { readonly pariwarId: PariwarId; readonly alertId: AlertId; readonly poolId: PoolId },
): Promise<ActedMemberIdsForPool> {
  const rows = await db
    .select({
      eventType: eventsLog.eventType,
      eventId: eventsLog.eventId,
      memberId: sql<string | null>`${eventsLog.payload} ->> ${CONFIRMED_PAYLOAD_MEMBER_KEY}`,
      reversedConfirmedEventId: sql<string | null>`${eventsLog.payload} ->> ${REVERSED_CONFIRMED_EVENT_ID_KEY}`,
    })
    .from(eventsLog)
    .where(
      and(
        eq(eventsLog.pariwarId, pariwarId),
        sql`${eventsLog.payload} ->> ${CONFIRMED_PAYLOAD_POOL_KEY} = ${poolId}`,
        or(
          // Green — the pool-scoped confirmed event (Epic 9's exclusive producer).
          eq(eventsLog.eventType, CONFIRMED_EVENT_TYPE),
          // The compensating reversal that walks a confirmation back (Story 9.4 D1; 9.8 produces it). Its
          // payload carries the same pool key, so the outer poolId filter scopes it too. The `confirmed`
          // set below subtracts it by the per-event-id chain — never the `attested` set (D2 discipline).
          eq(eventsLog.eventType, RECONCILIATION_CONFIRMATION_REVERSED_EVENT_TYPE),
          // Yellow — the member's own attestation, which rides the ALERT stream (Story 8.4).
          and(
            eq(eventsLog.eventType, ATTESTED_EVENT_TYPE),
            eq(eventsLog.streamId, alertId),
          ),
        ),
      ),
    );

  // The `confirmed` set honors the SAME reversal backing-out as the contributor list (one shared
  // {@link hasLiveConfirmation} chain — never a second derivation); the `attested` set is untouched by
  // reversals (a reversal walks back a CONFIRMATION, not a member's own yellow claim — the D2 two-sets rule).
  const confirmedEventIdsByMember = new Map<string, string[]>();
  const reversedConfirmedEventIds = new Set<string>();
  const attested = new Set<string>();
  for (const row of rows) {
    if (row.eventType === RECONCILIATION_CONFIRMATION_REVERSED_EVENT_TYPE) {
      if (typeof row.reversedConfirmedEventId === 'string' && row.reversedConfirmedEventId.length > 0) {
        reversedConfirmedEventIds.add(row.reversedConfirmedEventId);
      }
      continue;
    }
    if (typeof row.memberId !== 'string' || row.memberId.length === 0) continue;
    if (row.eventType === CONFIRMED_EVENT_TYPE) {
      const ids = confirmedEventIdsByMember.get(row.memberId);
      if (ids) ids.push(row.eventId);
      else confirmedEventIdsByMember.set(row.memberId, [row.eventId]);
    } else {
      attested.add(row.memberId);
    }
  }

  const confirmed = new Set<string>();
  for (const [memberId, eventIds] of confirmedEventIdsByMember) {
    if (hasLiveConfirmation(eventIds, reversedConfirmedEventIds)) confirmed.add(memberId);
  }
  return { confirmed: [...confirmed].sort(), attested: [...attested].sort() };
}
