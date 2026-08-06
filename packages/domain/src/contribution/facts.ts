// Contribution FACT-INPUT reads — Story 10.24 (Task 3; AC1, AC4, AC7). AS-OF CORRECT.
//
// The DB half of the `contribution.*` fact producer. It reads the Story 10.24 projections and returns
// the raw anchors; the PURE derivation (`deriveContributionFacts`) lives in
// `@twt/validity-service`'s `producer.ts` beside `deriveRetirementFacts` — `@twt/domain` cannot import
// `@twt/validity-service` (the reverse dependency is a turbo cycle), so this is the shipped split.
//
// ── AC7: a FIXED number of queries, independent of member history size ──────────────────────────
// `readContributionFactInputs` runs exactly THREE queries regardless of how many contributions,
// assignments, cycles or assertions the member has: one aggregate over the ledger (COUNT + MAX + two
// folded-in scalar subqueries), one aggregate over the assignment × alert × ledger join, and — since
// Story 10.26 — one EXISTS over the member's `member.personal_event_asserted` events. It NEVER fetches
// rows to count them in JS and NEVER issues one query per cycle.
// `readContributionFactInputsForPariwar` is the same three queries GROUPED BY member for the whole
// Pariwar, PLUS one member-independent context read (FOUR total) — the bounded bulk read the
// trustee-lite candidate scan needs so it can evaluate without one fact read per member in a loop. A
// counted-query test (1 vs. N fixtures → identical query count) pins this, because a counted assertion
// survives a refactor that a comment does not.
//
// ⚖ Story 10.26 (AC9/D7) moved the budget 2 → 3 rather than folding the assertion into an existing
// statement, and the reason is structural, not laziness: the assertion lives on the member's own
// `events_log` stream, while `missedCycleAggregateSql` scans the pool/assignment axis. A join across
// axes would make the riskiest SQL in the subsystem riskier and buy nothing — both reads are already
// member-count-independent, which is the property AC7 actually protects.
//
// ⚖ Story 10.25 (D3) held that budget while adding R7(A) restoration accounting: the run computation
// is FOLDED INTO the existing missed-cycle statement as window functions over the same scan, and
// R7(A)'s `restoration.consecutive_required` rides as a scalar subquery on the statement that already
// runs. Two queries before, two queries after. Its counted-query assertion was extended to fixtures
// with 0, 1 and several completed restoration episodes.
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
import {
  hasAssertedPersonalEventAt,
  listMembersWithPersonalEventAssertionAt,
} from '../member/personal-event.js';

/**
 * R7(A)'s clause id — the ONLY registry identity this module names, and it names it to read a
 * governance NUMBER (`restoration.consecutive_required`), never to evaluate the clause.
 *
 * ⚠ Reading R7(A)'s DATA is NOT activating R7(A). `prd.md:346` forbids putting `r7-a` into
 * `VALIDITY_RULE_ORDER`; it says nothing against sourcing the clause's own restoration parameters
 * from the registry — which is the alternative to a `3` hardcoded in code, and the whole reason the
 * registry exists ([[project_niyamavali_precedence_is_provenance]]: re-tune the DATA).
 */
const R7A_CLAUSE_ID = 'niy.contribution-discipline.r7-a';

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

/**
 * The ONE spelling of "what instant is this Pariwar's projection authoritative from?" (round-2 review,
 * Decision 2). A scalar subquery, so the single-member path can fold it into an existing statement and
 * stay within AC7's fixed two-query budget; {@link readContributionProjectionContext} runs the same
 * fragment standalone for the bulk path, which cannot fold it (its `GROUP BY` returns zero rows for a
 * Pariwar with no ledger entries — exactly the case where the coverage answer matters most).
 *
 * NULL means NO COVERAGE ROW: the backfill has never run for this Pariwar, and the honest answer for
 * every member is the `producer_unavailable` sentinel, never a fabricated clean record.
 */
function coveredFromSql(pariwar: PariwarId): SQL {
  return sql`(SELECT c.covered_from FROM contribution_projection_coverage c
               WHERE c.pariwar_id = ${pariwar})`;
}

