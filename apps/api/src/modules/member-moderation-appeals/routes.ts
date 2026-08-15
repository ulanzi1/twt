// Moderation-appeal routes — Story 10.22. Niyamavali §8.8 (Decision `2026-08-15-121`).
//
// THREE audiences, THREE gate shapes, and the differences are ruled rather than stylistic:
//
//   MEMBER (in-portal)  `requireMemberSession` only. There is NO scope-resolution hook on a member
//                       route — that middleware also computes RBAC grants, which members do not have
//                       — so the handler opens its OWN `openScopeTx` for RLS. Turnstile and
//                       `Idempotency-Key` ride HEADERS. Per-member FR-88 write budget.
//
//   OPERATOR (off-portal)
//                       `helpdesk.create` at `dimension:'pariwar'`. ⛔ NOT `member.data_rights`:
//                       filing an appeal is not executing a DPDPA right, and 10.21 minted that key
//                       precisely to separate FILING from EXECUTING. ⛔ And NOT `member.moderate`,
//                       which would let the authority that sanctions a member also file their appeal.
//
//   TRUSTEE PANEL (adjudication)
//                       the full four-hook chain — `requireAdminSession` · `scopeResolutionHook` ·
//                       `requirePermissionHook(member.decide_moderation_appeal, {dimension:'pariwar'})`
//                       — plus `requireStepUp` on the write.
//
// ⭐ THE STEP-UP CONTEXT IS AN IMPORTED CONSTANT, NEVER A STRING LITERAL. `requireStepUp` compares a
// BARE STRING by equality with no registry and no allow-list. A typo HERE fails closed (tolerable);
// a typo on the admin OTP-REQUEST side yields an elevation that can never satisfy this gate — a
// permanently broken action with nothing anywhere naming the cause. That is 10.21's recorded footgun,
// and both sides import `MODERATION_APPEAL_STEP_UP_CONTEXT` from `@twt/contracts` so it cannot recur.
//
// ⚠ Route ORDER matters below: `/appeals/off-portal` is registered BEFORE `/appeals/:appealId` so the
// literal segment is not swallowed by the parameterized one.

import {
  DecideModerationAppealRequest,
  FileModerationAppealOffPortalRequest,
  FileModerationAppealRequest,
  MODERATION_APPEAL_STEP_UP_CONTEXT,
  ModerationAppealDecidedResponse,
  ModerationAppealDetailResponse,
  ModerationAppealFiledResponse,
  ModerationAppealsListResponse,
} from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { perMemberKey, type RouteRateLimit } from '../../plugins/rate-limit/index.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { requireMemberSession } from '../auth/shared/member-session-guard.js';
import { requirePermissionHook } from '../rbac/index.js';
import { requireStepUp } from '../step-up/gate.js';
import { createModerationAppealHandlers } from './handlers.js';

const TAG = 'member-moderation';

/**
 * ⭐ The Story 10.22 appellate-authority key (catalog v34), held by `trustee_panel` ALONE.
 * ⛔ NOT `member.moderate`: that key is held by `pariwar_admin` AND `trustee_panel`, so a check on it
 * cannot distinguish the appellate authority from the authority that decided — the exact
 * indistinguishability Story 10.18 existed to end, and the one call site where the separation IS the
 * mechanism (§8.8).
 */
const DECIDE_APPEAL_KEY = 'member.decide_moderation_appeal';

/** The operator intake gate. An operator taking a helpline call holds this; they do not hold more. */
const HELPDESK_CREATE_KEY = 'helpdesk.create';

const PariwarParam = z.object({ pariwarId: z.string().uuid() }).strict();
const AppealParam = z
  .object({ pariwarId: z.string().uuid(), appealId: z.string().uuid() })
  .strict();
const ListQuery = z
  .object({ limit: z.coerce.number().int().positive().max(200).optional() })
  .strict();

