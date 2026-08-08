// The restoration-discipline imposition writer — Story 10.23 (Task 4; AC2, AC3, AC4; D3, D5, D6).
//
// ══════════════════════════════════════════════════════════════════════════════════════════════════
// ⚖ THIS CODE REMOVES A MEMBER'S COVERAGE WITH NO HUMAN IN THE LOOP. READ THIS BEFORE EDITING.
// ══════════════════════════════════════════════════════════════════════════════════════════════════
//
// It is the first thing in the substrate that does so. Moderation removes coverage too, but a
// trustee decides, records a ground, writes a Decision Note and passes a step-up OTP. Here, a
// projection changes, a ladder verdict flips, and a member stops being covered.
//
// ── ⚖ Stance #5, reconciled EXPLICITLY rather than assumed (AC2, Escalation 3) ───────────────────
// `ux-design-specification.md:89` permits time-as-actor (SIE) *"for **non-punitive** state
// transitions only (lock-in expiry, renewal grace close, pool window close). Suspensions,
// accusations, and asset actions always require a human edge."*
//
// Lock-in **EXPIRY** is on that allowlist. Lock-in **IMPOSITION** is not. So this writer needs an
// argument, and the argument is:
//
//     ⭐ A RESTORATION LOCK-IN IS NOT A SANCTION.
//
// The moderation decision brief's §1c table classifies a lock-in as *"**Not** a sanction"* against
// suspension's *"A sanction"*, and Niyamavali §1.3 (`docs/legal/niyamavali.md:38`) defines it as
// *"imposed on joining, rejoining, or **after a discipline event**"* — a consequence that attaches
// BY RULE, not a §8.2 ground a trustee finds. The member's own joining lock-in is imposed by exactly
// the same kind of automatic rule and nobody reads it as a punishment.
//
// ⚠ **THE NEXT READER WILL OTHERWISE READ AN AUTOMATIC `is_valid: false` AS AN AUTO-SUSPENSION.**
// That is why this paragraph is here and not only in the story file. It does extend the SIE
// allowlist in substance, and that extension is **routed to the Trustee Panel with this story**
// rather than asserted by the implementation (Escalation 3, recorded as owed and NOT ruled on).
//
// ── ⛔ AND THE OBLIGATION IT CREATES MAY BE UNSATISFIABLE (D8, Escalation 6) ─────────────────────
// R7(D) prescribes `catch_up_required`; R7(E)/(F) prescribe `complete_all`. **Neither has a
// mechanism.** §3.1's ratified interpretive note says a skip clears through "reconciliation or an
// authorized catch-up process"; no authorized catch-up process exists, because contribution flows
// only to an OPEN cycle (Story 7.6, fenced by 8.10). So for three of the four activated clauses this
// writer imposes a coverage-removing period whose stated completion condition no workflow can
// satisfy. `UNSATISFIABLE_COMPLETION_KEYS` below is that gap, expressed in code; the ratified
// re-imposition bar is what keeps it BOUNDED; and the AC14 rollout flag (apps/jobs) is what keeps it
// OFF until the Trustee Panel discharges it.

import { sql } from 'drizzle-orm';
import type pg from 'pg';

import { bindScopedDb } from '../../db.js';
import type { ClauseVersionId, MemberId, PariwarId } from '../../ids/index.js';
import { memberRestorationImpositions } from '../../schema/member_restoration_impositions.js';
import { getCurrentMemberState } from '../read.js';
import { projectMemberState } from '../project.js';
import {
  getCurrentMemberRestorationDiscipline,
  type RestorationDisciplineOverlay,
  type RestorationImposition,
} from './overlay.js';
import {
  isImpositionLiveAt,
  RESTORATION_DISCIPLINE_IMPOSED_EVENT,
  type RestorationCombinationRule,
} from './status.js';

// ── The Escalation-6 gap, expressed as data ──────────────────────────────────────────────────────

