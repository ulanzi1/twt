// Member-facing Terms & Conditions routes — Story 3.6a (Task 5). The committed member T&C surface.
//
// Two routes under /api/v1/member/terms (member-session-gated, token-bearer like the 3.4/3.5
// signup surfaces): GET the current effective T&C, POST accept it. BOTH require a member session and
// nothing more — there is NO step-up at signup (the member holds a fresh signup-continuation
// session). Distinct from the trustee `terms-and-conditions` admin module (authoring/approval).

import {
  MemberTermsAcceptRequest,
  MemberTermsAcceptResponse,
  MemberTermsLocale,
  MemberTermsResponse,
} from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { requireMemberSession } from '../auth/shared/member-session-guard.js';
import { createMemberTermsHandlers } from './member-terms.handlers.js';

const MEMBER_TERMS_TAG = 'member-terms';

export function registerMemberTermsRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createMemberTermsHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const memberSession = requireMemberSession(deps);

  r.get(
    '/api/v1/member/terms',
    {
      schema: {
        querystring: z.object({ locale: MemberTermsLocale.optional() }).strict(),
        response: { 200: MemberTermsResponse },
        tags: [MEMBER_TERMS_TAG],
      },
      preHandler: [memberSession],
    },
    h.getEffective,
  );

  r.post(
    '/api/v1/member/terms/accept',
    {
      schema: {
        body: MemberTermsAcceptRequest,
        response: { 200: MemberTermsAcceptResponse },
        tags: [MEMBER_TERMS_TAG],
      },
      preHandler: [memberSession],
    },
    h.accept,
  );
}
