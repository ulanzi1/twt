// SMS-DLT provider — the `sms` channel (India TRAI DLT-transactional templates, PE/OE-registered sender).
// Story 5.6 (AC1, AC2): the REAL telephony-gateway implementation replacing the 5.1 stub, behind the
// UNCHANGED `ChannelProvider` port. SMS is the TERMINAL rung of `CANONICAL_CHANNEL_LADDER`
// (`push → whatsapp → sms`) — there is NO fallback below it in v1.
//
// ── Factory, not a singleton — mirrors createWhatsappBusinessProvider ──────────────────────────────────
// The frozen `send(rendered, target)` carries NO template — but the DLT template is per-alert-category. So
// this is a FACTORY: the composition layer resolves the global messaging handle (sms-app.ts) + the DLT
// template id for the alert's category (resolveDltTemplate → resolveSmsProvider) and builds a provider
// bound to them. UNLIKE WhatsApp, DLT registration is PLATFORM-GLOBAL, so `scope: 'global'` (one gateway,
// one PE/OE sender) — a per-Pariwar sender header is an explicit NON-GOAL for v1. The provider stays pure
// of DB access — it CLASSIFIES a gateway error (sms-errors.ts) and never touches Postgres.
//
// ── Named values, bound per send (Story 6.37 MG3, MG12) ───────────────────────────────────────────────
// MSG91 substitutes the template's NAMED values into its own copy of the registered text — ⛔ the finished body. The
// frozen `RenderedMessage` carries ⛔ values, so they are bound in `SmsProviderDeps` per send (the claim-text core
// builds a provider per send). A provider built WITHOUT values — the dark alert composition (TV6) — refuses locally
// `dlt_template_not_approved:no_named_values` and ⛔ calls the gateway. ⭐ Story 5.11b (MG12 superseded IN PART, `-404`):
// `values: []` is a template with NO slot (the "payment not matched" text) and IS sent — only an ABSENT `values` (the category
// composition path, `resolveSmsProviderDeps`) stays refused. The provider NEVER mutates the render output.
// The send's correlation id (6.37b DR3 — MSG91's `CRQID`) is bound the same way and only COPIED: the claim-text core
// validates it before it builds the provider (a bad id is a crash there, ⛔ a final here).

// ── Provider NEVER rejects (mirror whatsapp-business.ts) ───────────────────────────────────────────────
// `send` resolves a `rejected` SendResult on ANY error, `detail` = the classified failure (no PII); it
// never throws into dispatch. `getStatus` is an honest `unknown` — the gateway gives NO synchronous
// delivery receipt at accept time.

import type { ChannelProvider, RenderedMessage, SendResult, SendStatus, SendTarget } from '../provider.js';
import type { SmsGatewayMessage, SmsGatewayValue, SmsMessagingHandle } from './sms-app.js';
import { classifySmsError, rejectionDetail } from './sms-errors.js';

/**
 * What a real SMS provider needs: the global messaging handle (the sms-app.ts client resolves it) + the
 * TRAI-assigned DLT template id for the alert's category (the composition layer resolves it via
 * resolveDltTemplate — a category with no registered template is NOT SMS-eligible, so the composition layer
 * never builds this provider for it).
 */
export interface SmsProviderDeps {
  readonly messaging: SmsMessagingHandle;
  /** The resolved gateway template id (MSG91's — held under the template's config key, MG4). */
  readonly dltTemplateId: string;
  /** The template's named values for THIS send, in slot order (MG3). Absent ⇒ ⛔ sendable (MG12); `[]` ⇒ a slot-less template (5.11b). */
  readonly values?: readonly SmsGatewayValue[];
  /** THIS send's correlation id (6.37b DR3), already formatted by the caller — copied into the message as-is. */
  readonly correlationId?: string;
}

/** Build the gateway message from the rendered SMS output + the resolved template id + the values + the target. */
function buildGatewayMessage(
  deps: SmsProviderDeps,
  values: readonly SmsGatewayValue[],
  rendered: RenderedMessage,
  target: SendTarget,
): SmsGatewayMessage {
  return {
    // The caller resolved the recipient's E.164 on `target.address`.
    to: target.address,
    templateId: deps.dltTemplateId,
    values,
    // The rendered body — the oracle the values were checked against; ⛔ sent.
    body: rendered.body,
    ...(deps.correlationId !== undefined ? { correlationId: deps.correlationId } : {}),
  };
}

/** Build the real SMS-DLT provider bound to the global gateway handle + the resolved DLT template id. */
export function createSmsDltProvider(deps: SmsProviderDeps): ChannelProvider {
  return {
    id: 'sms-dlt',
    channel: 'sms',
    scope: 'global',
    async send(rendered, target): Promise<SendResult> {
      if (deps.values === undefined) {
        // MG12 — ⛔ values bound at all (the dark category composition) ⇒ ⛔ sendable through MSG91; refused before the network.
        // `[]` is a template with ⛔ slot (Story 5.11b) — sent.
        return {
          channel: 'sms',
          provider: 'sms-dlt',
          status: 'rejected',
          providerMessageId: null,
          detail: rejectionDetail('dlt_template_not_approved', 'no_named_values'),
        };
      }
      try {
        const messageId = await deps.messaging.send(buildGatewayMessage(deps, deps.values, rendered, target));
        return {
          channel: 'sms',
          provider: 'sms-dlt',
          status: 'accepted',
          providerMessageId: messageId,
        };
      } catch (err) {
        // NEVER reject the promise on the normal error path — resolve to a well-formed `rejected` result
        // whose `detail` encodes the gateway failure class (no PII) so the cascade/observability seam reads
        // it. SMS is terminal: there is no rung below to cascade to.
        const { code, errorClass } = classifySmsError(err);
        return {
          channel: 'sms',
          provider: 'sms-dlt',
          status: 'rejected',
          providerMessageId: null,
          detail: rejectionDetail(errorClass, code),
        };
      }
    },
    getStatus(messageId): Promise<SendStatus> {
      // MSG91 gives NO synchronous delivery receipt — its delivery reports arrive by webhook and are matched by the
      // send's `CRQID` (row 6-37b), ⛔ polled here. Honest `unknown`; never fabricate `delivered`.
      return Promise.resolve({ providerMessageId: messageId, state: 'unknown' });
    },
  };
}
