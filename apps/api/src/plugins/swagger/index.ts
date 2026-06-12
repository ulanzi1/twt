// @fastify/swagger registration (AC-5, §3.1) — live OpenAPI from the Zod route
// schemas via fastify-type-provider-zod's `jsonSchemaTransform`.
//
// Exposes the running app's spec at GET /docs/json (developer convenience). The
// COMMITTED, determinism-gated artifact is openapi/v1.yaml emitted by the contracts
// build-time script (D14-1.4 = build-time-script) — this runtime spec is NOT that
// gate's source of truth; the two stay aligned because both read the same Zod
// contracts in packages/contracts/.

import fastifySwagger from '@fastify/swagger';
import type { FastifyInstance } from 'fastify';
import { jsonSchemaTransform } from 'fastify-type-provider-zod';

export async function registerSwagger(app: FastifyInstance): Promise<void> {
  await app.register(fastifySwagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'TWT API v1',
        version: '0.0.0',
        description: 'TWT admin-auth surface (Story 1.9). Canonical spec: openapi/v1.yaml.',
      },
    },
    transform: jsonSchemaTransform,
  });

  app.get('/docs/json', { schema: { hide: true } }, async () => app.swagger());
}
