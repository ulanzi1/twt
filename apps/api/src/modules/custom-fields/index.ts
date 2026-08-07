// Per-Pariwar custom-field admin module barrel — Story 10.12 (Task 6).
//
// The FR-54 admin surface: the definition-set read (in-force + history), publish/retire, and the
// member value read/write. Wired into server.ts next to the feature-flags + news-blog + helpdesk
// modules. NO repo.ts — handlers talk to `@twt/domain`'s `customFields` namespace on the request's
// scope tx.
//
// ⚠ WHAT THIS MODULE DOES NOT OWN. It does not own the fence — that is
// `packages/domain/src/custom-fields/frozen-governance.ts`, called inside the domain writer, so it
// cannot be skipped by adding a route. It does not own the definition VOCABULARY (code, in the
// domain). And it does not render anything to a MEMBER: there is no member-facing dynamic form
// renderer in v1, deliberately — the UX spec has no form-builder or per-Pariwar settings grammar, and
// §11 calls component grammar "tenant-invariant", so building one here would mean inventing UX
// (recorded as a gated deferral + ESCALATION 5).

import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';
import { registerCustomFieldsRoutes } from './routes.js';

export { CUSTOM_FIELD_MANAGE_KEY, CUSTOM_FIELD_VIEW_KEY } from './handlers.js';

export function registerCustomFieldsModule(app: FastifyInstance, deps: AppDeps): void {
  registerCustomFieldsRoutes(app, deps);
}
