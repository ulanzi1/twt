// requireAdminSession — the authenticated-admin gate (Story 1.9, §2.4).
//
// A preHandler that asserts a full admin session: `session.userId` is set AND the
// session is within its ABSOLUTE 7-day timeout (the cookie enforces the 12h idle
// timeout; the absolute cap is tracked in the session + checked here). On failure
// it destroys the session (defense-in-depth) and 401s. On success it back-fills
// `request.requestContext.actorId` so downstream code + the audit trail carry it.
//
// Used by every protected route — the global admin routes (passkey enroll, recovery,
// step-up) and, ahead of scope-resolution, the `/p/:pariwarId/…` scoped routes.

import type { FastifyRequest, preHandlerHookHandler } from 'fastify';

import type { AppDeps } from '../../../context.js';
import { UnauthorizedError } from '../../../http-errors.js';

/**
 * Marks a preHandler as the admin-session login-wall. The AC-2 fails-closed guard
 * (login-wall.spec.ts) introspects the route table for this marker so any
 * authenticated route that forgets the gate — and is not on the explicit public
 * allowlist — fails CI, not prod. (Story 1.14.)
 */
export const ADMIN_SESSION_GUARD = Symbol('twt.requireAdminSession');

export function requireAdminSession(deps: AppDeps): preHandlerHookHandler {
  const guard: preHandlerHookHandler = async function preHandler(request: FastifyRequest): Promise<void> {
    const userId = request.session.userId;
    if (!userId) {
      throw new UnauthorizedError('Authentication required', 'auth.session_required');
    }
    const absoluteExpiry = request.session.absoluteExpiry;
    // Reject if absoluteExpiry is absent (migrated/corrupted row) OR past — both destroy + 401.
    if (typeof absoluteExpiry !== 'number' || deps.clock().getTime() > absoluteExpiry) {
      await request.session.destroy();
      throw new UnauthorizedError('Session expired', 'auth.session_expired');
    }
    request.requestContext.actorId = userId;
  };
  // Tag the returned handler so the AC-2 route-table guard can recognise it.
  Object.defineProperty(guard, ADMIN_SESSION_GUARD, { value: true, enumerable: false });
  return guard;
}
