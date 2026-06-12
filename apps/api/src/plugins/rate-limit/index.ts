// @fastify/rate-limit registration (AC-5 + the §2.2 "rate-limited per actor + per
// IP" discipline for step-up).
//
// A permissive GLOBAL limit (defense-in-depth against scripted abuse); the auth +
// step-up routes set tighter PER-ROUTE limits at their registration (separate cost
// vs abuse budgets, §2.2). The default keyGenerator is per-IP; the step-up route
// composes per-actor + per-IP in its own keyGenerator (Task 5).

import fastifyRateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';

export async function registerRateLimit(app: FastifyInstance, deps: AppDeps): Promise<void> {
  await app.register(fastifyRateLimit, {
    global: true,
    max: deps.config.globalRateMax,
    timeWindow: '1 minute',
  });
}
