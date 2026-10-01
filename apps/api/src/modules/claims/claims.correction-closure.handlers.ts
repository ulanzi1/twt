// The correction CLOSURE — the District Admin's and the Pariwar Admin's handlers (Story 6.19c; AC6, AC8c, AC9c, AC17).
//
//   · requestClosure           — key (2): the District Admin asks for a closure for no response, with a REQUIRED note.
//                                The read-only readiness runs FIRST (the SAME checks the writer runs, in AC6's order) —
//                                ⛔ KMS work for a 409; then the note is encrypted; then the writer re-checks under the
//                                trustee lock then the claim row lock.
//   · decideClosure            — key (3): the Pariwar Admin APPROVES (the D1 chain — the second refusal, ⛔ appealable —
//                                in ONE scope-tx) or DECLINES with a REQUIRED note (→ the Super Admin; the claim is HELD).
//   · getClosureQueue          — key (3): the pending requests and the live "no correction needed" records (D27).
//   · recordNoCorrectionNeeded — key (8): the District Admin's record (allowed while held — a record, `-273` §4).
//   · approveNoCorrectionNeeded / keepNoCorrectionNeeded — `cycle.freeze`: D27's NEW approve writer (refused while held
//                                — 409 `cycle_freeze.escalated`) and `-260` G2's keep, stating who must act.
//   · the CLOSURE LETTER (`-274` 2, key (1)): the letters owed, the posted letter, its delivery + screenshot, the
//                                address (step-up) and the screenshot's signed URL — the correction letter's shape, its
//                                own error-code prefix `closure_letter.*`.
// Every refusal is a stable code (`closure.<refusal>`; `direction.mark_not_family`; `cycle_freeze.escalated`) with the
// plain words AC8c asks for. Every audit line: `resourceLocator: 'claim:<lower-case uuid>'`, the SNAPSHOTTED display
// name on the record ([[project_admin_display_name_attribution]]), ⛔ never a note, a tracking number, an address or a
// screenshot. ⛔ No job calls any writer here (invariant 1) — these are the humans' acts.

import { randomUUID } from 'node:crypto';

import type {
  ChangeCorrectionMustActResponse,
  ClosureDecisionClaimResponse,
  ClosureLetterDto,
  ClosureLettersOwedResponse,
  CorrectionClosureDecisionRequest,
  CorrectionClosureDto,
  ClosureLetterAddressResponse,
  ClosureLetterScreenshotResponse,
  NoCorrectionNeededKeepRequest,
  NoCorrectionNeededRequest,
  NoCorrectionNeededResponse,
  PariwarClosureQueueResponse,
  RecordClosureLetterRequest,
  RequestCorrectionClosureRequest,
} from '@twt/contracts';
import { claim, cycleCalendar, ids, member as memberDomain, rbac, schema } from '@twt/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AuthAuditEventType } from '../../audit/audit-sink.js';
import type { AppDeps } from '../../context.js';
import {
  AdminDisplayNameMissingError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ServiceUnavailableError,
  UnauthorizedError,
} from '../../http-errors.js';
import { getDisplayName } from '../auth/admin/admin-auth.repo.js';
import { emitAuthAudit } from '../auth/shared/audit.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';
import { geoTreeResolverForRequest, loadActorGrants } from '../rbac/index.js';
import { decryptClaimContactField } from './claim-contact-crypto.js';
import {
  CORRECTION_LETTER_KEY,
  CORRECTION_SCREENSHOT_URL_TTL_SECONDS,
  contextOf,
  readLetterScreenshotUpload,
  refuseFutureDate,
  type ChaseContext,
} from './claims.correction-chase.handlers.js';
import { encryptCorrectionMarkNote } from './correction-chase-crypto.js';
import {
  CLAIM_CLOSURE_LETTER_FIELD_CLASS,
  CLAIM_CORRECTION_CLOSURE_FIELD_CLASS,
  decryptStaffNote,
  encryptClosureField,
} from './correction-closure-crypto.js';
import { toClosureDto } from './correction-closure-dto.js';
import { encryptTrusteeRationale } from './state-trustee-decision-crypto.js';

export const CLOSURE_REQUEST_KEY = 'claim.request_correction_closure';
export const CLOSURE_DECIDE_KEY = 'claim.decide_correction_closure';
export const NO_CORRECTION_NEEDED_KEY = 'claim.record_no_correction_needed';
/** D27's approve and `-260` G2's keep are the Pariwar Admin's final-approval authority — `cycle.freeze`. */
export const CYCLE_FREEZE_KEY = 'cycle.freeze';
export const CLOSURE_LETTER_ADDRESS_STEP_UP_CONTEXT = 'closure_letter_address';

/**
 * The D1 decision row's rationale — a FIXED text (⛔ no new reason code: the row carries `other`), encrypted under the
 * trustee field class as every decision row's is. ⛔ Never the District Admin's note.
 */
