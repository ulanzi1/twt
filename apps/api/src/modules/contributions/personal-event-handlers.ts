// The personal-event ASSERTION handler — Story 10.26 (Task 5; AC1, AC7).
//
// ⚖ ONE WRITE, NO COUNTERPARTY. The ratified Niyamavali §3.1 (`docs/legal/niyamavali.md:81`, Trustee
// Panel 2026-08-06): "No exemption. Personal events do not excuse a missed contribution; the
// assertion is recorded on the member's own record but grants no restoration relief and carries no
// consequence of its own."
//
// So there is no review queue to enqueue onto, no notification to fan out, no state machine to
// advance and nothing to reverse (D1). The handler appends ONE `member.personal_event_asserted`
// event on the member's OWN `events_log` stream and returns what it recorded. That is the whole
// surface, and its smallness is the point — an approval-shaped handler would make a promise the
// Niyamavali forbids.
//
// ── The Story 10.2 member-surface pattern, reused ────────────────────────────────────────────────
// `requireMemberSession` gates the route; the member JWT is the TENANCY AUTHORITY and the
// `:pariwarId` path segment is validated against it here — a mismatch is a **404**, never a 403, so
// there is no cross-tenant existence oracle. The member session carries no `pariwar_admin` grant, so
// the handler opens its OWN RLS-scoped tx via `openScopeTx`. The `Idempotency-Key` rides a HEADER
// (never the body), so a retried submit records once.
//
// ── Turnstile: deliberately NOT gated, and why ───────────────────────────────────────────────────
// Story 10.2's helpdesk create carries a Turnstile bot-gate because it accepts FREE TEXT and FILE
// UPLOADS and fans out to human responders — a genuine abuse surface. This route accepts a
// six-value enum and an optional UUID, writes one row nobody is paged about, and is idempotency- and
// rate-limited per member behind an authenticated session. There is nothing here for a bot to gain.
// Story 10.26's AC7 enumerates the three gates this route must carry (session, FR-88 per-member write
// limit, `Idempotency-Key`) and Turnstile is not among them; recorded as a decision rather than left
// as an omission a reader has to guess at.

import {
  PersonalEventAssertionRequest,
  type PersonalEventAssertionResponse,
} from '@twt/contracts';
import { createHash } from 'node:crypto';

import { audit, canonicalJsonStringify, ids, idempotency, member } from '@twt/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { BadRequestError, ConflictError, NotFoundError, UnauthorizedError } from '../../http-errors.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';

/** Local SHA-256 hex over a canonical string (the 10.1/10.2 handler idiom — importing a domain hash
 *  helper would cycle). */
function sha256Hex(canonicalInput: string): string {
  return createHash('sha256').update(canonicalInput, 'utf8').digest('hex');
}

/**
 * The audit action. ⚠ AC1 vocabulary: `recorded`, never `requested` / `applied` / `submitted`. The
 * action name is read by operators and appears in the audit chain forever; naming it after a request
 * would put the false promise in the permanent record.
 */
const PERSONAL_EVENT_RECORDED_ACTION = 'member_personal_event.recorded';

/** How long an assertion's idempotency claim is held — the helpdesk member-create precedent. */
const ASSERTION_IDEMPOTENCY_TTL_SECONDS = 300;

