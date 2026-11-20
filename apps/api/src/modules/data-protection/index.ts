// Story 14.3 — the data-protection module: the personal data breach register (`/api/v1/data-protection/…`, decision
// `2026-11-20-467`). It records incidents and serves the facts the notices are drafted from. It sends nothing.

import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';
import { registerDataProtectionRoutes } from './routes.js';

export function registerDataProtectionModule(app: FastifyInstance, deps: AppDeps): void {
  registerDataProtectionRoutes(app, deps);
}
