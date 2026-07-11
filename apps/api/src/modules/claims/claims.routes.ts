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
  IfscLookupResponse,
  NomineeBankStatusResponse,
  OcrDocumentType,
  RecordNomineeBankRequest,
  RecordNomineeBankResponse,
  DpdpaConsentStatusResponse,
  RecordDpdpaConsentRequest,
  RecordDpdpaConsentResponse,
  RevokeDpdpaConsentRequest,
  RevokeDpdpaConsentResponse,
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
import { createNomineeBankHandlers } from './claims.nominee-bank.handlers.js';
import { createDpdpaConsentHandlers } from './claims.dpdpa-consent.handlers.js';

const CLAIM_TAG = 'member-claim';

/** Route params + querystring for the document upload (the file rides the multipart body). */
const ClaimDocumentParam = z.object({ claimCaseId: z.string().uuid() }).strict();
const ClaimDocumentQuery = z.object({ documentType: OcrDocumentType }).strict();

/** Story 6.8 — nominee-bank route params. The claim id (record) + the IFSC (lookup). */
const NomineeBankParam = z.object({ claimCaseId: z.string().uuid() }).strict();
const IfscLookupParam = z.object({ ifsc: z.string().min(1).max(20) }).strict();

/** Story 6.9 — DPDPA consent route params (the claim id). */
const DpdpaConsentParam = z.object({ claimCaseId: z.string().uuid() }).strict();

export function registerClaimsRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createClaimsHandlers(deps);
  const docs = createClaimDocumentHandlers(deps);
  const bank = createNomineeBankHandlers(deps);
  const consent = createDpdpaConsentHandlers(deps);
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

  // Story 6.8 — IFSC lookup (public bank/branch, cache-first) backing the <NomineeDetailEditor>
  // bank-name autocomplete + pre-validation. Member-session-gated (returns only public data).
  r.get(
    '/api/v1/member/claims/ifsc/:ifsc',
    {
      schema: {
        params: IfscLookupParam,
        response: { 200: IfscLookupResponse },
        tags: [CLAIM_TAG],
      },
      preHandler: [memberSession],
    },
    bank.ifscLookupMember,
  );

  // Story 6.8 — dual-account (#1/#2) nominee-bank collection. Bank entry is a member-side FINANCIAL
  // action (architecture §1.14) → behind the SAME handover-trust step-up the freeze-firing intake +
  // document upload require (D5 — the elevation is already present in the 6.2 flow).
  r.post(
    '/api/v1/member/claims/:claimCaseId/nominee-bank',
    {
      schema: {
        params: NomineeBankParam,
        body: RecordNomineeBankRequest,
        response: { 201: RecordNomineeBankResponse },
        tags: [CLAIM_TAG],
      },
      preHandler: [memberSession, requireMemberStepUp(deps, CLAIM_HANDOVER_ACTION_CONTEXT)],
    },
    bank.recordMember,
  );

  // Review finding (2026-07-11) — the presence view of whatever is currently on file, so
  // <NomineeDetailEditor> can render existing accounts on load instead of always starting blank.
  // Read-only + NON-PII → no step-up (mirrors the IFSC-lookup route's posture).
  r.get(
    '/api/v1/member/claims/:claimCaseId/nominee-bank',
    {
      schema: {
        params: NomineeBankParam,
        response: { 200: NomineeBankStatusResponse },
        tags: [CLAIM_TAG],
      },
      preHandler: [memberSession],
    },
    bank.getStatusMember,
  );

  // Story 6.9 — claim-time DPDPA consent (the reserved (claim)/consent wizard step). Consent capture
  // is NOT a financial action (unlike nominee-bank), so NO step-up — just the member session (D5/AC4).
  // The member records onto their OWN claim (claim-ownership asserted in the handler off the locked row).
  r.post(
    '/api/v1/member/claims/:claimCaseId/dpdpa-consent',
    {
      schema: {
        params: DpdpaConsentParam,
        body: RecordDpdpaConsentRequest,
        response: { 201: RecordDpdpaConsentResponse },
        tags: [CLAIM_TAG],
      },
      preHandler: [memberSession],
    },
    consent.recordMember,
  );

  // The presence view (which consents are currently granted) — so the consent step renders current
  // state on re-entry (the save-and-resume thread). Read-only + NON-PII → no step-up.
  r.get(
    '/api/v1/member/claims/:claimCaseId/dpdpa-consent',
    {
      schema: {
        params: DpdpaConsentParam,
        response: { 200: DpdpaConsentStatusResponse },
        tags: [CLAIM_TAG],
      },
      preHandler: [memberSession],
    },
    consent.getStatusMember,
  );

  // The AC3 revoke MECHANISM (Epic 11b performs the actual page takedown). Withdraw one publication
  // consent (Sahyog Vivran / In Memoriam). Member's own session + own claim; NO step-up.
  r.post(
    '/api/v1/member/claims/:claimCaseId/dpdpa-consent/revoke',
    {
      schema: {
        params: DpdpaConsentParam,
        body: RevokeDpdpaConsentRequest,
        response: { 200: RevokeDpdpaConsentResponse },
        tags: [CLAIM_TAG],
      },
      preHandler: [memberSession],
    },
    consent.revokeMember,
  );
}
