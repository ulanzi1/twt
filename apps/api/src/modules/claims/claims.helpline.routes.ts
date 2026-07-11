// Helpline-mediated claim-filing routes — Story 6.3 (Task 3).
//
// ONE scope-gated admin route under /api/v1/p/:pariwarId/admin/claims — the operator-console
// (Priya-path) intake. The exact member-validity admin chain (routes.ts:82–95) + the Story 1.9
// admin step-up gate:
//   [requireAdminSession, scopeResolutionHook, requirePermissionHook(claim.file),
//    requireStepUp('claim_file')]
//
// The permission hook fail-closes on deny (audited 403). requireStepUp('claim_file') satisfies
// architecture §2.2 (claim filing needs a fresh transactional step-up regardless of session
// state) via the OPERATOR's own admin step-up — the console drives the existing admin step-up
// request/verify endpoints with actionContext 'claim_file' before the intake POST; a
// StepUpRequiredError (structured 403) from the gate is the signal to run that elevation, NOT
// a hard error. There is NO nominee handover-OTP on this path (unlike the member-app flow) —
// operator authority + the verbal identity read-back is the trust anchor.

import {
  ClaimDocumentUploadResponse,
  HelplineClaimIntakeRequest,
  HelplineClaimIntakeResponse,
  HelplineOperatorEventRequest,
  HelplineOperatorEventResponse,
  IfscLookupResponse,
  NomineeBankStatusResponse,
  OcrDocumentType,
  RecordNomineeBankHelplineRequest,
  RecordNomineeBankResponse,
  RecordDpdpaConsentRequest,
  RecordDpdpaConsentResponse,
  RevokeDpdpaConsentRequest,
  RevokeDpdpaConsentResponse,
} from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { requirePermissionHook } from '../rbac/index.js';
import { requireStepUp } from '../step-up/gate.js';
import { createHelplineClaimsHandlers } from './claims.helpline.handlers.js';
import { createClaimDocumentHandlers } from './claims.documents.handlers.js';
import { createNomineeBankHandlers } from './claims.nominee-bank.handlers.js';
import { createDpdpaConsentHandlers } from './claims.dpdpa-consent.handlers.js';

const HELPLINE_CLAIM_TAG = 'helpline-claim';

/** The Story 6.3 claim-INTAKE permission key (catalog v7) — the freeze-firing intake gate. */
const CLAIM_FILE_KEY = 'claim.file';
/** The admin step-up action context the intake route requires (§2.2 fresh-transactional-OTP
 *  leg, satisfied by the operator's OWN admin step-up — NOT a nominee handover OTP). */
const CLAIM_FILE_STEP_UP_CONTEXT = 'claim_file';
/** Story 6.8 code review — the tier-1 nominee-bank ACTION key (catalog v11), replacing an
 *  initial `claim.file` reuse for the record/status routes (see permissions.ts's version-bump
 *  note). The tier-2 correction check is a SEPARATE, finer-grained gate inside the handler
 *  (`claim.correct_nominee_bank` — mirrors `claim.override_ground_inspection`'s in-handler check). */
const CLAIM_MANAGE_NOMINEE_BANK_KEY = 'claim.manage_nominee_bank';
/** Story 6.9 (D5a) — the DPDPA consent REVOCATION key (catalog v12). The RECORD route reuses
 *  `claim.file` (consent capture is part of filing); only the REVOKE route mints its own key (a
 *  later withdrawal/management action, NOT filing — the 6.8 semantic-scope lesson). */
const CLAIM_MANAGE_DPDPA_CONSENT_KEY = 'claim.manage_dpdpa_consent';

const PariwarParam = z.object({ pariwarId: z.string().uuid() }).strict();
/** Path params + querystring for the helpline document upload (file rides the multipart body). */
const HelplineDocumentParam = z
  .object({ pariwarId: z.string().uuid(), claimCaseId: z.string().uuid() })
  .strict();
const ClaimDocumentQuery = z.object({ documentType: OcrDocumentType }).strict();
/** Story 6.8 — helpline nominee-bank route params (claim id for record; IFSC for lookup). */
const HelplineNomineeBankParam = z
  .object({ pariwarId: z.string().uuid(), claimCaseId: z.string().uuid() })
  .strict();
const HelplineIfscLookupParam = z.object({ pariwarId: z.string().uuid(), ifsc: z.string().min(1).max(20) }).strict();
/** Story 6.9 — helpline DPDPA consent route params (the pariwar + claim id). */
const HelplineDpdpaConsentParam = z
  .object({ pariwarId: z.string().uuid(), claimCaseId: z.string().uuid() })
  .strict();

