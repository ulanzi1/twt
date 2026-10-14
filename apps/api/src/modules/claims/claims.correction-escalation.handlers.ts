// The correction CLOSURE — the Super Admin's review and decision, and the directee's inbox (Story 6.19c; AC14, AC17, D18).
//
//   · getEscalations      — key (5) `claim.review_escalated_closure`: every HELD claim of the Pariwar (both origins).
//   · getEscalation       — key (5): ONE held claim for the decision surface — both admins' notes (a declined closure) or
//                           the mark history (a staff case), the directions, the name check's RECORDED state and which
//                           writer an approve would run (`-273` §8). Every note decrypted AFTER authorization, each read
//                           degrading to `unreadable` alone (⛔ never `''`).
//   · placeUnderReview    — key (5), with a note (`-256` cl.1).
//   · recordDirection     — key (5), to a NAMED Pariwar Admin or District Admin who must HOLD that role in this Pariwar
//                           (D18); `restart_family_reminders` opens a `direction` run (409 `direction.mark_not_family`
//                           unless the mark is `family`). A direction asks for a RECORD — ⛔ never a decision.
//   · decideEscalation    — key (4) `claim.decide_escalated_closure`: close / refuse / approve, each with a REQUIRED note
//                           and a closure-scoped reason (`-273` §10); a refusal also carries the trustee reason code. The
//                           note is encrypted TWICE: under the closure class (the closures row) and the trustee class (the
//                           decision row's rationale — the vote's shape, T10).
//   · getDirectionInbox   — `claim.view_nominee_name_check`: the caller's own UNANSWERED directions (identity, ⛔ a key).
//   · respondToDirection  — `claim.view_nominee_name_check` at the claim's district + the identity check (the domain:
//                           the actor IS `directed_to_actor`, else 403 `direction.not_directee`).
// Keys (4) and (5) are `super_admin` ONLY — a `pariwar_admin` is refused at the gate (403). Every audit line names the
// claim (`claim:<lower-case uuid>`) and carries ⛔ no note, ⛔ no direction text and ⛔ no response.

import type {
  ClosureDecisionClaimResponse,
  ClosureDirectionDto,
  ClosureDirectionRequest,
  ClosureDirectionResponse,
  ClosureDirectionResponseRequest,
  ClosureReviewRequest,
  CorrectionClosureDto,
  DirectionInboxResponse,
  EscalatedClosureDecisionRequest,
  EscalatedClosureDetailResponse,
  EscalatedClosuresResponse,
  NoteWithheldReason,
  StaffNoteDto,
} from '@twt/contracts';
import { claim, ids, schema } from '@twt/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { NotFoundError, UnauthorizedError } from '../../http-errors.js';
import { emitAuthAudit } from '../auth/shared/audit.js';
import { loadActorGrants } from '../rbac/index.js';
import { contextOf } from './claims.correction-chase.handlers.js';
import { actorDisplayOf, auditClaim, closureRefusalError, inWriteTx, translateClosureError } from './claims.correction-closure.handlers.js';
import { CLAIM_CORRECTION_MARK_FIELD_CLASS } from './correction-chase-crypto.js';
import {
  CLAIM_CORRECTION_CLOSURE_FIELD_CLASS,
  CLAIM_CORRECTION_DIRECTION_FIELD_CLASS,
  decryptStaffNote,
  encryptClosureField,
  type ClosureFieldClass,
} from './correction-closure-crypto.js';
import { type HiddenClaims, readClaimsHiddenFromReader, withheldNote, withheldReasonOn, withheldUnlessAuthor } from './hidden-reader-notes.js';
import { toClosureDto } from './correction-closure-dto.js';
import { encryptTrusteeRationale } from './state-trustee-decision-crypto.js';
import {
  UNAVAILABLE_APPROVAL_WARNINGS,
  approvedWarningAudit,
  toApprovalWarningsSummary,
  toReasonOptionsDto,
  underSavepoint,
} from './later-approval-warnings.js';
import { closeClaimsAfterFinalStop, readFinallyApprovedElsewhereDtos } from './close-claims-of-paid-death.js';

export const ESCALATION_DECIDE_KEY = 'claim.decide_escalated_closure';
export const ESCALATION_REVIEW_KEY = 'claim.review_escalated_closure';

