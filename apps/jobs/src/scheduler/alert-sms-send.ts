// The ALERT SMS send seam — Story 5.11b (Tasks 2–3; AC2–AC4, AC6; `2026-10-25-404` FS6 (a), FS9 (a), FS17 (a), FS18 (a)).
//
// The three contribution texts `-390` Q1 B owes a member the app (and WhatsApp, where used) could not reach — day 10 "not
// recorded yet", a payment not matched, a payment still not confirmed — actually SENT, through MSG91, ONCE, in the block's
// language (the producer resolved the member's — FS5). The fan-out's SMS rung (`contribution-notify.ts`) decides lit /
// eligible (5.11's predicate, unchanged — I6) and then calls THIS, injected on its deps (F2: the fan-out stays DB-free).
//
// ⭐ THE ORDER (the story header's — every step below assumes it):
//   1. PREPARE (`prepareDltSms` — the claim core's checks, split by FS17): the template id (a per-process memo — 5 min for found
//      AND not-found, ⛔ a transient), the gateway, MG4, the render through the REAL `t()`, MG3, the pre-flight (FAIL OPEN — G15:
//      a PROVEN fault refuses; an unproven one is SENT with a warning), the messaging probe. A refusal writes ⛔ row, ⛔ dispatch,
//      ⛔ audit line, and raises ONE alarm per (config key, detail) per memo window — ⛔ one per member (T9).
//   2. LOOKUP, read-only (FS6 step 1): `accepted` ⇒ `sent` with ⛔ send; a final ⇒ terminal; in flight ⇒ retry; a stale lease ⇒
//      `error` / `exhausted:outcome_unknown`, ⛔ re-send, ALARM; `deferred` (young) / none ⇒ on; a `deferred` row older than 30 min
//      is GIVEN UP `exhausted:rate_limited:expired` (decision C1-D1 (b): a later job would send it STALE) and reads terminal.
//   3. THE WINDOW (FS9 (a)): a member with a WhatsApp target whose WhatsApp did not end `sent` is texted only from the THIRD
//      attempt (or on the final one) — before that `sms_awaiting_wa_window`, retried (push and WhatsApp re-run: that IS §3.4's
//      window, G2 (i)). ⛔ Budget, ⛔ row consumed by waiting.
//   4. DISPATCH (FS18 (a)) — the lifecycle-suppression boundary, the rendered HMAC and the `alert.channel_send` line, for REAL
//      sends only — with a ONE-SEND provider whose `send` runs BEGIN (one `withPariwarScope` tx, committed BEFORE the gateway
//      call — ⛔ connection held across it), the gateway call (`sendPreparedDltSms`, CRQID kind `as`), and FINALISE (the CAS on
//      the attempt's claim token). BEGIN inside dispatch ⇒ a SUPPRESSED member gets ⛔ row. The rung reads the CORE's result by
//      closure (dispatch's `rejected` loses `transient` vs `final` — T6; an HMAC throw after an accept is `error` in dispatch and
//      `accepted` in the row).
// ⭐ AT MOST ONCE (I1): only `rate_limited:*` (the gateway DEFINITELY did not take it) leaves the row `deferred` for a re-send;
// every `api_unavailable:*` (a timeout, `body_read`, a transport failure, a 5xx) and `unknown:*` is FINAL
// `exhausted:outcome_unknown:<code>` + ALARM (G14 — the member keeps the in-app notice, R10(B)).
// ⭐ THE SEAM NEVER THROWS (F3): a throwing rung would silently end the member `in_app_only` (⛔ text, ⛔ retry, ⛔ alarm) — every
// failure is mapped to a named detail (`alert-sms-details.ts`) and, where it is no member's fault, alarmed.
// PII: the number is only ever on the provider's target; ⛔ in a log, an alarm, a row or the trail.

import type { Alert, AlertSmsBlock } from '@twt/contracts';
import {
  dispatch,
  type AuditPort,
  type Channel,
  type ChannelProvider,
  type ChannelSendOutcome,
  type LifecycleSuppressionHook,
  type RenderedMessageHash,
  type SendResult,
  type SendTarget,
  type SmsAppClient,
} from '@twt/channels';
import { schema, smsDelivery, withPariwarScope } from '@twt/domain';
import { randomUUID } from 'node:crypto';
import type pg from 'pg';

import { ALERT_SMS_RUNG_DETAIL, ALERT_SMS_WA_WINDOW_ATTEMPT, isFinalFanOutAttempt, type FanOutCall } from './alert-sms-details.js';
import {
  prepareDltSms,
  sendPreparedDltSms,
  type ClaimCorrectionSmsResult,
  type ClaimDltSmsPreflight,
  type PreparedDltSms,
} from './claim-dlt-sms-send.js';
import { CONTRIBUTION_SMS_TEMPLATES, renderContributionSms } from './contribution-sms-templates.js';

/** FS17 — the template ids are re-read at most this often (found AND not-found; ⛔ a transient). An id set by ops is seen within it. */
export const ALERT_SMS_TEMPLATE_ID_TTL_MS = 5 * 60_000;