/**
 * The `restoration`-block keys whose completion condition **NO ratified system workflow can
 * currently satisfy** (D8, Escalation 6).
 *
 * ⛔ **THIS CONSTANT IS THE GOVERNANCE GAP, NOT A TUNING KNOB.** A member under R7(D)'s
 * `catch_up_required` or R7(E)/(F)'s `complete_all` is told to discharge an obligation by paying a
 * CLOSED cycle, and there is no channel through which they can. R7(A)/(B)/(C)'s
 * `consecutive_required` packages are completable through ordinary forward contribution and are
 * therefore absent from this list.
 *
 * ⭐ **THIS IS THE LINE A SUCCESSOR STORY EDITS.** When a catch-up / complete-all payment path is
 * ratified and built (Escalation 6 route (a)), removing the corresponding key here is what lifts the
 * re-imposition bar below for that rung — no other code changes. Equally, a Part 11 reinterpretation
 * under which "catch-up" is satisfiable by acts the system already supports (route (c)) empties this
 * list without anything being built. **Do not remove a key here to make a test go green**: the key's
 * presence is a claim about the RUNNING SYSTEM, and removing it while the gap persists silently
 * converts a bounded consequence into a permanent one
 * ([[feedback_mechanization_split_commitment]]).
 */
export const UNSATISFIABLE_COMPLETION_KEYS = ['catch_up_required', 'complete_all'] as const;

/**
 * Does this clause's restoration package name a completion condition nothing can satisfy today?
 *
 * PURE, and a DATA predicate over the clause payload — never a clause-id branch (D3). A Trustee
 * amendment that gives a rung a satisfiable package moves this with no code change.
 */
export function hasUnsatisfiableCompletionCondition(payload: Record<string, unknown>): boolean {
  const restoration = (payload as { restoration?: unknown }).restoration;
  if (typeof restoration !== 'object' || restoration === null) return false;
  const block = restoration as Record<string, unknown>;
  return UNSATISFIABLE_COMPLETION_KEYS.some((key) => block[key] === true);
}

/**
 * Read `restoration.lock_in_months` out of a resolved clause payload — the DURATION half of AC3.
 *
 * `null` when the clause carries no positive `lock_in_months`. ⚠ **THE `> 0` IS LOAD-BEARING AND
 * EASY TO GET WRONG (D3).** `imposesRestorationObligation` returns TRUE for R7(A), because R7(A) DOES
 * impose a restoration obligation — `consecutive_required: 3`. But R7(A) ships
 * `lock_in_months: 0`: it prescribes consecutive contributions and **no lock-in at all**. A trigger
 * that reads only "does this clause impose something?" would give every R7(A) member a ZERO-LENGTH
 * lock-in — a coverage removal §3.1 never prescribed, on the population least able to absorb it
 * (members with under 10 lifetime contributions). The DB CHECK `lock_in_months > 0` is the
 * structural backstop; this is the semantic one.
 */
export function readLockInMonths(payload: Record<string, unknown>): number | null {
  const restoration = (payload as { restoration?: unknown }).restoration;
  if (typeof restoration !== 'object' || restoration === null) return null;
  const value = (restoration as { lock_in_months?: unknown }).lock_in_months;
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null;
}

// ── The EPISODE (AC2, Decision `2026-08-07-088` clause 3) ────────────────────────────────────────

/** The contribution-record facts that anchor an episode. Supplied by the caller's fact read. */
export interface EpisodeAnchor {
  /** The close instant of the EARLIEST missed cycle in the current IST year; `null` when no skip. */
  readonly earliestSkipClosedAt: Date | null;
  /** The member's last live confirmation; `null` when they have never contributed. */
  readonly lastConfirmedAt: Date | null;
  /** Missed assigned-and-closed cycles in the current IST year. */
  readonly skipsCurrentYear: number;
}

