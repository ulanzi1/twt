// Member-validity read + admin member-search handlers — Story 4.7 (Task 4; D5, AC1/AC2).
//
// The apps/api contract boundary Story 4.6 EXPLICITLY deferred to this story. Three thin read handlers
// over the framework-agnostic `@twt/validity-service` + the AR-65 `member_search_projection` accessor:
//   1. memberValidityRead  — the member's OWN (redacted, NOT audited) validity payload.
//   2. adminValidityRead   — an admin's (scope-gated, AUDITED) validity read of a member.
//   3. adminMemberSearch   — the AR-65 compound-read-model search (identity decrypted for display).
//
// ── The service owns the scope contract, NOT the app (D5-B rejected) ────────────────────────────────
// Redaction (`redactForCaller`) + the admin audit line live INSIDE `@twt/validity-service`. This module
// only (a) constructs the `ValidityCaller` (grants + resource locator + self flag), (b) supplies the
// engine `EvaluateDeps`, and (c) maps the service payload → the camelCase wire DTO (a pass-through — the
// shipped wire format is camelCase; see contracts/members/validity.ts). It does NOT re-implement
// redaction or the permission decision — the service's `assertCanReadValidity` is the gate.

import { createHash } from 'node:crypto';

import { getValidity, type ValidityCaller, type ValidityServiceDeps } from '@twt/validity-service';
import { audit, idempotency, ids, member as memberDomain, type Db } from '@twt/domain';
import type {
  MemberSearchRequest,
  MemberSearchResponse,
  MemberSearchResultItem,
  MemberValidityResponse,
} from '@twt/contracts';
import type { FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { NotFoundError, UnauthorizedError } from '../../http-errors.js';
import { decryptMobile, maskMobile, mobileBlindIndex } from '../auth/shared/mobile-index.js';
import { decryptKycField } from '../kyc/kyc-crypto.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';

/** The `member.view_validity` key (Story 4.6, catalog v3) — the admin search/read gate. */
const MEMBER_VIEW_VALIDITY_KEY = 'member.view_validity';

export function createMemberValidityHandlers(deps: AppDeps) {
  /** Assemble the engine DI for a scope-bound Db (reads via RLS-scoped `db`; audit via servicePool). */
  function validityDeps(db: Db, traceId: string | null): ValidityServiceDeps {
    return {
      db,
      keyedStore: idempotency.createKeyedStore(deps.servicePool),
      servicePool: deps.servicePool,
      traceId,
    };
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

  return {
    MEMBER_VIEW_VALIDITY_KEY,

    /**
     * GET /api/v1/member/validity — the member's own validity payload. Self-call: the service verifies
     * the `self` locator independently (never trusting `isSelf` verbatim), redacts State-Trustee-only
     * fields, and does NOT audit (PRD FR-12A). Mirrors the member-home read (own scope tx, deps.clock is
     * unused — getValidity pins DB now() itself).
     */
    async memberValidityRead(request: FastifyRequest): Promise<MemberValidityResponse> {
      const { memberIdStr, pariwarIdStr } = memberCtx(request);
      const memberId = ids.memberId(memberIdStr);
      const pariwarId = ids.pariwarId(pariwarIdStr);

      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        const caller: ValidityCaller = {
          actorId: memberIdStr,
          grants: [],
          resource: { dimension: 'self', value: memberIdStr, pariwarId: pariwarIdStr },
          isSelf: true,
        };
        const validity = await getValidity(
          validityDeps(scopeTx.tx, request.requestContext.traceId ?? null),
          { pariwarId, memberId },
          { caller },
        );
        ok = true;
        return { validity };
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },

    /**
     * GET /api/v1/p/:pariwarId/admin/members/:memberId/validity — an admin's scope-gated, AUDITED read.
     * The route chain [session, scope, requirePermission(member.view_validity)] has already enforced the
     * key; the service's `assertCanReadValidity` re-checks at the resource locator (defense-in-depth) and
     * writes the `validity.evaluate` audit line (non-self caller).
     */
    async adminValidityRead(request: FastifyRequest): Promise<MemberValidityResponse> {
      const scopeTx = request.scopeTx;
      const actorId = request.requestContext.actorId;
      if (!scopeTx || !actorId) {
        throw new Error('[member-validity] adminValidityRead ran without session + scope-resolution');
      }
      const { memberId: memberIdParam } = request.params as { memberId: string };
      const memberId = ids.memberId(memberIdParam);
      const pariwarId = ids.pariwarId(scopeTx.pariwarId);

      // `getMemberStateAt` is non-nullable (a nonexistent — or cross-tenant, RLS-filtered — member
      // replays to `pending-kyc`), so without an existence probe the service would fabricate a 200
      // payload AND write a `validity.evaluate` audit line for a phantom member. Fail 404 first.
      if (!(await memberDomain.memberExists(scopeTx.tx, pariwarId, memberId))) {
        throw new NotFoundError('Member not found', 'member.not_found');
      }

      const caller: ValidityCaller = {
        actorId,
        grants: request.scopeGrants ?? [],
        resource: { dimension: 'pariwar', value: scopeTx.pariwarId, pariwarId: scopeTx.pariwarId },
        isSelf: false,
      };
      const validity = await getValidity(
        validityDeps(scopeTx.tx, request.requestContext.traceId ?? null),
        { pariwarId, memberId },
        { caller },
      );
      return { validity };
    },

    /**
     * POST /api/v1/p/:pariwarId/admin/members/search — the AR-65 compound-read-model member search.
     * Exact-match only (D3): `memberId`, `mobile` (server blind-indexes the raw value), or `pariwar`
     * (browse the active scope). Decrypts the joined identity columns for display under the admin's
     * scope; NEVER returns ciphertext. The route chain already enforced `member.view_validity`.
     */
    async adminMemberSearch(request: FastifyRequest): Promise<MemberSearchResponse> {
      const scopeTx = request.scopeTx;
      const actorId = request.requestContext.actorId;
      if (!scopeTx || !actorId) {
        throw new Error('[member-validity] adminMemberSearch ran without session + scope-resolution');
      }
      const body = request.body as MemberSearchRequest;
      const pariwarId = ids.pariwarId(scopeTx.pariwarId);

      // Resolve the exact-match criteria. A raw mobile is blind-indexed at THIS boundary (the login
      // path's helper) — the domain accessor never sees the plaintext. An un-normalizable mobile → no
      // results (never a plaintext scan).
      let criteria: memberDomain.MemberSearchCriteria | null;
      if (body.by === 'memberId') {
        criteria = { by: 'memberId', memberId: ids.memberId(body.value!) };
      } else if (body.by === 'mobile') {
        const bi = await mobileBlindIndex(body.value!, deps.encryption);
        criteria = bi === null ? null : { by: 'mobileBlindIndex', mobileBlindIndex: bi };
      } else {
        criteria = { by: 'pariwar' };
      }
      if (criteria === null) return { results: [] };

      const rows = await memberDomain.searchMembers(scopeTx.tx, {
        pariwarId,
        criteria,
        limit: body.limit,
        offset: body.offset,
      });

      const results: MemberSearchResultItem[] = await Promise.all(
        rows.map(async (r) => {
          // An anonymized member (RTBF) has its mobile/name ciphertext overwritten with an encryption
          // of the anonymized sentinel — it decrypts to garbage, so BOTH identity fields are suppressed
          // for `anonymized` (the display-name seam discipline). Decrypt the mobile → masked last-4
          // (NEVER plaintext); resolve the display name (null when no KYC profile exists).
          const anonymized = r.state === 'anonymized';
          const maskedMobile =
            anonymized || r.mobileCiphertext === null
              ? null
              : maskMobile(await decryptMobile(r.mobileCiphertext, deps.encryption));
          const name =
            anonymized || r.nameCiphertext === null
              ? null
              : await decryptKycField(r.nameCiphertext, scopeTx.pariwarId, deps.encryption);
          return {
            memberId: r.memberId,
            state: r.state,
            name,
            maskedMobile,
            aadhaarMasked: r.aadhaarMaskedId,
            verificationStrength: r.verificationStrength,
            nomineeSummary: r.nomineeSummary,
            contributionSection: r.contributionSection,
            claimSection: r.claimSection,
          };
        }),
      );

      // Admin member-search bulk-decrypts identity for display — it MUST leave an audit trail (D5-A:
      // "admin validity read + member-search … audit-logged"). ONE `member.search` line per search
      // records who searched, the (hashed, never plaintext) criteria, and how many members were
      // decrypted. Written through the Story 1.10 hash-chain writer on the BYPASSRLS servicePool.
      const criteriaHash = createHash('sha256')
        .update(`${body.by}:${body.value ?? ''}`)
        .digest('hex');
      await audit.writeAuditEntry(deps.servicePool, {
        pariwarId: scopeTx.pariwarId,
        actorId,
        actorRole: null,
        action: 'member.search',
        resourceLocator: `pariwar/${scopeTx.pariwarId}/members?by=${body.by}&n=${results.length}`,
        requestPayloadHash: criteriaHash,
        responseStatus: 200,
        traceId: request.requestContext.traceId ?? null,
      });

      return { results };
    },
  };
}
