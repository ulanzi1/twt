// The restoration-discipline overlay — Story 10.23 (Task 2; AC1, AC4, AC5).
//
// The SECOND event-derived governance overlay on the member's own stream (`member/moderation/`,
// Story 10.10, is the shipped precedent and this file mirrors it structurally). It is ORTHOGONAL to
// the primary member lifecycle machine: `members.state` is NEVER written, `MEMBER_LIFECYCLE_STATES`
// is unchanged, there is no `ALTER TYPE`, no reducer arm, no projector edit, no
// `app.member_state_writer` change and no `member-state-invariant` allowlist entry. The one
// `member.restoration_discipline.imposed` event folds through `memberStateMachine` as IDENTITY.
//
// ── ⭐ AI-10-1 — THE RESTORATION-DISCIPLINE OVERLAY INVARIANT (AC12) ──────────────────────────────
//
// Commissioned BY NAME by Decision `2026-08-04-072` (`.decision-log.md:1113`): *"Story 10.23
// dev-story: introduce the restoration-discipline overlay invariant (D2-a, a second overlay
// mirroring the shipped moderation overlay) with its own `AI-10-n` comment block."* That decision
// ratified `_bmad-output/planning-artifacts/architecture.md` as FROZEN at Step 8 (before Epic 4
// existed; it contains zero references to `MemberValidityPayload`, `is_valid`, overlays or any
// `AI-N-M` invariant), and fixed the canonical architectural record for this class of invariant as a
// STRUCTURED DOC-COMMENT AT THE POINT OF USE — the AI-7-2 precedent
// (`apps/jobs/src/assignable-roster.ts:41-74`), *"not `architecture.md`"*. **`architecture.md` is
// therefore NOT amended by this story** ([[feedback_architecture_vs_adr_boundary]]).
//
// A reviewer who reads only this block can identify a violation. The invariant has four legs:
//
//   **(1) ORTHOGONAL TO THE LIFECYCLE MACHINE — `members.state` never moves.**
//   This overlay is a second, independent state machine on the same stream. A change that adds a
//   `member_lifecycle_state` label, a reducer arm, or a `current_state` column for this instrument
//   violates it. The status is FOLDED from events; the table is a decision record, not the status.
//
//   **(2) IT REACHES COVERAGE THROUGH `deriveIsValid`, THE WIRE THROUGH `specialFlags`, AND THE
//   ROSTER THROUGH NEITHER.**
//   ⛔ This is the load-bearing leg — the one that makes an automatic sanction survivable. If a
//   locked-in member ever leaves the DONOR ROSTER, pool assignment is the only contribution path
//   (Story 7.6, fenced by 8.10), so R7(D)'s *"catch-up of the missed contribution"* becomes
//   unreachable — recreating, automatically and at scale and with no trustee acting, the de-facto
//   permanent ban Story 10.17 was written to correct. `epics.md:3878` says *"ignored by the roster"*
//   for exactly this reason.
//   **The structural guarantee: `deriveIsAssignable(state, moderationStatus)` CANNOT SEE this
//   overlay — it is not in the signature.** Keep it that way. Widening that signature "for symmetry"
//   is the single most damaging change available in this diff.
//
//   **(3) THE TWO DISCIPLINE CLOCKS ARE INDEPENDENT AND CONCURRENT (AC5).**
//   The JOINING clock (`lockInStatus`, FR-8, `lock_in_days_at_join`) and this RESTORATION clock are
//   separate instruments that may both be live on one member, with different expiries. Neither is
//   derived from, shortened by, or folded into the other (Decision `2026-08-06-079`): *"One clock
//   never absorbs the other."* A merged `disciplineStatus` with a single `unlockDate` violates it —
//   it cannot represent concurrency, and the first thing anyone does with it is take a `max` or a
//   `min`, which is subsumption by arithmetic. `contribution.r7a_restorations_used` is likewise NOT
//   an input to this clock's expiry (Story 10.25 D5 forbids it by name).
//
//   **(4) EXPIRY IS DERIVED AT READ, NEVER EVENTED, AND NEVER JOB-DRIVEN (AC4).**
//   There is no `…restoration_discipline.expired` event and no scheduled worker. A second writer
//   producing already-derivable information would introduce a window in which the overlay is stale
//   because a job had not run. The join lock-in has an expiry event only because a LIFECYCLE STATE
//   must move; this overlay has none.
//
// ── SINGLE-stream, like moderation (unlike the multi-claim account-frozen overlay) ───────────────
// Impositions live on the MEMBER's own stream, so `event_version` is a total order on its own — no
// `(occurred_at, stream_id, event_version)` tiebreak is needed.

