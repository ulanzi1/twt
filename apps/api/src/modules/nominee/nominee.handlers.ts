// Nominee declaration handlers — Story 3.4 (Task 5; AC1/AC2/AC3/AC4/AC5).
//
// The third signup-wizard SURFACE (between KYC 3.3b and medical 3.5). `declare` persists the
// 1–2 nominee rows (Tier-1 encrypted) with a SERVER-derived 75/25 split (R4) and emits
// `member.nominees_declared` via the projector — a NON-TRANSITION marker (from_state ===
// to_state; R5). `status` returns the current effective declaration as NON-PII summaries.
//
// ── Scope-tx discipline ────────────────────────────────────────────────────────────────
// `requireMemberSession` sets `request.requestContext.{actorId,pariwarId}` but does NOT open
// a scope tx, so each handler opens its own (`openScopeTx`) and the projector gets the raw
// `scopeTx.client` (it issues `SET LOCAL app.member_state_writer='on'`). Nominee replace +
// event append + state projection run inside ONE scope tx so a torn view never exists.
//
// ── PII discipline (R1) ──────────────────────────────────────────────────────────────────
// name/mobile/address are Tier-1 encrypted in the handler before the accessor sees them; the
// event payload + audit carry only `nominee_count` + `split` — NEVER nominee name/mobile/
// address. The status response echoes presence flags, never the raw bytes (AC4 / echo-back).
//
// ── Re-runnable for Story 3.9 (R3) ───────────────────────────────────────────────────────
// `declare` is the re-runnable declare SERVICE: Story 3.9 attaches `requireMemberStepUp(deps,
// 'nominee_change')` on its Life Events route and reuses this handler with zero changes. NO
// step-up here (signup — the member holds a fresh signup-continuation session).

import type {
  NomineeDeclareRequest,
  NomineeStatusResponse,
  NomineeSummaryEntry,
} from '@twt/contracts';
import { ids, nominee as nomineeDomain, member as memberDomain } from '@twt/domain';
import type { FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { BadRequestError, ConflictError, UnauthorizedError } from '../../http-errors.js';
import { emitAuthAudit } from '../auth/shared/audit.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';
import type { ScopeTx } from '../../types.js';
import { encryptNomineeField } from './nominee-crypto.js';

/** Lifecycle states in which a nominee declaration is rejected (terminal — R2). */
const TERMINAL_STATES = new Set(['withdrawn', 'anonymized']);

export function createNomineeHandlers(deps: AppDeps) {
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

  /** Map a stored nominee row to its NON-PII summary entry (never the raw bytes). The row
   * type is derived from the accessor return (schema row types are namespaced under
   * `@twt/domain` `schema.*`, not on the top barrel — the kyc-handler pattern). */
  function toSummary(
    row: Awaited<ReturnType<typeof nomineeDomain.getMemberNominees>>[number],
  ): NomineeSummaryEntry {
    return {
      rank: row.rank as 1 | 2,
      relationship: row.relationship as NomineeSummaryEntry['relationship'],
      splitPct: row.splitPct as 100 | 75 | 25,
      mobilePresent: true, // mobile is required (NOT NULL on member_nominees)
      addressPresent: row.addressCiphertext !== null,
    };
  }

  /** Assemble the `/nominees` status view from the current row-set. */
  async function buildStatus(
    scopeTx: ScopeTx,
    pariwarId: ids.PariwarId,
    memberId: ids.MemberId,
  ): Promise<NomineeStatusResponse> {
    const rows = await nomineeDomain.getMemberNominees(scopeTx.tx, pariwarId, memberId);
    return { nominees: rows.map(toSummary) };
  }

  return {
    /**
     * POST /api/v1/member/nominees — declare 1–2 nominees (latest-wins replace) → emit
     * `member.nominees_declared`. The split is SERVER-derived from the count (R4); the lifecycle
     * state is unchanged (non-transition marker, R5). Rejected only in terminal states (R2).
     */
    async declare(request: FastifyRequest): Promise<NomineeStatusResponse> {
      const body = request.body as NomineeDeclareRequest;
      const { memberIdStr, pariwarIdStr } = memberCtx(request);

      // Defense-in-depth: the contract bounds nominees to 1..2, but never trust the count.
      const count = body.nominees.length;
      if (count < 1 || count > 2) {
        throw new BadRequestError('Declare 1 or 2 nominees', 'nominee.invalid_count');
      }
      const { split, ranks } = nomineeDomain.deriveNomineeSplit(count);

      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        const memberId = ids.memberId(memberIdStr);
        const pariwarId = ids.pariwarId(pariwarIdStr);

        // Guard: a member in a terminal state cannot re-declare nominees (R2). Pre-lock-in
        // states (pending-kyc/pending-fee/pending-valid) and active states are all allowed —
        // nominees may legitimately be declared before or after KYC within the wizard.
        const state = await memberDomain.getMemberStateAt(scopeTx.tx, memberId, deps.clock());
        if (TERMINAL_STATES.has(state)) {
          throw new ConflictError(
            'Member is in a terminal state — nominees cannot be declared',
            'nominee.member_terminal',
          );
        }

        // Encrypt each nominee field under the member's real pariwar context, stamping the
        // server-derived rank + splitPct (the client never supplies a percentage — R4).
        const rows = await Promise.all(
          body.nominees.map(async (n, i) => {
            const { rank, splitPct } = ranks[i]!;
            return {
              rank,
              splitPct,
              relationship: n.relationship,
              nameCiphertext: await encryptNomineeField(n.name, pariwarIdStr, enc),
              mobileCiphertext: await encryptNomineeField(n.mobile, pariwarIdStr, enc),
              addressCiphertext: n.address
                ? await encryptNomineeField(n.address, pariwarIdStr, enc)
                : null,
            };
          }),
        );

        await nomineeDomain.replaceMemberNominees(scopeTx.tx, {
          memberId,
          pariwarId,
          nominees: rows,
        });

        // Non-transition marker: from_state === to_state (R5). The reducer treats
        // member.nominees_declared as identity; this records the MOMENT on the stream with the
        // NON-PII audit (count + split only — R1). A re-declaration emits a NEW event (AC5).
        await memberDomain.projectMemberState(scopeTx.client, {
          memberId,
          pariwarId,
          eventType: 'member.nominees_declared',
          payload: {
            from_state: state,
            to_state: state,
            trigger: 'nominee_declaration',
            actor: 'member',
            nominee_count: count as 1 | 2,
            split,
          },
          actorId: memberIdStr,
        });

        const result = await buildStatus(scopeTx, pariwarId, memberId);
        ok = true;
        // Emit audit only after buildStatus succeeds and ok is set: if buildStatus throws,
        // closeScopeTx rolls back the tx but the audit would have already fired.
        emitAuthAudit(deps, request, 'member_nominees.declared', {
          actorId: memberIdStr,
          pariwarId: pariwarIdStr,
          context: { nominee_count: count, split },
        });
        return result;
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },

    /** GET /api/v1/member/nominees — the current effective declaration (NON-PII summaries). */
    async status(request: FastifyRequest): Promise<NomineeStatusResponse> {
      const { memberIdStr, pariwarIdStr } = memberCtx(request);
      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        const result = await buildStatus(
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
