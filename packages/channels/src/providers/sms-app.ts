// Global SMS-DLT telephony-gateway client — Story 5.6 (AC1, AC2; Task 1).
//
// The `sms` channel sends through India's DLT-transactional telephony gateway — a plain REST endpoint. Per
// AR-53 + the WhatsApp precedent we use a THIN `fetch` client (no heavy SDK — one endpoint, a long-lived
// API key, no auth-refresh SDK needed), so the AR-53 single-module-swap surface stays small and the bundle
// lean. UNLIKE WhatsApp (per-Pariwar WA number/token, AR-17), DLT PE/OE registration is PLATFORM-GLOBAL:
// there is ONE gateway credential + ONE PE/OE-registered sender header for the whole platform. So this is a
// SINGLE global client (`scope: 'global'`), NOT a per-Pariwar cache — mirrors whatsapp-app.ts in SHAPE but
// drops the per-`pariwar_id` dimension (a per-Pariwar sender-header is an explicit NON-GOAL for v1).
//
// ── The `SmsMessagingHandle` seam (mirrors WhatsappMessagingHandle) ────────────────────────────────────
// The sms-dlt provider depends on this narrow interface (just `send`), NOT on `fetch`/the gateway directly,
// so its unit tests inject a fake handle with NO network (Task 7). All gateway-specific facts (the URL
// shape, the DLT request body, the DLT param encoding, the error extraction) live HERE + in sms-errors.ts,
// never leaking into the provider / dispatch / render (AR-53).
//
// ── Credential = a GLOBAL Secret-Manager NAME resolved at send time, never logged ──────────────────────
// The gateway API key + the PE/OE sender header are resolved from global config / Secret-Manager NAME
// pointers (the composition layer resolves NAME → value and builds this client once). The resolved key is
// captured in the closure and used on every send; it is NEVER logged or audited (AI-4-3(c); mirror
// `pariwar_wa_config.access_token_secret_name` discipline).
//
// ── KNOWN v1 gap: no client rebuild on credential rotation (same call WA/Telegram made) ─────────────────
// The client captures the resolved API key at build time and has NO TTL / eviction. If the gateway key is
// ROTATED, this in-process client keeps sending with the OLD key until the process restarts. This is
// RESTART-REQUIRED-ON-ROTATION — documented, not silently unhandled (mirrors whatsapp-app.ts's identical
// call). We deliberately do NOT build TTL/eviction.

/** The narrow send seam the sms-dlt provider depends on — the ONLY gateway surface it touches. */
export interface SmsMessagingHandle {
  /**
   * Send one DLT-transactional SMS. Resolves to the gateway message id on acceptance, and REJECTS (throws
   * an `SmsSendError`) on a gateway error / non-2xx / network failure so the provider's catch can classify
   * it (sms-errors.ts). Never returns a fabricated id on failure.
   */
  send(message: SmsGatewayMessage): Promise<string>;
}

/** The provider-built gateway message (gateway-agnostic shape; the client turns it into the REST body). */
export interface SmsGatewayMessage {
  /** Recipient in E.164 (the composition layer decrypted the member's Tier-1 mobile → this address). */
  readonly to: string;
  /** The TRAI-assigned DLT template id resolved for this alert's category (composition resolves the NAME). */
  readonly dltTemplateId: string;
  /** The single DLT-template variable slot — the whitespace-normalized render body (mirror WA's bodyParam). */
  readonly body: string;
}

/** The global gateway client config the composition layer resolves (apiKey = resolved Secret VALUE). */
export interface SmsClientConfig {
  /** The telephony-gateway send endpoint (admin/platform config, not a compile-time constant). */
  readonly apiUrl: string;
  /** The resolved API-key VALUE (the composition layer resolved the NAME → value). Never logged. */
  readonly apiKey: string;
  /** The PE/OE-registered sender header (TRAI DLT sender id). Resolved from a global NAME pointer. */
  readonly senderId: string;
}

/** The single global SMS client — builds + caches ONE messaging handle (no per-Pariwar dimension). */
export interface SmsAppClient {
  /** Return the one global messaging handle, building + caching it on first use (restart-required-on-rotation). */
  messaging(): SmsMessagingHandle;
  /**
   * Whether the global gateway credential (apiUrl/apiKey/senderId) is present — the SAME "not configured"
   * check `resolveWhatsappProviderDeps` runs on its own per-Pariwar config row (AC1; mirrors WA exactly).
   * The composition seam calls this BEFORE `messaging()` so a blank/missing credential degrades to the
   * fixture like an unconfigured WA provider does, rather than surfacing as a thrown error. A TRUE runtime
   * failure (gateway unreachable, auth rejected, timeout) still only ever surfaces via a classified
   * `rejected` `SendResult` from `send()` — this method never touches the network.
   */
  isConfigured(): boolean;
}

/** The minimal `fetch` shape the client depends on (injectable in tests; defaults to global `fetch`). */
export type SmsFetchLike = (url: string, init: SmsFetchInit) => Promise<SmsFetchResponse>;
export interface SmsFetchInit {
  method: string;
  headers: Record<string, string>;
  body: string;
}
export interface SmsFetchResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

/**
 * A gateway send failure — carries the gateway error code (string; DLT gateways return string codes) + the
 * HTTP status so sms-errors.ts can classify without re-parsing. Thrown by the client on a non-2xx /
 * gateway-error / network failure so the provider resolves to a well-formed `rejected` SendResult (never a
 * thrown promise into dispatch).
 */
