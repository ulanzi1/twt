// The Trust's review of the family memorial — admin module (Story 11b.4). The family's side is `../memorial/`.

import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';
import { registerMemorialReviewRoutes } from './routes.js';

export function registerMemorialReviewModule(app: FastifyInstance, deps: AppDeps): void {
  registerMemorialReviewRoutes(app, deps);
}
