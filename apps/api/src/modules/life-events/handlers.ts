// Life Events panel handlers — Story 3.9 (Task 5; AC1/AC4/AC5).
//
// The member self-service SURFACE for life changes (FR-5). Four sub-types, but only TWO are built
// here — address + posting (the nominee + medical sub-types REUSE the existing 3.4 declare / 3.5
// submit SERVICES unchanged, wired as gated ROUTES in routes.ts). Plus the GET summary read that
// hydrates the panel index.
//
// ── Scope-tx discipline (mirror nominee.handlers.ts) ─────────────────────────────────────
// `requireMemberSession` sets `request.requestContext.{actorId,pariwarId}` but does NOT open a
// scope tx, so each handler opens its own (`openScopeTx`) and the projector gets the raw
// `scopeTx.client`. The append write + event append + state projection run inside ONE scope tx so a
// torn view never exists; the audit line fires AFTER buildSummary succeeds + ok is set (so a
// rollback never leaves a phantom audit — nominee.handlers.ts:158).
//
// ── PII discipline (R1) ──────────────────────────────────────────────────────────────────
// The address line is Tier-1 encrypted in the handler before the accessor sees it; the event
// payload + audit carry ONLY a presence marker — NEVER the raw address bytes. The posting district
// is non-PII geographic plaintext (safe in the column + event). The summary echoes presence flags +
// counts, never raw bytes.

