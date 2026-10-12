// The neighbours' answer screens — the MEMBER handlers (Story 6.27a PM11; `2026-10-10-311`) and the HELPLINE handlers
// (PM12). The shared crypto / wire / error core is `peer-request-core.ts`.
//
// ── The member routes ──────────────────────────────────────────────────────────────────────────────────────────────
// `requireMemberSession` + the `perMemberKey` write budget + an `Idempotency-Key` on writes; ⛔ NO Turnstile (F34 — the
// mobile token is a placeholder; the session and the budget are the control: a neighbour is a selected, authenticated
// member). Each handler opens its OWN `openScopeTx` (a member route has ⛔ no scope-resolution hook — F27); a path
// `pariwarId` that is ⛔ not the session's is the SAME 404 as everything else.
// ⭐ ONE indistinguishable 404 (`peer_request.not_found`) for "⛔ yours / unknown / another Pariwar / ⛔ texted"
// (`send_outcome IS DISTINCT FROM 'accepted'`) on EVERY route — so ⛔ no named death reaches a member the Trust has ⛔ not
// texted (and so ⛔ never before Row 27). 409 `peer_request.no_longer_open` / `peer_request.submitted` for "yours,
// texted, but closed / submitted" (⛔ never why). The list shows OPEN requests only.
// ── The helpline routes ────────────────────────────────────────────────────────────────────────────────────────────
// 6.3's chain (`claim.file` + step-up; ⛔ no new key — a reuse, 6.21b D5's precedent), through the scope-resolution
// hook's tx. The operator sees ONLY the answers of the neighbour on the phone (PM25 (b)) — ⛔ never another neighbour's,
// ⛔ never the warning lines, ⛔ never the counts. The list, the save and the submit are gated on a TEXTED ping exactly as
// the member routes are (PM12) — before 6.27c texts anyone the panel is EMPTY.
// ── Audit ──────────────────────────────────────────────────────────────────────────────────────────────────────────
// ONE `withCompensatingAudit` intent line per write (`claim.peer_answer_saved` / `claim.peer_reply_submitted`,
// `claim:<id>`); the payload hash covers the ping and the question KEY only. ⛔ Never an answer, a name or a code in an
// audit line, a log or an error body (Invariant 6).

import type {
  HelplinePeerRequestListResponse,
  PeerRequestDetailResponse,
  PeerRequestListResponse,
  PeerRequestSaveAnswerRequest,
  PeerRequestSaveAnswerResponse,
  PeerRequestSubmitResponse,
} from '@twt/contracts';
import { PEER_REQUEST_NO_LONGER_OPEN_CODE, PEER_REQUEST_SUBMITTED_CODE } from '@twt/contracts';
import { audit, claim, cycleCalendar, idempotency, ids, type Db } from '@twt/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type pg from 'pg';

import type { AppDeps } from '../../context.js';
import { BadRequestError, ConflictError, NotFoundError, UnauthorizedError } from '../../http-errors.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';
import {
  buildPeerRequestDetail,
  mapPeerRequestError,
  PEER_REQUEST_NOT_FOUND_CODE,
  peerRequestPayloadHash,
  prepareSave,
  resolvePeerRequestMemberName,
  todayIst,
  toWireAnswers,
} from './peer-request-core.js';

/** How long a write's Idempotency-Key is held (a retried auto-save arrives within seconds). */
const PEER_REQUEST_IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60;

type Ctx = { readonly actorId: string; readonly pariwarId: string; readonly memberId: string | null; readonly via: 'member_app' | 'helpline' };

