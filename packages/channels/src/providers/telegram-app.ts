// Per-Pariwar Telegram Bot API client cache — Story 5.5 (AC1, AC2; Task 4).
//
// The `telegram` side-channel sends through Telegram's Bot API — a plain REST endpoint
// (`POST https://api.telegram.org/bot<token>/sendMessage`). Per AR-53 + the story recommendation we use a
// THIN `fetch` client (no heavy SDK — one endpoint, a long-lived bot token, no auth-refresh SDK needed), so
// the AR-53 single-module-swap surface stays small and the bundle lean. Each Pariwar has its own bot + token
// (AR-17), so each needs its own client — this cache lazily builds + caches one client per `pariwar_id`.
// Mirrors whatsapp-app.ts.
//
// ── The `TelegramMessagingHandle` seam (mirrors WhatsappMessagingHandle) ───────────────────────────────
// The telegram provider depends on this narrow interface (just `send`), NOT on `fetch`/Telegram directly, so
// its unit tests inject a fake handle with NO network (Task 11). All Telegram-specific facts (the URL shape,
// the sendMessage body JSON, the error extraction) live HERE + in telegram-errors.ts, never leaking into the
// provider / dispatch / render (AR-53).
//
// ── Auth-lifecycle (the deferred 5.1 `_stub.ts` seam, now resolved) ────────────────────────────────────
// A Telegram bot token is LONG-LIVED — there is no per-send OAuth refresh. Token ROTATION is a config change
// (update the Secret-Manager value + restart), NOT an SDK concern.
//
// ── KNOWN v1 gap: no cache eviction on credential rotation (same call 5.2/5.3 made) ────────────────────
// This in-process client cache has NO TTL / eviction. If a Pariwar's bot token is ROTATED, the cached client
// keeps sending with the OLD token until the process restarts. This is RESTART-REQUIRED-ON-ROTATION —
// documented, not silently unhandled (mirrors whatsapp-app.ts / firebase-app.ts).

/** The narrow send seam the telegram provider depends on — the ONLY Telegram surface it touches. */
export interface TelegramMessagingHandle {
  /**
   * Send a plain-text message to a chat. Resolves to the Telegram `message_id` (as a string) on acceptance,
   * and REJECTS (throws a `TelegramSendError`) on a Telegram error / non-2xx / `ok:false` / network failure so
   * the provider's catch can classify it (telegram-errors.ts). Never returns a fabricated id on failure.
   */
  send(message: TelegramTextMessage): Promise<string>;
}

/** The provider-built message (Telegram-agnostic shape; the client turns it into the REST body). */
export interface TelegramTextMessage {
  /** The opaque Telegram chat id (the captured `member_telegram_opt_in.chat_id`). */
  readonly chatId: string;
  /** The rendered message body (the pure `telegram` renderer output). */
  readonly text: string;
}

/** The per-Pariwar client config the composition layer resolves (token = resolved Secret-Manager VALUE). */
export interface TelegramClientConfig {
  /** The resolved bot-token VALUE (the composition layer resolved the NAME → value). Never logged. */
  readonly botToken: string;
}

