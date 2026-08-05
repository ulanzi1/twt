// Trustee-Lite route — Story 10.11 (Task 4; AC6).
//
// ONE read-only GET. The guard chain is `[requireAdminSession, scopeResolutionHook]` and NOTHING
// else:
//
//   · NO `requirePermissionHook`. The authorization is PER SECTION over six different keys, which a
//     static preHandler cannot express — it runs in the handler against grants resolved once (D4, the
//     Story 10.7 dynamic-key precedent). The route is not "ungated": a caller holding none of the six
//     keys receives a structured 403 from the handler.
//
//   · NOT STEP-UP GATED. AR-24 gates CONSEQUENTIAL WRITES; this surface writes nothing, elevates
//     nothing and decrypts nothing. That returns Epic 10 to the 10.3 / 10.4 / 10.5 / 10.8 / 10.9
//     "NOT step-up-gated" chain, which 10.10 broke for a good reason (it takes moderation ACTIONS).
//     An aggregator that only indexes surfaces the caller can already reach adds no new authority to
//     elevate for.

import { TrusteeLiteResponse } from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { createTrusteeLiteHandlers } from './handlers.js';

const TAG = 'trustee-lite';

const PariwarParam = z.object({ pariwarId: z.string().uuid() }).strict();

export function registerTrusteeLiteRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createTrusteeLiteHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const adminSession = requireAdminSession(deps);
  const scope = scopeResolutionHook(deps);

  // AC1/AC6 — the aggregate read. Sections the caller cannot act on are ABSENT from the response.
  r.get(
    '/api/v1/p/:pariwarId/admin/trustee-lite',
    {
      schema: { params: PariwarParam, response: { 200: TrusteeLiteResponse }, tags: [TAG] },
      preHandler: [adminSession, scope],
    },
    h.getTrusteeLite,
  );
}
