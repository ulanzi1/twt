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
// (update the Secret-Manager value; a caller that re-resolves it picks it up on the next send — see "Credential rotation" below), NOT an SDK concern.
//
// ── Credential rotation (5.5's v1 gap, CLOSED for Telegram by Story 5.14 code review FD-P2) ───────────────
// 5.5 cached ONE client per `pariwar_id` with no eviction, so a ROTATED bot token kept sending with the OLD token until a restart
// (the same call 5.2/5.3 made for whatsapp-app.ts / firebase-app.ts, which keep it). The Trust channel poster resolves the secret on
// EVERY post, so for it a stale client was no longer a delay but a permanent loss: Telegram answers 401, recorded final
// `refused:tg_401`. The cache entry now remembers the token it was built from and is REBUILT when `messagingFor` is handed a different one.
// ⚠ That helps a CALLER THAT RE-RESOLVES the token on each send — the Trust poster builds its own cache instance (`boot.ts`) and does. The
// per-member mirror builds a SEPARATE instance (`contribution-providers.ts`) behind a provider-registry memo that lives for the process
// (`provider-composition.ts`), so `messagingFor` is never re-called with a new token there: a rotation still needs a restart on that path.
//
// ── Story 5.14 (FS7 (a), `2026-10-29-418` item 6) — a request TIMEOUT and `retry_after` ─────────────────
// Every send carries a `signal` (default {@link TELEGRAM_SEND_TIMEOUT_MS} — MSG91's 9 s): an abort is the existing transport path
// (code null, status 0 ⇒ `api_unavailable` in telegram-errors.ts — ⛔ a new class). The bound is CACHE-level, so the per-member mirror
// (5.5) gets it too: its hung call now ends `rejected` after 9 s instead of hanging (an accepted fix). A 429's
// `parameters.retry_after` rides the error as `retryAfter` (the Trust channel poster re-sends after it).

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
   * Return the messaging handle for a Pariwar, building + caching its client on first use. The cached client is reused while the
   * `config`'s resolved token is the one it was built from; a DIFFERENT token (a rotation, or a changed secret name) rebuilds it —
   * so the next send uses the new token (see header).
   */
  messagingFor(pariwarId: string, config: TelegramClientConfig): TelegramMessagingHandle;
}

/** The minimal `fetch` shape the client depends on (injectable in tests; defaults to global `fetch`). */
export type FetchLike = (url: string, init: FetchInit) => Promise<FetchResponse>;
export interface FetchInit {
  method: string;
  headers: Record<string, string>;
  body: string;
  /** Story 5.14 — the request's timeout bound (the global fetch aborts the request AND its body read on it). */
  signal?: AbortSignal;
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
    /**
     * Story 5.14 — Telegram's `parameters.retry_after` (whole seconds) on a 429; null otherwise. ⛔ Parsed from `description`
     * (Telegram: "subject to change").
     */
    public readonly retryAfter: number | null = null,
  ) {
    super(message);
  }
}

/** Story 5.14 (FS7 (a)) — the default request bound: MSG91's `SMS_GATEWAY_TIMEOUT_MS` (sms-app.ts). */
export const TELEGRAM_SEND_TIMEOUT_MS = 9_000;

/** Options the cache takes — the request bound and its signal factory (`AbortSignal.timeout` by default; tests inject one). */
export interface TelegramAppCacheOptions {
  readonly timeoutMs?: number;
  readonly timeoutSignal?: (ms: number) => AbortSignal;
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

/** Pull a 429's `parameters.retry_after` (a positive whole number of seconds), defensively (never throws). */
function extractRetryAfter(payload: unknown): number | null {
  try {
    if (payload && typeof payload === 'object' && 'parameters' in payload) {
      const parameters = (payload as { parameters: unknown }).parameters;
      if (parameters && typeof parameters === 'object' && 'retry_after' in parameters) {
        const after = (parameters as { retry_after: unknown }).retry_after;
        if (typeof after === 'number' && Number.isInteger(after) && after > 0 && after <= 2_147_483_647) return after;
      }
    }
  } catch {
    // A hostile getter must never escape.
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
export function createTelegramAppCache(fetchImpl: FetchLike = globalFetch, options: TelegramAppCacheOptions = {}): TelegramAppCache {
  const timeoutMs = options.timeoutMs ?? TELEGRAM_SEND_TIMEOUT_MS;
  // whatsapp-app.ts's bound check: ≤ 2^31 − 1 (Node clamps a longer timer to 1 ms — an instant abort). Checked HERE, at construction,
  // so a bad bound is a startup error — ⛔ a send that may or may not have gone.
  if (!(typeof timeoutMs === 'number' && Number.isInteger(timeoutMs) && timeoutMs >= 1 && timeoutMs <= 2_147_483_647)) {
    throw new Error('telegram-app: timeoutMs is invalid');
  }
  const timeoutSignal = options.timeoutSignal ?? ((ms: number) => AbortSignal.timeout(ms));
  // The entry remembers the token its client was built from (FD-P2): the URL below embeds it, so a different token needs a new client.
  const clients = new Map<string, { readonly botToken: string; readonly client: TelegramMessagingHandle }>();

  return {
    messagingFor(pariwarId, config) {
      const cached = clients.get(pariwarId);
      let client = cached !== undefined && cached.botToken === config.botToken ? cached.client : undefined;
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
                signal: timeoutSignal(timeoutMs),
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
            const okFlag = payload !== null && typeof payload === 'object' && 'ok' in payload && (payload as { ok: unknown }).ok === true;
            if (!res.ok || !okFlag) {
              throw new TelegramSendError(
                `telegram send rejected (HTTP ${res.status})`,
                extractTelegramCode(payload),
                res.status,
                extractRetryAfter(payload),
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
        clients.set(pariwarId, { botToken: config.botToken, client });
      }
      return client;
    },
  };
}

/** The global fetch, adapted to `FetchLike`. Isolated so the default is trivially swappable in tests. */
const globalFetch: FetchLike = (url, init) =>
  fetch(url, init as RequestInit) as unknown as Promise<FetchResponse>;
