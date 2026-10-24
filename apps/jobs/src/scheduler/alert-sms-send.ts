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
//      `error` / `exhausted:outcome_unknown`, ⛔ re-send, ALARM; `deferred` / none ⇒ on.
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
import { smsDelivery, withPariwarScope } from '@twt/domain';
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

/** A finalise that fails AFTER the gateway answered is retried this many times more, then alarmed (FS6 step 4). */
const FINALISE_RETRIES = 2;

/** The occasions a text may be owed on (0184's CHECK — the producer builds the scope from a raw payload string). */
const OCCASIONS: ReadonlySet<string> = new Set<string>([
  'day_10',
  'pending_match_escalated',
  'mismatch:wrong_pool',
  'mismatch:amount_mismatch',
  'mismatch:entry_already_claimed',
  'mismatch:sender_vpa_mismatch',
]);

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

/** Prepare's refusal detail → the ONE recorded literal (the seam appends the locale to a missing id — the claim tests assert the bare one). */
function refusalRungDetail(detail: string, locale: AlertSmsBlock['locale']): string {
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
  return known.includes(detail) ? detail : ALERT_SMS_RUNG_DETAIL.outcomeUnknown;
}

/** A gateway `<class>:<code>` the row may keep (0184's grammar), else the bare outcome-unknown word. */
function rowDetail(detail: string): string {
  return smsDelivery.isAlertSmsSendDetail(detail) ? detail : 'exhausted:outcome_unknown';
}

/** What the send record and the rung become for ONE gateway answer (the core's result). */
interface Settlement {
  readonly row:
    | { readonly outcome: 'accepted'; readonly detail: null; readonly providerMessageId: string }
    | { readonly outcome: 'deferred' | 'rejected_invalid_number' | 'rejected_unreachable' | 'error'; readonly detail: string };
  readonly rung: ChannelSendOutcome;
  /** A permanent fault that needs a person (the class only). */
  readonly alarm?: string;
}

