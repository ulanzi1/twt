// Barrel for the claim-lifecycle module — Story 6.1.
// Re-exported from @twt/domain as the `claim` namespace (see ../index.ts) so
// consumers call `claim.getClaimStateAt(...)` / `claim.projectClaimState(...)` /
// `claim.CLAIM_EVENT_PAYLOAD_SCHEMAS`. Mirrors the `member/` module shape.

export * from './state.js';
export * from './events.js';
export * from './project.js';
export * from './read.js';
export * from './errors.js';
// Story 6.4 — the Intake Convergence Point (ICP): tryConverge + the merge/override writers +
// the read accessors + CONVERGENCE_WINDOW_DAYS + the shared intakeAdvisoryLockKey.
export * from './icp.js';
// Story 6.5 — death-cert OCR + parity: the claim_documents read accessors + the pure
// parity-check (evaluateParity + normalization).
export * from './documents.js';
export * from './parity.js';
// Story 6.6 — peer-mesh deterministic 5-nearest selection: the pure engine + metric
// registry, the candidate-snapshot + selection/ping/response reads, and the persistence +
// annotation-event writers (selection, ping intents, response recording, AR-61 disposition).
export * from './peer-mesh.js';
export * from './peer-mesh-metric-registry.js';
export * from './peer-mesh-read.js';
export * from './peer-mesh-persist.js';
// Story 6.7 — ground inspection: the assignment/photo persistence writers (schedule/reschedule/
// findings/photo/complete/refusal — row-lock + idempotency + write-path guards) + the read
// accessor (getClaimGroundInspection — ciphertext AS STORED; the AC5 absence-is-a-signal read).
export * from './ground-inspection-persist.js';
export * from './ground-inspection-read.js';
// Story 6.8 — claim-time nominee bank: the latest-wins dual-account writer
// (recordClaimNomineeBankAccounts — claim row-lock + D3 collectable-window guard + delete-then-
// insert both rows + the claim.nominee_bank_recorded identity annotation) + the read accessor
// (getClaimNomineeBankAccountsCiphertext — ciphertext AS STORED; the AC3 absence-is-a-signal read for Epic 7/9).
export * from './nominee-bank-persist.js';
export * from './nominee-bank-read.js';
// Story 6.10 — the verifier-console prior-decisions + recent-precedents reads (sections (e)/(f)) +
// the 6.11 decision-read-model dependency contract (VerifierDecisionRecord) + the pure ordering /
// latest-3-exclude-current helpers. Producer-gated: returns `not_available_yet` until Story 6.11 (D6).
export * from './verifier-console-read.js';
// Story 6.11 — verifier DECISION-METADATA vocabulary: the bounded reason-code + outcome pgEnums/tuples
// and the SINGLE outcome↔reason-code compatibility source of truth (REASON_CODE_OUTCOME_COMPAT +
// isReasonCodeValidForOutcome), consumed by BOTH the contract superRefine and the domain write-path (AC8).
export * from './verifier-decision.js';
// Story 6.11 — the decision read model producer queries (getPriorVerifierDecisions /
// getRecentInScopePrecedents) + the atomic adjudication/supersession writers + write-path guards.
export * from './verifier-decision-persist.js';
// Story 6.12 — shepherd assignment writers + candidate resolver: the scope-respecting workload-balanced
// contactable candidate pool (resolveShepherdCandidates), the automatic first-assignment (assignShepherd
// — advisory lock + pre-write idempotency + candidate pick), the manual/fallback reassignment
// (reassignShepherd — self-assignment guard + atomic supersession + re-emit), the live-assignment read +
// the manual-path contactability resolver, and the typed write-path guards. Claim-scoped (not top-level).
export * from './shepherd-assign-persist.js';
// Story 6.12 — the LIVE-shepherd read (getLiveShepherd) consumed by the member card (AC3) + the admin
// verifier-console shepherd section (AC6). Scope-safe; returns the display + contact snapshot or null.
export * from './shepherd-read.js';
// Story 6.13 — State-Trustee cycle-freeze DECISION-METADATA vocabulary: the phase/outcome/reason-code
// pgEnums/tuples + the trustee-scoped compat/required rules (TRUSTEE_REASON_CODE_OUTCOME_COMPAT +
// isTrusteeReasonCodeValidForOutcome + trusteeReasonCodeRequiredForOutcome), consumed by BOTH the contract
// superRefine and the domain write-path (D-F). Trustee-scoped names (the 6.11 verifier-decision.ts owns the
// generic names).
export * from './state-trustee-decision.js';
// Story 6.13 — the four atomic cycle-freeze write paths (voteOnFrozenClaim / routeToR9 / resolveEscalation /
// commitCycleFreeze — DB-only, the trigger is the handler's job), the compound pending read model, and the
// typed write-path guards. Claim-scoped (not top-level).
export * from './state-trustee-decision-persist.js';
export * from './cycle-freeze-read.js';
