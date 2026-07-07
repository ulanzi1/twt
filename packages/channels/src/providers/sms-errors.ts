// SMS-DLT send-error classification — Story 5.6 (AC1; Task 1).
//
// India's DLT-transactional telephony gateway returns a string `code` (+ an HTTP status). This classifier
// maps a failure into a STABLE, PII-free class the (future) cascade ladder + observability can read back
// off `SendResult.detail` — WITHOUT any SendResult shape change (mirrors whatsapp-errors.ts / telegram-
// errors.ts: the provider stays pure of policy, the detail carries `<class>:<code>`). SMS is the TERMINAL
// ladder rung — there is no fallback below it, so a classified SMS rejection is the honest end of the line.
//
// ⚠ CODES ARE INDICATIVE, VERIFY AT IMPLEMENT TIME. Telephony gateways differ and their error-code
// references change. The class↔code mapping below is a representative DLT-gateway shape and MUST be
// re-verified against the CHOSEN gateway's reference (the AR-53 single-module swap). The mapping is
// deliberately DATA-DRIVEN (a set/prefix check, not scattered conditionals) so a correction is a one-line
// edit — the gateway-specific string codes live HERE, never leaking into the provider/dispatch/render.

import { SmsSendError } from './sms-app.js';

/** The stable SMS failure classes the cascade/observability seam reads. */
export type SmsErrorClass =
  | 'invalid_number'
  | 'dlt_template_not_approved'
  | 'carrier_reject'
  | 'rate_limited'
  | 'api_unavailable'
  | 'auth'
  | 'unknown';

// ── Gateway error codes by class (INDICATIVE — verify against the chosen gateway's reference) ──────────
// A bad / non-routable recipient msisdn.
const INVALID_NUMBER_CODES: ReadonlySet<string> = new Set(['INVALID_NUMBER', 'INVALID_MOBILE', 'E001']);
// The #1 DLT reject cause: the content does not byte-match a registered template, or the template id /
// header is not approved / is paused. Content-mismatch is folded into this class (both are "fix the
// template registration", not "retry the recipient").
const TEMPLATE_NOT_APPROVED_CODES: ReadonlySet<string> = new Set([
  'DLT_TEMPLATE_NOT_APPROVED',
  'TEMPLATE_MISMATCH',
  'CONTENT_TEMPLATE_MISMATCH',
  'TEMPLATE_NOT_FOUND',
  'INVALID_TEMPLATE',
  'E002',
]);
// Carrier / operator refused the message (DND, spam filter, operator block) — recipient-side reject.
const CARRIER_REJECT_CODES: ReadonlySet<string> = new Set(['CARRIER_REJECT', 'DND_REJECT', 'BLOCKED', 'E003']);
// Throughput / capacity throttle — transient, retryable by the cascade's backoff.
const RATE_LIMIT_CODES: ReadonlySet<string> = new Set(['RATE_LIMIT', 'THROTTLED', 'TOO_MANY_REQUESTS', 'E004']);
// Gateway credential invalid / lacking permission.
const AUTH_CODES: ReadonlySet<string> = new Set(['AUTH_FAILED', 'UNAUTHORIZED', 'INVALID_API_KEY', 'E005']);

/** Classify a gateway code (+ HTTP status) into its stable SMS failure class. */
function classForCode(gatewayCode: string | null, httpStatus: number): SmsErrorClass {
  if (gatewayCode !== null) {
    if (INVALID_NUMBER_CODES.has(gatewayCode)) return 'invalid_number';
    if (TEMPLATE_NOT_APPROVED_CODES.has(gatewayCode)) return 'dlt_template_not_approved';
    if (CARRIER_REJECT_CODES.has(gatewayCode)) return 'carrier_reject';
    if (RATE_LIMIT_CODES.has(gatewayCode)) return 'rate_limited';
    if (AUTH_CODES.has(gatewayCode)) return 'auth';
  }
  // Status-driven fallbacks when the gateway gave no (recognized) code.
  if (httpStatus === 401 || httpStatus === 403) return 'auth';
  if (httpStatus === 429) return 'rate_limited';
  // An explicit transport failure (httpStatus 0 = network, no response) or a 5xx → the gateway is
  // unavailable (transient). A httpStatus < 0 means "no information at all" (a non-error throw / hostile
  // object) → honest `unknown`, NOT a fabricated transient class.
  if (httpStatus === 0 || httpStatus >= 500) return 'api_unavailable';
  return 'unknown';
}

/**
 * Classify a thrown SMS send error into its stable class + a stable code token. Accepts `unknown` (the
 * provider's catch block) and is defensive: a non-`SmsSendError` throw (or a hostile getter) still resolves
 * to a well-formed result — this function's whole contract is "never throws" so the provider can always
 * resolve to a well-formed SendResult (the whatsapp-errors.ts hostile-getter precedent).
 */
export function classifySmsError(err: unknown): { code: string; errorClass: SmsErrorClass } {
  let gatewayCode: string | null = null;
  // -1 = "no HTTP information at all" (distinct from a real SmsSendError network failure, which carries
  // httpStatus 0). Keeps a hostile / non-error throw classifying as `unknown` rather than a fake transient.
  let httpStatus = -1;
  try {
    if (err instanceof SmsSendError) {
      gatewayCode = err.gatewayCode;
      httpStatus = err.httpStatus;
    } else if (err && typeof err === 'object') {
      const maybeCode = (err as { gatewayCode?: unknown }).gatewayCode;
      if (typeof maybeCode === 'string') gatewayCode = maybeCode;
      const maybeStatus = (err as { httpStatus?: unknown }).httpStatus;
      if (typeof maybeStatus === 'number') httpStatus = maybeStatus;
    }
  } catch {
    // A hostile `in`/getter access must never escape (breaks the "never reject into dispatch" invariant).
  }
  const errorClass = classForCode(gatewayCode, httpStatus);
  const code = gatewayCode !== null ? gatewayCode : httpStatus > 0 ? `http_${httpStatus}` : 'unknown';
  return { code, errorClass };
}

/** Build the `SendResult.detail` for a classified SMS rejection — `<class>:<code>` (no PII, stable). */
export function rejectionDetail(errorClass: SmsErrorClass, code: string): string {
  return `${errorClass}:${code}`;
}
