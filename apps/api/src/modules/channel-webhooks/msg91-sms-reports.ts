// MSG91's SMS delivery reports — the webhook's PURE half (Story 6.37b, Task 4; `2026-10-17-347` DR1, DR2, DR10; I3;
// ADR-0042). The body parse and the allowlisted projection, ⛔ I/O — the handler (handlers.ts) authenticates, persists
// and ACKs.
//
// ── ⛔ The phone number (I3, DR2) ───────────────────────────────────────────────────────────────────────────────
// A report is reduced to EXACTLY six values — the request id, the CRQID, the status code, the event name, the failure
// reason and the delivery time — read from those six keys only. `telNum`, `senderId`, `credit`, `userId`, `DLT_TE_ID`
// and every other key are ⛔ read. The failure reason is MSG91's free text, so every sequence of ≥ 7 digits — any
// script's, contiguous or with up to three non-letter characters between each pair (`+91 98123-45678`, `98123,45678`,
// `[98123] [45678]`) — becomes `#`.
// ⚠ Node's `JSON.parse` error message QUOTES the body (the number included): the parse error is CAUGHT here and its
// message is ⛔ kept, returned or logged (T20).
//
// ── The body (DR2, DR10) ────────────────────────────────────────────────────────────────────────────────────────
// The route reads every content type as a Buffer (its own `'*'` parser): one JSON object ⇒ one report; a JSON array of
// 1–100 objects ⇒ one report each; anything else (empty, absent, not JSON, a scalar, an array holding a non-object or
// more than 100) is UNUSABLE — the handler answers 200 with ⛔ row and one alarm line (a 4xx counts toward MSG91's
// auto-pause — F6).

import { smsDelivery } from '@twt/domain';

/** The header MSG91 is configured to send the static token in (DR1). ⚠ The handler reads it as an INLINE literal (I5). */
export const MSG91_SMS_REPORT_TOKEN_HEADER = 'x-twt-msg91-secret-token';

/** The webhook's boot-resolved tokens (DR1). `current` null ⇒ the webhook is disabled (403 to every request). */
export interface SmsReportWebhookAuth {
  readonly current: string | null;
  /** The rotation's other half (§5.9's dual-secret window), or null. */
  readonly next: string | null;
}

/** The webhook disabled — every request is a 403 (the default when no token is configured). */
export const SMS_REPORT_WEBHOOK_DISABLED: SmsReportWebhookAuth = { current: null, next: null };

/** The reports a body holds, or why it holds none. */
export type SmsReportBody = { readonly kind: 'reports'; readonly items: readonly unknown[] } | { readonly kind: 'unusable' };

/**
 * Parse a request body (DR10) — the route's `'*'` parser hands a Buffer, or nothing at all (⛔ body). Never throws; ⛔ the
 * parse error's message escapes.
 */
