// @twt/edge — Cloudflare Turnstile server-side verification (Story 1.13, AC-1/2/4).
//
// The vendor-neutral edge seam. Consumers (apps/api auth entry points) import the
// neutral `TurnstileVerifier` interface + the `noopTurnstileVerifier` default and
// NEVER reach for `cloudflare`-specific anything — so a pivot to a different edge
// vendor is a single-module change inside this package (AR-52, architecture §5.8a
// substitution points). Every `cloudflare`-named string (the siteverify URL, the
// widget script, the documented testing keys) and the siteverify wire-protocol live
// HERE and nowhere else.
//
// This package has NO dependency on @twt/domain — it is a pure edge-provider wrapper
// + shared types (mirrors @twt/queue). `fetch`, `AbortSignal.timeout`, and
// `crypto.randomUUID` are Node-22 globals — no HTTP-client dependency is needed.

import { randomUUID } from 'node:crypto';

// ── Vendor-neutral interface (promoted from apps/api auth seam) ─────────────────

/** The verification input a verifier receives at an auth/abuse entry point. */
export interface TurnstileVerification {
  /** The client-supplied Turnstile token (absent when the seam is no-op / no widget). */
  readonly token?: string;
  /** Remote IP for Cloudflare's siteverify `remoteip` (used by the real adapter only). */
  readonly remoteIp?: string;
}

/** The vendor-neutral verification seam every consumer injects. */
export interface TurnstileVerifier {
  /** Resolves true when the challenge passes. The no-op default always resolves true. */
  verify(input: TurnstileVerification): Promise<boolean>;
}

/**
 * The forward-looking edge-provider aggregate (AR-52, §5.8a). v1 lands the Turnstile
 * verifier in code; the remaining §5.8a capabilities (bot management, ingress
 * signature, edge-only ingress) land as `infra/cloudflare/` config + ADR-0010 in
 * this same story. Consumers inject the narrow `TurnstileVerifier` today; this type
 * documents the seam the edge package grows into without churning call sites.
 */
export interface EdgeProvider {
  readonly turnstile: TurnstileVerifier;
}

/** No-op default: every request passes. Selected when no Turnstile secret is configured. */
export const noopTurnstileVerifier: TurnstileVerifier = {
  async verify(): Promise<boolean> {
    return true;
  },
};

// ── Constants registry (mirror QUEUE_NAMES) ─────────────────────────────────────

/** Cloudflare Turnstile server-side validation endpoint. */
export const TURNSTILE_SITEVERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/** Cloudflare Turnstile client widget script (mounted by the rendering surface). */
export const TURNSTILE_WIDGET_SCRIPT_URL =
  'https://challenges.cloudflare.com/turnstile/v0/api.js';

/**
 * Cloudflare's stable, documented testing keys. Local-dev / CI / unit tests ONLY —
 * NEVER provision these in production. The secret keys are public test fixtures, not
 * credentials, so living in source is fine (unlike a real secret, which resolves from
 * Secret Manager).
 * @see https://developers.cloudflare.com/turnstile/troubleshooting/testing/
 */
export const TURNSTILE_TEST_KEYS = {
  /** Site keys (public — rendered into the widget). */
  sitekey: {
    alwaysPasses: '1x00000000000000000000AA',
    alwaysBlocks: '2x00000000000000000000AB',
    forcesInteractive: '3x00000000000000000000FF',
  },
  /** Secret keys (server-only). */
  secret: {
    alwaysPasses: '1x0000000000000000000000000000000AA',
    alwaysFails: '2x0000000000000000000000000000000AA',
    tokenAlreadySpent: '3x0000000000000000000000000000000AA',
  },
} as const;

// ── Cloudflare siteverify response (the documented wire shape) ──────────────────

/** The siteverify JSON response (Enterprise-only `metadata` omitted). */
export interface TurnstileSiteverifyResponse {
  readonly success: boolean;
  readonly 'error-codes'?: readonly string[];
  readonly challenge_ts?: string;
  readonly hostname?: string;
  readonly action?: string;
  readonly cdata?: string;
}

