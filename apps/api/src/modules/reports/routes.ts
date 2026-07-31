// Reports-&-exports library routes — Story 10.7 (Task 6). The committed FR-58A admin API surface.
//
// FOUR routes under /api/v1/p/:pariwarId/admin/reports, ALL [requireAdminSession, scopeResolutionHook]
// gated (the 10.5 news-blog admin precedent). The per-template RBAC check is INSIDE the handler (the key
// is dynamic per report_type — Decision 6), NOT a static requirePermissionHook.
//   · POST   /                — request an export (authorize + enqueue).
//   · GET    /                — list the actor's own export history, newest-first, bounded.
//   · GET    /:id             — poll status.
//   · GET    /:id/download     — the one-time, 24h, authenticated stream (text/csv | application/json).
//
// The download route intentionally has NO zod `response` schema — it streams the artifact bytes, not
// JSON (a response schema would coerce the binary body; the 3.11 posture).

import {
  ReportExportListResponse,
  ReportRequest,
  ReportRequestResponse,
  ReportStatusResponse,
} from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { createReportsHandlers } from './handlers.js';

const TAG = 'reports';
const REPORTS_BASE = '/api/v1/p/:pariwarId/admin/reports';

const PariwarParam = z.object({ pariwarId: z.string().uuid() }).strict();
const ExportParam = z.object({ pariwarId: z.string().uuid(), id: z.string().uuid() }).strict();

export function registerReportsRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createReportsHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const guard = [requireAdminSession(deps), scopeResolutionHook(deps)];

  // Request an export (authorize against the template's key + enqueue the async build).
  r.post(
    REPORTS_BASE,
    {
      schema: {
        params: PariwarParam,
        body: ReportRequest,
        response: { 200: ReportRequestResponse },
        tags: [TAG],
      },
      preHandler: guard,
    },
    h.request,
  );

  // List the actor's own export history — the admin console loads this on mount (review finding: a
  // page refresh must not lose knowledge of in-flight/ready exports).
  r.get(
    REPORTS_BASE,
    {
      schema: { params: PariwarParam, response: { 200: ReportExportListResponse }, tags: [TAG] },
      preHandler: guard,
    },
    h.list,
  );

  // Poll status — the admin console's poll target.
  r.get(
    `${REPORTS_BASE}/:id`,
    {
      schema: { params: ExportParam, response: { 200: ReportStatusResponse }, tags: [TAG] },
      preHandler: guard,
    },
    h.status,
  );

  // Download — one-time, 24h, authenticated. Streams text/csv | application/json (no response schema).
  r.get(
    `${REPORTS_BASE}/:id/download`,
    {
      schema: { params: ExportParam, tags: [TAG] },
      preHandler: guard,
    },
    h.download,
  );
}
