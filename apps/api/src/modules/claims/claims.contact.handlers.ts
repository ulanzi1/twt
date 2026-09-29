// The claim CONTACT RECORD handlers — Story 6.19a (Task 2; AC1, AC8a, AC9a; W1–W10).
//
//   · member   POST /api/v1/member/claims/:claimCaseId/contact            — member session; the claim must be the
//                                                                          member's OWN (mismatch ⇒ 404)
//   · helpline POST /api/v1/p/:pariwarId/admin/claims/:claimCaseId/contact — claim.file + step-up (the DPDPA
//                                                                          helpline precedent; `staff_assisted`)
//   · presence GET  …/admin/claims/:claimCaseId/contact                    — claim.view_nominee_name_check,
//                                                                          district; ⛔ no value (AC8a (i))
//   · details  GET  …/admin/claims/:claimCaseId/contact/details            — claim.file; the operator's
//                                                                          PLAINTEXT read-back (AC8a (ii))
//
// ── The audit unit (W10) — the `claims.dpdpa-consent.handlers.ts` precedent ─────────────────────────────────
// ONE `withCompensatingAudit` intent line per write (`claim.contact_recorded`, `claim:<lower-case uuid>`); when
// the write records an agreement, the consent row's `audit_id` IS that intent line's id. Every other line is an
// `emitAuthAudit` event, fired after success — ⛔ never a second `writeAuditEntry` inside `mutate`
// (`access-wrapper-invariants` rule (3)).
//
// ⛔ PII: no log line, event, audit context or error body carries an address, a name, a mobile or a
// relationship — counts, the claimant SIDE and the mode only. Recording the agreement emits ⛔ no
// `claim.dpdpa_consent_recorded` (AC10).

import { createHash } from 'node:crypto';

import type {
  ClaimContactDetailsResponse,
  ClaimContactPresenceResponse,
  RecordHelplineClaimContactRequest,
  RecordHelplineClaimContactResponse,
  RecordMemberClaimContactRequest,
  RecordMemberClaimContactResponse,
} from '@twt/contracts';
import { audit, canonicalJsonStringify, claim, consent, ids } from '@twt/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { BadRequestError, ConflictError, NotFoundError, UnauthorizedError } from '../../http-errors.js';
import { emitAuthAudit } from '../auth/shared/audit.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';
import {
  CLAIM_CONTACT_DECRYPT_FAILED_SENTINEL,
  decryptClaimContactField,
  decryptClaimContactFieldSoft,
  encryptClaimContactField,
} from './claim-contact-crypto.js';
import { CLAIM_CONTACT_AGREEMENT_COPY_VERSION, resolveClaimContactAgreementCopy } from './claim-contact-copy.js';

/** Map a refused write to its stable HTTP shape — `claim_contact.<code>`, non-PII details only. */
function translateWriteRefusal(err: unknown): never {
  if (err instanceof claim.ClaimContactWriteRefusedError) {
    const code = `claim_contact.${err.code}`;
    if (err.status === 404) throw new NotFoundError('Claim not found', 'claim.not_found');
    if (err.status === 400) throw new BadRequestError(err.message.replace(/^\[claim-contact\] claim [^:]+: /, ''), code, err.details);
    throw new ConflictError(err.message.replace(/^\[claim-contact\] claim [^:]+: /, ''), code, err.details);
  }
  throw err;
}

/** The presence DTO — the domain read with every ciphertext STRIPPED (AC8a (i)). */
function toPresenceDto(p: claim.ClaimContactPresence): ClaimContactPresenceResponse {
  return {
    claimCaseId: p.claimCaseId,
    recorded: p.recorded,
    determination: p.determination,
    writeMode: p.writeMode,
    nominees: p.nominees.map((n) => ({
      rank: n.rank,
      nomineeVersionId: n.nomineeVersionId,
      addressPresent: n.addressCiphertext !== null,
      relationshipPresent: n.relationship !== null,
      row: n.row,
    })),
    claimantSide: p.claimantSide,
    claimantNomineeVersionId: p.claimantNomineeVersionId,
    claimantIsAnAllowedNominee: p.claimantIsAnAllowedNominee,
    claimantBlockNeeded: p.claimantBlockNeeded,
    agreement: p.agreement,
    contactLocale: p.contactLocale,
    missing: p.missing,
  };
}

