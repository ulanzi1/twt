// `member.restorationDiscipline` namespace barrel — Story 10.23.
//
// The restoration-discipline lock-in instrument: §3.1's 3- and 5-month lock-ins, imposed
// AUTOMATICALLY from an R7 ladder verdict, folded as-of from the member's own event stream, version-
// pinned at imposition, folding into COVERAGE and invisible to the DONOR ROSTER.
//
// ── THE ONE THING TO KNOW ────────────────────────────────────────────────────────────────────────
// This is the SECOND event-derived governance OVERLAY on the member (moderation, Story 10.10, is the
// first). `MEMBER_LIFECYCLE_STATES` is UNCHANGED: no `ALTER TYPE`, no new enum label, no lifecycle-
// reducer arm, no projector edit, no `app.member_state_writer` trigger change, and no addition to
// the `member-state-invariant` CI-gate allowlist. The imposition event is IDENTITY through
// `memberStateMachine`. **The full architectural record is the `AI-10-1` block in `overlay.ts` —
// read that, not a second copy of the rationale, here** (Decision `2026-08-04-072`; `architecture.md`
// is NOT amended).
//
// ── ⛔ WHAT THIS INSTRUMENT DELIBERATELY DOES NOT HAVE ───────────────────────────────────────────
//   · **No lift, and no lift event.** §3.1 grants no early-clearance act: R7(D) is "3-month lock-in
//     AND catch-up" — conjunctive, so completing catch-up does not shorten the lock-in. The fold is
//     written TOTAL over unknown event types so a future `member.restoration_discipline.lifted`
//     could be added WITHOUT reshaping it (D6) — but **a lift is a governance act nobody has
//     authorised.** Building an unauthorised clearance path is how a discretion nobody granted gets
//     exercised. Do not add the event.
//   · **No expiry event and no job.** Expiry is DERIVED at read (AC4).
//   · **No reason code, no actor, no Tier-1 column** (D5). The clause id IS the reason.
//   · **No trustee-imposed path.** §3.1 grants no discretion here; imposition is automatic or it
//     does not happen.
//
// ── ⛔ THE CATCH-UP SEAM IS NAMED, TYPED AND UNREACHABLE — never faked (D8, Escalation 6) ─────────
// R7(D) prescribes `catch_up_required: true`; R7(E)/(F) prescribe `complete_all: true`. **NEITHER
// HAS A MECHANISM, and this story does not build one.** §3.1's ratified interpretive note (2026-08-07)
// says a skip clears when a confirmation for that cycle enters the record "whether through later
// reconciliation or an AUTHORIZED CATCH-UP PROCESS" — and no authorized catch-up process exists:
// contribution flows only through assignment to an OPEN cycle (Story 7.6's pool-bound payment
// enforcement, fenced by Story 8.10), so there is no channel by which a member can pay a CLOSED one.
//
// So this instrument can put a member into a coverage-removing period whose stated completion
// condition no workflow in the system can satisfy. That is a GOVERNANCE GAP, not a deferred
// implementation, and it is why `UNSATISFIABLE_COMPLETION_KEYS` (write.ts) exists and why the
// apps/jobs writer is gated behind a default-OFF flag (AC14). See `write.ts` for both.

export {
  RESTORATION_DISCIPLINE_STATES,
  type RestorationDisciplineState,
  RESTORATION_COMBINATION_RULES,
  type RestorationCombinationRule,
  asRestorationCombinationRule,
  RESTORATION_DISCIPLINE_IMPOSED_EVENT,
  RESTORATION_DISCIPLINE_EVENT_TYPES,
  type RestorationDisciplineEventType,
  isRestorationDisciplineEventType,
  isImpositionLiveAt,
} from './status.js';

export {
  RestorationDisciplineImposedPayloadSchema,
  RESTORATION_DISCIPLINE_EVENT_PAYLOAD_SCHEMAS,
} from './events.js';

export {
  type RestorationDisciplineOverlayEventInput,
  type RestorationImposition,
  type RestorationDisciplineOverlay,
  NO_RESTORATION_DISCIPLINE,
  evaluateRestorationDisciplineOverlay,
  getMemberRestorationDiscipline,
  getCurrentMemberRestorationDiscipline,
} from './overlay.js';

export {
  RESTORATION_DISCIPLINE_POLICY_CLAUSE_ID,
  RestorationDisciplinePolicyPayloadSchema,
  resolveRestorationDisciplinePolicy,
  type RestorationDisciplinePolicyPayload,
  type ResolvedRestorationDisciplinePolicy,
} from './policy.js';

export {
  UNSATISFIABLE_COMPLETION_KEYS,
  hasUnsatisfiableCompletionCondition,
  readLockInMonths,
  episodeKeyOf,
  shouldImpose,
  imposeRestorationLockIn,
  type EpisodeAnchor,
  type ImposeRestorationLockInInput,
  type ImposeRestorationLockInResult,
  type ImpositionDecision,
} from './write.js';

export {
  type RestorationImpositionEntry,
  listRestorationImpositionsForMember,
} from './read.js';
