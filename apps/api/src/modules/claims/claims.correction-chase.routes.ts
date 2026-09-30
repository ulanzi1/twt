// The correction-return CHASE — the District Admin's routes (Story 6.19b, Task 7; AC5, AC16). ONE route file.
//
//   · POST …/admin/claims/:claimCaseId/correction/must-act                     — key (7) `claim.change_correction_must_act`
//   · POST …/admin/claims/:claimCaseId/correction/letters                      — key (1) `claim.record_correction_letter`
//   · POST …/admin/claims/:claimCaseId/correction/letters/:letterId/delivery   — key (1), multipart
//   · GET  …/admin/claims/:claimCaseId/correction/letters/address              — key (1) + the fresh admin STEP-UP
//     (`correction_letter_address`, 6.19a's plaintext read-back precedent) — the address shows ONLY in the letter form
//   · GET  …/admin/claims/:claimCaseId/correction/letters/:letterId/screenshot — key (1); a TTL-limited signed URL
//
// Every route composes the authenticated-HUMAN chain [adminSession, scope, district, requirePermissionHook(…)] — the
// district is the deceased's SERVER-DERIVED posting district, resolved by IMPORTING 6.18's
// `resolveNomineeNameCheckDistrict` (⛔ not a copy); the client value is never trusted. A claim of another Pariwar
// resolves ⛔ no district ⇒ the district gate fails closed. Enrolled in
// `scripts/claim-adjudication-human-actor-invariant/check.ts`'s COVERAGE_SET.

import {
  ChangeCorrectionMustActRequest,
  ChangeCorrectionMustActResponse,
  CorrectionLetterAddressQuery,
  CorrectionLetterAddressResponse,
  CorrectionLetterDto,
  CorrectionLetterScreenshotResponse,
  RecordCorrectionLetterRequest,
} from '@twt/contracts';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { requirePermissionHook } from '../rbac/index.js';
import { requireStepUp } from '../step-up/gate.js';
import {
  CORRECTION_LETTER_ADDRESS_STEP_UP_CONTEXT,
  CORRECTION_LETTER_KEY,
  CORRECTION_MUST_ACT_KEY,
  createCorrectionChaseHandlers,
} from './claims.correction-chase.handlers.js';
import { resolveNomineeNameCheckDistrict } from './claims.nominee-name-check.routes.js';

const TAG = 'claim-correction-chase';

const ClaimParam = z.object({ pariwarId: z.string().uuid(), claimCaseId: z.string().uuid() }).strict();
const LetterParam = z
  .object({ pariwarId: z.string().uuid(), claimCaseId: z.string().uuid(), letterId: z.string().uuid() })
  .strict();

export function registerCorrectionChaseRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createCorrectionChaseHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const adminSession = requireAdminSession(deps);
  const scope = scopeResolutionHook(deps);
  const resolveDistrict = resolveNomineeNameCheckDistrict();
  const atDistrict = { dimension: 'district' as const, resolveValue: (request: FastifyRequest): string | null => request.nomineeNameCheckDistrict ?? null };
  const canRecordLetter = requirePermissionHook(deps, CORRECTION_LETTER_KEY, atDistrict);
  const canChangeMustAct = requirePermissionHook(deps, CORRECTION_MUST_ACT_KEY, atDistrict);
  const addressStepUp = requireStepUp(deps, CORRECTION_LETTER_ADDRESS_STEP_UP_CONTEXT);

  r.post(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/correction/must-act',
    {
      schema: { params: ClaimParam, body: ChangeCorrectionMustActRequest, response: { 201: ChangeCorrectionMustActResponse }, tags: [TAG] },
      preHandler: [adminSession, scope, resolveDistrict, canChangeMustAct],
    },
    h.changeMustAct,
  );

  r.post(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/correction/letters',
    {
      schema: { params: ClaimParam, body: RecordCorrectionLetterRequest, response: { 201: CorrectionLetterDto }, tags: [TAG] },
      preHandler: [adminSession, scope, resolveDistrict, canRecordLetter],
    },
    h.recordLetter,
  );

  r.post(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/correction/letters/:letterId/delivery',
    {
      schema: { params: LetterParam, response: { 201: CorrectionLetterDto }, tags: [TAG], consumes: ['multipart/form-data'] },
      preHandler: [adminSession, scope, resolveDistrict, canRecordLetter],
    },
    h.recordDelivery,
  );

  r.get(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/correction/letters/address',
    {
      schema: { params: ClaimParam, querystring: CorrectionLetterAddressQuery, response: { 200: CorrectionLetterAddressResponse }, tags: [TAG] },
      preHandler: [adminSession, scope, resolveDistrict, canRecordLetter, addressStepUp],
    },
    h.readLetterAddress,
  );

  r.get(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/correction/letters/:letterId/screenshot',
    {
      schema: { params: LetterParam, response: { 200: CorrectionLetterScreenshotResponse }, tags: [TAG] },
      preHandler: [adminSession, scope, resolveDistrict, canRecordLetter],
    },
    h.readScreenshot,
  );
}