/**
 * The skip-count/anchor context at imposition — AUDIT DATA ONLY (Decision `2026-08-08-091`, amending
 * Decision `2026-08-07-088` clause 3). PURE and deterministic, recorded on every imposition so a
 * trustee can see what the member's contribution record looked like at the moment of imposition.
 *
 * ⛔ **This is NOT what the re-imposition bar matches on.** It was, until a round-2 review of this
 * story found the bug: `skipsCurrentYear` is scoped to the IST CALENDAR YEAR, so it — and the anchor
 * instant paired with it — moves at the year boundary, and again on every further missed cycle,
 * REGARDLESS of whether the member ever had a way to resolve the original gap. For the population
 * this bar exists to protect (R7(D)/(E)/(F), Escalation 6: no catch-up channel exists), a further
 * missed cycle is not the member ACTING; it is the mechanical, guaranteed consequence of staying on
 * the roster (AC6) while genuinely unable to comply. Matching on this value therefore re-created,
 * through skip-count drift, the exact "de-facto permanent, machine-imposed coverage removal" the
 * ratified rule was written to bar. See `shouldImpose` and `RestorationImposition.completionUnsatisfiable`
 * for the corrected mechanism. This function and its output are kept for the audit trail only.
 *
 * ⚠ The `.000Z`-free ISO form is what `events.ts`'s `episodeKeySchema` regex accepts; keep them in
 * step. Millisecond precision is retained because two skips can close inside one second in tests.
 */
export function episodeKeyOf(anchor: EpisodeAnchor): string {
  const instant = anchor.earliestSkipClosedAt ?? anchor.lastConfirmedAt;
  const anchorPart = instant === null ? 'no-record' : instant.toISOString();
  return `${anchorPart}|skips:${anchor.skipsCurrentYear}`;
}

// ── The decision (AC2) ───────────────────────────────────────────────────────────────────────────

/** Why an imposition was or was not written — returned so the caller can log/telemetry it. */
export type ImpositionDecision =
  | { readonly impose: true }
  | { readonly impose: false; readonly reason: 'no-lock-in-duration' }
  | { readonly impose: false; readonly reason: 'already-live-for-clause' }
  | { readonly impose: false; readonly reason: 'same-unresolved-episode' };

/**
 * Should a lock-in be imposed for this clause, on this member, right now? PURE — the whole of AC2's
 * idempotency and the ratified re-imposition bar, with no I/O, so both are unit-testable.
 *
 * The three refusals, in evaluation order:
 *
 * **(1) `no-lock-in-duration`** — the clause prescribes no positive `lock_in_months` (D3: R7(A)).
 *
 * **(2) `already-live-for-clause`** — idempotency WHILE LIVE. An un-expired imposition for the same
 * clause is already in force; a second one would double-record a single consequence. The residual
 * race is closed by the `events_log (stream_id, event_version)` unique index, exactly as it is for
 * moderation.
 *
 * **(3) `same-unresolved-episode`** — ⛔ **THE RATIFIED RULE** (Decision `2026-08-07-088` clause 3,
 * routing-note Q3, Option (a); MATCHING MECHANISM CORRECTED by Decision `2026-08-08-091`):
 *
 *     An expired imposition does NOT re-impose while the same unresolved episode's completion
 *     condition remains unsatisfiable.
 *
 * **Implement as stated; do not re-derive it.** The Panel's ground: §3.1 prescribes a **bounded**
 * consequence, and continuous re-imposition converts it into a **de-facto permanent coverage removal
 * imposed by a machine** — structurally the failure Story 10.17 was written to correct, arriving
 * through a different door. Without this leg, a member under R7(D)/(E) whose skip cannot be cleared
 * (because no catch-up channel exists) would be re-locked on every scan until the skip aged out at
 * the IST year boundary. A bounded consequence the member cannot escape by acting is a different
 * instrument from the one §3.1 prescribes.
 *
 * ⚠ Note the TWO scoping words, both load-bearing — and both now answered WITHOUT `episodeKeyOf`:
 *   · **"same unresolved episode"** — matched by `completionUnsatisfiable`, cross-clause (a member
 *     drifting F→C without acting is still barred, matching the original episode-scoped intent), NOT
 *     by `episodeKey`. `episodeKey` folds in `skipsCurrentYear`, which is IST-year-scoped and moves on
 *     every further missed cycle — exactly the mechanical, action-free drift this population cannot
 *     avoid (round-2 review finding; Decision `2026-08-08-091`). A "genuinely new episode" under this
 *     bar therefore requires either `UNSATISFIABLE_COMPLETION_KEYS` shrinking (the documented,
 *     ratified-policy-transition discharge path — see that constant) or a future discharge mechanism;
 *     it is never produced by elapsed time or an uncontrollable further skip.
 *   · **"remains unsatisfiable"** — the bar applies only while the package's completion condition
 *     cannot be discharged, re-checked LIVE against the CURRENT `clausePayload` on every call (never a
 *     stored historical value) — that is what lets the documented discharge path lift the bar for
 *     every affected member the moment the registry changes, with no backfill. A member under a
 *     `consecutive_required` package CAN act, so §3.1's bounded-consequence logic is not violated by
 *     re-imposition there and the bar does not apply.
 */
