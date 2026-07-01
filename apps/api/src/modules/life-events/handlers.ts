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

import type {
  AddressUpdateRequest,
  LifeEventsSummaryResult,
  PostingUpdateRequest,
} from '@twt/contracts';
import {
  ids,
  medical as medicalDomain,
  member as memberDomain,
  nominee as nomineeDomain,
} from '@twt/domain';
import type { FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { ConflictError, UnauthorizedError } from '../../http-errors.js';
import { emitAuthAudit } from '../auth/shared/audit.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';
import type { ScopeTx } from '../../types.js';
import { encryptAddressLine } from './address-crypto.js';

/** Lifecycle states in which a Life Events update is rejected (terminal — mirror nominee/medical). */
const TERMINAL_STATES = new Set(['withdrawn', 'anonymized']);

export function createLifeEventsHandlers(deps: AppDeps) {
  const enc = deps.encryption;

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
     * POST /api/v1/member/life-events/posting — record a posting / transfer-in-out change (NO
     * step-up). Appends a row to the append-only history (district plaintext non-PII), emits the
     * `member.posting_updated` NON-TRANSITION marker (carries the non-PII district + is_retirement),
     * and audits after the summary build succeeds. Records the district change as a member attribute
     * + event ONLY — it does NOT move the member across Pariwars (v1-S scope).
     */
    async updatePosting(request: FastifyRequest): Promise<LifeEventsSummaryResult> {
      const body = request.body as PostingUpdateRequest;
      const { memberIdStr, pariwarIdStr } = memberCtx(request);
      const isRetirement = body.isRetirement ?? false;

      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        const memberId = ids.memberId(memberIdStr);
        const pariwarId = ids.pariwarId(pariwarIdStr);
        const state = await assertMemberExistsAndNotTerminal(scopeTx, pariwarId, memberId);

        await memberDomain.insertMemberPosting(scopeTx.tx, {
          memberId,
          pariwarId,
          district: body.district,
          pariwarRef: body.pariwarRef ?? null,
          isRetirement,
        });

        await memberDomain.projectMemberState(scopeTx.client, {
          memberId,
          pariwarId,
          eventType: 'member.posting_updated',
          payload: {
            from_state: state,
            to_state: state,
            trigger: 'life_events_posting_update',
            actor: 'member',
            district: body.district,
            ...(body.pariwarRef ? { pariwar_ref: body.pariwarRef } : {}),
            is_retirement: isRetirement,
          },
          actorId: memberIdStr,
        });

        const result = await buildSummary(scopeTx, pariwarId, memberId);
        ok = true;
        emitAuthAudit(deps, request, 'member_life_events.posting_updated', {
          actorId: memberIdStr,
          pariwarId: pariwarIdStr,
          context: { district: body.district, is_retirement: isRetirement },
        });
        return result;
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
