// Contribution FACT-INPUT reads — Story 10.24 (Task 3; AC1, AC4, AC7). AS-OF CORRECT.
//
// The DB half of the `contribution.*` fact producer. It reads the Story 10.24 projections and returns
// the raw anchors; the PURE derivation (`deriveContributionFacts`) lives in
// `@twt/validity-service`'s `producer.ts` beside `deriveRetirementFacts` — `@twt/domain` cannot import
// `@twt/validity-service` (the reverse dependency is a turbo cycle), so this is the shipped split.
//
// ── AC7: a FIXED number of queries, independent of member history size ──────────────────────────
// `readContributionFactInputs` runs exactly TWO queries regardless of how many contributions,
// assignments or cycles the member has: one aggregate over the ledger (COUNT + MAX), one aggregate over
// the assignment × alert × ledger join. It NEVER fetches rows to count them in JS and NEVER issues one
// query per cycle. `readContributionFactInputsForPariwar` is the same two queries GROUPED BY member for
// the whole Pariwar — the bounded bulk read the trustee-lite candidate scan needs so it can evaluate
// without one fact read per member in a loop. A counted-query test (1 vs. N fixtures → identical query
// count) pins this, because a counted assertion survives a refactor that a comment does not.
// Scope note: "two queries" bounds THIS module's fact-input read only. The R7 family's four clause
// resolutions each add their own `evaluateLadderAt` / `resolveByClauseId` cost on top (~8 additional
// queries per validity evaluation, per the story's AC7) — this file's fixed-query-count guarantee does
// not, by itself, bound the total per-evaluation query cost.
//
// ── One definition of "live-confirmed", one definition of "closed" ──────────────────────────────
// {@link liveConfirmationExistsSql} is the SINGLE SQL spelling of the Story 9.5 per-event-id reversal
// chain, shared by every aggregate in this file. It is the PROJECTED form of the pure
// `hasLiveConfirmation` (`read.ts:88`): the ledger's PK is the confirmation's event id and its
// `reversed_at` is set from the reversal naming that exact id, so "≥1 confirmed id not named by a
// reversal" and "≥1 row with `reversed_at IS NULL OR reversed_at > at`" are the same statement. The two
// are PINNED TOGETHER by `tests/integration/contribution/live-confirmation-parity.spec.ts` — so this is
// a second EXECUTION STRATEGY for the same definition, not a second definition
// ([[project_epic6_drizzle_correlated_subquery_bug]] is exactly the drift class that pin prevents).
// The parity spec is the GOVERNING CONTRACT: it exists because `hasLiveConfirmation` cannot be called
// directly from a set-based SQL aggregate (AC7 forbids a per-row round-trip) — any future change to
// confirmation semantics MUST update both `hasLiveConfirmation` and this SQL spelling together and keep
// the parity spec green, or the two will silently drift (code review, 2026-08-05).
//
// Closure is likewise NOT re-spelled: `isAlertClosedState` (`history.ts:95`) owns the state set, and
// {@link ALERT_CLOSED_EVENT_TYPES} is the event-level mirror of it, held in lockstep by a unit test.
// The AS-OF question ("was the cycle closed AT `at`?") cannot be answered from `alerts.current_state`,
// which is a NOW cache — it is answered from the alert stream's own `alert.closed`/`alert.settled`
// `occurred_at`. An OPEN cycle is never a skip: a member mid-window has not missed anything.

import { and, eq, sql, type SQL } from 'drizzle-orm';

import type { Db } from '../db.js';
import { memberId as toMemberId, type MemberId, type PariwarId } from '../ids/index.js';
import { memberContributionLedger } from '../schema/member_contribution_ledger.js';

/** Asia/Kolkata's fixed offset from UTC (+05:30). Exact — India observes no DST. Held equal to
 *  `cycleCalendar.IST_UTC_OFFSET_MS` by `tests/contribution/alert-closed-lockstep.test.ts` (declared
 *  locally rather than imported so this module stays free of the cycle-calendar dependency). EXPORTED
 *  (not just declared) so that lockstep test can compare THIS copy against the canonical constant
 *  directly, rather than only re-asserting the canonical constant's own value against itself
 *  (code review, 2026-08-05 — a typo in this copy was previously undetectable by that test). */
