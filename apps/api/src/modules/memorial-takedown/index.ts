// The helpline's take-down of a family memorial at the nominee's request (Story 11b.4a — `#decision-2026-10-27-412` MP6–MP9).

import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';
import { registerMemorialTakedownRoutes } from './routes.js';

export function registerMemorialTakedownModule(app: FastifyInstance, deps: AppDeps): void {
  registerMemorialTakedownRoutes(app, deps);
}
