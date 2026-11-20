// Story 14.3 (decision `2026-11-20-467` DL2, DL10; AC5–AC7, AC10, AC11) — `/api/v1/data-protection/…`.
// GLOBAL routes: `requireAdminSession` + `requireGlobalPermission('breach.manage')`. ⛔ `scopeResolutionHook` /
// `requirePermissionHook` — they hard-throw without a Pariwar scope (the audit-log module's comment names this landmine).
// Every route declares `response[200]`, and both collection routes a bounded `limit` and `{ items }`: `forced-pagination.spec.ts`
// walks the live swagger and examines only routes that declare a 200 — a route without one would pass it vacuously.

import {
  BreachEntryAppendRequest,
  BreachIncidentDetailResponse,
  BreachIncidentListQuery,
  BreachIncidentListResponse,
  BreachIncidentOpenRequest,
  BreachMembersOnRecordResponse,
  BreachSignalListQuery,
  BreachSignalListResponse,
} from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { namedRateLimits } from '../../plugins/rate-limit/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { requireGlobalPermission } from '../rbac/index.js';
import { createDataProtectionHandlers } from './handlers.js';

const TAG = 'data-protection';
const BASE = '/api/v1/data-protection';

const IncidentParam = z.object({ incidentId: z.string().uuid() }).strict();

export function registerDataProtectionRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createDataProtectionHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const guard = [requireAdminSession(deps), requireGlobalPermission(deps, h.BREACH_MANAGE_KEY)];
  const limits = namedRateLimits(deps);

  r.get(
    `${BASE}/breaches`,
    {
      schema: { querystring: BreachIncidentListQuery, response: { 200: BreachIncidentListResponse }, tags: [TAG] },
      preHandler: guard,
      config: { rateLimit: limits.read },
    },
    h.list,
  );

  r.post(
    `${BASE}/breaches`,
    {
      schema: { body: BreachIncidentOpenRequest, response: { 200: BreachIncidentDetailResponse }, tags: [TAG] },
      preHandler: guard,
      config: { rateLimit: limits.write },
    },
    h.open,
  );

  r.get(
    `${BASE}/breaches/:incidentId`,
    {
      schema: { params: IncidentParam, response: { 200: BreachIncidentDetailResponse }, tags: [TAG] },
      preHandler: guard,
      config: { rateLimit: limits.read },
    },
    h.detail,
  );

  r.post(
    `${BASE}/breaches/:incidentId/entries`,
    {
      schema: { params: IncidentParam, body: BreachEntryAppendRequest, response: { 200: BreachIncidentDetailResponse }, tags: [TAG] },
      preHandler: guard,
      config: { rateLimit: limits.write },
    },
    h.append,
  );

  r.get(
    `${BASE}/signals`,
    {
      schema: { querystring: BreachSignalListQuery, response: { 200: BreachSignalListResponse }, tags: [TAG] },
      preHandler: guard,
      config: { rateLimit: limits.read },
    },
    h.signals,
  );

  r.get(
    `${BASE}/members-on-record`,
    {
      schema: { response: { 200: BreachMembersOnRecordResponse }, tags: [TAG] },
      preHandler: guard,
      config: { rateLimit: limits.read },
    },
    h.membersOnRecord,
  );
}
