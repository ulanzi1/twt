// Story 6.28 (`2026-10-11-319` OP2, OP14 (c)) — the words of the FINAL-approval STOP when another claim of the death has
// already passed the final vote (or its payment is committed), ONCE, for the four approval mappers (`claims.verification-
// decision` — defensive, P1 never meets it — `claims.cycle-freeze`, `claims.r9-voting`, `claims.correction-closure`, which
// also serves `claims.correction-escalation`). Each maps `claim.DeathAlreadyFinallyApprovedError` to 409
// `<prefix>.death_already_finally_approved` with `details: {}` — ⛔ never a 500, ⛔ never the other claim's id on the wire.
// STAFF words: they ⛔ never say the claim is refused (the system refuses nothing — Invariant 2).

export const DEATH_ALREADY_FINALLY_APPROVED_MESSAGE =
  'Another claim for this death has already passed the final vote. This claim cannot be finally approved.';