/**
 * FS6 step 4 — a finalise that THROWS after the gateway answered is retried after each of these pauses (review 2026-10-25, C2-P3: a
 * sub-second DB outage must not defeat every try by running them back to back), then alarmed. The 2-minute lease must exceed the send
 * timeout + (pauses + 1) × the pool's connect timeout + the sum of these — `alert-sms-send.test.ts` pins it (C2-P4).
 */
export const ALERT_SMS_FINALISE_BACKOFF_MS: readonly number[] = [200, 1000];

/** What an alarm says when a config refusal blocks the text for every member (the default of {@link alarmRefusalOnce}). */
const NO_TEXT_UNTIL_FIXED = 'no text is sent to any member until it is fixed (roster Row 40 (a) / Row 32)';
/** A value that does not fit its registered slot refuses the text for THAT member / pool only (a long name, an amount). */
const THIS_MEMBER_ONLY = 'this member / pool\'s text was refused for a value that does not fit its registered slot; other members are unaffected (roster Row 32)';
/** A mismatch between the values and the registered text is the catalogue drifting (every member of this message × locale) — or one bad block. */
const DRIFT_OR_ONE_BLOCK =
  'the values do not match the registered text — every member of this message × locale if the catalogue drifted, or only this one block (roster Row 32)';

/**
 * The alarms that mean the ACCOUNT or the CLIENT refuses every member alike — one gateway client per process, so ONE alarm per memo window
 * across all members AND Pariwars (review C2-P8). Built from the rung vocabulary, ⛔ hand-typed strings that could drift from `settle()`.
 * A `dlt_template_not_approved` refusal is NOT in this set: it is per TEMPLATE (six config keys), so it dedupes on that key instead.
 */
const PROCESS_WIDE_ALARMS: ReadonlySet<string> = new Set([ALERT_SMS_RUNG_DETAIL.gatewayAuth, ALERT_SMS_RUNG_DETAIL.messagingUnavailable]);

/**
 * The occasions a text may be owed on — the DOMAIN's own list (0184's CHECK is its boundary; the producer builds the scope from a raw
 * payload string). Review 2026-10-25 (C2-P5): ⛔ a second hand-typed copy — a test pins the matcher's reasons and the producers to it.
 */
const OCCASIONS: ReadonlySet<string> = new Set<string>(schema.ALERT_SMS_SEND_OCCASIONS);
const isKnownOccasion = (o: string | undefined): o is smsDelivery.AlertSmsSendKey['occasion'] => o !== undefined && OCCASIONS.has(o);

/** The CLASS of a thrown error — a SQLSTATE / Node error code, else the error's name; ⛔ its message (it can carry a value). */
function faultClass(err: unknown): string {
  const code = (err as { code?: unknown } | null | undefined)?.code;
  if (typeof code === 'string' && /^[A-Z0-9_]{3,24}$/.test(code)) return `code:${code}`;
  return err instanceof Error ? err.name : typeof err;
}

/** What the seam needs — the gateway, the config, the pre-flight (FS19: built in boot), the service pool. */
export interface AlertSmsSeamDeps {
  /** BYPASSRLS service pool — the send record's `withPariwarScope` transactions (⛔ held across the gateway call). */
  readonly pool: pg.Pool;
  readonly smsAppClient: SmsAppClient;
  /** The Secret Manager read (`resolveSmsDltConfig` in production). */
  readonly resolveConfig: (configKey: string) => Promise<string | null>;
  /** MG5 — the ONE process pre-flight memo (absent ⇒ ⛔ pre-flight). */
  readonly smsPreflight?: ClaimDltSmsPreflight;
  /** Override the send timeout (tests). */
  readonly sendTimeoutMs?: number;
  /** The alarm sink (default `console.warn`) — ids, keys and classes only, ⛔ a number. */
  readonly onAlarm?: (message: string) => void;
  /** The memos' clock (tests). */
  readonly nowMs?: () => number;
  /** The pauses between finalise tries (tests pass `[0, 0]`); default {@link ALERT_SMS_FINALISE_BACKOFF_MS}. */
  readonly finaliseBackoffMs?: readonly number[];
}

/** What the fan-out's dispatch carries, so the SMS send goes through the SAME boundary as push and WhatsApp (FS18). */
export interface AlertSmsDispatchDeps {
  readonly providers?: Readonly<Record<Channel, readonly ChannelProvider[]>>;
  readonly hashRendered: RenderedMessageHash;
  readonly audit: AuditPort;
  readonly suppression?: LifecycleSuppressionHook;
}

/** One lit, eligible member's SMS rung. */
export interface AlertSmsRungInput {
  readonly alert: Alert;
  readonly block: AlertSmsBlock;
  /** The member's SMS target (`resolveSmsTarget`) — E.164, ⛔ logged. */
  readonly target: SendTarget;
  readonly call?: FanOutCall;
  /** FS9 — the member has a WhatsApp target (the Pariwar uses WhatsApp; FS3's refusal included) and that rung did not end `sent`. */
  readonly whatsappTried: boolean;
  readonly dispatch: AlertSmsDispatchDeps;
}

