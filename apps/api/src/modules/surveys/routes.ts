// Survey/Poll admin routes — Story 10.15 (Task 6; AC1/AC2/AC4/AC7/AC9).
//
// EIGHT scope-gated admin routes — the survey authoring + results surface:
//   · GET   …/p/:pariwarId/surveys                                       → the paginated
//                                                                          derived-state-filterable list
//   · POST  …/p/:pariwarId/surveys                                       → create a draft
//   · GET   …/p/:pariwarId/surveys/:surveyId                             → read one survey
//   · PATCH …/p/:pariwarId/surveys/:surveyId                             → edit (a published survey may
//                                                                          only have valid_until EXTENDED)
//   · POST  …/p/:pariwarId/surveys/:surveyId/publish                     → draft → published (tone-gated,
//                                                                          then enqueues the fan-out)
//   · POST  …/p/:pariwarId/surveys/:surveyId/close                       → draft|published → closed (terminal)
//   · GET   …/p/:pariwarId/surveys/:surveyId/aggregate                   → the counts-only results
//   · GET   …/p/:pariwarId/surveys/:surveyId/questions/:questionId/
//           free-text                                                    → the UNATTRIBUTED free text
//
// The route IS the security control: an authenticated HUMAN admin session + the NEW `survey.manage`
// key at `dimension: 'pariwar'` (value = scopeTx.pariwarId — the tenant IS the target, resolvable with
// no geo-tree; the helpdesk.create / news.manage / banner.manage precedent). NOT step-up-gated (a
// survey publish is NOT freeze-firing and is NOT in the AR-24 list). The author≠publisher fairness
// rule needs no separate identity check: the shipped tone-review gate is already default-deny on
// `reviewedBy === authoredBy`.
//
// ⚠ ONE key gates the WRITES and the RESULTS reads alike. That is not a widening: the free-text
// projection carries no member id, no row id and no ordinal (LBD-3), so the key confers no ability to
// learn who said what.
// ⚠ There is deliberately no route that "opens" or "expires" a survey: `valid_from`/`valid_until` are
// a pure READ-TIME window (AC2). And no route reopens a closed one — `closed` is terminal.
// The MEMBER surface lives in `member-routes.ts` and touches NO RBAC key at all.

import {
  CloseSurveyRequest,
  CreateSurveyRequest,
  PublishSurveyRequest,
  SurveyAggregateResponse,
  SurveyFreeTextListResponse,
  SurveyListResponse,
  SurveyResponse,
  UpdateSurveyRequest,
} from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { requirePermissionHook } from '../rbac/index.js';
import { createSurveyHandlers } from './handlers.js';

const TAG = 'surveys';

/** The NEW pariwar-dimension Survey/Poll admin key (Story 10.15, catalog v36; keys 43 → 44). */
const SURVEY_MANAGE_KEY = 'survey.manage';

const PariwarParam = z.object({ pariwarId: z.string().uuid() }).strict();
const SurveyParam = z.object({ pariwarId: z.string().uuid(), surveyId: z.string().uuid() }).strict();
const QuestionParam = z
  .object({ pariwarId: z.string().uuid(), surveyId: z.string().uuid(), questionId: z.string().uuid() })
  .strict();
const ListQuery = z
  .object({
    // The DERIVED display state (AC2) — five values, of which only `draft`/`closed` correspond to a
    // stored status; `scheduled`/`open`/`expired` are window predicates against the server clock.
    display_state: z.enum(['draft', 'scheduled', 'open', 'expired', 'closed']).optional(),
    limit: z.coerce.number().int().positive().max(200).optional(),
    offset: z.coerce.number().int().nonnegative().optional(),
  })
  .strict();
const PageQuery = z
  .object({
    limit: z.coerce.number().int().positive().max(200).optional(),
    offset: z.coerce.number().int().nonnegative().optional(),
  })
  .strict();

export function registerSurveyRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createSurveyHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const adminSession = requireAdminSession(deps);
  const scope = scopeResolutionHook(deps);
  // survey.manage at dimension:'pariwar' (EXPLICIT — the target IS the tenant; resolveValue defaults
  // to scopeTx.pariwarId, the news.manage / banner.manage / helpdesk.create pariwar-wide precedent; no
  // district — district_admin is DEFERRED because a district-ceiling grant can never satisfy this
  // check, and seeding one would be an inert capability).
  const requireSurvey = requirePermissionHook(deps, SURVEY_MANAGE_KEY, { dimension: 'pariwar' });
  const guard = [adminSession, scope, requireSurvey];

  r.get(
    '/api/v1/p/:pariwarId/surveys',
    {
      schema: { params: PariwarParam, querystring: ListQuery, response: { 200: SurveyListResponse }, tags: [TAG] },
      preHandler: guard,
    },
    h.list,
  );

  r.post(
    '/api/v1/p/:pariwarId/surveys',
    {
      schema: { params: PariwarParam, body: CreateSurveyRequest, response: { 201: SurveyResponse }, tags: [TAG] },
      preHandler: guard,
    },
    h.create,
  );

  r.get(
    '/api/v1/p/:pariwarId/surveys/:surveyId',
    {
      schema: { params: SurveyParam, response: { 200: SurveyResponse }, tags: [TAG] },
      preHandler: guard,
    },
    h.get,
  );

  r.patch(
    '/api/v1/p/:pariwarId/surveys/:surveyId',
    {
      schema: { params: SurveyParam, body: UpdateSurveyRequest, response: { 200: SurveyResponse }, tags: [TAG] },
      preHandler: guard,
    },
    h.update,
  );

  r.post(
    '/api/v1/p/:pariwarId/surveys/:surveyId/publish',
    {
      schema: { params: SurveyParam, body: PublishSurveyRequest, response: { 200: SurveyResponse }, tags: [TAG] },
      preHandler: guard,
    },
    h.publish,
  );

  r.post(
    '/api/v1/p/:pariwarId/surveys/:surveyId/close',
    {
      schema: { params: SurveyParam, body: CloseSurveyRequest, response: { 200: SurveyResponse }, tags: [TAG] },
      preHandler: guard,
    },
    h.close,
  );

  r.get(
    '/api/v1/p/:pariwarId/surveys/:surveyId/aggregate',
    {
      schema: { params: SurveyParam, response: { 200: SurveyAggregateResponse }, tags: [TAG] },
      preHandler: guard,
    },
    h.aggregate,
  );

  // ⭐ The one admin read that sees member-authored personal data — and the one that writes a
  // `survey.responses_viewed` audit line (carrying a COUNT, never the content).
  r.get(
    '/api/v1/p/:pariwarId/surveys/:surveyId/questions/:questionId/free-text',
    {
      schema: {
        params: QuestionParam,
        querystring: PageQuery,
        response: { 200: SurveyFreeTextListResponse },
        tags: [TAG],
      },
      preHandler: guard,
    },
    h.freeText,
  );
}
