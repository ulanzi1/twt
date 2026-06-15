// @twt/edge Turnstile verifier unit tests (Story 1.13, AC-8).
//
// Exercises the real Cloudflare verifier purely against a MOCKED fetch — no live
// network, the suite stays hermetic (no live Cloudflare in CI). Covers: siteverify
// success; `success:false` + error-codes; `timeout-or-duplicate` single-use replay;
// network/timeout fail-closed (+ failOpen override); non-2xx fail-closed;
// `idempotency_key` + `remoteip` passthrough; missing-token reject; no-op always-true.

import { describe, expect, it, vi } from 'vitest';

import {
  TURNSTILE_SITEVERIFY_URL,
  createCloudflareTurnstileVerifier,
  noopTurnstileVerifier,
  type TurnstileSiteverifyResponse,
} from '../src/index.js';

/** Build a mock `fetch` that returns one canned siteverify response. */
function mockFetch(
  payload: Partial<TurnstileSiteverifyResponse> & { success: boolean },
  init: { ok?: boolean; status?: number } = {},
): { fetchImpl: typeof fetch; calls: { url: string; body: URLSearchParams }[] } {
  const calls: { url: string; body: URLSearchParams }[] = [];
  const fetchImpl = vi.fn(async (url: string | URL | Request, opts?: RequestInit) => {
    const body = opts?.body as URLSearchParams;
    calls.push({ url: String(url), body });
    return {
      ok: init.ok ?? true,
      status: init.status ?? 200,
      json: async () => payload,
    } as Response;
  }) as unknown as typeof fetch;
  return { fetchImpl, calls };
}

const SECRET = '1x0000000000000000000000000000000AA'; // Cloudflare "always-passes" test secret.

describe('createCloudflareTurnstileVerifier', () => {
  it('returns true on success:true and POSTs to the siteverify endpoint', async () => {
    const { fetchImpl, calls } = mockFetch({ success: true });
    const verifier = createCloudflareTurnstileVerifier({ secret: SECRET, fetchImpl });

    await expect(verifier.verify({ token: 'tok-good' })).resolves.toBe(true);

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(TURNSTILE_SITEVERIFY_URL);
    expect(calls[0]?.body.get('secret')).toBe(SECRET);
    expect(calls[0]?.body.get('response')).toBe('tok-good');
  });

  it('returns false on success:false with error-codes (e.g. invalid-input-response)', async () => {
    const { fetchImpl } = mockFetch({ success: false, 'error-codes': ['invalid-input-response'] });
    const verifier = createCloudflareTurnstileVerifier({ secret: SECRET, fetchImpl });

    await expect(verifier.verify({ token: 'tok-bad' })).resolves.toBe(false);
  });

  it('returns false on timeout-or-duplicate (single-use token replay)', async () => {
    const { fetchImpl } = mockFetch({ success: false, 'error-codes': ['timeout-or-duplicate'] });
    const verifier = createCloudflareTurnstileVerifier({ secret: SECRET, fetchImpl });

    await expect(verifier.verify({ token: 'tok-replayed' })).resolves.toBe(false);
  });

  it('returns false on internal-error (retry-recommended → fail-closed verdict in prod)', async () => {
    const { fetchImpl } = mockFetch({ success: false, 'error-codes': ['internal-error'] });
    const verifier = createCloudflareTurnstileVerifier({ secret: SECRET, fetchImpl });

    await expect(verifier.verify({ token: 'tok' })).resolves.toBe(false);
  });

  it('fails CLOSED (false) on a network error / timeout by default', async () => {
    const onError = vi.fn();
    const fetchImpl = vi.fn(async () => {
      throw Object.assign(new Error('The operation was aborted'), { name: 'TimeoutError' });
    }) as unknown as typeof fetch;
    const verifier = createCloudflareTurnstileVerifier({ secret: SECRET, fetchImpl, onError });

    await expect(verifier.verify({ token: 'tok' })).resolves.toBe(false);
    expect(onError).toHaveBeenCalledOnce();
  });

  it('fails OPEN (true) on a network error when failOpen is set (degraded-mode policy)', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('ECONNREFUSED');
    }) as unknown as typeof fetch;
    const verifier = createCloudflareTurnstileVerifier({ secret: SECRET, failOpen: true, fetchImpl });

    await expect(verifier.verify({ token: 'tok' })).resolves.toBe(true);
  });

  it('fails CLOSED (false) on a non-2xx siteverify response', async () => {
    const { fetchImpl } = mockFetch({ success: true }, { ok: false, status: 503 });
    const verifier = createCloudflareTurnstileVerifier({ secret: SECRET, fetchImpl });

    await expect(verifier.verify({ token: 'tok' })).resolves.toBe(false);
  });

  it('passes the idempotency_key (UUID) through to siteverify', async () => {
    const { fetchImpl, calls } = mockFetch({ success: true });
    const verifier = createCloudflareTurnstileVerifier({
      secret: SECRET,
      fetchImpl,
      idempotencyKey: () => 'fixed-idem-key-uuid',
    });

    await verifier.verify({ token: 'tok' });
    expect(calls[0]?.body.get('idempotency_key')).toBe('fixed-idem-key-uuid');
  });

  it('passes remoteip through when provided, and omits it when absent', async () => {
    const withIp = mockFetch({ success: true });
    const v1 = createCloudflareTurnstileVerifier({ secret: SECRET, fetchImpl: withIp.fetchImpl });
    await v1.verify({ token: 'tok', remoteIp: '203.0.113.7' });
    expect(withIp.calls[0]?.body.get('remoteip')).toBe('203.0.113.7');

    const noIp = mockFetch({ success: true });
    const v2 = createCloudflareTurnstileVerifier({ secret: SECRET, fetchImpl: noIp.fetchImpl });
    await v2.verify({ token: 'tok' });
    expect(noIp.calls[0]?.body.has('remoteip')).toBe(false);
  });

  it('rejects (false) a configured verifier when NO token is present — without calling siteverify', async () => {
    const { fetchImpl, calls } = mockFetch({ success: true });
    const verifier = createCloudflareTurnstileVerifier({ secret: SECRET, fetchImpl });

    await expect(verifier.verify({})).resolves.toBe(false);
    expect(calls).toHaveLength(0); // short-circuit — no round-trip
  });

  it('throws at construction when the secret is empty', () => {
    expect(() => createCloudflareTurnstileVerifier({ secret: '' })).toThrow(/non-empty secret/);
  });
});

describe('noopTurnstileVerifier', () => {
  it('always resolves true (the no-secret default — keeps the stack hermetic)', async () => {
    await expect(noopTurnstileVerifier.verify({})).resolves.toBe(true);
    await expect(noopTurnstileVerifier.verify({ token: 'anything' })).resolves.toBe(true);
  });
});
