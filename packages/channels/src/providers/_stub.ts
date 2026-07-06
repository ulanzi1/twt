// packages/channels/src/providers/_stub.ts
//
// Shared stub scaffolding for the still-stubbed provider transports. Story 5.1 stubbed all 5; Story 5.2
// graduated `push` (fcm/apns → real firebase-admin) and Story 5.3 graduated `whatsapp` (→ real Meta
// WhatsApp Business Cloud API), so the REMAINING stubs are sms-dlt / telegram (real integration lands in
// 5.5–5.6). Each implements the `ChannelProvider` port with NO real SDK and NO network; swapping a stub for
// a real implementation of the SAME interface never changes the dispatcher.
//
// ── Deferred provider properties (architecture §3.4, mechanism → Category 5 Observability) ─────────────
// These are architecturally-committed PROPERTIES the real providers must satisfy; the STUBS only mark the
// seam so the later stories have a declared place to attach. Push's auth-lifecycle refresh is RESOLVED
// (firebase-app.ts — firebase-admin manages the service-account JWT→access-token refresh internally); WA's
// is RESOLVED (whatsapp-app.ts — a long-lived Meta system-user token; rotation is a config change, not an
// SDK refresh). The remaining stubs (sms-dlt / telegram) still need theirs:
//   • Auth-lifecycle refresh — telephony / bot tokens must be auto-refreshed + verified. The real provider
//     plugs a token-refresh hook in here.
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