import { and, asc, eq, inArray, lte } from 'drizzle-orm';

import type { Db } from '../../db.js';
import type { MemberId } from '../../ids/index.js';
import { eventsLog } from '../../schema/events_log.js';
import {
  asRestorationCombinationRule,
  isImpositionLiveAt,
  isRestorationDisciplineEventType,
  RESTORATION_DISCIPLINE_EVENT_TYPES,
  type RestorationCombinationRule,
  type RestorationDisciplineState,
} from './status.js';

/** A minimal event the overlay evaluator folds over. `payload` supplies every pinned parameter. */
export interface RestorationDisciplineOverlayEventInput {
  readonly type: string;
  readonly occurredAt: Date;
  readonly payload: unknown;
}

/** One folded imposition — the event payload, parsed defensively into typed fields. */
export interface RestorationImposition {
  /** The R7 clause that imposed. **This is the reason** (D5): no reason-code registry exists. */
  readonly clauseId: string;
  /** The R7 clause version that supplied `lockInMonths` — re-resolve via `resolveByClauseVersionId`. */
  readonly clauseVersionId: string;
  /** The `niy.restoration-discipline.policy` version that supplied the instrument parameters (D2). */
  readonly policyClauseVersionId: string;
  /** The duration in force AT IMPOSITION (FR-8: a later re-tune must not move this member). */
  readonly lockInMonths: number;
  /** The concurrency rule in force at imposition (AC5) — registry data, pinned. */
  readonly concurrencyRule: RestorationCombinationRule;
  readonly imposedAt: Date;
  readonly expiresAt: Date;
  /** The skip-count/anchor context at imposition — AUDIT DATA ONLY; see `completionUnsatisfiable`. */
  readonly episodeKey: string;
  /**
   * Was this clause's completion condition unsatisfiable AT imposition (Decision `2026-08-08-091`)?
   * PINNED, like `lockInMonths`/`concurrencyRule` — what the re-imposition bar matches on, not
   * `episodeKey`, because `episodeKey` moves on a fresh skip or an IST-year rollover even while the
   * underlying gap stays genuinely unresolved.
   */
  readonly completionUnsatisfiable: boolean;
}

/** The derived restoration-discipline verdict. NOT a member lifecycle state, NOT `lockInStatus`. */
export interface RestorationDisciplineOverlay {
  /** `in-lock-in` while ANY imposition is un-expired at the pinned instant; else `expired`/`never-imposed`. */
  readonly state: RestorationDisciplineState;
  /**
   * The COMBINED expiry across live impositions, per the pinned concurrency rule (AC5) — the
   * MAXIMUM, ratified by Decision `2026-08-07-088` clause 1. `null` when not in force.
   */
  readonly expiresAt: Date | null;
  /** When the CURRENT standing began — the earliest live imposition's instant. `null` when not in force. */
  readonly imposedAt: Date | null;
  /**
   * EVERY imposition on the stream, live and expired, in stream order.
   *
   * The write path reads this for both idempotency legs (AC2): a live imposition for the same
   * `clauseId` blocks a duplicate, and an EXPIRED imposition whose `completionUnsatisfiable` is
   * `true` blocks re-imposition of ANY currently-unsatisfiable clause (cross-clause, matching the
   * F→C drift precedent — not `episodeKey`, which is audit data only as of Decision `2026-08-08-091`).
   * The read path ignores it.
   */
  readonly impositions: readonly RestorationImposition[];
}

/** The not-imposed verdict — the default for the overwhelming majority of members. */
export const NO_RESTORATION_DISCIPLINE: RestorationDisciplineOverlay = {
  state: 'never-imposed',
  expiresAt: null,
  imposedAt: null,
  impositions: [],
};

