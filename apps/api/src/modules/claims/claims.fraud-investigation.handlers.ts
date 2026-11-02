// Story 6.22 — the fraud register's investigation: HTTP handlers (Task 4.3; DL3–DL7, DL10 (iv), DL14;
// `2026-11-01-438`). The domain writers decide; these handlers encrypt, resolve the actor's display name, map refusals and
// audit.
//
//   (a) POST …/claims/:claimCaseId/fraud-investigation/flag       — the helpline operator (`claim.flag_fraud`, pariwar).
//   (b) GET  …/members/:memberId/fraud-investigation/claims       — EVERY claim naming the member (same key, pariwar).
//   (c) POST …/claims/:claimCaseId/fraud-investigation/finding    — the District Admin (`claim.record_fraud_finding`,
//                                                                   district, step-up `FRAUD_FINDING_STEP_UP_CONTEXT`).
//   (d) GET  …/claims/:claimCaseId/fraud-investigation             — the console read (`claim.verify`, district): the notes
//                                                                   WITHHELD UNIFORMLY unless the viewer holds the finding key
//                                                                   at this district; a decrypting read is audited.
//   (e) GET  …/fraud-investigations                                — the District Admin's work-list (per-row district check).
//
// ⛔ No Tier-1 in an audit context, a log line or an event (N6): ids, the outcome, `alive_confirmation`, reason codes.