/** The Pariwar-level (member-INDEPENDENT) context every member's fact derivation is read against. */
export interface ContributionProjectionContext {
  /** The projection coverage watermark; `null` when the backfill has never run for this Pariwar. */
  readonly coveredFrom: Date | null;
  /**
   * R7(A)'s `restoration.consecutive_required` as of the read instant (Story 10.25) — the GOVERNANCE
   * number "3 consecutive contributions" refers to, sourced from the clause DATA and never from code.
   * `null` when R7(A) has no version effective at `at` (or its payload omits the field): the
   * restoration count is then UNKNOWN, not `0`.
   */
  readonly r7aConsecutiveRequired: number | null;
}

/**
 * Read a Pariwar's member-independent fact context: the projection coverage watermark, plus R7(A)'s
 * restoration threshold at `at`. ONE statement, both scalars.
 *
 * ⚖ "Unknown projection state must never fabricate a clean member" (2026-08-05). The coverage half is
 * what makes the sentinel reachable: without it every `null` branch in `deriveContributionFacts` is a
 * structural impossibility, and an empty ledger renders as an affirmative clean record for the whole
 * Pariwar on the surface that feeds suspension decisions.
 *
 * The threshold half is read HERE rather than off the aggregate because the aggregate returns NO ROW
 * for a member with no opportunities — and "this member has completed 0 restorations" and "we cannot
 * tell how long a restoration is" must stay distinguishable for exactly that member (Story 10.25 AC7).
 */
export async function readContributionProjectionContext(
  db: Db,
  pariwarId: PariwarId,
  at: Date,
): Promise<ContributionProjectionContext> {
  const result = await db.execute(
    sql`SELECT ${coveredFromSql(pariwarId)} AS covered_from,
               ${r7aConsecutiveRequiredSql(pariwarId, at)} AS r7a_consecutive_required`,
  );
  const row = resultRows<{
    covered_from: Date | string | null;
    r7a_consecutive_required: number | string | null;
  }>(result)[0];
  return {
    coveredFrom: toDate(row?.covered_from),
    r7aConsecutiveRequired: toNullableCount(row?.r7a_consecutive_required),
  };
}

/**
 * R7(A)'s `restoration.consecutive_required`, resolved AS OF `at` — Story 10.25 (AC1, D3).
 *
 * The "3" in "3 consecutive contributions" is GOVERNANCE DATA, not a code constant: it lives in the
 * R7(A) clause payload's `restoration` block and a Trustee amendment can move it. Folded in as a
 * SCALAR SUBQUERY for exactly the reason {@link coveredFromSql} is — the run computation needs the
 * threshold INSIDE the aggregate, and AC8/D3 hold this module to its TWO-query budget. A separate
 * `resolveByClauseId` round-trip would either add a third query or serialize a registry read ahead of
 * the fact read on the critical path of every validity evaluation.
 *
 * ⚠ This is a SECOND EXECUTION STRATEGY for `niyamavali.resolveByClauseId`'s resolution rule (newest
 * non-deprecated version effective at `at`), NOT a second definition — the same posture, and the same
 * obligation, as {@link liveConfirmationExistsSql} carries against `hasLiveConfirmation`. It is PINNED
 * to the accessor by `@twt/validity-service`'s `tests/integration/contribution-facts.spec.ts`
 * ("the R7(A) threshold read agrees with `niyamavali.resolveByClauseId`"), which asserts the two
 * resolutions return the same number over a live registry: any change to clause resolution MUST update
 * both spellings and keep that case green.
 *
 * NULL when R7(A) has no version effective at `at` for this Pariwar, or when its payload carries no
 * `restoration.consecutive_required`. The caller then reports the restoration count as UNKNOWN and
 * omits the fact — never a fabricated `0` (AC7: zero and unknown are different claims).
 */
function r7aConsecutiveRequiredSql(pariwar: PariwarId, at: Date): SQL {
  // A bare `::int` cast throws on non-numeric payload data; the JS twin (`readConsecutiveRequired`)
  // degrades a malformed value to `null` instead of crashing, and this spelling must match it.
  return sql`(SELECT CASE
                        WHEN (cv.payload -> 'restoration' ->> 'consecutive_required') ~ '^[0-9]+$'
                        THEN (cv.payload -> 'restoration' ->> 'consecutive_required')::int
                        ELSE NULL
                      END
                FROM clause_versions cv
               WHERE cv.pariwar_id = ${pariwar}
                 AND cv.clause_id = ${R7A_CLAUSE_ID}
                 AND cv.deprecated_at IS NULL
                 AND cv.effective_date <= ${at}
               ORDER BY cv.version DESC
               LIMIT 1)`;
}