export class SmsSendError extends Error {
  public readonly name = 'SmsSendError';
  public constructor(
    message: string,
    /** The gateway error `code` (string) when the response carried one; null for a transport/parse failure. */
    public readonly gatewayCode: string | null,
    /** The HTTP status (0 for a network failure with no response). */
    public readonly httpStatus: number,
  ) {
    super(message);
  }
}

/** Whether every required client-config field is present — the pure "not configured" predicate. */
function isClientConfigValid(config: SmsClientConfig): boolean {
  return (
    Boolean(config.apiUrl) &&
    config.apiUrl.trim() !== '' &&
    Boolean(config.apiKey) &&
    config.apiKey.trim() !== '' &&
    Boolean(config.senderId) &&
    config.senderId.trim() !== ''
  );
}

/**
 * Validate the client config BEFORE building — defense-in-depth for a direct `messaging()` call that skips
 * the composition seam's `isConfigured()` guard. A missing credential fails clear, not as an opaque gateway
 * 400.
 */
function assertClientConfig(config: SmsClientConfig): void {
  if (!config.apiUrl || config.apiUrl.trim() === '') {
    throw new Error('sms-app: gateway apiUrl is missing/blank');
  }
  if (!config.apiKey || config.apiKey.trim() === '') {
    throw new Error('sms-app: gateway apiKey is missing/blank');
  }
  if (!config.senderId || config.senderId.trim() === '') {
    throw new Error('sms-app: DLT senderId (PE/OE header) is missing/blank');
  }
}

/** Build the gateway REST request body for a DLT-transactional send (the single-variable shape). */
function buildRequestBody(config: SmsClientConfig, message: SmsGatewayMessage): string {
  return JSON.stringify({
    sender: config.senderId,
    to: message.to,
    // The TRAI-registered DLT template id — the gateway byte-matches `body` against this template's content.
    template_id: message.dltTemplateId,
    // The single DLT-template variable slot (mirror WA's single `{{1}}` body parameter).
    message: message.body,
  });
}

/** Pull the gateway error `code` off a parsed error response, defensively (never throws). */
function extractGatewayCode(payload: unknown): string | null {
  try {
    if (payload && typeof payload === 'object') {
      // Common gateway shapes: { error: { code } } or a top-level { code }.
      const container = 'error' in payload ? (payload as { error: unknown }).error : payload;
      if (container && typeof container === 'object' && 'code' in container) {
        const code = (container as { code: unknown }).code;
        if (typeof code === 'string' && code.trim() !== '') return code;
        if (typeof code === 'number' && Number.isFinite(code)) return String(code);
      }
    }
  } catch {
    // A hostile getter must never escape — the client's contract is to throw a well-formed SmsSendError.
  }
  return null;
}

/** Pull the gateway `messageId` off a success response, defensively (never throws). */
function extractMessageId(payload: unknown): string | null {
  try {
    if (payload && typeof payload === 'object') {
      // Common gateway shapes: { messageId } or { data: { messageId } }.
      const container = 'data' in payload ? (payload as { data: unknown }).data : payload;
      if (container && typeof container === 'object' && 'messageId' in container) {
        const id = (container as { messageId: unknown }).messageId;
        if (typeof id === 'string' && id.length > 0) return id;
      }
    }
  } catch {
    // Defensive — a malformed success body resolves to null (the caller throws a clear SmsSendError).
  }
  return null;
}

/**
 * Build a fresh global SMS client. One per process (the composition layer holds it). `fetchImpl` defaults to
 * the global `fetch` (Node 18+/undici); tests inject a fake so NO network is touched. The config (incl. the
 * resolved API key) is captured ONCE — a later rotation is not picked up until restart (see header).
 */
export function createSmsAppClient(config: SmsClientConfig, fetchImpl: SmsFetchLike = globalFetch): SmsAppClient {
  let cached: SmsMessagingHandle | null = null;
  return {
    isConfigured() {
      return isClientConfigValid(config);
    },
    messaging() {
      if (cached) return cached;
      assertClientConfig(config);
      const url = config.apiUrl;
      cached = {
        async send(message): Promise<string> {
          let res: SmsFetchResponse;
          try {
            res = await fetchImpl(url, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${config.apiKey}`,
                'Content-Type': 'application/json',
              },
              body: buildRequestBody(config, message),
            });
          } catch (err) {
            // Network / transport failure — no HTTP response. Classified as api_unavailable downstream.
            const detail = err instanceof Error ? err.message : 'network error';
            throw new SmsSendError(`sms send transport failure: ${detail}`, null, 0);
          }

          let payload: unknown = null;
          try {
            payload = await res.json();
          } catch {
            // A 2xx with an unparseable body is anomalous; a non-2xx with no JSON still classifies by status.
            payload = null;
          }

          if (!res.ok) {
            throw new SmsSendError(
              `sms send rejected by gateway (HTTP ${res.status})`,
              extractGatewayCode(payload),
              res.status,
            );
          }

          const messageId = extractMessageId(payload);
          if (messageId === null) {
            // A 2xx that carries no messageId is not an acceptance we can honor — treat as a failure so the
            // outcome never fabricates a success; classify by any embedded gateway code.
            throw new SmsSendError(
              'sms send accepted by gateway but returned no messageId',
              extractGatewayCode(payload),
              res.status,
            );
          }
          return messageId;
        },
      };
      return cached;
    },
  };
}

/** The global fetch, adapted to `SmsFetchLike`. Isolated so the default is trivially swappable in tests. */
const globalFetch: SmsFetchLike = (url, init) =>
  fetch(url, init as RequestInit) as unknown as Promise<SmsFetchResponse>;
