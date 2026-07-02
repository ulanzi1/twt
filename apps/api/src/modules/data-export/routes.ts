// Member data-export routes — Story 3.11 (Task 5). The committed DPDPA data-portability API surface.
//
// Three routes under /api/v1/member/data-export, ALL member-session-gated (→ automatically covered by
// the Story 1.14 login-wall CI gate via the MEMBER_SESSION_GUARD symbol on requireMemberSession):
//   · POST   /                — request an export (session only; the request is lower-risk than the
//     download — step-up gates the download, AC3).
//   · GET    /:id             — poll status (session only, NO step-up).
//   · GET    /:id/download     — the ZIP stream, step-up-gated with the DISTINCT 'data_export' context
//     (AC3) so no other elevation (withdrawal / nominee_change / …) satisfies it, and vice-versa.
//
// The download route intentionally has NO zod `response` schema — it streams `application/zip`, not
// JSON (a response schema would coerce the binary body). The status/request routes carry their DTO
// schemas. No `.openapi()` / no v1.yaml entry (the withdrawal/life-events posture).

import { DataExportRequestResponse, DataExportStatusResponse } from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import type { AppDeps } from '../../context.js';
import { requireMemberStepUp } from '../auth/member/member-step-up.gate.js';
import { requireMemberSession } from '../auth/shared/member-session-guard.js';
import { createDataExportHandlers } from './handlers.js';

const DATA_EXPORT_TAG = 'member-data-export';
const DATA_EXPORT_BASE = '/api/v1/member/data-export';

export function registerDataExportRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createDataExportHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const memberSession = requireMemberSession(deps);

  // Request an export (session only — the request is lower-risk; step-up gates the download).
  r.post(
    DATA_EXPORT_BASE,
    {
      schema: {
        response: { 200: DataExportRequestResponse },
        tags: [DATA_EXPORT_TAG],
      },
      preHandler: [memberSession],
    },
    h.request,
  );

  // Poll status (session only, NO step-up) — the mobile client's poll target.
  r.get(
    `${DATA_EXPORT_BASE}/:id`,
    {
      schema: {
        response: { 200: DataExportStatusResponse },
        tags: [DATA_EXPORT_TAG],
      },
      preHandler: [memberSession],
    },
    h.status,
  );

  // Download the ZIP — one-time, 24h, step-up-gated (DISTINCT context 'data_export'). Streams
  // application/zip (no response schema). requireMemberStepUp runs AFTER requireMemberSession.
  r.get(
    `${DATA_EXPORT_BASE}/:id/download`,
    {
      schema: { tags: [DATA_EXPORT_TAG] },
      preHandler: [memberSession, requireMemberStepUp(deps, 'data_export')],
    },
    h.download,
  );
}