export function registerModerationAppealRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createModerationAppealHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const memberSession = requireMemberSession(deps);
  const adminSession = requireAdminSession(deps);
  const scope = scopeResolutionHook(deps);
  const requireDecide = requirePermissionHook(deps, DECIDE_APPEAL_KEY, { dimension: 'pariwar' });
  const requireHelpdeskCreate = requirePermissionHook(deps, HELPDESK_CREATE_KEY, {
    dimension: 'pariwar',
  });

  /** Per-member FR-88 write budget. `hook:'preHandler'` so `actorId` is set first. */
  const memberWrite: RouteRateLimit = {
    max: deps.config.writeRateMax,
    timeWindow: '1 minute',
    keyGenerator: perMemberKey,
    hook: 'preHandler',
  };

  // ── MEMBER, in-portal (AC7) ────────────────────────────────────────────────────────────────────
  // ⭐ The destination the appeal CTA has never had. `showAppealCta` has computed correctly since
  // 10.10 while both apps rendered a handler-less button, and the shipped notice copy has promised a
  // suspended member they may "request a review from your membership status page" in both locales the
  // whole time. This route is what makes that sentence true.
  r.post(
    '/api/v1/p/:pariwarId/member/moderation/appeals',
    {
      schema: {
        params: PariwarParam,
        body: FileModerationAppealRequest,
        response: { 201: ModerationAppealFiledResponse },
        tags: [TAG],
      },
      config: { rateLimit: memberWrite },
      preHandler: [memberSession],
    },
    h.fileFromPortal,
  );

  // ── OPERATOR, off-portal (AC7) ────────────────────────────────────────────────────────────────
  // ⭐ THE ARM THAT MUST SURVIVE THE FLAG FLIP. With `termination_access_block` ENABLED a terminated
  // member holds no session at all and the member route above is unreachable to them. §8.8: "the
  // right to appeal does not depend on the access that termination removes." This is that route.
  // ⚠ Registered BEFORE the `:appealId` route so `off-portal` is not read as an id.
  r.post(
    '/api/v1/p/:pariwarId/moderation/appeals/off-portal',
    {
      schema: {
        params: PariwarParam,
        body: FileModerationAppealOffPortalRequest,
        response: { 201: ModerationAppealFiledResponse },
        tags: [TAG],
      },
      preHandler: [adminSession, scope, requireHelpdeskCreate],
    },
    h.fileOffPortal,
  );

  // ── TRUSTEE PANEL: the adjudication queue (AC5) ───────────────────────────────────────────────
  // ⚠ Not a convenience read. `trustee_panel` holds no helpdesk capability and `routed_to_role` is
  // advisory and inert, so no operator queue can ever surface a filed appeal to the Panel. Without
  // this list the record would be reachable only by direct link (D6).
  r.get(
    '/api/v1/p/:pariwarId/moderation/appeals',
    {
      schema: {
        params: PariwarParam,
        querystring: ListQuery,
        response: { 200: ModerationAppealsListResponse },
        tags: [TAG],
      },
      preHandler: [adminSession, scope, requireDecide],
    },
    h.list,
  );

  // The single-item decrypt-on-demand read — the ONLY surface carrying either Tier-1 field.
  r.get(
    '/api/v1/p/:pariwarId/moderation/appeals/:appealId',
    {
      schema: {
        params: AppealParam,
        response: { 200: ModerationAppealDetailResponse },
        tags: [TAG],
      },
      preHandler: [adminSession, scope, requireDecide],
    },
    h.detail,
  );

  // ── TRUSTEE PANEL: the determination (AC5, AC6) ───────────────────────────────────────────────
  // ⭐ Holding the key is NOT sufficient. §8.8's different-individual requirement is enforced by the
  // DOMAIN, inside the scope transaction, before any write, as a typed 409 — a Panel member who
  // imposed the act or contributed a ground it rests on holds this key and is still refused THIS
  // case. ⛔ It is never a 403: the actor may decide other appeals, so what is refused is their
  // relationship to this case, not their capability.
  r.post(
    '/api/v1/p/:pariwarId/moderation/appeals/:appealId/decide',
    {
      schema: {
        params: AppealParam,
        body: DecideModerationAppealRequest,
        response: { 200: ModerationAppealDecidedResponse },
        tags: [TAG],
      },
      preHandler: [
        adminSession,
        scope,
        requireDecide,
        requireStepUp(deps, MODERATION_APPEAL_STEP_UP_CONTEXT),
      ],
    },
    h.decide,
  );
}