export const CLOSURE_DECISION_RATIONALE =
  'Closed for no response: the family was reached and did not send the corrected details within 90 days.';
/** D27's approval row's rationale — a FIXED text. */
export const NO_CORRECTION_NEEDED_DECISION_RATIONALE =
  'Approved with no correction needed: the District Admin recorded it and a current passing name check followed.';

// ── The refusals ──────────────────────────────────────────────────────────────────────────────────────────────

/**
 * A closure refusal as a stable 4xx code, in plain words (AC8c). ⭐ Exhaustive over `CorrectionClosureRefusal` — a
 * compile error, ⛔ not a silent default, when the domain adds one.
 */
export function closureRefusalError(refusal: claim.CorrectionClosureRefusal, notReached?: claim.NotReachedDetail): Error {
  const c = (message: string, details?: unknown) => new ConflictError(message, `closure.${refusal}`, details);
  switch (refusal) {
    case 'no_live_return':
      return c('This claim is not waiting for a correction — there is nothing to close');
    case 'escalated':
      return c('This claim is already with the Super Admin');
    case 'request_pending':
      return c('A closure request is already waiting for the Pariwar Admin');
    case 'not_family_action':
      return c('Staff must act on this claim — only the family’s silence can close it');
    case 'too_early':
      return c('Too early — the family has not yet had 90 days since the reminders began');
    case 'claim_routed_to_r9':
      return c('This claim was routed to R9 — it cannot be closed here');
    case 'claim_corrected':
      return c('The family has sent corrected details — the claim cannot be closed for no response');
    case 'not_reached':
      // D22 — a count and the roles only, ⛔ never a person.
      return c(
        'Not everyone has been reached yet — a closure needs every person reached by a delivered text or letter',
        notReached === undefined ? undefined : { count: notReached.count, roles: [...notReached.roles] },
      );
    case 'no_pending_request':
      return c('There is no closure request waiting for a decision');
    case 'request_lapsed':
      return c('This closure request no longer stands — who must act changed, or a new reminder run began, after it was made');
    case 'not_escalated':
      return c('This claim is not with the Super Admin');
    case 'already_under_review':
      return c('This claim is already under review');
    case 'staff_case_origin':
      return c('This claim reached the Super Admin as a staff case — it cannot be closed for no response');
    case 'reason_invalid':
      return new BadRequestError('The reason is not one for this decision', 'closure.reason_invalid');
    case 'refusal_reason_invalid':
      return new BadRequestError('The refusal reason code is not valid for this decision', 'closure.refusal_reason_invalid');
    case 'direction_mark_not_family':
      // AC14 — 6.19b's `CorrectionDirectionRunRefusedError` (`-267` §5a) on its own code.
      return new ConflictError(
        'Family reminders can restart only while the family must act — direct a change of who must act first',
        'direction.mark_not_family',
      );
    case 'directee_role_invalid':
      return new ConflictError('The named admin does not hold that role in this Pariwar', 'direction.directee_role_invalid');
    case 'not_found':
      return new NotFoundError('Not found', 'closure.not_found');
    case 'not_directee':
      return new ForbiddenError('Only the admin this direction names can respond to it', 'direction.not_directee');
    case 'direction_answered':
      return new ConflictError('This direction already has a response', 'direction.answered');
    case 'claim_not_decidable':
      return c('This claim cannot be decided in its current state');
    case 'return_not_live':
      return c('This claim’s return changed while you were deciding — reload and try again');
    case 'no_record':
      return c('There is no current “no correction needed” record on this claim');
    case 'check_required':
      return c('A current passing name check recorded after the “no correction needed” record is required first');
    case 'cycle_freeze_escalated':
      // `-273` §4 — while held only the Super Admin decides.
      return new ConflictError('This claim is with the Super Admin — only the Super Admin can decide it now', 'cycle_freeze.escalated');
    default: {
      const unreachable: never = refusal;
      return new ConflictError('The closure act was refused', `closure.${String(unreachable)}`);
    }
  }
}

/**
 * Every typed error a closing / approving act may throw, as its 4xx: the closure refusals, D14, and the approval gate's
 * waits (⛔ never a denial — the claim waits). Rethrows anything else.
 */
/**
 * A person's CURRENT number could not be hashed just now (an unreadable envelope, a KMS blip): D22's reach cannot be
 * judged, so the act FAILS CLOSED — a RETRYABLE 503, ⛔ a 409 (nothing about the claim is wrong). 6.19b's letter shape.
 */
function numberUnverifiedError(): ServiceUnavailableError {
  return new ServiceUnavailableError(
    "A family member's current number could not be checked just now — try again in a minute",
    'closure.number_unverified',
  );
}

