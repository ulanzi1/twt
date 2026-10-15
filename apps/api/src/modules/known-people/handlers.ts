// PEOPLE WHO KNOW ME — the member handlers (Story 6.36b, Task 3; AC3–AC8, AC10; 6.36a SW10–SW14; `-310` CF5 A).
//
// ── RLS ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
// `requireMemberSession` sets (actorId, pariwarId) but opens ⛔ no scope tx; each step opens its OWN short scoped
// transaction (`openScopeTx`) and passes `scopeTx.tx` to the domain — ⛔ ever an unscoped pool, ⛔ the `servicePool`
// pre-scope lookup (it crosses Pariwars — SF9 / I5).
//
// ── The order of a write ─────────────────────────────────────────────────────────────────────────────────────────────
//   0. the caller may use the feature (`isKnownPeopleCaller` — `active`, ⛔ named by a claim as the deceased:
//      `2026-10-15-333` call 1) — checked BEFORE the claim, so a replay is delivered ONLY to a caller who still may (⛔ an
//      old success to a member who has since left `active` — review 2026-10-15 R6); ONE 403 otherwise;
//   1. the `Idempotency-Key` claim (a replay returns the ORIGINAL status + body);
//   2. the COUNTERS in a short transaction — BEFORE any HMAC (a refused request costs ⛔ no KMS call); a caller who may ⛔
//      use it is refused here with ONE 403 (`known_people.not_available` — ⛔ which state, ⛔ why);
//   3. the HMACs OUTSIDE any transaction (the batch path: ≤ 8 in flight per process, ONE audit line);
//   4. the domain write in its own scoped transaction (the namer's advisory lock lives there);
//   5. names (if any) decrypted AFTER the read transaction commits (⛔ KMS under a lock);
//   6. ONE audit line — ids and counts only.
//
// ⭐⭐ ⛔ NO NUMBER ANYWHERE (I4, AC4): the submitted numbers / mobile are normalised in memory, HMAC'd and dropped — ⛔
// stored, ⛔ logged, ⛔ audited, ⛔ in any error. A source fence (`tests/unit/known-people-number-fence.test.ts`) refuses a
// log / audit / alarm call that receives `numbers` or `mobile`. ⛔ No SMS, push or WhatsApp is sent from this module
// (AC6 — the request is shown in the app only; the same fence pins it).

import {
  KNOWN_PEOPLE_ERROR_CODES as CODES,
  type KnownPeopleAnswerRequest,
  type KnownPeopleContactMatchRequest,
  type KnownPeopleContactMatchResponse,
  type KnownPeopleListQuery,
  type KnownPeopleRequestsQuery,
  type KnownPeopleRequestsResponse,
  type KnownPeopleWriteResponse,
  type KnownPersonAskRequest,
  type KnownPersonAskResponse,
  type MyKnownPeopleResponse,
} from '@twt/contracts';
import { encryption, idempotency, ids, member as memberDomain, type Db } from '@twt/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { ApiError, BadRequestError, ConflictError, ForbiddenError, NotFoundError, TooManyRequestsError, UnauthorizedError } from '../../http-errors.js';
import { emitAuthAudit } from '../auth/shared/audit.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';
import { decryptNames, readNameCiphertexts } from './names.js';

/** How long a write's idempotency claim is held — headroom over one HMAC + a short write (the 10.2 / 10.15 300 s). */
const IDEMPOTENCY_TTL_SECONDS = 300;

/**
 * A replayable result: the status AND the body (an ask answers 201 OR 200). ⛔ A decrypted name is EVER stored here — the
 * store is a plain table (`idempotency_keys.result`), and the peer-request precedent holds *"⛔ the store never holds an
 * answer"* (review round 2, P4): a reply that names someone records only WHOSE name it carries (`nameOf`, a member id),
 * and the name is resolved on each delivery, the first and every replay alike.
 */
interface StoredResult<B> {
  readonly status: number;
  readonly body: B;
  /** The member whose registered name the reply carries — resolved per delivery by the route's `present`. */
  readonly nameOf?: string | null;
}

const REFUSAL: Record<string, () => ApiError> = {
  not_available: () => new ForbiddenError('People who know me is not available for this account', CODES.notAvailable),
  daily_limit: () => new TooManyRequestsError('Daily limit reached — try again tomorrow', CODES.dailyLimit),
  monthly_limit: () => new TooManyRequestsError('Monthly limit reached', CODES.monthlyLimit),
  busy: () => new TooManyRequestsError('Too many checks right now — try again later', CODES.busy),
  not_a_member: () => new NotFoundError('This number is not a member you can name', CODES.notAMember),
  self: () => new ApiError(422, CODES.self, 'You cannot name yourself'),
  cannot_ask_now: () => new ConflictError('You cannot ask this person again yet', CODES.cannotAskNow),
  limit_reached: () => new ConflictError('You have already named three people', CODES.limitReached),
  request_closed: () => new ConflictError('This request can no longer be answered', CODES.requestClosed),
  not_found: () => new NotFoundError('Not found', CODES.notFound),
};

