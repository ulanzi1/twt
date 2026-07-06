// Member WA opt-in contract barrel — Story 5.4 (Task 6). Re-exported from the `@twt/contracts` top barrel
// (no subpath export wired — the repo convention). Backs the member-session-gated opt-in endpoints + the
// domain `wa_opt_in_state` lockstep.

export {
  WaOptInStateSchema,
  CreateWaOptInResponse,
  WaOptInStatusResponse,
  RevokeWaOptInResponse,
} from './opt-in.js';
