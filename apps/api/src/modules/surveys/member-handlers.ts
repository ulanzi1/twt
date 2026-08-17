// Member-facing survey handlers — Story 10.15 (Task 7; AC6).
//
// The member app's polls surface: the open-and-in-audience list, and the one-per-member response
// write. Two rules are inherited VERBATIM from Story 10.2's member helpdesk surface
// ([[project_helpdesk_member_surface_102]]) and are why this file exists separately from
// `handlers.ts`:
//
// ── RLS ──────────────────────────────────────────────────────────────────────────────────────────
// There is NO scope-resolution HOOK on a member route (that middleware also computes RBAC grants,
// which members do not have) — so each handler opens its OWN RLS-scoped tx via `openScopeTx` and
// passes `scopeTx.tx` to the domain. It NEVER persists through an unscoped pool.
//
// ── 404, not 403 ─────────────────────────────────────────────────────────────────────────────────
// The member JWT is the tenancy authority. A `:pariwarId` path segment that does not match it is a
// 404 — indistinguishable from a non-existent resource, so there is no cross-tenant existence oracle.
// A 403 would confirm the tenant exists. A `surveyId` from another tenant, or an unpublished draft,
// is likewise a 404 (RLS scopes the read, so a foreign id simply does not resolve).
//
// ── The write is gated FOUR ways, and the order matters ──────────────────────────────────────────
//   1. Turnstile (architecture §2.11/§5.8a) — a HEADER, verified before any DB work.
//   2. An `Idempotency-Key` claim — the first DB touch. A replay with the SAME key returns the
//      ORIGINAL 201 rather than the 409 a genuine second submission gets. ⚠ These two outcomes are
//      NOT the same event and must not be collapsed: a replay is one member submitting once over a
//      flaky network; a 409 is one member submitting twice.
//   3. The per-member FR-88 rate limit (in `member-routes.ts`, `hook:'preHandler'`).
//   4. The domain: the survey must be OPEN at `now` (a 409 if not — expiry is enforced on the write
//      path, not merely hidden from the read), the answers must validate against the survey's own
//      questions (a 422 naming the offending `question_id`), and the composite PK enforces
//      one-response-per-member (a 409 on conflict — an idempotent INSERT, ⛔ never an upsert).

import type {
  MemberSurveyListResponse,
  MemberSurveyResponse,
  SubmitSurveyResponseRequest,
  SubmitSurveyResponseResult,
} from '@twt/contracts';
import { SubmitSurveyResponseResult as SubmitSurveyResponseResultSchema } from '@twt/contracts';
import { geoTree as geoTreeDomain, idempotency, ids, surveys as surveysDomain, type schema } from '@twt/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError, UnauthorizedError } from '../../http-errors.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';

type SurveyRow = schema.SurveyRow;

/**
 * How long a submit's idempotency claim is held. Sized with headroom over the worst-case
 * validate + insert runtime (the keyed-store TTL-sizing contract) — the same 300s the 10.2
 * member-ticket-create precedent uses. A response submit is a small JSON write, so the ceiling is
 * generous rather than tight.
 */
const SURVEY_SUBMIT_IDEMPOTENCY_TTL_SECONDS = 300;

/**
 * Project a domain row → the MEMBER wire DTO. Deliberately narrower than the admin projection: no
 * actor ids, no tone-signoff fields, no `audience_scope`/`audience_scope_value`, no `status` — and
 * ⭐ NO `response_threshold`. A member sees a survey because it is open to them; who wrote it, who
 * reviewed it, which audience it targeted and what count somebody hoped to reach are not theirs to
 * know. The threshold omission is LBD-1 in projection form: showing a member a target count invites
 * them to read the survey as a vote that passes or fails, which is precisely what a survey is not.
 * `valid_until` IS carried so the client can self-expire a cached survey without another round trip.
 */
function toMemberSurvey(row: SurveyRow, answered: boolean): MemberSurveyResponse {
  return {
    survey_id: row.surveyId,
    title: row.title,
    body: row.body,
    title_hi: row.titleHi,
    body_hi: row.bodyHi,
    // Passed through UNMAPPED — snake_case inner keys on both sides (the contracts round-trip guard).
    questions: row.questions,
    valid_until: row.validUntil.toISOString(),
    answered,
  };
}