/** Options for {@link createCloudflareTurnstileVerifier}. */
export interface CloudflareTurnstileOptions {
  /**
   * The Turnstile secret key (server-only). The CALLER resolves this from Secret
   * Manager (NAME-not-value, like the argon2 pepper) and hands the VALUE here —
   * the secret never lands in an env literal in prod.
   */
  readonly secret: string;
  /**
   * Fail OPEN when the verdict is unobtainable (siteverify network error / timeout /
   * non-2xx / unparseable body). Default `false` — production rejects when it cannot
   * reach Cloudflare (AC-4 fail-closed). A definitive `success:false` verdict (incl.
   * `timeout-or-duplicate` / `internal-error`) is ALWAYS a reject regardless of this
   * flag — `failOpen` only governs transport failures, never a negative verdict.
   */
  readonly failOpen?: boolean;
  /** siteverify request timeout in ms. Default 5000. */
  readonly timeoutMs?: number;
  /** Override the siteverify endpoint (tests). Default {@link TURNSTILE_SITEVERIFY_URL}. */
  readonly siteverifyUrl?: string;
  /** Injectable `fetch` (tests). Default the Node-22 global `fetch`. */
  readonly fetchImpl?: typeof fetch;
  /**
   * Injectable idempotency-key generator (tests). Default `crypto.randomUUID`. The
   * key lets a timed-out siteverify call be safely retried with the SAME token
   * without tripping `timeout-or-duplicate`.
   */
  readonly idempotencyKey?: () => string;
  /**
   * Observability hook for transport failures (the fail-closed path) — supports the
   * §5.8a "observable edge metrics" bar. NEVER receives the token or secret. Default
   * a concise `console.warn` (mirrors @twt/queue's `onError`).
   */
  readonly onError?: (err: { code?: string; message: string }) => void;
}

const DEFAULT_TIMEOUT_MS = 5000;

function defaultOnError(err: { code?: string; message: string }): void {
  console.warn('[edge] turnstile siteverify failure:', err.code ?? 'NO_CODE', err.message);
}

/**
 * Construct the real Cloudflare Turnstile verifier (AC-2). POSTs the token to
 * siteverify and returns `true` only on `success: true`. The construction discipline
 * (endpoint, wire format, timeout, fail-closed posture) lives here once — the
 * sanctioned factory, mirroring `createQueueClient` / `createSimpleWebAuthnProvider`.
 *
 * Selection (real-vs-noop) is the CALLER's config-driven concern (apps/api `deps.ts`):
 * when no secret is configured the caller keeps {@link noopTurnstileVerifier}; this
 * factory is only invoked once a secret resolves.
 */
export function createCloudflareTurnstileVerifier(
  options: CloudflareTurnstileOptions,
): TurnstileVerifier {
  const {
    secret,
    failOpen = false,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    siteverifyUrl = TURNSTILE_SITEVERIFY_URL,
    fetchImpl = fetch,
    idempotencyKey = randomUUID,
    onError = defaultOnError,
  } = options;

  if (!secret || secret.trim() === '') {
    throw new Error('[edge] createCloudflareTurnstileVerifier requires a non-empty secret');
  }

  return {
    async verify(input: TurnstileVerification): Promise<boolean> {
      // A configured verifier with no token = challenge not solved = reject. This is
      // a definitive negative, not a transport failure, so `failOpen` does not apply.
      if (!input.token) return false;

      const body = new URLSearchParams({
        secret,
        response: input.token,
        idempotency_key: idempotencyKey(),
      });
      if (input.remoteIp) body.set('remoteip', input.remoteIp);

      let res: Response;
      try {
        res = await fetchImpl(siteverifyUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body,
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (err) {
        // Network error / timeout (AbortError) — transport failure, governed by failOpen.
        const e = err as Error & { code?: string };
        onError({ ...(e.code ? { code: e.code } : { code: e.name }), message: e.message });
        return failOpen;
      }

      if (!res.ok) {
        onError({ code: `http_${res.status}`, message: `siteverify returned ${res.status}` });
        return failOpen;
      }

      let data: TurnstileSiteverifyResponse;
      try {
        data = (await res.json()) as TurnstileSiteverifyResponse;
      } catch (err) {
        // Cloudflare returned 200 with an unparseable body — treat as definitive failure,
        // NOT a transport error. failOpen does not apply: a corrupt 200 is not a network
        // outage and should never silently pass a user.
        const e = err as Error;
        onError({ code: 'parse_error', message: e.message });
        return false;
      }

      // A definitive verdict from Cloudflare. `success:false` (incl. error-codes
      // `timeout-or-duplicate` = single-use replay, `internal-error` = retry-
      // recommended → fail-closed in prod) is ALWAYS a reject.
      return data.success === true;
    },
  };
}
