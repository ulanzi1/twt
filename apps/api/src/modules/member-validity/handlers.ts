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

import {
  FallbackRateMonitor,
  getValidityCached,
  type ValidityCacheObserver,
  type ValidityCaller,
  type ValidityServiceDeps,
} from '@twt/validity-service';
import { audit, idempotency, ids, member as memberDomain, validityCache, type Db } from '@twt/domain';
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
/** The `validity.invalidate_cache` key (Story 4.8 code review, catalog v4) — the trustee-only
 *  emergency "invalidate all" WRITE gate, distinct from the read-only key above. */
const VALIDITY_INVALIDATE_CACHE_KEY = 'validity.invalidate_cache';

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

  // Story 4.8 (Task 5) — ONE shared fallback-rate monitor across this surface's requests. A sustained
  // conservative-recompute fallback rate > threshold over the window signals cache degradation (backend
  // down, broadcast lag, clock anomaly). The alert TRANSPORT is a documented ops hook (Category-5 CR for
  // the real metrics sink); here the crossing is surfaced on the request logger.
  const fallbackMonitor = new FallbackRateMonitor();

  /** Per-request cache observer: structured fallback + write-error logging (no PII/payload) + rate monitor. */
  function cacheObserver(request: FastifyRequest): ValidityCacheObserver {
    return {
      onCacheEvent(event) {
        const alert = fallbackMonitor.record(event.outcome);
        if (event.outcome.kind === 'fallback') {
          request.log.warn(
            {
              op: 'validity_cache.fallback',
              reason: event.outcome.reason,
              pariwarId: event.pariwarId,
              durationMs: event.durationMs,
            },
            'validity cache: conservative-recompute fallback (served fresh, never stale)',
          );
        }
        if (event.outcome.kind === 'poisoned') {
          request.log.warn(
            { op: 'validity_cache.poisoned', pariwarId: event.pariwarId, durationMs: event.durationMs },
            'validity cache: poisoned entry (stored hash mismatch) — recomputed and overwritten',
          );
        }
        if (alert) {
          request.log.error(
            { op: 'validity_cache.fallback_rate_alert', ...alert },
            'validity cache: sustained fallback rate exceeded threshold',
          );
        }
      },
      onCacheWriteError(err, pariwarId) {
        request.log.warn(
          { err, op: 'validity_cache.write_error', pariwarId },
          'validity cache: best-effort write failed (swallowed — request unaffected)',
        );
      },
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
    VALIDITY_INVALIDATE_CACHE_KEY,

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
        const validity = await getValidityCached(
          validityDeps(scopeTx.tx, request.requestContext.traceId ?? null),
          { pariwarId, memberId },
          { caller, observer: cacheObserver(request) },
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
      const validity = await getValidityCached(
        validityDeps(scopeTx.tx, request.requestContext.traceId ?? null),
        { pariwarId, memberId },
        { caller, observer: cacheObserver(request) },
      );
      return { validity };
    },

    /**
     * POST /api/v1/p/:pariwarId/admin/validity-cache/invalidate-all — the trustee "invalidate all"
     * emergency posture change (Story 4.8 AC1c / AC3). Bumps EVERY cohort epoch for the Pariwar in the
     * scoped tx, so every subsequent validity read misses → direct recomputation until the cache
     * repopulates organically (the performance dip is the accepted cost of never serving stale validity).
     * Records the emergency invalidation on the Story 1.10 hash-chain audit. The route chain already
     * enforced `member.view_validity` — v1 reuses that gate (a dedicated `validity.invalidate` key + the
     * UI surface are Epic-10 admin-polish; the epic AC only says "the trustee triggers it").
     */
    async adminInvalidateValidityCache(
      request: FastifyRequest,
    ): Promise<{ invalidated: true; pariwarId: string }> {
      const scopeTx = request.scopeTx;
      const actorId = request.requestContext.actorId;
      if (!scopeTx || !actorId) {
        throw new Error(
          '[member-validity] adminInvalidateValidityCache ran without session + scope-resolution',
        );
      }
      const pariwarId = ids.pariwarId(scopeTx.pariwarId);

      await validityCache.invalidateAllForPariwar(scopeTx.tx, pariwarId);

      // Emergency-invalidation audit line (BYPASSRLS hash-chain writer). No PII — records who invalidated
      // which Pariwar's validity cache and when.
      await audit.writeAuditEntry(deps.servicePool, {
        pariwarId: scopeTx.pariwarId,
        actorId,
        actorRole: null,
        action: 'validity_cache.invalidate_all',
        resourceLocator: `pariwar/${scopeTx.pariwarId}/validity-cache`,
        requestPayloadHash: createHash('sha256')
          .update(`validity_cache.invalidate_all:${scopeTx.pariwarId}`)
          .digest('hex'),
        responseStatus: 200,
        traceId: request.requestContext.traceId ?? null,
      });

      return { invalidated: true, pariwarId: scopeTx.pariwarId };
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
      // results (never a plaintext scan), but the attempt is still audited below (D5-A: every search,
      // including ones that resolve to nothing, leaves a trail).
      let criteria: memberDomain.MemberSearchCriteria | null;
      let mobileBi: string | null = null;
      if (body.by === 'memberId') {
        criteria = { by: 'memberId', memberId: ids.memberId(body.value!) };
      } else if (body.by === 'mobile') {
        mobileBi = await mobileBlindIndex(body.value!, deps.encryption);
        criteria = mobileBi === null ? null : { by: 'mobileBlindIndex', mobileBlindIndex: mobileBi };
      } else {
        criteria = { by: 'pariwar' };
      }

      const rows =
        criteria === null
          ? []
          : await memberDomain.searchMembers(scopeTx.tx, {
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
          // (NEVER plaintext); resolve the display name (null when no KYC profile exists). A corrupt or
          // otherwise undecryptable ciphertext degrades just this row rather than failing the whole page.
          const anonymized = r.state === 'anonymized';
          let maskedMobile: string | null = null;
          if (!anonymized && r.mobileCiphertext !== null) {
            try {
              maskedMobile = maskMobile(await decryptMobile(r.mobileCiphertext, deps.encryption));
            } catch (err) {
              request.log.error({ err, memberId: r.memberId }, 'member-search: mobile decrypt failed');
            }
          }
          let name: string | null = null;
          if (!anonymized && r.nameCiphertext !== null) {
            try {
              name = await decryptKycField(r.nameCiphertext, scopeTx.pariwarId, deps.encryption);
            } catch (err) {
              request.log.error({ err, memberId: r.memberId }, 'member-search: name decrypt failed');
            }
          }
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
      // "admin validity read + member-search … audit-logged"), including attempts that resolve to zero
      // results. ONE `member.search` line per search records who searched, the (hashed, never plaintext)
      // criteria, and how many members were decrypted. Written through the Story 1.10 hash-chain writer
      // on the BYPASSRLS servicePool. For mobile criteria the audit hash reuses the already-computed HMAC
      // blind index (`mobileBi`) rather than re-hashing the raw value with unsalted SHA-256 — the blind
      // index is a keyed digest and does not reintroduce a brute-forceable correlation surface.
      const criteriaHashInput = body.by === 'mobile' ? (mobileBi ?? '') : (body.value ?? '');
      const criteriaHash = createHash('sha256').update(`${body.by}:${criteriaHashInput}`).digest('hex');
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
