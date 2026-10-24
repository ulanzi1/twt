// The SMS correlation id — MSG91's `CRQID` — Story 6.37b (Task 1.1; DR3, `2026-10-17-347`).
//
// Every SMS the platform sends carries an id MSG91 echoes back in its delivery report: a KIND prefix + the send row's
// own uuid, lower-case and without dashes. A report is then matched by a primary-key lookup in ONE table (DR3 (i)),
// and a report for a request id no row holds still finds its row (DR3 (ii) — the may-have-sent retry is SEEN).
//
//   cr — a claim correction reminder row (a reminder OR a closure notice)
//   ce — a claim certificate reminder row
//   sn — a claim suspicion notice row
//   pm — a peer-mesh ping row
//   as — an alert SMS send row (Story 5.11b, FS22 — the three contribution texts; `alert_sms_sends`)
//   ot — a login / step-up code (a random id, ⛔ a row — DR11)
//
// 34 characters, alphanumeric: inside BOTH of MSG91's documented limits (80 with `_ . -`, and the legacy 52
// alphanumeric — F7). This file is the ONE TypeScript copy of the grammar; migration 0167's CHECKs (replaced by 0184 to admit
// `as`) are its one sanctioned SQL mirror. It lives in `@twt/domain` (⛔ `@twt/channels`) because domain cannot import channels and the
// delivery-report accessors need it; channels, api and jobs import it from here.

import { UUID_REGEX } from '../db.js';

/** The send kinds a correlation id can name (DR3). */
export const SMS_CORRELATION_KINDS = ['cr', 'ce', 'sn', 'pm', 'as', 'ot'] as const;

/** One send kind. */
export type SmsCorrelationKind = (typeof SMS_CORRELATION_KINDS)[number];

/** The send kinds backed by a send ROW (`ot` is not) — the four claim texts and the alert SMS (`as`). */
export type SmsSendRowKind = Exclude<SmsCorrelationKind, 'ot'>;

/** The grammar (DR3): a kind + 32 lower-case hex. */
export const SMS_CORRELATION_ID_PATTERN = /^(cr|ce|sn|pm|as|ot)[0-9a-f]{32}$/;

/** A parsed correlation id: the kind and the row id in its dashed, lower-case uuid form. */
export interface SmsCorrelation {
  readonly kind: SmsCorrelationKind;
  readonly rowId: string;
}

/**
 * Format a send's correlation id. Throws on a kind outside the grammar or a row id that is not a dashed uuid — the
 * message names neither value. The caller's row id is always its own uuid, so a throw here is a code bug.
 */
export function formatSmsCorrelationId(input: { readonly kind: SmsCorrelationKind; readonly rowId: string }): string {
  if (!(SMS_CORRELATION_KINDS as readonly string[]).includes(input.kind)) {
    throw new Error('sms correlation: unknown kind');
  }
  if (!UUID_REGEX.test(input.rowId)) throw new Error('sms correlation: the row id is not a uuid');
  const id = `${input.kind}${input.rowId.replace(/-/g, '').toLowerCase()}`;
  // Defence in depth — the two checks above already imply it.
  if (!SMS_CORRELATION_ID_PATTERN.test(id)) throw new Error('sms correlation: outside the grammar');
  return id;
}

/** Whether a value is a well-formed correlation id. */
export function isSmsCorrelationId(value: string): boolean {
  return SMS_CORRELATION_ID_PATTERN.test(value);
}

/** Parse a correlation id back to its kind and dashed row id; `null` for anything outside the grammar. */
export function parseSmsCorrelationId(value: string): SmsCorrelation | null {
  const match = SMS_CORRELATION_ID_PATTERN.exec(value);
  if (match === null) return null;
  const kind = match[1] as SmsCorrelationKind;
  const hex = value.slice(2);
  const rowId = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  return { kind, rowId };
}
