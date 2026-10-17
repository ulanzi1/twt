// SMS send-error classification — Story 5.6 (AC1; Task 1); MSG91's code table by Story 6.37 (MG6, MG7; ADR-0041).
//
// MSG91 returns a string `code` (+ an HTTP status). This classifier maps a failure into a STABLE, PII-free class the
// callers read back off `SendResult.detail` — WITHOUT any SendResult shape change (mirrors whatsapp-errors.ts /
// telegram-errors.ts: the detail carries `<class>:<code>`). The classes are FROZEN (I5 — the 0155 / 0166 detail
// CHECKs enumerate them); a new MSG91 code joins a set below, ⛔ a new class.
//
// ── Source (read 2026-10-17) ────────────────────────────────────────────────────────────────────────────
// MSG91 help, "What are the reasons for error codes received under API failed"
// (https://msg91.com/help/api/what-are-the-reason-for-error-codes-received-under-the-api-failed). ⚠ MSG91 reports
// most errors ASYNCHRONOUSLY (F9) — a synchronous `code` on a Flow send is ⛔ documented — so this table is the
// DEFENSIVE mapping for when one arrives, and MOSTLY UNREACHABLE at send today.
// ⚠ `auth` means "the gateway ACCOUNT refuses" — a bad key, but also balance (301), an IP (208 / 418), a route
// (209 / 210 / 602) — so 6.27c's P1 stops a peer-mesh child on each. ⚠ `carrier_reject` has ⛔ synchronous MSG91 code:
// DND / operator blocks arrive only in a delivery report (row 6-37b); the class is kept (I5).

import { claim } from '@twt/domain';

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

// ── MSG91 error codes by class (MG7) ────────────────────────────────────────────────────────────────────
// 201 bad credentials · 204 SMS not enabled for the key · 207 invalid authkey · 208 IP blacklisted · 209 / 210 route
// not found / not determined · 301 insufficient balance · 302 / 303 expired / banned · 418 IP not whitelisted ·
// 421 service terminated · 602 route disabled.
const AUTH_CODES: ReadonlySet<string> = new Set(['201', '204', '207', '208', '209', '210', '301', '302', '303', '418', '421', '602']);
// 203 invalid sender / DLT entity · 211 DLT template id missing · 310 too long · 400 template id missing / incorrect /
// archived · 401 flow not approved · 402 hard-block keywords · 403 flow disabled · 603 sender blacklisted.
const TEMPLATE_NOT_APPROVED_CODES: ReadonlySet<string> = new Set(['203', '211', '310', '400', '401', '402', '403', '603']);
// 101 missing mobile · 202 invalid mobile · 604 no valid number.
const INVALID_NUMBER_CODES: ReadonlySet<string> = new Set(['101', '202', '604']);
// 306 route unavailable · 506 / 601 internal.
const API_UNAVAILABLE_CODES: ReadonlySet<string> = new Set(['306', '506', '601']);
// 311 ("the first SMS will be delivered and the second rejected": a MAY-HAVE-SENT, ⛔ an acceptance and ⛔ a retry — T12)
// · 407 international blocked — `unknown` whatever the HTTP status.
const UNKNOWN_CODES: ReadonlySet<string> = new Set(['311', '407']);
// ⚠ An UNLISTED code is `unknown` too — unless the HTTP status itself says auth (401 / 403), throttled (429) or unavailable
// (5xx): an unknown code on a 503 is ⛔ proof the request was refused, so it stays a transient (⛔ a spent slot).

/** Classify a gateway code (+ HTTP status) into its stable SMS failure class. */
function classForCode(gatewayCode: string | null, httpStatus: number): SmsErrorClass {
  if (gatewayCode !== null) {
    const code = gatewayCode.trim();
    if (AUTH_CODES.has(code)) return 'auth';
    if (TEMPLATE_NOT_APPROVED_CODES.has(code)) return 'dlt_template_not_approved';
    if (INVALID_NUMBER_CODES.has(code)) return 'invalid_number';
    if (API_UNAVAILABLE_CODES.has(code)) return 'api_unavailable';
    if (UNKNOWN_CODES.has(code)) return 'unknown';
    // An unlisted code: the status fallbacks below, else `unknown` (a 2xx / other 4xx).
  }
  // Status-driven fallbacks when the gateway gave no (recognized) code.
  if (httpStatus === 401 || httpStatus === 403) return 'auth';
  if (httpStatus === 429) return 'rate_limited';
  // An explicit transport failure (httpStatus 0 = network, no response) or a 5xx → the gateway is
  // unavailable (transient). A httpStatus < 0 means "no information at all" (a non-error throw / hostile
  // object) → honest `unknown`, NOT a fabricated transient class.
  if ((httpStatus === 0 && gatewayCode === null) || httpStatus >= 500) return 'api_unavailable';
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
  let local: { errorClass: SmsErrorClass; code: string } | null = null;
  // -1 = "no HTTP information at all" (distinct from a real SmsSendError network failure, which carries
  // httpStatus 0). Keeps a hostile / non-error throw classifying as `unknown` rather than a fake transient.
  let httpStatus = -1;
  try {
    if (err instanceof SmsSendError) {
      gatewayCode = err.gatewayCode;
      httpStatus = err.httpStatus;
      local = err.local;
    } else if (err && typeof err === 'object') {
      const maybeCode = (err as { gatewayCode?: unknown }).gatewayCode;
      if (typeof maybeCode === 'string') gatewayCode = maybeCode;
      const maybeStatus = (err as { httpStatus?: unknown }).httpStatus;
      if (typeof maybeStatus === 'number') httpStatus = maybeStatus;
    }
  } catch {
    // A hostile `in`/getter access must never escape (breaks the "never reject into dispatch" invariant).
  }
  if (local !== null) return { code: claim.sanitizeSmsGatewayCode(local.code), errorClass: local.errorClass };
  const errorClass = classForCode(gatewayCode, httpStatus);
  // Every gateway-supplied code passes the stored-detail scrub (I6 — 6.19b/c/d store a detail RAW): a code that is
  // ⛔ `[A-Za-z0-9_.-]{1,64}`, or carries a run of 7 digits, becomes `unknown`.
  const code =
    gatewayCode !== null ? claim.sanitizeSmsGatewayCode(gatewayCode.trim()) : httpStatus > 0 ? `http_${httpStatus}` : 'unknown';
  return { code, errorClass };
}

/** Build the `SendResult.detail` for a classified SMS rejection — `<class>:<code>` (no PII, stable). */
export function rejectionDetail(errorClass: SmsErrorClass, code: string): string {
  return `${errorClass}:${code}`;
}
