// Barrel for the member-lifecycle module — Story 3.1.
// Re-exported from @twt/domain as the `member` namespace (see ../index.ts) so
// consumers call `member.getMemberStateAt(...)` / `member.projectMemberState(...)` /
// `member.getMemberAccountOverlay(...)`. Mirrors the `consent/` module shape.

export * from './state.js';
export * from './events.js';
export * from './project.js';
export * from './read.js';
// Story 4.7 — the AR-65 admin member-search compound read model: the projector-exclusive projection
// refresh (search-projection.ts) + the scope-respecting search/read accessor (search-read.ts).
export * from './search-projection.js';
export * from './search-read.js';
// Story 3.8 — the canonical vyawastha_shulk renewal-status read (the FR-12A surface) + pure derive seam.
export * from './renewal-read.js';
// Story 3.8 — the renewal-lifecycle scheduler tick (the FIRST emitter of grace transitions + reminders).
export * from './renewal-scheduler.js';
// Story 3.6a — the signup flow's member_identities writer (insertMemberIdentity + duplicate guard).
export * from './identity-write.js';
// Story 3.6b — the registry-backed lock-in-policy resolver + the snapshot-column writer (lock-in.ts)
// and the 5-condition lock-in entry gate (lock-in-gate.ts; AC2).
export * from './lock-in.js';
export * from './lock-in-gate.js';
export * from './overlay.js';
// Story 3.9 — Life Events address + posting history accessors (append-only write + latest read).
export * from './address.js';
export * from './posting.js';
// Story 10.26 — the personal-event assertion: the write + the as-of existential reads (no table).
export * from './personal-event.js';
// Story 3.10 — voluntary-withdrawal record write + in-scope read (the rejoin-lock read is folded into
// the signup repo's cross-tenant resolveMembersByMobile, NOT here).
export * from './withdrawal.js';
// Story 3.12 — RTBF field-level anonymization core (the inverse of data-export/assemble.ts) + the
// display-time member-name resolver seam that renders "an anonymous member" for anonymized members.
export * from './anonymize.js';
export * from './display-name.js';
export * from './errors.js';
// Story 10.10 — member moderation (suspend / terminate / restore). A NESTED namespace
// (`member.moderation.*`), not a flat re-export: it is a SECOND, orthogonal event-derived state
// machine on the member's own stream (Decision 1), and keeping it namespaced makes that separation
// visible at every call site — `member.getMemberStateAt` (lifecycle) vs
// `member.moderation.getMemberModerationOverlay` (overlay) can never be mistaken for each other.
export * as moderation from './moderation/index.js';
// Story 10.23 — restoration discipline (the §3.1 R7 lock-in). NESTED for the same reason moderation
// is, and the namespacing carries extra weight here: this is the THIRD member-scoped clock in the
// codebase, alongside the lifecycle machine and the JOINING lock-in (`member.lock-in.ts`). Those two
// discipline clocks are INDEPENDENT and run CONCURRENTLY (Decision `2026-08-06-079` — "one clock
// never absorbs the other"), so `member.getLockInStatus` (joining) and
// `member.restorationDiscipline.getMemberRestorationDiscipline` (restoration) reading identically at
// a call site would be the first step toward subsuming one into the other.
export * as restorationDiscipline from './restoration-discipline/index.js';
