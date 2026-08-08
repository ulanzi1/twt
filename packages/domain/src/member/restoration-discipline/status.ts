// The restoration-discipline status machine — Story 10.23 (Task 2; AC1, AC4, AC5).
//
// The SECOND event-derived governance overlay on the member's own stream, mirroring the shipped
// moderation overlay (`member/moderation/status.ts`, Story 10.10). It is ORTHOGONAL to the primary
// member lifecycle machine: `members.state` is NEVER written, no `member_lifecycle_state` label is
// added, and the one `member.restoration_discipline.*` event folds through `memberStateMachine` as
// IDENTITY by construction (its `default: return state` arm).
//
// ── ⚠ THIS IS NOT THE JOINING LOCK-IN. Two clocks, never one (AC5 / D4) ─────────────────────────
// `lockInStatus` (`validity-service/payload.ts` `projectLockInStatus`) is the JOINING clock — the
// FR-8 lock-in a member enters on joining or rejoining, driven by `member.lock_in_entered` /
// `member.lock_in_expired` and `lock_in_days_at_join`. THIS is the RESTORATION clock, imposed by a
// §3.1 R7 ladder verdict. Decision `2026-08-06-079` (Story 10.25 D5) is explicit:
//
//     "joining discipline and restoration discipline are INDEPENDENT instruments that run
//      CONCURRENTLY … One clock never absorbs the other."
//
// So: `lock_in_days_at_join` is NOT read, NOT reused and NOT extended here; `lockInStatus` is left
// byte-unchanged; and `contribution.r7a_restorations_used` is NOT an input to this clock's expiry
// (Story 10.25 D5 forbids it by name). A member may be serving BOTH at once, with two different
// unlock dates, and both are separately representable.
//
// ── EXPIRY IS DERIVED, NEVER EVENTED (AC4 / D6) ─────────────────────────────────────────────────
// There is deliberately NO `member.restoration_discipline.expired` event and no scheduled job. The
// state flips purely by time passing, derived at read from `at >= expiresAt` — exactly as
// `projectLockInStatus` derives `in-lock-in → unlocked`. The join lock-in HAS an expiry event only
// because a LIFECYCLE STATE must move; this overlay has no lifecycle state, so an expiry event would
// be a second writer producing information already derivable, and would introduce a window in which
// the overlay is stale because a job had not run yet.
//
// `VALIDITY_CACHE_TTL_SECONDS = 60` already names this exact flip as one of the two pure-time-passage
// change vectors it exists to cover (`validity-cache/constants.ts`) — this instrument is the second
// instance of a pattern the cache was built for, not a new problem.
//
// ── The LIFT seam is SHAPED, not built (D6) ─────────────────────────────────────────────────────
// §3.1 grants no early-clearance act: R7(D) is "3-month lock-in AND catch-up" — conjunctive, so
// completing catch-up does not shorten the lock-in. The fold below is TOTAL over unknown event types
// precisely so a future `member.restoration_discipline.lifted` can be added WITHOUT reshaping it.
// ⛔ Do NOT add that event. A lift is a governance act nobody has authorised; building an
// unauthorised clearance path is how a discretion nobody granted gets exercised.

/**
 * The derived restoration-discipline standing. NOT a member lifecycle state, and NOT `lockInStatus`.
 *
 * Deliberately spelled differently from `LockInStatusState`'s `'in-lock-in' | 'unlocked' |
 * 'never-entered'`: the two clocks appear side by side in the payload (D4) and in the admin surfaces,
 * and identical vocabulary across independent instruments is how a subsumption bug gets written by
 * someone who thought they were reading the other one.
 */
export const RESTORATION_DISCIPLINE_STATES = ['never-imposed', 'in-lock-in', 'expired'] as const;
export type RestorationDisciplineState = (typeof RESTORATION_DISCIPLINE_STATES)[number];

