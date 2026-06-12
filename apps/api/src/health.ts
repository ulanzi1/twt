// Health + readiness routes (AC-5, Task 1.5).
//
// `/_meta/health` is a DB-less liveness probe (the Task-1 smoke target — boots
// without DATABASE_URL). `/_meta/ready` pings the pool (readiness; integration-
// gated). Both validate their response through the shared `HealthResponse` Zod
// contract, exercising the fastify-type-provider-zod serializer end-to-end.

import { HealthResponse } from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import type { AppDeps } from './context.js';

export function registerHealthRoutes(app: FastifyInstance, deps: AppDeps): void {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.get(
    '/api/v1/_meta/health',
    { schema: { response: { 200: HealthResponse }, tags: ['_meta'] } },
    async () => ({ status: 'ok' as const, timestamp: deps.clock().toISOString() }),
  );

  r.get(
    '/api/v1/_meta/ready',
    { schema: { response: { 200: HealthResponse, 503: HealthResponse }, tags: ['_meta'] } },
    async (_request, reply) => {
      try {
        await deps.pool.query('SELECT 1');
        return { status: 'ok' as const, timestamp: deps.clock().toISOString() };
      } catch {
        return reply
          .status(503)
          .send({ status: 'degraded' as const, timestamp: deps.clock().toISOString() });
      }
    },
  );
}
