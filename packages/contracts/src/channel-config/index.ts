// Channel-config contract barrel — Story 5.3 (Task 4). Re-exported from the `@twt/contracts` top barrel
// (no subpath export wired — the repo convention, README-documented). Backs the trustee WhatsApp Business
// config admin endpoints.

export {
  WaTemplateApprovalStatus,
  WaConfigDto,
  WaConfigResponse,
  WaConfigUpsertRequest,
  WaTemplateDto,
  WaTemplateUpsertRequest,
  WaTemplatesResponse,
  // Story 5.5 — per-Pariwar Telegram Bot config (trustee admin surface).
  TelegramConfigDto,
  TelegramConfigResponse,
  TelegramConfigUpsertRequest,
} from './config.js';
