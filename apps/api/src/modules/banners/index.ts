// Banner/Popup module barrel — Story 10.9 (Task 4).
//
// TWO surfaces with deliberately different security postures, registered together:
//   · the ADMIN authoring surface (list/create/read/edit + publish/retract), gated on the NEW
//     `banner.manage` key (pariwar-dimension, catalog v28);
//   · the MEMBER surface (the resolved banner+popup read + the idempotent dismiss), gated ONLY by a
//     member session — no RBAC key, no scope-resolution hook, its own `openScopeTx`, 404-not-403.
//
// The domain owns the workflow (the legality reducer, the tone-review gate, the content-hash
// revision rule, the total-order collision resolver). NOTHING is enqueued and nothing fans out:
// visibility is a pure read-time window (Decision 2) and banners are in-app, not channel-dispatched.
// NO repo.ts — handlers talk to @twt/domain directly in a scope tx.

import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';
import { registerMemberBannerRoutes } from './member-routes.js';
import { registerBannerRoutes } from './routes.js';

export function registerBannerModule(app: FastifyInstance, deps: AppDeps): void {
  registerBannerRoutes(app, deps);
  registerMemberBannerRoutes(app, deps);
}