import { claim as claimDomain, ids, member as memberDomain, rbac } from '@twt/domain';
import { isMemorialTextBlank } from '@twt/contracts';
import type {
  FraudFindingRequest,
  FraudFindingResponse,
  FraudFlagRequest,
  FraudFlagResponse,
  FraudInvestigationNote,
  FraudInvestigationResponse,
  MemberFraudClaimsResponse,
  OpenFraudInvestigationsResponse,
} from '@twt/contracts';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import {
  AdminDisplayNameMissingError,
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '../../http-errors.js';
import { getDisplayName } from '../auth/admin/admin-auth.repo.js';
import { emitAuthAudit } from '../auth/shared/audit.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';
import { geoTreeResolverForRequest, loadActorGrants } from '../rbac/index.js';
import { decryptFraudInvestigationNote, encryptFraudInvestigationNote } from './fraud-investigation-crypto.js';

/** The flag + the helpline's per-member list — PARIWAR dimension (the operator is ⛔ district-scoped). */
export const FRAUD_FLAG_KEY = 'claim.flag_fraud';
/** The finding, the work-list and the console's note un-withholding — DISTRICT dimension. */
export const FRAUD_FINDING_KEY = 'claim.record_fraud_finding';
/** The console read — the verifier console's own key (its holders already see the claim). */
export const FRAUD_INVESTIGATION_READ_KEY = 'claim.verify';

function scopeOf(request: FastifyRequest) {
  const scopeTx = request.scopeTx;
  const actorId = request.requestContext.actorId;
  if (!scopeTx || !actorId) throw new UnauthorizedError('Authentication required', 'auth.session_required');
  return { scopeTx, actorId, pariwarId: ids.pariwarId(scopeTx.pariwarId) };
}

async function resolveDisplay(deps: AppDeps, actorId: string): Promise<string> {
  const display = await getDisplayName(deps.pool, actorId);
  if (display == null || display.trim() === '') throw new AdminDisplayNameMissingError(actorId);
  return display;
}

const locator = (claimCaseId: string) => `claim:${claimCaseId.toLowerCase()}`;

/**
 * Does the note carry a visible character? `trim()` strips ordinary whitespace but ⛔ U+200B-U+200D, U+2060, U+2800 or the Hangul
 * fillers (U+115F, U+1160, U+3164, U+FFA0 — LETTERS that draw nothing), so a note of those would satisfy "every step carries a note"
 * while being empty to a reader. The repo's ONE blank rule already handles all of them (strip the invisible class, then require a
 * letter, number, punctuation or symbol — the memorial's `isMemorialTextBlank`), so it is reused, ⛔ copied (code review 2026-11-02, RB11).
 */
export const hasVisibleText = (note: string): boolean => !isMemorialTextBlank(note);

/**
 * A refusal the WRITER owns, onto HTTP: 404 / 400 / 409 `fraud_investigation.<reason>` — ⛔ never a 500. EXPORTED so a unit test can turn
 * every domain reason into its wire code and pin `FRAUD_INVESTIGATION_ERROR_CODES` to it (RB6).
 */
export function translateFraudRefusal(err: unknown): never {
  if (err instanceof claimDomain.FraudInvestigationRefusedError) {
    const code = `fraud_investigation.${err.reason}`;
    if (err.reason === 'claim_not_found') throw new NotFoundError('Claim not found', code);
    if (err.reason === 'missing_note' || err.reason === 'missing_alive_confirmation') {
      throw new BadRequestError('The fraud investigation step is incomplete', code);
    }
    throw new ConflictError('The fraud investigation step was refused', code);
  }
  if (err instanceof claimDomain.ClaimStreamConcurrencyError) {
    throw new ConflictError('The claim changed while the step was being recorded — please try again', 'fraud_investigation.concurrent');
  }
  throw err;
}

/**
 * The bounded reason a refusal is audited with: the writer's reason, `concurrent`, or `missing_display` for the handler's own
 * `AdminDisplayNameMissingError` — whose WIRE code is the generic `admin.display_name_missing`, ⛔ `fraud_investigation.missing_display`.
 * ⛔ Never a message with data.
 */
function auditReason(err: unknown): string {
  if (err instanceof claimDomain.FraudInvestigationRefusedError) return err.reason;
  if (err instanceof claimDomain.ClaimStreamConcurrencyError) return 'concurrent';
  if (err instanceof AdminDisplayNameMissingError) return 'missing_display';
  return err instanceof Error ? err.name : 'unknown';
}

/** Best-effort audit: a failed audit write must ⛔ never turn a committed step into a 500, nor mask a refusal. */
function emitAuditBestEffort(
  deps: AppDeps,
  request: FastifyRequest,
  type: Parameters<typeof emitAuthAudit>[2],
  fields?: Parameters<typeof emitAuthAudit>[3],
): void {
  try {
    emitAuthAudit(deps, request, type, fields);
  } catch (err) {
    request.log.error({ err: err instanceof Error ? err.name : 'unknown' }, 'fraud-investigation: audit emit failed');
  }
}

/** Decrypt one note for an authorized reader: a failure / empty is `unreadable`; the RTBF sentinel is `anonymized`. */
async function readNote(deps: AppDeps, request: FastifyRequest, ciphertext: string, pariwarId: string, claimCaseId: string): Promise<FraudInvestigationNote> {
  try {
    const value = await decryptFraudInvestigationNote(ciphertext, pariwarId, deps.encryption);
    if (value === '') return { state: 'unreadable' };
    if (value === memberDomain.ANONYMIZED_SENTINEL) return { state: 'anonymized' };
    return { state: 'readable', value };
  } catch (err) {
    // The class name only — ⛔ never the ciphertext or a fragment of a decrypt.
    request.log.warn({ err: err instanceof Error ? err.name : 'unknown', claimCaseId }, 'fraud-investigation: decrypt failed; unreadable');
    return { state: 'unreadable' };
  }
}

export function createFraudInvestigationHandlers(deps: AppDeps) {
  const enc = deps.encryption;

  /** Does the caller hold the finding key at THIS claim's district (the per-claim gate's own predicate)? */
  async function holdsFindingKeyAt(request: FastifyRequest, district: string | null): Promise<boolean> {
    const { scopeTx, actorId } = scopeOf(request);
    const grants = request.scopeGrants ?? (await loadActorGrants(scopeTx, actorId));
    request.scopeGrants = grants;
    return rbac.hasPermission(
      grants,
      FRAUD_FINDING_KEY,
      { dimension: 'district', value: district, pariwarId: scopeTx.pariwarId },
      { resolver: geoTreeResolverForRequest(request) },
    );
  }

  return {
    /** (a) POST — the helpline operator FLAGS the claim. 201 new / 200 replay. */
    async postFlag(request: FastifyRequest, reply: FastifyReply): Promise<FraudFlagResponse> {
      const { scopeTx: outer, actorId } = scopeOf(request);
      const { claimCaseId } = request.params as { claimCaseId: string };
      const body = request.body as FraudFlagRequest;
      const p = outer.pariwarId;

      let result: Awaited<ReturnType<typeof claimDomain.flagClaimForFraudInvestigation>> | undefined;
      let failure: unknown;
      try {
        const actorDisplay = await resolveDisplay(deps, actorId);
        // An empty or visually-empty PLAINTEXT note is caught here, before it is encrypted (an empty plaintext does ⛔ encrypt to empty).
        if (!hasVisibleText(body.note)) {
          throw new claimDomain.FraudInvestigationRefusedError(claimCaseId, 'missing_note', 'every step carries a note');
        }
        const noteCiphertext = await encryptFraudInvestigationNote(body.note, p, enc);
        const scopeTx = await openScopeTx(deps, p);
        let ok = false;
        try {
          result = await claimDomain.flagClaimForFraudInvestigation(scopeTx.client, {
            claimCaseId: ids.claimId(claimCaseId),
            pariwarId: ids.pariwarId(p),
            stepId: ids.claimFraudInvestigationStepId(body.step_id),
            noteCiphertext,
            actorId,
            actorDisplay,
            actor: 'operator',
          });
          ok = true;
        } finally {
          await closeScopeTx(scopeTx, ok);
        }
      } catch (err) {
        failure = err;
      }

      if (failure !== undefined || result === undefined) {
        emitAuditBestEffort(deps, request, 'admin_claim.fraud_flag_rejected', {
          actorId,
          pariwarId: p,
          resourceLocator: locator(claimCaseId),
          context: { claim_case_id: claimCaseId.toLowerCase(), reason: auditReason(failure) },
        });
        if (failure instanceof AdminDisplayNameMissingError) throw failure;
        return translateFraudRefusal(failure);
      }
      if (!result.replayed) {
        emitAuditBestEffort(deps, request, 'admin_claim.fraud_flagged', {
          actorId,
          pariwarId: p,
          resourceLocator: locator(claimCaseId),
          context: { claim_case_id: claimCaseId.toLowerCase(), step_id: result.stepId, claim_state: result.claimState },
        });
      }
      void reply.status(result.replayed ? 200 : 201);
      return { claim_case_id: claimCaseId.toLowerCase(), step_id: result.stepId, claim_state: result.claimState, replayed: result.replayed };
    },

    /** (b) GET — every claim naming the member the operator has found and read back, in EVERY state. ⛔ PII. */
    async getMemberClaims(request: FastifyRequest): Promise<MemberFraudClaimsResponse> {
      const { scopeTx, actorId, pariwarId } = scopeOf(request);
      const { memberId } = request.params as { memberId: string };
      const memberIdBrand = ids.memberId(memberId);
      const rows = await claimDomain.listClaimsNamingMemberForFraudFlag(scopeTx.tx, pariwarId, memberIdBrand);
      // ⭐ Audited like its 6.21b sibling (`admin_death_certificate.claims_read`) — code review 2026-11-02, RB9: this list shows EVERY claim
      // naming ANY member of the Pariwar, in every state, to any `claim.flag_fraud` holder. The member id and a count — ⛔ a state, ⛔ a name.
      emitAuditBestEffort(deps, request, 'admin_claim.fraud_claims_read', {
        actorId,
        pariwarId: scopeTx.pariwarId,
        resourceLocator: `member:${memberIdBrand}`,
        context: { member_id: memberIdBrand, claim_count: rows.length },
      });
      return {
        claims: rows.map((r) => ({
          claim_case_id: String(r.claimCaseId).toLowerCase(),
          claim_state: r.currentState,
          filed_at: r.filedAt.toISOString(),
          investigation: r.investigation,
        })),
      };
    },

    /** (c) POST — the District Admin's FINDING (behind step-up). 201 new / 200 replay. */
    async postFinding(request: FastifyRequest, reply: FastifyReply): Promise<FraudFindingResponse> {
      const { scopeTx: outer, actorId } = scopeOf(request);
      const { claimCaseId } = request.params as { claimCaseId: string };
      const body = request.body as FraudFindingRequest;
      const p = outer.pariwarId;

      let result: Awaited<ReturnType<typeof claimDomain.recordFraudFinding>> | undefined;
      let failure: unknown;
      try {
        const actorDisplay = await resolveDisplay(deps, actorId);
        if (!hasVisibleText(body.note)) {
          throw new claimDomain.FraudInvestigationRefusedError(claimCaseId, 'missing_note', 'every step carries a note');
        }
        if (body.alive_confirmation === undefined) {
          throw new claimDomain.FraudInvestigationRefusedError(claimCaseId, 'missing_alive_confirmation', 'how the member was confirmed alive');
        }
        const noteCiphertext = await encryptFraudInvestigationNote(body.note, p, enc);
        const scopeTx = await openScopeTx(deps, p);
        let ok = false;
        try {
          result = await claimDomain.recordFraudFinding(scopeTx.client, {
            claimCaseId: ids.claimId(claimCaseId),
            pariwarId: ids.pariwarId(p),
            outcome: body.outcome,
            aliveConfirmation: body.alive_confirmation,
            stepId: ids.claimFraudInvestigationStepId(body.step_id),
            findingId: ids.claimNomineeFindingId(body.finding_id),
            noteCiphertext,
            actorId,
            actorDisplay,
            actor: 'operator',
          });
          ok = true;
        } finally {
          await closeScopeTx(scopeTx, ok);
        }
      } catch (err) {
        failure = err;
      }

      if (failure !== undefined || result === undefined) {
        emitAuditBestEffort(deps, request, 'admin_claim.fraud_finding_rejected', {
          actorId,
          pariwarId: p,
          resourceLocator: locator(claimCaseId),
          context: {
            claim_case_id: claimCaseId.toLowerCase(),
            outcome: body.outcome,
            alive_confirmation: body.alive_confirmation ?? null,
            reason: auditReason(failure),
          },
        });
        if (failure instanceof AdminDisplayNameMissingError) throw failure;
        return translateFraudRefusal(failure);
      }
      const notClosedReason = result.close.closed ? null : result.close.reason;
      if (!result.replayed) {
        emitAuditBestEffort(deps, request, 'admin_claim.fraud_finding_recorded', {
          actorId,
          pariwarId: p,
          resourceLocator: locator(claimCaseId),
          context: {
            claim_case_id: claimCaseId.toLowerCase(),
            step_id: result.stepId,
            finding_id: result.findingId,
            outcome: result.outcome,
            alive_confirmation: body.alive_confirmation,
            closed: result.close.closed,
            not_closed_reason: notClosedReason,
            other_standing_claims: result.otherStandingClaims.length,
          },
        });
      }
      void reply.status(result.replayed ? 200 : 201);
      return {
        claim_case_id: claimCaseId.toLowerCase(),
        step_id: result.stepId,
        finding_id: result.findingId,
        outcome: result.outcome,
        closed: result.close.closed,
        not_closed_reason: notClosedReason,
        other_standing_claims: result.otherStandingClaims.map((c) => ({
          claim_case_id: c.claimCaseId.toLowerCase(),
          claim_state: c.currentState,
          filed_at: c.filedAt.toISOString(),
        })),
        replayed: result.replayed,
      };
    },

    /** (d) GET — the console read: the steps; every note WITHHELD unless the viewer holds the finding key here (uniform). */
    async getInvestigation(request: FastifyRequest, reply: FastifyReply): Promise<FraudInvestigationResponse> {
      const { scopeTx, actorId, pariwarId } = scopeOf(request);
      const { claimCaseId } = request.params as { claimCaseId: string };
      const claimRow = await claimDomain.getClaimCase(scopeTx.tx, pariwarId, ids.claimId(claimCaseId));
      if (!claimRow) throw new NotFoundError('Claim not found', 'fraud_investigation.claim_not_found');
      const steps = await claimDomain.listFraudInvestigationSteps(scopeTx.tx, pariwarId, claimRow.claimCaseId);
      const holder = await holdsFindingKeyAt(request, request.nomineeNameCheckDistrict ?? null);
      const flag = steps.find((s) => s.step === 'flagged');
      const found = steps.some((s) => s.step !== 'flagged');
      const isFlagger = flag !== undefined && flag.actorId.toLowerCase() === actorId.toLowerCase();

      const views = await Promise.all(
        steps.map(async (s) => ({
          step: s.step,
          actor_display: s.actorDisplay,
          acted_at: s.actedAt.toISOString(),
          alive_confirmation: s.aliveConfirmation,
          note: holder ? await readNote(deps, request, s.noteCiphertext, scopeTx.pariwarId, claimCaseId) : ({ state: 'withheld' } as const),
        })),
      );
      if (holder) {
        // Decrypted Tier-1 notes: ⛔ cached by a browser or a proxy (the sibling decrypting reads set it too — RB7).
        void reply.header('cache-control', 'no-store');
      }
      if (holder && steps.length > 0) {
        emitAuditBestEffort(deps, request, 'admin_claim.fraud_notes_read', {
          actorId,
          pariwarId: scopeTx.pariwarId,
          resourceLocator: locator(claimCaseId),
          context: { claim_case_id: claimCaseId.toLowerCase(), step_count: steps.length },
        });
      }
      return {
        claim_case_id: String(claimRow.claimCaseId).toLowerCase(),
        claim_state: claimRow.currentState,
        steps: views,
        viewer: { can_record_finding: holder && flag !== undefined && !found && !isFlagger, is_flagger: isFlagger },
      };
    },

    /** (e) GET — the District Admin's work-list: flagged claims with ⛔ finding, each inside the caller's districts. */
    async getOpenInvestigations(request: FastifyRequest): Promise<OpenFraudInvestigationsResponse> {
      const { scopeTx, actorId, pariwarId } = scopeOf(request);
      const grants = request.scopeGrants ?? (await loadActorGrants(scopeTx, actorId));
      const geoTree = geoTreeResolverForRequest(request);
      const limit = (request.query as { limit?: number } | undefined)?.limit;
      const rows = await claimDomain.listOpenFraudInvestigations(scopeTx.tx, pariwarId, {
        ...(limit !== undefined ? { limit } : {}),
        // ⭐ The per-claim gate's OWN predicate, per row, BEFORE the page limit (the correction queue's shape); a row
        // whose district cannot be resolved (`null`) is DROPPED — ⛔ shown.
        isVisible: (row) =>
          rbac.hasPermission(grants, FRAUD_FINDING_KEY, { dimension: 'district', value: row.district, pariwarId: scopeTx.pariwarId }, { resolver: geoTree }),
      });
      return {
        items: rows.map((r) => ({
          claim_case_id: String(r.claimCaseId).toLowerCase(),
          claim_state: r.currentState,
          claim_filed_at: r.claimFiledAt.toISOString(),
          flagged_at: r.flaggedAt.toISOString(),
        })),
      };
    },
  };
}