export function createPeerRequestHandlers(deps: AppDeps) {
  const idempotencyStore = idempotency.createKeyedStore(deps.pool);

  /** The member's session (memberId, pariwarId); a mismatched path Pariwar is the SAME 404 (no tenant oracle). */
  function memberCtx(request: FastifyRequest): Ctx {
    const memberIdStr = request.requestContext.actorId;
    const pariwarIdStr = request.requestContext.pariwarId;
    if (!memberIdStr || !pariwarIdStr) throw new UnauthorizedError('Authentication required', 'auth.session_required');
    const pathPariwarId = (request.params as { pariwarId?: string }).pariwarId;
    if (pathPariwarId && pathPariwarId !== pariwarIdStr) throw new NotFoundError('Not found', PEER_REQUEST_NOT_FOUND_CODE);
    return { actorId: memberIdStr, pariwarId: pariwarIdStr, memberId: memberIdStr, via: 'member_app' };
  }

  /** The operator on 6.3's chain — the scope tx is the scope-resolution hook's. */
  function helplineCtx(request: FastifyRequest): Ctx {
    const scopeTx = request.scopeTx;
    const actorId = request.requestContext.actorId;
    if (!scopeTx || !actorId) throw new UnauthorizedError('Authentication required', 'auth.session_required');
    return { actorId, pariwarId: scopeTx.pariwarId, memberId: null, via: 'helpline' };
  }

  function requireIdempotencyKey(request: FastifyRequest): string {
    const raw = request.headers['idempotency-key'];
    const key = Array.isArray(raw) ? raw[0] : raw;
    if (!key || key.trim() === '') throw new BadRequestError('An Idempotency-Key header is required', 'peer_request.idempotency_key_required');
    return key.trim();
  }

  /** Run `fn` on a member route's OWN scope tx (commit on success; a mapped 4xx rolls back — nothing was written). */
  async function onMemberTx<T>(ctx: Ctx, fn: (client: pg.PoolClient, tx: Db) => Promise<T>): Promise<T> {
    const scopeTx = await openScopeTx(deps, ctx.pariwarId);
    let ok = false;
    try {
      const out = await fn(scopeTx.client, scopeTx.tx);
      ok = true;
      return out;
    } catch (err) {
      return mapPeerRequestError(err);
    } finally {
      await closeScopeTx(scopeTx, ok);
    }
  }

  /** Run `fn` on the helpline route's hook-owned scope tx (the lifecycle hook commits / rolls back). */
  async function onHelplineTx<T>(request: FastifyRequest, fn: (client: pg.PoolClient, tx: Db) => Promise<T>): Promise<T> {
    const scopeTx = request.scopeTx!;
    try {
      return await fn(scopeTx.client, scopeTx.tx);
    } catch (err) {
      return mapPeerRequestError(err);
    }
  }

  /**
   * Claim the Idempotency-Key; on a replay with a recorded result run `replay` (a fresh read — ⛔ the store never holds an
   * answer); a live claim with ⛔ no result yet is a 409 "in progress".
   */
  async function withIdempotency<T>(
    idemKey: string,
    replay: () => Promise<T>,
    run: () => Promise<T>,
  ): Promise<T> {
    const outcome = await idempotencyStore.claim(idemKey, PEER_REQUEST_IDEMPOTENCY_TTL_SECONDS);
    if (outcome === 'already_claimed') {
      if ((await idempotencyStore.getResult(idemKey)) !== null) return replay();
      throw new ConflictError('A request with this Idempotency-Key is already in progress — please wait and retry', 'peer_request.idempotency_in_progress');
    }
    let settled = false;
    try {
      const out = await run();
      await idempotencyStore.recordResult(idemKey, { done: true });
      settled = true;
      return out;
    } finally {
      if (!settled) await idempotencyStore.release(idemKey).catch(() => undefined);
    }
  }

  // ── the shared bodies ────────────────────────────────────────────────────────────────────────────────────────────

  async function detailOn(tx: Db, ctx: Ctx, pingId: string, request: FastifyRequest): Promise<PeerRequestDetailResponse> {
    const view = await claim.readPeerRequest(tx, ids.pariwarId(ctx.pariwarId), ids.peerMeshPingId(pingId), ctx.memberId === null ? null : ids.memberId(ctx.memberId));
    if (view.reply?.submittedAt != null) throw new ConflictError('These answers were already sent', PEER_REQUEST_SUBMITTED_CODE);
    if (!view.inWindow) throw new ConflictError('This request is no longer open', PEER_REQUEST_NO_LONGER_OPEN_CODE);
    return buildPeerRequestDetail(tx, view, ctx.pariwarId, deps.encryption, request.log);
  }

  async function saveOn(client: pg.PoolClient, tx: Db, ctx: Ctx, request: FastifyRequest): Promise<PeerRequestSaveAnswerResponse> {
    const { pingId, questionKey } = request.params as { pingId: string; questionKey: string };
    const { value } = request.body as PeerRequestSaveAnswerRequest;
    const today = todayIst(deps.clock());
    // ⭐ PRE-LOCK: read, decrypt, check, encrypt, index (⛔ no KMS under a lock — Trap 9).
    const { prepared, decryptedLive } = await prepareSave(
      tx,
      { pariwarId: ctx.pariwarId, pingId, memberId: ctx.memberId, questionKey, value, todayIst: today },
      deps.encryption,
      request.log,
    );
    const view = await claim.readPeerRequest(tx, ids.pariwarId(ctx.pariwarId), ids.peerMeshPingId(pingId), ctx.memberId === null ? null : ids.memberId(ctx.memberId));
    const result = await audit.withCompensatingAudit(deps.servicePool, {
      auditIntent: {
        pariwarId: ctx.pariwarId,
        actorId: ctx.actorId,
        actorRole: null,
        action: 'claim.peer_answer_saved',
        resourceLocator: `claim:${ids.claimId(view.claimCaseId)}`,
        requestPayloadHash: peerRequestPayloadHash({ ping_id: pingId, question_key: questionKey, via: ctx.via }),
        traceId: request.requestContext.traceId ?? null,
      },
      mutate: () =>
        claim.savePeerAnswer(client, {
          pariwarId: ids.pariwarId(ctx.pariwarId),
          pingId: ids.peerMeshPingId(pingId),
          memberId: ctx.memberId === null ? null : ids.memberId(ctx.memberId),
          questionKey,
          value,
          prepared,
          decryptedLive,
          savedVia: ctx.via,
          savedByActorId: ctx.actorId,
          todayIst: today,
        }),
    });
    // The reply's live answers for their OWNER — decrypted from what this request already holds (⛔ no KMS now: the
    // writer's locks are held until COMMIT): the pre-lock decrypts, plus the value just saved.
    const known = new Map(decryptedLive);
    for (const row of result.live) {
      if (row.valueCiphertext !== null && !known.has(row.answerId) && row.questionKey === questionKey) known.set(row.answerId, value);
    }
    return { answers: toWireAnswers(result.live, known) };
  }

  async function submitOn(client: pg.PoolClient, tx: Db, ctx: Ctx, request: FastifyRequest): Promise<PeerRequestSubmitResponse> {
    const { pingId } = request.params as { pingId: string };
    const view = await claim.readPeerRequest(tx, ids.pariwarId(ctx.pariwarId), ids.peerMeshPingId(pingId), ctx.memberId === null ? null : ids.memberId(ctx.memberId));
    await audit.withCompensatingAudit(deps.servicePool, {
      auditIntent: {
        pariwarId: ctx.pariwarId,
        actorId: ctx.actorId,
        actorRole: null,
        action: 'claim.peer_reply_submitted',
        resourceLocator: `claim:${ids.claimId(view.claimCaseId)}`,
        requestPayloadHash: peerRequestPayloadHash({ ping_id: pingId, via: ctx.via }),
        traceId: request.requestContext.traceId ?? null,
      },
      mutate: () =>
        claim.submitPeerReply(client, {
          pariwarId: ids.pariwarId(ctx.pariwarId),
          pingId: ids.peerMeshPingId(pingId),
          memberId: ctx.memberId === null ? null : ids.memberId(ctx.memberId),
        }),
    });
    return { submitted: true };
  }

  return {
    // ── member ───────────────────────────────────────────────────────────────────────────────────────────────────
    /** GET …/member/peer-requests?limit= — the session member's OPEN requests (texted, ⛔ submitted, in the window). */
    async memberList(request: FastifyRequest): Promise<PeerRequestListResponse> {
      const ctx = memberCtx(request);
      const { limit } = request.query as { limit?: number };
      return onMemberTx(ctx, async (_client, tx) => {
        const rows = await claim.listOpenPeerRequestsForMember(tx, ids.pariwarId(ctx.pariwarId), ids.memberId(ctx.actorId), limit);
        const items = [];
        for (const row of rows) {
          items.push({
            pingId: row.pingId,
            memberName: await resolvePeerRequestMemberName(tx, ctx.pariwarId, row.deceasedMemberId, deps.encryption, request.log),
            askedOn: row.askedAt === null ? '' : cycleCalendar.istDateOf(row.askedAt),
          });
        }
        return { items };
      });
    },

    /** GET …/member/peer-requests/:pingId — the pinned questionnaire (words resolved), the live answers, submitted. */
    async memberDetail(request: FastifyRequest): Promise<PeerRequestDetailResponse> {
      const ctx = memberCtx(request);
      const { pingId } = request.params as { pingId: string };
      return onMemberTx(ctx, (_client, tx) => detailOn(tx, ctx, pingId, request));
    },

    /** PUT …/member/peer-requests/:pingId/answers/:questionKey — the auto-save (idempotent by value). */
    async memberSave(request: FastifyRequest, reply: FastifyReply): Promise<PeerRequestSaveAnswerResponse> {
      const ctx = memberCtx(request);
      const { pingId, questionKey } = request.params as { pingId: string; questionKey: string };
      const key = requireIdempotencyKey(request);
      const out = await withIdempotency(
        `peer_request.save:${ctx.pariwarId}:${ctx.actorId}:${pingId}:${questionKey}:${key}`,
        () => onMemberTx(ctx, async (_c, tx) => ({ answers: (await detailOn(tx, ctx, pingId, request)).answers })),
        () => onMemberTx(ctx, (client, tx) => saveOn(client, tx, ctx, request)),
      );
      void reply.status(200);
      return out;
    },

    /** POST …/member/peer-requests/:pingId/submit — locks the reply. */
    async memberSubmit(request: FastifyRequest, reply: FastifyReply): Promise<PeerRequestSubmitResponse> {
      const ctx = memberCtx(request);
      const { pingId } = request.params as { pingId: string };
      const key = requireIdempotencyKey(request);
      const out = await withIdempotency(
        `peer_request.submit:${ctx.pariwarId}:${ctx.actorId}:${pingId}:${key}`,
        async () => ({ submitted: true as const }),
        () => onMemberTx(ctx, (client, tx) => submitOn(client, tx, ctx, request)),
      );
      void reply.status(200);
      return out;
    },

    // ── helpline ─────────────────────────────────────────────────────────────────────────────────────────────────
    /** GET …/admin/claims/helpline/members/:memberId/peer-requests?limit= — the caller's OPEN, TEXTED requests, each with
     *  ONLY that neighbour's answers (PM25 (b)). */
    async helplineList(request: FastifyRequest): Promise<HelplinePeerRequestListResponse> {
      const ctx = helplineCtx(request);
      const { memberId } = request.params as { memberId: string };
      const { limit } = request.query as { limit?: number };
      return onHelplineTx(request, async (_client, tx) => {
        const rows = await claim.listOpenPeerRequestsForMember(tx, ids.pariwarId(ctx.pariwarId), ids.memberId(memberId), limit);
        const items = [];
        for (const row of rows) {
          const view = await claim.readPeerRequest(tx, ids.pariwarId(ctx.pariwarId), row.pingId, ids.memberId(memberId));
          items.push(await buildPeerRequestDetail(tx, view, ctx.pariwarId, deps.encryption, request.log));
        }
        return { items };
      });
    },

    /** PUT …/admin/claims/helpline/peer-requests/:pingId/answers/:questionKey — the operator records one answer. */
    async helplineSave(request: FastifyRequest): Promise<PeerRequestSaveAnswerResponse> {
      const ctx = helplineCtx(request);
      return onHelplineTx(request, (client, tx) => saveOn(client, tx, ctx, request));
    },

    /** POST …/admin/claims/helpline/peer-requests/:pingId/submit — locks the reply (for the app too). */
    async helplineSubmit(request: FastifyRequest): Promise<PeerRequestSubmitResponse> {
      const ctx = helplineCtx(request);
      return onHelplineTx(request, (client, tx) => submitOn(client, tx, ctx, request));
    },
  };
}
