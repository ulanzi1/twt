// Member Telegram opt-in routes — Story 5.5 (Task 6; AC4/AC10).
//
// Member-session-gated opt-in surface (POST request-mint / GET status / POST revoke). All routes register in
// openapi/v1.yaml (the EXPECTED diff). Unlike WhatsApp there is NO trustee admin_action force-opt-out in this
// story's scope (the member controls their own Telegram opt-in; a trustee opt-out surface can follow if
// needed). Revocation is a POST (the story's Task 6 shape) at a dedicated sub-path.

import {
  RevokeTelegramOptInResponse,
  TelegramOptInRequestResponse,
  TelegramOptInStatusResponse,
} from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import type { AppDeps } from '../../context.js';
import { requireMemberSession } from '../auth/shared/member-session-guard.js';
import { createTelegramOptInHandlers } from './handlers.js';

const TELEGRAM_OPT_IN_TAG = 'telegram-opt-in';

export function registerTelegramOptInRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createTelegramOptInHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const memberSession = requireMemberSession(deps);

  // ── Member opt-in surface (requireMemberSession; token-bearer) ────────────────────────────────────
  r.post(
    '/api/v1/member/telegram-opt-in',
    {
      schema: { response: { 200: TelegramOptInRequestResponse }, tags: [TELEGRAM_OPT_IN_TAG] },
      preHandler: [memberSession],
    },
    h.request,
  );
  r.get(
    '/api/v1/member/telegram-opt-in',
    {
      schema: { response: { 200: TelegramOptInStatusResponse }, tags: [TELEGRAM_OPT_IN_TAG] },
      preHandler: [memberSession],
    },
    h.status,
  );
  r.post(
    '/api/v1/member/telegram-opt-in/revoke',
    {
      schema: { response: { 200: RevokeTelegramOptInResponse }, tags: [TELEGRAM_OPT_IN_TAG] },
      preHandler: [memberSession],
    },
    h.revoke,
  );
}
