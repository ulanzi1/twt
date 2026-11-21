// Member-facing appeal-status derivation — Story 6.16 (Task 9). Pure, transport-free display logic over the
// server-computed MemberAppealStatusResponse (the server owns eligibility + stage/status; this maps them to
// the dignified "fursat"-register copy keys the card renders). Kept pure so it is unit-testable without a
// render harness.

/** The shape the mobile appeal-status card renders (mirrors @twt/contracts MemberAppealStatusResponse). */
export interface MemberAppealStatus {
  claim_state: string
  can_initiate: boolean
  /** Story 6.24a (RF4) — `closed`: the claim was closed mid-appeal (⛔ no affordance, ⛔ no status line — nothing to show). */
  appeal_status: 'open' | 'reversed' | 'upheld_final' | 'closed' | null
  current_stage: '1' | '2' | '3' | null
  appeal_exhausted: boolean
  /** Story 6.19c (AC7, `-273` §9) — the claim was CLOSED for no response: ⛔ appealable, ⛔ no affordance, ⛔ no
   *  external-remedy disclosure (a display rule — the server's `can_initiate` already says false). */
  closed_no_response: boolean
  /** ⭐ Story 6.39 (`2026-11-21-473` Q3 B) — the ONE reason a family is told (a refusal for a fee ⛔ paid before the death);
   *  `null` for every other refusal. */
  refusal_reason: 'not_a_member_when_died' | null
}

/** `appeal.eligible` with the door's reason joined in (`-474` item 4: approved word for word, en + hi). */
export const REFUSED_NOT_MEMBER_KEY = 'appeal.refused_not_member'

/** What the card should show, as bounded, testable flags + copy keys (resolved via useClaimT in the card). */
export interface AppealView {
  /** Show the "file appeal" affordance (denied + no prior journey — no deadline, D-E). */
  showFileAffordance: boolean
  /** The affordance's first line: `appeal.eligible`, or — for a refusal whose reason the family is told (`-473` Q3 B) —
   *  `appeal.refused_not_member` INSTEAD of it. */
  eligibleKey: 'appeal.eligible' | typeof REFUSED_NOT_MEMBER_KEY
  /** Show the in-progress status line + its copy key ('appeal.status_stage1|2|3'). */
  statusKey: string | null
  /** Show the reversed-outcome message. */
  showReversed: boolean
  /** Show the exhausted (Stage-3 uphold) outcome — the external-remedy disclosure is surfaced with it. */
  showExhausted: boolean
  /** Show the external-remedy disclosure (always on the exhausted view; never gates anything). */
  showExternalRemedy: boolean
}

const STAGE_STATUS_KEY: Record<'1' | '2' | '3', string> = {
  '1': 'appeal.status_stage1',
  '2': 'appeal.status_stage2',
  '3': 'appeal.status_stage3',
}

/**
 * Derive the member-facing appeal view. NO deadline logic (D-E — the claimant may file at any time). The
 * external-remedy disclosure is surfaced with the exhausted outcome (AC7) — never as a gate.
 */
export function deriveAppealView(status: MemberAppealStatus): AppealView {
  const showReversed = status.appeal_status === 'reversed'
  // A closure is ⛔ an exhausted appeal: the family files again through the helpline (the re-file state), ⛔ appeals.
  // Story 6.24a (RF4) — a claim CLOSED mid-appeal (`appeal_status: 'closed'`) is the SAME "nothing to show" rule,
  // defensively guarded here too (⛔ never trusting `can_initiate` / `appeal_exhausted` alone — the `closed_no_response`
  // precedent).
  const showExhausted = status.appeal_exhausted && !status.closed_no_response && status.appeal_status !== 'closed'
  return {
    showFileAffordance: status.can_initiate && !status.closed_no_response && status.appeal_status !== 'closed',
    eligibleKey: status.refusal_reason === 'not_a_member_when_died' ? REFUSED_NOT_MEMBER_KEY : 'appeal.eligible',
    statusKey: status.appeal_status === 'open' && status.current_stage ? STAGE_STATUS_KEY[status.current_stage] : null,
    showReversed,
    showExhausted,
    showExternalRemedy: showExhausted,
  }
}
