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

export function requireAdminSession(deps: AppDeps): preHandlerHookHandler {
  return async function preHandler(request: FastifyRequest): Promise<void> {
    const userId = request.session.userId;
    if (!userId) {
      throw new UnauthorizedError('Authentication required', 'auth.session_required');
    }
    const absoluteExpiry = request.session.absoluteExpiry;
    if (typeof absoluteExpiry === 'number' && deps.clock().getTime() > absoluteExpiry) {
      // Absolute timeout breached — revoke the session row + cookie.
      await request.session.destroy();
      throw new UnauthorizedError('Session expired', 'auth.session_expired');
    }
    request.requestContext.actorId = userId;
  };
}
