// Login-wall fails-closed guard (Story 1.14, AC-2 — FR-90 mechanism) — hermetic.
//
// `requireAdminSession` already 401s on an absent/expired session. This proves
// "authenticated ⇒ guarded" holds BY CONSTRUCTION: walk the real route table and
// assert every route NOT on the explicit public allowlist carries the session gate
// (tagged with ADMIN_SESSION_GUARD). A future authenticated route that forgets the
// preHandler — and is not deliberately allowlisted — fails CI, not prod.
//
// The public allowlist is the security-reviewed set of pre-session surfaces: health,
// the auth-establishment flow (login + the MFA/recovery/reset steps that RUN before a
// full session exists), the CSRF-token mint, swagger, and the honeypot traps. Adding
// a route here is an explicit decision; forgetting BOTH the allowlist entry and the
// gate fails the test (fails closed).

import { describe, expect, it } from 'vitest';

import { MEMBER_SESSION_GUARD } from '../../src/modules/auth/shared/member-session-guard.js';
import { ADMIN_SESSION_GUARD } from '../../src/modules/auth/shared/session-guard.js';
import type { TurnstileVerifier } from '../../src/modules/auth/shared/turnstile.js';
import { HONEYPOT_PATHS } from '../../src/plugins/security-headers/index.js';
import { getCollectedRoutes } from '../../src/route-registry.js';
import { createTestApp, teardown } from './_setup.js';

const rejectingTurnstile: TurnstileVerifier = { verify: async (): Promise<boolean> => false };

