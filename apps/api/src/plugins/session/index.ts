// @fastify/session registration with the Postgres-backed store (AC-3).
//
// Cookie posture (§2.4): HttpOnly + Secure + SameSite=Lax, idle timeout 12h.
// `rolling: true` refreshes the idle window on activity; the 7-day ABSOLUTE
// timeout is enforced in the auth layer (it tracks session creation time —
// @fastify/session only models idle expiry). `saveUninitialized: false` so a
// request that never touches the session (health probe) never writes a row.
// Server-side revocation is `store.destroy(sid)` / `regenerate()` (§2.4).

import fastifySession from '@fastify/session';
import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';
import { PgSessionStore } from './store.js';

declare module 'fastify' {
  interface FastifyInstance {
    /** The session store — exposed for the FR-56 suspension cascade seam. */
    adminSessionStore: PgSessionStore;
  }
}

export const ADMIN_SESSION_COOKIE = 'twt_admin_sid';

export async function registerSession(app: FastifyInstance, deps: AppDeps): Promise<void> {
  const store = new PgSessionStore(deps.pool, {
    fallbackTtlMs: deps.config.sessionIdleMs,
    now: deps.clock,
  });

  await app.register(fastifySession, {
    secret: deps.config.sessionSecret,
    store,
    cookieName: ADMIN_SESSION_COOKIE,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: deps.config.cookieSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: deps.config.sessionIdleMs, // ms — @fastify/session cookie.maxAge is milliseconds
    },
  });

  app.decorate('adminSessionStore', store);
}
