// The REPLACEMENT-CERTIFICATE reminder — the District Admin's routes (Story 6.19d; AC4, AC5, AC8; `2026-10-03-276` CR11).
// Key (1) `claim.record_correction_letter` on every route — ⛔ no new key, ⛔ no catalog bump (stays 50 / 64).
//
//   · GET  …/admin/certificate-reminders                                                  — the LIST (Pariwar-level, ⛔ no
//     claim in the path): `resolveQueueScopeStash(key (1))` STASHES the caller's scope and `requirePermissionHook(key (1),
//     district)` GATES it (without the hook the route would answer 200 with an empty list, ⛔ a 403); the handler then
//     filters per row at the deceased's posting district BEFORE the page slice (6.19c's closure-letter queue shape).
//   · POST …/admin/claims/:claimCaseId/certificate-reminders/letters                      — `resolveDistrict` + key (1)
//   · POST …/admin/claims/:claimCaseId/certificate-reminders/letters/:letterId/delivery   — `resolveDistrict` + key (1), multipart
//   · GET  …/admin/claims/:claimCaseId/certificate-reminders/letters/address              — + a FRESH step-up
//   · GET  …/admin/claims/:claimCaseId/certificate-reminders/letters/:letterId/screenshot — + the SAME step-up
//
// Every route composes the authenticated-HUMAN chain [adminSession, scope, …, requirePermissionHook(…)]; a claim of
// another Pariwar resolves ⛔ no district (the gate fails closed) or ⛔ no row in this tenant's scope (404). The collection
// GET declares a bounded `limit` (forced pagination). Enrolled in `scripts/claim-adjudication-human-actor-invariant/check.ts`.

import {
  CertificateLetterAddressQuery,
  CertificateLetterAddressResponse,
  CertificateLetterDto,
  CertificateLetterScreenshotResponse,
  CertificateRemindersResponse,
  RecordCertificateLetterRequest,
} from '@twt/contracts';
import { claim, type rbac } from '@twt/domain';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { requirePermissionHook } from '../rbac/index.js';
import { requireStepUp } from '../step-up/gate.js';
import {
  CERTIFICATE_LETTER_ADDRESS_STEP_UP_CONTEXT,
  createCertificateReminderHandlers,
} from './claims.certificate-reminder.handlers.js';
import { CORRECTION_LETTER_KEY } from './claims.correction-chase.handlers.js';
import { resolveNomineeNameCheckDistrict, resolveQueueScopeStash } from './claims.nominee-name-check.routes.js';

const TAG = 'claim-certificate-reminder';

const PariwarParam = z.object({ pariwarId: z.string().uuid() }).strict();
const ClaimParam = z.object({ pariwarId: z.string().uuid(), claimCaseId: z.string().uuid() }).strict();
const LetterParam = z
  .object({ pariwarId: z.string().uuid(), claimCaseId: z.string().uuid(), letterId: z.string().uuid() })
  .strict();
/** A bounded page (AR forced pagination). */
const PageQuery = z.object({ limit: z.coerce.number().int().min(1).max(claim.CERTIFICATE_LIST_MAX_LIMIT).optional() }).strict();

export function registerCertificateReminderRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createCertificateReminderHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const adminSession = requireAdminSession(deps);
  const scope = scopeResolutionHook(deps);
  const resolveDistrict = resolveNomineeNameCheckDistrict();
  const canRecordLetter = requirePermissionHook(deps, CORRECTION_LETTER_KEY, {
    dimension: 'district',
    resolveValue: (request: FastifyRequest): string | null => request.nomineeNameCheckDistrict ?? null,
  });
  const stepUp = requireStepUp(deps, CERTIFICATE_LETTER_ADDRESS_STEP_UP_CONTEXT);
  // The LIST: a district-scoped caller is gated at their district, a pariwar-ceiling caller at the Pariwar.
  const resolveListScope = resolveQueueScopeStash(CORRECTION_LETTER_KEY);
  const canReadList = requirePermissionHook(deps, CORRECTION_LETTER_KEY, {
    dimension: 'district',
    resolveDimension: (request: FastifyRequest): rbac.ScopeDimension => request.nomineeNameCheckQueueScope?.dimension ?? 'district',
    resolveValue: (request: FastifyRequest): string | null => request.nomineeNameCheckQueueScope?.value ?? null,
  });

  r.get(
    '/api/v1/p/:pariwarId/admin/certificate-reminders',
    {
      schema: { params: PariwarParam, querystring: PageQuery, response: { 200: CertificateRemindersResponse }, tags: [TAG] },
      preHandler: [adminSession, scope, resolveListScope, canReadList],
    },
    h.getCertificateReminders,
  );

  r.post(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/certificate-reminders/letters',
    {
      schema: { params: ClaimParam, body: RecordCertificateLetterRequest, response: { 201: CertificateLetterDto }, tags: [TAG] },
      preHandler: [adminSession, scope, resolveDistrict, canRecordLetter],
    },
    h.recordCertificateLetter,
  );

  r.post(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/certificate-reminders/letters/:letterId/delivery',
    {
      schema: { params: LetterParam, response: { 201: CertificateLetterDto }, tags: [TAG], consumes: ['multipart/form-data'] },
      preHandler: [adminSession, scope, resolveDistrict, canRecordLetter],
    },
    h.recordCertificateLetterDelivery,
  );

  r.get(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/certificate-reminders/letters/address',
    {
      schema: { params: ClaimParam, querystring: CertificateLetterAddressQuery, response: { 200: CertificateLetterAddressResponse }, tags: [TAG] },
      preHandler: [adminSession, scope, resolveDistrict, canRecordLetter, stepUp],
    },
    h.readCertificateLetterAddress,
  );

  r.get(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/certificate-reminders/letters/:letterId/screenshot',
    {
      schema: { params: LetterParam, response: { 200: CertificateLetterScreenshotResponse }, tags: [TAG] },
      // ⭐ The SAME step-up as the address (6.19c's 2026-10-02 review patch): a delivery photo plausibly shows the
      // recipient's name and address.
      preHandler: [adminSession, scope, resolveDistrict, canRecordLetter, stepUp],
    },
    h.readCertificateLetterScreenshot,
  );
}