export function translateClosureError(err: unknown): never {
  if (err instanceof claim.CorrectionClosureRefusedError) throw closureRefusalError(err.refusal, err.notReached);
  if (err instanceof claim.CorrectionNumberUnverifiedError) throw numberUnverifiedError();
  if (err instanceof claim.ClaimContactRequiredError) {
    throw new ConflictError(
      'This claim needs the family’s contact details and their agreement to be contacted first — the helpline can add them',
      'closure.claim_contact_required',
      { reason: err.reason },
    );
  }
  if (err instanceof claim.DeathCertificateAcceptanceRequiredError) {
    throw new ConflictError(
      'This claim needs an accepted death certificate with a clear date before it can be approved',
      'closure.death_certificate_acceptance_required',
      { reason: err.reason },
    );
  }
  if (err instanceof claim.NomineeBankAccountsRequiredError) {
    throw new ConflictError('This claim needs both bank accounts before it can be approved', 'closure.bank_details_required', {
      live_account_count: err.liveAccountCount,
    });
  }
  if (err instanceof claim.NomineeDeterminationRequiredError) {
    throw new ConflictError(
      'This claim needs the District Admin to determine which nominee declaration was in force at the death',
      'closure.nominee_determination_required',
      { reason: err.reason },
    );
  }
  if (err instanceof claim.NomineeNameCheckRequiredError) {
    throw new ConflictError('This claim needs a current passing nominee name check before it can be approved', 'closure.nominee_name_check_required', {
      reason: err.reason,
    });
  }
  if (err instanceof claim.CorrectionMarkNoLiveReturnError) {
    throw new ConflictError('This claim is not waiting for a correction — there is nothing to mark', 'closure.no_live_return');
  }
  if (err instanceof claim.ClaimStreamConcurrencyError) {
    throw new ConflictError('This claim was updated at the same time — reload and try again', 'closure.stream_conflict');
  }
  throw err;
}

/** The closure letter's refusals (`-274` 2) — `closure_letter.<code>`, ⭐ exhaustive. */
export function translateClosureLetterError(err: unknown): never {
  if (err instanceof claim.ClosureLetterRefusedError) {
    switch (err.refusal) {
      case 'not_found':
        throw new NotFoundError('Letter not found', 'closure_letter.not_found');
      case 'no_closure':
        throw new ConflictError('This claim was not closed for no response — no closure letter is owed', 'closure_letter.no_closure');
      case 'not_owed':
        throw new ConflictError('No closure letter is owed to this person — they were told by text', 'closure_letter.not_owed');
      case 'address_missing':
        throw new ConflictError("This person's postal address is not on the claim's contact record", 'closure_letter.address_missing');
      case 'agreement_not_live':
        throw new ConflictError("The family's agreement to be contacted is not in force", 'closure_letter.agreement_not_live');
      case 'already_recorded':
        throw new ConflictError('The closure letter for this person is already recorded — only one is sent', 'closure_letter.already_recorded');
      case 'posted_before_closure':
        throw new ConflictError('The posting date is before the claim was closed', 'closure_letter.posted_before_closure');
      case 'already_delivered':
        throw new ConflictError("This letter's delivery is already recorded", 'closure_letter.already_delivered');
      case 'delivered_before_posted':
        throw new BadRequestError('The delivery date is before the posting date', 'closure_letter.delivered_before_posted');
      default: {
        const unreachable: never = err.refusal;
        throw new ConflictError('The closure letter cannot be recorded', `closure_letter.${String(unreachable)}`);
      }
    }
  }
  throw err;
}

// ── Small shared helpers ─────────────────────────────────────────────────────────────────────────────────────

/** The actor's snapshotted display name — ⛔ a missing one blocks the act ([[project_admin_display_name_attribution]]). */
export async function actorDisplayOf(deps: AppDeps, actorId: string): Promise<string> {
  const name = await getDisplayName(deps.pool, actorId);
  if (name === null || name.trim() === '') throw new AdminDisplayNameMissingError(actorId);
  return name;
}

export function auditClaim(
  deps: AppDeps,
  request: FastifyRequest,
  ctx: Pick<ChaseContext, 'actorId' | 'pariwarId' | 'claimCaseIdStr'>,
  type: AuthAuditEventType,
  context: Record<string, unknown>,
): void {
  emitAuthAudit(deps, request, type, {
    actorId: ctx.actorId,
    pariwarId: ctx.pariwarId,
    resourceLocator: `claim:${ctx.claimCaseIdStr}`,
    context: { claim_case_id: ctx.claimCaseIdStr, ...context },
  });
}

/**
 * The role the actor holds `key` under at the gate's target — `set_by_role` on a mark write. The route's own gate
 * already required the key, so ⛔ no matching role (or one outside `CORRECTION_MARK_ROLES`) is a programming error.
 */
