// Claim-time DPDPA consent handlers — Story 6.9 (Task 4; AC1/AC2/AC3/AC4/AC5).
//
// The FIRST live claim-time consumer of the Story 2.7 consent registry (recordConsent /
// revokeConsent / consentExists). Two authenticated surfaces share ONE core write path:
//   · member-app (Ravi-mode session, NO step-up — consent is not a financial action) — /member/claims
//   · helpline operator (admin scope + claim.file + step-up for RECORD; claim.manage_dpdpa_consent for
//     REVOKE) — the admin scope-tx path
//
// ── The consumer obligations this file owns (the medical 3.5 write-path template) ─────────────
// (1) LOCKED re-read is the enforcement point (AC5, TOCTOU): the shared writer re-reads + LOCKS the
//     claim (`SELECT … FOR UPDATE`) INSIDE the scope-tx and takes tenant / claim-ownership / current
//     state / `subjectId = deceasedMemberId` (D1) from THAT locked row — a route-level read is only a
//     clean-error pre-check, never the enforcement point.
// (2) AUDIT-OR-THROW (ADR-0030): `audit.withCompensatingAudit` writes the intent line FIRST
//     (servicePool, its own tx → auditId), each recordConsent/revokeConsent threads that auditId, and
//     the consent inserts + the claim event run on ONE scope-tx so a throw rolls them back together
//     while the intent line survives and a compensating `*_rolled_back` line settles the chain — a
//     consent row is NEVER written without its audit line (the Story 2.7 consumer obligation).
// (3) CONSENT-COPY INTEGRITY (D2): the client sends only the box selections + locale; the SERVER
//     resolves the canonical/versioned copy (resolveDpdpaConsentCopy) and writes THAT into
//     consent_payload.checkboxTextShown — a tampered client cannot persist non-approved evidence copy.
// (4) The `claim.dpdpa_consent_recorded` identity annotation (D6) is emitted via projectClaimState
//     ONLY when ≥1 grant row was written — never an empty-subset event ("consent recorded" never
//     means "nothing was granted"; keeps the D3a legal-posture flip a pure guard/copy change).
// (5) NO PII on any audit line or event — claim_case_id + granted-type flags + actor only. The
//     checkbox text + locale live only in consent_payload.

import { createHash } from 'node:crypto';

import {
  DpdpaConsentType,
  isDpdpaProcessingConsentSatisfied,
  type DpdpaConsentStatusResponse,
  type RecordDpdpaConsentRequest,
  type RecordDpdpaConsentResponse,
  type RevokeDpdpaConsentRequest,
  type RevokeDpdpaConsentResponse,
} from '@twt/contracts';
import { audit, canonicalJsonStringify, claim, consent, ids } from '@twt/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { BadRequestError, ConflictError, NotFoundError, UnauthorizedError } from '../../http-errors.js';
import { emitAuthAudit } from '../auth/shared/audit.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';
import { resolveDpdpaConsentCopy } from './dpdpa-consent-copy.js';

/** The pre-adjudication window in which consent may be RECORDED (AC5; mirror the domain const). */
const RECORDABLE_STATES = new Set<string>(claim.DPDPA_CONSENT_RECORDABLE_STATES);

/** All three claim-time consent types, in a stable order (for the presence view). */
const ALL_TYPES = DpdpaConsentType.options;

interface ActorCtx {
  claimCaseId: ids.ClaimId;
  pariwarId: ids.PariwarId;
  actorId: string;
  /** `member` (Ravi-mode) or `operator` (helpline) — drives the event actor + the audit action. */
  actor: 'member' | 'operator';
  /** `member_self` (member app) / `staff_assisted` (helpline) — the Story 2.7 grant channel (D4). */
  grantedViaActor: 'member_self' | 'staff_assisted';
  /** Member-app authz: the claim's deceased member must equal the acting session member (D1/AC5). */
  requireDeceasedMemberId?: ids.MemberId;
}

/** The granted subset the request encodes, in canonical order — the box-to-type mapping. */
function grantedTypesFromRequest(body: RecordDpdpaConsentRequest): DpdpaConsentType[] {
  const granted: DpdpaConsentType[] = [];
  if (body.claimTimeDpdpa) granted.push('claim_time_dpdpa');
  if (body.sahyogVivranPublication) granted.push('sahyog_vivran_publication');
  if (body.inMemoriamListing) granted.push('in_memoriam_listing');
  // Story 11b.1 (D4(b)) — the fourth box. Same shape as its siblings: an UNCHECKED box records
  // nothing at all, so a decline leaves no grant row and `consentExists` returns the same verdict it
  // returns for a family never asked. That equivalence is intended — 11b.1's render gate treats a
  // MISSING and a REVOKED consent identically, and neither omits the pool, only the name.
  if (body.sahyogDrivePublication) granted.push('sahyog_drive_publication');
  return granted;
}

