// The family memorial — member module (Story 11b.4). The Trust's review is `../memorial-review/`.

import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';
import { registerMemorialRoutes } from './routes.js';

export function registerMemorialModule(app: FastifyInstance, deps: AppDeps): void {
  registerMemorialRoutes(app, deps);
}