/** The seam as the fan-out holds it. NEVER rejects. */
export type AlertSmsSender = (input: AlertSmsRungInput) => Promise<ChannelSendOutcome>;

/** A memo of one async read, per key: a found value AND `null` (not provisioned) are kept for `ttlMs`; a throw is ⛔ kept. */
export function createTtlMemo<T>(
  read: (key: string) => Promise<T>,
  opts: { readonly ttlMs: number; readonly nowMs?: () => number },
): (key: string) => Promise<T> {
  const nowMs = opts.nowMs ?? Date.now;
  const entries = new Map<string, { readonly at: number; readonly value: Promise<T> }>();
  return (key) => {
    const hit = entries.get(key);
    if (hit !== undefined && nowMs() - hit.at < opts.ttlMs) return hit.value;
    const value = read(key);
    entries.set(key, { at: nowMs(), value });
    // A rejected read is dropped at once — the next caller reads again (a transient is ⛔ memoized).
    value.catch(() => {
      if (entries.get(key)?.value === value) entries.delete(key);
    });
    return value;
  };
}

const outcome = (o: ChannelSendOutcome['outcome'], detail?: string): ChannelSendOutcome => (detail === undefined ? { outcome: o } : { outcome: o, detail });

/**
 * Prepare's refusal detail → the ONE recorded literal (the seam appends the locale to a missing id — the claim tests assert the bare one).
 * @internal exported for `alert-sms-send.test.ts` only — the unknown-code fallback is not reachable through a real prepare.
 */
export function refusalRungDetail(detail: string, locale: AlertSmsBlock['locale']): string {
  if (detail === 'config:dlt_template_id_missing') {
    return locale === 'en' ? ALERT_SMS_RUNG_DETAIL.templateIdMissingEn : ALERT_SMS_RUNG_DETAIL.templateIdMissingHi;
  }
  if (detail.startsWith('config:secret_manager_')) return ALERT_SMS_RUNG_DETAIL.secretManagerFault;
  const known: readonly string[] = [
    ALERT_SMS_RUNG_DETAIL.templateIdMalformed,
    ALERT_SMS_RUNG_DETAIL.gatewayUnconfigured,
    ALERT_SMS_RUNG_DETAIL.messagingUnavailable,
    ALERT_SMS_RUNG_DETAIL.valuesMismatch,
    ALERT_SMS_RUNG_DETAIL.valueTooLong,
    ALERT_SMS_RUNG_DETAIL.preflightAuth,
  ];
  // An unknown prepare refusal: nothing was attempted — ⛔ `exhausted:outcome_unknown` ("the gateway MAY have taken it"; review C2-P14).
  return known.includes(detail) ? detail : ALERT_SMS_RUNG_DETAIL.notAttempted;
}

/** A gateway `<class>:<code>` the row may keep (0184's grammar), else the bare outcome-unknown word. */
function rowDetail(detail: string): string {
  return smsDelivery.isAlertSmsSendDetail(detail) ? detail : 'exhausted:outcome_unknown';
}

/** What the send record and the rung become for ONE gateway answer (the core's result). */
export interface Settlement {
  readonly row:
    | { readonly outcome: 'accepted'; readonly detail: null; readonly providerMessageId: string }
    | { readonly outcome: 'deferred' | 'rejected_invalid_number' | 'rejected_unreachable' | 'error'; readonly detail: string };
  readonly rung: ChannelSendOutcome;
  /** A permanent fault that needs a person (the class only). */
  readonly alarm?: string;
}

/**
 * ⭐ FS6 step 4 / FS9 — the core's answer → the row and the rung. Only `rate_limited` is re-sendable (and ⛔ on the final attempt).
 * @internal exported for `alert-sms-send.test.ts` only — two of its branches are not reachable through a real client.
 */
