// DigiLocker OAuth2 + PKCE transport — Story 3.3a (Task 2; AC1/AC2).
//
// The DigiLocker-specific HTTP transport: PKCE helpers, the authorize-URL builder, the
// server-side redirect_uri allowlist check (§2.8), and the token-exchange + eAadhaar-XML
// pull. This file (with signature.ts / mapper.ts / cert-refresh.ts) is INSIDE the sole
// provider directory the `kyc-provider-boundary` CI gate allowlists — no first-party
// DigiLocker Node SDK exists, so this is a direct OAuth2 client over the global `fetch`
// (Node 22). NFR-27 (8s p95) is honoured via an AbortController timeout; a timeout / any
// transport failure normalizes to `KycError(provider_unavailable)`.
//
// The provider injects a `DigiLockerTransport` so unit tests use a deterministic fake
// (no live government API in CI — the story's hard rule). `createHttpDigiLockerTransport`
// is the production path.

import { createHash, randomBytes } from 'node:crypto';

import { KycProviderError } from '@twt/contracts';

/** Base64URL (no padding) — the PKCE + state encoding. */
function base64Url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Generate a PKCE `code_verifier` (RFC 7636 — 43-128 chars of base64url). */
export function generateCodeVerifier(): string {
  return base64Url(randomBytes(32)); // 32 bytes → 43 base64url chars
}

/** Derive the S256 `code_challenge` from a verifier (RFC 7636). */
export function codeChallengeS256(verifier: string): string {
  return base64Url(createHash('sha256').update(verifier).digest());
}

/** Generate an opaque OAuth `state` nonce (CSRF defense). */
export function generateState(): string {
  return base64Url(randomBytes(24));
}

export interface DigiLockerProviderConfig {
  readonly clientId: string;
  readonly clientSecret: string;
  /** `/oauth2/1/authorize` (Meri Pehchaan). */
  readonly authorizeUrl: string;
  /** `/oauth2/1/token`. */
  readonly tokenUrl: string;
  /** `/oauth2/3/xml/eaadhaar`. */
  readonly eaadhaarUrl: string;
  /** The canonical callback redirect_uri. */
  readonly redirectUri: string;
  /** Server-side redirect_uri allowlist (§2.8) — strictly validated, audit-logged on change. */
  readonly redirectUriAllowlist: readonly string[];
  /** HTTP timeout (NFR-27 — 8s p95 budget). */
  readonly httpTimeoutMs: number;
  /** Transaction TTL (the PKCE window — 15 min). */
  readonly transactionTtlMs: number;
}

/**
 * Validate a redirect_uri against the server-side allowlist (§2.8). A mismatch is a
 * `provider_unavailable` config error (the auth boundary rejects it before any user
 * round-trip). Returns the validated uri.
 */
export function assertRedirectUriAllowed(config: DigiLockerProviderConfig, redirectUri: string): string {
  if (!config.redirectUriAllowlist.includes(redirectUri)) {
    throw new KycProviderError(
      'provider_unavailable',
      `redirect_uri not in the server-side allowlist (§2.8): ${redirectUri}`,
    );
  }
  return redirectUri;
}

/** Build the DigiLocker authorize URL (the redirect target returned by `initiate`). */
export function buildAuthorizeUrl(
  config: DigiLockerProviderConfig,
  args: { state: string; codeChallenge: string; redirectUri: string },
): string {
  const u = new URL(config.authorizeUrl);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('client_id', config.clientId);
  u.searchParams.set('redirect_uri', args.redirectUri);
  u.searchParams.set('state', args.state);
  u.searchParams.set('code_challenge', args.codeChallenge);
  u.searchParams.set('code_challenge_method', 'S256');
  return u.toString();
}

export interface ExchangeCodeArgs {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}

/** The provider-transport seam — injected so tests never hit the live government API. */
export interface DigiLockerTransport {
  /** Exchange the authorization `code` (+ PKCE verifier) at the token endpoint. */
  exchangeCodeForToken(args: ExchangeCodeArgs): Promise<{ accessToken: string }>;
  /** Pull the PKI-signed eAadhaar XML with the access token. */
  fetchEaadhaarXml(args: { accessToken: string }): Promise<string>;
}

/** `fetch` with an AbortController timeout — a timeout maps to `provider_unavailable`. */
async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new KycProviderError('provider_unavailable', `DigiLocker request timed out after ${timeoutMs}ms`);
    }
    throw new KycProviderError('provider_unavailable', `DigiLocker transport error: ${String(err)}`);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The production HTTP transport (direct OAuth2 client; no aggregator for v1, §2.8). All
 * failure paths normalize to `KycProviderError` — `user_consent_denied` for an OAuth
 * `access_denied`, otherwise `provider_unavailable`.
 */
export function createHttpDigiLockerTransport(config: DigiLockerProviderConfig): DigiLockerTransport {
  return {
    async exchangeCodeForToken(args: ExchangeCodeArgs): Promise<{ accessToken: string }> {
      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code: args.code,
        code_verifier: args.codeVerifier,
        redirect_uri: args.redirectUri,
        client_id: config.clientId,
        client_secret: config.clientSecret,
      });
      const res = await fetchWithTimeout(
        config.tokenUrl,
        {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
          body: body.toString(),
        },
        config.httpTimeoutMs,
      );
      const json = (await res.json().catch(() => ({}))) as { access_token?: string; error?: string };
      if (json.error === 'access_denied') {
        throw new KycProviderError('user_consent_denied', 'member denied DigiLocker consent');
      }
      if (!res.ok || !json.access_token) {
        throw new KycProviderError(
          'provider_unavailable',
          `DigiLocker token exchange failed (status ${res.status})`,
        );
      }
      return { accessToken: json.access_token };
    },

    async fetchEaadhaarXml(args: { accessToken: string }): Promise<string> {
      const res = await fetchWithTimeout(
        config.eaadhaarUrl,
        { method: 'GET', headers: { authorization: `Bearer ${args.accessToken}`, accept: 'application/xml' } },
        config.httpTimeoutMs,
      );
      if (!res.ok) {
        throw new KycProviderError('provider_unavailable', `eAadhaar pull failed (status ${res.status})`);
      }
      return res.text();
    },
  };
}
