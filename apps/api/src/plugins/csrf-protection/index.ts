// CSRF protection (AC-3) — double-submit-cookie via @fastify/csrf-protection +
// a defense-in-depth Origin/Referer check.
//
// SameSite=Lax (the session cookie) is the baseline; this is the second line. The
// plugin uses `sessionPlugin: '@fastify/session'` so the CSRF secret lives in the
// admin session (not a separate cookie) — a token is minted by `reply.generateCsrf()`
// (exposed at GET /_meta/csrf) and validated by `app.csrfProtection` on the
// authenticated state-changing routes (passkey register, recovery consume,
// password-reset consume, step-up — wired at their route registration).
//
// The Origin/Referer hook below runs on EVERY state-changing request as an
// independent layer (CSRF Dev Note point 4): a browser always sends `Origin` on a
// cross-origin POST, so a present-but-mismatched Origin is rejected. Non-browser
// clients (server-to-server, the generated api-client) send neither — not a CSRF
// vector (CSRF needs a cookie-bearing browser) — so "both absent" is allowed.

import fastifyCsrf from '@fastify/csrf-protection';
import type { FastifyInstance, FastifyReply, FastifyRequest, onRequestHookHandler } from 'fastify';

import type { AppDeps } from '../../context.js';
import { ForbiddenError } from '../../http-errors.js';

const STATE_CHANGING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export async function registerCsrf(app: FastifyInstance): Promise<void> {
  await app.register(fastifyCsrf, {
    sessionPlugin: '@fastify/session',
  });
}

/** Parse an origin string from a URL-ish header value; null if unparseable. */
function originOf(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

/**
 * onRequest hook factory: reject a state-changing request whose Origin (or, absent
 * Origin, Referer) is present but does not match the configured expected origin.
 */
export function originCheckHook(deps: AppDeps): onRequestHookHandler {
  const expected = originOf(deps.config.webauthn.expectedOrigin) ?? deps.config.webauthn.expectedOrigin;
  return function onRequest(
    request: FastifyRequest,
    _reply: FastifyReply,
    done: (err?: Error) => void,
  ): void {
    if (!STATE_CHANGING.has(request.method)) {
      done();
      return;
    }
    const origin = originOf(request.headers.origin) ?? originOf(request.headers.referer);
    // Both absent → non-browser client → not a CSRF vector → allow.
    if (origin === null) {
      done();
      return;
    }
    if (origin !== expected) {
      done(new ForbiddenError('Origin not allowed', 'auth.csrf_origin'));
      return;
    }
    done();
  };
}