interface WriteCtx {
  readonly claimCaseId: ids.ClaimId;
  readonly pariwarId: ids.PariwarId;
  readonly actorId: string;
  readonly surface: 'member_app' | 'helpline';
  readonly locale: 'hi' | 'en';
}

export function createClaimContactHandlers(deps: AppDeps) {
  /**
   * The shared WRITE core. Opens its OWN scope-tx (the DPDPA precedent); inside the audit-or-throw chain the
   * domain writer locks the claim and validates EVERYTHING before its first write, so a refusal leaves nothing.
   */
  async function write(
    request: FastifyRequest,
    ctx: WriteCtx,
    build: (ports: Pick<claim.MemberClaimContactInput, 'crypto' | 'recordAgreement'>) => claim.WriteClaimContactInput,
    shape: Record<string, unknown>,
  ): Promise<{ result: claim.WriteClaimContactResult; presence: claim.ClaimContactPresence | null }> {
    const scopeTx = await openScopeTx(deps, ctx.pariwarId);
    let ok = false;
    try {
      return await audit.withCompensatingAudit(deps.servicePool, {
        auditIntent: {
          pariwarId: ctx.pariwarId,
          actorId: ctx.actorId,
          actorRole: null,
          action: 'claim.contact_recorded',
          // ⚠ `ids.claimId` lower-cases, so the locator passes the pattern (anything else is silently replaced).
          resourceLocator: `claim:${ctx.claimCaseId}`,
          requestPayloadHash: createHash('sha256')
            .update(canonicalJsonStringify({ claim_case_id: ctx.claimCaseId, surface: ctx.surface, ...shape }), 'utf8')
            .digest('hex'),
          traceId: request.requestContext.traceId ?? null,
        },
        mutate: async ({ auditId }) => {
          const ports: Pick<claim.MemberClaimContactInput, 'crypto' | 'recordAgreement'> = {
            crypto: {
              encrypt: (v) => encryptClaimContactField(v, ctx.pariwarId, deps.encryption),
              // W5's comparison — a failure PROPAGATES (a wrong answer here would silently overwrite).
              decrypt: (c) => decryptClaimContactField(c, ctx.pariwarId, deps.encryption),
            },
            recordAgreement: async (deceasedMemberId) => {
              const row = await consent.recordConsent(scopeTx.tx, {
                pariwarId: ctx.pariwarId,
                subjectId: deceasedMemberId, // the DECEASED member ([[project_consent_subject_key_convention]])
                consentType: 'claim_contact_agreement',
                consentArtifactRef: ctx.claimCaseId, // provenance back-link ONLY — ⛔ never a query key (D15)
                grantedViaActor: ctx.surface === 'member_app' ? 'member_self' : 'staff_assisted',
                consentPayload: {
                  checkboxTextShown: resolveClaimContactAgreementCopy(ctx.locale),
                  locale: ctx.locale,
                  copyVersion: CLAIM_CONTACT_AGREEMENT_COPY_VERSION,
                },
                auditId, // ⭐ the consent's audit_id IS the intent line's id (W10)
              });
              return row.consentId;
            },
          };
          let result: claim.WriteClaimContactResult;
          try {
            result = await claim.writeClaimContact(scopeTx.tx, build(ports));
          } catch (err) {
            translateWriteRefusal(err);
          }
          const presence =
            ctx.surface === 'helpline'
              ? await claim.readClaimContactPresence(scopeTx.tx, ctx.pariwarId, ctx.claimCaseId)
              : null;
          ok = true;
          // Secondary lines, AFTER success — NON-PII (counts, side, mode).
          const context = {
            claim_case_id: ctx.claimCaseId,
            created: result.created,
            rows_written: result.rowsWritten,
            claimant_side: result.claimantSide,
            claimant_side_written: result.claimantSideWritten,
            mode: result.mode,
            compare_decrypts: result.compareDecrypts,
            agreement_ignored: result.agreementIgnored,
          };
          emitAuthAudit(
            deps,
            request,
            ctx.surface === 'member_app' ? 'member_claim.contact_recorded' : 'helpline_claim.contact_recorded',
            { actorId: ctx.actorId, pariwarId: ctx.pariwarId, context, resourceLocator: `claim:${ctx.claimCaseId}` },
          );
          if (result.agreementRecorded) {
            emitAuthAudit(deps, request, 'claim_contact.agreement_recorded', {
              actorId: ctx.actorId,
              pariwarId: ctx.pariwarId,
              context: { claim_case_id: ctx.claimCaseId, surface: ctx.surface, copy_version: CLAIM_CONTACT_AGREEMENT_COPY_VERSION },
              resourceLocator: `claim:${ctx.claimCaseId}`,
            });
          }
          return { result, presence };
        },
      });
    } finally {
      await closeScopeTx(scopeTx, ok);
    }
  }

  /** The admin reads' shared prologue — the route's own scope-tx (the permission hooks already ran). */
  function adminCtx(request: FastifyRequest) {
    const scopeTx = request.scopeTx;
    const actorId = request.requestContext.actorId;
    if (!scopeTx || !actorId) throw new UnauthorizedError('Authentication required', 'auth.session_required');
    const { claimCaseId } = request.params as { claimCaseId: string };
    return { scopeTx, actorId, pariwarId: ids.pariwarId(scopeTx.pariwarId), claimCaseId: ids.claimId(claimCaseId) };
  }

  return {
    /** POST /api/v1/member/claims/:claimCaseId/contact — the family's FULL record (W1). */
    async recordMember(request: FastifyRequest, reply: FastifyReply): Promise<RecordMemberClaimContactResponse> {
      const memberIdStr = request.requestContext.actorId;
      const pariwarIdStr = request.requestContext.pariwarId;
      if (!memberIdStr || !pariwarIdStr) throw new UnauthorizedError('Authentication required', 'auth.session_required');
      const body = request.body as RecordMemberClaimContactRequest;
      const { claimCaseId } = request.params as { claimCaseId: string };
      const ctx: WriteCtx = {
        claimCaseId: ids.claimId(claimCaseId),
        pariwarId: ids.pariwarId(pariwarIdStr),
        actorId: memberIdStr,
        surface: 'member_app',
        locale: body.locale,
      };
      const { result } = await write(
        request,
        ctx,
        (ports) => ({
          ...ports,
          surface: 'member_app',
          pariwarId: ctx.pariwarId,
          claimCaseId: ctx.claimCaseId,
          actorId: ctx.actorId,
          requireDeceasedMemberId: ids.memberId(memberIdStr),
          locale: body.locale,
          ranks: body.nominees.map((n) => ({
            rank: n.rank,
            address: n.address,
            ...(n.relationship !== undefined ? { relationship: n.relationship } : {}),
          })),
          ...(body.claimantNomineeRank !== undefined ? { claimantNomineeRank: body.claimantNomineeRank } : {}),
          ...(body.claimant !== undefined ? { claimantBlock: body.claimant } : {}),
          agreed: true,
        }),
        { ranks: body.nominees.length, claimant: body.claimant !== undefined ? 'block' : 'nominee' },
      );
      void reply.status(201);
      return { recorded: true, claimantSide: result.claimantSide, agreementRecorded: result.agreementRecorded };
    },

    /** POST /api/v1/p/:pariwarId/admin/claims/:claimCaseId/contact — the helpline's (possibly partial) write (W2). */
    async recordHelpline(request: FastifyRequest, reply: FastifyReply): Promise<RecordHelplineClaimContactResponse> {
      const { actorId, pariwarId, claimCaseId } = adminCtx(request);
      const body = request.body as RecordHelplineClaimContactRequest;
      const ctx: WriteCtx = { claimCaseId, pariwarId, actorId, surface: 'helpline', locale: body.locale };
      const { result, presence } = await write(
        request,
        ctx,
        (ports) => ({
          ...ports,
          surface: 'helpline',
          pariwarId,
          claimCaseId,
          actorId,
          locale: body.locale,
          rows: (body.nominees ?? []).map((n) => ({
            nomineeVersionId: n.nomineeVersionId.toLowerCase(),
            ...(n.address !== undefined ? { address: n.address } : {}),
            ...(n.relationship !== undefined ? { relationship: n.relationship } : {}),
          })),
          ...(body.claimantNomineeVersionId !== undefined
            ? { claimantNomineeVersionId: body.claimantNomineeVersionId.toLowerCase() }
            : {}),
          ...(body.claimant !== undefined ? { claimantBlock: body.claimant } : {}),
          ...(body.agreed !== undefined ? { agreed: body.agreed } : {}),
        }),
        {
          rows: (body.nominees ?? []).length,
          claimant: body.claimant !== undefined ? 'block' : body.claimantNomineeVersionId !== undefined ? 'nominee' : 'none',
          agreed: body.agreed === true,
        },
      );
      void reply.status(201);
      return {
        presence: toPresenceDto(presence!),
        agreementRecorded: result.agreementRecorded,
        agreementIgnored: result.agreementIgnored,
      };
    },

    /** GET …/admin/claims/:claimCaseId/contact — presence only (AC8a (i)); ⛔ no value, ⛔ no decryption. */
    async getPresence(request: FastifyRequest, reply: FastifyReply): Promise<ClaimContactPresenceResponse> {
      const { scopeTx, actorId, pariwarId, claimCaseId } = adminCtx(request);
      const presence = await claim.readClaimContactPresence(scopeTx.tx, pariwarId, claimCaseId);
      if (!presence) throw new NotFoundError('Claim not found', 'claim.not_found');
      emitAuthAudit(deps, request, 'admin_claim.contact_presence_read', {
        actorId,
        pariwarId,
        context: { claim_case_id: claimCaseId, recorded: presence.recorded, missing: presence.missing },
        resourceLocator: `claim:${claimCaseId}`,
      });
      void reply.status(200);
      return toPresenceDto(presence);
    },

    /**
     * GET …/admin/claims/:claimCaseId/contact/details — the helpline operator's PLAINTEXT read-back (AC8a (ii)),
     * under `claim.file`: the one role that re-types these fields. Fail-soft per field (the sentinel parses);
     * ONE audit line per read, naming how many fields were decrypted.
     */
    async getDetails(request: FastifyRequest, reply: FastifyReply): Promise<ClaimContactDetailsResponse> {
      const { scopeTx, actorId, pariwarId, claimCaseId } = adminCtx(request);
      const presence = await claim.readClaimContactPresence(scopeTx.tx, pariwarId, claimCaseId);
      if (!presence) throw new NotFoundError('Claim not found', 'claim.not_found');
      let decrypted = 0;
      let failed = 0;
      const soft = async (c: string): Promise<string> => {
        const plaintext = await decryptClaimContactFieldSoft(c, pariwarId, deps.encryption, (err) =>
          request.log.warn({ err, claimCaseId }, '[claim-contact] a contact field could not be decrypted'),
        );
        if (plaintext === CLAIM_CONTACT_DECRYPT_FAILED_SENTINEL) failed += 1;
        else decrypted += 1;
        return plaintext;
      };
      const nominees = [];
      for (const n of presence.nominees) {
        nominees.push({
          rank: n.rank,
          nomineeVersionId: n.nomineeVersionId,
          row: n.row,
          address: n.addressCiphertext === null ? null : await soft(n.addressCiphertext),
          relationship: n.relationship,
        });
      }
      const block = presence.claimantBlockCiphertext;
      const claimant =
        block === null
          ? null
          : { name: await soft(block.name), mobile: await soft(block.mobile), address: await soft(block.address) };
      emitAuthAudit(deps, request, 'admin_claim.contact_details_read', {
        actorId,
        pariwarId,
        // ⭐ Review 2026-09-29: `decrypted` counts only CONFIRMED successes; `fields_failed` names the sentinel
        // fallback separately so the audit line can't overstate actual plaintext exposure.
        context: { claim_case_id: claimCaseId, fields_decrypted: decrypted, fields_failed: failed },
        resourceLocator: `claim:${claimCaseId}`,
      });
      void reply.status(200);
      return { claimCaseId, nominees, claimantNomineeVersionId: presence.claimantNomineeVersionId, claimant };
    },
  };
}