/**
 * How the combined expiry is computed when MULTIPLE impositions are live at once — **registry data,
 * pinned at imposition**, never a code constant (AC5, Decision `2026-08-07-088` clause 1).
 *
 * ⚠ THE VALUE LIVES IN THE `niy.restoration-discipline.policy` CLAUSE PAYLOAD and is recorded onto
 * the imposition event so a later Trustee amendment cannot retroactively move an existing member's
 * unlock date (the FR-8 pin, applied to the rule itself as well as to the duration). A `Math.max`
 * inlined at the fold with no clause backing does NOT satisfy AC5 even though it computes the same
 * answer today — the Panel must be able to amend this as a governance act.
 *
 * §3.1 is SILENT on combination. The Panel ratified `max_over_live` as the only reading that neither
 * shortens a live consequence (contrary to the §1d non-subsumption principle and Decision
 * `2026-08-06-079`) nor invents a longer one than §3.1's per-rung table prescribes. **Replacement was
 * rejected by name**, because it would let a member draw a LESSER imposition to discharge a GREATER
 * one already in force — an incentive the Niyamavali does not contemplate. Sum was never on the table.
 */
export const RESTORATION_COMBINATION_RULES = ['max_over_live'] as const;
export type RestorationCombinationRule = (typeof RESTORATION_COMBINATION_RULES)[number];

/** Narrow an arbitrary value to a declared combination rule, or `null`. Used at clause resolution. */
export function asRestorationCombinationRule(value: unknown): RestorationCombinationRule | null {
  return typeof value === 'string' &&
    (RESTORATION_COMBINATION_RULES as readonly string[]).includes(value)
    ? (value as RestorationCombinationRule)
    : null;
}

/**
 * The imposition event type. ONE event; there is no expiry event (AC4) and no lift event (D6).
 *
 * Three-segment dotted names are legal — `cycle.spawn.started` and the `member.moderation.*` family
 * set the precedent. The `member.` prefix is load-bearing: it puts the event on the MEMBER's own
 * stream (`stream_id = member_id`) and, with it, inside migration `0036`'s
 * `member_validity_cache_invalidate()` trigger, which fires `WHEN (NEW.event_type LIKE 'member.%')`
 * and needs no sibling trigger for this story (AC10(b), contrast Story 10.24's `0093`).
 */
export const RESTORATION_DISCIPLINE_IMPOSED_EVENT = 'member.restoration_discipline.imposed' as const;

/** The `member.restoration_discipline.*` event-type union — one member today, by design. */
export type RestorationDisciplineEventType = typeof RESTORATION_DISCIPLINE_IMPOSED_EVENT;

/** The family's event types as a tuple (the overlay's `inArray` filter + the events registry). */
export const RESTORATION_DISCIPLINE_EVENT_TYPES = [RESTORATION_DISCIPLINE_IMPOSED_EVENT] as const;

/**
 * Is this event type one this overlay folds? PURE; the fold stays TOTAL on everything else (AC1) so
 * an unknown or future event on the member's stream is IDENTITY rather than a throw.
 */
export function isRestorationDisciplineEventType(
  eventType: string,
): eventType is RestorationDisciplineEventType {
  return (RESTORATION_DISCIPLINE_EVENT_TYPES as readonly string[]).includes(eventType);
}

/**
 * The derived state for ONE imposition at the pinned instant. PURE — the caller owns the clock.
 *
 * ⚠ The comparison is `at >= expiresAt`, so the expiry instant itself is ALREADY expired (a
 * half-open `[imposedAt, expiresAt)` window). That matches `projectLockInStatus`'s
 * `now >= unlockDate ? 'unlocked' : 'in-lock-in'` exactly; a member is never locked for one extra
 * millisecond because two instruments disagreed on boundary inclusivity.
 */
export function isImpositionLiveAt(expiresAt: Date, at: Date): boolean {
  return at.getTime() < expiresAt.getTime();
}
