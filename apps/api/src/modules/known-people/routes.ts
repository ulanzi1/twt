// PEOPLE WHO KNOW ME — the member routes (Story 6.36b, Task 3; AC3–AC8, AC10).
//
// EIGHT routes under `/api/v1/member/known-people`, every one member-session-gated (`requireMemberSession` — the Story
// 1.14 login-wall gate covers them through the MEMBER_SESSION_GUARD tag) and rate-limited PER MEMBER (`perMemberKey`,
// `hook: 'preHandler'` so the member id is set first — ⛔ the per-session key, which falls back to the shared IP for
// token-bearer members). The writes (ask, remove, answer, withdraw) take an `Idempotency-Key` in the handler. Only an
// `active` member whom ⛔ claim names as the deceased may use any of the SEVEN people-who-know-me routes (`2026-10-15-333`
// call 1) — ONE 403 `known_people.not_available` otherwise (AC10). ⭐ THE ONE EXCEPTION is Story 6.36c's eighth,
// `GET /prompts` (RV2): it answers 200 to ANY member session — the home cards' WORKPLACE flags are for a wider set (the
// posting route's) — and every people flag on it is gated by that SAME caller predicate (false for anyone else). The two
// lists declare a
// bounded `limit` (the forced-pagination invariant); the requests list pages by a `cursor` (review 2026-10-15 R3). ⛔ A Turnstile gate: an `active` member is KYC'd and paid, and the
// matching path carries its own DB-backed caps (6.36a SW12).

import {
  KnownPeopleAnswerRequest,
  KnownPeopleContactMatchRequest,
  KnownPeopleContactMatchResponse,
  KnownPeopleLinkParams,
  KnownPeopleListQuery,
  KnownPeoplePromptsResponse,
  KnownPeopleRequestsQuery,
  KnownPeopleRequestsResponse,
  KnownPeopleWriteResponse,
  KnownPersonAskRequest,
  KnownPersonAskResponse,
  MyKnownPeopleResponse,
} from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import type { AppDeps } from '../../context.js';
import { perMemberKey, type RouteRateLimit } from '../../plugins/rate-limit/index.js';
import { requireMemberSession } from '../auth/shared/member-session-guard.js';
import { createKnownPeopleHandlers } from './handlers.js';

const TAG = 'member-known-people';
export const KNOWN_PEOPLE_BASE = '/api/v1/member/known-people';

export function registerKnownPeopleRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createKnownPeopleHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const memberSession = requireMemberSession(deps);
  const write: RouteRateLimit = { max: deps.config.writeRateMax, timeWindow: '1 minute', keyGenerator: perMemberKey, hook: 'preHandler' };
  const read: RouteRateLimit = { max: deps.config.readRateMax, timeWindow: '1 minute', keyGenerator: perMemberKey, hook: 'preHandler' };

  r.post(
    `${KNOWN_PEOPLE_BASE}/contact-matches`,
    {
      schema: { body: KnownPeopleContactMatchRequest, response: { 200: KnownPeopleContactMatchResponse }, tags: [TAG] },
      config: { rateLimit: write },
      preHandler: [memberSession],
    },
    h.contactMatches,
  );

  r.post(
    KNOWN_PEOPLE_BASE,
    {
      schema: { body: KnownPersonAskRequest, response: { 200: KnownPersonAskResponse, 201: KnownPersonAskResponse }, tags: [TAG] },
      config: { rateLimit: write },
      preHandler: [memberSession],
    },
    h.ask,
  );

  r.get(
    KNOWN_PEOPLE_BASE,
    {
      schema: { querystring: KnownPeopleListQuery, response: { 200: MyKnownPeopleResponse }, tags: [TAG] },
      config: { rateLimit: read },
      preHandler: [memberSession],
    },
    h.list,
  );

  // Story 6.36c (AC5; RV2) — the home prompts. ⭐ 200 to ANY member session (the people flags false for a non-caller).
  r.get(
    `${KNOWN_PEOPLE_BASE}/prompts`,
    {
      schema: { response: { 200: KnownPeoplePromptsResponse }, tags: [TAG] },
      config: { rateLimit: read },
      preHandler: [memberSession],
    },
    h.prompts,
  );

  r.post(
    `${KNOWN_PEOPLE_BASE}/:linkId/remove`,
    {
      schema: { params: KnownPeopleLinkParams, response: { 200: KnownPeopleWriteResponse }, tags: [TAG] },
      config: { rateLimit: write },
      preHandler: [memberSession],
    },
    h.remove,
  );

  r.get(
    `${KNOWN_PEOPLE_BASE}/requests`,
    {
      schema: { querystring: KnownPeopleRequestsQuery, response: { 200: KnownPeopleRequestsResponse }, tags: [TAG] },
      config: { rateLimit: read },
      preHandler: [memberSession],
    },
    h.requests,
  );

  r.post(
    `${KNOWN_PEOPLE_BASE}/requests/:linkId/answer`,
    {
      schema: { params: KnownPeopleLinkParams, body: KnownPeopleAnswerRequest, response: { 200: KnownPeopleWriteResponse }, tags: [TAG] },
      config: { rateLimit: write },
      preHandler: [memberSession],
    },
    h.answer,
  );

  r.post(
    `${KNOWN_PEOPLE_BASE}/requests/:linkId/withdraw`,
    {
      schema: { params: KnownPeopleLinkParams, response: { 200: KnownPeopleWriteResponse }, tags: [TAG] },
      config: { rateLimit: write },
      preHandler: [memberSession],
    },
    h.withdraw,
  );
}
