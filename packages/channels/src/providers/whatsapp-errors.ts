// WhatsApp send-error classification — Story 5.3 (AC6; Task 2).
//
// Meta's WhatsApp Business Cloud API returns a numeric `error.code` (+ an HTTP status). This classifier
// maps a failure into a STABLE, PII-free class the (future 5.6) fallback ladder + observability can read
// back off `SendResult.detail` — WITHOUT any SendResult shape change (mirrors push-errors.ts: the provider
// stays pure of policy, the detail carries `<class>:<code>`). This story adds NO cascade/retry — the
// dispatcher records the honest outcome; AR-19's fallback-to-SMS is Story 5.6 (which WRAPS the dispatcher).
//
// ⚠ CODES ARE INDICATIVE, VERIFY AT IMPLEMENT TIME (AC6). Meta versions the Cloud API and its error-code
// reference changes. The class↔code mapping below is drawn from Meta's published Cloud API error-code
// reference and MUST be re-verified against the CURRENT reference — do NOT treat these numbers as settled.
// The mapping is deliberately DATA-DRIVEN (a set/range check, not scattered conditionals) so a correction
// is a one-line edit. Ranges are used where Meta groups a family under a shared prefix (e.g. 132xxx =
// template errors) so an unlisted-but-in-family code still classifies sensibly.

import { WhatsappSendError } from './whatsapp-app.js';

/** The stable WA failure classes the fallback/observability seam reads (AC6). */
export type WhatsappErrorClass =
  | 'template_not_approved'
  | 'api_unavailable'
  | 'window_expired'
  | 'recipient_blocked'
  | 'invalid_recipient'
  | 'auth'
  | 'unknown';

// ── Meta error codes by class (INDICATIVE — verify against the current Meta reference) ─────────────────
// Auth / system-user token invalid or lacking permission.
const AUTH_CODES: ReadonlySet<number> = new Set([0, 3, 10, 190, 200, 2500]);
// The member's 24h customer-service window closed / re-engagement required (UTILITY templates CAN be sent
// outside 24h, but some accounts/message shapes still surface a window error).
const WINDOW_EXPIRED_CODES: ReadonlySet<number> = new Set([131047, 131051, 131053]);
// Recipient cannot receive: blocked the number / not on WhatsApp for this send / undeliverable.
const RECIPIENT_BLOCKED_CODES: ReadonlySet<number> = new Set([131026, 131045, 131052]);
// Malformed / invalid recipient or parameter (a bad msisdn, a param mismatch on the recipient side).
const INVALID_RECIPIENT_CODES: ReadonlySet<number> = new Set([131008, 131009, 131021]);
// Rate-limit / throughput / capacity — transient, retryable by a later ladder.
const RATE_LIMIT_CODES: ReadonlySet<number> = new Set([130429, 131048, 131056, 133016, 80007]);

/** Classify a numeric Meta code (+ HTTP status) into its stable WA failure class. */
function classForCode(metaCode: number | null, httpStatus: number): WhatsappErrorClass {
  if (metaCode !== null) {
    // Template family: Meta groups template errors under 132xxx (not approved / paused / param mismatch).
    if (metaCode >= 132000 && metaCode <= 132999) return 'template_not_approved';
    if (AUTH_CODES.has(metaCode)) return 'auth';
    if (WINDOW_EXPIRED_CODES.has(metaCode)) return 'window_expired';
    if (RECIPIENT_BLOCKED_CODES.has(metaCode)) return 'recipient_blocked';
    if (INVALID_RECIPIENT_CODES.has(metaCode)) return 'invalid_recipient';
    if (RATE_LIMIT_CODES.has(metaCode)) return 'api_unavailable';
  }
  // An explicit transport failure (a WhatsappSendError with httpStatus 0 = network error, no response) or a
  // 5xx → the API is unavailable (transient). A httpStatus < 0 means "no information at all" (a non-error
  // throw / hostile object) → honest `unknown`, NOT a fabricated transient class.
  if (httpStatus === 0 || httpStatus >= 500) return 'api_unavailable';
  return 'unknown';
}

/**
 * Classify a thrown WA send error into its stable class + a stable code token. Accepts `unknown` (the
 * provider's catch block) and is defensive: a non-`WhatsappSendError` throw (or a hostile getter) still
 * resolves to a well-formed result — this function's whole contract is "never throws" so the provider can
 * always resolve to a well-formed SendResult (the push-errors.ts:46-52 hostile-getter precedent).
 */
export function classifyWhatsappError(err: unknown): { code: string; errorClass: WhatsappErrorClass } {
  let metaCode: number | null = null;
  // -1 = "no HTTP information at all" (distinct from a real WhatsappSendError network failure, which carries
  // httpStatus 0). Keeps a hostile / non-error throw classifying as `unknown` rather than a fake transient.
  let httpStatus = -1;
  try {
    if (err instanceof WhatsappSendError) {
      metaCode = err.metaCode;
      httpStatus = err.httpStatus;
    } else if (err && typeof err === 'object') {
      // Defensive read across a non-WhatsappSendError shape (never trust an unknown throw's getters).
      const maybeCode = (err as { metaCode?: unknown }).metaCode;
      if (typeof maybeCode === 'number') metaCode = maybeCode;
      const maybeStatus = (err as { httpStatus?: unknown }).httpStatus;
      if (typeof maybeStatus === 'number') httpStatus = maybeStatus;
    }
  } catch {
    // A hostile `in`/getter access must never escape (breaks the "never reject into dispatch" invariant).
  }
  const errorClass = classForCode(metaCode, httpStatus);
  const code = metaCode !== null ? String(metaCode) : httpStatus > 0 ? `http_${httpStatus}` : 'unknown';
  return { code, errorClass };
}

/** Build the `SendResult.detail` for a classified WA rejection — `<class>:<code>` (no PII, stable). */
export function rejectionDetail(errorClass: WhatsappErrorClass, code: string): string {
  return `${errorClass}:${code}`;
}
