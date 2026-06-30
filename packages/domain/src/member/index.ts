// Barrel for the member-lifecycle module — Story 3.1.
// Re-exported from @twt/domain as the `member` namespace (see ../index.ts) so
// consumers call `member.getMemberStateAt(...)` / `member.projectMemberState(...)` /
// `member.getMemberAccountOverlay(...)`. Mirrors the `consent/` module shape.

export * from './state.js';
export * from './events.js';
export * from './project.js';
export * from './read.js';
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
export * from './errors.js';
