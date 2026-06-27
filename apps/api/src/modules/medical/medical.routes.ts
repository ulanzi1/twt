// Medical-disclosure routes — Story 3.5 (Task 6). The committed medical member API surface.
//
// Three routes under /api/v1/member/medical-disclosure (member-session-gated, token-bearer like
// the 3.4 nominee surface): POST submits a disclosure, GET reads the latest status, GET .../ima-list
// returns the catalog + ack copy. ALL require a member session and NOTHING more — there is NO
// step-up preHandler at signup (the member holds a fresh signup-continuation session; R3). Story
// 3.9 adds `requireMemberStepUp(deps, 'medical_disclosure_update')` on its Life Events UPDATE
// route, re-running the same submit handler.

import {
  ImaListResponse,
  MedicalDiscloseRequest,
  MedicalDisclosureStatusResponse,
} from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import type { AppDeps } from '../../context.js';
import { requireMemberSession } from '../auth/shared/member-session-guard.js';
import { createMedicalHandlers } from './medical.handlers.js';

const MEDICAL_TAG = 'member-medical';

export function registerMedicalRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createMedicalHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const memberSession = requireMemberSession(deps);

  r.post(
    '/api/v1/member/medical-disclosure',
    {
      schema: {
        body: MedicalDiscloseRequest,
        response: { 200: MedicalDisclosureStatusResponse },
        tags: [MEDICAL_TAG],
      },
      preHandler: [memberSession],
    },
    h.submit,
  );

  r.get(
    '/api/v1/member/medical-disclosure',
    {
      schema: { response: { 200: MedicalDisclosureStatusResponse }, tags: [MEDICAL_TAG] },
      preHandler: [memberSession],
    },
    h.status,
  );

  r.get(
    '/api/v1/member/medical-disclosure/ima-list',
    {
      schema: { response: { 200: ImaListResponse }, tags: [MEDICAL_TAG] },
      preHandler: [memberSession],
    },
    h.imaList,
  );
}
