// Member-facing appeal-status derivation — Story 6.16 (Task 9). Pure, transport-free display logic over the
// server-computed MemberAppealStatusResponse (the server owns eligibility + stage/status; this maps them to
// the dignified "fursat"-register copy keys the card renders). Kept pure so it is unit-testable without a
// render harness.

/** The shape the mobile appeal-status card renders (mirrors @twt/contracts MemberAppealStatusResponse). */
export interface MemberAppealStatus {
  claim_state: string
  can_initiate: boolean
  appeal_status: 'open' | 'reversed' | 'upheld_final' | null
  current_stage: '1' | '2' | '3' | null
  appeal_exhausted: boolean
}

/** What the card should show, as bounded, testable flags + copy keys (resolved via useClaimT in the card). */
export interface AppealView {
  /** Show the "file appeal" affordance (denied + no prior journey — no deadline, D-E). */
  showFileAffordance: boolean
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
  const showExhausted = status.appeal_exhausted
  return {
    showFileAffordance: status.can_initiate,
    statusKey: status.appeal_status === 'open' && status.current_stage ? STAGE_STATUS_KEY[status.current_stage] : null,
    showReversed,
    showExhausted,
    showExternalRemedy: showExhausted,
  }
}