/** `${METHOD} ${url}` keys that legitimately run WITHOUT a full admin session. */
const PUBLIC_ALLOWLIST = new Set<string>([
  'GET /api/v1/_meta/health',
  'GET /api/v1/_meta/ready',
  'GET /api/v1/auth/csrf',
  'POST /api/v1/auth/login',
  // MFA / recovery / reset steps run on the pending-MFA session, BEFORE a full
  // admin session is established — they cannot require requireAdminSession.
  'POST /api/v1/auth/passkey/register/options',
  'POST /api/v1/auth/passkey/register/verify',
  'POST /api/v1/auth/passkey/authenticate/options',
  'POST /api/v1/auth/passkey/authenticate/verify',
  'POST /api/v1/auth/recovery/consume',
  'POST /api/v1/auth/password-reset/request',
  'POST /api/v1/auth/password-reset/consume',
  // ── Story 3.2 — member mobile+OTP auth: pre-session surfaces ─────────────────
  // OTP request/verify, multi-Pariwar scope select, and token refresh all run
  // BEFORE a member session exists (bearer-token model) — they cannot require the
  // member-session guard. The member step-up routes + the probe ARE guarded
  // (MEMBER_SESSION_GUARD), so they are NOT allowlisted.
  'POST /api/v1/member/auth/otp/request',
  'POST /api/v1/member/auth/otp/verify',
  'POST /api/v1/member/auth/otp/select-pariwar',
  'POST /api/v1/member/auth/token/refresh',
  // ── Story 10.21 AC-R1 — the member-direct export DELIVERY redemption ─────────
  // ⛔ DELIBERATELY UNAUTHENTICATED, and this allowlist entry is where that decision is
  // visible. The subject is a TERMINATED member: Niyamavali §8.4 ends authenticated
  // access while statutory rights survive, so the delivery route cannot require a
  // session — issuing one is precisely what the instrument forecloses. Ruled
  // member-direct by Decision `2026-08-14-109` clause 1.
  // ⚠ It is NOT an open surface. Redemption needs TWO secrets — the unguessable
  // `grantId` in the path AND the OTP delivered to the registered mobile — the grant is
  // one-time (burned by a conditional UPDATE) and short-lived, and EVERY failure mode
  // (unknown / spent / expired / wrong code / staff-mediated channel) returns the SAME
  // 404, so it is not an existence oracle. ⛔ It carries the named WRITE rate limit — the TIGHTER of
  // the two named tiers. (This comment said "read" until the round-2 review: the route had been moved
  // to `limits.write` by an earlier review finding and the allowlist's justification was not updated
  // with it. This entry is the designated place where "deliberately unauthenticated" is DEFENDED, so
  // half a defence being false is the whole problem — and it is now asserted below, not just asserted
  // about.)
  // ⛔ Do not "fix" this by adding a session guard — that deletes the route's purpose.
  'POST /api/v1/member-data-rights/delivery/:grantId/redeem',
  // Story 3.6a — first-signup member creation is PUBLIC (pre-session): the caller holds a
  // signup_continuation bearer (intent-scoped, single-use), not a member session, so it cannot
  // carry requireMemberSession. It is authenticated-equivalent via that verified-mobile token
  // (re-derived blind index must match the token sub), exactly like /otp/verify.
  'POST /api/v1/member/auth/signup/create',
  // Story 3.3b — the DigiLocker OAuth callback is PUBLIC by design (R3): DigiLocker
  // redirects the browser here with ?state&code and NO member JWT, so it cannot carry
  // requireMemberSession. It is authenticated-equivalent via the unguessable OAuth `state`
  // (resolves the kyc_transaction's member_id + pariwar_id), exactly like the OTP routes.
  // The other KYC routes (initiate/confirm/manual/status) ARE member-session-gated.
  'POST /api/v1/kyc/callback',
  // Developer-convenience OpenAPI doc (read-only, no data).
  'GET /docs/json',
  // Story 5.4 — the WhatsApp inbound-webhook ingress (§3.11) is PUBLIC by design: Meta is unauthenticated,
  // so it cannot carry a member/admin session. Its auth is the per-Pariwar verify-token (GET challenge) +
  // the X-Hub-Signature-256 HMAC over the raw body (POST) — verified in the handler, fail-closed (403).
  'GET /api/v1/webhooks/whatsapp/:pariwarId',
  'POST /api/v1/webhooks/whatsapp/:pariwarId',
  // Story 5.5 — the Telegram inbound-update webhook (§3.11) is PUBLIC by design: Telegram is unauthenticated,
  // so it cannot carry a member/admin session. Its auth is the per-Pariwar X-Telegram-Bot-Api-Secret-Token
  // header (constant-time compare) — verified in the handler, fail-closed (403). Telegram is POST-only.
  'POST /api/v1/webhooks/telegram/:pariwarId',
  // Honeypot traps are public by design (bot-bait); added programmatically below.
  ...HONEYPOT_PATHS.map((p) => `GET ${p}`),
]);

function hasSessionGuard(preHandlers: readonly unknown[]): boolean {
  // A route is "guarded" if it carries EITHER the admin-session guard OR the
  // member-session guard (Story 3.2) — both are login-walls for their surface.
  return preHandlers.some(
    (h) =>
      typeof h === 'function' &&
      ((h as unknown as Record<symbol, unknown>)[ADMIN_SESSION_GUARD] === true ||
        (h as unknown as Record<symbol, unknown>)[MEMBER_SESSION_GUARD] === true),
  );
}

