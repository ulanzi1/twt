// Barrel for the member-lifecycle module — Story 3.1.
// Re-exported from @twt/domain as the `member` namespace (see ../index.ts) so
// consumers call `member.getMemberStateAt(...)` / `member.projectMemberState(...)` /
// `member.getMemberAccountOverlay(...)`. Mirrors the `consent/` module shape.

export * from './state.js';
export * from './events.js';
export * from './project.js';
export * from './read.js';
export * from './overlay.js';
export * from './errors.js';