async function markRoleOf(
  request: FastifyRequest,
  ctx: ChaseContext,
  key: string,
  target: { readonly dimension: 'district' | 'pariwar'; readonly value: string | null },
): Promise<schema.CorrectionMarkRole> {
  const grants = request.scopeGrants ?? (await loadActorGrants(request.scopeTx!, ctx.actorId));
  const role = rbac.matchingGrantRole(
    grants,
    key,
    { dimension: target.dimension, value: target.value, pariwarId: ctx.pariwarIdStr },
    { resolver: geoTreeResolverForRequest(request) },
  );
  if (role === null || !(schema.CORRECTION_MARK_ROLES as readonly string[]).includes(role)) {
    throw new Error(`[correction-closure] no matching mark role resolved for ${key} (got ${String(role)})`);
  }
  return role as schema.CorrectionMarkRole;
}

/** Run `fn` in its OWN scope tx (a WRITE), committing only when it returns. */
export async function inWriteTx<T>(deps: AppDeps, pariwarIdStr: string, fn: (client: Awaited<ReturnType<typeof openScopeTx>>['client']) => Promise<T>): Promise<T> {
  const scopeTx = await openScopeTx(deps, pariwarIdStr);
  let ok = false;
  try {
    const out = await fn(scopeTx.client);
    ok = true;
    return out;
  } finally {
    await closeScopeTx(scopeTx, ok);
  }
}

function closureLetterDto(
  row: { letterId: string; postedOn: string; deliveredOn: string | null; screenshotStorageKey: string | null },
  today: string,
): Omit<ClosureLetterDto, 'person_key'> {
  return {
    letter_id: row.letterId,
    posted_on: row.postedOn,
    delivered_on: row.deliveredOn ?? null,
    overdue: claim.closureLetterOverdue(row.postedOn, row.deliveredOn ?? null, today as cycleCalendar.CalendarDateString),
    has_screenshot: row.screenshotStorageKey !== null,
  };
}

/** `?limit=` on a list route — bounded by the route's schema; the domain read clamps again. */
function limitOf(request: FastifyRequest): number | undefined {
  return (request.query as { limit?: number } | undefined)?.limit;
}