export function createMemberSurveyHandlers(deps: AppDeps) {
  /**
   * Read the authenticated member's (memberId, pariwarId) or fail 401; assert the path `pariwarId`
   * matches the session's. The 10.2 / 10.9 `memberCtx` contract, verbatim.
   */
  function memberCtx(request: FastifyRequest): { memberIdStr: string; pariwarIdStr: string } {
    const memberIdStr = request.requestContext.actorId;
    const pariwarIdStr = request.requestContext.pariwarId;
    if (!memberIdStr || !pariwarIdStr) {
      throw new UnauthorizedError('Authentication required', 'auth.session_required');
    }
    const pathPariwarId = (request.params as { pariwarId?: string }).pariwarId;
    if (pathPariwarId && pathPariwarId !== pariwarIdStr) {
      throw new NotFoundError('Not found', 'survey.not_found');
    }
    return { memberIdStr, pariwarIdStr };
  }

  /** Read + verify the Turnstile token from the `x-turnstile-token` HEADER (the 10.2 posture — a
   *  header, so it is checked before the body is touched). 400 if absent, 403 if the verifier rejects. */
  async function requireTurnstile(request: FastifyRequest): Promise<void> {
    const raw = request.headers['x-turnstile-token'];
    const token = Array.isArray(raw) ? raw[0] : raw;
    if (!token || token.trim() === '') {
      throw new BadRequestError('An x-turnstile-token header is required', 'survey.turnstile_token_required');
    }
    const ok = await deps.turnstile.verify({ token: token.trim(), remoteIp: request.ip });
    if (!ok) {
      throw new ForbiddenError('Verification failed — please try again', 'survey.turnstile_failed');
    }
  }

  /** Read the caller-supplied `Idempotency-Key` header (required on submit). */
  function requireIdempotencyKey(request: FastifyRequest): string {
    const raw = request.headers['idempotency-key'];
    const key = Array.isArray(raw) ? raw[0] : raw;
    if (!key || key.trim() === '') {
      throw new BadRequestError('An Idempotency-Key header is required', 'survey.idempotency_key_required');
    }
    return key.trim();
  }

  const idempotencyStore = idempotency.createKeyedStore(deps.pool);

  return {
    /**
     * GET /api/v1/p/:pariwarId/member/surveys — the member's open, in-audience surveys, each flagged
     * with whether THEY have already answered.
     *
     * ⭐ Answered surveys are RETURNED with `answered: true`, not filtered out (AC6). A member who
     * answered yesterday and opens the tab today must see that they did, not an empty list that reads
     * as "nothing was ever asked".
     */
    async list(request: FastifyRequest): Promise<MemberSurveyListResponse> {
      const { memberIdStr, pariwarIdStr } = memberCtx(request);
      const pariwarId = ids.pariwarId(pariwarIdStr);
      const memberId = ids.memberId(memberIdStr);
      const now = deps.clock();

      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        // ⭐ THE GEO TREE IS LOADED **HERE**, ONCE (the 10.9 member-banner shape). This is a MEMBER
        // route, so there is no scope-resolution hook to have loaded it: that middleware is
        // admin-session-gated because it also computes RBAC grants, which members do not have. The
        // domain accessor closes over the result and resolves the member's geo ONCE before filtering
        // — ⛔ never per survey (the N+1 AC8 forbids).
        //
        // A Pariwar with no published tree loads `null`, and `state`-scoped surveys then deny
        // fail-closed — there is no code default geography (ADR-0038).
        const geoTree = await geoTreeDomain.loadGeoTree(scopeTx.tx, pariwarId, now);

        const q = request.query as { limit?: number; offset?: number };
        // [Review][Patch] — code review of 10-15-survey-poll (2026-08-17): previously unpaginated —
        // a member with more in-audience open surveys than the internal page limit (50, cap 200)
        // could never reach the rest, with no `next_offset` to signal more existed. Mirrors the admin
        // list's `{items, next_offset}` shape.
        const { candidates, hasMore, consumed } = await surveysDomain.listOpenSurveysForMember(
          scopeTx.tx,
          pariwarId,
          memberId,
          now,
          { info: (message, context) => request.log.info({ ...context }, message) },
          geoTree,
          // The domain re-clamps (default 50, cap 199); declaring it here too is what makes the
          // bound visible in the OpenAPI surface (the forced-pagination invariant).
          { ...(q.limit !== undefined ? { limit: q.limit } : {}), ...(q.offset !== undefined ? { offset: q.offset } : {}) },
        );
        ok = true;
        // ⚠ Advances by `consumed` (the RAW rows the SQL window moved past), not `candidates.length`
        // (the post-audience-filter DTO count) — the audience filter can shrink a page far below
        // `consumed`, and advancing by the smaller number would re-fetch overlapping raw rows.
        return {
          items: candidates.map((c) => toMemberSurvey(c.survey, c.answered)),
          next_offset: hasMore ? (q.offset ?? 0) + consumed : null,
        };
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },

    /**
     * POST /api/v1/p/:pariwarId/member/surveys/:surveyId/responses — record the member's response
     * (201, or the ORIGINAL 201 payload on an idempotent replay).
     *
     * ⚠ A REPLAY and a SECOND SUBMISSION are different events with different answers: the same
     * `Idempotency-Key` replays the original result; a genuine second submission is a 409 (LBD-6 —
     * one response per member, and submission is final). ⛔ Do not collapse them into an upsert "for
     * convenience"; it changes what the aggregate means.
     */
    async submit(request: FastifyRequest, reply: FastifyReply): Promise<SubmitSurveyResponseResult> {
      const { memberIdStr, pariwarIdStr } = memberCtx(request);
      const { surveyId: surveyIdStr } = request.params as { surveyId: string };
      const body = request.body as SubmitSurveyResponseRequest;

      // (1) Turnstile bot-gate — the FIRST thing, before any DB work (FR-88; the 10.2 posture).
      await requireTurnstile(request);

      // (2) Idempotency claim — the first DB touch. A replay with the SAME key returns the original
      // 201 result instead of reaching the domain and 409-ing on the composite PK.
      const idempotencyKey = requireIdempotencyKey(request);
      const idemKey = `survey.member_response_submit:${pariwarIdStr}:${memberIdStr}:${idempotencyKey}`;
      const claimOutcome = await idempotencyStore.claim(idemKey, SURVEY_SUBMIT_IDEMPOTENCY_TTL_SECONDS);
      if (claimOutcome === 'already_claimed') {
        const stored = await idempotencyStore.getResult(idemKey);
        const replay = stored === null ? null : SubmitSurveyResponseResultSchema.safeParse(stored);
        if (replay?.success) {
          void reply.status(201);
          return replay.data;
        }
        // [Review][Patch] — code review of 10-15-survey-poll (2026-08-17): a live claim whose stored
        // payload exists but fails `safeParse` (corrupt row, or a future schema change mid-deploy) was
        // previously indistinguishable from a genuinely in-flight attempt — both fell through to the
        // same "please wait and retry" 409. Logged separately so a real storage/shape problem doesn't
        // read as ordinary contention.
        if (stored !== null && !replay?.success) {
          request.log.error(
            { idemKey, issues: replay?.error?.issues },
            '[survey-idempotency] stored result failed to parse — treating as in-progress, but this is not ordinary contention',
          );
        }
        // A live claim with no recorded result yet — the original attempt is still in flight.
        throw new ConflictError(
          'A request with this Idempotency-Key is already in progress — please wait and retry',
          'survey.idempotency_in_progress',
        );
      }

      let claimSettled = false;
      // [Review][Patch] — code review of 10-15-survey-poll (2026-08-17): tracks whether the DOMAIN
      // write itself succeeded, independent of whether the idempotency result was recorded — see the
      // `finally` block below.
      let responseRecorded = false;
      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        const row = await surveysDomain.recordResponse(scopeTx.tx, {
          pariwarId: ids.pariwarId(pariwarIdStr),
          surveyId: ids.surveyId(surveyIdStr),
          memberId: ids.memberId(memberIdStr),
          answers: body.answers,
          now: deps.clock(),
        });
        ok = true;
        responseRecorded = true;
        const result: SubmitSurveyResponseResult = {
          survey_id: row.surveyId,
          submitted_at: row.submittedAt.toISOString(),
        };
        // ⛔ The recorded result carries NO answer content — a replay returns the acknowledgement, not
        // the submission (the member's client already has what they sent, and the idempotency store is
        // not a place to park member-authored free text — LBD-3).
        await idempotencyStore.recordResult(idemKey, result);
        claimSettled = true;
        void reply.status(201);
        return result;
      } catch (err) {
        // An absent survey is a clean read outcome, not a failed write — commit the (no-op) tx so the
        // 404 does not surface as a rollback-shaped 500 (the 10.9 dismiss precedent).
        if (err instanceof surveysDomain.SurveyNotFoundError) ok = true;
        throw err;
      } finally {
        await closeScopeTx(scopeTx, ok);
        // A genuinely failed attempt releases the claim so the member can retry. ⚠ This includes the
        // 409 duplicate: releasing lets a retry reach the domain and get the same honest 409, rather
        // than a confusing "already in progress".
        //
        // ⚠ [Review][Patch] — code review of 10-15-survey-poll (2026-08-17): but a write that DID
        // succeed must never be released just because recording the replay result afterward failed
        // (store outage, etc.) — the response is already committed, so releasing here would let a
        // retry reach the domain again and hit the composite-PK 409 instead of eventually replaying.
        // Leaving the claim held means a retry gets the honest "in progress" 409 above until the TTL
        // expires, rather than a confusing duplicate-submission error immediately after a failure.
        if (!claimSettled && !responseRecorded) await idempotencyStore.release(idemKey).catch(() => undefined);
      }
    },
  };
}
