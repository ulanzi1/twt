// The alert SMS rung's RECORDED details — Story 5.11b (AC4; `2026-10-25-404` FS6, FS9, FS17). A LEAF module (⛔ imports): both
// the fan-out (`contribution-notify.ts` — the allow-list and the retry rule) and the send seam (`alert-sms-send.ts` — the producer
// of these words) read it, so neither takes a value import from the other ([[project_type_only_import_cycle_trap]]).
//
// Each is an EXACT literal (the trail's allow-list is an exact-string `Set`): a provider's own `<class>:<code>` is ⛔ recorded —
// it is folded into ONE word per class here, and the raw detail lives only on the send ROW (0184's grammar).

/** Why a lit, eligible member's text did not go — or the one kind that waits (FS9) — as recorded on the trail. */
export const ALERT_SMS_RUNG_DETAIL = {
  // ── Prepare refusals (FS17): ⛔ row, ⛔ dispatch, terminal, ONE alarm per (config key, detail) per memo window ──
  templateIdMissingHi: 'config:dlt_template_id_missing:hi',
  templateIdMissingEn: 'config:dlt_template_id_missing:en',
  templateIdMalformed: 'dlt_template_not_approved:template_id_malformed',
  gatewayUnconfigured: 'config:sms_gateway_unconfigured',
  messagingUnavailable: 'config:sms_messaging_unavailable',
  /** Every `config:secret_manager_<code>` (a known Secret Manager config fault). */
  secretManagerFault: 'config:secret_manager',
  valuesMismatch: 'dlt_template_not_approved:values_mismatch',
  valueTooLong: 'dlt_template_not_approved:value_too_long',
  /** A PROVEN pre-flight fault (the send key refused — MG17 (a)). An UNPROVEN one is SENT with a warning (fail open). */
  preflightAuth: 'auth:preflight',
  // ── The gateway's answer, folded (the row keeps the code) ──
  rejectedInvalidNumber: 'rejected_invalid_number',
  rejectedUnreachable: 'rejected_unreachable',
  /** A provider-final `auth:<code>` — alarmed, terminal. */
  gatewayAuth: 'auth:gateway',
  /** A provider-final `dlt_template_not_approved:<code>` — alarmed, terminal. */
  gatewayTemplate: 'dlt_template_not_approved:gateway',
  /** The gateway MAY have taken it (every `api_unavailable:*`, `unknown:*`), a stale lease, a render failure — ⛔ re-sent. */
  outcomeUnknown: 'exhausted:outcome_unknown',
  // ── The RETRY set (FS9) — on the FINAL attempt each is recorded `in_app_only` with this detail ──
  /** §3.4's window: a member with a WhatsApp target whose WhatsApp did not end `sent`, before the third attempt. */
  awaitingWaWindow: 'sms_awaiting_wa_window',
  /** The gateway DEFINITELY did not take it — the row is `deferred`, re-sent on retry. */
  rateLimited: 'rate_limited',
  /** Another attempt holds the row inside its lease. */
  inFlight: 'sms_send_in_flight',
  /** The send record could not be read or begun (a pool timeout, a DB error) — before any send. */
  stateUnavailable: 'sms_send_state_unavailable',
  /** A Secret Manager transient before any row. */
  configUnavailable: 'config_unavailable:secret_manager',
} as const;

export type AlertSmsRungDetail = (typeof ALERT_SMS_RUNG_DETAIL)[keyof typeof ALERT_SMS_RUNG_DETAIL];

/** FS9 — the details that put a member back on the RETRY set (unless the attempt is the final one). */
export const ALERT_SMS_RETRYABLE_DETAILS: ReadonlySet<string> = new Set<string>([
  ALERT_SMS_RUNG_DETAIL.awaitingWaWindow,
  ALERT_SMS_RUNG_DETAIL.rateLimited,
  ALERT_SMS_RUNG_DETAIL.inFlight,
  ALERT_SMS_RUNG_DETAIL.stateUnavailable,
  ALERT_SMS_RUNG_DETAIL.configUnavailable,
]);

/**
 * FS9 — which job attempt this is, per CALL (⛔ on the shared deps — T7). pg-boss's `retryCount` / `retryLimit` (the worker
 * registers with `includeMetadata`), the job id (the claim token is `${jobId}:${retryCount}` — pg-boss keeps the id across
 * retries) and the keyed store's scope (the send record's OCCASION — F4). Absent ⇒ the FINAL attempt (F3b's other callers).
 */
export interface FanOutCall {
  readonly retryCount?: number;
  readonly retryLimit?: number;
  readonly jobId?: string;
  readonly occasion?: string;
}

/** Absent metadata ⇒ the final attempt (FS9: "missing metadata ⇒ treat as the final attempt (send)"). */
export function isFinalFanOutAttempt(call: FanOutCall | undefined): boolean {
  if (call?.retryCount === undefined || call.retryLimit === undefined) return true;
  return call.retryCount >= call.retryLimit;
}

/** FS9 (a) — the attempt from which a WhatsApp-target member is texted (the third: `retryCount` 2). */
export const ALERT_SMS_WA_WINDOW_ATTEMPT = 2;
