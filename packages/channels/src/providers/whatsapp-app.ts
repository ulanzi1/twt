// Per-Pariwar WhatsApp Business Cloud API client cache — Story 5.3 (AC1, AC2; Task 2).
//
// The `whatsapp` channel sends through Meta's WhatsApp Business Cloud API — a plain REST endpoint
// (`POST https://graph.facebook.com/<version>/<phone_number_id>/messages`). Per AR-53 + the story
// recommendation we use a THIN `fetch` client (no heavy SDK — one endpoint, a long-lived system-user
// bearer token, no auth-refresh SDK needed), so the AR-53 single-module-swap surface stays small and the
// bundle lean. Each Pariwar has its own WA Business number + access token (AR-17), so each needs its own
// client — this cache lazily builds + caches one client per `pariwar_id`. Mirrors firebase-app.ts.
//
// ── The `WhatsappMessagingHandle` seam (mirrors PushMessagingHandle) ───────────────────────────────────
// The whatsapp-business provider depends on this narrow interface (just `send`), NOT on `fetch`/Meta
// directly, so its unit tests inject a fake handle with NO network (Task 7). All Meta-specific facts (the
// URL shape, the template body JSON, the error extraction) live HERE + in whatsapp-errors.ts, never leaking
// into the provider / dispatch / render (AR-53).
//
// ── Auth-lifecycle (the deferred 5.1 `_stub.ts` seam, now resolved) ────────────────────────────────────
// Meta WA Business uses a LONG-LIVED system-user access token — there is no per-send OAuth refresh to
// build (unlike a partner JWT). Token ROTATION is a config change (update the Secret-Manager value +
// restart), NOT an SDK concern. So the "provider auth-lifecycle refresh" property the 5.1 stub only marked
// a seam for is satisfied by "long-lived token; rotation is a config change".
//
// ── KNOWN v1 gap: no cache eviction on credential rotation (same call 5.2 made) ────────────────────────
// `resolveSecretValue` re-fetches Secret Manager FRESH every call, but this in-process client cache has NO
// TTL / eviction. If a Pariwar's WA access token is ROTATED, the cached client keeps sending with the OLD
// token until the process restarts. This is RESTART-REQUIRED-ON-ROTATION — documented, not silently
// unhandled. We deliberately do NOT build TTL/eviction (mirrors firebase-app.ts's identical call).

/** The narrow send seam the whatsapp-business provider depends on — the ONLY Meta surface it touches. */
export interface WhatsappMessagingHandle {
  /**
   * Send a UTILITY template message. Resolves to the Meta `wamid` (messages[0].id) on acceptance, and
   * REJECTS (throws a `WhatsappSendError`) on a Meta error / non-2xx / network failure so the provider's
   * catch can classify it (whatsapp-errors.ts). Never returns a fabricated id on failure.
   */
  send(message: WhatsappTemplateMessage): Promise<string>;
}

/** The provider-built template message (Meta-agnostic shape; the client turns it into the REST body). */
export interface WhatsappTemplateMessage {
  /** Recipient msisdn in E.164 WITHOUT the leading '+' (Meta's `to` format). */
  readonly to: string;
  /** The Meta-registered UTILITY template name (from resolveApprovedTemplate). */
  readonly templateName: string;
  /** The template language code (e.g. 'en', 'hi'). */
  readonly languageCode: string;
  /** The single `{{1}}` body parameter — the whitespace-normalized render output (Q1=A). */
  readonly bodyParam: string;
}

/** The per-Pariwar client config the composition layer resolves (token = resolved Secret-Manager VALUE). */
export interface WhatsappClientConfig {
  readonly phoneNumberId: string;
  /** The resolved access-token VALUE (the composition layer resolved the NAME → value). Never logged. */
  readonly accessToken: string;
  readonly graphApiVersion: string;
}

/** The per-Pariwar WA client cache — lazily builds + caches one client per `pariwar_id`. */
export interface WhatsappAppCache {
  /**
   * Return the messaging handle for a Pariwar, building + caching its client on first use. The `config`
   * (incl. the resolved token) is used ONLY on the first (cache-miss) call for a Pariwar — a later rotation
   * is not picked up until restart (see header).
   */
  messagingFor(pariwarId: string, config: WhatsappClientConfig): WhatsappMessagingHandle;
}

/** The minimal `fetch` shape the client depends on (injectable in tests; defaults to global `fetch`). */
export type FetchLike = (url: string, init: FetchInit) => Promise<FetchResponse>;
export interface FetchInit {
  method: string;
  headers: Record<string, string>;
  body: string;
}
export interface FetchResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

/**
 * A Meta send failure — carries the numeric Meta error code + HTTP status so whatsapp-errors.ts can
 * classify without re-parsing. Thrown by the client on a non-2xx / Meta-error / network failure so the
 * provider resolves to a well-formed `rejected` SendResult (never a thrown promise into dispatch).
 */
export class WhatsappSendError extends Error {
  public readonly name = 'WhatsappSendError';
  public constructor(
    message: string,
    /** The Meta error `code` (numeric) when the response carried one; null for a transport/parse failure. */
    public readonly metaCode: number | null,
    /** The HTTP status (0 for a network failure with no response). */
    public readonly httpStatus: number,
  ) {
    super(message);
  }
}