export function createPersonalEventHandlers(deps: AppDeps) {
  const idempotencyStore = idempotency.createKeyedStore(deps.pool);

  /** The authenticated member's (memberId, pariwarId), with the path segment checked against the
   *  session. A mismatched path is a 404 — indistinguishable from a non-existent resource. */
  function memberCtx(request: FastifyRequest): { memberIdStr: string; pariwarIdStr: string } {
    const memberIdStr = request.requestContext.actorId;
    const pariwarIdStr = request.requestContext.pariwarId;
    if (!memberIdStr || !pariwarIdStr) {
      throw new UnauthorizedError('Authentication required', 'auth.session_required');
    }
    const pathPariwarId = (request.params as { pariwarId?: string }).pariwarId;
    if (pathPariwarId && pathPariwarId !== pariwarIdStr) {
      throw new NotFoundError('Not found', 'contribution.not_found');
    }
    return { memberIdStr, pariwarIdStr };
  }

  function requireIdempotencyKey(request: FastifyRequest): string {
    const raw = request.headers['idempotency-key'];
    const key = Array.isArray(raw) ? raw[0] : raw;
    if (!key || key.trim() === '') {
      throw new BadRequestError(
        'An Idempotency-Key header is required',
        'contribution.idempotency_key_required',
      );
    }
    return key.trim();
  }

  return {
    /**
     * POST /api/v1/p/:pariwarId/member/contributions/personal-events — RECORD that a personal event
     * affected the member's ability to contribute (201, or 200 on an idempotent replay).
     *
     * ⚠ The response's `grantsRelief` is a hard `false` on the wire (a `z.literal(false)` in the
     * contract), so a client cannot mistake a 201 for an approval. That is the one misreading this
     * whole surface is designed against.
     */
    async record(
      request: FastifyRequest,
      reply: FastifyReply,
    ): Promise<PersonalEventAssertionResponse> {
      const { memberIdStr, pariwarIdStr } = memberCtx(request);

      const parsed = PersonalEventAssertionRequest.safeParse(request.body);
      if (!parsed.success) {
        throw new BadRequestError('Invalid request', 'contribution.invalid_request', {
          issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        });
      }
      const input = parsed.data;

      const idempotencyKey = requireIdempotencyKey(request);
      const idemKey = `contribution.personal_event_record:${pariwarIdStr}:${memberIdStr}:${idempotencyKey}`;
      const claimOutcome = await idempotencyStore.claim(idemKey, ASSERTION_IDEMPOTENCY_TTL_SECONDS);
      if (claimOutcome === 'already_claimed') {
        const stored = await idempotencyStore.getResult(idemKey);
        if (stored !== null) {
          void reply.status(200);
          return stored as PersonalEventAssertionResponse;
        }
        throw new ConflictError(
          'A request with this Idempotency-Key is already in progress — please wait and retry',
          'contribution.idempotency_in_progress',
        );
      }

      let claimSettled = false;
      try {
        const pariwarId = ids.pariwarId(pariwarIdStr);
        const memberId = ids.memberId(memberIdStr);
        const recordedAt = deps.clock();

        const scopeTx = await openScopeTx(deps, pariwarIdStr);
        let ok = false;
        let response: PersonalEventAssertionResponse;
        try {
          // ⚠ EXISTENCE first, then state. `getMemberStateAt` replays the stream and returns the
          // machine's INITIAL state (`pending-kyc`) for a member with no events — so it can never
          // report "absent", and using it alone would silently accept a session naming a member who
          // does not exist in this Pariwar. 404, not 403: same no-oracle discipline as the
          // path-mismatch above.
          if (!(await member.memberExists(scopeTx.tx, pariwarId, memberId))) {
            throw new NotFoundError('Not found', 'contribution.not_found');
          }
          // The member's CURRENT lifecycle state — the marker is a NON-TRANSITION, so it is also
          // `to_state`. Read rather than assumed: the audit payload must record where the member
          // actually was, and the reducer folds this event as identity from any of the nine states.
          const currentState = await member.getMemberStateAt(scopeTx.tx, memberId, recordedAt);

          // ⚠ The audit digest carries the BOUNDED kind only. There is no free text anywhere in this
          // flow (D3), so there is nothing here that could leak Tier-1 PII into the audit chain.
          const requestPayloadHash = sha256Hex(
            canonicalJsonStringify({
              member_id: memberIdStr,
              kind: input.kind,
              cycle_ref: input.cycleRef ?? null,
              recorded_at: recordedAt.toISOString(),
            }),
          );

          const appended = await audit.withCompensatingAudit(deps.servicePool, {
            auditIntent: {
              pariwarId,
              actorId: memberIdStr,
              actorRole: null,
              action: PERSONAL_EVENT_RECORDED_ACTION,
              resourceLocator: `member/${memberIdStr}`,
              requestPayloadHash,
              traceId: request.requestContext.traceId ?? null,
            },
            mutate: async () =>
              member.assertPersonalEvent(scopeTx.client, {
                memberId,
                pariwarId,
                currentState,
                kind: input.kind,
                ...(input.cycleRef !== undefined ? { cycleRef: input.cycleRef } : {}),
                actorId: memberIdStr,
              }),
          });

          ok = true;
          response = {
            eventId: appended.eventId,
            kind: input.kind,
            recordedAt: recordedAt.toISOString(),
            // ⚖ Always false — the ratified §3.1. Not a computed value; there is nothing to compute.
            grantsRelief: false,
          };
        } finally {
          await closeScopeTx(scopeTx, ok);
        }

        await idempotencyStore.recordResult(idemKey, response);
        claimSettled = true;
        void reply.status(201);
        return response;
      } finally {
        // Any failure after the claim releases it, so the SAME key can be retried immediately rather
        // than waiting out the TTL.
        if (!claimSettled) await idempotencyStore.release(idemKey).catch(() => undefined);
      }
    },
  };
}
