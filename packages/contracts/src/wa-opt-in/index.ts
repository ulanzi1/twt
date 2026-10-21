// Member WA opt-in contract barrel — Story 5.4 (Task 6). Re-exported from the `@twt/contracts` top barrel
// (no subpath export wired — the repo convention). Backs the member-session-gated opt-in endpoints + the
// domain `wa_opt_in_state` lockstep.

export {
  WaOptInStateSchema,
  CreateWaOptInResponse,
  WaOptInStatusResponse,
  RevokeWaOptInResponse,
  // Story 5.13 — the WhatsApp code.
  WaOptInCodesRemaining,
  SendWaOptInCodeRequest,
  SendWaOptInCodeResponse,
  VerifyWaOptInCodeRequest,
  VerifyWaOptInCodeResponse,
  WaOptInCodeErrorDetails,
} from './opt-in.js';
