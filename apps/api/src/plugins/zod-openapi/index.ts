// Zod validator/serializer wiring (AC-5, §1.3 Zod-validator-per-route) via
// fastify-type-provider-zod.
//
// Sets the app's validator + serializer compilers so any route declaring a Zod
// schema in `{ schema: { body, querystring, params, response } }` validates the
// request and serializes the response through that schema. This is the §1.3
// "hand-written Zod contracts validate per route" guarantee at runtime — the
// contracts in `packages/contracts/src/auth/` are the schemas (Task 7).
//
// Stack reconciliation (recorded in ADR-0009): the §3.1 stack names
// `fastify-type-provider-zod` + `fastify-zod-openapi` + `@fastify/swagger`. The
// first two are COMPETING type providers and cannot both be the active one on the
// same instance; fastify-type-provider-zod (v5, the only one compatible with the
// repo's zod 3.25 — fastify-zod-openapi/v3 targets a different zod-openapi API) is
// wired here. The canonical OpenAPI artifact stays the build-time contracts script
// (`packages/contracts/scripts/emit-openapi.ts`, @asteasolutions/zod-to-openapi) —
// D14-1.4 = build-time-script. @fastify/swagger (plugins/swagger) exposes a live
// `/docs/json` derived from the same Zod route schemas as a developer convenience.

import type { FastifyInstance } from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';

export function registerZodOpenapi(app: FastifyInstance): void {
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
}