/** Validate the client config BEFORE building — a missing credential fails clear, not as an opaque Meta 400. */
function assertClientConfig(pariwarId: string, config: WhatsappClientConfig): void {
  if (!config.phoneNumberId || config.phoneNumberId.trim() === '') {
    throw new Error(`whatsapp-app: phone_number_id for pariwar '${pariwarId}' is missing/blank`);
  }
  if (!config.accessToken || config.accessToken.trim() === '') {
    throw new Error(`whatsapp-app: access token for pariwar '${pariwarId}' is missing/blank`);
  }
  if (!config.graphApiVersion || config.graphApiVersion.trim() === '') {
    throw new Error(`whatsapp-app: graph_api_version for pariwar '${pariwarId}' is missing/blank`);
  }
}

/** Build the Meta REST request body for a UTILITY template send (the single-body-parameter shape, Q1=A). */
function buildRequestBody(message: WhatsappTemplateMessage): string {
  return JSON.stringify({
    messaging_product: 'whatsapp',
    to: message.to,
    type: 'template',
    template: {
      name: message.templateName,
      language: { code: message.languageCode },
      components: [
        {
          type: 'body',
          parameters: [{ type: 'text', text: message.bodyParam }],
        },
      ],
    },
  });
}

/** Pull the numeric Meta error `code` off a parsed error response, defensively (never throws). */
function extractMetaCode(payload: unknown): number | null {
  try {
    if (payload && typeof payload === 'object' && 'error' in payload) {
      const error = (payload as { error: unknown }).error;
      if (error && typeof error === 'object' && 'code' in error) {
        const code = (error as { code: unknown }).code;
        if (typeof code === 'number') return code;
        if (typeof code === 'string' && code.trim() !== '' && Number.isFinite(Number(code))) {
          return Number(code);
        }
      }
    }
  } catch {
    // A hostile getter must never escape — the client's contract is to throw a well-formed WhatsappSendError.
  }
  return null;
}

/**
 * Build a fresh WA client cache. One per process (the composition layer holds it). `fetchImpl` defaults to
 * the global `fetch` (Node 18+/undici); tests inject a fake so NO network is touched.
 */
export function createWhatsappAppCache(fetchImpl: FetchLike = globalFetch): WhatsappAppCache {
  const clients = new Map<string, WhatsappMessagingHandle>();

  return {
    messagingFor(pariwarId, config) {
      let client = clients.get(pariwarId);
      if (!client) {
        assertClientConfig(pariwarId, config);
        // Encode both — admin-entered config, not a compile-time constant. A stray '/' or '?' must never
        // corrupt the request path.
        const url = `https://graph.facebook.com/${encodeURIComponent(config.graphApiVersion)}/${encodeURIComponent(config.phoneNumberId)}/messages`;
        client = {
          async send(message): Promise<string> {
            let res: FetchResponse;
            try {
              res = await fetchImpl(url, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${config.accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: buildRequestBody(message),
              });
            } catch (err) {
              // Network / transport failure — no HTTP response. Classify as api_unavailable downstream.
              const detail = err instanceof Error ? err.message : 'network error';
              throw new WhatsappSendError(`whatsapp send transport failure: ${detail}`, null, 0);
            }

            let payload: unknown = null;
            try {
              payload = await res.json();
            } catch {
              // A 2xx with an unparseable body is anomalous; a non-2xx with no JSON still classifies by status.
              payload = null;
            }

            if (!res.ok) {
              throw new WhatsappSendError(
                `whatsapp send rejected by Meta (HTTP ${res.status})`,
                extractMetaCode(payload),
                res.status,
              );
            }

            const wamid = extractWamid(payload);
            if (wamid === null) {
              // A 2xx that carries no messages[0].id is not an acceptance we can honor — treat as a failure.
              // Meta can embed an `error` object even on a 2xx (an anomalous partial-failure shape); still
              // extract it so the failure classifies by the real code instead of falling back to `unknown`.
              throw new WhatsappSendError(
                'whatsapp send accepted by Meta but returned no wamid',
                extractMetaCode(payload),
                res.status,
              );
            }
            return wamid;
          },
        };
        clients.set(pariwarId, client);
      }
      return client;
    },
  };
}

/** Pull the `messages[0].id` wamid off a Meta success response, defensively (never throws). */
function extractWamid(payload: unknown): string | null {
  try {
    if (payload && typeof payload === 'object' && 'messages' in payload) {
      const messages = (payload as { messages: unknown }).messages;
      if (Array.isArray(messages) && messages.length > 0) {
        const first = messages[0] as unknown;
        if (first && typeof first === 'object' && 'id' in first) {
          const id = (first as { id: unknown }).id;
          if (typeof id === 'string' && id.length > 0) return id;
        }
      }
    }
  } catch {
    // Defensive — a malformed success body resolves to null (the caller throws a clear WhatsappSendError).
  }
  return null;
}

/** The global fetch, adapted to `FetchLike`. Isolated so the default is trivially swappable in tests. */
const globalFetch: FetchLike = (url, init) =>
  fetch(url, init as RequestInit) as unknown as Promise<FetchResponse>;