/**
 * The NON-PII presence view: which of the FOUR claim-time consent types (Story 11b.1 added the
 * Sahyog Drive box) are CURRENTLY valid for the
 * deceased member (the D1a member-scoped key). Uses `consentExists` per type at DB now() — a revoked
 * or never-granted type is absent. No decryption, no PII (the granted-type flags only).
 */
async function presenceView(
  tx: Awaited<ReturnType<typeof openScopeTx>>['tx'],
  pariwarId: ids.PariwarId,
  deceasedMemberId: string,
): Promise<DpdpaConsentStatusResponse> {
  const checks = await Promise.all(
    ALL_TYPES.map((t) => consent.consentExists(tx, pariwarId, deceasedMemberId, t)),
  );
  return { granted: ALL_TYPES.filter((_, i) => checks[i]) };
}

export function createDpdpaConsentHandlers(deps: AppDeps) {
  /** Read the authenticated member's (memberId, pariwarId) or fail 401. */
  function memberCtx(request: FastifyRequest): { memberIdStr: string; pariwarIdStr: string } {
    const memberIdStr = request.requestContext.actorId;
    const pariwarIdStr = request.requestContext.pariwarId;
    if (!memberIdStr || !pariwarIdStr) {
      throw new UnauthorizedError('Authentication required', 'auth.session_required');
    }
    return { memberIdStr, pariwarIdStr };
  }

  /**
   * The shared RECORD core. Opens its OWN scope-tx; inside the audit-or-throw chain it locks the
   * claim, guards ownership + tenant + the pre-adjudication window off the LOCKED row, server-resolves
   * the canonical copy, records ONE grant per checked box (threading the auditId), emits the identity
   * annotation ONLY when ≥1 grant was written, and returns the NON-PII presence view.
   */
  async function record(
    request: FastifyRequest,
    body: RecordDpdpaConsentRequest,
    ctx: ActorCtx,
  ): Promise<RecordDpdpaConsentResponse> {
    const grantedTypes = grantedTypesFromRequest(body);
    // D3a (server-authoritative): the trust-processing consent is required to proceed. A contract
    // `.refine()` already rejects this as a 400 for any HTTP caller; re-enforce here (same status
    // family, BadRequestError not ConflictError — this is a validation failure, not a state conflict)
    // so a raw/non-HTTP caller of this function can't bypass it. Code review gap-closure: this now
    // calls the SAME `isDpdpaProcessingConsentSatisfied` predicate the contract `.refine()` uses
    // (packages/contracts/src/claims/dpdpa-consent.ts) — ONE named policy, not two independently-
    // maintained boolean checks that could silently drift if the D3a posture ever changes.
    if (!isDpdpaProcessingConsentSatisfied(body.claimTimeDpdpa)) {
      throw new BadRequestError(
        'Claim-time DPDPA processing consent is required to proceed',
        'dpdpa_consent.processing_consent_required',
      );
    }

    const scopeTx = await openScopeTx(deps, ctx.pariwarId);
    let ok = false;
    try {
      return await audit.withCompensatingAudit(deps.servicePool, {
        auditIntent: {
          pariwarId: ctx.pariwarId,
          actorId: ctx.actorId,
          actorRole: null,
          action: 'claim.dpdpa_consent_recorded',
          resourceLocator: `claim:${ctx.claimCaseId}:dpdpa-consent`,
          requestPayloadHash: createHash('sha256')
            .update(
              canonicalJsonStringify({
                claim_case_id: ctx.claimCaseId,
                consent_types_granted: grantedTypes,
                actor: ctx.actor,
              }),
              'utf8',
            )
            .digest('hex'),
          traceId: request.requestContext.traceId ?? null,
        },
        mutate: async ({ auditId }) => {
          // (1) LOCK + re-read the claim — the enforcement point (AC5). Ownership / tenant / state /
          //     subjectId all come from THIS row, not a route-level pre-check.
          const claimRow = await claim.lockClaimCase(scopeTx.tx, ctx.pariwarId, ctx.claimCaseId);
          if (!claimRow) throw new NotFoundError('Claim not found', 'claim.not_found');
          // Member-app: the session member may only record onto their OWN claim (no cross-claim oracle).
          if (
            ctx.requireDeceasedMemberId &&
            claimRow.deceasedMemberId !== ctx.requireDeceasedMemberId
          ) {
            throw new NotFoundError('Claim not found', 'claim.not_found');
          }
          // Pre-adjudication window guard — reject recording onto an adjudicated / terminal claim.
          if (!RECORDABLE_STATES.has(claimRow.currentState)) {
            throw new ConflictError(
              'Consent cannot be recorded for the claim in its current state',
              'dpdpa_consent.not_recordable',
              { state: claimRow.currentState },
            );
          }

          // (2) D1: the DPDPA data subject is the DECEASED member (from the locked row), NOT the filer.
          const subjectId = claimRow.deceasedMemberId;

          // (3) Record ONE grant per checked box — server-resolved canonical copy into checkboxTextShown.
          for (const consentType of grantedTypes) {
            await consent.recordConsent(scopeTx.tx, {
              pariwarId: ctx.pariwarId,
              subjectId, // D1 — the deceased member; NO brand (Story 2.7 kept subject_id polymorphic).
              consentType,
              consentArtifactRef: ctx.claimCaseId, // D1 — provenance back-link ONLY (never a query key).
              grantedViaActor: ctx.grantedViaActor,
              consentPayload: {
                checkboxTextShown: resolveDpdpaConsentCopy(consentType, body.locale),
                locale: body.locale,
              },
              auditId,
            });
          }

          // (4) Emit the identity annotation ONLY when ≥1 grant was written (D6). grantedTypes is
          //     always non-empty here (D3a guarantees claim_time_dpdpa) — but this stays correct even
          //     if D3a is later relaxed: an all-declined submission would emit NO grant + NO event.
          if (grantedTypes.length > 0) {
            await claim.projectClaimState(scopeTx.client, {
              claimCaseId: ctx.claimCaseId,
              pariwarId: ctx.pariwarId,
              deceasedMemberId: claimRow.deceasedMemberId,
              intakeChannels: claimRow.intakeChannels,
              claimantActorId: claimRow.claimantActorId,
              eventType: 'claim.dpdpa_consent_recorded',
              payload: {
                from_state: claimRow.currentState,
                to_state: claimRow.currentState,
                trigger:
                  ctx.actor === 'member'
                    ? 'member_record_dpdpa_consent'
                    : 'helpline_record_dpdpa_consent',
                actor: ctx.actor,
                consent_types_granted: grantedTypes,
              },
              actorId: ctx.actorId,
              auditId,
            });
          }

          const view = await presenceView(scopeTx.tx, ctx.pariwarId, subjectId);
          ok = true;
          // (5) Fire-and-forget secondary sink line, AFTER ok=true — NON-PII (granted-type flags only).
          emitAuthAudit(
            deps,
            request,
            ctx.actor === 'member'
              ? 'member_claim.dpdpa_consent_recorded'
              : 'helpline_claim.dpdpa_consent_recorded',
            {
              actorId: ctx.actorId,
              pariwarId: ctx.pariwarId,
              context: {
                claim_case_id: ctx.claimCaseId,
                consent_types_granted: grantedTypes,
                intake_channel: ctx.actor === 'member' ? 'member_app' : 'helpline',
              },
            },
          );
          return view;
        },
      });
    } finally {
      await closeScopeTx(scopeTx, ok);
    }
  }

  /**
   * The shared REVOKE core (D7 — the AC3 mechanism; Epic 11b performs the takedown). Revocation is
   * allowed at ANY claim state (a post-settlement takedown is the whole point), so there is NO state
   * guard. Revokes EVERY currently-valid grant of the publication type for the deceased member so
   * `consentExists` deterministically flips to false; each revoke threads the one audit id.
   */
  async function revoke(
    request: FastifyRequest,
    body: RevokeDpdpaConsentRequest,
    ctx: ActorCtx,
  ): Promise<RevokeDpdpaConsentResponse> {
    const scopeTx = await openScopeTx(deps, ctx.pariwarId);
    let ok = false;
    try {
      return await audit.withCompensatingAudit(deps.servicePool, {
        auditIntent: {
          pariwarId: ctx.pariwarId,
          actorId: ctx.actorId,
          actorRole: null,
          action: 'claim.dpdpa_consent_revoked',
          resourceLocator: `claim:${ctx.claimCaseId}:dpdpa-consent:${body.consentType}`,
          requestPayloadHash: createHash('sha256')
            .update(
              canonicalJsonStringify({
                claim_case_id: ctx.claimCaseId,
                consent_type: body.consentType,
                actor: ctx.actor,
              }),
              'utf8',
            )
            .digest('hex'),
          traceId: request.requestContext.traceId ?? null,
        },
        mutate: async ({ auditId }) => {
          // Lock + re-read (ownership / tenant / subject from the locked row — no state guard on revoke).
          const claimRow = await claim.lockClaimCase(scopeTx.tx, ctx.pariwarId, ctx.claimCaseId);
          if (!claimRow) throw new NotFoundError('Claim not found', 'claim.not_found');
          if (
            ctx.requireDeceasedMemberId &&
            claimRow.deceasedMemberId !== ctx.requireDeceasedMemberId
          ) {
            throw new NotFoundError('Claim not found', 'claim.not_found');
          }
          const subjectId = claimRow.deceasedMemberId;

          // Resolve the currently-valid (non-revoked) grants of this publication type for the subject.
          // Explicitly request the hard cap (200), not the accessor's default page (50) — a subject
          // with >50 accumulated grants (the grant-history "every resubmission is a new row" model)
          // would otherwise leave stale active rows beyond the first page un-revoked, letting
          // `consentExists` (uncapped) keep returning true after a "successful" revoke (AC3). `listConsents`
          // has no cursor/offset (Story 2.7, frozen primitive), so 200 is the practical ceiling here.
          const active = await consent.listConsents(scopeTx.tx, ctx.pariwarId, subjectId, {
            consentType: body.consentType,
            includeRevoked: false,
            limit: 200,
          });
          if (active.length === 0) {
            // Mirrors the wa-opt-in/telegram-opt-in revoke convention (handlers.ts) — no ACTIVE grant
            // to revoke is a 409, not a silent no-op, even on a repeat/retried request.
            throw new ConflictError(
              'There is no active consent of this type to revoke',
              'dpdpa_consent.nothing_to_revoke',
            );
          }
          // Revoke every active grant so consentExists deterministically flips to false (AC3). The row
          // is mutated, never deleted — a pre-revocation consentExists(..., pastTimestamp) stays true.
          for (const row of active) {
            await consent.revokeConsent(scopeTx.tx, {
              pariwarId: ctx.pariwarId,
              consentId: row.consentId,
              reason: body.reason,
              revokedAuditId: auditId,
            });
          }

          // The symmetric identity annotation (code review addition, D6's own rationale extended to
          // revoke) — keeps the claim's evidentiary timeline explainable: "consent was captured at
          // claim-time, then revoked." NO reason, NO PII — the type revoked only.
          await claim.projectClaimState(scopeTx.client, {
            claimCaseId: ctx.claimCaseId,
            pariwarId: ctx.pariwarId,
            deceasedMemberId: claimRow.deceasedMemberId,
            intakeChannels: claimRow.intakeChannels,
            claimantActorId: claimRow.claimantActorId,
            eventType: 'claim.dpdpa_consent_revoked',
            payload: {
              from_state: claimRow.currentState,
              to_state: claimRow.currentState,
              trigger:
                ctx.actor === 'member' ? 'member_revoke_dpdpa_consent' : 'helpline_revoke_dpdpa_consent',
              actor: ctx.actor,
              consent_type: body.consentType,
            },
            actorId: ctx.actorId,
            auditId,
          });

          const view = await presenceView(scopeTx.tx, ctx.pariwarId, subjectId);
          ok = true;
          emitAuthAudit(
            deps,
            request,
            ctx.actor === 'member'
              ? 'member_claim.dpdpa_consent_revoked'
              : 'helpline_claim.dpdpa_consent_revoked',
            {
              actorId: ctx.actorId,
              pariwarId: ctx.pariwarId,
              context: {
                claim_case_id: ctx.claimCaseId,
                consent_type: body.consentType,
                intake_channel: ctx.actor === 'member' ? 'member_app' : 'helpline',
              },
            },
          );
          return view;
        },
      });
    } finally {
      await closeScopeTx(scopeTx, ok);
    }
  }

  return {
    /** POST /api/v1/member/claims/:claimCaseId/dpdpa-consent — member-app (Ravi-mode) record. */
    async recordMember(request: FastifyRequest, reply: FastifyReply): Promise<RecordDpdpaConsentResponse> {
      const { memberIdStr, pariwarIdStr } = memberCtx(request);
      const { claimCaseId } = request.params as { claimCaseId: string };
      const out = await record(request, request.body as RecordDpdpaConsentRequest, {
        claimCaseId: ids.claimId(claimCaseId),
        pariwarId: ids.pariwarId(pariwarIdStr),
        actorId: memberIdStr,
        actor: 'member',
        grantedViaActor: 'member_self',
        requireDeceasedMemberId: ids.memberId(memberIdStr),
      });
      void reply.status(201);
      return out;
    },

    /** GET /api/v1/member/claims/:claimCaseId/dpdpa-consent — member-app presence view (re-entry). */
    async getStatusMember(request: FastifyRequest, reply: FastifyReply): Promise<DpdpaConsentStatusResponse> {
      const { memberIdStr, pariwarIdStr } = memberCtx(request);
      const { claimCaseId } = request.params as { claimCaseId: string };
      const pariwarId = ids.pariwarId(pariwarIdStr);
      const claimCaseIdBrand = ids.claimId(claimCaseId);
      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        const claimRow = await claim.getClaimCase(scopeTx.tx, pariwarId, claimCaseIdBrand);
        if (!claimRow || claimRow.deceasedMemberId !== ids.memberId(memberIdStr)) {
          throw new NotFoundError('Claim not found', 'claim.not_found');
        }
        const view = await presenceView(scopeTx.tx, pariwarId, claimRow.deceasedMemberId);
        ok = true;
        void reply.status(200);
        return view;
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },

    /** POST /api/v1/member/claims/:claimCaseId/dpdpa-consent/revoke — member-app revoke (D7). */
    async revokeMember(request: FastifyRequest, reply: FastifyReply): Promise<RevokeDpdpaConsentResponse> {
      const { memberIdStr, pariwarIdStr } = memberCtx(request);
      const { claimCaseId } = request.params as { claimCaseId: string };
      const out = await revoke(request, request.body as RevokeDpdpaConsentRequest, {
        claimCaseId: ids.claimId(claimCaseId),
        pariwarId: ids.pariwarId(pariwarIdStr),
        actorId: memberIdStr,
        actor: 'member',
        grantedViaActor: 'member_self',
        requireDeceasedMemberId: ids.memberId(memberIdStr),
      });
      void reply.status(200);
      return out;
    },

    /**
     * POST /api/v1/p/:pariwarId/admin/claims/:claimCaseId/dpdpa-consent — helpline (operator) record.
     * Rides the operator's admin scope + claim.file + step-up (consent capture is part of filing).
     */
    async recordHelpline(request: FastifyRequest, reply: FastifyReply): Promise<RecordDpdpaConsentResponse> {
      const scopeTx = request.scopeTx;
      const operatorId = request.requestContext.actorId;
      if (!scopeTx || !operatorId) {
        throw new UnauthorizedError('Authentication required', 'auth.session_required');
      }
      const { claimCaseId } = request.params as { claimCaseId: string };
      const out = await record(request, request.body as RecordDpdpaConsentRequest, {
        claimCaseId: ids.claimId(claimCaseId),
        pariwarId: ids.pariwarId(scopeTx.pariwarId),
        actorId: operatorId,
        actor: 'operator',
        grantedViaActor: 'staff_assisted',
      });
      void reply.status(201);
      return out;
    },

    /**
     * POST /api/v1/p/:pariwarId/admin/claims/:claimCaseId/dpdpa-consent/revoke — helpline revoke (D7).
     * Gated on the dedicated claim.manage_dpdpa_consent permission (D5a — revocation is a later
     * consent-management action, NOT filing; not authorized by claim.file).
     */
    async revokeHelpline(request: FastifyRequest, reply: FastifyReply): Promise<RevokeDpdpaConsentResponse> {
      const scopeTx = request.scopeTx;
      const operatorId = request.requestContext.actorId;
      if (!scopeTx || !operatorId) {
        throw new UnauthorizedError('Authentication required', 'auth.session_required');
      }
      const { claimCaseId } = request.params as { claimCaseId: string };
      const out = await revoke(request, request.body as RevokeDpdpaConsentRequest, {
        claimCaseId: ids.claimId(claimCaseId),
        pariwarId: ids.pariwarId(scopeTx.pariwarId),
        actorId: operatorId,
        actor: 'operator',
        grantedViaActor: 'staff_assisted',
      });
      void reply.status(200);
      return out;
    },
  };
}