/** The as-of live-confirmation predicate for the ledger aggregate (same rule, un-correlated form). */
function liveAtInstant(at: Date): SQL {
  return sql`${memberContributionLedger.confirmedAt} <= ${at}
    AND (${memberContributionLedger.reversedAt} IS NULL OR ${memberContributionLedger.reversedAt} > ${at})`;
}

/**
 * The MISSED-CYCLE aggregate (AC4), as ONE statement serving TWO windows.
 *
 * "Missed" = **assigned at freeze, with no live confirmation**:
 *   · ASSIGNED — a `member_pool_assignments` row, sourced from the pool's persisted snapshot
 *     `member_assignments` (never a recompute of `assignMembersToPools`).
 *   · CLOSED — the cycle's alert reached `alert.closed`/`alert.settled` at/before `at`. An OPEN cycle
 *     is never a skip and never an elapsed opportunity: a member mid-window has missed nothing.
 *   · NO LIVE CONFIRMATION — the shared predicate above, reversals honoured, evaluated AT `at`.
 *     ⚖ Ratified 2026-08-05: contribution discipline evaluates member CONDUCT, not administrative
 *     processing latency, so a tail-reconciled confirmation landing after the cycle closed DOES clear
 *     the skip once it is part of the record being evaluated. Hence `at`, never the close instant.
 *
 * ── ⚖ THE TWO WINDOWS (ratified 2026-08-05: opportunities, never elapsed time) ────────────────────
 * Both aggregates count the SAME missed cycles; they differ only in the window, expressed as `FILTER`
 * clauses over one scan so this stays ONE query (AC7):
 *
 *   · `skips_current_year`        — missed cycles in the IST calendar year of `at` (Story 8.9's
 *     convention, never `getFullYear()` on a UTC `Date`). Feeds R7(D)/(E) and `in_lapse`.
 *   · `opportunities_since_last`  — missed cycles that closed AFTER the member's last live
 *     confirmation. This is `contribution.months_since_last`: an OPPORTUNITY-aware gap, not a
 *     wall-clock one. Feeds R7(C) (`>= 12`) and R7(F) (`>= 6`).
 *
 * Why the gap fact is counted this way rather than as elapsed calendar months: contribution is only
 * possible when a death claim freezes a cycle and a pool assigns the member. A Pariwar with no death
 * for six months creates NO opportunity — so a purely wall-clock `months_since_last` would trip R7(F)
 * for EVERY member who ever contributed, and the clause would GENUINELY apply, putting the whole
 * membership on the suspension surface (the failure D2's applied-only filter cannot catch, because the
 * clause really did apply). Counting opportunities makes the fact measure member conduct instead.
 * The UNIT is still months: pool cycles are single-calendar-month instruments by Decision
 * 2026-08-05-075, so one elapsed opportunity is one month and R7(C)/(F)'s thresholds keep their
 * meaning — in a fully active Pariwar this degenerates to the wall-clock count.
 *
 * ASSIGNMENT-GATED, deliberately: an opportunity requires the member to have been ASSIGNED to the
 * cycle, mirroring `skips_current_year`. A member not on a pool's roster had nothing to take.
 *
 * `groupByMember` switches between the single-member and whole-Pariwar (bulk) shapes; ONE query either
 * way. `ledgerScope` bounds the per-member last-confirmation CTE to the same tenant/member as `scope`.
 *
 * Bucketing `skips_current_year` by `mpa.assigned_at` (rather than the close instant) relies on the
 * same Decision 2026-08-05-075 invariant: assignment-year and close-year are identical by construction.
 * A cycle that legitimately straddled a year boundary would need this bucketing re-derived — but that
 * first requires a Trustee Panel emergency resolution; it is not a case this function handles today.
 *
 * ── ⚠ Story 10.25 (D3): the scan was RELAXED to admit TAKEN opportunities too ─────────────────────
 * Until 10.25 the `WHERE` carried `AND NOT <live confirmation>`, so only MISSED opportunities ever
 * reached the result set — which makes RUNS of taken opportunities structurally invisible, and R7(A)
 * restoration accounting is a run computation. The predicate therefore moved OUT of the `WHERE` and
 * INTO each `FILTER (...)`: the scan now sees the member's whole assigned-and-closed OPPORTUNITY
 * SEQUENCE, and the three pre-existing aggregates are computed over exactly the rows they saw before.
 *
 * ⚠ THE OBLIGATION THAT CAME WITH THAT RELAXATION: `skips_current_year`, `earliest_skip_closed_at`
 * and `opportunities_since_last` must be BIT-FOR-BIT what they were at `8be7669` for every fixture.
 * They are pinned by the Story 10.24 fact suites, which were run BEFORE the relaxation and required
 * byte-identical afterwards. A future edit that moves a `missed` term between the `WHERE` and a
 * `FILTER` is changing three shipped facts, not refactoring.
 *
 * ── The run computation (`consecutive-opportunity-restoration-v1`, Story 10.25 AC1/AC2) ──────────
 * Gap-and-islands over the SAME scan, in the SAME statement (D3 — never a third query):
 *   · `sequenced`  — each opportunity, plus the running count of MISSES up to and including it. Two
 *     TAKEN opportunities share that count iff no miss separates them, so it is the island key.
 *   · `taken_run`  — one row per MAXIMAL run of consecutive TAKEN opportunities: its length, the
 *     number of misses that preceded it, and whether it reaches the END of the sequence.
 *   · A run is a COMPLETED restoration episode iff it is preceded by ≥1 MISS (the load-bearing
 *     preceding-miss gate — without it every never-missing member reads as having burned
 *     restorations) and is at least `consecutive_required` long. Episodes are RUNS, so six-in-a-row
 *     after a miss is ONE episode, never `floor(6/3)`.
 *   · `current_open_taken_run` is the length of the run that reaches the end of the sequence, and 0
 *     when the sequence ends on a MISS or the trailing run opened no package. It is
 *     THRESHOLD-INDEPENDENT (Story 10.16's `{remaining, required}` measures it against whichever
 *     clause actually applied, which need not be R7(A)).
 *
 * ⚠ ORDERING IS TOTAL AND DETERMINISTIC — `(closed_at, pool_id)`. `member_pool_assignments`'s PK is
 * `(pool_id, member_id)`, so `pool_id` is unique per member and the order cannot depend on scan
 * order. The payload hash sits behind a 100×-thread P0 gate; a tie broken non-deterministically here
 * would surface there as flaky bytes, not as a wrong number.
 */
