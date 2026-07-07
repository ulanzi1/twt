// Degraded-mode domain barrel — Story 5.8 (Task 1; AC1). The per-Pariwar degraded-mode declaration
// accessors: declare (advisory-locked, auto-revoke-then-insert), manual revoke (idempotent), and the
// computed-active read. Transport-free; runs on the passed scoped Db (RLS enforces the tenant).

export {
  declareDegradedMode,
  revokeDegradedMode,
  getActiveDegradedMode,
  type DeclareDegradedModeInput,
  type RevokeDegradedModeInput,
} from './declarations.js';