export const IST_UTC_OFFSET_MS = 5 * 60 * 60 * 1000 + 30 * 60 * 1000;

/**
 * The alert events whose arrival puts a cycle into a CLOSED state — the event-level mirror of
 * `isAlertClosedState`'s `'closed' | 'settled'`.
 *
 * Kept honest by `tests/contribution/alert-closed-lockstep.test.ts`: every type here must map to a
 * state `isAlertClosedState` accepts, and every accepted state must have a type here. Adding an alert
 * lifecycle state without an entry fails THERE rather than silently under-counting skips.
 */
export const ALERT_CLOSED_EVENT_TYPES = ['alert.closed', 'alert.settled'] as const;

const ALERT_CLOSED_EVENT_TYPES_SQL = sql.join(
  ALERT_CLOSED_EVENT_TYPES.map((t) => sql`${t}`),
  sql`, `,
);

/** The only `member_pool_assignments` aliases this file ever correlates against. `sql.raw` below is
 *  scoped to this literal union rather than `string` so the compiler — not just convention — rejects
 *  any future caller passing a non-literal (e.g. user-influenced) value into raw SQL. */
type AssignmentsAlias = 'mpa';

/**
 * "Does `member_id`/`pool_id` hold a LIVE confirmation at `at`?" — the one shared spelling (see header).
 * Correlated against the caller's alias for `member_pool_assignments` (passed in, never assumed), so the
 * correlation is explicit and cannot collapse into a tautology.
 */
function liveConfirmationExistsSql(assignmentsAlias: AssignmentsAlias, at: Date): SQL {
  const a = sql.raw(assignmentsAlias);
  return sql`EXISTS (
    SELECT 1 FROM member_contribution_ledger l
     WHERE l.pariwar_id = ${a}.pariwar_id
       AND l.member_id  = ${a}.member_id
       AND l.pool_id    = ${a}.pool_id
       AND l.confirmed_at <= ${at}
       AND (l.reversed_at IS NULL OR l.reversed_at > ${at})
  )`;
}

/** The as-of live-confirmation predicate for the ledger aggregate (same rule, un-correlated form). */
function liveAtInstant(at: Date): SQL {
  return sql`${memberContributionLedger.confirmedAt} <= ${at}
    AND (${memberContributionLedger.reversedAt} IS NULL OR ${memberContributionLedger.reversedAt} > ${at})`;
}

/**
 * The MISSED-CYCLE aggregate (AC4), as one statement.
 *
 * "Missed" = **assigned at freeze, with no live confirmation at close**:
 *   · ASSIGNED — a `member_pool_assignments` row, sourced from the pool's persisted snapshot
 *     `member_assignments` (never a recompute of `assignMembersToPools`).
 *   · AT CLOSE — the cycle's alert reached `alert.closed`/`alert.settled` at/before `at`. An OPEN cycle
 *     is never a skip.
 *   · NO LIVE CONFIRMATION — the shared predicate above, reversals honoured.
 *   · CURRENT YEAR — the IST calendar year of `at` (Story 8.9's convention), never `getFullYear()` on a
 *     UTC `Date`.
 *
 * `groupByMember` switches between the single-member and the whole-Pariwar (bulk) shapes; both are ONE
 * query either way (AC7).
 *
 * Bucketing by `mpa.assigned_at` (rather than the close instant) relies on Decision 2026-08-05-075's
 * operational invariant: pool cycles are single-calendar-month instruments, so assignment-year and
 * close-year are identical by construction. A cycle that legitimately straddled a year boundary would
 * need this bucketing re-derived — but that first requires a Trustee Panel emergency resolution; it is
 * not a case this function is expected to handle today.
 */
