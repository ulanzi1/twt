// A NOMINEE WHO IS ALSO A MEMBER — the member handlers (Story 6.36e, Task 3; AC2, AC4, AC9; `2026-10-24-397` NE6, NE11).
//
// ── RLS ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
// `requireMemberSession` sets (actorId, pariwarId) but opens ⛔ no scope tx; each step opens its OWN short scoped
// transaction (`openScopeTx`) and passes `scopeTx.tx` to the domain — ⛔ ever an unscoped pool.
//
// ── What each route does ─────────────────────────────────────────────────────────────────────────────────────────────
//   · `links` — the DECLARER's live marks on their ranks' current versions (AC2, V5 — ⛔ in `NomineeStatusResponse`, which
//     the claim flow reads). The marked member's registered name ONLY once they confirmed (`-309`).
//   · `requests` — the marks NAMING the member, page by page (open first). ⛔ A mark whose declarer a claim names as the
//     deceased (V13).
//   · `answer` — ONCE (NE6): "Yes, that's me" ⇒ `confirmed`; "No, that's not me" ⇒ `not_me`. Idempotency-Key per handler
//     (the 6.36b shape — ⛔ a plugin). A second answer, an ended mark or a dead declarer ⇒ 409 `nominee_link.request_closed`;
//     another member's mark ⇒ 404.
// Who may read or answer the requests: an `active` / `active-in-grace` member ⛔ named by a claim as the deceased — ONE 403
// `nominee_link.not_available` otherwise. Names are decrypted AFTER the read transaction commits (⛔ KMS inside it).
//
// ⭐⭐ ⛔ NUMBER, ⛔ NAME, ⛔ OTHER MEMBER'S ID in any log / audit / alarm call (AC9 — the number fence lists this file). Audit
// lines carry `nominee_link:<id>` + `{ rank }` ONLY. ⛔ SMS, push or WhatsApp is sent from this module (NE6 — the app only).

import {
  NOMINEE_LINK_ERROR_CODES as CODES,
  type NomineeLinkAnswerRequest,
  type NomineeLinkAnswerResponse,
  type NomineeLinkRequestsQuery,
  type NomineeLinkRequestsResponse,
  type NomineeLinksView,
  type NomineeMarksRankView,
} from '@twt/contracts';
import { idempotency, ids, nominee as nomineeDomain, type Db } from '@twt/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { ApiError, BadRequestError, ConflictError, ForbiddenError, NotFoundError, UnauthorizedError } from '../../http-errors.js';
import { emitAuthAudit } from '../auth/shared/audit.js';
import { decryptNames, readNameCiphertexts } from '../known-people/names.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';

/** How long the answer's idempotency claim is held (the 6.36b 300 s). */
const IDEMPOTENCY_TTL_SECONDS = 300;

/** A replayable result: the status AND the body. ⛔ A name is ever stored (the answer's body carries none). */
interface StoredResult<B> {
  readonly status: number;
  readonly body: B;
}

const REFUSAL: Record<'not_available' | 'not_found' | 'request_closed', () => ApiError> = {
  not_available: () => new ForbiddenError('Nominee marks are not available for this account', CODES.notAvailable),
  not_found: () => new NotFoundError('Not found', CODES.notFound),
  request_closed: () => new ConflictError('This request can no longer be answered', CODES.requestClosed),
};

