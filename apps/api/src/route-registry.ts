// Route registry (Story 1.14, AC-2 + AC-3 — the "by construction" guard substrate).
//
// `collectRoutes(app)` installs an `onRoute` hook that records every registered
// route's (method, url, preHandlers, schema, config) into a WeakMap keyed by the app
// instance. The login-wall guard (AC-2) and the forced-pagination guard (AC-3) read
// it back via `getCollectedRoutes(app)` to PROVE — over the real route table, not a
// hand-maintained list — that every authenticated route carries the session gate and
// every collection-returning route declares a bounded page size. A future route that
// forgets either fails CI, not prod (the 1.13 "inert guard" lesson: a guard that
// never runs is worse than none — these run against the live table).
//
// Stored in a WeakMap (not an app decoration) so it adds no type surface and is
// GC'd with the app. Negligible cost (~20 small entries); also handy for diagnostics.

import type { FastifyInstance } from 'fastify';

/** One registered route as the onRoute hook sees it. */
export interface CollectedRoute {
  readonly method: string;
  readonly url: string;
  /** Normalised preHandler list (empty when none). */
  readonly preHandlers: readonly unknown[];
  /** The raw route schema (Zod schemas under fastify-type-provider-zod). */
  readonly schema: unknown;
  /** The route context config (carries `rateLimit`). */
  readonly config: unknown;
  /** `schema.hide === true` — excluded from the committed OpenAPI surface. */
  readonly hidden: boolean;
}

const registries = new WeakMap<FastifyInstance, CollectedRoute[]>();

/**
 * Install the onRoute collector. MUST be called before any route registration so it
 * captures the full table — buildServer calls it first thing.
 */
export function collectRoutes(app: FastifyInstance): void {
  const routes: CollectedRoute[] = [];
  registries.set(app, routes);
  app.addHook('onRoute', (routeOptions) => {
    const pre = routeOptions.preHandler;
    const preHandlers = pre === undefined ? [] : Array.isArray(pre) ? pre : [pre];
    const schema = routeOptions.schema as { hide?: boolean } | undefined;
    const methods = Array.isArray(routeOptions.method) ? routeOptions.method : [routeOptions.method];
    for (const method of methods) {
      routes.push({
        method,
        url: routeOptions.url,
        preHandlers,
        schema: routeOptions.schema,
        config: routeOptions.config,
        hidden: Boolean(schema?.hide),
      });
    }
  });
}

/** Read back the collected routes (empty if `collectRoutes` was never installed). */
export function getCollectedRoutes(app: FastifyInstance): readonly CollectedRoute[] {
  return registries.get(app) ?? [];
}