function missedCycleAggregateSql(at: Date, scope: SQL, groupByMember: boolean): SQL {
  const selectMember = groupByMember ? sql`mpa.member_id AS member_id,` : sql``;
  const groupBy = groupByMember ? sql`GROUP BY mpa.member_id` : sql``;
  return sql`
    SELECT ${selectMember}
           count(*)::int        AS skips_current_year,
           min(closed.closed_at) AS earliest_skip_closed_at
      FROM member_pool_assignments mpa
      JOIN alerts al
        ON al.cycle_id = mpa.cycle_id
       AND al.pariwar_id = mpa.pariwar_id
      -- The AS-OF closure instant, per alert stream. A LATERAL keeps the correlation explicit.
      JOIN LATERAL (
        SELECT min(e.occurred_at) AS closed_at
          FROM events_log e
         WHERE e.stream_id = al.alert_id
           AND e.event_type IN (${ALERT_CLOSED_EVENT_TYPES_SQL})
           AND e.occurred_at <= ${at}
      ) closed ON closed.closed_at IS NOT NULL
     WHERE ${scope}
       AND mpa.assigned_at >= ${istYearStartUtc(at)}
       AND mpa.assigned_at <= ${at}
       AND NOT ${liveConfirmationExistsSql('mpa', at)}
     ${groupBy}
  `;
}

/** The start of the IST calendar year containing `at`, as a UTC instant (Story 8.9's convention). */
export function istYearStartUtc(at: Date): Date {
  const istYear = new Date(at.getTime() + IST_UTC_OFFSET_MS).getUTCFullYear();
  return new Date(Date.UTC(istYear, 0, 1) - IST_UTC_OFFSET_MS);
}

/** The raw, already-read anchors the PURE fact derivation consumes. Never facts themselves. */
export interface ContributionFactInputs {
  /** LIVE confirmations at `at` (reversals honoured). `0` is a real answer, not "unknown". */
  readonly totalCount: number;
  /** `occurred_at` of the member's most recent LIVE confirmation at `at`; null when there is none. */
  readonly lastConfirmedAt: Date | null;
  /** Assigned-and-closed cycles in the IST calendar year of `at` that resolved with no live
   *  confirmation — the raw skip count (AC4). Open cycles are excluded here, not filtered downstream. */
  readonly skipsCurrentYear: number;
  /** The CLOSE instant of the EARLIEST such missed cycle — `lapseSince` (D5's
   *  `missed-closed-cycle-v1`). null when `skipsCurrentYear === 0`. */
  readonly earliestSkipClosedAt: Date | null;
}

/** The `(pariwarId, memberId)` scope tuple for a single-member read. */
export interface ContributionFactScope {
  readonly pariwarId: PariwarId;
  readonly memberId: MemberId;
}

/** Shape of an aggregate row as the driver returns it (counts arrive as numbers via `::int`). */
interface RawSkipRow {
  member_id?: string;
  skips_current_year: number | string | null;
  earliest_skip_closed_at: Date | string | null;
}

/** The driver may surface `execute` results as `{rows}` or as a bare array; both are handled. */
function resultRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  const rows = (result as { rows?: unknown }).rows;
  return Array.isArray(rows) ? (rows as T[]) : [];
}

function toCount(v: number | string | null | undefined): number {
  if (v === null || v === undefined) return 0;
  return typeof v === 'number' ? v : Number.parseInt(v, 10);
}

function toDate(v: Date | string | null | undefined): Date | null {
  if (v === null || v === undefined) return null;
  return v instanceof Date ? v : new Date(v);
}

/**
 * Read one member's contribution fact inputs AS OF `at` — TWO queries, always (AC7).
 *
 * A member with a readable history and no contributions genuinely has `totalCount: 0` — that is DATA,
 * not a gap, and it is the caller (`deriveContributionFacts`) that decides when the inputs are so
 * un-derivable that the `producer_unavailable` sentinel is the honest answer. This read never
 * fabricates: zero and unknown are different claims (D6, [[CR-4.4-D3]]).
 *
 * Tenant-scoped (RLS + the EXPLICIT `pariwar_id` predicate). Every read is an aggregate — there is no
 * user-controlled `.limit()` anywhere, so no `clampLimit` applies.
 */
