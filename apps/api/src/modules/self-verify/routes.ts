// Member self-verify recovery routes — Story 9.7 (Tasks 3/4). The member-facing recovery API surface.
//
// Two member-session-gated routes under /api/v1/member (token-bearer, like the My Pool reads):
//   · POST /self-verify/screenshot   — the FR-32 screenshot-upload transport (multipart; the ONE budgeted
//       friction surface). NO member step-up: this is the member's OWN payment proof, not a Ravi-mode
//       handover (contrast the 9.3 nominee statement upload, which DOES require claim_handover) — the same
//       gate posture as the 8.4 UTR-attest endpoint (the member's own contribution act).
//   · GET  /self-verify/:poolId       — the `<SelfVerifySurface>` detail read (default/uploaded/resolved).
// Both session-guarded → auto-covered by the Story 1.14 login-wall CI gate; NEITHER is public.
//
// The multipart upload route is DOCUMENTED BY HAND (no `.openapi()` on multipart — the 6.5/9.3 precedent);
// it declares `consumes: ['multipart/form-data']`. The querystring carries pool_id + the fallback flag.

import {
  SelfVerifyScreenshotUploadRequest,
  SelfVerifyScreenshotUploadResponse,
  SelfVerifyStateResponse,
} from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { requireMemberSession } from '../auth/shared/member-session-guard.js';
import { createSelfVerifyHandlers } from './handlers.js';

const SELF_VERIFY_TAG = 'self-verify';

const PoolIdParam = z.object({ poolId: z.string().uuid() }).strict();

export function registerSelfVerifyRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createSelfVerifyHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const memberSession = requireMemberSession(deps);

  // The FR-32 screenshot-upload transport (the ONE budgeted friction surface). Mandatory-only-on-mismatch
  // (or the explicit "Trouble with UTR?" fallback) — the guard lives in the handler.
  r.post(
    '/api/v1/member/self-verify/screenshot',
    {
      schema: {
        querystring: SelfVerifyScreenshotUploadRequest,
        response: { 200: SelfVerifyScreenshotUploadResponse },
        tags: [SELF_VERIFY_TAG],
        consumes: ['multipart/form-data'],
      },
      preHandler: [memberSession],
    },
    h.uploadScreenshot,
  );

  // The `<SelfVerifySurface>` detail read (the member's OWN recovery state for one pool).
  r.get(
    '/api/v1/member/self-verify/:poolId',
    {
      schema: {
        params: PoolIdParam,
        response: { 200: SelfVerifyStateResponse },
        tags: [SELF_VERIFY_TAG],
      },
      preHandler: [memberSession],
    },
    h.selfVerifyState,
  );
}