import {
  type AddressUpdateRequest,
  LifeEventsSummaryResponse,
  type LifeEventsSummaryResult,
  type PostingHistoryQuery,
  type PostingHistoryResponse,
  type PostingUpdateRequest,
  type WorkplaceDistrictsQuery,
  type WorkplaceDistrictsResponse,
  type WorkplaceSearchQuery,
  type WorkplaceSearchResponse,
} from '@twt/contracts';
import {
  idempotency,
  ids,
  medical as medicalDomain,
  member as memberDomain,
  nominee as nomineeDomain,
} from '@twt/domain';
import type { FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { ApiError, BadRequestError, ConflictError, UnauthorizedError } from '../../http-errors.js';
import { emitAuthAudit } from '../auth/shared/audit.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';
import type { ScopeTx } from '../../types.js';
import { encryptAddressLine } from './address-crypto.js';

/** Lifecycle states in which a Life Events update is rejected (terminal — mirror nominee/medical). */
const TERMINAL_STATES = new Set(['withdrawn', 'anonymized']);

/** How long a posting write's idempotency claim is held (the personal-event precedent). */
const POSTING_IDEMPOTENCY_TTL_SECONDS = 300;

/** The 422 messages — non-sensitive, ⛔ ever the member's input (they reach logs). ONE code per family (AC4). */
const WORKPLACE_REFUSAL_MESSAGES: Record<memberDomain.WorkplaceRefusalCode, string> = {
  'workplace.not_found': 'That workplace is not on the list',
  'workplace.district_not_found': 'That district is not on the list',
  'workplace.start_date_invalid': 'That start date cannot be used',
  'workplace.typed_name_invalid': 'That workplace name cannot be used',
  'workplace.choice_unavailable': 'That choice is not available for this Pariwar',
};

/** A domain refusal → the handler's 422 (AC4). */
function refuse(code: memberDomain.WorkplaceRefusalCode): never {
  throw new ApiError(422, code, WORKPLACE_REFUSAL_MESSAGES[code]);
}

export function createLifeEventsHandlers(deps: AppDeps) {
  const enc = deps.encryption;
  const idempotencyStore = idempotency.createKeyedStore(deps.pool);

  /** Read the caller-supplied `Idempotency-Key` header (required on the posting write — AC4). */
  function requireIdempotencyKey(request: FastifyRequest): string {
    const raw = request.headers['idempotency-key'];
    const key = Array.isArray(raw) ? raw[0] : raw;
    if (!key || key.trim() === '') {
      throw new BadRequestError('An Idempotency-Key header is required', 'life_events.idempotency_key_required');
    }
    return key.trim();
  }

  /** Read the authenticated member's (memberId, pariwarId) or fail 401. */
  function memberCtx(request: FastifyRequest): { memberIdStr: string; pariwarIdStr: string } {
    const memberIdStr = request.requestContext.actorId;
    const pariwarIdStr = request.requestContext.pariwarId;
    if (!memberIdStr || !pariwarIdStr) {
      throw new UnauthorizedError('Authentication required', 'auth.session_required');
    }
    return { memberIdStr, pariwarIdStr };
  }

  /** Assemble the NON-PII panel summary from the current row-sets across all four sub-types. */
  async function buildSummary(
    scopeTx: ScopeTx,
    pariwarId: ids.PariwarId,
    memberId: ids.MemberId,
  ): Promise<LifeEventsSummaryResult> {
    const [nominees, addressLatest, postingLatest, retiredEver, disclosures] = await Promise.all([
      nomineeDomain.getMemberNominees(scopeTx.tx, pariwarId, memberId),
      memberDomain.getMemberAddressLatest(scopeTx.tx, pariwarId, memberId),
      memberDomain.getMemberPostingLatest(scopeTx.tx, pariwarId, memberId),
      // Retirement is a one-way permanent flag (first-ever row where is_retirement=true).
      // Epic 4 Story 4.5 anchors retired_at on this; using latest-row would mislead users
      // who file a later non-retirement district change (review D2).
      memberDomain.getMemberPostingRetiredEver(scopeTx.tx, pariwarId, memberId),
      medicalDomain.getMedicalDisclosures(scopeTx.tx, pariwarId, memberId),
    ]);
    return {
      nominees: { declared: nominees.length > 0, count: nominees.length },
      address: { recorded: addressLatest !== null },
      posting: {
        recorded: postingLatest !== null,
        is_retirement: retiredEver,
      },
      medical: { disclosed: disclosures.length > 0, disclosure_count: disclosures.length },
    };
  }

  /**
   * Guard: check member existence first (getMemberStateAt is non-nullable — a missing member
   * replays to pending-kyc, so a bare state check would pass for deleted members). Then reject
   * updates when the member is in a terminal state (mirrors medical.handlers.ts:136-148).
   */
  async function assertMemberExistsAndNotTerminal(
    scopeTx: ScopeTx,
    pariwarId: ids.PariwarId,
    memberId: ids.MemberId,
  ): Promise<memberDomain.MemberLifecycleState> {
    const exists = await memberDomain.memberExists(scopeTx.tx, pariwarId, memberId);
    if (!exists) {
      throw new ConflictError('Member not found', 'life_events.member_not_found');
    }
    const state = await memberDomain.getMemberStateAt(scopeTx.tx, memberId, deps.clock());
    if (TERMINAL_STATES.has(state)) {
      throw new ConflictError(
        'Member is in a terminal state — Life Events updates are not permitted',
        'life_events.member_terminal',
      );
    }
    return state;
  }

  return {
    /**
     * POST /api/v1/member/life-events/address — record an address change (NO step-up). Appends a
     * Tier-1-encrypted row to the append-only history (AC1 "prior value preserved"), emits the
     * `member.address_updated` NON-TRANSITION marker (NON-PII presence payload — R1/AC5), and audits
     * the change AFTER the summary build succeeds.
     */
    async updateAddress(request: FastifyRequest): Promise<LifeEventsSummaryResult> {
      const body = request.body as AddressUpdateRequest;
      const { memberIdStr, pariwarIdStr } = memberCtx(request);

      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        const memberId = ids.memberId(memberIdStr);
        const pariwarId = ids.pariwarId(pariwarIdStr);
        const state = await assertMemberExistsAndNotTerminal(scopeTx, pariwarId, memberId);

        const addressLineCiphertext = await encryptAddressLine(body.addressLine, pariwarIdStr, enc);
        await memberDomain.insertMemberAddress(scopeTx.tx, {
          memberId,
          pariwarId,
          addressLineCiphertext,
          locale: body.locale,
        });

        // Non-transition marker: from_state === to_state. NON-PII payload — presence marker ONLY
        // (the raw address bytes live Tier-1-encrypted in member_addresses; R1/AC5).
        await memberDomain.projectMemberState(scopeTx.client, {
          memberId,
          pariwarId,
          eventType: 'member.address_updated',
          payload: {
            from_state: state,
            to_state: state,
            trigger: 'life_events_address_update',
            actor: 'member',
            address_present: true,
          },
          actorId: memberIdStr,
        });

        const result = await buildSummary(scopeTx, pariwarId, memberId);
        ok = true;
        emitAuthAudit(deps, request, 'member_life_events.address_updated', {
          actorId: memberIdStr,
          pariwarId: pariwarIdStr,
          context: { locale: body.locale },
        });
        return result;
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },

    /**
     * POST /api/v1/member/life-events/posting — record WHERE the member works, and since when (Story 6.36a, AC4; SW5–SW9).
     * NO step-up (change after a death is answered by 6.36's cut, ⛔ by friction — SW8). A per-member rate limit (the
     * route) and a REQUIRED `Idempotency-Key` (a replay returns the original result and writes ⛔ a second row).
     *
     * The body is a choice: `workplace` (a listed school or office — the posting's district is the WORKPLACE's mapped
     * spelling, SW5) · `not_listed` (the request row FIRST, then the posting that names it) · `retired` (the retirement
     * row, its date) · and, ONLY in a Pariwar with ⛔ no imported list, `district_only` (today's free-text box, SW7).
     * ONE transaction: the member's posting writes serialised, the district (and the workplace) read `FOR SHARE`, the
     * start date checked against the member's latest one, ONE posting row (the ONE writer ends the member's older open
     * request), the `member.posting_updated` marker. The audit line carries the district and the CHOICE — ⛔ never the
     * typed text. Domain refusals → 422, ONE code per family.
     */
    async updatePosting(request: FastifyRequest): Promise<LifeEventsSummaryResult> {
      const body = request.body as PostingUpdateRequest;
      const { memberIdStr, pariwarIdStr } = memberCtx(request);

      const idempotencyKey = requireIdempotencyKey(request);
      const idemKey = `life_events.posting_update:${pariwarIdStr}:${memberIdStr}:${idempotencyKey}`;
      const claimOutcome = await idempotencyStore.claim(idemKey, POSTING_IDEMPOTENCY_TTL_SECONDS);
      if (claimOutcome === 'already_claimed') {
        const stored = await idempotencyStore.getResult(idemKey);
        const replay = stored === null ? null : LifeEventsSummaryResponse.safeParse(stored);
        if (replay?.success) return replay.data;
        throw new ConflictError(
          'A request with this Idempotency-Key is already in progress — please wait and retry',
          'life_events.idempotency_in_progress',
        );
      }

      let written = false;
      let claimSettled = false;
      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        const memberId = ids.memberId(memberIdStr);
        const pariwarId = ids.pariwarId(pariwarIdStr);
        const state = await assertMemberExistsAndNotTerminal(scopeTx, pariwarId, memberId);
        const tx = scopeTx.tx;

        // The member's posting writes, one at a time (the start-date check and the "end the older request" step read a
        // stable history).
        await memberDomain.lockMemberPostingWrites(tx, memberId);
        const hasList = await memberDomain.pariwarHasWorkplaceList(tx, pariwarId);
        const previousStart = await memberDomain.latestPostingStartedOn(tx, pariwarId, memberId);
        const now = deps.clock();
        const checkStart = (startedOn: string): void => {
          if (!memberDomain.isValidStartDate(startedOn, now, previousStart)) refuse('workplace.start_date_invalid');
        };

        let posting: {
          district: string;
          isRetirement: boolean;
          startedOn: string | null;
          workplaceId: ids.WorkplaceId | null;
          workplaceKind: 'school' | 'office' | null;
          workplaceRequestId: ids.WorkplaceRequestId | null;
          pariwarRef: string | null;
        };
        if (body.choice === 'district_only') {
          if (hasList) refuse('workplace.choice_unavailable');
          if (body.startedOn !== undefined) checkStart(body.startedOn);
          posting = {
            district: body.district,
            isRetirement: body.isRetirement ?? false,
            startedOn: body.startedOn ?? null,
            workplaceId: null,
            workplaceKind: null,
            workplaceRequestId: null,
            pariwarRef: body.pariwarRef ?? null,
          };
        } else {
          if (!hasList) refuse('workplace.choice_unavailable');
          if (body.choice === 'workplace') {
            // The district FIRST, then the workplace, both FOR SHARE (a concurrent rename waits — SF13).
            const w = await memberDomain.lockListedWorkplace(tx, pariwarId, body.workplaceId);
            if (!w) refuse('workplace.not_found');
            checkStart(body.startedOn);
            posting = {
              district: w.district,
              isRetirement: false,
              startedOn: body.startedOn,
              workplaceId: w.workplaceId,
              workplaceKind: w.kind,
              workplaceRequestId: null,
              pariwarRef: body.pariwarRef ?? null,
            };
          } else {
            if (!(await memberDomain.lockListedDistrict(tx, pariwarId, body.district))) refuse('workplace.district_not_found');
            checkStart(body.startedOn);
            if (body.choice === 'not_listed') {
              // The request row FIRST — the posting names it (I2: the member's own act writes both).
              const req = await memberDomain.insertWorkplaceRequest(tx, {
                pariwarId,
                memberId,
                district: body.district,
                typedName: body.typedName,
                typedPlace: body.typedPlace ?? null,
                startedOn: body.startedOn,
              });
              posting = {
                district: body.district,
                isRetirement: false,
                startedOn: body.startedOn,
                workplaceId: null,
                workplaceKind: null,
                workplaceRequestId: req.requestId,
                pariwarRef: null,
              };
            } else {
              posting = {
                district: body.district,
                isRetirement: true,
                startedOn: body.startedOn,
                workplaceId: null,
                workplaceKind: null,
                workplaceRequestId: null,
                pariwarRef: body.pariwarRef ?? null,
              };
            }
          }
        }

        await memberDomain.insertMemberPosting(tx, {
          memberId,
          pariwarId,
          district: posting.district,
          pariwarRef: posting.pariwarRef,
          isRetirement: posting.isRetirement,
          workplaceId: posting.workplaceId,
          workplaceRequestId: posting.workplaceRequestId,
          startedOn: posting.startedOn,
        });

        // Non-transition marker. NON-PII: the district, ids, a kind, a date, flags — ⛔ the typed text.
        await memberDomain.projectMemberState(scopeTx.client, {
          memberId,
          pariwarId,
          eventType: 'member.posting_updated',
          payload: {
            from_state: state,
            to_state: state,
            trigger: 'life_events_posting_update',
            actor: 'member',
            district: posting.district,
            ...(posting.pariwarRef ? { pariwar_ref: posting.pariwarRef } : {}),
            is_retirement: posting.isRetirement,
            workplace_id: posting.workplaceId,
            workplace_kind: posting.workplaceKind,
            started_on: posting.startedOn,
            not_listed: posting.workplaceRequestId !== null,
          },
          actorId: memberIdStr,
        });

        const result = await buildSummary(scopeTx, pariwarId, memberId);
        ok = true;
        written = true;
        await idempotencyStore.recordResult(idemKey, result);
        claimSettled = true;
        emitAuthAudit(deps, request, 'member_life_events.posting_updated', {
          actorId: memberIdStr,
          pariwarId: pariwarIdStr,
          context: { district: posting.district, choice: body.choice },
        });
        return result;
      } catch (err) {
        if (err instanceof memberDomain.WorkplaceWriteRefusedError) refuse(err.code);
        throw err;
      } finally {
        await closeScopeTx(scopeTx, ok);
        // A failed attempt releases its claim (a corrected retry may reuse the key); a write that DID commit keeps it,
        // so a retry replays rather than writing again (the survey precedent).
        if (!claimSettled && !written) await idempotencyStore.release(idemKey).catch(() => undefined);
      }
    },

    /**
     * GET /api/v1/member/life-events/workplaces/districts — the Pariwar's LISTED district spellings, A–Z (AC3), and whether
     * the Pariwar has a list at all (`hasList: false` ⇒ the app shows today's district box — SW7).
     */
    async workplaceDistricts(request: FastifyRequest): Promise<WorkplaceDistrictsResponse> {
      const { pariwarIdStr } = memberCtx(request);
      const q = request.query as WorkplaceDistrictsQuery;
      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        const pariwarId = ids.pariwarId(pariwarIdStr);
        const hasList = await memberDomain.pariwarHasWorkplaceList(scopeTx.tx, pariwarId);
        const districts = await memberDomain.listWorkplaceDistricts(scopeTx.tx, pariwarId, { ...(q.limit !== undefined ? { limit: q.limit } : {}) });
        ok = true;
        return { items: districts.map((district) => ({ district })), nextCursor: null, hasMore: false, hasList };
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },

    /** GET /api/v1/member/life-events/workplaces — the picker's server-side search (AC3, SW4). */
    async searchWorkplaces(request: FastifyRequest): Promise<WorkplaceSearchResponse> {
      const { pariwarIdStr } = memberCtx(request);
      const q = request.query as WorkplaceSearchQuery;
      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        const page = await memberDomain.searchWorkplaces(scopeTx.tx, {
          pariwarId: ids.pariwarId(pariwarIdStr),
          district: q.district,
          kind: q.kind,
          q: q.q,
          limit: q.limit,
          cursor: q.cursor,
        });
        ok = true;
        return page;
      } catch (err) {
        if (err instanceof memberDomain.WorkplaceCursorInvalidError) {
          ok = true;
          throw new BadRequestError('The page cursor is not valid', 'workplace.cursor_invalid');
        }
        throw err;
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },

    /** GET /api/v1/member/life-events/postings — the member's OWN posting history, newest first (AC3b). */
    async postingHistory(request: FastifyRequest): Promise<PostingHistoryResponse> {
      const { memberIdStr, pariwarIdStr } = memberCtx(request);
      const q = request.query as PostingHistoryQuery;
      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        const page = await memberDomain.listMemberPostingHistory(scopeTx.tx, ids.pariwarId(pariwarIdStr), ids.memberId(memberIdStr), {
          limit: q.limit,
          cursor: q.cursor,
        });
        ok = true;
        return page;
      } catch (err) {
        if (err instanceof memberDomain.WorkplaceCursorInvalidError) {
          ok = true;
          throw new BadRequestError('The page cursor is not valid', 'workplace.cursor_invalid');
        }
        throw err;
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },

    /** GET /api/v1/member/life-events — the NON-PII panel summary (presence flags + counts). */
    async summary(request: FastifyRequest): Promise<LifeEventsSummaryResult> {
      const { memberIdStr, pariwarIdStr } = memberCtx(request);
      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        const result = await buildSummary(
          scopeTx,
          ids.pariwarId(pariwarIdStr),
          ids.memberId(memberIdStr),
        );
        ok = true;
        return result;
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },
  };
}