export async function readContributionFactInputs(
  db: Db,
  scope: ContributionFactScope,
  at: Date,
): Promise<ContributionFactInputs> {
  const [ledger] = await db
    .select({
      totalCount: sql<number>`count(*)::int`,
      // ⚠ Typed as the RAW driver shape, not `Date`. An aggregate over a timestamptz column comes back
      // as a STRING from node-postgres (the driver's date parser applies to plain column reads, not to
      // `max(...)` expression output), so annotating this `sql<Date|null>` would be a lie the compiler
      // happily believes — and `deriveContributionFacts` would then throw
      // `lastConfirmedAt.getTime is not a function` at runtime, on the live path. Normalised via
      // `toDate` below, exactly as the raw aggregate rows are.
      lastConfirmedAt: sql<Date | string | null>`max(${memberContributionLedger.confirmedAt})`,
    })
    .from(memberContributionLedger)
    .where(
      and(
        eq(memberContributionLedger.pariwarId, scope.pariwarId),
        eq(memberContributionLedger.memberId, scope.memberId),
        liveAtInstant(at),
      ),
    );

  const skipResult = await db.execute(
    missedCycleAggregateSql(
      at,
      sql`mpa.pariwar_id = ${scope.pariwarId} AND mpa.member_id = ${scope.memberId}`,
      false,
    ),
  );
  const skip = resultRows<RawSkipRow>(skipResult)[0];

  return {
    totalCount: toCount(ledger?.totalCount),
    lastConfirmedAt: toDate(ledger?.lastConfirmedAt),
    skipsCurrentYear: toCount(skip?.skips_current_year),
    earliestSkipClosedAt: toDate(skip?.earliest_skip_closed_at),
  };
}

/** One member's fact inputs, as the bulk Pariwar read returns them. */
export interface MemberContributionFactInputs extends ContributionFactInputs {
  readonly memberId: MemberId;
}

/**
 * The BULK read — every member of a Pariwar's fact inputs at `at`, in the SAME two queries (AC7).
 *
 * This exists so the Trustee-Lite candidate scan (Story 10.11's named seam) can evaluate the whole
 * Pariwar with BOUNDED reads instead of one fact read — or, far worse, one `getValidityAt` — per member
 * in a loop. 10.11 already paid for this lesson: its own spec went 44s → 220s and timed out three
 * unrelated suites doing per-member setup work; the same shape at production scale is exactly the N+1
 * AC7 names as its binding structural criterion.
 *
 * A member with NO ledger rows and NO assignments simply does not appear in the result; the caller
 * treats an absent member as "no contribution history projected", never as a zero.
 */
export async function readContributionFactInputsForPariwar(
  db: Db,
  pariwarId: PariwarId,
  at: Date,
): Promise<MemberContributionFactInputs[]> {
  const ledgerRows = await db
    .select({
      memberId: memberContributionLedger.memberId,
      totalCount: sql<number>`count(*)::int`,
      // Same raw-shape caveat as the single-member read above — normalised via `toDate`.
      lastConfirmedAt: sql<Date | string | null>`max(${memberContributionLedger.confirmedAt})`,
    })
    .from(memberContributionLedger)
    .where(and(eq(memberContributionLedger.pariwarId, pariwarId), liveAtInstant(at)))
    .groupBy(memberContributionLedger.memberId);

  const skipResult = await db.execute(
    missedCycleAggregateSql(at, sql`mpa.pariwar_id = ${pariwarId}`, true),
  );

  const byMember = new Map<string, MemberContributionFactInputs>();
  for (const row of ledgerRows) {
    byMember.set(row.memberId, {
      memberId: row.memberId,
      totalCount: toCount(row.totalCount),
      lastConfirmedAt: toDate(row.lastConfirmedAt),
      skipsCurrentYear: 0,
      earliestSkipClosedAt: null,
    });
  }
  for (const row of resultRows<RawSkipRow>(skipResult)) {
    if (typeof row.member_id !== 'string') continue;
    const existing = byMember.get(row.member_id);
    byMember.set(row.member_id, {
      memberId: toMemberId(row.member_id),
      totalCount: existing?.totalCount ?? 0,
      lastConfirmedAt: existing?.lastConfirmedAt ?? null,
      skipsCurrentYear: toCount(row.skips_current_year),
      earliestSkipClosedAt: toDate(row.earliest_skip_closed_at),
    });
  }
  // Deterministic order — by member id, the projection-wide ordering discipline.
  return [...byMember.values()].sort((a, b) =>
    a.memberId < b.memberId ? -1 : a.memberId > b.memberId ? 1 : 0,
  );
}
