// Survey/Poll module barrel — Story 10.15 (Task 6/7).
//
// TWO surfaces with deliberately different security postures, registered together:
//   · the ADMIN authoring + RESULTS surface (list/create/read/edit + publish/close + the aggregate
//     and the unattributed free-text read), gated on the NEW `survey.manage` key (pariwar-dimension,
//     catalog v36, keys 43 → 44);
//   · the MEMBER surface (the open-survey read + the one-per-member response), gated ONLY by a member
//     session — no RBAC key, no scope-resolution hook, its own `openScopeTx`, 404-not-403.
//
// The domain owns the workflow (the legality reducer, the read-time window, the tone-review gate, the
// post-publish freeze, the question/answer validators, the audience predicate, the aggregate).
//
// ── ⚠ A SURVEY IS ADVISORY AND HAS NO GOVERNANCE EFFECT ──────────────────────────────────────
// `response_threshold` is FR-58's "optional quorum threshold" renamed, and it gates nothing: no
// status, no read, no job, no decision. It feeds one informational boolean on the aggregate and is
// absent from the member DTO entirely. The first request for a survey result that binds anything is a
// Trustee Panel routing note and a Deed question, not a change here.
//
// UNLIKE 10.9, publish DOES enqueue: a `SURVEY_PUBLISH` job whose worker (apps/jobs) owns the member
// fan-out, because that path needs MEMBER Tier-1 field crypto and this is the admin-identity request
// path (the 10.4 crypto boundary). The enqueue is best-effort — a fan-out failure never rolls back a
// publish. NO repo.ts — handlers talk to @twt/domain directly in a scope tx.

import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';
import { registerMemberSurveyRoutes } from './member-routes.js';
import { registerSurveyRoutes } from './routes.js';

export { createPgBossSurveyPublishEnqueuer, type SurveyPublishJobPayload } from './queue.js';

export function registerSurveyModule(app: FastifyInstance, deps: AppDeps): void {
  registerSurveyRoutes(app, deps);
  registerMemberSurveyRoutes(app, deps);
}
