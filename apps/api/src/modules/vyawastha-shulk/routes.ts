// Signup ₹110 Vyawastha Shulk routes — Story 3.6b (Task 6). The committed signup-fee member API surface.
//
// Three routes under /api/v1/member/vyawastha-shulk (member-session-gated, token-bearer like the 3.5
// medical / 3.6a terms surfaces): POST /intent builds the UPI Intent URL, POST /confirm self-attests
// the UTR + runs the lock-in gate, GET /status reads the paid/lock-in view. ALL require a member
// session and NOTHING more — these are session-guarded (NOT public; NOT added to the login-wall
// allowlist, unlike 3.6a's /signup/create).

import {
  VyawasthaShulkConfirmRequest,
  VyawasthaShulkConfirmResponse,
  VyawasthaShulkIntentResponse,
  VyawasthaShulkRenewalConfirmResponse,
  VyawasthaShulkRenewalStatusResponse,
  VyawasthaShulkStatusResponse,
} from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import type { AppDeps } from '../../context.js';
import { requireMemberSession } from '../auth/shared/member-session-guard.js';
import { createVyawasthaShulkHandlers } from './handlers.js';

const VYAWASTHA_SHULK_TAG = 'member-vyawastha-shulk';

export function registerVyawasthaShulkRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createVyawasthaShulkHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const memberSession = requireMemberSession(deps);

  r.post(
    '/api/v1/member/vyawastha-shulk/intent',
    {
      schema: { response: { 200: VyawasthaShulkIntentResponse }, tags: [VYAWASTHA_SHULK_TAG] },
      preHandler: [memberSession],
    },
    h.intent,
  );

  r.post(
    '/api/v1/member/vyawastha-shulk/confirm',
    {
      schema: {
        body: VyawasthaShulkConfirmRequest,
        response: { 200: VyawasthaShulkConfirmResponse },
        tags: [VYAWASTHA_SHULK_TAG],
      },
      preHandler: [memberSession],
    },
    h.confirm,
  );

  r.get(
    '/api/v1/member/vyawastha-shulk/status',
    {
      schema: { response: { 200: VyawasthaShulkStatusResponse }, tags: [VYAWASTHA_SHULK_TAG] },
      preHandler: [memberSession],
    },
    h.status,
  );

  // ── Story 3.8 — annual renewal surface (renewal-status read + renew intent/confirm) ──────────────
  // All member-session-gated (token-bearer), like the signup routes above — NOT login-wall-allowlisted.
  r.get(
    '/api/v1/member/vyawastha-shulk/renewal-status',
    {
      schema: { response: { 200: VyawasthaShulkRenewalStatusResponse }, tags: [VYAWASTHA_SHULK_TAG] },
      preHandler: [memberSession],
    },
    h.renewalStatus,
  );

  r.post(
    '/api/v1/member/vyawastha-shulk/renew/intent',
    {
      schema: { response: { 200: VyawasthaShulkIntentResponse }, tags: [VYAWASTHA_SHULK_TAG] },
      preHandler: [memberSession],
    },
    h.renewIntent,
  );

  r.post(
    '/api/v1/member/vyawastha-shulk/renew/confirm',
    {
      schema: {
        body: VyawasthaShulkConfirmRequest,
        response: { 200: VyawasthaShulkRenewalConfirmResponse },
        tags: [VYAWASTHA_SHULK_TAG],
      },
      preHandler: [memberSession],
    },
    h.renewConfirm,
  );
}