export function createCorrectionEscalationHandlers(deps: AppDeps) {
  /** Decrypt one stored note; a fault degrades THAT note to `unreadable` (logged — ids only). */
  const note = (request: FastifyRequest, pariwarId: string, claimCaseId: string, fieldClass: ClosureFieldClass, field: string) =>
    (ciphertext: string | null) =>
      decryptStaffNote(ciphertext, pariwarId, fieldClass, deps.encryption, (err) =>
        request.log.warn(
          { err: err instanceof Error ? err.name : 'unknown', claimCaseId, field },
          'correction-escalation: a note could not be decrypted',
        ),
      );

  async function directionDto(
    request: FastifyRequest,
    pariwarId: string,
    d: schema.ClaimCorrectionDirectionRow,
    /**
     * Story 6.27b code review round 2 (V6 / X6 / X2) — why the text / the response is withheld from this reader (`null` ⇔
     * ⛔ withheld): on the escalation DETAIL both are (V6 — even the reader's own); in the directee's inbox and the
     * response echo each is unless the reader wrote it (X6). A withheld one is `{ state: 'withheld', reason }`, ⛔ decrypted.
     */
    // Y5 (b) — REQUIRED, ⛔ defaulted (a default of "not withheld" would fail OPEN — the S13 class).
    withheld: { readonly text: NoteWithheldReason | null; readonly response: NoteWithheldReason | null },
  ): Promise<ClosureDirectionDto> {
    const read = note(request, pariwarId, d.claimCaseId, CLAIM_CORRECTION_DIRECTION_FIELD_CLASS, 'direction');
    return {
      direction_id: d.directionId,
      directed_to_actor: d.directedToActor,
      directed_to_role: d.directedToRole,
      kind: d.kind,
      text: withheld.text !== null ? withheldNote(withheld.text) : (await read(d.textCiphertext))!,
      created_by: d.createdByDisplay,
      created_at: d.createdAt.toISOString(),
      opened_run: d.openedRunId !== null,
      // Y3 — withheld BEFORE the presence test (an unanswered direction reads the same for a hidden reader).
      response:
        withheld.response !== null
          ? withheldNote(withheld.response)
          : d.responseCiphertext === null
            ? null
            : await read(d.responseCiphertext),
      responded_at: d.respondedAt?.toISOString() ?? null,
      responded_by: d.respondedByDisplay ?? null,
    };
  }

  function listContext(request: FastifyRequest): { actorId: string; pariwarIdStr: string; pariwarId: ids.PariwarId } {
    const scopeTx = request.scopeTx;
    const actorId = request.requestContext.actorId;
    if (!scopeTx || !actorId) throw new UnauthorizedError('Authentication required', 'auth.session_required');
    return { actorId, pariwarIdStr: scopeTx.pariwarId, pariwarId: ids.pariwarId(scopeTx.pariwarId) };
  }

  return {
    /** GET …/admin/correction/escalations — key (5). */
    async getEscalations(request: FastifyRequest): Promise<EscalatedClosuresResponse> {
      const ctx = listContext(request);
      const limit = (request.query as { limit?: number } | undefined)?.limit;
      const rows = await claim.listEscalatedClosures(request.scopeTx!.tx, ctx.pariwarId, { limit });
      emitAuthAudit(deps, request, 'admin_claim_correction.escalations_read', {
        actorId: ctx.actorId,
        pariwarId: ctx.pariwarIdStr,
        context: { visible_count: rows.length },
      });
      return {
        items: rows.map((r) => ({
          closure_id: r.closureId,
          claim_case_id: r.claimCaseId,
          deceased_member_id: r.deceasedMemberId,
          short_reference: r.shortReference,
          origin: r.origin,
          state: r.state,
          escalated_at: r.escalatedAt.toISOString(),
          under_review_since: r.underReviewSince?.toISOString() ?? null,
          open_directions: r.openDirections,
        })),
      };
    },

    /** GET …/admin/claims/:claimCaseId/correction/escalation — key (5): the decision surface. */
    async getEscalation(request: FastifyRequest, reply: FastifyReply): Promise<EscalatedClosureDetailResponse> {
      const ctx = contextOf(request);
      void reply.header('cache-control', 'no-store');
      const detail = await claim.readEscalatedClosureDetail(request.scopeTx!.tx, ctx.pariwarId, ctx.claimCaseId);
      if (detail === null) throw closureRefusalError('not_escalated');
      const row = detail.closure;
      const scopeTx = request.scopeTx!;
      // ⭐ Story 6.27b (PM25 (c), BD4; Task 4.3) — is the neighbours' section hidden from THIS viewer (their own ground visit
      // pending)? Code review round 2 (V6 — AC7's D1 B + V1 A) — read FIRST and under its OWN SAVEPOINT (it used to sit in
      // the warnings' below): every staff note on this detail — the request, the Pariwar Admin's decision, the review, each
      // mark's and each direction's — is WITHHELD from a hidden reader (X2 — `{ state: 'withheld', reason }`, ⛔ never
      // decrypted; a `null` field still means ⛔ no note). `null` ⇔ the read FAILED ⇒ withheld (`check_failed`), and the
      // warnings stay unavailable (as before).
      const hidden = await readClaimsHiddenFromReader(scopeTx.client, scopeTx.tx, ctx.pariwarIdStr, [ctx.claimCaseIdStr], ctx.actorId, {
        label: 'escalation_own_visit_pending',
        log: request.log,
      });
      const withheld = withheldReasonOn(hidden, ctx.claimCaseIdStr);
      const orWithheld =
        (read: (ct: string | null) => Promise<StaffNoteDto | null>) =>
        async (ct: string | null): Promise<StaffNoteDto | null> =>
          withheld !== null ? withheldNote(withheld) : ct === null ? null : read(ct); // Y3 — a hidden reader's optional note reads the same, present or ⛔
      const closureNote = orWithheld(note(request, ctx.pariwarIdStr, ctx.claimCaseIdStr, CLAIM_CORRECTION_CLOSURE_FIELD_CLASS, 'closure'));
      const markNote = orWithheld(note(request, ctx.pariwarIdStr, ctx.claimCaseIdStr, CLAIM_CORRECTION_MARK_FIELD_CLASS, 'mark'));
      // ⭐ Story 6.28 (OP14 (b)) — another claim of the death past its final vote / paid (ONE statement, SAVEPOINT-guarded).
      const finallyApprovedElsewhere = (
        await readFinallyApprovedElsewhereDtos(scopeTx.client, scopeTx.tx, request.log, ctx.pariwarId, [ctx.claimCaseIdStr])
      )(ctx.claimCaseIdStr);
      const response: EscalatedClosureDetailResponse = {
        closure: toClosureDto(row, null),
        deceased_member_id: detail.deceasedMemberId,
        short_reference: detail.shortReference,
        claim_state: detail.currentState,
        request_note: await closureNote(row.requestNoteCiphertext ?? null),
        requested_by: row.requestedByDisplay ?? null,
        pariwar_decision_note: await closureNote(row.pariwarDecisionNoteCiphertext ?? null),
        pariwar_decided_by: row.pariwarDecidedByDisplay ?? null,
        review_note: await closureNote(row.underReviewNoteCiphertext ?? null),
        marks: await Promise.all(
          detail.marks.map(async (m) => ({
            must_act: m.mustAct,
            is_return_mark: m.isReturnMark,
            set_at: m.setAt.toISOString(),
            set_by: m.setByDisplay,
            set_by_role: m.setByRole,
            note: await markNote(m.noteCiphertext),
          })),
        ),
        directions: await Promise.all(detail.directions.map((d) => directionDto(request, ctx.pariwarIdStr, d, { text: withheld, response: withheld }))),
        resubmitted: detail.resubmitted,
        family_part_done: detail.familyPartDone,
        name_check_state: detail.nameCheckState,
        // `-273` §8 — the SAME rule the writer decides under its locks; shown so the Super Admin knows what an approve asks.
        approve_path: row.origin === 'declined_closure' && !detail.resubmitted ? 'name_waived_251' : 'full_gate',
        approval_warnings: UNAVAILABLE_APPROVAL_WARNINGS,
        finally_approved_elsewhere: finallyApprovedElsewhere,
        reason_options: [],
      };
      // ⭐ Story 6.23b (EA7; RD7, RD8; Trap 15) — the nominee-change warnings for this ONE claim, attached HERE (the domain
      // detail and its shape pin stay unchanged), LAST and under a raw SAVEPOINT: a throw fails CLOSED (`available: false`
      // — the approve control disabled in its own words; close and refuse untouched), ⛔ never "no warnings". The wait is
      // judged for the viewing Super Admin (`-279` A1). ⛔ Not the POST's pre-check read (`decideEscalation` — `-274` 1a).
      // ⭐ Story 6.27b (PM25 (c), BD4; Task 4.3) — filtered by the hide read above (a FAILED hide read ⇒
      // `UNAVAILABLE_APPROVAL_WARNINGS`, ⛔ no kind revealed — as before).
      const warned =
        hidden === null
          ? null
          : await underSavepoint(scopeTx.client, 'escalation_approval_warnings', async () => ({
              w: await claim.readClaimApprovalWarnings(scopeTx.tx, ctx.pariwarId, ctx.claimCaseId),
              ownVisitPending: hidden.has(ctx.claimCaseIdStr.toLowerCase()),
            })).catch((err: unknown) => {
              request.log.warn(
                { err: err instanceof Error ? err.name : 'unknown', claimCaseId: ctx.claimCaseIdStr },
                'escalation detail: nominee-change warnings unavailable; failing closed to cannot-approve',
              );
              return null;
            });
      if (warned !== null) {
        response.approval_warnings = toApprovalWarningsSummary(warned.w, [ctx.actorId], { ownVisitPending: warned.ownVisitPending });
        response.reason_options = toReasonOptionsDto(warned.w.reasonOptions);
      }
      auditClaim(deps, request, ctx, 'admin_claim_correction.escalation_read', { closure_id: row.closureId, origin: row.origin });
      return response;
    },

    /** POST …/correction/escalation/review — key (5). */
    async placeUnderReview(request: FastifyRequest, reply: FastifyReply): Promise<CorrectionClosureDto> {
      const ctx = contextOf(request);
      const body = request.body as ClosureReviewRequest;
      const actorDisplay = await actorDisplayOf(deps, ctx.actorId);
      const noteCiphertext = await encryptClosureField(body.note, ctx.pariwarIdStr, CLAIM_CORRECTION_CLOSURE_FIELD_CLASS, deps.encryption);
      let row: schema.ClaimCorrectionClosureRow;
      try {
        row = await inWriteTx(deps, ctx.pariwarIdStr, (client) =>
          claim.placeClosureUnderReview(client, {
            pariwarId: ctx.pariwarId,
            claimCaseId: ctx.claimCaseId,
            actorId: ctx.actorId,
            actorDisplay,
            now: deps.clock(),
            noteCiphertext,
          }),
        );
      } catch (err) {
        translateClosureError(err);
      }
      auditClaim(deps, request, ctx, 'admin_claim_correction.closure_under_review', { closure_id: row!.closureId });
      void reply.status(201);
      return toClosureDto(row!, null);
    },

    /** POST …/correction/escalation/directions — key (5). */
    async recordDirection(request: FastifyRequest, reply: FastifyReply): Promise<ClosureDirectionResponse> {
      const ctx = contextOf(request);
      const body = request.body as ClosureDirectionRequest;
      const actorDisplay = await actorDisplayOf(deps, ctx.actorId);
      // Code review (2026-10-03): lower-cased ONCE here — `z.string().uuid()` accepts upper case, the grant check below
      // compares a `uuid` column (case-blind), but `directed_to_actor` is stored as `text` and the inbox / respond
      // checks compare it to the lower-case session id: an upper-case id would make a direction ⛔ no one can see.
      const directee = body.directed_to_actor.toLowerCase();
      // D18 — the directee must HOLD the named role in THIS Pariwar (a direction to a stranger is ⛔ a record of anything).
      const directeeGrants = await loadActorGrants(request.scopeTx!, directee);
      if (!directeeGrants.some((g) => g.pariwarId === ctx.pariwarIdStr && g.role === body.directed_to_role)) {
        throw closureRefusalError('directee_role_invalid');
      }
      const textCiphertext = await encryptClosureField(body.text, ctx.pariwarIdStr, CLAIM_CORRECTION_DIRECTION_FIELD_CLASS, deps.encryption);
      let result: claim.ClosureDirectionResult;
      try {
        result = await inWriteTx(deps, ctx.pariwarIdStr, (client) =>
          claim.recordClosureDirection(client, {
            pariwarId: ctx.pariwarId,
            claimCaseId: ctx.claimCaseId,
            actorId: ctx.actorId,
            actorDisplay,
            now: deps.clock(),
            directedToActor: directee,
            directedToRole: body.directed_to_role,
            kind: body.kind,
            textCiphertext,
          }),
        );
      } catch (err) {
        translateClosureError(err);
      }
      auditClaim(deps, request, ctx, 'admin_claim_correction.direction_recorded', {
        direction_id: result!.direction.directionId,
        directed_to_actor: directee,
        directed_to_role: body.directed_to_role,
        kind: body.kind,
        opened_run_id: result!.openedRunId,
      });
      void reply.status(201);
      // Y5 (b) — the creation echo follows the inbox's rule too (the text is the creator's own ⇒ shown; ⛔ response yet).
      const hidden = await readClaimsHiddenFromReader(request.scopeTx!.client, request.scopeTx!.tx, ctx.pariwarIdStr, [ctx.claimCaseIdStr], ctx.actorId, {
        label: 'direction_created_own_visit_pending',
        log: request.log,
      });
      return {
        claim_case_id: ctx.claimCaseIdStr,
        direction: await directionDto(request, ctx.pariwarIdStr, result!.direction, directionWithheld(hidden, result!.direction, ctx.actorId)),
      };
    },

    /** POST …/correction/escalation/decision — key (4): close / refuse / approve. */
    async decideEscalation(request: FastifyRequest, reply: FastifyReply): Promise<ClosureDecisionClaimResponse> {
      const ctx = contextOf(request);
      const body = request.body as EscalatedClosureDecisionRequest;
      const actorDisplay = await actorDisplayOf(deps, ctx.actorId);
      // `-274` 1a — a staff-origin close is refused FIRST, before any KMS work (the writer re-checks under its locks).
      const detail = await claim.readEscalatedClosureDetail(request.scopeTx!.tx, ctx.pariwarId, ctx.claimCaseId);
      if (detail === null) throw closureRefusalError('not_escalated');
      if (body.decision === 'close' && detail.closure.origin === 'staff_case') throw closureRefusalError('staff_case_origin');
      const noteCiphertext = await encryptClosureField(body.note, ctx.pariwarIdStr, CLAIM_CORRECTION_CLOSURE_FIELD_CLASS, deps.encryption);
      const decisionRationaleCiphertext = await encryptTrusteeRationale(body.note.trim(), ctx.pariwarIdStr, deps.encryption);
      const base = {
        pariwarId: ctx.pariwarId,
        claimCaseId: ctx.claimCaseId,
        actorId: ctx.actorId,
        actorDisplay,
        now: deps.clock(),
        reason: body.reason,
        noteCiphertext,
        decisionRationaleCiphertext,
      };
      const input: claim.EscalatedClosureDecisionInput =
        body.decision === 'close'
          ? { ...base, decision: 'close', crypto: deps.encryption }
          : body.decision === 'refuse'
            ? { ...base, decision: 'refuse', refusalReasonCode: body.refusal_reason_code! }
            : // ⭐ Story 6.23b (EA6a; Trap 5) — the warning reason rides its OWN field (⛔ a closure reason).
              { ...base, decision: 'approve', warningReasonCode: body.warning_reason_code ?? null };
      let result: claim.EscalatedClosureDecisionResult;
      try {
        result = await inWriteTx(deps, ctx.pariwarIdStr, (client) => claim.decideEscalatedClosure(client, input));
      } catch (err) {
        // ⭐ Story 6.28 H(iv) — `inWriteTx` has already closed the refused tx (Trap 14).
        await closeClaimsAfterFinalStop(deps, request.log, err, {
          pariwarId: ctx.pariwarId, claimCaseId: ctx.claimCaseId, actorId: ctx.actorId, site: 'closure.escalation_decision',
        });
        translateClosureError(err);
      }
      auditClaim(deps, request, ctx, 'admin_claim_correction.super_admin_decided', {
        closure_id: result!.closure.closureId,
        origin: result!.closure.origin,
        decision: body.decision,
        reason: body.reason,
        refusal_reason_code: body.refusal_reason_code ?? null,
        decision_id: result!.chain?.decisionId ?? null,
        denied_no_appeal: result!.chain?.deniedNoAppeal ?? false,
        name_check_waived: result!.nameCheckWaived,
        approval_name_check_state: result!.approvalNameCheckState,
        ended_run: result!.endedRun,
        // ⭐ Story 6.23b (EA9; RD15) — an APPROVE's warning kinds + the code sent.
        ...(body.decision === 'approve' ? approvedWarningAudit(result!.approvalWarningKinds, body.warning_reason_code ?? null) : {}),
      });
      void reply.status(201);
      return {
        claim_case_id: ctx.claimCaseIdStr,
        claim_state: result!.chain?.claimState ?? detail.currentState,
        // `-273` §7 — from the written row, through the ONE rule the reads use.
        closure: toClosureDto(result!.closure, claim.approvalNameHighlightOf(result!.closure)),
        decided_by: actorDisplay,
        decided_at: base.now.toISOString(),
      };
    },

    /** GET …/admin/correction/directions/mine — the caller's own unanswered directions (identity, ⛔ a key). */
    async getDirectionInbox(request: FastifyRequest): Promise<DirectionInboxResponse> {
      const ctx = listContext(request);
      const limit = (request.query as { limit?: number } | undefined)?.limit;
      const rows = await claim.listOpenDirectionsFor(request.scopeTx!.tx, ctx.pariwarId, ctx.actorId, { limit });
      // ⭐ Story 6.27b code review round 2 (X6 — AC7's X1 A) — a direction's text (and any response) is a staff note on its
      // claim: WITHHELD from a directee whose own ground visit there is pending, unless they wrote it themselves. ONE
      // set-based statement over the inbox's claims; a failed read withholds (`check_failed`).
      const scopeTx = request.scopeTx!;
      const hidden = await readClaimsHiddenFromReader(scopeTx.client, scopeTx.tx, ctx.pariwarIdStr, rows.map((r) => r.direction.claimCaseId), ctx.actorId, {
        label: 'direction_inbox_own_visit_pending',
        log: request.log,
      });
      const items = await Promise.all(
        rows.map(async (r) => ({
          claim_case_id: r.direction.claimCaseId,
          short_reference: r.shortReference,
          still_held: r.stillHeld,
          direction: await directionDto(request, ctx.pariwarIdStr, r.direction, directionWithheld(hidden, r.direction, ctx.actorId)),
        })),
      );
      emitAuthAudit(deps, request, 'admin_claim_correction.direction_inbox_read', {
        actorId: ctx.actorId,
        pariwarId: ctx.pariwarIdStr,
        context: { visible_count: items.length },
      });
      return { items };
    },

    /** POST …/correction/directions/:directionId/response — the named directee only. */
    async respondToDirection(request: FastifyRequest, reply: FastifyReply): Promise<ClosureDirectionResponse> {
      const ctx = contextOf(request);
      const directionId = (request.params as { directionId: string }).directionId.toLowerCase();
      const body = request.body as ClosureDirectionResponseRequest;
      const actorDisplay = await actorDisplayOf(deps, ctx.actorId);
      const responseCiphertext = await encryptClosureField(
        body.response,
        ctx.pariwarIdStr,
        CLAIM_CORRECTION_DIRECTION_FIELD_CLASS,
        deps.encryption,
      );
      let row: schema.ClaimCorrectionDirectionRow;
      try {
        row = await inWriteTx(deps, ctx.pariwarIdStr, (client) =>
          claim.respondToClosureDirection(client, {
            pariwarId: ctx.pariwarId,
            claimCaseId: ctx.claimCaseId,
            actorId: ctx.actorId,
            actorDisplay,
            now: deps.clock(),
            directionId,
            responseCiphertext,
          }),
        );
      } catch (err) {
        if (err instanceof claim.CorrectionClosureRefusedError && err.refusal === 'not_found') {
          throw new NotFoundError('Direction not found', 'direction.not_found');
        }
        translateClosureError(err);
      }
      auditClaim(deps, request, ctx, 'admin_claim_correction.direction_responded', { direction_id: directionId });
      void reply.status(201);
      // X6 — the echo follows the inbox's rule (the response is theirs; the text is withheld unless they wrote it).
      const hidden = await readClaimsHiddenFromReader(request.scopeTx!.client, request.scopeTx!.tx, ctx.pariwarIdStr, [ctx.claimCaseIdStr], ctx.actorId, {
        label: 'direction_response_own_visit_pending',
        log: request.log,
      });
      return { claim_case_id: ctx.claimCaseIdStr, direction: await directionDto(request, ctx.pariwarIdStr, row!, directionWithheld(hidden, row!, ctx.actorId)) };
    },
  };
}

/** X6 — a direction's text / response withheld from `readerActorId` (hidden on its claim) unless they wrote it. */
function directionWithheld(
  hidden: HiddenClaims,
  d: schema.ClaimCorrectionDirectionRow,
  readerActorId: string,
): { readonly text: NoteWithheldReason | null; readonly response: NoteWithheldReason | null } {
  const reason = withheldReasonOn(hidden, d.claimCaseId);
  return {
    text: withheldUnlessAuthor(reason, d.createdByActor, readerActorId),
    response: withheldUnlessAuthor(reason, d.respondedByActor ?? null, readerActorId),
  };
}
