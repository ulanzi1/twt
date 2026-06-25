// Member-auth module entry (Story 3.2) — registers the member mobile+OTP auth
// surface (login OTP request/verify → JWT session + 90d refresh + 2 trusted devices,
// multi-Pariwar scope select, token refresh rotation, logout, and the member step-up
// OTP + requireMemberStepUp gate). Parallel to the admin module; shares the OTP /
// delivery / audit primitives in auth/shared.

import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../../context.js';
import { registerMemberAuthRoutes } from './member-auth.routes.js';

export function registerMemberAuthModule(app: FastifyInstance, deps: AppDeps): void {
  registerMemberAuthRoutes(app, deps);
}