function missedCycleAggregateSql(
  at: Date,
  pariwarId: PariwarId,
  scope: SQL,
  ledgerScope: SQL,
  groupByMember: boolean,
): SQL {
  const selectMember = groupByMember ? sql`base.member_id AS member_id,` : sql``;
  // The current-IST-year window, applied as a FILTER so one scan serves both aggregates.
  const inCurrentYear = sql`mpa.assigned_at >= ${istYearStartUtc(at)}`;
  return sql`
    WITH last_conf AS (
      SELECT l.member_id, max(l.confirmed_at) AS last_confirmed_at
        FROM member_contribution_ledger l
       WHERE ${ledgerScope}
         AND l.confirmed_at <= ${at}
         AND (l.reversed_at IS NULL OR l.reversed_at > ${at})
       GROUP BY l.member_id
    ),
    -- Every assigned-and-closed OPPORTUNITY (taken AND missed) — the sequence AC2's "consecutive"
    -- predicate is defined over. An OPEN cycle is still never an opportunity.
    opportunity AS (
      SELECT mpa.member_id                               AS member_id,
             mpa.pool_id                                 AS pool_id,
             closed.closed_at                            AS closed_at,
             lc.last_confirmed_at                        AS last_confirmed_at,
             NOT ${liveConfirmationExistsSql('mpa', at)} AS missed,
             (${inCurrentYear})                          AS in_current_year
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
        LEFT JOIN last_conf lc ON lc.member_id = mpa.member_id
       WHERE ${scope}
         AND mpa.assigned_at <= ${at}
    ),
    sequenced AS (
      SELECT o.*,
             count(*) FILTER (WHERE o.missed) OVER (
               PARTITION BY o.member_id ORDER BY o.closed_at, o.pool_id
               ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
             ) AS misses_to_here,
             row_number() OVER (
               PARTITION BY o.member_id ORDER BY o.closed_at DESC, o.pool_id DESC
             ) AS rev_seq
        FROM opportunity o
    ),
    taken_run AS (
      SELECT s.member_id        AS member_id,
             s.misses_to_here   AS preceding_misses,
             count(*)::int      AS run_length,
             min(s.rev_seq)     AS min_rev_seq
        FROM sequenced s
       WHERE NOT s.missed
       GROUP BY s.member_id, s.misses_to_here
    ),
    base AS (
      SELECT s.member_id AS member_id,
             count(*) FILTER (WHERE s.missed AND s.in_current_year)::int      AS skips_current_year,
             min(s.closed_at) FILTER (WHERE s.missed AND s.in_current_year)   AS earliest_skip_closed_at,
             count(*) FILTER (
               WHERE s.missed
                 AND s.last_confirmed_at IS NOT NULL
                 AND s.closed_at > s.last_confirmed_at
             )::int                                                           AS opportunities_since_last
        FROM sequenced s
       GROUP BY s.member_id
    ),
    runs AS (
      SELECT r.member_id AS member_id,
             count(*) FILTER (
               WHERE r.preceding_misses >= 1
                 AND r.run_length >= ${r7aConsecutiveRequiredSql(pariwarId, at)}
             )::int                                                    AS completed_restoration_episodes,
             coalesce(
               max(r.run_length) FILTER (WHERE r.min_rev_seq = 1 AND r.preceding_misses >= 1), 0
             )::int                                                    AS current_open_taken_run
        FROM taken_run r
       GROUP BY r.member_id
    )
    SELECT ${selectMember}
           base.skips_current_year                             AS skips_current_year,
           base.earliest_skip_closed_at                        AS earliest_skip_closed_at,
           base.opportunities_since_last                       AS opportunities_since_last,
           coalesce(runs.completed_restoration_episodes, 0)::int AS completed_restoration_episodes,
           coalesce(runs.current_open_taken_run, 0)::int         AS current_open_taken_run
      FROM base
      LEFT JOIN runs ON runs.member_id = base.member_id
  `;
}

