// The QUESTIONNAIRE CHAIN's routes — Story 6.33 (AC8; `2026-10-30-421` QE6 / QE7 / QE11). THE ROUTE TABLE (each preHandler
// array written out INLINE per route — a shared const was misread by a route gate in 6.27a):
//
//   TENANT — /api/v1/p/:pariwarId/questionnaire-versions…  [requireAdminSession, scopeResolutionHook, requirePermissionHook(key)]
//     GET    ""                       questionnaire.propose   the Pariwar's versions + the version in force (both kinds)
//     GET    "/:versionId"            questionnaire.propose   one version (404 ⇔ ⛔ its own AND ⛔ step scoped here or to all)
//     POST   ""                       questionnaire.propose   propose (from the version in force, or a named base)
//     POST   "/:versionId/approve"    questionnaire.approve   approve (QE9 + QE10 ticks)
//     POST   "/:versionId/return"     questionnaire.approve   return (a note)
//     POST   "/:versionId/withdraw"   questionnaire.propose   withdraw (the author only)
//   GLOBAL — /api/v1/global/questionnaire-versions…        [requireAdminSession, requireGlobalPermission(publish)] (+ requireStepUp on the acts)
//     GET    ""                       every version (+ in force for `?pariwarId=`) — the Super Admin's page reads THIS
//     GET    "/pariwars-keeping-own"  QE7 (a)'s list for make-live-for-ALL (`?kind=`)
//     GET    "/:versionId"            one version, its whole history
//     POST   "/:versionId/make-live"  + step-up — one Pariwar or ALL (`targetPariwarId: null`)
//     POST   "/direct"                + step-up — QE7 (b) / (c)
//     POST   "/revert"                + step-up — QE7 (d)
// ⛔ `/p/` for the publish acts: `scopeResolutionHook` 404s a Super Admin with ⛔ grant row in that Pariwar, and
// `requireGlobalPermission` adds nothing under `/p/`. Every write needs an `Idempotency-Key`.

import {
  QuestionnaireApproveRequest,
  QuestionnaireDirectRequest,
  QuestionnaireEmptyRequest,
  QuestionnaireMakeLiveRequest,
  QuestionnairePariwarsKeepingOwnResponse,
  QuestionnaireProposeRequest,
  QuestionnaireReturnRequest,
  QuestionnaireRevertRequest,
  QuestionnaireStepResponse,
  QuestionnaireVersionDetailResponse,
  QuestionnaireVersionId,
  QuestionnaireVersionKind,
  QuestionnaireVersionListResponse,
} from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { requireGlobalPermission, requirePermissionHook } from '../rbac/index.js';
import { requireStepUp } from '../step-up/gate.js';
import {
  createQuestionnaireVersionHandlers,
  QUESTIONNAIRE_APPROVE_KEY,
  QUESTIONNAIRE_PROPOSE_KEY,
  QUESTIONNAIRE_PUBLISH_KEY,
  QUESTIONNAIRE_PUBLISH_STEP_UP_CONTEXT,
} from './handlers.js';

const TAG = 'questionnaire-versions';
const TENANT = '/api/v1/p/:pariwarId/questionnaire-versions';
const GLOBAL = '/api/v1/global/questionnaire-versions';
const PariwarParam = z.object({ pariwarId: z.string().uuid() }).strict();
const VersionParam = z.object({ pariwarId: z.string().uuid(), versionId: QuestionnaireVersionId }).strict();
const GlobalVersionParam = z.object({ versionId: QuestionnaireVersionId }).strict();
const GlobalListQuery = z.object({ pariwarId: z.string().uuid().optional() }).strict();
const KindQuery = z.object({ kind: QuestionnaireVersionKind }).strict();

export function registerQuestionnaireVersionRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createQuestionnaireVersionHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();

  // ── TENANT ──────────────────────────────────────────────────────────────────────────────────────────────────────────
  r.get(
    TENANT,
    {
      schema: { params: PariwarParam, response: { 200: QuestionnaireVersionListResponse }, tags: [TAG] },
      preHandler: [requireAdminSession(deps), scopeResolutionHook(deps), requirePermissionHook(deps, QUESTIONNAIRE_PROPOSE_KEY)],
    },
    h.list,
  );
  r.get(
    `${TENANT}/:versionId`,
    {
      schema: { params: VersionParam, response: { 200: QuestionnaireVersionDetailResponse }, tags: [TAG] },
      preHandler: [requireAdminSession(deps), scopeResolutionHook(deps), requirePermissionHook(deps, QUESTIONNAIRE_PROPOSE_KEY)],
    },
    h.detail,
  );
  r.post(
    TENANT,
    {
      schema: { params: PariwarParam, body: QuestionnaireProposeRequest, response: { 200: QuestionnaireStepResponse }, tags: [TAG] },
      preHandler: [requireAdminSession(deps), scopeResolutionHook(deps), requirePermissionHook(deps, QUESTIONNAIRE_PROPOSE_KEY)],
    },
    h.propose,
  );
  r.post(
    `${TENANT}/:versionId/approve`,
    {
      schema: { params: VersionParam, body: QuestionnaireApproveRequest, response: { 200: QuestionnaireStepResponse }, tags: [TAG] },
      preHandler: [requireAdminSession(deps), scopeResolutionHook(deps), requirePermissionHook(deps, QUESTIONNAIRE_APPROVE_KEY)],
    },
    h.approve,
  );
  r.post(
    `${TENANT}/:versionId/return`,
    {
      schema: { params: VersionParam, body: QuestionnaireReturnRequest, response: { 200: QuestionnaireStepResponse }, tags: [TAG] },
      preHandler: [requireAdminSession(deps), scopeResolutionHook(deps), requirePermissionHook(deps, QUESTIONNAIRE_APPROVE_KEY)],
    },
    h.return,
  );
  r.post(
    `${TENANT}/:versionId/withdraw`,
    {
      schema: { params: VersionParam, body: QuestionnaireEmptyRequest, response: { 200: QuestionnaireStepResponse }, tags: [TAG] },
      preHandler: [requireAdminSession(deps), scopeResolutionHook(deps), requirePermissionHook(deps, QUESTIONNAIRE_PROPOSE_KEY)],
    },
    h.withdraw,
  );

  // ── GLOBAL (the Super Admin) ────────────────────────────────────────────────────────────────────────────────────────
  r.get(
    GLOBAL,
    {
      schema: { querystring: GlobalListQuery, response: { 200: QuestionnaireVersionListResponse }, tags: [TAG] },
      preHandler: [requireAdminSession(deps), requireGlobalPermission(deps, QUESTIONNAIRE_PUBLISH_KEY)],
    },
    h.globalList,
  );
  r.get(
    `${GLOBAL}/pariwars-keeping-own`,
    {
      schema: { querystring: KindQuery, response: { 200: QuestionnairePariwarsKeepingOwnResponse }, tags: [TAG] },
      preHandler: [requireAdminSession(deps), requireGlobalPermission(deps, QUESTIONNAIRE_PUBLISH_KEY)],
    },
    h.pariwarsKeepingOwn,
  );
  r.get(
    `${GLOBAL}/:versionId`,
    {
      schema: { params: GlobalVersionParam, response: { 200: QuestionnaireVersionDetailResponse }, tags: [TAG] },
      preHandler: [requireAdminSession(deps), requireGlobalPermission(deps, QUESTIONNAIRE_PUBLISH_KEY)],
    },
    h.globalDetail,
  );
  r.post(
    `${GLOBAL}/:versionId/make-live`,
    {
      schema: { params: GlobalVersionParam, body: QuestionnaireMakeLiveRequest, response: { 200: QuestionnaireStepResponse }, tags: [TAG] },
      preHandler: [requireAdminSession(deps), requireGlobalPermission(deps, QUESTIONNAIRE_PUBLISH_KEY), requireStepUp(deps, QUESTIONNAIRE_PUBLISH_STEP_UP_CONTEXT)],
    },
    h.makeLive,
  );
  r.post(
    `${GLOBAL}/direct`,
    {
      schema: { body: QuestionnaireDirectRequest, response: { 200: QuestionnaireStepResponse }, tags: [TAG] },
      preHandler: [requireAdminSession(deps), requireGlobalPermission(deps, QUESTIONNAIRE_PUBLISH_KEY), requireStepUp(deps, QUESTIONNAIRE_PUBLISH_STEP_UP_CONTEXT)],
    },
    h.direct,
  );
  r.post(
    `${GLOBAL}/revert`,
    {
      schema: { body: QuestionnaireRevertRequest, response: { 200: QuestionnaireStepResponse }, tags: [TAG] },
      preHandler: [requireAdminSession(deps), requireGlobalPermission(deps, QUESTIONNAIRE_PUBLISH_KEY), requireStepUp(deps, QUESTIONNAIRE_PUBLISH_STEP_UP_CONTEXT)],
    },
    h.revert,
  );
}
