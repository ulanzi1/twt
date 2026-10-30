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
// 6.3's chain (`claim.file` + step-up; ⛔ no new key — a reuse, 6.21b D5's precedent). The operator sees ONLY the answers
// of the neighbour on the phone (PM25 (b)) — ⛔ never another neighbour's, ⛔ never the warning lines, ⛔ never the counts.
// ⭐ BOUND (second-pass review S12 — BigDev 2026-10-13, "bind and audit"): every helpline route carries the caller's
// `:memberId`, and the save / submit pass it to the domain's `visible()` — a ping of ANOTHER neighbour is the SAME 404 as
// an untexted one (⛔ the old `memberId: null` "any texted ping" form is gone). The list's decrypted read is AUDITED
// (`helpline_claim.peer_requests_read`, `member:<id>`). The writes take an `Idempotency-Key` exactly like the member
// routes (PM12: "the SAME save / submit shape as PM11" — review S18). ⭐ Fourth-pass review V1: a write first COMMITS and
// RELEASES the scope-resolution hook's tx (it carried only the preHandlers' READS), then writes on its OWN tx — so ONE
// connection is held (third-pass U2: two were), and the key's result is recorded only AFTER that COMMIT (U2's "on the
// hook's tx" recorded it before the COMMIT: a retry in between replayed answers without the save). ⚠ `closeScopeTx`
// RETHROWS a failed COMMIT (fixed by 6.36a's review round 2, 2026-10-15 — it used to swallow one), as on every `onMemberTx` route. The list, the save and the submit
// are gated on a TEXTED ping exactly as the member routes are (PM12) — before 6.27c texts anyone the panel is EMPTY.
// ── Audit ──────────────────────────────────────────────────────────────────────────────────────────────────────────
// ONE `withCompensatingAudit` intent line per write (`claim.peer_answer_saved` / `claim.peer_reply_submitted`,
// `claim:<id>`); the payload hash covers the ping and the question KEY only. ⛔ Never an answer, a name or a code in an
// audit line, a log or an error body (Invariant 6).

import type {
  HelplinePeerRequestListResponse,
  PeerRequestByLinkResponse,
  PeerRequestDetailResponse,
  PeerRequestListResponse,
  PeerRequestSaveAnswerRequest,
  PeerRequestSaveAnswerResponse,
  PeerRequestSubmitResponse,
} from '@twt/contracts';
import { PEER_REQUEST_NO_LONGER_OPEN_CODE, PEER_REQUEST_SUBMITTED_CODE } from '@twt/contracts';
import { audit, claim, cycleCalendar, idempotency, ids, questionnaires, type Db } from '@twt/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type pg from 'pg';

import type { AppDeps } from '../../context.js';
import { BadRequestError, ConflictError, NotFoundError, UnauthorizedError } from '../../http-errors.js';
import { emitAuthAudit } from '../auth/shared/audit.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';
import {
  buildPeerRequestDetail,
  decryptLiveSensitive,
  mapPeerRequestError,
  PEER_REQUEST_NOT_FOUND_CODE,
  peerRequestPayloadHash,
  prepareSave,
  resolvePeerRequestMemberName,
  todayIst,
  toWireAnswers,
} from './peer-request-core.js';

/**
 * How long a write's Idempotency-Key — and its recorded RESULT — is held: 24 h, because the mobile editor retries a
 * lost-response save with the SAME key for as long as the phone is offline, and the shared keyed store treats a
 * COMPLETED key past its TTL as claimed while hiding its result (⇒ 409 "in progress" until the vacuum). ⚠ Third-pass
 * review U1: the 15-min lease the second pass tried (S19) broke exactly that replay and is REVERTED; the cost it aimed
 * at — a process death leaving the key `pending` for the whole TTL — is deferred (deferred-work: the store needs a
 * pending lease separate from the retention).
 */
const PEER_REQUEST_IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60;