export function shouldImpose(
  overlay: RestorationDisciplineOverlay,
  clauseId: string,
  clausePayload: Record<string, unknown>,
  now: Date,
): ImpositionDecision {
  if (readLockInMonths(clausePayload) === null) {
    return { impose: false, reason: 'no-lock-in-duration' };
  }

  const liveForClause = overlay.impositions.some(
    (i: RestorationImposition) => i.clauseId === clauseId && isImpositionLiveAt(i.expiresAt, now),
  );
  if (liveForClause) return { impose: false, reason: 'already-live-for-clause' };

  if (hasUnsatisfiableCompletionCondition(clausePayload)) {
    // ⚠ EXPIRED impositions only — and the word "expired" is doing real work here.
    //
    // The ratified rule reads "**An expired imposition** does NOT re-impose while the same unresolved
    // episode's completion condition remains unsatisfiable." It bars RE-imposition, not CONCURRENT
    // imposition. Testing every imposition regardless of liveness would over-apply it and
    // UNDER-impose: within a single scan where R7(D) (3 months) and R7(F) (5 months) both apply to
    // one episode, the ascending clause-id order writes R7(D) first, and a liveness-blind check would
    // then refuse R7(F) — leaving the member with 3 months where §3.1 prescribes 5.
    //
    // Concurrency is AC5's job, not this bar's: two live impositions combine by MAXIMUM, which is
    // exactly the §3.1-faithful answer. This leg only stops the member being re-locked once a period
    // has ELAPSED and they still cannot discharge the obligation.
    //
    // ⛔ CROSS-CLAUSE, deliberately (matches the F→C drift precedent): a member's OTHER expired,
    // also-unsatisfiable imposition bars this one too, because taking no action and resolving nothing
    // is the same fact regardless of which rung the member currently reads on.
    const servedThisEpisode = overlay.impositions.some(
      (i) => i.completionUnsatisfiable && !isImpositionLiveAt(i.expiresAt, now),
    );
    if (servedThisEpisode) return { impose: false, reason: 'same-unresolved-episode' };
  }

  return { impose: true };
}

// ── The write ────────────────────────────────────────────────────────────────────────────────────

export interface ImposeRestorationLockInInput {
  readonly memberId: MemberId;
  readonly pariwarId: PariwarId;
  /** The APPLIED R7 clause that imposes — **this is the reason** (D5). */
  readonly clauseId: string;
  /** Its resolved payload; `lock_in_months` and the completion condition are read from it. */
  readonly clausePayload: Record<string, unknown>;
  /** The R7 clause VERSION that supplied the duration — the FR-8 pin, half one (AC3). */
  readonly clauseVersionId: ClauseVersionId;
  /** The `niy.restoration-discipline.policy` VERSION that supplied the instrument — half two (D2). */
  readonly policyClauseVersionId: ClauseVersionId;
  /** The concurrency rule resolved from that policy clause's payload (AC5) — registry data. */
  readonly concurrencyRule: RestorationCombinationRule;
  /** The member's current episode anchor, from the caller's already-performed fact read. */
  readonly episodeAnchor: EpisodeAnchor;
  /** Injected app clock — used ONLY for liveness evaluation, never as the recorded instant. */
  readonly now: Date;
}

