// Channel-config domain accessors — Story 5.3 (Task 1). Barrel for the per-Pariwar WhatsApp Business config
// substrate (config singleton + per-category UTILITY template registry). Transport-free primitives consumed
// by the apps/api admin module (config write) + the composition layer (delivery-time config/template read).

export {
  getWaConfig,
  getWaConfigByPhoneNumberId,
  upsertWaConfig,
  listWaTemplates,
  upsertWaTemplate,
  resolveApprovedTemplate,
  type WaConfigUpsertInput,
  type WaTemplateUpsertInput,
  type ApprovedWaTemplate,
} from './wa-config.js';
// Story 5.3 (Task 3) — the per-send WA delivery-status persistence seam (keyed by Meta wamid) that Story
// 5.4's webhook receiver consumes after mapping the Meta status via mapMetaStatus (@twt/channels).
export {
  upsertWaSendStatus,
  getWaSendStatus,
  type WaSendStatusUpsertInput,
} from './wa-status.js';
// Story 5.5 — the per-Pariwar Telegram Bot config substrate (config singleton). Transport-free primitives
// consumed by the apps/api admin module (config write) + the composition/webhook layers (bot-token /
// webhook-secret NAME resolution at send/verify time).
export {
  getTelegramConfig,
  upsertTelegramConfig,
  type TelegramConfigUpsertInput,
} from './telegram-config.js';