/** What {@link deriveRestorationRuns} reports over one member's opportunity sequence. */
export interface RestorationRunSummary {
  /** Maximal TAKEN runs of ≥ `consecutiveRequired` that were opened by a MISS. Never `floor(run/k)`. */
  readonly completedEpisodes: number;
  /** The length of the trailing TAKEN run, but ONLY when a MISS opened it; `0` otherwise. */
  readonly currentOpenRun: number;
}

/**
 * `consecutive-opportunity-restoration-v1`, as a PURE function — Story 10.25 (AC1, D1).
 *
 * ⚠ This is the DEFINITION; {@link missedCycleAggregateSql}'s window functions are a second EXECUTION
 * STRATEGY for it, not a second definition. The set-based spelling exists because AC8 forbids fetching
 * a member's opportunity rows to count them in JS; this spelling exists because the policy's four
 * load-bearing cases have to be assertable DB-free and exhaustively. They are PINNED TOGETHER by
 * `@twt/validity-service`'s `tests/integration/contribution-facts.spec.ts` — the "Story 10.25 —
 * restoration accounting over the real opportunity sequence" block, whose `expectRuns` helper asserts
 * SQL === PURE === the case's stated expectation over a live DB (three assertions, not one: two
 * implementations wrong in the SAME way would still pass a bare equality check). That is the identical
 * posture, and the identical obligation, that `hasLiveConfirmation` and `liveConfirmationExistsSql`
 * already carry: any change to restoration accounting MUST update both spellings and keep that block
 * green, or the two silently drift ([[project_epic6_drizzle_correlated_subquery_bug]] is the drift
 * class it prevents).
 *
 * @param sequence the member's assigned-and-closed opportunities in close order (`(closed_at,
 *                 pool_id)` ascending); `true` = TAKEN (a live confirmation at `at`), `false` = MISSED.
 * @param consecutiveRequired the restoration clause's `restoration.consecutive_required` (clause DATA).
 */
