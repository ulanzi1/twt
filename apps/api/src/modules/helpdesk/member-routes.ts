// Member-facing helpdesk routes — Story 10.2 (Task 3; AC1/AC3/AC5/AC6).
//
// The member app's helpdesk surface, all under `/api/v1/p/:pariwarId/member/helpdesk/...` and
// member-session-gated (`requireMemberSession` — auto-covered by the Story 1.14 login-wall CI gate
// via the MEMBER_SESSION_GUARD tag; NOT public, so no allowlist entry). The create route is a
// single-shot `multipart/form-data` upload (no Zod `body` schema — the fields + files are read in
// the handler); every other route is a JSON read. The member JWT is the tenancy authority; the
// `:pariwarId` path segment is validated against it in the handler (a mismatch is a 404).
//
// ── Rate limit (FR-88) ─────────────────────────────────────────────────────────────────────────
// The create route carries the FR-88 protected-surface WRITE rate-limit, keyed PER-MEMBER
// (`perMemberKey`, `hook:'preHandler'`) — NOT `namedRateLimits.write` (which is `perSessionKey` and
// falls through to the shared IP for token-bearer members, rate-limiting every member behind a NAT
// together). The per-member key is the correct member-route budget (the contribution-note precedent).
// This is complementary to the Turnstile bot-gate in the handler (architecture §2.11/§5.8a).

import {
  HelpdeskAttachmentUrlResponse,
  HelpdeskCategoryListResponse,
  HelpdeskReplyRequest,
  MemberTicketDetailResponse,
  MemberTicketListResponse,
} from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { perMemberKey, type RouteRateLimit } from '../../plugins/rate-limit/index.js';
import { requireMemberSession } from '../auth/shared/member-session-guard.js';
import { createMemberHelpdeskHandlers } from './member-handlers.js';

const HELPDESK_TAG = 'helpdesk';

const PariwarParam = z.object({ pariwarId: z.string().uuid() }).strict();
const TicketParam = z.object({ pariwarId: z.string().uuid(), ticketId: z.string().uuid() }).strict();
const AttachmentParam = z
  .object({ pariwarId: z.string().uuid(), ticketId: z.string().uuid(), attachmentIndex: z.string().regex(/^\d+$/) })
  .strict();

export function registerMemberHelpdeskRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createMemberHelpdeskHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const memberSession = requireMemberSession(deps);

  // Per-member FR-88 write budget (see the header). `hook:'preHandler'` so `actorId` is set first.
  const memberWrite: RouteRateLimit = {
    max: deps.config.writeRateMax,
    timeWindow: '1 minute',
    keyGenerator: perMemberKey,
    hook: 'preHandler',
  };

  // POST — file a ticket (single-shot multipart; Turnstile-gated). No Zod `body` schema: the
  // multipart fields + files are read in the handler.
  r.post(
    '/api/v1/p/:pariwarId/member/helpdesk/tickets',
    {
      schema: { params: PariwarParam, response: { 201: MemberTicketDetailResponse }, tags: [HELPDESK_TAG] },
      config: { rateLimit: memberWrite },
      preHandler: [memberSession],
    },
    h.create,
  );

  // GET — the member's own inbox (newest-first, ownership-scoped).
  r.get(
    '/api/v1/p/:pariwarId/member/helpdesk/tickets',
    {
      schema: { params: PariwarParam, response: { 200: MemberTicketListResponse }, tags: [HELPDESK_TAG] },
      preHandler: [memberSession],
    },
    h.list,
  );

  // GET — the in-force category set (registry-driven). `categories` is a sibling of `tickets`, not
  // a suffix under it (`/tickets/:ticketId` never matches `/categories`), so route registration
  // order here is not load-bearing — kept adjacent to the other GETs for readability only.
  r.get(
    '/api/v1/p/:pariwarId/member/helpdesk/categories',
    {
      schema: { params: PariwarParam, response: { 200: HelpdeskCategoryListResponse }, tags: [HELPDESK_TAG] },
      preHandler: [memberSession],
    },
    h.categories,
  );

  // GET — one owned ticket (status + routing target + SLA + read-only thread), or 404.
  r.get(
    '/api/v1/p/:pariwarId/member/helpdesk/tickets/:ticketId',
    {
      schema: { params: TicketParam, response: { 200: MemberTicketDetailResponse }, tags: [HELPDESK_TAG] },
      preHandler: [memberSession],
    },
    h.detail,
  );

  // POST — the member replies to their OWN ticket (awaiting_member → in_progress). The member→staff
  // half of the round-trip (Story 10.4, AC3). Member-session-gated (no admin RBAC — the ticket owner
  // acting on their own ticket); carries the FR-88 per-member write budget.
  r.post(
    '/api/v1/p/:pariwarId/member/helpdesk/tickets/:ticketId/reply',
    {
      schema: {
        params: TicketParam,
        body: HelpdeskReplyRequest,
        response: { 200: MemberTicketDetailResponse },
        tags: [HELPDESK_TAG],
      },
      config: { rateLimit: memberWrite },
      preHandler: [memberSession],
    },
    h.reply,
  );

  // GET — a short-lived signed URL for one of the member's OWN attachments (ownership re-checked).
  r.get(
    '/api/v1/p/:pariwarId/member/helpdesk/tickets/:ticketId/attachments/:attachmentIndex/url',
    {
      schema: { params: AttachmentParam, response: { 200: HelpdeskAttachmentUrlResponse }, tags: [HELPDESK_TAG] },
      preHandler: [memberSession],
    },
    h.attachmentUrl,
  );
}
