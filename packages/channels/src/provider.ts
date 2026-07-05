// packages/channels/src/provider.ts
//
// The `ChannelProvider` seam — Story 5.1 (AC2). The frozen abstraction the three-tier channel ladder
// dispatches through. Concrete providers (fcm/apns/whatsapp-business/sms-dlt/telegram) are STUBS in this
// story (Task 3): they implement the interface with no real SDK. Real integration lands in Stories
// 5.2–5.6 by swapping the stub for a real implementation WITHOUT changing this interface or the dispatcher
// (architecture §3.4 "Providers are swappable").
//
// ── RENDER vs SEND boundary (AC5) ─────────────────────────────────────────────────────────────────────
// A `render(alert): RenderedMessage` step (../render.ts) is a PURE function of the immutable payload — its
// output is byte-identical on replay and CI-gated. `send(rendered, target)` is intentionally OUTSIDE that
// guarantee: network calls, provider `message_id`s, timing, retries, and delivery outcomes are
// non-deterministic. Never assert determinism over `SendResult` / `SendStatus`.

/**
 * A logical delivery channel. The three-tier fallback LADDER is `push → whatsapp → sms`; `telegram` is a
 * parallel fire-and-forget side-channel (NOT part of the ladder — see dispatch.ts). `push` is a single
 * logical channel served by two transport providers (`fcm` for Android, `apns` for iOS).
 */
export type Channel = 'push' | 'whatsapp' | 'sms' | 'telegram';

/** A concrete transport provider (the SDK-swap seam). `fcm`/`apns` both serve the `push` channel. */
export type ProviderId = 'fcm' | 'apns' | 'whatsapp-business' | 'sms-dlt' | 'telegram';

/**
 * The pure render output — the presentation of an alert on ONE channel. All fields are strings/null so the
 * message is byte-identical-hashable (canonical-JSON → sha256 for the AC5 gate, HMAC for the audit row).
 * Renderers may vary PRESENTATION per channel (push title vs WA UTILITY template vs concise SMS) but never
 * mutate semantic payload meaning (AC4).
 */
export interface RenderedMessage {
  readonly channel: Channel;
  /** Short heading (push notification title). `null` for body-only channels (SMS/WA/Telegram). */
  readonly title: string | null;
  /**
   * The message body. Escaping is PER-CHANNEL (Story 5.2, D1): markup channels (WhatsApp/SMS/Telegram)
   * escape every payload-derived substitution as inert text (AC6); `push` is PLAINTEXT (no HTML-entity
   * encoding) since a push notification renders no markup.
   */
  readonly body: string;
  /**
   * Push-only deep-link target URI (Story 5.2, AC4) — the canonical `twt://p/<pariwar_id>/…` grammar,
   * derived from `alert_category` + `payload_data`. `null` on every non-push channel (and on a push for a
   * non-push-eligible category). This is render OUTPUT — NOT a field on the frozen `Alert` — so it does
   * not touch the immutability invariant; it IS covered by the byte-identical determinism gate (AC6).
   */
  readonly deepLink: string | null;
}

/**
 * The resolved recipient handle for one channel — an OPAQUE address (FCM device token, APNs token, E.164
 * phone, WhatsApp msisdn, Telegram chat id). The dispatcher resolves these from the member record at
 * delivery time via a seam (the read model is not part of this primitive). Deliberately NOT the raw Alert
 * — the render step already consumed the payload.
 */
export interface SendTarget {
  readonly channel: Channel;
  /** Opaque provider address. Tier-1 PII for phone-based channels — never logged in plaintext. */
  readonly address: string;
  /** Push-only: which transport provider to use for this device. */
  readonly platform?: 'android' | 'ios';
  /**
   * Push-only, optional (Story 5.2 code-review fix): the owning principal that registered this device
   * token. `ChannelProvider.send` never reads these — they exist so the composition-layer invalidation
   * seam (apps/api's `invalidatePushTokenOnFailure`) can scope a `markInvalid` write to the EXACT ownership
   * tuple (pariwarId, principalType, principalId, platform, token) the table's own unique key models,
   * instead of invalidating by blind-index alone (which two different principals could collide on if they
   * ever registered the identical raw token string).
   */
  readonly principalType?: 'member' | 'admin';
  readonly principalId?: string;
}

/** The outcome of one `send`. `not_implemented` is the Story 5.1 stub marker (no real SDK yet). */
export interface SendResult {
  readonly channel: Channel;
  readonly provider: ProviderId;
  readonly status: 'accepted' | 'rejected' | 'not_implemented';
  /** Provider-assigned id (null for stubs / rejections). Non-deterministic — never in the determinism gate. */
  readonly providerMessageId: string | null;
  readonly detail?: string;
}

/** A delivery-status probe result. Non-deterministic — outside the AC5 guarantee. */
export interface SendStatus {
  readonly providerMessageId: string;
  readonly state: 'unknown' | 'queued' | 'sent' | 'delivered' | 'failed';
}

/**
 * The channel-provider port (AC2). A provider owns ONE channel's transport. `scope` declares whether the
 * provider's credentials are global or per-Pariwar (architecture §3.13 Integration Capability Registry) —
 * Story 5.1 declares the field so 5.3/5.6's per-Pariwar credential wiring has a seam to attach to; the
 * stubs are all `'global'` for now.
 */
export interface ChannelProvider {
  readonly id: ProviderId;
  readonly channel: Channel;
  readonly scope: 'global' | 'per-pariwar';
  send(rendered: RenderedMessage, target: SendTarget): Promise<SendResult>;
  getStatus(messageId: string): Promise<SendStatus>;
}