export function deriveRestorationRuns(
  sequence: readonly boolean[],
  consecutiveRequired: number,
): RestorationRunSummary {
  let completedEpisodes = 0;
  let run = 0;
  let sawMiss = false;
  let runOpenedByMiss = false;

  for (const taken of sequence) {
    if (!taken) {
      sawMiss = true;
      run = 0;
      runOpenedByMiss = false;
      continue;
    }
    // The PRECEDING-MISS gate, applied once at the run's first element. Without it, a member who has
    // taken every opportunity they were ever given reads as having burned restorations and is pushed
    // toward R7(B) — the harsher clause.
    if (run === 0) runOpenedByMiss = sawMiss;
    run += 1;
    // Counted at the EXACT moment the run reaches the threshold, so a longer run still counts ONCE:
    // six consecutive contributions after a miss is one restoration, never `floor(6 / 3)`.
    if (runOpenedByMiss && run === consecutiveRequired) completedEpisodes += 1;
  }

  return { completedEpisodes, currentOpenRun: runOpenedByMiss ? run : 0 };
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
  /**
   * Missed assigned-and-closed cycles that closed AFTER the member's last live confirmation — the
   * OPPORTUNITY-aware gap that becomes `contribution.months_since_last` (⚖ 2026-08-05: contribution
   * discipline is evaluated against opportunities, never elapsed time). `0` for a member who is
   * current; meaningless (and ignored by the derivation) when `lastConfirmedAt` is null, since a
   * never-contributed member has no "since last" window and the fact is OMITTED for them.
   */
  readonly opportunitiesSinceLast: number;
  /**
   * The instant this Pariwar's projection is authoritative from, or `null` when the backfill has never
   * run (round-2 review, Decision 2). `null`, or an `at` earlier than it, makes the facts UN-DERIVABLE
   * — `deriveContributionFacts` returns the sentinel rather than a fabricated clean record.
   */
  readonly coveredFrom: Date | null;
  /**
   * COMPLETED R7(A) restoration episodes in the member's lifetime as of `at` (Story 10.25 AC1) — the
   * count of maximal runs of ≥ `r7aConsecutiveRequired` consecutive TAKEN opportunities that are
   * preceded by ≥1 MISSED opportunity. `0` is a real answer; the count is deliberately NOT clamped at
   * R7(A)'s `lifetime_max` (that threshold is clause data, and a clamped producer would make "used 2"
   * and "used 7" indistinguishable).
   *
   * Meaningless — and ignored by the derivation — when `r7aConsecutiveRequired` is `null`.
   */
  readonly completedRestorationEpisodes: number;
  /**
   * The length of the member's CURRENT OPEN run of consecutive TAKEN opportunities — the run that
   * reaches the end of the sequence AND was opened by a MISS. `0` when the sequence ends on a miss,
   * has no opportunities, or the trailing taken run opened no package (a member who has never missed
   * is not serving a restoration package).
   *
   * THRESHOLD-INDEPENDENT: Story 10.16's `{remaining, required}` measures this against whichever R7
   * clause actually applied to the member, which need not be R7(A).
   */
  readonly currentOpenTakenRun: number;
  /**
   * R7(A)'s `restoration.consecutive_required` at `at`, from the clause DATA (Story 10.25). `null`
   * when R7(A) resolves to no version — the restoration count is then UNKNOWN and the fact is omitted.
   */
  readonly r7aConsecutiveRequired: number | null;
  /**
   * Has this member EVER asserted that a personal event affected a contribution, as of `at`? — Story
   * 10.26's SEVENTH and final engine fact anchor. A LIFETIME existential (D5), read from
   * `member/personal-event.ts`.
   *
   * ⚠ NOT nullable, and that asymmetry against every other field here is deliberate. The others are
   * read from a PROJECTION with a backfill watermark, so `0` and *unknown* had to be distinguished
   * (Story 10.25 AC7). This one is read from `events_log` — the PRIMARY RECORD, with no backfill
   * horizon — so `false` genuinely means "this member has never asserted". Do NOT extend the coverage
   * watermark to it and do NOT "fix" it into a nullable; the coverage gate still governs the payload
   * as a whole, so this fact never appears alone when the other six are un-derivable (AC3).
   *
   * ⚠ A plain BOOLEAN anchor, never the dotted fact key. The 8.10 `no-ingest-path` fence source-scans
   * this very directory for `contribution.*` literals; the producer maps this onto
   * `R7_CONTRIBUTION_FACT_KEYS.PERSONAL_EVENT_EXCUSE_CLAIMED` in `@twt/validity-service` (AC2).
   */
  readonly personalEventAsserted: boolean;
}