export function createCorrectionClosureHandlers(deps: AppDeps) {
  const today = (): string => cycleCalendar.istDateOf(deps.clock());
  const logDecryptFault = (request: FastifyRequest, claimCaseId: string, field: string) => (err: unknown) =>
    request.log.warn({ err: err instanceof Error ? err.name : 'unknown', claimCaseId, field }, 'correction-closure: a note could not be decrypted');

  return {
    // ── (2) THE REQUEST — the District Admin ──────────────────────────────────────────────────────────────────

    /** POST …/correction/closure/request — key (2). */
    async requestClosure(request: FastifyRequest, reply: FastifyReply): Promise<CorrectionClosureDto> {
      const ctx = contextOf(request);
      const body = request.body as RequestCorrectionClosureRequest;
      const actorDisplay = await actorDisplayOf(deps, ctx.actorId);
      // ⭐ The refusals FIRST, read-only, through the SAME checks the writer runs — ⛔ KMS work for a 409.
      const readiness = await claim.readClosureReadiness(request.scopeTx!.tx, ctx.pariwarId, ctx.claimCaseId, deps.clock(), {
        crypto: deps.encryption,
      });
      if (readiness.blocker === 'number_unverified') throw numberUnverifiedError();
      if (readiness.blocker === 'claim_contact_required') {
        throw new ConflictError(
          'This claim needs the family’s contact details and their agreement to be contacted first — the helpline can add them',
          'closure.claim_contact_required',
        );
      }
      if (readiness.blocker !== null) throw closureRefusalError(readiness.blocker, readiness.notReached ?? undefined);
      const noteCiphertext = await encryptClosureField(body.note, ctx.pariwarIdStr, CLAIM_CORRECTION_CLOSURE_FIELD_CLASS, deps.encryption);
      let row: schema.ClaimCorrectionClosureRow;
      try {
        row = await inWriteTx(deps, ctx.pariwarIdStr, (client) =>
          claim.requestCorrectionClosure(client, {
            pariwarId: ctx.pariwarId,
            claimCaseId: ctx.claimCaseId,
            actorId: ctx.actorId,
            actorDisplay,
            now: deps.clock(),
            noteCiphertext,
            crypto: deps.encryption,
          }),
        );
      } catch (err) {
        translateClosureError(err);
      }
      auditClaim(deps, request, ctx, 'admin_claim_correction.closure_requested', { closure_id: row!.closureId });
      void reply.status(201);
      return toClosureDto(row!, null);
    },

    // ── (3) THE PARIWAR ADMIN'S DECISION ──────────────────────────────────────────────────────────────────────

    /** POST …/correction/closure/decision — key (3). */
    async decideClosure(request: FastifyRequest, reply: FastifyReply): Promise<ClosureDecisionClaimResponse> {
      const ctx = contextOf(request);
      const body = request.body as CorrectionClosureDecisionRequest;
      const actorDisplay = await actorDisplayOf(deps, ctx.actorId);
      const noteCiphertext =
        body.note === undefined || body.note.trim() === ''
          ? null
          : await encryptClosureField(body.note, ctx.pariwarIdStr, CLAIM_CORRECTION_CLOSURE_FIELD_CLASS, deps.encryption);
      const base = { pariwarId: ctx.pariwarId, claimCaseId: ctx.claimCaseId, actorId: ctx.actorId, actorDisplay, now: deps.clock() };
      let result: claim.CorrectionClosureDecisionResult;
      try {
        if (body.decision === 'approve') {
          const decisionRationaleCiphertext = await encryptTrusteeRationale(CLOSURE_DECISION_RATIONALE, ctx.pariwarIdStr, deps.encryption);
          result = await inWriteTx(deps, ctx.pariwarIdStr, (client) =>
            claim.decideCorrectionClosure(client, {
              ...base,
              decision: 'approve',
              noteCiphertext,
              decisionRationaleCiphertext,
              crypto: deps.encryption,
            }),
          );
        } else {
          // The contract already refused a decline without a note; the domain's CHECK is the backstop.
          result = await inWriteTx(deps, ctx.pariwarIdStr, (client) =>
            claim.decideCorrectionClosure(client, { ...base, decision: 'decline', noteCiphertext: noteCiphertext! }),
          );
        }
      } catch (err) {
        translateClosureError(err);
      }
      const claimState =
        result!.chain?.claimState ??
        (await claim.getClaimCase(request.scopeTx!.tx, ctx.pariwarId, ctx.claimCaseId))?.currentState ??
        'unknown';
      auditClaim(
        deps,
        request,
        ctx,
        body.decision === 'approve' ? 'admin_claim_correction.closure_approved' : 'admin_claim_correction.closure_declined',
        {
          closure_id: result!.closure.closureId,
          decision_id: result!.chain?.decisionId ?? null,
          ended_run: result!.endedRun,
          notice_recipients: result!.closure.closureNoticePersonKeys.length,
          letters_owed: result!.closure.closureLetterPersonKeys.length,
        },
      );
      void reply.status(201);
      return {
        claim_case_id: ctx.claimCaseIdStr,
        claim_state: claimState,
        closure: toClosureDto(result!.closure, null),
        decided_by: actorDisplay,
        decided_at: base.now.toISOString(),
      };
    },

    /** GET …/admin/correction/closure-queue — key (3): the pending requests and the live D27 records, notes decrypted. */
    async getClosureQueue(request: FastifyRequest): Promise<PariwarClosureQueueResponse> {
      const scopeTx = request.scopeTx;
      const actorId = request.requestContext.actorId;
      if (!scopeTx || !actorId) throw new UnauthorizedError('Authentication required', 'auth.session_required');
      const pariwarId = ids.pariwarId(scopeTx.pariwarId);
      const rows = await claim.listPariwarClosureQueue(scopeTx.tx, pariwarId, { limit: limitOf(request) });
      const items = await Promise.all(
        rows.map(async (r) => ({
          kind: r.kind,
          claim_case_id: r.claimCaseId,
          deceased_member_id: r.deceasedMemberId,
          short_reference: r.shortReference,
          at: r.at.toISOString(),
          by: r.byDisplay,
          note: (await decryptStaffNote(
            r.noteCiphertext,
            scopeTx.pariwarId,
            CLAIM_CORRECTION_CLOSURE_FIELD_CLASS,
            deps.encryption,
            logDecryptFault(request, r.claimCaseId, 'closure_queue_note'),
          ))!,
          family_run_day0: r.familyRunDay0,
          checked_after_record: r.checkedAfterRecord,
          held: r.held,
        })),
      );
      emitAuthAudit(deps, request, 'admin_claim_correction.closure_queue_read', {
        actorId,
        pariwarId: scopeTx.pariwarId,
        context: { visible_count: items.length },
      });
      return { items };
    },

    // ── (8) "NO CORRECTION NEEDED" (D27, `-260` G2) ───────────────────────────────────────────────────────────

    /** POST …/correction/no-correction-needed — key (8): the District Admin's record. */
    async recordNoCorrectionNeeded(request: FastifyRequest, reply: FastifyReply): Promise<NoCorrectionNeededResponse> {
      const ctx = contextOf(request);
      const body = request.body as NoCorrectionNeededRequest;
      const actorDisplay = await actorDisplayOf(deps, ctx.actorId);
      const setByRole = await markRoleOf(request, ctx, NO_CORRECTION_NEEDED_KEY, {
        dimension: 'district',
        value: request.nomineeNameCheckDistrict ?? null,
      });
      // The cheap refusal first (read-only; the writer re-checks under the lock) — ⛔ KMS work for a 409.
      const pre = await claim.resolveCorrectionChase(request.scopeTx!.tx, ctx.pariwarId, ctx.claimCaseId);
      if (pre.liveReturn === null) throw closureRefusalError('no_live_return');
      const markNoteCiphertext = await encryptCorrectionMarkNote(body.note, ctx.pariwarIdStr, deps.encryption);
      const noteCiphertext = await encryptClosureField(body.note, ctx.pariwarIdStr, CLAIM_CORRECTION_CLOSURE_FIELD_CLASS, deps.encryption);
      let result: claim.NoCorrectionRecordResult;
      try {
        result = await inWriteTx(deps, ctx.pariwarIdStr, (client) =>
          claim.recordNoCorrectionNeeded(client, {
            pariwarId: ctx.pariwarId,
            claimCaseId: ctx.claimCaseId,
            actorId: ctx.actorId,
            actorDisplay,
            now: deps.clock(),
            markNoteCiphertext,
            noteCiphertext,
            setByRole,
            hold: claim.isCorrectionClaimHeld,
          }),
        );
      } catch (err) {
        translateClosureError(err);
      }
      auditClaim(deps, request, ctx, 'admin_claim_correction.no_correction_needed', {
        record_id: result!.record.recordId,
        set_by_role: setByRole,
      });
      void reply.status(201);
      return { claim_case_id: ctx.claimCaseIdStr, record_id: result!.record.recordId, must_act: result!.mark.mark.mustAct };
    },

    /** POST …/correction/no-correction-needed/approve — `cycle.freeze`: D27's NEW approve writer (the FULL gate). */
    async approveNoCorrectionNeeded(request: FastifyRequest, reply: FastifyReply): Promise<ClosureDecisionClaimResponse> {
      const ctx = contextOf(request);
      const actorDisplay = await actorDisplayOf(deps, ctx.actorId);
      // `-273` §4 — while held only the Super Admin decides: refused BEFORE any KMS work (the writer re-checks).
      if (await claim.isCorrectionClaimHeld(request.scopeTx!.tx, ctx.pariwarId, ctx.claimCaseId)) {
        throw closureRefusalError('cycle_freeze_escalated');
      }
      const decisionRationaleCiphertext = await encryptTrusteeRationale(
        NO_CORRECTION_NEEDED_DECISION_RATIONALE,
        ctx.pariwarIdStr,
        deps.encryption,
      );
      let result: Awaited<ReturnType<typeof claim.approveNoCorrectionNeeded>>;
      try {
        result = await inWriteTx(deps, ctx.pariwarIdStr, (client) =>
          claim.approveNoCorrectionNeeded(client, {
            pariwarId: ctx.pariwarId,
            claimCaseId: ctx.claimCaseId,
            actorId: ctx.actorId,
            actorDisplay,
            now: deps.clock(),
            decisionRationaleCiphertext,
          }),
        );
      } catch (err) {
        translateClosureError(err);
      }
      auditClaim(deps, request, ctx, 'admin_claim_correction.no_correction_approved', {
        decision_id: result!.chain.decisionId,
        ended_run: result!.endedRun,
      });
      void reply.status(201);
      return {
        claim_case_id: ctx.claimCaseIdStr,
        claim_state: result!.chain.claimState,
        closure: null,
        decided_by: actorDisplay,
        decided_at: deps.clock().toISOString(),
      };
    },

    /** POST …/correction/no-correction-needed/keep — `cycle.freeze`: `-260` G2, stating who must act, with a note. */
    async keepNoCorrectionNeeded(request: FastifyRequest, reply: FastifyReply): Promise<ChangeCorrectionMustActResponse> {
      const ctx = contextOf(request);
      const body = request.body as NoCorrectionNeededKeepRequest;
      const actorDisplay = await actorDisplayOf(deps, ctx.actorId);
      const setByRole = await markRoleOf(request, ctx, CYCLE_FREEZE_KEY, { dimension: 'pariwar', value: ctx.pariwarIdStr });
      if ((await claim.readLiveNoCorrectionRecord(request.scopeTx!.tx, ctx.pariwarId, ctx.claimCaseId)) === null) {
        throw closureRefusalError('no_record');
      }
      const noteCiphertext = await encryptCorrectionMarkNote(body.note, ctx.pariwarIdStr, deps.encryption);
      let result: claim.WriteCorrectionMarkResult;
      try {
        result = await inWriteTx(deps, ctx.pariwarIdStr, (client) =>
          claim.keepNoCorrectionNeeded(client, {
            pariwarId: ctx.pariwarId,
            claimCaseId: ctx.claimCaseId,
            actorId: ctx.actorId,
            actorDisplay,
            now: deps.clock(),
            mustAct: body.must_act,
            noteCiphertext,
            setByRole,
            hold: claim.isCorrectionClaimHeld,
          }),
        );
      } catch (err) {
        translateClosureError(err);
      }
      auditClaim(deps, request, ctx, 'admin_claim_correction.no_correction_kept', {
        must_act: result!.mark.mustAct,
        set_by_role: setByRole,
        opened_run_kind: result!.openedRun?.kind ?? null,
      });
      void reply.status(201);
      return {
        claim_case_id: ctx.claimCaseIdStr,
        must_act: result!.mark.mustAct,
        opened_run: result!.openedRun
          ? { run_id: result!.openedRun.runId, kind: result!.openedRun.kind, day0: result!.openedRun.day0 }
          : null,
      };
    },

    // ── (1) THE CLOSURE LETTER (`-274` 2) ─────────────────────────────────────────────────────────────────────

    /**
     * GET …/admin/correction/closure-letters — key (1): every closed claim still owing a closure letter, ROW-FILTERED to
     * the caller's districts with `rbac.hasPermission` for THIS key at the deceased's posting district (the correction
     * queue's predicate — a District Admin ⛔ never sees another district's). The filter runs over the bounded scan
     * BEFORE the page slice, so the caller's own rows are ⛔ crowded out.
     */
    async getClosureLettersOwed(request: FastifyRequest): Promise<ClosureLettersOwedResponse> {
      const scopeTx = request.scopeTx;
      const actorId = request.requestContext.actorId;
      if (!scopeTx || !actorId) throw new UnauthorizedError('Authentication required', 'auth.session_required');
      const pariwarId = ids.pariwarId(scopeTx.pariwarId);
      const grants = request.scopeGrants ?? (await loadActorGrants(scopeTx, actorId));
      const geoTree = geoTreeResolverForRequest(request);
      const day = today();
      const scanned = await claim.listClosureLettersOwed(scopeTx.tx, pariwarId, day as cycleCalendar.CalendarDateString, {
        limit: claim.CLOSURE_QUEUE_MAX_LIMIT,
      });
      const visible: typeof scanned = [];
      for (const row of scanned) {
        const posting = await memberDomain.getMemberPostingLatest(scopeTx.tx, pariwarId, ids.memberId(row.deceasedMemberId));
        const district = posting?.district ?? null;
        if (
          rbac.hasPermission(grants, CORRECTION_LETTER_KEY, { dimension: 'district', value: district, pariwarId: scopeTx.pariwarId }, { resolver: geoTree })
        ) {
          visible.push(row);
        }
      }
      const page = visible.slice(0, limitOf(request) ?? claim.CLOSURE_QUEUE_DEFAULT_LIMIT);
      const items = page.map((r) => ({
        claim_case_id: r.claimCaseId,
        deceased_member_id: r.deceasedMemberId,
        short_reference: r.shortReference,
        closed_on: r.closedOn,
        days_since_closure: r.daysSinceClosure,
        people: r.people.map((p) => ({
          person_key: p.personKey,
          letter:
            p.letter === null
              ? null
              : {
                  letter_id: p.letter.letterId,
                  posted_on: p.letter.postedOn,
                  delivered_on: p.letter.deliveredOn,
                  overdue: p.letter.overdue,
                  has_screenshot: p.letter.hasScreenshot,
                },
        })),
      }));
      emitAuthAudit(deps, request, 'admin_claim_correction.closure_letters_read', {
        actorId,
        pariwarId: scopeTx.pariwarId,
        context: { visible_count: items.length },
      });
      return { items };
    },

    /** POST …/correction/closure-letters — key (1): a posted closure letter. */
    async recordClosureLetter(request: FastifyRequest, reply: FastifyReply): Promise<ClosureLetterDto> {
      const ctx = contextOf(request);
      const body = request.body as RecordClosureLetterRequest;
      refuseFutureDate(body.posted_on, today(), 'closure_letter');
      const actorDisplay = await actorDisplayOf(deps, ctx.actorId);
      // The cheap refusals first (read-only — the closure, owed, D30, D31); ⛔ KMS work for a 409.
      try {
        await claim.assertClosureLetterAllowed(request.scopeTx!.tx, ctx.pariwarId, ctx.claimCaseId, body.person_key);
      } catch (err) {
        translateClosureLetterError(err);
      }
      const trackingNumberCiphertext = await encryptClosureField(
        body.tracking_number,
        ctx.pariwarIdStr,
        CLAIM_CLOSURE_LETTER_FIELD_CLASS,
        deps.encryption,
      );
      let row: schema.ClaimClosureLetterRow;
      try {
        row = await inWriteTx(deps, ctx.pariwarIdStr, (client) =>
          claim.recordClosureLetter(client, {
            pariwarId: ctx.pariwarId,
            claimCaseId: ctx.claimCaseId,
            personKey: body.person_key,
            postedOn: body.posted_on,
            trackingNumberCiphertext,
            actorId: ctx.actorId,
            actorDisplay,
          }),
        );
      } catch (err) {
        translateClosureLetterError(err);
      }
      auditClaim(deps, request, ctx, 'admin_claim_correction.closure_letter_recorded', {
        letter_id: row!.letterId,
        person_key: row!.personKey,
        posted_on: row!.postedOn,
      });
      void reply.status(201);
      return { person_key: row!.personKey, ...closureLetterDto(row!, today()) };
    },

    /** POST …/correction/closure-letters/:letterId/delivery — key (1), multipart (the correction letter's upload). */
    async recordClosureLetterDelivery(request: FastifyRequest, reply: FastifyReply): Promise<ClosureLetterDto> {
      const ctx = contextOf(request);
      const letterId = (request.params as { letterId: string }).letterId.toLowerCase();
      const actorDisplay = await actorDisplayOf(deps, ctx.actorId);
      const existing = await claim.readClosureLetter(request.scopeTx!.tx, ctx.pariwarId, ctx.claimCaseId, letterId);
      if (existing === null) throw new NotFoundError('Letter not found', 'closure_letter.not_found');
      if (existing.deliveredOn !== null) {
        throw new ConflictError("This letter's delivery is already recorded", 'closure_letter.already_delivered');
      }
      const { buffer, mimetype, deliveredOn } = await readLetterScreenshotUpload(request, today(), 'closure_letter');
      // D6 — the port, the closure letter's OWN key prefix (`…/closure-letter/{letterId}`); put-then-persist, the orphan
      // deleted best-effort on a failure thrown before the commit (6.19b's shape and its deferred COMMIT caveat).
      const storageKey = `pariwar/${ctx.pariwarIdStr}/claim/${ctx.claimCaseIdStr}/closure-letter/${letterId}/${randomUUID()}`;
      await deps.claimDocumentStorage.put(storageKey, new Uint8Array(buffer), { contentType: mimetype });
      let row: schema.ClaimClosureLetterRow;
      try {
        row = await inWriteTx(deps, ctx.pariwarIdStr, (client) =>
          claim.recordClosureLetterDelivery(client, {
            pariwarId: ctx.pariwarId,
            claimCaseId: ctx.claimCaseId,
            letterId,
            deliveredOn,
            screenshotStorageKey: storageKey,
            screenshotContentType: mimetype,
            screenshotSizeBytes: buffer.byteLength,
            actorId: ctx.actorId,
            actorDisplay,
          }),
        );
      } catch (err) {
        if (typeof deps.claimDocumentStorage.delete === 'function') {
          await deps.claimDocumentStorage
            .delete(storageKey)
            .catch((delErr: unknown) => request.log.warn({ err: delErr }, 'closure-letter screenshot orphan cleanup failed'));
        } else {
          request.log.warn('closure-letter screenshot orphaned: the storage port has no delete()');
        }
        translateClosureLetterError(err);
      }
      const dto = { person_key: row!.personKey, ...closureLetterDto(row!, today()) };
      auditClaim(deps, request, ctx, 'admin_claim_correction.closure_letter_delivery_recorded', {
        letter_id: letterId,
        delivered_on: deliveredOn,
        overdue: dto.overdue,
        byte_size: buffer.byteLength,
        content_type: mimetype,
      });
      void reply.status(201);
      return dto;
    },

    /** GET …/correction/closure-letters/address?person_key= — key (1) + step-up; one audit line per reveal. */
    async readClosureLetterAddress(request: FastifyRequest, reply: FastifyReply): Promise<ClosureLetterAddressResponse> {
      const ctx = contextOf(request);
      const { person_key: personKey } = request.query as { person_key: string };
      void reply.header('cache-control', 'no-store');
      let address: claim.CorrectionLetterAddress;
      try {
        ({ address } = await claim.assertClosureLetterAllowed(request.scopeTx!.tx, ctx.pariwarId, ctx.claimCaseId, personKey));
      } catch (err) {
        translateClosureLetterError(err);
      }
      const plaintext = await decryptClaimContactField(address!.addressCiphertext, ctx.pariwarIdStr, deps.encryption);
      auditClaim(deps, request, ctx, 'admin_claim_correction.closure_letter_address_revealed', { person_key: personKey });
      return { person_key: personKey, address: plaintext };
    },

    /** GET …/correction/closure-letters/:letterId/screenshot — key (1); a TTL-limited signed URL. */
    async readClosureLetterScreenshot(request: FastifyRequest, reply: FastifyReply): Promise<ClosureLetterScreenshotResponse> {
      const ctx = contextOf(request);
      const letterId = (request.params as { letterId: string }).letterId.toLowerCase();
      void reply.header('cache-control', 'no-store');
      const row = await claim.readClosureLetter(request.scopeTx!.tx, ctx.pariwarId, ctx.claimCaseId, letterId);
      if (row === null || row.screenshotStorageKey === null) {
        throw new NotFoundError('No screenshot is recorded for this letter', 'closure_letter.no_screenshot');
      }
      const url = await deps.claimDocumentStorage.signedReadUrl(row.screenshotStorageKey, CORRECTION_SCREENSHOT_URL_TTL_SECONDS);
      auditClaim(deps, request, ctx, 'admin_claim_correction.closure_letter_screenshot_read', { letter_id: letterId });
      return { url, expires_in_seconds: CORRECTION_SCREENSHOT_URL_TTL_SECONDS };
    },
  };
}
