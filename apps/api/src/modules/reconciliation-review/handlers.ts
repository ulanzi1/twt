// Reconciliation review-queue handlers — Story 9.8 (Task 5; AC1–AC7).
//
// The trustee ADJUDICATION surface: the deadline-ordered open-case queue read, the per-case detail read
// (identity decrypted + screenshot signed-URL minted at THIS boundary), and the four step-up-gated actions:
//   · confirm  → the EXISTING `appendConfirmedContribution` (the ONLY manual confirm path, D2); the member
//                greens everywhere via the already-wired 9.5 reads. Names the reconciled deposit (a real
//                bank-statement entry) — green = confirmed money (the confirmed-money invariant).
//   · reject   → a NEW `reconciliation.contribution-rejected` event (D1); the member stays red, case closes.
//   · recover  → facilitate-recovery: an audited action ONLY, NO outcome event (D7 — the Story 7.6 no-silent-
//                remap invariant); the case stays OPEN.
//   · reverse  → `reconciliation.confirmation-reversed` (D3); green→held. A fresh confirm re-greens.
//
// ── The 6.11 attributed-decision template (cloned) ──────────────────────────────────────────────────
// (1) ACTOR-DISPLAY (R5) resolves FIRST, before any write — server-side from users.display_name; missing →
//     AdminDisplayNameMissingError (409) fail-closed, no event, no audit. NO fallback ([[project_admin_display_name_attribution]]).
// (2) AUDIT IS A POST-COMMIT SINK — NON-PII (case_key + pool_id + member_id + reason_code + actor); NEVER
//     the rationale. Rejected attempts are audited too.
// (3) The member notification on reject/reverse is BEST-EFFORT post-commit (D9) — it never fails the
//     committed verdict (Task 6 owns the enqueue seam).

import {
  type ReconciliationActionResponse,
  type ReconciliationCaseDetail,
  type ReconciliationConfirmRequest,
  type ReconciliationQueueQuery,
  type ReconciliationQueueResponse,
  type ReconciliationRecoverRequest,
  type ReconciliationRejectRequest,
  type ReconciliationReverseRequest,
} from '@twt/contracts';
import { cycleCalendar, ids, member as memberDomain, reconciliation } from '@twt/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import type { AuthAuditEventType } from '../../audit/audit-sink.js';
import {
  AdminDisplayNameMissingError,
  BadRequestError,
  ConflictError,
  UnauthorizedError,
} from '../../http-errors.js';
import { emitAuthAudit } from '../auth/shared/audit.js';
import { getDisplayName } from '../auth/admin/admin-auth.repo.js';
import { decryptMobile, maskMobile } from '../auth/shared/mobile-index.js';
import { decryptKycField } from '../kyc/kyc-crypto.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';
import { enqueueReconciliationMemberNotify } from './notify.js';

/** Short-lived signed-URL TTL for the self-verify screenshot (the 6.7/6.10 300s precedent). */
const SCREENSHOT_SIGNED_URL_TTL_SECONDS = 300;

interface ActorContext {
  actorId: string;
  pariwarId: ids.PariwarId;
  actorDisplay: string;
}