export function registerHelplineClaimsRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createHelplineClaimsHandlers(deps);
  const docs = createClaimDocumentHandlers(deps);
  const bank = createNomineeBankHandlers(deps);
  const consent = createDpdpaConsentHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const adminSession = requireAdminSession(deps);
  const scope = scopeResolutionHook(deps);
  const canFileClaim = requirePermissionHook(deps, CLAIM_FILE_KEY);
  const canManageNomineeBank = requirePermissionHook(deps, CLAIM_MANAGE_NOMINEE_BANK_KEY);
  const canManageDpdpaConsent = requirePermissionHook(deps, CLAIM_MANAGE_DPDPA_CONSENT_KEY);
  const stepUp = requireStepUp(deps, CLAIM_FILE_STEP_UP_CONTEXT);

  r.post(
    '/api/v1/p/:pariwarId/admin/claims/intake',
    {
      schema: {
        params: PariwarParam,
        body: HelplineClaimIntakeRequest,
        response: { 200: HelplineClaimIntakeResponse },
        tags: [HELPLINE_CLAIM_TAG],
      },
      // The freeze-firing intake: permission + the operator's OWN fresh admin step-up (§2.2).
      preHandler: [adminSession, scope, canFileClaim, stepUp],
    },
    h.initiateHelplineIntake,
  );

  // Review Finding (AC4/AC5) — a non-freezing, audit-only line for a read-back confirmation or
  // an AR-61 escalation. Permission-gated only (no step-up: neither mutates claim/member state).
  r.post(
    '/api/v1/p/:pariwarId/admin/claims/operator-event',
    {
      schema: {
        params: PariwarParam,
        body: HelplineOperatorEventRequest,
        response: { 200: HelplineOperatorEventResponse },
        tags: [HELPLINE_CLAIM_TAG],
      },
      preHandler: [adminSession, scope, canFileClaim],
    },
    h.recordOperatorEvent,
  );

  // Story 6.5 — helpline operator upload-on-behalf (multipart death-certificate upload). Permission-
  // gated (claim.file); rides the scope-resolution middleware's scope tx. The upload is NOT a
  // freeze-firing mutation, so it needs no fresh step-up (unlike the intake route). The file rides
  // the multipart body; `documentType` (the <DocumentTypeChooser> selection) is a validated query param.
  r.post(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/documents',
    {
      schema: {
        params: HelplineDocumentParam,
        querystring: ClaimDocumentQuery,
        response: { 202: ClaimDocumentUploadResponse },
        tags: [HELPLINE_CLAIM_TAG],
        consumes: ['multipart/form-data'],
      },
      preHandler: [adminSession, scope, canFileClaim],
    },
    docs.uploadHelplineDocument,
  );

  // Story 6.8 — helpline IFSC lookup (public bank/branch). Permission-gated (claim.file); no
  // step-up (a read of public data mutates nothing).
  r.get(
    '/api/v1/p/:pariwarId/admin/claims/ifsc/:ifsc',
    {
      schema: {
        params: HelplineIfscLookupParam,
        response: { 200: IfscLookupResponse },
        tags: [HELPLINE_CLAIM_TAG],
      },
      preHandler: [adminSession, scope, canFileClaim],
    },
    bank.ifscLookupHelpline,
  );

  // Story 6.8 — helpline dual-account nominee-bank collection. Bank entry is a financial action →
  // behind the tier-1 claim.manage_nominee_bank permission (review finding, 2026-07-11 — replaces
  // the initial claim.file reuse; see permissions.ts) + the operator's OWN fresh admin step-up (D5,
  // §2.2), the same posture as the freeze-firing intake route. A tier-2 CORRECTION additionally
  // requires claim.correct_nominee_bank, checked INSIDE the handler once the claim's locked state
  // confirms a correction is actually being attempted (the claim.override_ground_inspection
  // in-handler-check pattern — the tier isn't knowable at the route preHandler stage).
  r.post(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/nominee-bank',
    {
      schema: {
        params: HelplineNomineeBankParam,
        body: RecordNomineeBankHelplineRequest,
        response: { 201: RecordNomineeBankResponse },
        tags: [HELPLINE_CLAIM_TAG],
      },
      preHandler: [adminSession, scope, canManageNomineeBank, stepUp],
    },
    bank.recordHelpline,
  );

  // Review finding (2026-07-11) — the presence view of whatever is currently on file, so a D3
  // tier-2 admin correction can see what it's correcting instead of blindly overwriting. Permission-
  // gated (claim.manage_nominee_bank); no step-up — a read mutates nothing (mirrors the IFSC-lookup
  // route).
  r.get(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/nominee-bank',
    {
      schema: {
        params: HelplineNomineeBankParam,
        response: { 200: NomineeBankStatusResponse },
        tags: [HELPLINE_CLAIM_TAG],
      },
      preHandler: [adminSession, scope, canManageNomineeBank],
    },
    bank.getStatusHelpline,
  );

  // Story 6.9 (D5a) — helpline DPDPA consent RECORD (operator read-back at intake). Consent capture
  // is part of FILING, so it reuses the intake chain: claim.file + the operator's OWN fresh admin
  // step-up (matching the intake/nominee-bank posture). NO catalog bump for record.
  r.post(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/dpdpa-consent',
    {
      schema: {
        params: HelplineDpdpaConsentParam,
        body: RecordDpdpaConsentRequest,
        response: { 201: RecordDpdpaConsentResponse },
        tags: [HELPLINE_CLAIM_TAG],
      },
      preHandler: [adminSession, scope, canFileClaim, stepUp],
    },
    consent.recordHelpline,
  );

  // Story 6.9 (D5a) — helpline DPDPA consent REVOKE (a later withdrawal/management action, NOT
  // filing). Gated on the DEDICATED claim.manage_dpdpa_consent key (reusing claim.file would
  // reproduce the exact semantic-scope mismatch the 6.8 review corrected). No step-up (revocation is
  // not a financial action).
  r.post(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/dpdpa-consent/revoke',
    {
      schema: {
        params: HelplineDpdpaConsentParam,
        body: RevokeDpdpaConsentRequest,
        response: { 200: RevokeDpdpaConsentResponse },
        tags: [HELPLINE_CLAIM_TAG],
      },
      preHandler: [adminSession, scope, canManageDpdpaConsent],
    },
    consent.revokeHelpline,
  );
}
