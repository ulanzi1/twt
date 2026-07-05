// Push device-token registration routes — Story 5.2 (Task 4). Two POST routes, each behind its session
// guard (fail-closed — AI-4-3(a)/(b)):
//   · POST /api/v1/member/device-tokens (requireMemberSession) — the Story 3.2 app-open consumer.
//   · POST /api/v1/admin/device-tokens  (requireAdminSession)  — the Story 1.9 admin-auth consumer.
// Both share the DeviceTokenRegisterRequest body + DeviceTokenRegisterResponse ack (idempotent upsert).

import { DeviceTokenRegisterRequest, DeviceTokenRegisterResponse } from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import type { AppDeps } from '../../context.js';
import { requireMemberSession } from '../auth/shared/member-session-guard.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { createDeviceTokenHandlers } from './device-token.handlers.js';

const DEVICE_TOKEN_TAG = 'device-token';

export function registerDeviceTokenRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createDeviceTokenHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.post(
    '/api/v1/member/device-tokens',
    {
      schema: {
        body: DeviceTokenRegisterRequest,
        response: { 200: DeviceTokenRegisterResponse },
        tags: [DEVICE_TOKEN_TAG],
      },
      preHandler: [requireMemberSession(deps)],
    },
    h.registerMember,
  );

  r.post(
    '/api/v1/admin/device-tokens',
    {
      schema: {
        body: DeviceTokenRegisterRequest,
        response: { 200: DeviceTokenRegisterResponse },
        tags: [DEVICE_TOKEN_TAG],
      },
      preHandler: [requireAdminSession(deps)],
    },
    h.registerAdmin,
  );
}