/** The `(pariwarId, memberId)` scope tuple for a single-member read. */
export interface ContributionFactScope {
  readonly pariwarId: PariwarId;
  readonly memberId: MemberId;
}

/**
 * Shape of an aggregate row as the DRIVER returns it, not as the SQL intends it.
 *
 * ⚠ Every count is typed `number | string | null` deliberately. `::int` normally reaches
 * node-postgres as a JS number, but this is the raw driver surface and 10.24 shipped a live bug from
 * trusting an intended type here (`max(<timestamptz>)` annotated `Date` came back a string and threw
 * `lastConfirmedAt.getTime is not a function` only on the live path). The Story 10.25 window/aggregate
 * outputs added to this same statement get the same treatment — declared raw, normalised explicitly
 * through {@link toCount} / {@link toNullableCount} / {@link toDate} at the call site.
 */
interface RawSkipRow {
  member_id?: string;
  skips_current_year: number | string | null;
  earliest_skip_closed_at: Date | string | null;
  opportunities_since_last: number | string | null;
  completed_restoration_episodes: number | string | null;
  current_open_taken_run: number | string | null;
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

/**
 * Like {@link toCount}, but PRESERVES the null. Story 10.25 (AC7): for the R7(A) restoration
 * threshold, "absent" means the governance number could not be resolved — collapsing it to `0` would
 * make every taken run a completed restoration.
 */
function toNullableCount(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined) return null;
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
      // Folded in as a scalar subquery rather than read separately, so this path keeps AC7's fixed
      // TWO-query budget. Safe here precisely because this aggregate has no GROUP BY: it always
      // returns exactly one row, even for a member with no ledger entries at all — which is the case
      // where the coverage answer decides between "clean" and "un-derivable".
      coveredFrom: sql<Date | string | null>`${coveredFromSql(scope.pariwarId)}`,
      // Story 10.25 — R7(A)'s restoration threshold, folded in beside `coveredFrom` and for the same
      // reason: this aggregate has no GROUP BY, so it returns exactly one row even for a member with
      // no ledger entries and no opportunities. The missed-cycle statement cannot carry it (it
      // returns NO row for such a member), and "0 restorations completed" must stay distinguishable
      // from "we cannot resolve how long a restoration is".
      r7aConsecutiveRequired: sql<
        number | string | null
      >`${r7aConsecutiveRequiredSql(scope.pariwarId, at)}`,
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
      scope.pariwarId,
      sql`mpa.pariwar_id = ${scope.pariwarId} AND mpa.member_id = ${scope.memberId}`,
      sql`l.pariwar_id = ${scope.pariwarId} AND l.member_id = ${scope.memberId}`,
      false,
    ),
  );
  const skip = resultRows<RawSkipRow>(skipResult)[0];

  // Story 10.26 — the THIRD query. Deliberately separate: the assertion lives on the member's own
  // `events_log` stream, a different axis from the pool/assignment scan `missedCycleAggregateSql`
  // walks, and forcing a join across axes would make the riskiest SQL in the subsystem riskier for no
  // gain (D7). Still member-history-independent — an `EXISTS`, not a row fetch.
  const personalEventAsserted = await hasAssertedPersonalEventAt(
    db,
    scope.pariwarId,
    scope.memberId,
    at,
  );

  return {
    totalCount: toCount(ledger?.totalCount),
    lastConfirmedAt: toDate(ledger?.lastConfirmedAt),
    skipsCurrentYear: toCount(skip?.skips_current_year),
    earliestSkipClosedAt: toDate(skip?.earliest_skip_closed_at),
    opportunitiesSinceLast: toCount(skip?.opportunities_since_last),
    coveredFrom: toDate(ledger?.coveredFrom),
    completedRestorationEpisodes: toCount(skip?.completed_restoration_episodes),
    currentOpenTakenRun: toCount(skip?.current_open_taken_run),
    r7aConsecutiveRequired: toNullableCount(ledger?.r7aConsecutiveRequired),
    personalEventAsserted,
  };
}

