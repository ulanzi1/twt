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
  // Developer-convenience OpenAPI doc (read-only, no data).
  'GET /docs/json',
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
});