export function createNomineeLinksHandlers(deps: AppDeps) {
  const enc = deps.encryption;
  const idempotencyStore = idempotency.createKeyedStore(deps.pool);

  function memberCtx(request: FastifyRequest): { memberId: ids.MemberId; pariwarId: ids.PariwarId } {
    const memberIdStr = request.requestContext.actorId;
    const pariwarIdStr = request.requestContext.pariwarId;
    if (!memberIdStr || !pariwarIdStr) throw new UnauthorizedError('Authentication required', 'auth.session_required');
    return { memberId: ids.memberId(memberIdStr), pariwarId: ids.pariwarId(pariwarIdStr) };
  }

  function requireIdempotencyKey(request: FastifyRequest): string {
    const raw = request.headers['idempotency-key'];
    const key = Array.isArray(raw) ? raw[0] : raw;
    if (!key || key.trim() === '') throw new BadRequestError('An Idempotency-Key header is required', CODES.idempotencyKeyRequired);
    return key.trim();
  }

  /** Run `fn` in its OWN short scoped transaction; committed on success, rolled back on a throw. */
  async function inScope<T>(pariwarId: string, fn: (tx: Db) => Promise<T>): Promise<T> {
    const scopeTx = await openScopeTx(deps, pariwarId);
    let ok = false;
    try {
      const out = await fn(scopeTx.tx);
      ok = true;
      return out;
    } finally {
      await closeScopeTx(scopeTx, ok);
    }
  }

  /**
   * The idempotent-write envelope (the 6.36b shape): the caller may answer → claim → `run` → record `{ status, body }`; a
   * replay returns the original. A failure (a refusal included) releases the claim. ⭐ The caller check comes FIRST, so a
   * stored result is delivered ONLY to a caller who still may.
   */
  async function idempotent<B>(request: FastifyRequest, reply: FastifyReply, route: string, run: () => Promise<StoredResult<B>>): Promise<B> {
    const { memberId, pariwarId } = memberCtx(request);
    if (!(await inScope(pariwarId, (tx) => nomineeDomain.isNomineeLinkAnswerer(tx, pariwarId, memberId)))) throw REFUSAL.not_available();
    const key = `nominee_link.${route}:${pariwarId}:${memberId}:${requireIdempotencyKey(request)}`;
    const claim = await idempotencyStore.claim(key, IDEMPOTENCY_TTL_SECONDS);
    if (claim === 'already_claimed') {
      const stored = (await idempotencyStore.getResult(key)) as StoredResult<B> | null;
      if (stored && typeof stored.status === 'number') {
        void reply.status(stored.status);
        return stored.body;
      }
      throw new ConflictError('A request with this Idempotency-Key is already in progress — please wait and retry', CODES.idempotencyInProgress);
    }
    let settled = false;
    try {
      const result = await run();
      settled = true;
      await idempotencyStore.recordResult(key, result).catch((err: unknown) => {
        request.log.error({ errName: (err as Error).name }, '[nominee-links-idempotency] the result was not recorded');
      });
      void reply.status(result.status);
      return result.body;
    } finally {
      if (!settled) await idempotencyStore.release(key).catch(() => undefined);
    }
  }

  return {
    /** GET /api/v1/member/life-events/nominee-links — the declarer's live marks (the name only once `confirmed`). */
    async links(request: FastifyRequest): Promise<NomineeLinksView> {
      const { memberId, pariwarId } = memberCtx(request);
      const { ranks, marks, read } = await inScope(pariwarId, async (tx) => {
        // ⭐ Story 6.36f (MK3) — the basis FIRST, then the marks, in this ONE READ COMMITTED tx: a save that commits between the
        // two reads leaves `ranks` stale, so the marks-only save is refused `marks_stale` — a mark added between the reads can
        // ⛔ be removed unseen. Reversed, a fresh `ranks` could sit beside stale `links`. (A source-order test pins this.)
        const ranks = await nomineeDomain.getProjectedNomineeVersions(tx, pariwarId, memberId);
        const marks = await nomineeDomain.listNomineeLinksForDeclarer(tx, { pariwarId, declarerMemberId: memberId });
        const confirmed = marks.flatMap((m) => (m.label === 'confirmed' ? [m.nomineeMemberId] : []));
        return { ranks, marks, read: await readNameCiphertexts(tx, pariwarId, confirmed) };
      });
      const names = await decryptNames(read, pariwarId, enc, request.log);
      return {
        ranks: ranks.map((v) => ({ rank: v.rank, versionNo: v.versionNo, relationship: v.relationship as NomineeMarksRankView['relationship'] })),
        links: marks.map((m) => ({
          rank: m.rank,
          linkId: m.linkId,
          label: m.label,
          name: m.label === 'confirmed' ? (names.get(m.nomineeMemberId) ?? null) : null,
        })),
      };
    },

    /**
     * GET /api/v1/member/nominee-links/requests — the marks naming the member, PAGE BY PAGE (open first). A well-formed cursor
     * this server did not issue ⇒ 400 `nominee_link.cursor_invalid`, decided AFTER the caller check.
     */
    async requests(request: FastifyRequest): Promise<NomineeLinkRequestsResponse> {
      const { memberId, pariwarId } = memberCtx(request);
      const q = request.query as NomineeLinkRequestsQuery;
      let fetched: { page: nomineeDomain.NomineeLinkRequestsPage; read: Awaited<ReturnType<typeof readNameCiphertexts>> };
      try {
        fetched = await inScope(pariwarId, async (tx) => {
          if (!(await nomineeDomain.isNomineeLinkAnswerer(tx, pariwarId, memberId))) throw REFUSAL.not_available();
          const page = await nomineeDomain.listNomineeLinkRequests(tx, { pariwarId, nomineeMemberId: memberId, limit: q.limit, cursor: q.cursor });
          return { page, read: await readNameCiphertexts(tx, pariwarId, page.items.map((r) => r.declarerMemberId)) };
        });
      } catch (err) {
        if (err instanceof nomineeDomain.NomineeLinkCursorInvalidError) throw new BadRequestError('The page cursor is not valid', CODES.cursorInvalid);
        throw err;
      }
      const { page, read } = fetched;
      const names = await decryptNames(read, pariwarId, enc, request.log);
      return {
        items: page.items.map((r) => ({
          linkId: r.linkId,
          answer: r.answer,
          name: names.get(r.declarerMemberId) ?? null,
          askedAt: r.askedAt.toISOString(),
        })),
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
      };
    },

    /** POST /api/v1/member/nominee-links/requests/:linkId/answer — "Yes, that's me" ⇒ confirmed; "No, that's not me" ⇒ not_me. */
    async answer(request: FastifyRequest, reply: FastifyReply): Promise<NomineeLinkAnswerResponse> {
      const { memberId, pariwarId } = memberCtx(request);
      const linkId = ids.nomineeLinkId((request.params as { linkId: string }).linkId);
      const answer = (request.body as NomineeLinkAnswerRequest).answer === 'yes' ? 'confirmed' : 'not_me';
      return idempotent<NomineeLinkAnswerResponse>(request, reply, 'answer', async () => {
        const r = await inScope(pariwarId, (tx) => nomineeDomain.answerNomineeLinkRequest(tx, { pariwarId, nomineeMemberId: memberId, linkId, answer }));
        if (r.kind === 'refused') throw REFUSAL[r.reason]();
        emitAuthAudit(deps, request, answer === 'confirmed' ? 'member_nominee_links.confirmed' : 'member_nominee_links.not_me', {
          resourceLocator: `nominee_link:${r.linkId}`,
          context: { rank: r.rank },
        });
        return { status: 200, body: { linkId: r.linkId, answer: r.answer } };
      });
    },
  };
}