/** ⭐ FS6 step 4 / FS9 — the core's answer → the row and the rung. Only `rate_limited` is re-sendable (and ⛔ on the final attempt). */
function settle(core: ClaimCorrectionSmsResult, final: boolean): Settlement {
  if (core.kind === 'transient') {
    const cls = core.detail.split(':')[0];
    if (cls === 'rate_limited') {
      return final
        ? { row: { outcome: 'error', detail: rowDetail(`exhausted:${core.detail}`) }, rung: outcome('rejected', ALERT_SMS_RUNG_DETAIL.rateLimited) }
        : { row: { outcome: 'deferred', detail: rowDetail(core.detail) }, rung: outcome('rejected', ALERT_SMS_RUNG_DETAIL.rateLimited) };
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
    return { row: { outcome: 'error', detail: rowDetail(core.detail) }, rung: outcome('rejected', ALERT_SMS_RUNG_DETAIL.gatewayAuth), alarm: 'auth:gateway' };
  }
  if (cls === 'dlt_template_not_approved') {
    return {
      row: { outcome: 'error', detail: rowDetail(core.detail) },
      rung: outcome('rejected', ALERT_SMS_RUNG_DETAIL.gatewayTemplate),
      alarm: 'dlt_template_not_approved:gateway',
    };
  }
  if (core.detail === 'config:sms_messaging_unavailable') {
    return {
      row: { outcome: 'error', detail: 'config:sms_messaging_unavailable' },
      rung: outcome('error', ALERT_SMS_RUNG_DETAIL.messagingUnavailable),
      alarm: 'config:sms_messaging_unavailable',
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
  if (found.detail === 'config:sms_messaging_unavailable') return outcome('error', ALERT_SMS_RUNG_DETAIL.messagingUnavailable);
  if (found.detail?.startsWith('exhausted:rate_limited')) return outcome('rejected', ALERT_SMS_RUNG_DETAIL.rateLimited);
  return outcome('error', ALERT_SMS_RUNG_DETAIL.outcomeUnknown);
}

/** Thrown by the one-send provider when begin did ⛔ give this attempt the row — dispatch records `error`, ⛔ `alert.channel_send`. */
class AlertSmsNotBegun extends Error {}

/** Build the seam (one per jobs process — boot.ts; the memos live as long as it does). */
export function createAlertSmsSender(deps: AlertSmsSeamDeps): AlertSmsSender {
  const nowMs = deps.nowMs ?? Date.now;
  const alarmSink = deps.onAlarm ?? ((m: string): void => console.warn(m));
  const templateId = createTtlMemo(deps.resolveConfig, { ttlMs: ALERT_SMS_TEMPLATE_ID_TTL_MS, nowMs });
  /** T9 — a config refusal alarms ONCE per (config key, detail) per memo window, ⛔ per member. */
  const refusalAlarmedAt = new Map<string, number>();
  const alarmRefusalOnce = (configKey: string, detail: string): void => {
    const key = `${configKey}\0${detail}`;
    const at = refusalAlarmedAt.get(key);
    if (at !== undefined && nowMs() - at < ALERT_SMS_TEMPLATE_ID_TTL_MS) return;
    refusalAlarmedAt.set(key, nowMs());
    alarmSink(`[jobs] alert-sms: ${detail} for ${configKey} — ⛔ text sent to any member until it is fixed (roster Row 40 (a) / Row 32)`);
  };

  return async (input) => {
    const { alert, block } = input;
    const final = isFinalFanOutAttempt(input.call);
    const pariwarId = alert.pariwar_id;
    const where = `pariwar ${pariwarId} alert ${alert.alert_id}`;
    const alarm = (what: string): void => alarmSink(`[jobs] alert-sms: ${what} — ${where}`);
    try {
      const occasion = input.call?.occasion;
      if (occasion === undefined || !OCCASIONS.has(occasion)) {
        // A code bug (a lit block on an unknown occasion) — the CHECK would refuse the row; ⛔ retried for ever.
        alarm(`a lit text with ⛔ known occasion (${occasion === undefined ? 'none' : 'unlisted'}) — ⛔ sent`);
        return outcome('skipped_no_target', ALERT_SMS_RUNG_DETAIL.outcomeUnknown);
      }
      const template = CONTRIBUTION_SMS_TEMPLATES[block.message][block.locale];
      const key = { pariwarId, alertId: alert.alert_id, memberId: alert.member_id, occasion: occasion as smsDelivery.AlertSmsSendKey['occasion'] };

      // ── 1. PREPARE (FS17) — ⛔ row, ⛔ dispatch on a refusal ──
      let prepared: PreparedDltSms;
      try {
        const prep = await prepareDltSms(deps, {
          dltTemplateIdConfigKey: template.dltTemplateIdConfigKey,
          template: { text: template.registeredText, slots: template.slots },
          render: () => renderContributionSms(block.message, block.locale, block.values),
          values: () => block.values,
          preflightFailOpen: true,
          resolveTemplateId: templateId,
        });
        if (prep.kind === 'transient') {
          if (final) await giveUpDeferred(key, `exhausted:${ALERT_SMS_RUNG_DETAIL.configUnavailable}`);
          return outcome('skipped_no_target', ALERT_SMS_RUNG_DETAIL.configUnavailable);
        }
        if (prep.kind !== 'prepared') {
          const detail = refusalRungDetail(prep.detail, block.locale);
          alarmRefusalOnce(template.dltTemplateIdConfigKey, detail);
          return outcome('skipped_no_target', detail);
        }
        prepared = prep.prepared;
      } catch {
        // A render that THROWS (a missing value — `-394` item 3's residual): terminal, ALARMED (⛔ silent, ⛔ retried).
        alarm('the text could not be rendered (exhausted:outcome_unknown)');
        return outcome('error', ALERT_SMS_RUNG_DETAIL.outcomeUnknown);
      }
      if (prepared.preflightWarning !== undefined) {
        alarmRefusalOnce(template.dltTemplateIdConfigKey, `SENT despite the pre-flight (${prepared.preflightWarning})`);
      }

      // ── 2. LOOKUP, read-only (FS6 step 1) ──
      const found = await lookupOr(key);
      if (found === null) return stateUnavailable();
      const settledByFound = await settleFound(found);
      if (settledByFound !== null) return settledByFound;

      // ── 3. THE WINDOW (FS9 (a)) — before the third attempt a WhatsApp-tried member waits ──
      if (input.whatsappTried && !final && (input.call?.retryCount ?? 0) < ALERT_SMS_WA_WINDOW_ATTEMPT) {
        return outcome('skipped_no_target', ALERT_SMS_RUNG_DETAIL.awaitingWaWindow);
      }

      // ── 4. DISPATCH with the one-send provider (FS18) ──
      const claimToken =
        input.call?.jobId !== undefined && input.call.retryCount !== undefined ? `${input.call.jobId}:${String(input.call.retryCount)}` : randomUUID();
      let state: { kind: 'taken' } | { kind: 'begin_failed' } | { kind: 'crashed' } | { kind: 'answered'; settlement: Settlement } | undefined;
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
          } catch {
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
        return (await settleFound(again)) ?? outcome('skipped_no_target', ALERT_SMS_RUNG_DETAIL.inFlight);
      }
      if (after.kind === 'begin_failed') return stateUnavailable();
      if (after.kind === 'crashed') {
        alarm('the send crashed before the gateway call (a bad CRQID) — the row is left to its lease');
        return outcome('error', ALERT_SMS_RUNG_DETAIL.stateUnavailable);
      }
      if (after.settlement.alarm !== undefined) alarm(`the gateway's answer needs a person (${after.settlement.alarm})`);
      return after.settlement.rung;
    } catch {
      // ⭐ NEVER throw (F3) — an unexpected fault is retryable and ALARMED.
      alarm(`the send state was unavailable (${ALERT_SMS_RUNG_DETAIL.stateUnavailable})`);
      return outcome('error', ALERT_SMS_RUNG_DETAIL.stateUnavailable);
    }

    // ── helpers (closures over the call) ──
    function stateUnavailable(): ChannelSendOutcome {
      alarm(`the send record could not be read or begun (${ALERT_SMS_RUNG_DETAIL.stateUnavailable})`);
      return outcome('error', ALERT_SMS_RUNG_DETAIL.stateUnavailable);
    }

    async function lookupOr(key: smsDelivery.AlertSmsSendKey): Promise<smsDelivery.AlertSmsSendLookup | null> {
      try {
        return await withPariwarScope(deps.pool, pariwarId, (_db, client) => smsDelivery.lookupAlertSmsSend(client, key));
      } catch {
        return null;
      }
    }

    /** A found row that decides the rung WITHOUT a send — or `null` (none / deferred: go on). */
    async function settleFound(found: smsDelivery.AlertSmsSendLookup): Promise<ChannelSendOutcome | null> {
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
        case 'stale': {
          // A crash between begin and finalise — the gateway MAY have accepted ⇒ FINAL, ⛔ re-sent (G14).
          try {
            await withPariwarScope(deps.pool, pariwarId, (_db, client) =>
              smsDelivery.finaliseStaleAlertSmsSend(client, { pariwarId, sendId: found.sendId }),
            );
          } catch {
            return stateUnavailable();
          }
          alarm(`a send left in flight past its lease is recorded ${ALERT_SMS_RUNG_DETAIL.outcomeUnknown} — ⛔ re-sent`);
          return outcome('error', ALERT_SMS_RUNG_DETAIL.outcomeUnknown);
        }
      }
    }

    /** FS9 — on the FINAL attempt a `deferred` row is given up (⛔ left for a later re-enqueue to send stale). Best-effort. */
    async function giveUpDeferred(key: smsDelivery.AlertSmsSendKey, detail: string): Promise<void> {
      const found = await lookupOr(key);
      if (found?.kind !== 'deferred') return;
      try {
        await withPariwarScope(deps.pool, pariwarId, (_db, client) =>
          smsDelivery.giveUpDeferredAlertSmsSend(client, { pariwarId, sendId: found.sendId, detail }),
        );
      } catch {
        alarm('a deferred send could not be given up on the final attempt');
      }
    }

    /** FS6 step 4 — the CAS on the claim token; retried twice, then ALARMED (the rung still returns the gateway's truth). */
    async function finalise(sendId: string, token: string, settlement: Settlement): Promise<void> {
      for (let i = 0; i <= FINALISE_RETRIES; i += 1) {
        try {
          await withPariwarScope(deps.pool, pariwarId, (_db, client) =>
            smsDelivery.finaliseAlertSmsSend(client, {
              pariwarId,
              sendId,
              claimToken: token,
              outcome: settlement.row.outcome,
              detail: settlement.row.detail,
              ...(settlement.row.outcome === 'accepted' ? { providerMessageId: settlement.row.providerMessageId } : {}),
            }),
          );
          return;
        } catch {
          // retried below
        }
      }
      alarm('the send was answered but its record could not be finalised — it is left to its lease');
    }
  };
}