export interface ImposeRestorationLockInResult {
  readonly decision: ImpositionDecision;
  /** Present only when `decision.impose === true`. */
  readonly imposed: {
    readonly restorationImpositionId: string;
    readonly lockInMonths: number;
    readonly imposedAt: Date;
    readonly expiresAt: Date;
    readonly episodeKey: string;
    readonly eventId: string;
    readonly eventVersion: number;
  } | null;
}

/**
 * Impose a restoration lock-in, idempotently, if AC2's predicate says one is owed.
 *
 * Runs in the **CALLER's scope transaction** — it never opens its own (`moderateMember` /
 * `insertMemberWithdrawal` / `projectMemberState` contract). The caller has already run `BEGIN` +
 * `setPariwarScope`, and the event append and the record insert land in that same transaction so the
 * two can never diverge.
 *
 * ⚠ The ONLY production caller is the apps/jobs restoration-discipline job, and it is gated behind
 * the AC14 default-OFF rollout flag. It must **NOT** be called from `@twt/validity-service`:
 * `assemblePayload` is a READ path, and writing from it would put a second writer on the correctness
 * path, break as-of replay, and make every payload read a mutation.
 */
export async function imposeRestorationLockIn(
  client: pg.PoolClient,
  input: ImposeRestorationLockInInput,
): Promise<ImposeRestorationLockInResult> {
  const db = bindScopedDb(client);
  // Audit data only (Decision `2026-08-08-091`) — recorded on the event, never matched on below.
  const episodeKey = episodeKeyOf(input.episodeAnchor);

  // (1) The legality + idempotency read. UNBOUNDED deliberately — `input.now` is the injected APP
  //     clock while `occurred_at` is DB-generated, so bounding by it would let app-clock lag hide a
  //     previous imposition's event and write a duplicate. See `getCurrentMemberRestorationDiscipline`.
  const overlay = await getCurrentMemberRestorationDiscipline(db, input.memberId, input.now);

  const decision = shouldImpose(overlay, input.clauseId, input.clausePayload, input.now);
  if (!decision.impose) return { decision, imposed: null };

  // `shouldImpose` already proved this is a positive integer; re-read for the value.
  const lockInMonths = readLockInMonths(input.clausePayload)!;
  // Pinned like `lockInMonths`/`concurrencyRule` (FR-8) — what a LATER `shouldImpose` call matches on
  // for this row, per Decision `2026-08-08-091`.
  const completionUnsatisfiable = hasUnsatisfiableCompletionCondition(input.clausePayload);

  // (2) ⏱ The instants, DB-AUTHORITATIVE (AC3, architecture §1.11) and CALENDAR-CORRECT (AC4).
  //
  //     Resolved in ONE statement so the event payload and the table row carry byte-identical
  //     values from a single source. `make_interval(months => N)` is Postgres's own calendar-month
  //     arithmetic: a Jan-31 anchor + 1 month CLAMPS to Feb-28/29 rather than overflowing into
  //     March, and a leap day is handled by the calendar rather than by us.
  //
  //     ⛔ NEVER `N * 30 * 86_400_000`, and never an app-server clock. Fixed-ms month spans drift up
  //     to 3 days per quarter (AI-3-1), and an app clock would make the recorded imposition instant
  //     disagree with `occurred_at` on the very event that records it.
  //
  //     ⚠ `clock_timestamp()`, NOT `now()` (review finding). `now()`/`transaction_timestamp()` is
  //     fixed for the whole surrounding transaction — harmless for a single imposition, but the
  //     apps/jobs writer calls this function repeatedly inside ONE Pariwar-scoped transaction, so
  //     `now()` would stamp every member imposed in the same run with the IDENTICAL instant.
  //     `clock_timestamp()` reads the actual wall clock at each call — but it is VOLATILE, so writing
  //     it twice in one SELECT list (once for `imposed_at`, once inside `expires_at`'s expression)
  //     would evaluate it TWICE and could return two microseconds-apart values, breaking the exact
  //     `expires_at = imposed_at + N months` identity AC4 tests. A CTE evaluates it ONCE and both
  //     columns reference that single value.
  const instants = await db.execute<{ imposed_at: string | Date; expires_at: string | Date }>(
    sql`WITH t AS (SELECT clock_timestamp() AS now)
        SELECT now AS imposed_at, now + make_interval(months => ${lockInMonths}) AS expires_at FROM t`,
  );
  const instantRow = instants.rows[0];
  if (!instantRow) throw new Error('[imposeRestorationLockIn] clock read returned no row');
  // ⚠ Raw `db.execute` BYPASSES Drizzle's column mapper, so these come back as STRINGS on the live
  // path even though the column type is `timestamptz` — the TypeError `moderation/read.ts:238-251`
  // records. Coerce explicitly ([[project_live_db_test_gotchas]]).
  const imposedAt = new Date(instantRow.imposed_at);
  const expiresAt = new Date(instantRow.expires_at);

  // (3) The lifecycle state, for the audit shape. `from_state === to_state` on every imposition:
  //     this is a lifecycle NON-transition (AC1), so the reducer is identity by construction.
  //     UNBOUNDED (review finding), matching the legality read above and `projectMemberState`'s own
  //     internal replay: `input.now` is the injected APP clock, `occurred_at` is DB-generated, and
  //     bounding by the former could make this audit field disagree with the state the projector's
  //     unbounded replay is about to write moments later under clock skew.
  const lifecycleState = await getCurrentMemberState(db, input.memberId);

  // (4) Append the event via the canonical projector (identity on `members.state` by construction).
  //     ⚠ `actor: 'system'` — nobody decided. See the Stance #5 reconciliation in this file's header.
  const projected = await projectMemberState(client, {
    memberId: input.memberId,
    pariwarId: input.pariwarId,
    eventType: RESTORATION_DISCIPLINE_IMPOSED_EVENT,
    payload: {
      from_state: lifecycleState,
      to_state: lifecycleState,
      trigger: 'restoration_discipline.imposed',
      actor: 'system',
      clause_id: input.clauseId,
      clause_version_id: String(input.clauseVersionId),
      policy_clause_version_id: String(input.policyClauseVersionId),
      lock_in_months: lockInMonths,
      concurrency_rule: input.concurrencyRule,
      imposed_at: imposedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      episode_key: episodeKey,
      completion_unsatisfiable: completionUnsatisfiable,
    },
    // NULL = system / SIE (architecture §1.14). There is no actor to attribute (D5).
    actorId: null,
  });

  // (5) The record, in the SAME tx — the indexed read surface for the pinned parameters.
  const inserted = await db
    .insert(memberRestorationImpositions)
    .values({
      memberId: input.memberId,
      pariwarId: input.pariwarId,
      clauseId: input.clauseId,
      clauseVersionId: input.clauseVersionId,
      policyClauseVersionId: input.policyClauseVersionId,
      lockInMonths,
      concurrencyRule: input.concurrencyRule,
      episodeKey,
      imposedAt,
      expiresAt,
    })
    .returning();
  const row = inserted[0];
  if (!row) {
    throw new Error('[imposeRestorationLockIn] insert returned no row — check session scope');
  }

  return {
    decision,
    imposed: {
      restorationImpositionId: String(row.restorationImpositionId),
      lockInMonths,
      imposedAt,
      expiresAt,
      episodeKey,
      eventId: projected.eventId,
      eventVersion: projected.eventVersion,
    },
  };
}
