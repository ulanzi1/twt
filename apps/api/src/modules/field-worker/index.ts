// The FIELD WORKER admin surface — Story 13.1. The first production caller of the field-worker primitive and of Story 13.2's
// attribution-code registry (through the door `attribution-code-access.ts`, beside this file). Story 13.1: register a worker.
// Story 13.1a: approve a worker, read an active worker's code by hand, and the reads its screens need (the list, one worker's
// identity, the recorded districts). Story 13.1b: the code SMS (a jobs sweep). Story 13.1c: a Pariwar Admin's direct move,
// suspend / reactivate / terminate, and the worker's log. The District-Admin move request and the notices are 13.1d's.

import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';
import { registerFieldWorkerRoutes } from './routes.js';

export function registerFieldWorkerModule(app: FastifyInstance, deps: AppDeps): void {
  registerFieldWorkerRoutes(app, deps);
}
