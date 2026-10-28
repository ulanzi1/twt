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

// Story 5.8b (AC12) — the bridge text's Trust-wide Super Admin switch (read; change on the service pool).
export {
  readDegradedBridgeSmsSwitch,
  setDegradedBridgeSmsSwitch,
  setDegradedBridgeSmsSwitchInTx,
  DEGRADED_BRIDGE_SMS_SWITCH_REASON_MAX,
  type DegradedBridgeSmsSwitchState,
  type SetDegradedBridgeSmsSwitchInput,
} from './bridge-switch.js';
