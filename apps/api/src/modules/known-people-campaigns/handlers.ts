// A Pariwar Admin's people-who-know-me CAMPAIGNS — Story 6.36c (Task 4.2; AC7; `-307` §2 item 4, `-330` SW16 (5), `-342`
// call 1).
//
// ⭐ A campaign SHOWS a home card in the app and sends ⛔ NOTHING: ⛔ an SMS, ⛔ a push, ⛔ a WhatsApp, ⛔ a dispatcher call. This
// module imports ⛔ `@twt/channels` and ⛔ a dispatcher (a source scan pins it). ⛔ Step-up — it sends nothing (recorded).
// The admin write shape: the ACTOR from the session, each write in its OWN scope tx, the audit line AFTER the commit with
// `resourceLocator: 'known_people_campaign:<id>'`.

import type {
  KnownPeopleCampaignListQuery,
  KnownPeopleCampaignListResponse,
  KnownPeopleCampaignRefusalCode,
  KnownPeopleCampaignStartRequest,
  KnownPeopleCampaignWire,
  KnownPeopleCampaignWriteResponse,
} from '@twt/contracts';
import { ids, member as memberDomain } from '@twt/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { ApiError, BadRequestError, ConflictError, NotFoundError, UnauthorizedError } from '../../http-errors.js';
import { emitAuthAudit } from '../auth/shared/audit.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';

/** SW16 (5) — the campaign key (pariwar dimension; `pariwar_admin` + derived `super_admin`). */
export const KNOWN_PEOPLE_RUN_CAMPAIGN_KEY = 'known_people.run_campaign';

const REFUSALS: Record<KnownPeopleCampaignRefusalCode, { status: 404 | 409 | 422; message: string }> = {
  'known_people_campaign.window_invalid': { status: 422, message: 'A campaign runs from today or later, for at most 30 days' },
  'known_people_campaign.overlap': { status: 409, message: 'Another campaign is already planned for some of those days' },
  'known_people_campaign.not_live': { status: 409, message: 'That campaign has already ended' },
  'known_people_campaign.not_found': { status: 404, message: 'No such campaign in this Pariwar' },
};

function translate(err: unknown): never {
  if (err instanceof memberDomain.KnownPeopleCampaignRefusedError) {
    const { status, message } = REFUSALS[err.code];
    if (status === 404) throw new NotFoundError(message, err.code);
    if (status === 409) throw new ConflictError(message, err.code);
    throw new ApiError(422, err.code, message);
  }
  if (err instanceof memberDomain.WorkplaceCursorInvalidError) throw new BadRequestError('The page cursor is not valid', 'known_people_campaign.cursor_invalid');
  throw err;
}

function dto(c: memberDomain.KnownPeopleCampaign): KnownPeopleCampaignWire {
  return {
    campaignId: c.campaignId,
    startsOn: c.startsOn,
    endsOn: c.endsOn,
    status: c.status,
    endedAt: c.endedAt?.toISOString() ?? null,
    createdAt: c.createdAt,
  };
}

export function createKnownPeopleCampaignHandlers(deps: AppDeps) {
  function ctxOf(request: FastifyRequest) {
    const scopeTx = request.scopeTx;
    const actorId = request.requestContext.actorId;
    if (!scopeTx || !actorId) throw new UnauthorizedError('Authentication required', 'auth.session_required');
    return { scopeTx, actorId, pariwarId: ids.pariwarId(scopeTx.pariwarId) };
  }

  async function write(request: FastifyRequest, run: (tx: Awaited<ReturnType<typeof openScopeTx>>['tx'], ctx: ReturnType<typeof ctxOf>) => Promise<memberDomain.KnownPeopleCampaign>) {
    const ctx = ctxOf(request);
    const scopeTx = await openScopeTx(deps, ctx.pariwarId);
    let ok = false;
    try {
      const out = await run(scopeTx.tx, ctx);
      ok = true;
      return { out, ctx };
    } catch (err) {
      return translate(err);
    } finally {
      await closeScopeTx(scopeTx, ok);
    }
  }

  return {
    async list(request: FastifyRequest): Promise<KnownPeopleCampaignListResponse> {
      const { scopeTx, pariwarId } = ctxOf(request);
      const q = request.query as KnownPeopleCampaignListQuery;
      try {
        const page = await memberDomain.listCampaigns(scopeTx.tx, { pariwarId, limit: q.limit, cursor: q.cursor });
        return { items: page.items.map(dto), nextCursor: page.nextCursor, hasMore: page.hasMore };
      } catch (err) {
        return translate(err);
      }
    },

    async start(request: FastifyRequest, reply: FastifyReply): Promise<KnownPeopleCampaignWriteResponse> {
      const body = request.body as KnownPeopleCampaignStartRequest;
      const { out, ctx } = await write(request, (tx, c) =>
        memberDomain.startCampaign(tx, { pariwarId: c.pariwarId, actorId: c.actorId, startsOn: body.startsOn, endsOn: body.endsOn }),
      );
      emitAuthAudit(deps, request, 'admin_known_people.campaign_started', {
        actorId: ctx.actorId,
        pariwarId: ctx.pariwarId,
        context: { starts_on: out.startsOn, ends_on: out.endsOn },
        resourceLocator: `known_people_campaign:${out.campaignId}`,
      });
      void reply.status(201);
      return { campaign: dto(out) };
    },

    async end(request: FastifyRequest): Promise<KnownPeopleCampaignWriteResponse> {
      const { campaignId } = request.params as { campaignId: string };
      const { out, ctx } = await write(request, (tx, c) => memberDomain.endCampaign(tx, { pariwarId: c.pariwarId, campaignId, actorId: c.actorId }));
      emitAuthAudit(deps, request, 'admin_known_people.campaign_ended', {
        actorId: ctx.actorId,
        pariwarId: ctx.pariwarId,
        context: { starts_on: out.startsOn, ends_on: out.endsOn },
        resourceLocator: `known_people_campaign:${out.campaignId}`,
      });
      return { campaign: dto(out) };
    },
  };
}
