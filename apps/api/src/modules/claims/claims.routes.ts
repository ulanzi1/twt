// Member-app claim-filing routes — Story 6.2 (Tasks 2 + 3).
//
// Three member-session-gated routes under /api/v1/member/claims (the member-app session-guard
// precedent — /api/v1/member/nominees, /member/kyc — deriving the pariwar from the session;
// the claims README's /api/v1/p/<pariwar_id>/claims/... form is for the admin/verifier
// surfaces 6.10/6.11, NOT this member-app flow — variance recorded in the Dev Agent Record):
//   · POST /handover-otp         — send the handover-trust OTP (send-throttled);
//   · POST /handover-otp/verify  — verify it (its OWN verify-throttle, independent of the
//                                  send budget; also attempt-capped per-code in the service);
//   · POST /intake               — relationship-confirm → mint + freeze, behind the
//                                  requireMemberStepUp('claim_handover') handover-trust gate.

import {
  ClaimDocumentUploadResponse,
  ClaimIntakeInitiateRequest,
  ClaimIntakeInitiateResponse,
  HandoverOtpRequest,
  HandoverOtpResponse,
  HandoverOtpVerifyRequest,
  HandoverOtpVerifyResponse,
  OcrDocumentType,
} from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { requireMemberStepUp } from '../auth/member/member-step-up.gate.js';
import {
  memberClaimHandoverSendThrottle,
  memberClaimHandoverVerifyThrottle,
} from '../auth/member/otp-rate-limit.js';
import { requireMemberSession } from '../auth/shared/member-session-guard.js';
import { CLAIM_HANDOVER_ACTION_CONTEXT } from './claims.service.js';
import { createClaimsHandlers } from './claims.handlers.js';
import { createClaimDocumentHandlers } from './claims.documents.handlers.js';

const CLAIM_TAG = 'member-claim';

/** Route params + querystring for the document upload (the file rides the multipart body). */
const ClaimDocumentParam = z.object({ claimCaseId: z.string().uuid() }).strict();
const ClaimDocumentQuery = z.object({ documentType: OcrDocumentType }).strict();

export function registerClaimsRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createClaimsHandlers(deps);
  const docs = createClaimDocumentHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const memberSession = requireMemberSession(deps);
  const sendThrottle = memberClaimHandoverSendThrottle(deps);
  const verifyThrottle = memberClaimHandoverVerifyThrottle(deps);

  r.post(
    '/api/v1/member/claims/handover-otp',
    {
      schema: {
        body: HandoverOtpRequest,
        response: { 200: HandoverOtpResponse },
        tags: [CLAIM_TAG],
      },
      preHandler: [memberSession, sendThrottle],
    },
    h.requestHandoverOtp,
  );

  r.post(
    '/api/v1/member/claims/handover-otp/verify',
    {
      schema: {
        body: HandoverOtpVerifyRequest,
        response: { 200: HandoverOtpVerifyResponse },
        tags: [CLAIM_TAG],
      },
      // A DEDICATED verify throttle (own namespace, independent of sendThrottle) so verify
      // retries never consume the send budget — but still caps total verify calls per
      // window, closing the gap where a resend resets the per-code OTP_MAX_ATTEMPTS
      // counter (review finding, 2026-07-08).
      preHandler: [memberSession, verifyThrottle],
    },
    h.verifyHandoverOtp,
  );

  r.post(
    '/api/v1/member/claims/intake',
    {
      schema: {
        body: ClaimIntakeInitiateRequest,
        response: { 200: ClaimIntakeInitiateResponse },
        tags: [CLAIM_TAG],
      },
      // Handover-trust MUST be established before the freeze-firing intake (AC3 ordering).
      preHandler: [memberSession, requireMemberStepUp(deps, CLAIM_HANDOVER_ACTION_CONTEXT)],
    },
    h.initiateIntake,
  );

  // Story 6.5 — death-certificate upload (multipart). Reuses the handover-trust step-up posture
  // (claims.service.ts) — the same gate the freeze-firing intake required. The file rides the
  // multipart body; `documentType` (the <DocumentTypeChooser> selection) is a validated query param.
  r.post(
    '/api/v1/member/claims/:claimCaseId/documents',
    {
      schema: {
        params: ClaimDocumentParam,
        querystring: ClaimDocumentQuery,
        response: { 202: ClaimDocumentUploadResponse },
        tags: [CLAIM_TAG],
        consumes: ['multipart/form-data'],
      },
      preHandler: [memberSession, requireMemberStepUp(deps, CLAIM_HANDOVER_ACTION_CONTEXT)],
    },
    docs.uploadMemberDocument,
  );
}