/** Read a string field defensively (the fold must stay TOTAL on a malformed payload). */
function stringOf(payload: Record<string, unknown>, key: string): string | null {
  const value = payload[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/** Read an instant defensively — an unparseable date is a skipped event, never a throw or an Invalid Date. */
function dateOf(payload: Record<string, unknown>, key: string): Date | null {
  const value = payload[key];
  if (typeof value !== 'string') return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Parse one imposition payload, or `null` if it is not a well-formed one.
 *
 * TOTAL by construction: every field is checked, and a payload missing any of them yields `null`
 * (the event is then skipped as identity). The WRITE path validates against the strict Zod schema
 * before anything is appended; this fold must stay robust for replay over ANY stream — including one
 * seeded by a future story or repaired by hand.
 */
function parseImposition(payload: unknown): Omit<RestorationImposition, 'imposedAt'> | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const p = payload as Record<string, unknown>;

  const clauseId = stringOf(p, 'clause_id');
  const clauseVersionId = stringOf(p, 'clause_version_id');
  const policyClauseVersionId = stringOf(p, 'policy_clause_version_id');
  const episodeKey = stringOf(p, 'episode_key');
  const expiresAt = dateOf(p, 'expires_at');
  const concurrencyRule = asRestorationCombinationRule(p['concurrency_rule']);
  const lockInMonths = p['lock_in_months'];
  const completionUnsatisfiable = p['completion_unsatisfiable'];

  if (
    clauseId === null ||
    clauseVersionId === null ||
    policyClauseVersionId === null ||
    episodeKey === null ||
    expiresAt === null ||
    concurrencyRule === null ||
    typeof lockInMonths !== 'number' ||
    !Number.isInteger(lockInMonths) ||
    lockInMonths <= 0 ||
    typeof completionUnsatisfiable !== 'boolean'
  ) {
    return null;
  }

  return {
    clauseId,
    clauseVersionId,
    policyClauseVersionId,
    lockInMonths,
    concurrencyRule,
    expiresAt,
    episodeKey,
    completionUnsatisfiable,
  };
}

/**
 * Combine the live impositions' expiries under the PINNED registry rule (AC5).
 *
 * ⚠ THE RULE IS REGISTRY DATA, NOT A CODE CONSTANT. Decision `2026-08-07-088` clause 1 ratified both
 * the `max_over_live` reading AND its placement: it lives in the `niy.restoration-discipline.policy`
 * clause payload so the Trustee Panel can amend it as a governance act. A bare `Math.max(...)` here
 * with no clause backing does NOT satisfy AC5 even though it computes the same answer today — which
 * is why the rule is carried on each imposition's payload (pinned at imposition, FR-8) and switched
 * on explicitly below rather than assumed.
 *
 * The `switch` is EXHAUSTIVE over `RestorationCombinationRule`: adding a rule to the registry
 * vocabulary without implementing it here is a COMPILE ERROR, not a silent fallback to `max`.
 *
 * ⚠ Which rule governs when live impositions pin DIFFERENT policy versions: the one on the MOST
 * RECENT live imposition (by `imposedAt`, computed explicitly below — NOT by array position). The
 * newest imposition was made under the newest ratified convention, and choosing the oldest would let
 * a stale convention govern a member indefinitely.
 *
 * ⚠ `live` is NOT assumed to be stream-ordered (review finding): the one production caller happens to
 * preserve order, but this function's own correctness must not depend on that — a future caller (a
 * test helper, a repair script, a replay tool) assembling `live` differently would otherwise get a
 * silently wrong concurrency-rule pick with no error.
 */
function combineLiveExpiries(live: readonly RestorationImposition[]): Date | null {
  if (live.length === 0) return null;
  const mostRecent = live.reduce((latest, i) =>
    i.imposedAt.getTime() > latest.imposedAt.getTime() ? i : latest,
  );
  const rule = mostRecent.concurrencyRule;
  switch (rule) {
    case 'max_over_live': {
      // NEVER the minimum (it would shorten a live consequence — the §1d non-subsumption principle
      // and Decision `2026-08-06-079`), never a replacement (it would let a member draw a LESSER
      // imposition to discharge a GREATER one already in force — rejected by name), never a sum
      // (§3.1's per-rung table prescribes bounded durations and a sum invents a longer one).
      return live.reduce((max, i) => (i.expiresAt.getTime() > max.getTime() ? i.expiresAt : max), live[0]!.expiresAt);
    }
    default: {
      const never: never = rule;
      return never;
    }
  }
}

/**
 * Deterministic, replay-safe evaluator: fold an ORDERED list of `member.restoration_discipline.*`
 * events into the overlay verdict AT the pinned instant `at`.
 *
 * PURE — no I/O, no ambient clock, no mutable module state (`at` and the ordering are the caller's
 * concern), so replaying the same list twice always yields the same verdict. That is a hard
 * requirement: this feeds `validityPayloadHash`, which the 100×-thread determinism gate treats as a
 * P0 on any variance.
 *
 * TOTAL, like the moderation fold and the lifecycle reducer: an unknown event type, or a malformed
 * payload, is IDENTITY (skipped) — never a throw. The WRITE path is where an illegal imposition is
 * rejected before anything is appended. Totality is also what lets a future
 * `member.restoration_discipline.lifted` be added WITHOUT reshaping this fold (D6) — though ⛔ adding
 * that event is a governance act nobody has authorised.
 */
export function evaluateRestorationDisciplineOverlay(
  events: readonly RestorationDisciplineOverlayEventInput[],
  at: Date,
): RestorationDisciplineOverlay {
  const impositions: RestorationImposition[] = [];

  for (const e of events) {
    // Unknown type → identity (see the TOTAL note above).
    if (!isRestorationDisciplineEventType(e.type)) continue;
    const parsed = parseImposition(e.payload);
    if (parsed === null) continue;
    // `imposed_at` rides the payload (DB-authoritative at write, AC3); `occurredAt` is the fallback
    // so a hand-repaired event missing the field still folds into a coherent record.
    const imposedAt = dateOf(e.payload as Record<string, unknown>, 'imposed_at') ?? e.occurredAt;
    impositions.push({ ...parsed, imposedAt });
  }

  if (impositions.length === 0) return NO_RESTORATION_DISCIPLINE;

  const live = impositions.filter((i) => isImpositionLiveAt(i.expiresAt, at));
  if (live.length === 0) {
    // Every imposition has elapsed. The instrument is NOT in force — no coverage effect, no flag.
    // ⚠ `expired` is deliberately distinguishable from `never-imposed`: the write path's ratified
    // re-imposition bar (AC2) needs the history, and a member who HAS served a restoration lock-in
    // is not in the same standing as one who never has.
    return { state: 'expired', expiresAt: null, imposedAt: null, impositions };
  }

  return {
    state: 'in-lock-in',
    expiresAt: combineLiveExpiries(live),
    // When the CURRENT standing began — the EARLIEST live imposition. Pairs with the MAXIMUM expiry
    // so the rendered window spans the whole period the member is actually under the instrument.
    imposedAt: live.reduce((min, i) => (i.imposedAt.getTime() < min.getTime() ? i.imposedAt : min), live[0]!.imposedAt),
    impositions,
  };
}

/**
 * The member's restoration-discipline overlay as of `atTimestamp` — the BOUNDED, replay-correct read.
 *
 * Used by `@twt/validity-service` when resolving a payload as of an instant. Events are loaded
 * bounded by the instant and ordered by the monotonic `event_version` (single-stream: `occurred_at`
 * can tie within a transaction and is used only as the upper BOUND of the replay window, never as
 * the sort key — the `getMemberStateAt` discipline).
 */
export async function getMemberRestorationDiscipline(
  db: Db,
  memberId: MemberId,
  atTimestamp: Date,
): Promise<RestorationDisciplineOverlay> {
  return loadOverlay(db, memberId, atTimestamp, atTimestamp);
}

/**
 * The member's restoration-discipline standing RIGHT NOW — the whole stream, with NO upper bound.
 *
 * ── Why the WRITE-PATH legality check must NOT use the `at`-bounded read ─────────────────────────
 * The clock-domain rationale at `moderation/overlay.ts` applies VERBATIM. `occurred_at` is
 * DB-generated while any `atTimestamp` a caller holds is the INJECTED APP clock, and those are
 * different clock domains. Under app-clock-behind-DB skew, a second imposition bounded at
 * `deps.clock()` would exclude the first imposition's event, fold `never-imposed`, and write a
 * DUPLICATE lock-in where AC2 requires a skip. The `(stream_id, event_version)` unique index does not
 * save this: `projectMemberState` claims `head_version + 1` from an UNBOUNDED read, so the append
 * succeeds and the member serves two overlapping lock-ins for one episode.
 *
 * The bounded variant above remains correct — and required — for point-in-time REPLAY. It is the
 * LEGALITY check that must see the present, and the present has no clock in it.
 */
export async function getCurrentMemberRestorationDiscipline(
  db: Db,
  memberId: MemberId,
  now: Date,
): Promise<RestorationDisciplineOverlay> {
  // `now` evaluates liveness only; the event WINDOW is unbounded (that is the whole point).
  return loadOverlay(db, memberId, null, now);
}

async function loadOverlay(
  db: Db,
  memberId: MemberId,
  windowUpperBound: Date | null,
  at: Date,
): Promise<RestorationDisciplineOverlay> {
  const predicates = [
    eq(eventsLog.streamId, memberId),
    inArray(eventsLog.eventType, [...RESTORATION_DISCIPLINE_EVENT_TYPES]),
  ];
  if (windowUpperBound !== null) predicates.push(lte(eventsLog.occurredAt, windowUpperBound));

  const rows = await db
    .select({
      eventType: eventsLog.eventType,
      occurredAt: eventsLog.occurredAt,
      payload: eventsLog.payload,
    })
    .from(eventsLog)
    .where(and(...predicates))
    .orderBy(asc(eventsLog.eventVersion));

  return evaluateRestorationDisciplineOverlay(
    rows.map((r) => ({ type: r.eventType, occurredAt: r.occurredAt, payload: r.payload })),
    at,
  );
}