export function parseSmsReportBody(raw: unknown): SmsReportBody {
  let text: string;
  if (Buffer.isBuffer(raw)) text = raw.toString('utf8');
  else if (typeof raw === 'string') text = raw;
  else return { kind: 'unusable' };
  // A UTF-8 byte-order mark is ⛔ JSON — `JSON.parse` would throw and a valid report would be ACKed and lost.
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  if (text.trim() === '') return { kind: 'unusable' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    // ⛔ the error — its message quotes the body (I3, T20).
    return { kind: 'unusable' };
  }
  if (isPlainObject(parsed)) return { kind: 'reports', items: [parsed] };
  if (Array.isArray(parsed) && parsed.length >= 1 && parsed.length <= smsDelivery.SMS_REPORTS_PER_REQUEST_MAX && parsed.every(isPlainObject)) {
    return { kind: 'reports', items: parsed };
  }
  return { kind: 'unusable' };
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** An own property, or undefined (⛔ a prototype key). */
function own(o: Record<string, unknown>, key: string): unknown {
  return Object.hasOwn(o, key) ? o[key] : undefined;
}

/** MSG91 writes every value as a JSON string (F2); a finite number is accepted as its decimal form. */
function text(v: unknown): string | null {
  if (typeof v === 'string') return v;
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return null;
}

const REQUEST_ID = /^[A-Za-z0-9]{1,64}$/;
// DR2 / I3 (code review round 2) — `deliveryTime` is kept ONLY in a timestamp shape (F3's two forms: `2025-07-09 11:29:46`
// and ISO with an offset), else NULL: a bare number in the field (`919812345678`) is ⛔ stored. Record-only (T8), so a form
// outside the grammar loses nothing correlation needs. ⚠ LOCKSTEP with migration 0168's
// `sms_delivery_report_inbox_reported_delivery_time_check` (a spec pins the two equal).
export const DELIVERY_TIME = /^[0-9]{4}-[0-9]{2}-[0-9]{2}[ T][0-9]{2}:[0-9]{2}(:[0-9]{2}(\.[0-9]{1,6})?)?(Z|[+-][0-9]{2}:?[0-9]{2})?$/;
const STATUS_CODE = /^[0-9]{1,3}$/;
const EVENT_NAME = /^[A-Za-z_]{1,32}$/;
// Every control, format and line / paragraph separator character — a superset of what migration 0167's `[[:cntrl:]]`
// CHECK refuses, so a cleaned value can ⛔ fail the INSERT (a 5xx counts toward MSG91's auto-pause).
const CONTROL = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu;
// ≥ 7 numeric characters of any script (`\p{N}` — superscript and circled digits included), each pair separated by
// ⛔ separator or by 1–3 characters that are neither letters nor numerals: ANY punctuation, symbol or space, so a number
// formatted with a separator nobody listed is still masked. Mask before truncating so a long formatted number cannot
// leave an identifying prefix. ⚠ DELIBERATE over-masking: a timestamp or version string with ≥ 7 digits becomes `#` too
// — the status code is the classification, and preserving a number is never needed to correlate a report. The
// separator class and `\p{N}` are disjoint and the separator is bounded, so the scan is linear (⛔ backtracking).
const PHONE_DIGITS = /\+?\p{N}(?:[^\p{L}\p{N}]{0,3}\p{N}){6,}/gu;

/** DR2 / I3 — controls stripped, ≥ 7 digits (contiguous or separated) ⇒ `#`, trimmed, ≤ 200; blank ⇒ null. */
export function cleanFailureReason(v: unknown): string | null {
  const s = text(v);
  if (s === null) return null;
  const cleaned = s.replace(CONTROL, '').replace(PHONE_DIGITS, '#').trim().slice(0, 200).trim();
  return cleaned === '' ? null : cleaned;
}

/**
 * DR2 — project ONE report to the columns the inbox keeps. `null` ⇒ ⛔ usable request id: the report is ⛔ stored (the
 * CHECK must never 5xx a retry toward auto-pause) and counts toward the request's `bad_request_id` line.
 */
export function projectSmsReport(report: Record<string, unknown>): smsDelivery.SmsDeliveryReportProjection | null {
  // A STRING only (code review round 2): a JSON number past 2^53 would be stored as a DIFFERENT id that never matches its send.
  const rawRequestId = own(report, 'requestId');
  const requestId = typeof rawRequestId === 'string' ? rawRequestId : null;
  if (requestId === null || !REQUEST_ID.test(requestId)) return null;
  // T7 — `"0"` (MSG91's "none") and `""` are ⛔ CRQID; anything outside DR3's grammar is ⛔ ours.
  const crqidRaw = text(own(report, 'CRQID'));
  const crqid = crqidRaw !== null && smsDelivery.isSmsCorrelationId(crqidRaw) ? crqidRaw : null;
  const status = text(own(report, 'status'));
  const eventName = text(own(report, 'eventName'));
  const deliveryTime = text(own(report, 'deliveryTime'));
  return {
    requestId,
    crqid,
    statusCode: status !== null && STATUS_CODE.test(status) ? status : null,
    eventName: eventName !== null && EVENT_NAME.test(eventName) ? eventName : null,
    failureReason: cleanFailureReason(own(report, 'failureReason')),
    // T8 — kept as received, for the record only (⛔ parsed) — and only in a timestamp shape (I3; ⛔ control characters by grammar).
    reportedDeliveryTime: deliveryTime !== null && DELIVERY_TIME.test(deliveryTime) ? deliveryTime : null,
  };
}

/** The projection of a whole body: the rows to persist and how many reports had ⛔ usable request id. */
export function projectSmsReports(items: readonly unknown[]): {
  readonly rows: readonly smsDelivery.SmsDeliveryReportProjection[];
  readonly badRequestIds: number;
} {
  const rows: smsDelivery.SmsDeliveryReportProjection[] = [];
  let badRequestIds = 0;
  for (const item of items) {
    const row = isPlainObject(item) ? projectSmsReport(item) : null;
    if (row === null) badRequestIds += 1;
    else rows.push(row);
  }
  return { rows, badRequestIds };
}
