// packages/channels/src/providers/_stub.ts
//
// Shared stub scaffolding for the Story 5.1 provider stubs (AC2). Every concrete provider
// (fcm/apns/whatsapp-business/sms-dlt/telegram) is a STUB in this story: it implements the
// `ChannelProvider` port with NO real SDK and NO network. Real integration (5.2–5.6) swaps the stub for a
// real implementation of the SAME interface — the dispatcher never changes.
//
// ── Deferred provider properties (architecture §3.4, mechanism → Category 5 Observability) ─────────────
// These are architecturally-committed PROPERTIES the real providers must satisfy; the STUBS only mark the
// seam so the later stories have a declared place to attach:
//   • Auth-lifecycle refresh — FCM service-account JWT / APNs auth token / WA partner JWT / telephony
//     tokens must be auto-refreshed + verified. The real provider plugs a token-refresh hook in here.
//   • Provider-quota self-regulation — token-bucket / queue pacing / batching to stay within provider
//     quotas, degrading by EXTENDING the dispatch window rather than dropping members. The dispatcher's
//     fan-out is structured so a rate/queue-aware send path can wrap `send` later (dispatch.ts).

import type { Channel, ProviderId, SendResult, SendStatus } from '../provider.js';

/** The Story 5.1 stub `send` result — a well-formed `not_implemented` marker, no network. */
export function stubSendResult(provider: ProviderId, channel: Channel): SendResult {
  return {
    channel,
    provider,
    status: 'not_implemented',
    providerMessageId: null,
    detail: `${provider} provider is a Story 5.1 stub — real SDK integration lands in Stories 5.2–5.6`,
  };
}

/** The Story 5.1 stub `getStatus` result — no real delivery to probe yet. */
export function stubSendStatus(messageId: string): SendStatus {
  return { providerMessageId: messageId, state: 'unknown' };
}
