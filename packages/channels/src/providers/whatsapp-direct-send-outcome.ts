// The DIRECT WhatsApp path's failure classifier — Story 6.31 (Task 3.1b; WR10; AC7). Pure; ⛔ I/O.
//
// A direct sender (6.31's peer-mesh reminder; row 6-37d's claim-contact step) sends ONE Meta template outside `dispatch()` and
// must decide, per failure, whether the message MAY have reached Meta (⛔ ever resent — Meta has ⛔ idempotency key), whether to
// retry, or whether the refusal is about the WHOLE scope (the account, the number, the template) or unknown. This function
// decides only the KIND and a stable token; park-or-finish is the CALLER's (6.31 parks `scope` / `unknown_scope`; 6.37d records
// its own way).
//
// ⚠ `classifyWhatsappError`'s CLASS alone is ⛔ enough (T13): it returns `api_unavailable` for BOTH a thrown fetch (`httpStatus` 0)
// and a 5xx, and `unknown` for a code-less 401 / 403 and every code outside its five sets — so the Meta-code sets below are read
// FIRST, over `metaCode`, `httpStatus` and `transport`, and `whatsapp-errors.ts` is left UNCHANGED (its 131048 / 133016 rate-limit
// filing keeps `dispatch()`'s behaviour — a recorded LOW correction, deferred-work). Meta's codes are from its error-codes page
// (read 2026-10-19 — re-verify when Meta versions the API).
//
// THE RULES, IN THIS ORDER (WR10):
//   0. a `WhatsappTemplateParamError` (thrown BEFORE fetch — nothing was sent) ⇒ `unknown_scope` / `param_invalid`;
//   1. `httpStatus` 0 (a thrown fetch — by `transport`), any throw that is ⛔ a `WhatsappSendError` (`unknown` — the classifier
//      cannot prove it preceded the send), or a 2xx (the client throws on a 2xx only when there is ⛔ wamid) ⇒ `may_have_sent`;
//   2. `httpStatus` 502 / 504 (a gateway that may have forwarded the request) ⇒ `may_have_sent` / `gateway_<status>`;
//   4. SCOPE-WIDE — tested before rule 3's status test (131048 arrives on a 429, 131057 on a 503): the code set below, class
//      `template_not_approved` (132xxx) or `auth`, or `httpStatus` 401 / 403 whatever the code ⇒ `scope`;
//   5. RECIPIENT — 131026, 131021 only ⇒ `recipient`;
//   3. TRANSIENT — a 429 (with or without a code ⇒ `rate_limited:<code|none>`), a Meta rate-limit code on any status
//      (`rate_limited:<code>`), any other 5xx (`api_unavailable:<status>`) ⇒ `transient`;
//   6. everything else Meta answered ⇒ `unknown_scope` (⛔ a once-ever message spent on a fault that may be the account's).

import { WhatsappSendError, WhatsappTemplateParamError } from './whatsapp-app.js';
import { classifyWhatsappError } from './whatsapp-errors.js';

/**
 * What a direct WhatsApp send failure means. `token` is `[a-z0-9_]+` (⛔ a 7-digit run) for every kind EXCEPT `transient`,
 * whose token is the whole note — `rate_limited:<code|none>` or `api_unavailable:<status>`.
 */
export type DirectWaSendFailure =
  | { readonly kind: 'may_have_sent'; readonly token: 'network' | 'timeout' | 'unknown' | 'no_wamid' | 'gateway_502' | 'gateway_504' }
  | { readonly kind: 'transient'; readonly token: string }
  | { readonly kind: 'scope'; readonly token: string }
  | { readonly kind: 'unknown_scope'; readonly token: string }
  | { readonly kind: 'recipient'; readonly token: string };