export function createReconciliationReviewHandlers(deps: AppDeps) {
  /** Resolve the actor + tenant + the R5 display snapshot FIRST (fail-closed on a missing display name). */
  async function contextOf(request: FastifyRequest): Promise<ActorContext> {
    const scopeTx = request.scopeTx;
    const actorId = request.requestContext.actorId;
    if (!scopeTx || !actorId) {
      throw new UnauthorizedError('Authentication required', 'auth.session_required');
    }
    const actorDisplay = await getDisplayName(deps.pool, actorId);
    if (actorDisplay === null) throw new AdminDisplayNameMissingError(actorId);
    return { actorId, pariwarId: ids.pariwarId(scopeTx.pariwarId), actorDisplay };
  }

  function audit(
    request: FastifyRequest,
    type: AuthAuditEventType,
    ctx: Pick<ActorContext, 'actorId' | 'pariwarId'>,
    context: Record<string, unknown>,
  ): void {
    emitAuthAudit(deps, request, type, { actorId: ctx.actorId, pariwarId: ctx.pariwarId, context });
  }

  /** Audit a rejected action ATTEMPT (guard/precondition failure) before throwing — "rejected attempts are
   *  audited too" (module header (2)) applies to precondition fail-closes, not just write-primitive errors. */
  function auditedReject(
    request: FastifyRequest,
    ctx: ActorContext,
    caseKey: string,
    outcome: string,
    reasonCode: string,
    err: Error,
  ): never {
    audit(request, 'admin_reconciliation.action_rejected', ctx, { case_key: caseKey, outcome, reason_code: reasonCode });
    throw err;
  }

  /** Fail-soft decrypt — a single corrupt/rotated envelope yields null for THAT field, never a throw. */
  async function safeDecrypt(fn: () => Promise<string>, request: FastifyRequest, what: string): Promise<string | null> {
    try {
      return await fn();
    } catch (err) {
      request.log.warn({ err, what }, 'reconciliation-review: field decrypt failed; returning null');
      return null;
    }
  }

  return {
    /** GET the deadline-ordered open-case queue (AC1). Audited read (the 6.10 audited-read precedent). */
    async getQueue(request: FastifyRequest): Promise<ReconciliationQueueResponse> {
      const scopeTx = request.scopeTx;
      const actorId = request.requestContext.actorId;
      if (!scopeTx || !actorId) throw new UnauthorizedError('Authentication required', 'auth.session_required');
      const pariwarId = ids.pariwarId(scopeTx.pariwarId);
      const query = request.query as ReconciliationQueueQuery;

      const holidayWindows = await cycleCalendar.listHolidayWindows(scopeTx.tx, pariwarId, {});
      const result = await reconciliation.listOpenReconciliationCases(scopeTx.tx, {
        pariwarId,
        now: deps.clock(),
        ...(query.limit !== undefined ? { limit: query.limit } : {}),
        holidayWindows,
      });

      audit(request, 'admin_reconciliation.read', { actorId, pariwarId }, {
        kind: 'queue',
        row_count: result.rows.length,
        truncated: result.truncated,
      });

      return {
        rows: result.rows.map((r) => ({
          case_key: r.caseKey,
          case_type: r.caseType,
          pool_id: r.poolId,
          alert_id: r.alertId,
          member_id: r.memberId,
          mismatch_reason: r.mismatchReason,
          deadline_at: r.deadlineAt ? r.deadlineAt.toISOString() : null,
          raised_at: r.raisedAt.toISOString(),
          // in_recovery is a best-effort UX flag; recover writes only an audit line (D7 — no event), and
          // the v1 audit sink is not queryable, so it defaults false (tracked forward gap; the load-bearing
          // AC5 property — recover changes NO outcome — is unaffected).
          in_recovery: false,
        })),
        truncated: result.truncated,
      };
    },

    /** GET one case's full review context (AC2) — identity decrypted + screenshot URL minted here. */
    async getCaseDetail(request: FastifyRequest): Promise<ReconciliationCaseDetail> {
      const scopeTx = request.scopeTx;
      const actorId = request.requestContext.actorId;
      if (!scopeTx || !actorId) throw new UnauthorizedError('Authentication required', 'auth.session_required');
      const pariwarId = ids.pariwarId(scopeTx.pariwarId);
      const { caseKey } = request.params as { caseKey: string };

      const holidayWindows = await cycleCalendar.listHolidayWindows(scopeTx.tx, pariwarId, {});
      const detail = await reconciliation.getReconciliationCaseDetail(scopeTx.tx, {
        pariwarId,
        caseKey,
        holidayWindows,
      });
      if (detail === null) throw new BadRequestError('Unknown or malformed case', 'reconciliation_review.unknown_case');

      // Member identity — decrypted fail-soft at THIS boundary (a null field = "unavailable", never a 500).
      let member: ReconciliationCaseDetail['member'] = null;
      if (detail.memberId !== null) {
        const rows = await memberDomain.searchMembers(scopeTx.tx, {
          pariwarId,
          criteria: { by: 'memberId', memberId: ids.memberId(detail.memberId) },
        });
        const row = rows[0];
        if (row) {
          const name =
            row.nameCiphertext != null
              ? await safeDecrypt(() => decryptKycField(row.nameCiphertext!, pariwarId, deps.encryption), request, 'kyc.name')
              : null;
          const mobile =
            row.mobileCiphertext != null
              ? await safeDecrypt(async () => maskMobile(await decryptMobile(row.mobileCiphertext!, deps.encryption)), request, 'identity.mobile')
              : null;
          member = { name, mobile };
        }
      }

      // The screenshot signed URL — minted on demand (the event stores only the object key).
      let screenshotUrl: string | null = null;
      if (detail.screenshotObjectKey !== null) {
        try {
          screenshotUrl = await deps.selfVerifyScreenshotStorage.signedReadUrl(
            detail.screenshotObjectKey,
            SCREENSHOT_SIGNED_URL_TTL_SECONDS,
          );
        } catch (err) {
          request.log.warn({ err }, 'reconciliation-review: screenshot signed-url mint failed; returning null');
          screenshotUrl = null;
        }
      }

      audit(request, 'admin_reconciliation.read', { actorId, pariwarId }, {
        kind: 'case',
        case_key: caseKey,
        case_status: detail.status,
      });

      return {
        case_key: detail.caseKey,
        case_type: detail.caseType,
        status: detail.status,
        pool_id: detail.poolId,
        alert_id: detail.alertId,
        member_id: detail.memberId,
        mismatch_reason: detail.mismatchReason,
        deadline_at: detail.deadlineAt ? detail.deadlineAt.toISOString() : null,
        raised_at: detail.raisedAt ? detail.raisedAt.toISOString() : null,
        in_recovery: false,
        member,
        attestation: detail.attestation
          ? {
              utr: detail.attestation.utr,
              tr: null,
              attested_at: detail.attestation.attestedAt ? detail.attestation.attestedAt.toISOString() : null,
              expected_amount_inr: detail.attestation.expectedAmountInr,
            }
          : null,
        bank_entries: detail.bankEntries.map((e) => ({
          entry_id: e.entryId,
          amount_paise: e.amountPaise,
          value_date: e.valueDate,
          description: e.transactionIdUtr,
        })),
        screenshot_url: screenshotUrl,
        notes: detail.notes.map((n) => ({ kind: n.kind, at: n.at.toISOString(), detail: n.detail })),
        confirmed_event_id: detail.confirmedEventId,
      };
    },

    /** POST confirm (AC3) — the ONLY manual confirm path; reuses appendConfirmedContribution (D2). */
    async postConfirm(request: FastifyRequest, reply: FastifyReply): Promise<ReconciliationActionResponse> {
      const ctx = await contextOf(request);
      const { caseKey } = request.params as { caseKey: string };
      const body = request.body as ReconciliationConfirmRequest;
      const detail = await loadCase(request, ctx, caseKey);
      if (!reconciliation.isReasonCodeValidForOutcome('confirm', body.reason_code)) {
        auditedReject(
          request,
          ctx,
          caseKey,
          'confirm',
          body.reason_code,
          new BadRequestError('Reason code is not valid for confirm', 'reconciliation_review.invalid_reason_code'),
        );
      }
      if (detail.status !== 'open') {
        auditedReject(
          request,
          ctx,
          caseKey,
          'confirm',
          body.reason_code,
          new ConflictError('This case is already resolved', 'reconciliation_review.already_resolved'),
        );
      }
      if (detail.memberId === null || detail.alertId === null) {
        auditedReject(
          request,
          ctx,
          caseKey,
          'confirm',
          body.reason_code,
          new BadRequestError('This case has no member/alert to confirm', 'reconciliation_review.not_confirmable'),
        );
      }
      const utr = detail.attestation?.utr;
      if (utr == null || utr.length === 0) {
        auditedReject(
          request,
          ctx,
          caseKey,
          'confirm',
          body.reason_code,
          new BadRequestError('The member has no UTR attestation to confirm', 'reconciliation_review.no_attestation'),
        );
      }
      if (!detail.bankEntries.some((e) => e.entryId === body.bank_statement_entry_id)) {
        auditedReject(
          request,
          ctx,
          caseKey,
          'confirm',
          body.reason_code,
          new BadRequestError(
            'The bank-statement entry does not belong to this case',
            'reconciliation_review.invalid_bank_entry',
          ),
        );
      }

      const now = deps.clock();
      const scopeTx = await openScopeTx(deps, ctx.pariwarId);
      let ok = false;
      let eventId: string;
      try {
        eventId = await reconciliation.appendConfirmedContribution(scopeTx.client, {
          pariwarId: ctx.pariwarId,
          alertId: ids.alertId(detail.alertId),
          payload: {
            poolId: detail.poolId,
            memberId: detail.memberId,
            alertId: detail.alertId,
            utr,
            confirmedAt: now.toISOString(),
            matchProvenance: {
              bankStatementEntryId: body.bank_statement_entry_id,
              idempotencyKey: `manual:${caseKey}`,
              matcherRun: `trustee:${ctx.actorId}`,
              senderVpaCheck: { available: false, reason: 'member_vpa_not_collected' },
            },
          },
        });
        ok = true;
      } catch (err) {
        audit(request, 'admin_reconciliation.action_rejected', ctx, { case_key: caseKey, outcome: 'confirm', reason_code: body.reason_code });
        await closeScopeTx(scopeTx, false);
        throw translateWriteError(err);
      }
      await closeScopeTx(scopeTx, ok);

      audit(request, 'admin_reconciliation.confirmed', ctx, { case_key: caseKey, pool_id: detail.poolId, member_id: detail.memberId, reason_code: body.reason_code });
      void reply.status(201);
      return actionResponse(caseKey, 'confirm', body.reason_code, ctx.actorDisplay, now, eventId, 'confirmed');
    },

    /** POST reject (AC4) — a NEW reconciliation.* event; member stays red, case closes; member notified. */
    async postReject(request: FastifyRequest, reply: FastifyReply): Promise<ReconciliationActionResponse> {
      const ctx = await contextOf(request);
      const { caseKey } = request.params as { caseKey: string };
      const body = request.body as ReconciliationRejectRequest;
      const detail = await loadCase(request, ctx, caseKey);
      if (!reconciliation.isReasonCodeValidForOutcome('reject', body.reason_code)) {
        auditedReject(
          request,
          ctx,
          caseKey,
          'reject',
          body.reason_code,
          new BadRequestError('Reason code is not valid for reject', 'reconciliation_review.invalid_reason_code'),
        );
      }
      if (detail.status !== 'open') {
        auditedReject(
          request,
          ctx,
          caseKey,
          'reject',
          body.reason_code,
          new ConflictError('This case is already resolved', 'reconciliation_review.already_resolved'),
        );
      }
      if (detail.memberId === null || detail.alertId === null) {
        auditedReject(
          request,
          ctx,
          caseKey,
          'reject',
          body.reason_code,
          new BadRequestError('This case has no member/alert to reject', 'reconciliation_review.not_rejectable'),
        );
      }

      const now = deps.clock();
      const scopeTx = await openScopeTx(deps, ctx.pariwarId);
      let ok = false;
      let eventId: string;
      try {
        eventId = await reconciliation.appendReconciliationReject(scopeTx.client, {
          pariwarId: ctx.pariwarId,
          alertId: ids.alertId(detail.alertId),
          actorId: ctx.actorId,
          payload: {
            poolId: detail.poolId,
            memberId: detail.memberId,
            alertId: detail.alertId,
            reasonCode: body.reason_code,
            attestedByActorIds: [ctx.actorId],
            rejectedAt: now.toISOString(),
          },
        });
        ok = true;
      } catch (err) {
        audit(request, 'admin_reconciliation.action_rejected', ctx, { case_key: caseKey, outcome: 'reject', reason_code: body.reason_code });
        await closeScopeTx(scopeTx, false);
        throw translateWriteError(err);
      }
      await closeScopeTx(scopeTx, ok);

      audit(request, 'admin_reconciliation.rejected', ctx, { case_key: caseKey, pool_id: detail.poolId, member_id: detail.memberId, reason_code: body.reason_code });
      // Best-effort member notification (D9) — never fails the committed verdict.
      enqueueReconciliationMemberNotify(deps, request, { kind: 'rejected', pariwarId: ctx.pariwarId, memberId: detail.memberId, poolId: detail.poolId, alertId: detail.alertId });
      void reply.status(201);
      return actionResponse(caseKey, 'reject', body.reason_code, ctx.actorDisplay, now, eventId, 'rejected');
    },

    /** POST facilitate-recovery (AC5) — audited action ONLY, NO outcome event (D7). Case stays OPEN. */
    async postRecover(request: FastifyRequest, reply: FastifyReply): Promise<ReconciliationActionResponse> {
      const ctx = await contextOf(request);
      const { caseKey } = request.params as { caseKey: string };
      const body = request.body as ReconciliationRecoverRequest;
      const detail = await loadCase(request, ctx, caseKey);
      if (!reconciliation.isReasonCodeValidForOutcome('recover', body.reason_code)) {
        auditedReject(
          request,
          ctx,
          caseKey,
          'recover',
          body.reason_code,
          new BadRequestError('Reason code is not valid for recover', 'reconciliation_review.invalid_reason_code'),
        );
      }
      if (detail.status !== 'open') {
        auditedReject(
          request,
          ctx,
          caseKey,
          'recover',
          body.reason_code,
          new ConflictError('This case is already resolved', 'reconciliation_review.already_resolved'),
        );
      }

      // OUTCOME-INERT (AC5, Story 7.6): this path writes NO event — only an attributed audit line + the
      // reserved Epic-10 helpdesk-routing seam. It reassigns no pool, moves no funds, edits no record.
      const now = deps.clock();
      audit(request, 'admin_reconciliation.recovery_facilitated', ctx, {
        case_key: caseKey,
        pool_id: detail.poolId,
        member_id: detail.memberId,
        reason_code: body.reason_code,
      });
      void reply.status(201);
      return actionResponse(caseKey, 'recover', body.reason_code, ctx.actorDisplay, now, null, 'open');
    },

    /** POST review-and-reverse (AC6/D3) — walk a confirmed contribution back to `held`. */
    async postReverse(request: FastifyRequest, reply: FastifyReply): Promise<ReconciliationActionResponse> {
      const ctx = await contextOf(request);
      const { caseKey } = request.params as { caseKey: string };
      const body = request.body as ReconciliationReverseRequest;
      const detail = await loadCase(request, ctx, caseKey);
      if (!reconciliation.isReasonCodeValidForOutcome('reverse', body.reason_code)) {
        auditedReject(
          request,
          ctx,
          caseKey,
          'reverse',
          body.reason_code,
          new BadRequestError('Reason code is not valid for reverse', 'reconciliation_review.invalid_reason_code'),
        );
      }
      if (detail.status !== 'confirmed') {
        auditedReject(
          request,
          ctx,
          caseKey,
          'reverse',
          body.reason_code,
          new ConflictError('This case has no live confirmation to reverse', 'reconciliation_review.not_reversible'),
        );
      }
      if (detail.memberId === null || detail.alertId === null) {
        auditedReject(
          request,
          ctx,
          caseKey,
          'reverse',
          body.reason_code,
          new BadRequestError('This case has no member/alert to reverse', 'reconciliation_review.not_reversible'),
        );
      }
      if (detail.confirmedEventId === null || detail.confirmedEventId !== body.reversed_confirmed_event_id) {
        auditedReject(
          request,
          ctx,
          caseKey,
          'reverse',
          body.reason_code,
          new BadRequestError(
            "The confirmed event id does not match this case's live confirmation",
            'reconciliation_review.invalid_reversal_target',
          ),
        );
      }

      const now = deps.clock();
      const scopeTx = await openScopeTx(deps, ctx.pariwarId);
      let ok = false;
      let eventId: string;
      try {
        eventId = await reconciliation.appendConfirmationReversed(scopeTx.client, {
          pariwarId: ctx.pariwarId,
          alertId: ids.alertId(detail.alertId),
          actorId: ctx.actorId,
          payload: {
            poolId: detail.poolId,
            memberId: detail.memberId,
            alertId: detail.alertId,
            reversedConfirmedEventId: body.reversed_confirmed_event_id,
            reasonCode: body.reason_code,
            attestedByActorIds: [ctx.actorId],
            reversedAt: now.toISOString(),
          },
        });
        ok = true;
      } catch (err) {
        audit(request, 'admin_reconciliation.action_rejected', ctx, { case_key: caseKey, outcome: 'reverse', reason_code: body.reason_code });
        await closeScopeTx(scopeTx, false);
        throw translateWriteError(err);
      }
      await closeScopeTx(scopeTx, ok);

      audit(request, 'admin_reconciliation.confirmation_reversed', ctx, { case_key: caseKey, pool_id: detail.poolId, member_id: detail.memberId, reason_code: body.reason_code });
      enqueueReconciliationMemberNotify(deps, request, { kind: 'reversed', pariwarId: ctx.pariwarId, memberId: detail.memberId, poolId: detail.poolId, alertId: detail.alertId });
      void reply.status(201);
      return actionResponse(caseKey, 'reverse', body.reason_code, ctx.actorDisplay, now, eventId, 'open');
    },
  };

  /** Load the case detail for a write (inside the read scope-tx), or fail closed. */
  async function loadCase(
    request: FastifyRequest,
    ctx: ActorContext,
    caseKey: string,
  ): Promise<reconciliation.ReconciliationCaseDetail> {
    const scopeTx = request.scopeTx;
    if (!scopeTx) throw new UnauthorizedError('Authentication required', 'auth.session_required');
    const holidayWindows = await cycleCalendar.listHolidayWindows(scopeTx.tx, ctx.pariwarId, {});
    const detail = await reconciliation.getReconciliationCaseDetail(scopeTx.tx, {
      pariwarId: ctx.pariwarId,
      caseKey,
      holidayWindows,
    });
    if (detail === null) throw new BadRequestError('Unknown or malformed case', 'reconciliation_review.unknown_case');
    return detail;
  }
}

function actionResponse(
  caseKey: string,
  outcome: ReconciliationActionResponse['outcome'],
  reasonCode: ReconciliationActionResponse['reason_code'],
  actorDisplay: string,
  decidedAt: Date,
  eventId: string | null,
  status: ReconciliationActionResponse['status'],
): ReconciliationActionResponse {
  return {
    case_key: caseKey,
    outcome,
    reason_code: reasonCode,
    actor_display: actorDisplay,
    decided_at: decidedAt.toISOString(),
    event_id: eventId,
    status,
  };
}

/** Map a domain write error (a busy-stream retry-exhaustion) to a dignified 503/409; rethrow the rest. */
function translateWriteError(err: unknown): never {
  if (err instanceof reconciliation.ReconciliationReviewAppendRetryExhaustedError) {
    throw new ConflictError('This case is busy — reload and try again', 'reconciliation_review.stream_busy');
  }
  throw err;
}