function refusal(reason: string): ApiError {
  const make = REFUSAL[reason];
  if (!make) throw new Error(`known-people: unmapped refusal ${reason}`);
  return make();
}

export function createKnownPeopleHandlers(deps: AppDeps) {
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
   * The idempotent-write envelope: the caller may use the feature → claim → `run` → record `{ status, body }`; a replay
   * returns the original. A failure (a refusal included) releases the claim so a retry reaches the domain again and gets
   * the same honest answer. ⭐ The caller check comes FIRST: the stored result is delivered ONLY to a caller who still may
   * — with it inside `run` alone, a member who had left `active` got the old success back for an unexpired key instead of
   * the ONE 403 (review 2026-10-15 R6). `present` turns what was stored into the reply (a name resolved now — P4).
   */
  async function idempotent<B>(
    request: FastifyRequest,
    reply: FastifyReply,
    route: string,
    run: () => Promise<StoredResult<B>>,
    present: (stored: StoredResult<B>) => Promise<B> = async (stored) => stored.body,
  ): Promise<B> {
    const { memberId, pariwarId } = memberCtx(request);
    if (!(await inScope(pariwarId, (tx) => memberDomain.isKnownPeopleCaller(tx, pariwarId, memberId)))) throw refusal('not_available');
    const key = `known_people.${route}:${pariwarId}:${memberId}:${requireIdempotencyKey(request)}`;
    const claim = await idempotencyStore.claim(key, IDEMPOTENCY_TTL_SECONDS);
    if (claim === 'already_claimed') {
      const stored = (await idempotencyStore.getResult(key)) as StoredResult<B> | null;
      if (stored && typeof stored.status === 'number') {
        const body = await present(stored);
        void reply.status(stored.status);
        return body;
      }
      throw new ConflictError('A request with this Idempotency-Key is already in progress — please wait and retry', CODES.idempotencyInProgress);
    }
    let settled = false;
    try {
      const result = await run();
      settled = true;
      await idempotencyStore.recordResult(key, result).catch((err: unknown) => {
        request.log.error({ errName: (err as Error).name }, '[known-people-idempotency] the result was not recorded');
      });
      const body = await present(result);
      void reply.status(result.status);
      return body;
    } finally {
      if (!settled) await idempotencyStore.release(key).catch(() => undefined);
    }
  }

  return {
    /** POST /api/v1/member/known-people/contact-matches — the POSITIONS of the numbers that are an eligible member. */
    async contactMatches(request: FastifyRequest): Promise<KnownPeopleContactMatchResponse> {
      const { memberId, pariwarId } = memberCtx(request);
      const body = request.body as KnownPeopleContactMatchRequest;
      const result = await memberDomain.matchContactNumbers({
        pariwarId,
        callerMemberId: memberId,
        numbers: body.numbers,
        enc,
        inScope: (fn) => inScope(pariwarId, fn),
      });
      if (result.kind === 'refused') throw refusal(result.reason);
      emitAuthAudit(deps, request, 'member_known_people.contacts_matched', {
        context: { submitted: result.submitted, checked: result.checked, matched: result.positions.length },
        resourceLocator: `member:${memberId.toLowerCase()}`,
      });
      return { matched: result.positions };
    },

    /** POST /api/v1/member/known-people — ask one person (201 a new link; 200 the live one already there). */
    async ask(request: FastifyRequest, reply: FastifyReply): Promise<KnownPersonAskResponse> {
      const { memberId, pariwarId } = memberCtx(request);
      const { mobile, foundBy } = request.body as KnownPersonAskRequest;
      return idempotent<KnownPersonAskResponse>(request, reply, 'ask', async () => {
        try {
          await inScope(pariwarId, async (tx) => {
            const charged = await memberDomain.chargeKnownPersonAsk(tx, { pariwarId, memberId });
            if (!charged.ok) throw new memberDomain.KnownPeopleChargeRefused(charged.reason);
          });
        } catch (err) {
          if (err instanceof memberDomain.KnownPeopleChargeRefused) throw refusal(err.reason);
          throw err;
        }
        // The number is normalised, HMAC'd OUTSIDE any transaction (ONE audit line, the caller's Pariwar) and dropped.
        const canonical = encryption.normalizeMobile(mobile);
        const namedIndex =
          canonical === null
            ? null
            : ((await encryption.mobileBlindIndexMany([canonical], enc, { pariwarId, purpose: memberDomain.KNOWN_PEOPLE_ASK_AUDIT_PURPOSE }))[0] ?? null);
        const result = await inScope(pariwarId, (tx) =>
          memberDomain.askKnownPerson(tx, { pariwarId, namerMemberId: memberId, namedIndex, foundBy }),
        );
        if (result.kind === 'refused') throw refusal(result.reason);
        if (result.kind === 'created') {
          emitAuthAudit(deps, request, 'member_known_people.asked', {
            context: { found_by: foundBy },
            resourceLocator: `member:${result.link.namedMemberId.toLowerCase()}`,
          });
        }
        // A live link already there answers with the label the namer's list shows (`2026-10-15-333` call 2 (b)) — and an
        // `accepted` one with the registered name (the member has seen it), resolved in `present`, ⛔ stored (P4).
        const label = result.kind === 'existing' ? result.label : 'asked';
        const out: KnownPersonAskResponse = {
          link: { linkId: result.link.linkId, label, name: null, askedAt: result.link.askedAt.toISOString() },
        };
        // `nameOf` for EVERY link (an id — ⛔ a name): a replay after the person accepted can then name them.
        return { status: result.kind === 'created' ? 201 : 200, body: out, nameOf: result.link.namedMemberId };
      }, async (stored) => {
        // EVERY delivery — the first and each replay — answers the label the namer's list shows NOW (fix-diff reviews
        // rounds 1–2): a replay may come after the person answered, withdrew from the Trust, had a claim filed for their
        // death, or after the link ended (⇒ `not_accepted` — ⛔ a stale `accepted` or `asked`); the registered name rides
        // ONLY on a link the list shows `accepted`.
        const linkId = ids.knownPersonLinkId(stored.body.link.linkId);
        const { label, read } = await inScope(pariwarId, async (tx) => {
          const now = await memberDomain.knownPersonLiveLabel(tx, { pariwarId, namerMemberId: memberId, linkId });
          return { label: now, read: now === 'accepted' && stored.nameOf ? await readNameCiphertexts(tx, pariwarId, [ids.memberId(stored.nameOf)]) : null };
        });
        if (label === 'accepted' && read !== null && stored.nameOf) {
          const names = await decryptNames(read, pariwarId, enc, request.log);
          return { link: { ...stored.body.link, label, name: names.get(ids.memberId(stored.nameOf)) ?? null } };
        }
        return { link: { ...stored.body.link, label: label ?? 'not_accepted', name: null } };
      });
    },

    /**
     * GET /api/v1/member/known-people — the namer's list (labels derived; names only for `accepted`) + `freeSlots`. `limit`
     * bounds the ENDED links shown; every live one is listed (review 2026-10-15 R2 — the domain clamps it).
     */
    async list(request: FastifyRequest): Promise<MyKnownPeopleResponse> {
      const { memberId, pariwarId } = memberCtx(request);
      const historyLimit = (request.query as KnownPeopleListQuery).limit;
      const { mine, read } = await inScope(pariwarId, async (tx) => {
        if (!(await memberDomain.isKnownPeopleCaller(tx, pariwarId, memberId))) throw refusal('not_available');
        const mine = await memberDomain.listMyKnownPeople(tx, { pariwarId, namerMemberId: memberId, historyLimit });
        const named = mine.items.flatMap((i) => (i.namedMemberId === null ? [] : [i.namedMemberId]));
        return { mine, read: await readNameCiphertexts(tx, pariwarId, named) };
      });
      const names = await decryptNames(read, pariwarId, enc, request.log);
      return {
        items: mine.items.map((i) => ({
          linkId: i.linkId,
          label: i.label,
          name: i.namedMemberId === null ? null : (names.get(i.namedMemberId) ?? null),
          askedAt: i.askedAt.toISOString(),
        })),
        freeSlots: mine.freeSlots,
      };
    },

    /** POST /api/v1/member/known-people/:linkId/remove — the namer removes a live link (the person is ⛔ told). */
    async remove(request: FastifyRequest, reply: FastifyReply): Promise<KnownPeopleWriteResponse> {
      const { memberId, pariwarId } = memberCtx(request);
      const linkId = ids.knownPersonLinkId((request.params as { linkId: string }).linkId);
      return idempotent<KnownPeopleWriteResponse>(request, reply, 'remove', async () => {
        const r = await inScope(pariwarId, (tx) => memberDomain.removeKnownPerson(tx, { pariwarId, namerMemberId: memberId, linkId }));
        if (r.kind === 'refused') throw refusal(r.reason);
        emitAuthAudit(deps, request, 'member_known_people.removed', { resourceLocator: `member:${r.namedMemberId.toLowerCase()}` });
        const body: KnownPeopleWriteResponse = { linkId, state: 'removed' };
        return { status: 200, body };
      });
    },

    /**
     * GET /api/v1/member/known-people/requests — the requests naming the member, PAGE BY PAGE (open asks first, then
     * accepted ones — review 2026-10-15 R3). A well-formed cursor this server did not issue ⇒ 400
     * `known_people.cursor_invalid`, decided AFTER the `active` check (a non-active caller gets the ONE 403). ⚠ A cursor the
     * SCHEMA refuses (blank, over 200 characters) is a 400 before any handler, for every caller alike — as `limit=51` is.
     */
    async requests(request: FastifyRequest): Promise<KnownPeopleRequestsResponse> {
      const { memberId, pariwarId } = memberCtx(request);
      const q = request.query as KnownPeopleRequestsQuery;
      let fetched: { page: memberDomain.RequestsNamingMePage; read: Awaited<ReturnType<typeof readNameCiphertexts>> };
      try {
        fetched = await inScope(pariwarId, async (tx) => {
          if (!(await memberDomain.isKnownPeopleCaller(tx, pariwarId, memberId))) throw refusal('not_available');
          const page = await memberDomain.listRequestsNamingMe(tx, { pariwarId, namedMemberId: memberId, limit: q.limit, cursor: q.cursor });
          return { page, read: await readNameCiphertexts(tx, pariwarId, page.items.map((r) => r.namerMemberId)) };
        });
      } catch (err) {
        if (err instanceof memberDomain.KnownPeopleCursorInvalidError) throw new BadRequestError('The page cursor is not valid', CODES.cursorInvalid);
        throw err;
      }
      const { page, read } = fetched;
      const names = await decryptNames(read, pariwarId, enc, request.log);
      return {
        items: page.items.map((r) => ({
          linkId: r.linkId,
          state: r.state,
          name: names.get(r.namerMemberId) ?? null,
          askedAt: r.askedAt.toISOString(),
        })),
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
      };
    },

    /** POST /api/v1/member/known-people/requests/:linkId/answer — "Yes, I know them" ⇒ accepted; "No" ⇒ declined. */
    async answer(request: FastifyRequest, reply: FastifyReply): Promise<KnownPeopleWriteResponse> {
      const { memberId, pariwarId } = memberCtx(request);
      const linkId = ids.knownPersonLinkId((request.params as { linkId: string }).linkId);
      const { answer } = request.body as KnownPeopleAnswerRequest;
      return idempotent<KnownPeopleWriteResponse>(request, reply, 'answer', async () => {
        const r = await inScope(pariwarId, (tx) => memberDomain.answerKnownPersonRequest(tx, { pariwarId, namedMemberId: memberId, linkId, answer }));
        if (r.kind === 'refused') throw refusal(r.reason);
        emitAuthAudit(deps, request, answer === 'accept' ? 'member_known_people.accepted' : 'member_known_people.declined', {
          resourceLocator: `member:${r.namerMemberId.toLowerCase()}`,
        });
        const body: KnownPeopleWriteResponse = { linkId, state: answer === 'accept' ? 'accepted' : 'declined' };
        return { status: 200, body };
      });
    },

    /** POST /api/v1/member/known-people/requests/:linkId/withdraw — the named member withdraws an acceptance. */
    async withdraw(request: FastifyRequest, reply: FastifyReply): Promise<KnownPeopleWriteResponse> {
      const { memberId, pariwarId } = memberCtx(request);
      const linkId = ids.knownPersonLinkId((request.params as { linkId: string }).linkId);
      return idempotent<KnownPeopleWriteResponse>(request, reply, 'withdraw', async () => {
        const r = await inScope(pariwarId, (tx) => memberDomain.withdrawKnownPerson(tx, { pariwarId, namedMemberId: memberId, linkId }));
        if (r.kind === 'refused') throw refusal(r.reason);
        emitAuthAudit(deps, request, 'member_known_people.withdrawn', { resourceLocator: `member:${r.namerMemberId.toLowerCase()}` });
        const body: KnownPeopleWriteResponse = { linkId, state: 'withdrawn' };
        return { status: 200, body };
      });
    },
  };
}