export function settle(core: ClaimCorrectionSmsResult, final: boolean): Settlement {
  if (core.kind === 'transient') {
    const cls = core.detail.split(':')[0];
    if (cls === 'rate_limited') {
      if (final) {
        return { row: { outcome: 'error', detail: rowDetail(`exhausted:${core.detail}`) }, rung: outcome('rejected', ALERT_SMS_RUNG_DETAIL.rateLimited) };
      }
      const detail = rowDetail(core.detail);
      // `deferred` is the ONE re-sendable state: only a `rate_limited:<code>` word may put a row there (the domain refuses the rest).
      // An unreachable grammar fallback therefore degrades to FINAL — at-most-once is never traded for a re-send. The gateway DEFINITELY
      // did not take it (it answered `rate_limited`), so the word is the rate-limited FINAL one, ⛔ `outcome_unknown` ("may have taken it").
      if (detail.startsWith('rate_limited:')) {
        return { row: { outcome: 'deferred', detail }, rung: outcome('rejected', ALERT_SMS_RUNG_DETAIL.rateLimited) };
      }
      return {
        row: { outcome: 'error', detail: 'exhausted:rate_limited:code_unrecorded' },
        rung: outcome('rejected', ALERT_SMS_RUNG_DETAIL.rateLimitedFinal),
        alarm: 'exhausted:rate_limited:code_unrecorded',
      };
    }
    // `api_unavailable:*` (incl. the 10 s timeout): the gateway MAY have taken it ⇒ FINAL, ⛔ re-sent (G14).
    return {
      row: { outcome: 'error', detail: rowDetail(`exhausted:outcome_unknown:${core.detail}`) },
      rung: outcome('error', ALERT_SMS_RUNG_DETAIL.outcomeUnknown),
      alarm: 'exhausted:outcome_unknown:api_unavailable',
    };
  }
  if (core.outcome === 'accepted') {
    if (core.providerMessageId !== null) {
      return { row: { outcome: 'accepted', detail: null, providerMessageId: core.providerMessageId }, rung: outcome('sent') };
    }
    // An accept with ⛔ request id cannot be matched by its report — recorded as unknown (the client refuses this already).
    return {
      row: { outcome: 'error', detail: 'exhausted:outcome_unknown:unknown:no_request_id' },
      rung: outcome('error', ALERT_SMS_RUNG_DETAIL.outcomeUnknown),
      alarm: 'exhausted:outcome_unknown:unknown',
    };
  }
  if (core.outcome === 'rejected_invalid_number') {
    return { row: { outcome: 'rejected_invalid_number', detail: rowDetail(core.detail) }, rung: outcome('rejected', ALERT_SMS_RUNG_DETAIL.rejectedInvalidNumber) };
  }
  if (core.outcome === 'rejected_unreachable') {
    return { row: { outcome: 'rejected_unreachable', detail: rowDetail(core.detail) }, rung: outcome('rejected', ALERT_SMS_RUNG_DETAIL.rejectedUnreachable) };
  }
  const cls = core.detail.split(':')[0];
  if (cls === 'auth') {
    return { row: { outcome: 'error', detail: rowDetail(core.detail) }, rung: outcome('rejected', ALERT_SMS_RUNG_DETAIL.gatewayAuth), alarm: ALERT_SMS_RUNG_DETAIL.gatewayAuth };
  }
  if (cls === 'dlt_template_not_approved') {
    return {
      row: { outcome: 'error', detail: rowDetail(core.detail) },
      rung: outcome('rejected', ALERT_SMS_RUNG_DETAIL.gatewayTemplate),
      alarm: ALERT_SMS_RUNG_DETAIL.gatewayTemplate,
    };
  }
  if (core.detail === ALERT_SMS_RUNG_DETAIL.messagingUnavailable) {
    return {
      row: { outcome: 'error', detail: ALERT_SMS_RUNG_DETAIL.messagingUnavailable },
      rung: outcome('error', ALERT_SMS_RUNG_DETAIL.messagingUnavailable),
      alarm: ALERT_SMS_RUNG_DETAIL.messagingUnavailable,
    };
  }
  // `unknown:*` (and anything unclassified): it may have been taken ⇒ outcome unknown.
  return {
    row: { outcome: 'error', detail: rowDetail(`exhausted:outcome_unknown:${core.detail}`) },
    rung: outcome('error', ALERT_SMS_RUNG_DETAIL.outcomeUnknown),
    alarm: 'exhausted:outcome_unknown:unknown',
  };
}

/** A FINAL row found by the lookup → the rung (⛔ alarm: it was alarmed when it was finalised). */
function foundFinalRung(found: { readonly outcome: string; readonly detail: string | null }): ChannelSendOutcome {
  if (found.outcome === 'rejected_invalid_number') return outcome('rejected', ALERT_SMS_RUNG_DETAIL.rejectedInvalidNumber);
  if (found.outcome === 'rejected_unreachable') return outcome('rejected', ALERT_SMS_RUNG_DETAIL.rejectedUnreachable);
  const cls = found.detail?.split(':')[0];
  if (cls === 'auth') return outcome('rejected', ALERT_SMS_RUNG_DETAIL.gatewayAuth);
  if (cls === 'dlt_template_not_approved') return outcome('rejected', ALERT_SMS_RUNG_DETAIL.gatewayTemplate);
  if (found.detail === ALERT_SMS_RUNG_DETAIL.messagingUnavailable) return outcome('error', ALERT_SMS_RUNG_DETAIL.messagingUnavailable);
  // Review C2-P1: a FROZEN row is terminal — ⛔ the retryable word `rate_limited` (it put the member back on the retry set). Two gives-up
  // share the word: the gateway's own answer (`exhausted:rate_limited:*`) and the Secret Manager outage on the final attempt
  // (`exhausted:config_unavailable:secret_manager` — review patch-diff: the gateway never took either, so ⛔ "may have taken it").
  if (found.detail?.startsWith('exhausted:rate_limited') || found.detail === `exhausted:${ALERT_SMS_RUNG_DETAIL.configUnavailable}`) {
    return outcome('rejected', ALERT_SMS_RUNG_DETAIL.rateLimitedFinal);
  }
  return outcome('error', ALERT_SMS_RUNG_DETAIL.outcomeUnknown);
}

/** Thrown by the one-send provider when begin did ⛔ give this attempt the row — dispatch records `error`, ⛔ `alert.channel_send`. */
class AlertSmsNotBegun extends Error {}

