// A NOMINEE WHO IS ALSO A MEMBER — the member routes (Story 6.36e, Task 3; AC2, AC4).
//
// THREE routes, every one member-session-gated (`requireMemberSession`) and rate-limited PER MEMBER (`perMemberKey`,
// `hook: 'preHandler'` so the member id is set first — the 6.36b shape). The declarer's marks live under Life Events (the
// declare is there — NE4); the marked member's requests and answer under `/nominee-links`. The answer takes an
// `Idempotency-Key` in the handler. The requests list declares a bounded `limit` and pages by a `cursor`.

import {
  NomineeLinkAnswerRequest,
  NomineeLinkAnswerResponse,
  NomineeLinkParams,
  NomineeLinkRequestsQuery,
  NomineeLinkRequestsResponse,
  NomineeLinksView,
} from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import type { AppDeps } from '../../context.js';
import { perMemberKey, type RouteRateLimit } from '../../plugins/rate-limit/index.js';
import { requireMemberSession } from '../auth/shared/member-session-guard.js';
import { createNomineeLinksHandlers } from './handlers.js';

const TAG = 'member-nominee-links';
export const NOMINEE_LINKS_DECLARER_PATH = '/api/v1/member/life-events/nominee-links';
export const NOMINEE_LINKS_BASE = '/api/v1/member/nominee-links';

export function registerNomineeLinksRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createNomineeLinksHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const memberSession = requireMemberSession(deps);
  const write: RouteRateLimit = { max: deps.config.writeRateMax, timeWindow: '1 minute', keyGenerator: perMemberKey, hook: 'preHandler' };
  const read: RouteRateLimit = { max: deps.config.readRateMax, timeWindow: '1 minute', keyGenerator: perMemberKey, hook: 'preHandler' };

  r.get(
    NOMINEE_LINKS_DECLARER_PATH,
    {
      schema: { response: { 200: NomineeLinksView }, tags: [TAG] },
      config: { rateLimit: read },
      preHandler: [memberSession],
    },
    h.links,
  );

  r.get(
    `${NOMINEE_LINKS_BASE}/requests`,
    {
      schema: { querystring: NomineeLinkRequestsQuery, response: { 200: NomineeLinkRequestsResponse }, tags: [TAG] },
      config: { rateLimit: read },
      preHandler: [memberSession],
    },
    h.requests,
  );

  r.post(
    `${NOMINEE_LINKS_BASE}/requests/:linkId/answer`,
    {
      schema: { params: NomineeLinkParams, body: NomineeLinkAnswerRequest, response: { 200: NomineeLinkAnswerResponse }, tags: [TAG] },
      config: { rateLimit: write },
      preHandler: [memberSession],
    },
    h.answer,
  );
}
