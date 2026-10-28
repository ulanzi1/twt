// Degraded-mode contract barrel — Story 5.8 (Task 4). Re-exported from the `@twt/contracts` top barrel (no
// subpath export wired — the repo convention). Backs the trustee degraded-mode declare/revoke/read endpoints.

export {
  DegradedMode,
  DegradedModeDeclareRequest,
  DegradedModeDeclarationResponse,
  DegradedModeActiveResponse,
  NO_BACKDATE_GRACE_MS,
} from './declarations.js';

// Story 5.8b (AC12) — the bridge text's Trust-wide Super Admin switch (read + change).
export {
  DEGRADED_BRIDGE_SMS_SWITCH_REASON_MAX,
  DegradedBridgeSmsSwitchResponse,
  DegradedBridgeSmsSwitchSetRequest,
} from './bridge-switch.js';