/** Build the seam (one per jobs process — boot.ts; the memos live as long as it does). */
export function createAlertSmsSender(deps: AlertSmsSeamDeps): AlertSmsSender {
  const nowMs = deps.nowMs ?? Date.now;
  const alarmSink = deps.onAlarm ?? ((m: string): void => console.warn(m));
  const templateId = createTtlMemo(deps.resolveConfig, { ttlMs: ALERT_SMS_TEMPLATE_ID_TTL_MS, nowMs });
  /**
   * T9 — a refusal alarms ONCE per (key, detail) per memo window, ⛔ per member. `where` names the FIRST one seen (the alarm is the only
   * place ops learns which Pariwar / alert tripped it). The sink is called BEFORE the window is armed: a sink that throws must not
   * swallow the next member's alarm for five minutes.
   */
  const refusalAlarmedAt = new Map<string, number>();
  const alarmRefusalOnce = (configKey: string, detail: string, where: string, consequence: string = NO_TEXT_UNTIL_FIXED): void => {
    const key = `${configKey}\0${detail}`;
    const at = refusalAlarmedAt.get(key);
    if (at !== undefined && nowMs() - at < ALERT_SMS_TEMPLATE_ID_TTL_MS) return;
    alarmSink(`[jobs] alert-sms: ${detail} for ${configKey} — ${consequence} (first seen: ${where}; not repeated for ${String(ALERT_SMS_TEMPLATE_ID_TTL_MS / 60_000)} min)`);
    refusalAlarmedAt.set(key, nowMs());
  };

  return async (input) => {
    const { alert, block } = input;
    const final = isFinalFanOutAttempt(input.call);
    const pariwarId = alert.pariwar_id;
    const where = `pariwar ${pariwarId} alert ${alert.alert_id}`;
    const alarm = (what: string): void => alarmSink(`[jobs] alert-sms: ${what} — ${where}`);
    // Review C2-P9: the CLASS of the last fault (a SQLSTATE / error name — ⛔ its message) rides on the alarm, so a deterministic CHECK / FK
    // fault is distinguishable from a blip.
    let lastFault = 'none';
    const noteFault = (err: unknown): void => {
      lastFault = faultClass(err);
    };
    // Review C2-P10: declared BEFORE the try so the outer catch can see an answer the gateway already gave.
    let state: { kind: 'taken' } | { kind: 'begin_failed' } | { kind: 'crashed' } | { kind: 'answered'; settlement: Settlement } | undefined;
    try {
      const occasion = input.call?.occasion;
      if (!isKnownOccasion(occasion)) {
        // A code bug (a lit block on an unknown occasion) — the CHECK would refuse the row; ⛔ retried for ever. Nothing was attempted.
        alarm(`a lit text with ⛔ known occasion (${occasion === undefined ? 'none' : 'unlisted'}) — ⛔ sent`);
        return outcome('skipped_no_target', ALERT_SMS_RUNG_DETAIL.notAttempted);
      }
      const template = CONTRIBUTION_SMS_TEMPLATES[block.message][block.locale];
      const key = { pariwarId, alertId: alert.alert_id, memberId: alert.member_id, occasion };

      // ── 1. PREPARE (FS17) — ⛔ row, ⛔ dispatch on a refusal ──
      let prepared: PreparedDltSms;
      let renderThrew = false;
      try {
        const prep = await prepareDltSms(deps, {
          dltTemplateIdConfigKey: template.dltTemplateIdConfigKey,
          template: { text: template.registeredText, slots: template.slots },
          render: () => {
            try {
              return renderContributionSms(block.message, block.locale, block.values);
            } catch (err) {
              renderThrew = true;
              throw err;
            }
          },
          values: () => block.values,
          preflightFailOpen: true,
          resolveTemplateId: templateId,
        });
        if (prep.kind === 'transient') {
          if (final) {
            await giveUpDeferred(key, `exhausted:${ALERT_SMS_RUNG_DETAIL.configUnavailable}`);
            // Review C2-P6: the Secret Manager stayed down through EVERY attempt — this member's text is dropped for good, and the
            // header promises an alarm wherever that is no member's fault. ONE per memo window, ⛔ one per member.
            alarmRefusalOnce(
              template.dltTemplateIdConfigKey,
              'the Secret Manager stayed unavailable through the FINAL attempt',
              where,
              'the text for each member reached on its final attempt is DROPPED (roster Row 32)',
            );
          }
          return outcome('skipped_no_target', ALERT_SMS_RUNG_DETAIL.configUnavailable);
        }
        if (prep.kind !== 'prepared') {
          const detail = refusalRungDetail(prep.detail, block.locale);
          // Review C2-P7 + patch-diff: a value refusal is NOT "no text goes to any member" — a too-long value is one member's / pool's data
          // fault, a mismatch is the catalogue drifting (every member of the message × locale) OR one bad block. The wording says which.
          const consequence =
            detail === ALERT_SMS_RUNG_DETAIL.valueTooLong
              ? THIS_MEMBER_ONLY
              : detail === ALERT_SMS_RUNG_DETAIL.valuesMismatch
                ? DRIFT_OR_ONE_BLOCK
                : NO_TEXT_UNTIL_FIXED;
          alarmRefusalOnce(template.dltTemplateIdConfigKey, detail, where, consequence);
          return outcome('skipped_no_target', detail);
        }
        prepared = prep.prepared;
      } catch (err) {
        noteFault(err);
        if (renderThrew) {
          // A render that THROWS (a missing value — `-394` item 3's residual): terminal, ALARMED (⛔ silent, ⛔ retried). AC4 lists a
          // render failure under `exhausted:outcome_unknown`, so it keeps that word.
          alarm('the text could not be rendered (exhausted:outcome_unknown)');
          return outcome('error', ALERT_SMS_RUNG_DETAIL.outcomeUnknown);
        }
        // Review C2-P14: any OTHER throw in prepare (the template-id read, the gateway probe, the pre-flight memo) — nothing was attempted,
        // so ⛔ "the gateway MAY have taken it".
        alarm(`the prepare step threw (${ALERT_SMS_RUNG_DETAIL.notAttempted}) [${lastFault}]`);
        return outcome('error', ALERT_SMS_RUNG_DETAIL.notAttempted);
      }
      if (prepared.preflightWarning !== undefined) {
        alarmRefusalOnce(
          template.dltTemplateIdConfigKey,
          `SENT despite the pre-flight (${prepared.preflightWarning})`,
          where,
          'the text WAS sent — the pre-flight is unproven (fail open); a PROVEN fault would have refused it (roster Row 32)',
        );
      }

      // ── 2. LOOKUP, read-only (FS6 step 1) ──
      const found = await lookupOr(key);
      if (found === null) return stateUnavailable();
      const settledByFound = await settleFound(found, key);
      if (settledByFound !== null) return settledByFound;

      // ── 3. THE WINDOW (FS9 (a)) — before the third attempt a WhatsApp-tried member waits ──
      if (input.whatsappTried && !final && (input.call?.retryCount ?? 0) < ALERT_SMS_WA_WINDOW_ATTEMPT) {
        return outcome('skipped_no_target', ALERT_SMS_RUNG_DETAIL.awaitingWaWindow);
      }

      // ── 4. DISPATCH with the one-send provider (FS18) ──
      const claimToken =
        input.call?.jobId !== undefined && input.call.retryCount !== undefined ? `${input.call.jobId}:${String(input.call.retryCount)}` : randomUUID();
      const oneSend: ChannelProvider = {
        id: 'sms-dlt',
        channel: 'sms',
        scope: 'global',
        // ⚠ This provider's `send` WRITES the send record (begin, then finalise) — it exists only for one text, inside dispatch.
        async send(_rendered, target): Promise<SendResult> {
          let begun: smsDelivery.BeginAlertSmsSendResult;
          try {
            begun = await withPariwarScope(deps.pool, pariwarId, (_db, client) =>
              smsDelivery.beginAlertSmsSend(client, { ...key, message: block.message, locale: block.locale, claimToken }),
            );
          } catch (err) {
            noteFault(err);
            state = { kind: 'begin_failed' };
            throw new AlertSmsNotBegun('begin failed');
          }
          if (begun.kind === 'taken') {
            state = { kind: 'taken' };
            throw new AlertSmsNotBegun('taken');
          }
          let core: ClaimCorrectionSmsResult;
          try {
            core = await sendPreparedDltSms(deps, prepared, { e164: target.address, correlation: { kind: 'as', rowId: begun.sendId } });
          } catch (err) {
            // A malformed CRQID — a code bug, BEFORE the gateway call (DR3's crash rule): the row stays `attempting` and the
            // lease rule ends it.
            state = { kind: 'crashed' };
            throw err;
          }
          const settlement = settle(core, final);
          state = { kind: 'answered', settlement };
          await finalise(begun.sendId, claimToken, settlement);
          return settlement.row.outcome === 'accepted'
            ? { channel: 'sms', provider: 'sms-dlt', status: 'accepted', providerMessageId: settlement.row.providerMessageId }
            : { channel: 'sms', provider: 'sms-dlt', status: 'rejected', providerMessageId: null, detail: settlement.row.detail };
        },
        getStatus: (messageId) => Promise.resolve({ providerMessageId: messageId, state: 'unknown' }),
      };
      const registry = input.dispatch.providers;
      const outcomeOf = await dispatch(alert, {
        ...(registry ? { providers: { ...registry, sms: [oneSend] } } : { providers: { push: [], whatsapp: [], sms: [oneSend], telegram: [] } }),
        resolveDelivery: () => Promise.resolve({ sms: input.target }),
        render: (_a, channel) => ({ channel, title: null, body: prepared.body, deepLink: null }),
        hashRendered: input.dispatch.hashRendered,
        audit: input.dispatch.audit,
        ...(input.dispatch.suppression ? { suppression: input.dispatch.suppression } : {}),
      });
      const after = state as typeof state;
      if (after === undefined) {
        // The provider was ⛔ called: suppressed (the lifecycle boundary — I4) or otherwise skipped. ⛔ row was written.
        const attempt = outcomeOf.attempts.find((a) => a.channel === 'sms');
        return outcome(attempt?.outcome ?? 'error');
      }
      if (after.kind === 'taken') {
        // Another attempt began it between the lookup and begin — read it as found (FS6 step 2).
        const again = await lookupOr(key);
        if (again === null) return stateUnavailable();
        return (await settleFound(again, key)) ?? outcome('skipped_no_target', ALERT_SMS_RUNG_DETAIL.inFlight);
      }
      if (after.kind === 'begin_failed') return stateUnavailable();
      if (after.kind === 'crashed') {
        alarm('the send crashed before the gateway call (a bad CRQID) — the row is left to its lease');
        return outcome('error', ALERT_SMS_RUNG_DETAIL.stateUnavailable);
      }
      if (after.settlement.alarm !== undefined) {
        // Review C2-P8: a refusal the ACCOUNT or the CLIENT gives is the same for every member this run reaches — ONE alarm per memo window
        // (key `gateway`). A template refusal is the same for every member of THAT template — one per template config key (patch-diff:
        // a single `gateway` key let one template's alarm hide another's). A per-send fault (an unknown outcome) is still alarmed per send:
        // each is a text that may be lost.
        if (PROCESS_WIDE_ALARMS.has(after.settlement.alarm)) {
          alarmRefusalOnce('gateway', after.settlement.alarm, where, 'every member this run reaches gets the same refusal until it is fixed (roster Row 40 (a) / Row 32)');
        } else if (after.settlement.alarm === ALERT_SMS_RUNG_DETAIL.gatewayTemplate) {
          alarmRefusalOnce(
            template.dltTemplateIdConfigKey,
            after.settlement.alarm,
            where,
            'every member of this template gets the same refusal until it is fixed (roster Row 40 (a) / Row 32)',
          );
        } else {
          alarm(`the gateway's answer needs a person (${after.settlement.alarm})`);
        }
      }
      return after.settlement.rung;
    } catch (err) {
      noteFault(err);
      // Review C2-P10: a fault AFTER the gateway answered (only a throwing alarm sink can reach here today) must not throw the ANSWER away
      // — the text went; reporting `sms_send_state_unavailable` would put the member back on the retry set for a text already sent.
      // ⚠ The alarm here is guarded: if the SINK is what faulted (the only way to reach this catch after an answer), alarming again would
      // throw out of the seam — and the seam NEVER throws (F3).
      const alarmSafely = (what: string): void => {
        try {
          alarm(what);
        } catch {
          // the sink itself is down — nothing left to tell
        }
      };
      const answered = state as typeof state;
      if (answered?.kind === 'answered') {
        alarmSafely(`a fault after the gateway answered [${lastFault}] — the answer stands`);
        return answered.settlement.rung;
      }
      // ⭐ NEVER throw (F3) — an unexpected fault is retryable and ALARMED.
      alarmSafely(`the send state was unavailable (${ALERT_SMS_RUNG_DETAIL.stateUnavailable}) [${lastFault}]`);
      return outcome('error', ALERT_SMS_RUNG_DETAIL.stateUnavailable);
    }

    // ── helpers (closures over the call) ──
    function stateUnavailable(): ChannelSendOutcome {
      alarm(`the send record could not be read or begun (${ALERT_SMS_RUNG_DETAIL.stateUnavailable}) [${lastFault}]`);
      return outcome('error', ALERT_SMS_RUNG_DETAIL.stateUnavailable);
    }

    async function lookupOr(key: smsDelivery.AlertSmsSendKey): Promise<smsDelivery.AlertSmsSendLookup | null> {
      try {
        return await withPariwarScope(deps.pool, pariwarId, (_db, client) => smsDelivery.lookupAlertSmsSend(client, key));
      } catch (err) {
        noteFault(err);
        return null;
      }
    }

    /** A found row that decides the rung WITHOUT a send — or `null` (none / deferred: go on). */
    async function settleFound(found: smsDelivery.AlertSmsSendLookup, key: smsDelivery.AlertSmsSendKey): Promise<ChannelSendOutcome | null> {
      switch (found.kind) {
        case 'none':
        case 'deferred':
          return null;
        case 'accepted':
          return outcome('sent');
        case 'final':
          return foundFinalRung(found);
        case 'in_flight':
          return outcome('skipped_no_target', ALERT_SMS_RUNG_DETAIL.inFlight);
        case 'deferred_expired': {
          // Code-review decision C1-D1 (b): a `rate_limited` row older than the retry window is a text a later job would send STALE (a sweep
          // re-enqueue, a lost job's redelivery). Give it up FINAL — the gateway DEFINITELY never took it — and report the terminal rung.
          let gaveUp: boolean;
          try {
            gaveUp = await withPariwarScope(deps.pool, pariwarId, (_db, client) =>
              smsDelivery.giveUpDeferredAlertSmsSend(client, { pariwarId, sendId: found.sendId, detail: 'exhausted:rate_limited:expired' }),
            );
          } catch (err) {
            noteFault(err);
            return stateUnavailable();
          }
          if (!gaveUp) {
            // The row moved on between the lookup and here (re-claimed or finished): report its CURRENT truth.
            const again = await lookupOr(key);
            if (again === null) return stateUnavailable();
            if (again.kind !== 'deferred_expired') return settleFound(again, key);
          } else {
            // The 30-minute bound DROPPED a text — the gateway never took it and nothing will send it. Alarmed (once per memo window; the
            // count is every `alert_sms_sends` row with this detail), ⛔ silent: the member simply never gets that SMS.
            alarmRefusalOnce(
              'deferred_expired',
              'exhausted:rate_limited:expired',
              where,
              'a rate-limited text not reached within 30 minutes is never sent — the member gets no SMS for it (roster Row 40; `alert_sms_sends.detail` counts them)',
            );
          }
          return outcome('rejected', ALERT_SMS_RUNG_DETAIL.rateLimitedFinal);
        }
        case 'stale': {
          // A crash between begin and finalise — the gateway MAY have accepted ⇒ FINAL, ⛔ re-sent (G14).
          let moved: boolean;
          try {
            moved = await withPariwarScope(deps.pool, pariwarId, (_db, client) =>
              smsDelivery.finaliseStaleAlertSmsSend(client, { pariwarId, sendId: found.sendId }),
            );
          } catch (err) {
            noteFault(err);
            return stateUnavailable();
          }
          if (!moved) {
            // Review C2-P2: `false` = the row moved on between the lookup and here (its OWN attempt finalised it). Report the ROW's truth —
            // ⛔ alarm "outcome unknown" over a text the row says was accepted. `none` / `deferred` mean "go on" (the row is re-sendable).
            const again = await lookupOr(key);
            if (again === null) return stateUnavailable();
            if (again.kind !== 'stale') return settleFound(again, key);
          }
          alarm(`send ${found.sendId}: a send left in flight past its lease is recorded ${ALERT_SMS_RUNG_DETAIL.outcomeUnknown} — ⛔ re-sent`);
          return outcome('error', ALERT_SMS_RUNG_DETAIL.outcomeUnknown);
        }
      }
    }

    /** FS9 — on the FINAL attempt a `deferred` row is given up (⛔ left for a later re-enqueue to send stale). Best-effort. */
    async function giveUpDeferred(key: smsDelivery.AlertSmsSendKey, detail: string): Promise<void> {
      const found = await lookupOr(key);
      if (found?.kind !== 'deferred' && found?.kind !== 'deferred_expired') return;
      try {
        await withPariwarScope(deps.pool, pariwarId, (_db, client) =>
          smsDelivery.giveUpDeferredAlertSmsSend(client, { pariwarId, sendId: found.sendId, detail }),
        );
      } catch {
        alarm('a deferred send could not be given up on the final attempt');
      }
    }

    /**
     * FS6 step 4 — the CAS on the claim token; a THROW is retried after each backoff pause (C2-P3), then ALARMED with the send id so ops can
     * reconcile (the rung still returns the gateway's truth). A `false` is NOT retried: the row moved on (C2-P2).
     */
    async function finalise(sendId: string, token: string, settlement: Settlement): Promise<void> {
      const pauses = deps.finaliseBackoffMs ?? ALERT_SMS_FINALISE_BACKOFF_MS;
      // The gateway's request id is the ONLY handle ops has on an accepted text whose row never took the write (the report keys on it).
      const requestId = settlement.row.outcome === 'accepted' ? ` (gateway request ${settlement.row.providerMessageId})` : '';
      let threw = false;
      for (let i = 0; i <= pauses.length; i += 1) {
        let wrote: boolean;
        try {
          wrote = await withPariwarScope(deps.pool, pariwarId, (_db, client) =>
            smsDelivery.finaliseAlertSmsSend(client, {
              pariwarId,
              sendId,
              claimToken: token,
              outcome: settlement.row.outcome,
              detail: settlement.row.detail,
              ...(settlement.row.outcome === 'accepted' ? { providerMessageId: settlement.row.providerMessageId } : {}),
            }),
          );
        } catch (err) {
          noteFault(err);
          threw = true;
          const pause = pauses[i];
          if (pause !== undefined && pause > 0) await new Promise<void>((resolve) => setTimeout(resolve, pause));
          continue;
        }
        // Outside the `try` on purpose: the CAS has COMPLETED — a throwing alarm sink must not make this loop retry it.
        if (!wrote) {
          // `false` after an EARLIER try threw is ambiguous: that try may have COMMITTED (a connection lost after the COMMIT) and this one
          // found the row already finalised — or another attempt's stale finalise froze it. The words must not claim which.
          alarm(
            threw
              ? `send ${sendId}: a finalise try failed and a later one found the record already moved on — whether OUR write landed is unconfirmed; the gateway answered ${settlement.row.outcome}${requestId}`
              : `send ${sendId}: the answered send's record had already moved on (finalise lost) — the gateway answered ${settlement.row.outcome}${requestId}`,
          );
        }
        return;
      }
      alarm(`send ${sendId}: the send was answered but its record could not be finalised [${lastFault}] — it is left to its lease${requestId}`);
    }
  };
}
