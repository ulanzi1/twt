// Member Telegram opt-in contract barrel — Story 5.5 (Task 1). Re-exported from the `@twt/contracts` top
// barrel (no subpath export wired — the repo convention). Backs the member-session-gated opt-in endpoints +
// the domain `telegram_opt_in_state` lockstep.

export {
  TelegramOptInStateSchema,
  TelegramOptInRequestResponse,
  TelegramOptInStatusResponse,
  RevokeTelegramOptInResponse,
} from './opt-in.js';