describe('Login-wall fails-closed guard (AC-2, hermetic — no DB)', () => {
  it('every non-allowlisted route carries the requireAdminSession gate', async () => {
    const t = await createTestApp();
    try {
      const routes = getCollectedRoutes(t.app);
      expect(routes.length).toBeGreaterThan(0); // registry actually populated

      const unguarded: string[] = [];
      let guarded = 0;
      for (const route of routes) {
        // HEAD is auto-derived by Fastify from each GET and shares its preHandlers,
        // so the GET check already covers it — skip to avoid double-bookkeeping.
        if (route.method === 'HEAD') continue;
        const key = `${route.method} ${route.url}`;
        if (PUBLIC_ALLOWLIST.has(key)) continue;
        if (hasSessionGuard(route.preHandlers)) {
          guarded += 1;
        } else {
          unguarded.push(key);
        }
      }

      expect(unguarded).toEqual([]);
      // Not vacuous — there is a real set of authenticated routes under the gate.
      expect(guarded).toBeGreaterThanOrEqual(6);
    } finally {
      await teardown(t);
    }
  });

  it('an authenticated route returns 401 (fails closed) when called without a session', async () => {
    const t = await createTestApp();
    try {
      // GET (no body schema) so validation passes and the gate is what fires.
      const res = await t.app.inject({ method: 'GET', url: '/api/v1/auth/session' });
      expect(res.statusCode).toBe(401);
      expect(res.json<{ error: { code: string } }>().error.code).toBe('auth.session_required');
    } finally {
      await teardown(t);
    }
  });

  it('the public login route is reachable WITHOUT a session (allowlist is real)', async () => {
    // A rejecting Turnstile makes login 401 with the generic credential envelope
    // BEFORE any DB work — so this stays hermetic. The point: the failure is
    // auth.invalid_credentials (the handler ran), NOT auth.session_required (the
    // login-wall did not block a pre-session route).
    const t = await createTestApp({ turnstile: rejectingTurnstile });
    try {
      const res = await t.app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        headers: { origin: 'http://localhost:3001' },
        payload: { email: 'nobody@example.test', password: 'a-sufficiently-long-password' },
      });
      expect(res.statusCode).toBe(401);
      expect(res.json<{ error: { code: string } }>().error.code).toBe('auth.invalid_credentials');
    } finally {
      await teardown(t);
    }
  });

  it('⭐ the unauthenticated redemption route carries the WRITE rate-limit tier the allowlist claims', async () => {
    // ⛔ THE ALLOWLIST ENTRY IS A DEFENCE, AND HALF OF IT WAS FALSE. The comment above claimed the
    // route "carries the named read rate limit" while `routes.ts` had already been moved to
    // `limits.write` by an earlier review — and NOTHING asserted which tier was configured, so the
    // drift was invisible. An entry defending "deliberately unauthenticated" must be true in every
    // clause, or the next reviewer either accepts a wrong fact or re-opens a settled question.
    const t = await createTestApp();
    try {
      const routes = getCollectedRoutes(t.app);
      // ⚠ COMPARED BY OBJECT IDENTITY, NOT BY `max`. `namedRateLimits(deps)` is called ONCE per
      // module registration, so every route on the same tier shares the SAME config object — while the
      // test environment sets every tier's `max` to the same large number, which makes a value
      // comparison pass vacuously. Identity survives that.
      const tierOf = (method: string, url: string): unknown => {
        const r = routes.find((x) => x.method === method && x.url === url);
        expect(r, `route not found: ${method} ${url}`).toBeDefined();
        const cfg = r!.config as { rateLimit?: unknown } | undefined;
        expect(cfg?.rateLimit, `${method} ${url} declares no rateLimit`).toBeDefined();
        return cfg!.rateLimit;
      };

      // Reference tiers, read off the SAME live route table rather than re-derived from config.
      const writeTier = tierOf('POST', '/api/v1/p/:pariwarId/member-data-rights/export');
      const readTier = tierOf('GET', '/api/v1/p/:pariwarId/member-data-rights/export/active');
      // Without this the comparison below could pass vacuously if both names resolved to one object.
      expect(writeTier, 'the two named tiers must be distinct objects for this to have teeth').not.toBe(readTier);

      const redeem = tierOf('POST', '/api/v1/member-data-rights/delivery/:grantId/redeem');
      expect(redeem, 'the redemption route must be on the WRITE (tighter) tier').toBe(writeTier);
      expect(redeem, 'the redemption route must NOT be on the looser read tier').not.toBe(readTier);
    } finally {
      await teardown(t);
    }
  });

});
