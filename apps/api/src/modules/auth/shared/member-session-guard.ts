// requireMemberSession — the authenticated-member gate (Story 3.2, Task 4, §2.4).
//
// Members are TOKEN-BEARER (no @fastify/session): a preHandler that verifies the
// access-token JWT from the Authorization header (algorithm pinned by the jwt
// plugin), asserts it is an ACCESS token (`typ === 'access'` — a signup-continuation
// or pariwar-select token must NOT authorize API calls), and back-fills
// `request.requestContext.actorId = member_id` + `.pariwarId` so downstream code +
// the audit trail carry them. The JWT's own `exp` (≤15 min) is enforced by jwtVerify.
//
// ── login-wall CI gate parity (Story 1.14) ────────────────────────────────────
// Tagged with `MEMBER_SESSION_GUARD` so login-wall.spec.ts recognises member-gated
// routes the same way it recognises ADMIN_SESSION_GUARD — any authenticated route
// that forgets a guard (and is not allowlisted) fails CI, not prod.

import type { FastifyRequest, preHandlerHookHandler } from 'fastify';

import type { AppDeps } from '../../../context.js';
import { UnauthorizedError } from '../../../http-errors.js';
import { MEMBER_ACCESS_TYP } from '../../../plugins/jwt/index.js';
import type { MemberJwtClaims } from '../../../plugins/jwt/index.js';

/** Marks a preHandler as the member-session login-wall (login-wall.spec.ts gate). */
export const MEMBER_SESSION_GUARD = Symbol('twt.requireMemberSession');

export function requireMemberSession(deps: AppDeps): preHandlerHookHandler {
  const guard: preHandlerHookHandler = async function preHandler(request: FastifyRequest): Promise<void> {
    let payload: MemberJwtClaims & { iat: number; exp: number };
    try {
      payload = await request.jwtVerify<MemberJwtClaims & { iat: number; exp: number }>();
    } catch {
      // Missing / malformed / expired / wrong-algorithm token → generic 401.
      throw new UnauthorizedError('Authentication required', 'auth.session_required');
    }
    if (payload.typ !== MEMBER_ACCESS_TYP) {
      // A continuation / pariwar-select token is NOT a session bearer.
      throw new UnauthorizedError('Authentication required', 'auth.session_required');
    }
    request.requestContext.actorId = payload.sub;
    request.requestContext.pariwarId = payload.pariwar_id;
  };
  // Tag so the AC-2 route-table guard (login-wall.spec.ts) recognises it.
  Object.defineProperty(guard, MEMBER_SESSION_GUARD, { value: true, enumerable: false });
  // `void deps` — bound for symmetry with requireAdminSession; the clock/exp check
  // is delegated to jwtVerify, so deps is currently unused beyond the closure.
  void deps;
  return guard;
}