/** Rule 4 — refusals about the SENDER's number, account or policy (⛔ the recipient's). */
export const DIRECT_WA_SCOPE_CODES: ReadonlySet<number> = new Set([
  131048, // the number's quality restriction (Pariwar-wide — ⛔ a rate limit)
  131031, // account locked
  131042, // payment / eligibility
  131045, // the SENDER number's registration error
  131057, // account in maintenance
  133010, // number not registered
  368, // policy block
]);
/** Rule 5 — the one recipient they are about. */
export const DIRECT_WA_RECIPIENT_CODES: ReadonlySet<number> = new Set([131026, 131021]);
/** Rule 3 — Meta's rate-limit codes, on ANY status. */
export const DIRECT_WA_RATE_LIMIT_CODES: ReadonlySet<number> = new Set([130429, 131056, 80007]);

/** `meta_<code>` for an integer code 0–999999 (⛔ a 7-digit run — the stored grammar refuses one), else `meta_other`. */
function metaToken(code: number): string {
  return Number.isInteger(code) && code >= 0 && code <= 999_999 ? `meta_${String(code)}` : 'meta_other';
}

/** A code for a `rate_limited:` note — the same bound, else `none`. */
function rateCode(code: number | null): string {
  return code !== null && Number.isInteger(code) && code >= 0 && code <= 999_999 ? String(code) : 'none';
}

/** ⭐ WR10 — classify a direct WhatsApp send failure. Never throws (a hostile throw is `may_have_sent` / `unknown`). */
export function classifyDirectWaSendFailure(err: unknown): DirectWaSendFailure {
  let metaCode: number | null;
  let httpStatus: number;
  let transport: 'timeout' | 'network' | undefined;
  try {
    // 0 — nothing was sent.
    if (err instanceof WhatsappTemplateParamError) return { kind: 'unknown_scope', token: 'param_invalid' };
    // 1 — the classifier cannot prove a foreign throw preceded the send.
    if (!(err instanceof WhatsappSendError)) return { kind: 'may_have_sent', token: 'unknown' };
    metaCode = err.metaCode;
    httpStatus = err.httpStatus;
    transport = err.transport;
  } catch {
    return { kind: 'may_have_sent', token: 'unknown' };
  }

  // 1 — a thrown fetch, or a 2xx without a wamid (the request reached someone).
  if (httpStatus === 0) return { kind: 'may_have_sent', token: transport ?? 'network' };
  if (httpStatus < 0) return { kind: 'may_have_sent', token: 'unknown' };
  if (httpStatus >= 200 && httpStatus <= 299) return { kind: 'may_have_sent', token: 'no_wamid' };
  // 2 — a gateway that may have forwarded it.
  if (httpStatus === 502 || httpStatus === 504) return { kind: 'may_have_sent', token: httpStatus === 502 ? 'gateway_502' : 'gateway_504' };

  // 4 — scope-wide, BEFORE the status test.
  if (metaCode !== null && DIRECT_WA_SCOPE_CODES.has(metaCode)) return { kind: 'scope', token: metaToken(metaCode) };
  const { errorClass } = classifyWhatsappError(err);
  if (metaCode !== null && (errorClass === 'template_not_approved' || errorClass === 'auth')) return { kind: 'scope', token: errorClass };
  if (httpStatus === 401 || httpStatus === 403) return { kind: 'scope', token: `http_${String(httpStatus)}` };

  // 5 — the recipient.
  if (metaCode !== null && DIRECT_WA_RECIPIENT_CODES.has(metaCode)) return { kind: 'recipient', token: metaToken(metaCode) };

  // 3 — transient.
  if (httpStatus === 429) return { kind: 'transient', token: `rate_limited:${rateCode(metaCode)}` };
  if (metaCode !== null && DIRECT_WA_RATE_LIMIT_CODES.has(metaCode)) return { kind: 'transient', token: `rate_limited:${rateCode(metaCode)}` };
  if (httpStatus >= 500 && httpStatus <= 599) return { kind: 'transient', token: `api_unavailable:${String(httpStatus)}` };

  // 6 — Meta answered with a refusal whose scope is unknown.
  return { kind: 'unknown_scope', token: metaCode !== null ? metaToken(metaCode) : `http_${String(httpStatus)}` };
}
