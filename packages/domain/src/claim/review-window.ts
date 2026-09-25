// The claim REVIEW WINDOW — the one tuple of lifecycle states in which the District Admin's
// verification-stage records may be written (Story 6.18 AC3; reused by 6.20 D4/D7 and 6.21a D3).
//
// ⭐ WHY THIS FILE EXISTS (Story 6.21a, T8). The tuple used to be DEFINED in `nominee-name-check.ts`
// (as `NOMINEE_NAME_CHECK_RECORDABLE_STATES`, which still re-exports THIS object — same identity, ⛔ never a
// copy). 6.21a's LEAF module `death-certificate-approval.ts` needs the window (6.21b's state table and
// 6.19's CC1 trigger both ask "is the claim in the review window?"), but `nominee-name-check.ts` imports
// the leaf, and `nominee-determination-persist.ts` evaluates the window at module load — so the leaf
// importing it from there would close an import cycle the typecheck cannot see
// ([[project_type_only_import_cycle_trap]]). An import-free module breaks it by construction.
//
// ⛔ IMPORT NOTHING HERE. The rationale for WHICH states are in the window lives on
// `NOMINEE_NAME_CHECK_RECORDABLE_STATES`' doc-block, where 6.18 wrote it.

export const CLAIM_REVIEW_WINDOW_STATES = [
  'verification_in_progress',
  'verifier_review',
  'verifier_approved',
  'reversed',
  'state_trustee_freeze',
] as const;