type Ctx = { readonly actorId: string; readonly pariwarId: string; readonly memberId: string; readonly via: 'member_app' | 'helpline' };

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

  /** The operator on 6.3's chain, recording the neighbour named by the path's `:memberId` (review S12 — ⛔ never "any"). */
  function helplineCtx(request: FastifyRequest): Ctx {
    const scopeTx = request.scopeTx;
    const actorId = request.requestContext.actorId;
    if (!scopeTx || !actorId) throw new UnauthorizedError('Authentication required', 'auth.session_required');
    const { memberId } = request.params as { memberId: string };
    return { actorId, pariwarId: scopeTx.pariwarId, memberId: memberId.toLowerCase(), via: 'helpline' };
  }

  function requireIdempotencyKey(request: FastifyRequest): string {
    const raw = request.headers['idempotency-key'];
    const key = Array.isArray(raw) ? raw[0] : raw;
    if (!key || key.trim() === '') throw new BadRequestError('An Idempotency-Key header is required', 'peer_request.idempotency_key_required');
    return key.trim();
  }

  /**
   * Run `fn` on the route's OWN scope tx — every member route (it has ⛔ no scope-resolution hook — F27) and every helpline
   * WRITE once its hook tx is released (V1). Commit on success;
   * a mapped 4xx rolls back — nothing was written. ⚠ `closeScopeTx` RETHROWS a failed COMMIT (since 6.36a's review round 2 — it used to swallow one), so
   * "recorded after the commit" holds only for a COMMIT that did not fail.
   */
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

  /**
   * Fourth-pass review V1 — a helpline WRITE ends the scope-resolution hook's tx BEFORE it writes: that tx carried only
   * the preHandlers' reads (session, scope, permission, step-up), so it COMMITS and its connection goes back to the pool.
   * `scopeSet = false` first, so the lifecycle hooks (`onSend` / `onResponse`) do ⛔ not close it again.
   */
  async function releaseHookTx(request: FastifyRequest): Promise<void> {
    const hookTx = request.scopeTx;
    if (!hookTx?.scopeSet) return;
    hookTx.scopeSet = false;
    // The hook tx carried READS only: a failed COMMIT loses nothing — ⛔ a 500 before the route's own write (`closeScopeTx`
    // rethrows a failed COMMIT since 6.36a's review, 2026-10-15).
    await closeScopeTx(hookTx, true).catch(() => undefined);
    // Detached, so nothing later in this request can reach a client that is back in the pool (fifth-pass review W9).
    request.scopeTx = undefined;
  }

  /** Run `fn` on the helpline route's hook-owned scope tx (the lifecycle hook commits / rolls back) — the READ only. */
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

  /**
   * The reply's live answers for their OWNER — decrypted from what this request already holds (⛔ no KMS now: the
   * writer's locks are held until COMMIT): the pre-lock decrypts, plus the value just saved AS STORED (normalised —
   * review S21, ⛔ the request's raw value).
   */
  function withSaved(
    decryptedLive: ReadonlyMap<string, questionnaires.QuestionnaireAnswerValue>,
    live: readonly { answerId: string; questionKey: string; valueCiphertext: string | null }[],
    questionKey: string,
    stored: questionnaires.QuestionnaireAnswerValue,
  ): Map<string, questionnaires.QuestionnaireAnswerValue> {
    const known = new Map(decryptedLive);
    for (const row of live) {
      if (row.valueCiphertext !== null && !known.has(row.answerId) && row.questionKey === questionKey) known.set(row.answerId, stored);
    }
    return known;
  }

  async function detailOn(tx: Db, ctx: Ctx, pingId: string, request: FastifyRequest): Promise<PeerRequestDetailResponse> {
    const view = await claim.readPeerRequest(tx, ids.pariwarId(ctx.pariwarId), ids.peerMeshPingId(pingId), ids.memberId(ctx.memberId));
    if (view.reply?.submittedAt != null) throw new ConflictError('These answers were already sent', PEER_REQUEST_SUBMITTED_CODE);
    if (!view.inWindow) throw new ConflictError('This request is no longer open', PEER_REQUEST_NO_LONGER_OPEN_CODE);
    return buildPeerRequestDetail(tx, view, ctx.pariwarId, deps.encryption, request.log);
  }

  /**
   * A save's REPLAY: the reply's live answers as they stand — ⛔ without the open / submitted checks, so a save that DID
   * commit is ⛔ never reported as a 409 because the reply was submitted (or the window closed) since (review S19).
   * ⚠ DELIBERATE (third-pass review U16 (b)): the guards are skipped ONLY here, ONLY for the caller holding a key whose
   * save COMMITTED (its key is recorded after the COMMIT on every path — V1), and the read is still `visible()`-bound (the same member, a texted ping). For the helpline it returns
   * that neighbour's answers with ⛔ a read-audit line — the operator recorded them under this very key. ⭐ Re-examine if a
   * replay may ever serve a key it did ⛔ not write, or if the key's retention (24 h) grows.
   */
  async function liveAnswersOn(tx: Db, ctx: Ctx, pingId: string, request: FastifyRequest): Promise<PeerRequestSaveAnswerResponse> {
    const pid = ids.pariwarId(ctx.pariwarId);
    const view = await claim.readPeerRequest(tx, pid, ids.peerMeshPingId(pingId), ids.memberId(ctx.memberId));
    const rows = view.reply ? await claim.readLivePeerAnswers(tx, pid, view.reply.replyId) : [];
    return { answers: toWireAnswers(rows, await decryptLiveSensitive(rows, ctx.pariwarId, deps.encryption, request.log)) };
  }

  async function saveOn(client: pg.PoolClient, tx: Db, ctx: Ctx, request: FastifyRequest): Promise<PeerRequestSaveAnswerResponse> {
    const { pingId, questionKey } = request.params as { pingId: string; questionKey: string };
    const { value, questionnaireVersionId } = request.body as PeerRequestSaveAnswerRequest;
    const today = todayIst(deps.clock());
    // ⭐ PRE-LOCK: read, decrypt, check, encrypt, index (⛔ no KMS under a lock — Trap 9).
    const { prepared, decryptedLive, stored, unchanged, versionId } = await prepareSave(
      tx,
      {
        pariwarId: ctx.pariwarId,
        pingId,
        memberId: ctx.memberId,
        questionKey,
        value,
        todayIst: today,
        ...(questionnaireVersionId !== undefined ? { clientVersionId: questionnaireVersionId } : {}),
      },
      deps.encryption,
      request.log,
    );
    const view = await claim.readPeerRequest(tx, ids.pariwarId(ctx.pariwarId), ids.peerMeshPingId(pingId), ids.memberId(ctx.memberId));
    const write = () =>
      claim.savePeerAnswer(client, {
        pariwarId: ids.pariwarId(ctx.pariwarId),
        pingId: ids.peerMeshPingId(pingId),
        memberId: ids.memberId(ctx.memberId),
        questionKey,
        value,
        prepared,
        decryptedLive,
        // ⭐ Story 6.33 (R7) — the writer compares both with the version it would pin, UNDER its locks, FIRST.
        preReadVersionId: versionId,
        ...(questionnaireVersionId !== undefined ? { clientVersionId: questionnaireVersionId } : {}),
        savedVia: ctx.via,
        savedByActorId: ctx.actorId,
        todayIst: today,
      });
    // ⭐ ADR-0030's protocol — the NO-OP pre-check runs BEFORE the audit helper (review S20): re-saving the live value
    // writes ⛔ nothing, so it writes ⛔ no "saved" line. Should the value have changed in between (a race the writer's
    // locks resolve), the save is refused as stale and rolled back — the client's retry then takes the audited path.
    if (unchanged) {
      const noop = await write();
      if (noop.written) throw new claim.PeerRequestStaleError();
      return { answers: toWireAnswers(noop.live, withSaved(decryptedLive, noop.live, questionKey, stored)) };
    }
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
      // ⭐ Third-pass review U10 — the OPPOSITE race: the value differed before the lock and is equal under it, so this
      // audited save wrote NOTHING. It is refused as stale (the helper writes its compensating "rolled back" line and the
      // tx rolls back); the client's retry then takes the un-audited no-op path above — ⛔ a "saved" line for a no-op.
      mutate: async () => {
        const r = await write();
        if (!r.written) throw new claim.PeerRequestStaleError();
        return r;
      },
    });
    return { answers: toWireAnswers(result.live, withSaved(decryptedLive, result.live, questionKey, stored)) };
  }

  async function submitOn(client: pg.PoolClient, tx: Db, ctx: Ctx, request: FastifyRequest): Promise<PeerRequestSubmitResponse> {
    const { pingId } = request.params as { pingId: string };
    const view = await claim.readPeerRequest(tx, ids.pariwarId(ctx.pariwarId), ids.peerMeshPingId(pingId), ids.memberId(ctx.memberId));
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
          memberId: ids.memberId(ctx.memberId),
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

    /**
     * ⭐ Story 6.27c (R14) — GET …/member/peer-requests/by-link/:code: `{ pingId }` iff the code has the link form AND its ping is
     * the SESSION member's in this Pariwar AND it was TEXTED — submitted or closed included (the detail read then answers 409);
     * everything else the SAME 404 (`peer_request.not_found`). ⛔ The code is never logged, echoed or put in an error.
     */
    async memberByLink(request: FastifyRequest): Promise<PeerRequestByLinkResponse> {
      const ctx = memberCtx(request);
      const { code } = request.params as { code: string };
      return onMemberTx(ctx, async (_client, tx) => {
        const pingId = await claim.resolvePeerRequestByLinkCode(tx, {
          pariwarId: ids.pariwarId(ctx.pariwarId),
          memberId: ids.memberId(ctx.memberId),
          code,
        });
        if (pingId === null) throw new NotFoundError('Not found', PEER_REQUEST_NOT_FOUND_CODE);
        return { pingId };
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
        () => onMemberTx(ctx, (_c, tx) => liveAnswersOn(tx, ctx, pingId, request)),
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
     *  ONLY that neighbour's answers (PM25 (b)). Audited (review S12). */
    async helplineList(request: FastifyRequest): Promise<HelplinePeerRequestListResponse> {
      const ctx = helplineCtx(request);
      const { limit } = request.query as { limit?: number };
      const out = await onHelplineTx(request, async (_client, tx) => {
        const rows = await claim.listOpenPeerRequestsForMember(tx, ids.pariwarId(ctx.pariwarId), ids.memberId(ctx.memberId), limit);
        const items = [];
        let unreadable = 0;
        for (const row of rows) {
          const view = await claim.readPeerRequest(tx, ids.pariwarId(ctx.pariwarId), row.pingId, ids.memberId(ctx.memberId));
          try {
            items.push(await buildPeerRequestDetail(tx, view, ctx.pariwarId, deps.encryption, request.log));
          } catch (err) {
            // Review RV32 / QE12 R7 (v) — ONE request whose pinned version cannot be read (the reader has already raised the R8
            // alarm) must ⛔ hide the neighbour's OTHER open requests while an operator is on the phone: it is left out of the
            // list, logged with ids only and COUNTED on the audit line. The member's own view of THAT request is still the 409.
            // (Thrown in JS after a successful read — the shared transaction is intact.)
            if (!(err instanceof claim.PeerRequestVersionUnreadableError)) throw err;
            unreadable += 1;
            request.log.warn({ pingId: row.pingId, memberId: ctx.memberId }, 'helpline peer-requests: a request is left out — its pinned questionnaire version cannot be read');
          }
        }
        return { items, unreadable };
      });
      // ⭐ Review S12 — an AUDITED read: the operator saw the deceased's name and this neighbour's answers (Tier-1 among
      // them). ONE line per read, naming the neighbour (`member:<id>`) and HOW MANY — ⛔ never a name, an answer or a code.
      emitAuthAudit(deps, request, 'helpline_claim.peer_requests_read', {
        actorId: ctx.actorId,
        pariwarId: ctx.pariwarId,
        context: {
          member_id: ctx.memberId,
          requests: out.items.length,
          answers: out.items.reduce((n, i) => n + i.answers.length, 0),
          ...(out.unreadable > 0 ? { unreadable_requests: out.unreadable } : {}),
        },
        resourceLocator: `member:${ctx.memberId}`,
      });
      return { items: out.items };
    },

    /** PUT …/admin/claims/helpline/members/:memberId/peer-requests/:pingId/answers/:questionKey — the operator records ONE
     *  answer for the neighbour on the phone (bound — review S12; an Idempotency-Key — review S18). */
    async helplineSave(request: FastifyRequest, reply: FastifyReply): Promise<PeerRequestSaveAnswerResponse> {
      const ctx = helplineCtx(request);
      const { pingId, questionKey } = request.params as { pingId: string; questionKey: string };
      const key = requireIdempotencyKey(request);
      await releaseHookTx(request);
      const out = await withIdempotency(
        `peer_request.helpline.save:${ctx.pariwarId}:${ctx.actorId}:${ctx.memberId}:${pingId}:${questionKey}:${key}`,
        () => onMemberTx(ctx, (_c, tx) => liveAnswersOn(tx, ctx, pingId, request)),
        () => onMemberTx(ctx, (client, tx) => saveOn(client, tx, ctx, request)),
      );
      void reply.status(200);
      return out;
    },

    /** POST …/admin/claims/helpline/members/:memberId/peer-requests/:pingId/submit — locks the reply (for the app too). */
    async helplineSubmit(request: FastifyRequest, reply: FastifyReply): Promise<PeerRequestSubmitResponse> {
      const ctx = helplineCtx(request);
      const { pingId } = request.params as { pingId: string };
      const key = requireIdempotencyKey(request);
      await releaseHookTx(request);
      const out = await withIdempotency(
        `peer_request.helpline.submit:${ctx.pariwarId}:${ctx.actorId}:${ctx.memberId}:${pingId}:${key}`,
        async () => ({ submitted: true as const }),
        () => onMemberTx(ctx, (client, tx) => submitOn(client, tx, ctx, request)),
      );
      void reply.status(200);
      return out;
    },
  };
}
