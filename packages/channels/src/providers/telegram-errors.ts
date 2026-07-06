// Telegram send-error classification — Story 5.5 (AC2; Task 4).
//
// Telegram's Bot API returns a numeric `error_code` (+ an HTTP status). This classifier maps a failure into a
// STABLE, PII-free class read back off `SendResult.detail` — WITHOUT any SendResult shape change (mirrors
// whatsapp-errors.ts: the provider stays pure of policy, the detail carries `<class>:<code>`). Telegram is a
// fire-and-forget MIRROR side-channel — this story adds NO cascade/retry and NO fallback on a Telegram
// failure (the dispatcher already isolates Telegram from the ladder). The detail is for observability only.
//
// ⚠ CODES ARE INDICATIVE, VERIFY AT DEPLOY TIME (AC2). The Telegram Bot API error-code reference can change.
// The class↔code mapping below is drawn from the published reference and MUST be re-verified. The mapping is
// DATA-DRIVEN (a set check, not scattered conditionals) so a correction is a one-line edit.

import { TelegramSendError } from './telegram-app.js';

/** The stable Telegram failure classes the observability seam reads (AC2). */
export type TelegramErrorClass =
  | 'blocked_by_user'
  | 'chat_not_found'
  | 'rate_limited'
  | 'api_unavailable'
  | 'auth'
  | 'unknown';

// ── Telegram error codes by class (INDICATIVE — verify against the current reference) ──────────────────
// 401 Unauthorized — the bot token is invalid/revoked.
const AUTH_CODES: ReadonlySet<number> = new Set([401]);
// 429 Too Many Requests — rate-limited (transient; a retry_after hints how long).
const RATE_LIMIT_CODES: ReadonlySet<number> = new Set([429]);

/**
 * Classify a numeric Telegram code (+ HTTP status) into its stable failure class. Telegram overloads 403 (the
 * user blocked/kicked the bot, or the bot was blocked) and 400 (bad request — commonly "chat not found" when
 * the chat id is stale), so those two are keyed on the HTTP status, with the description-free classes below.
 */
function classForCode(telegramCode: number | null, httpStatus: number): TelegramErrorClass {
  const code = telegramCode ?? httpStatus;
  if (AUTH_CODES.has(code)) return 'auth';
  if (RATE_LIMIT_CODES.has(code)) return 'rate_limited';
  // 403 — the user blocked the bot (or the bot can't message this chat). The operational block signal proper
  // comes from the `my_chat_member` webhook update, not here; this is the send-time classification.
  if (code === 403) return 'blocked_by_user';
  // 400 — bad request; for a sendMessage the common cause is a stale/invalid chat id ("chat not found").
  if (code === 400) return 'chat_not_found';
  // An explicit transport failure (httpStatus 0 = network, no response) or a 5xx → the API is unavailable
  // (transient). A httpStatus < 0 means "no information at all" → honest `unknown`.
  if (httpStatus === 0 || httpStatus >= 500) return 'api_unavailable';
  return 'unknown';
}

/**
 * Classify a thrown Telegram send error into its stable class + a stable code token. Accepts `unknown` (the
 * provider's catch block) and is defensive: a non-`TelegramSendError` throw (or a hostile getter) still
 * resolves to a well-formed result — this function's whole contract is "never throws" so the provider can
 * always resolve to a well-formed SendResult (the whatsapp-errors.ts hostile-getter precedent).
 */
export function classifyTelegramError(err: unknown): { code: string; errorClass: TelegramErrorClass } {
  let telegramCode: number | null = null;
  // -1 = "no HTTP information at all" (distinct from a real TelegramSendError network failure, which carries
  // httpStatus 0). Keeps a hostile / non-error throw classifying as `unknown` rather than a fake transient.
  let httpStatus = -1;
  try {
    if (err instanceof TelegramSendError) {
      telegramCode = err.telegramCode;
      httpStatus = err.httpStatus;
    } else if (err && typeof err === 'object') {
      const maybeCode = (err as { telegramCode?: unknown }).telegramCode;
      if (typeof maybeCode === 'number') telegramCode = maybeCode;
      const maybeStatus = (err as { httpStatus?: unknown }).httpStatus;
      if (typeof maybeStatus === 'number') httpStatus = maybeStatus;
    }
  } catch {
    // A hostile `in`/getter access must never escape (breaks the "never reject into dispatch" invariant).
  }
  const errorClass = classForCode(telegramCode, httpStatus);
  const code = telegramCode !== null ? String(telegramCode) : httpStatus > 0 ? `http_${httpStatus}` : 'unknown';
  return { code, errorClass };
}

/** Build the `SendResult.detail` for a classified Telegram rejection — `<class>:<code>` (no PII, stable). */
export function rejectionDetail(errorClass: TelegramErrorClass, code: string): string {
  return `${errorClass}:${code}`;
}
