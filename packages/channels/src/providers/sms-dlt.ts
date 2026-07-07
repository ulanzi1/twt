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
// ── The single-variable DLT template shape (mirror WA Q1=A) ────────────────────────────────────────────
// DLT-transactional gateways REJECT any content that does not byte-match a registered content template. So
// — exactly like WA's single-`{{1}}`-body-param shape — the frozen render.ts `sms` output is mapped into
// the registered DLT template's single variable slot; the fixed template wrapper (header/body scaffolding +
// PE/OE sender) is the gateway's, not the renderer's. The provider NEVER mutates the frozen render output.
//
// ── Provider NEVER rejects (mirror whatsapp-business.ts) ───────────────────────────────────────────────
// `send` resolves a `rejected` SendResult on ANY error, `detail` = the classified failure (no PII); it
// never throws into dispatch. `getStatus` is an honest `unknown` — the gateway gives NO synchronous
// delivery receipt at accept time.

import type { ChannelProvider, RenderedMessage, SendResult, SendStatus, SendTarget } from '../provider.js';
import type { SmsMessagingHandle } from './sms-app.js';
import { classifySmsError, rejectionDetail } from './sms-errors.js';

/**
 * What a real SMS provider needs: the global messaging handle (the sms-app.ts client resolves it) + the
 * TRAI-assigned DLT template id for the alert's category (the composition layer resolves it via
 * resolveDltTemplate — a category with no registered template is NOT SMS-eligible, so the composition layer
 * never builds this provider for it).
 */
export interface SmsProviderDeps {
  readonly messaging: SmsMessagingHandle;
  /** The resolved TRAI-assigned DLT template id (composition resolved the global NAME → value). */
  readonly dltTemplateId: string;
}

/** Build the gateway message from the rendered SMS output + the resolved template id + the target. */
function buildGatewayMessage(deps: SmsProviderDeps, rendered: RenderedMessage, target: SendTarget) {
  return {
    // The composition layer decrypted the member's Tier-1 mobile → E.164 on `target.address`.
    to: target.address,
    dltTemplateId: deps.dltTemplateId,
    // The whitespace-normalized render body IS the single DLT-template variable (mirror WA's bodyParam).
    body: rendered.body,
  };
}

/** Build the real SMS-DLT provider bound to the global gateway handle + the resolved DLT template id. */
export function createSmsDltProvider(deps: SmsProviderDeps): ChannelProvider {
  return {
    id: 'sms-dlt',
    channel: 'sms',
    scope: 'global',
    async send(rendered, target): Promise<SendResult> {
      try {
        const messageId = await deps.messaging.send(buildGatewayMessage(deps, rendered, target));
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
      // The gateway gives NO synchronous delivery receipt at accept time (no DLR seam in v1). Honest
      // `unknown` here; never fabricate `delivered`.
      return Promise.resolve({ providerMessageId: messageId, state: 'unknown' });
    },
  };
}