/** One member's fact inputs, as the bulk Pariwar read returns them. */
export interface MemberContributionFactInputs extends ContributionFactInputs {
  readonly memberId: MemberId;
}

/**
 * The bulk read's result: the Pariwar-level coverage watermark PLUS the per-member rows.
 *
 * Coverage is hoisted out of the rows deliberately. A member with no ledger entries and no assignments
 * has NO row here, but the caller still has to decide whether that member is CLEAN or UN-DERIVABLE —
 * and that answer is coverage, not row presence. Returning it beside the rows means the caller cannot
 * accidentally default it, and means there is exactly ONE coverage read per scan.
 */
export interface PariwarContributionFactInputs {
  readonly coveredFrom: Date | null;
  /** R7(A)'s restoration threshold at `at` (Story 10.25) — Pariwar-wide, hoisted for the same reason. */
  readonly r7aConsecutiveRequired: number | null;
  readonly members: readonly MemberContributionFactInputs[];
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
): Promise<PariwarContributionFactInputs> {
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
    missedCycleAggregateSql(
      at,
      pariwarId,
      sql`mpa.pariwar_id = ${pariwarId}`,
      sql`l.pariwar_id = ${pariwarId}`,
      true,
    ),
  );

  // The bulk path CANNOT fold the Pariwar context into its ledger query the way the single-member path
  // does: that query GROUPs BY member, so a Pariwar whose ledger is empty returns zero rows — and an
  // empty ledger is exactly when coverage decides between "everyone is clean" and "nothing was
  // projected". One extra Pariwar-scoped read, still member-count-independent (AC7).
  const { coveredFrom, r7aConsecutiveRequired } = await readContributionProjectionContext(
    db,
    pariwarId,
    at,
  );

  // Story 10.26 — the FOURTH query, the bulk shape of the assertion existential. One GROUP BY over the
  // Pariwar's `member.personal_event_asserted` events, never one read per member in a loop (10.24
  // AC7's binding structural criterion).
  const asserted = await listMembersWithPersonalEventAssertionAt(db, pariwarId, at);

  const byMember = new Map<string, MemberContributionFactInputs>();
  for (const row of ledgerRows) {
    byMember.set(row.memberId, {
      memberId: row.memberId,
      totalCount: toCount(row.totalCount),
      lastConfirmedAt: toDate(row.lastConfirmedAt),
      skipsCurrentYear: 0,
      earliestSkipClosedAt: null,
      opportunitiesSinceLast: 0,
      coveredFrom,
      completedRestorationEpisodes: 0,
      currentOpenTakenRun: 0,
      r7aConsecutiveRequired,
      personalEventAsserted: asserted.has(toMemberId(row.memberId)),
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
      opportunitiesSinceLast: toCount(row.opportunities_since_last),
      coveredFrom,
      completedRestorationEpisodes: toCount(row.completed_restoration_episodes),
      currentOpenTakenRun: toCount(row.current_open_taken_run),
      r7aConsecutiveRequired,
      personalEventAsserted: asserted.has(toMemberId(row.member_id)),
    });
  }
  // A member who has ONLY ever asserted — no ledger rows, no assignments — appears in neither
  // aggregate above, and must still reach the caller carrying `personalEventAsserted: true`. Without
  // this pass the bulk path would report `false` for exactly the member R7(G) is about, while the
  // single-member path reported `true`: a silent bulk/individual divergence on the one fact this
  // story exists to supply.
  for (const assertedMemberId of asserted) {
    const key = String(assertedMemberId);
    if (byMember.has(key)) continue;
    byMember.set(key, {
      memberId: assertedMemberId,
      totalCount: 0,
      lastConfirmedAt: null,
      skipsCurrentYear: 0,
      earliestSkipClosedAt: null,
      opportunitiesSinceLast: 0,
      coveredFrom,
      completedRestorationEpisodes: 0,
      currentOpenTakenRun: 0,
      r7aConsecutiveRequired,
      personalEventAsserted: true,
    });
  }
  // Deterministic order — by member id, the projection-wide ordering discipline.
  const members = [...byMember.values()].sort((a, b) =>
    a.memberId < b.memberId ? -1 : a.memberId > b.memberId ? 1 : 0,
  );
  return { coveredFrom, r7aConsecutiveRequired, members };
}