/** The per-Pariwar Telegram client cache — lazily builds + caches one client per `pariwar_id`. */
export interface TelegramAppCache {
  /**
   * Return the messaging handle for a Pariwar, building + caching its client on first use. The `config` (incl.
   * the resolved token) is used ONLY on the first (cache-miss) call for a Pariwar — a later rotation is not
   * picked up until restart (see header).
   */
  messagingFor(pariwarId: string, config: TelegramClientConfig): TelegramMessagingHandle;
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
 * A Telegram send failure — carries the Telegram `error_code` + HTTP status so telegram-errors.ts can
 * classify without re-parsing. Thrown by the client on a non-2xx / `ok:false` / network failure so the
 * provider resolves to a well-formed `rejected` SendResult (never a thrown promise into dispatch).
 */
export class TelegramSendError extends Error {
  public readonly name = 'TelegramSendError';
  public constructor(
    message: string,
    /** The Telegram `error_code` when the response carried one; null for a transport/parse failure. */
    public readonly telegramCode: number | null,
    /** The HTTP status (0 for a network failure with no response). */
    public readonly httpStatus: number,
  ) {
    super(message);
  }
}

/** Validate the client config BEFORE building — a missing credential fails clear, not as an opaque 401. */
function assertClientConfig(pariwarId: string, config: TelegramClientConfig): void {
  if (!config.botToken || config.botToken.trim() === '') {
    throw new Error(`telegram-app: bot token for pariwar '${pariwarId}' is missing/blank`);
  }
}

/** Build the Telegram sendMessage REST body. */
function buildRequestBody(message: TelegramTextMessage): string {
  return JSON.stringify({ chat_id: message.chatId, text: message.text });
}

/** Pull the numeric Telegram `error_code` off a parsed error response, defensively (never throws). */
function extractTelegramCode(payload: unknown): number | null {
  try {
    if (payload && typeof payload === 'object' && 'error_code' in payload) {
      const code = (payload as { error_code: unknown }).error_code;
      if (typeof code === 'number') return code;
      if (typeof code === 'string' && code.trim() !== '' && Number.isFinite(Number(code))) {
        return Number(code);
      }
    }
  } catch {
    // A hostile getter must never escape — the client's contract is to throw a well-formed TelegramSendError.
  }
  return null;
}

/** Pull the `result.message_id` off a Telegram success response, defensively (never throws). */
function extractMessageId(payload: unknown): string | null {
  try {
    if (payload && typeof payload === 'object' && 'result' in payload) {
      const result = (payload as { result: unknown }).result;
      if (result && typeof result === 'object' && 'message_id' in result) {
        const id = (result as { message_id: unknown }).message_id;
        if (typeof id === 'number' && Number.isFinite(id)) return String(id);
        if (typeof id === 'string' && id.length > 0) return id;
      }
    }
  } catch {
    // Defensive — a malformed success body resolves to null (the caller throws a clear TelegramSendError).
  }
  return null;
}

/**
 * Build a fresh Telegram client cache. One per process (the composition layer holds it). `fetchImpl` defaults
 * to the global `fetch` (Node 18+/undici); tests inject a fake so NO network is touched.
 */
export function createTelegramAppCache(fetchImpl: FetchLike = globalFetch): TelegramAppCache {
  const clients = new Map<string, TelegramMessagingHandle>();

  return {
    messagingFor(pariwarId, config) {
      let client = clients.get(pariwarId);
      if (!client) {
        assertClientConfig(pariwarId, config);
        // The bot token embeds in the path (Telegram's addressing). Encode it — it is admin-entered config,
        // not a compile-time constant; a stray '/' must never corrupt the request path.
        const url = `https://api.telegram.org/bot${encodeURIComponent(config.botToken)}/sendMessage`;
        client = {
          async send(message): Promise<string> {
            let res: FetchResponse;
            try {
              res = await fetchImpl(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: buildRequestBody(message),
              });
            } catch (err) {
              // Network / transport failure — no HTTP response. Classified as network downstream.
              const detail = err instanceof Error ? err.message : 'network error';
              throw new TelegramSendError(`telegram send transport failure: ${detail}`, null, 0);
            }

            let payload: unknown = null;
            try {
              payload = await res.json();
            } catch {
              // A non-2xx with no JSON still classifies by status; a 2xx with an unparseable body is anomalous.
              payload = null;
            }

            // Telegram signals failure via HTTP non-2xx AND/OR `{ ok: false, error_code }`. Treat either as a
            // rejection.
            const okFlag =
              payload && typeof payload === 'object' && 'ok' in payload
                ? (payload as { ok: unknown }).ok === true
                : res.ok;
            if (!res.ok || !okFlag) {
              throw new TelegramSendError(
                `telegram send rejected (HTTP ${res.status})`,
                extractTelegramCode(payload),
                res.status,
              );
            }

            const messageId = extractMessageId(payload);
            if (messageId === null) {
              // A 2xx/ok with no result.message_id is not an acceptance we can honor — treat as a failure.
              throw new TelegramSendError(
                'telegram send accepted but returned no message_id',
                extractTelegramCode(payload),
                res.status,
              );
            }
            return messageId;
          },
        };
        clients.set(pariwarId, client);
      }
      return client;
    },
  };
}

/** The global fetch, adapted to `FetchLike`. Isolated so the default is trivially swappable in tests. */
const globalFetch: FetchLike = (url, init) =>
  fetch(url, init as RequestInit) as unknown as Promise<FetchResponse>;
