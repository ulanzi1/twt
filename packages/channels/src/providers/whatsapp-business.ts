// WhatsApp Business provider — the `whatsapp` channel (UTILITY templates only; dual-gated by admin toggle
// AND member opt-in, enforced by the delivery resolver, NOT here). Story 5.3 (AC1, AC2, AC6): the REAL Meta
// WhatsApp Business Cloud API implementation replacing the 5.1 stub, behind the UNCHANGED `ChannelProvider`
// port.
//
// ── Factory, not a singleton (per-Pariwar binding) — mirrors createFcmProvider ─────────────────────────
// The frozen `send(rendered, target)` carries NO `pariwar_id` and NO template — but WA credentials are
// per-Pariwar (AR-17) and the UTILITY template is per-(Pariwar, category). So this is a FACTORY: the
// composition layer resolves the Pariwar's messaging handle (whatsapp-app.ts cache) + the approved template
// for the alert's category (resolveApprovedTemplate) and builds a provider bound to them. `scope:
// 'per-pariwar'` (5.1 declared the field). The provider stays pure of DB access — it CLASSIFIES a Meta
// error (whatsapp-errors.ts) and never touches Postgres; the status-update persistence is the composition
// layer's job (Task 3 seam, fed by 5.4's webhook).
//
// ── The single-body-parameter template shape (Q1=A, CONFIRMED) ─────────────────────────────────────────
// The WA renderer emits ONE whitespace-normalized `body` string (render.ts) which this provider sends as
// the template's single `{{1}}` body parameter. Structured multi-parameter templates are the Epic-10
// evolution — explicitly NOT v1 (no RenderedMessage shape change).

import type { ChannelProvider, RenderedMessage, SendResult, SendStatus, SendTarget } from '../provider.js';
import type { WhatsappMessagingHandle } from './whatsapp-app.js';
import { classifyWhatsappError, rejectionDetail } from './whatsapp-errors.js';

/**
 * What a real WA provider needs: a per-Pariwar messaging handle (the whatsapp-app.ts cache resolves it) +
 * the approved UTILITY template for the alert's category (the composition layer resolves it via
 * resolveApprovedTemplate — a category with no approved template is NOT WA-eligible, so the composition
 * layer never builds this provider for it).
 */
export interface WhatsappProviderDeps {
  readonly messaging: WhatsappMessagingHandle;
  readonly template: { readonly name: string; readonly languageCode: string };
}

/** The recipient msisdn Meta expects: E.164 WITHOUT the leading '+'. */
function toMsisdn(target: SendTarget): string {
  return target.address.startsWith('+') ? target.address.slice(1) : target.address;
}

/** Build the Meta template message from the rendered WA output + the resolved template + the target. */
function buildTemplateMessage(deps: WhatsappProviderDeps, rendered: RenderedMessage, target: SendTarget) {
  return {
    to: toMsisdn(target),
    templateName: deps.template.name,
    languageCode: deps.template.languageCode,
    // The whitespace-normalized render body IS the single `{{1}}` body parameter (Q1=A).
    bodyParam: rendered.body,
  };
}

/** Build the real WhatsApp Business provider bound to a per-Pariwar handle + the resolved template. */
export function createWhatsappBusinessProvider(deps: WhatsappProviderDeps): ChannelProvider {
  return {
    id: 'whatsapp-business',
    channel: 'whatsapp',
    scope: 'per-pariwar',
    async send(rendered, target): Promise<SendResult> {
      try {
        const wamid = await deps.messaging.send(buildTemplateMessage(deps, rendered, target));
        return {
          channel: 'whatsapp',
          provider: 'whatsapp-business',
          status: 'accepted',
          providerMessageId: wamid,
        };
      } catch (err) {
        // NEVER reject the promise on the normal error path — resolve to a well-formed `rejected` result
        // whose `detail` encodes the Meta failure class (no PII) so the fallback/observability seam reads it.
        const { code, errorClass } = classifyWhatsappError(err);
        return {
          channel: 'whatsapp',
          provider: 'whatsapp-business',
          status: 'rejected',
          providerMessageId: null,
          detail: rejectionDetail(errorClass, code),
        };
      }
    },
    getStatus(messageId): Promise<SendStatus> {
      // Meta gives NO synchronous delivery receipt at accept time — delivered/read status arrives
      // asynchronously via the 5.4 webhook (mapMetaStatus consumes it). Honest `unknown` here; never
      // fabricate `delivered`.
      return Promise.resolve({ providerMessageId: messageId, state: 'unknown' });
    },
  };
}
