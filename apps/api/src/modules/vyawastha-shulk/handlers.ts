// Signup ₹110 Vyawastha Shulk handlers — Story 3.6b (Task 6; AC1/AC2/AC3/AC4).
//
// The wizard's FINAL step — it closes the signup loop. THREE routes:
//   · intent  — build a SERVER-authoritative UPI Intent URL (VPA + amount from config; never
//               client-named — R4) + the `tr` idempotency nonce. No DB; the OS UPI app handles payment.
//   · confirm — THE load-bearing path. Self-attest the UTR → ALWAYS persist the AR-67 receipt (D3),
//               capture the optional Reference Code (D2 port seam), then evaluate the 5-condition
//               lock-in gate (AC2) and emit member.vyawastha_shulk_paid + member.lock_in_entered ONLY
//               when all five hold (R2). The receipt and the gated transition run in TWO scope-txs so a
//               gate-fail / policy-503 leaves the receipt durably committed (R2 ordering decision).
//   · status  — the UI's paid / lock-in view.
//
// ── Module naming (flag, R4 / Project Structure Notes) ──────────────────────────────────────────────
// The architecture names a generic `modules/payment/` for UPI Intent dispatch (L4286/L4599), but that
// is Epic 8's contribution (member→nominee) surface; 3.6b keeps the signup-fee path in its own
// `vyawastha-shulk/` module to avoid prematurely coupling with the Epic-8 payment-module shape.
//
// ── First PRODUCTION caller of member.vyawastha_shulk_paid + member.lock_in_entered (R1) ─────────────
// Both event types + the pending-fee → lock-in transition were FROZEN by Story 3.1; every prior
// reference was a test seed. 3.6b EMITS them in production. actorId is the member's uuid — NEVER the
// string 'system' on the actor_id uuid column (R7; the actor PAYLOAD field is 'member').

import { randomUUID } from 'node:crypto';

import type {
  VyawasthaShulkConfirmRequest,
  VyawasthaShulkConfirmResponse,
  VyawasthaShulkIntentResponse,
  VyawasthaShulkStatusResponse,
} from '@twt/contracts';
import { eq, sql } from 'drizzle-orm';
import { ids, member as memberDomain, payment as paymentDomain, schema } from '@twt/domain';
import type { FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { ConflictError, ServiceUnavailableError, UnauthorizedError } from '../../http-errors.js';
import { emitAuthAudit } from '../auth/shared/audit.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';

/** Lifecycle states in which a signup-fee confirm is rejected (terminal — keep the local set; W-drift). */
const TERMINAL_STATES = new Set(['withdrawn', 'anonymized']);

/** States that mean the member has ALREADY entered lock-in (so a re-confirm must not re-emit). */
const LOCK_IN_OR_PAST = new Set([
  'lock-in',
  'pending-valid',
  'active',
  'active-in-grace',
  'lapsed-unpaid',
]);

/** Mask a UTR for audit/logging — last 4 only (never the full self-attested transaction ref). */
function maskUtr(utr: string): string {
  return utr.length <= 4 ? '****' : `****${utr.slice(-4)}`;
}

export function createVyawasthaShulkHandlers(deps: AppDeps) {
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
    /**
     * POST /api/v1/member/vyawastha-shulk/intent — build the server-constructed UPI Intent URL. The
     * VPA + amount come from config (server-authoritative — never client-supplied; R4). 503 when the
     * trust VPA is unconfigured (a server gap, like 3.6a's pariwar-unconfigured 503).
     */
    async intent(request: FastifyRequest): Promise<VyawasthaShulkIntentResponse> {
      const { memberIdStr, pariwarIdStr } = memberCtx(request);
      const vpa = deps.config.vyawasthaShulkVpa;
      const amountInr = deps.config.vyawasthaShulkAmountInr;
      if (!vpa) {
        emitAuthAudit(deps, request, 'member_vyawastha_shulk.failure', {
          actorId: memberIdStr,
          pariwarId: pariwarIdStr,
          context: { reason: 'unconfigured' },
        });
        throw new ServiceUnavailableError(
          'The signup fee is not available',
          'vyawastha_shulk.unconfigured',
        );
      }

      // Build the tr idempotency nonce + the upi://pay URL SERVER-side (R4 — the client never names the
      // amount or payee). tn = the human-readable note; tr = the idempotency key echoed to confirm.
      const tr = `signup-${memberIdStr}-${randomUUID()}`;
      const tn = `signup-shulk-${memberIdStr}`;
      const upiUrl =
        `upi://pay?pa=${encodeURIComponent(vpa)}&am=${amountInr}&cu=INR` +
        `&tn=${encodeURIComponent(tn)}&tr=${encodeURIComponent(tr)}`;

      emitAuthAudit(deps, request, 'member_vyawastha_shulk.intent', {
        actorId: memberIdStr,
        pariwarId: pariwarIdStr,
        context: { amount_inr: amountInr },
      });
      return { upiUrl, tr, amountInr, vpa };
    },

    /**
     * POST /api/v1/member/vyawastha-shulk/confirm — the load-bearing path (AC1/AC2/AC3/AC4). See the
     * module header for the two-scope-tx ordering rationale (R2).
     */
    async confirm(request: FastifyRequest): Promise<VyawasthaShulkConfirmResponse> {
      const body = request.body as VyawasthaShulkConfirmRequest;
      const { memberIdStr, pariwarIdStr } = memberCtx(request);
      const memberId = ids.memberId(memberIdStr);
      const pariwarId = ids.pariwarId(pariwarIdStr);
      const now = deps.clock();
      const amountInr = deps.config.vyawasthaShulkAmountInr;

      // ── tx-1: persist the receipt (+ optional attribution) and COMMIT (D3 — receipt always retained,
      //    even if the gate/policy step in tx-2 later fails) ────────────────────────────────────────
      let receiptView: VyawasthaShulkConfirmResponse['receipt'] | undefined;
      let idempotent = false;
      let attributionCaptured = false;
      const scopeTx1 = await openScopeTx(deps, pariwarIdStr);
      let ok1 = false;
      try {
        const exists = await memberDomain.memberExists(scopeTx1.tx, pariwarId, memberId);
        if (!exists) {
          throw new ConflictError('Member not found', 'vyawastha_shulk.member_not_found');
        }
        const state = await memberDomain.getMemberStateAt(scopeTx1.tx, memberId, now);
        if (TERMINAL_STATES.has(state)) {
          throw new ConflictError(
            'Member is in a terminal state — the signup fee cannot be recorded',
            'vyawastha_shulk.member_terminal',
          );
        }

        // P9: setFullYear handles leap years correctly (365×24h fixed-ms is 1 day short on ~25% of cohorts).
        const validThrough = new Date(now);
        validThrough.setFullYear(now.getFullYear() + 1);
        try {
          const row = await paymentDomain.insertVyawasthaShulkReceipt(scopeTx1.tx, {
            memberId,
            pariwarId,
            tr: body.tr,
            utr: body.utr,
            amountInr,
            paymentMethod: 'upi_intent',
            validThrough,
          });
          receiptView = {
            paidAt: row.paidAt.toISOString(),
            validThrough: row.validThrough.toISOString(),
            amountInr: row.amountInr,
            utr: row.utr,
            paymentMethod: row.paymentMethod,
          };
          // Receipt committed — set ok1 BEFORE attribution so the commit fires even if attribution
          // fails (AR-67 requires the receipt to survive any attribution outcome; D3).
          ok1 = true;
          // Capture the optional Reference Code (D2) under a SAVEPOINT so any attribution error
          // can be rolled back to the savepoint without aborting the receipt commit.
          if (body.referenceCode !== undefined) {
            await scopeTx1.tx.execute(sql`SAVEPOINT attr_capture`);
            try {
              await paymentDomain.insertMemberAttribution(scopeTx1.tx, {
                memberId,
                pariwarId,
                attributionSource: body.referenceCode,
              });
              await scopeTx1.tx.execute(sql`RELEASE SAVEPOINT attr_capture`);
              attributionCaptured = true;
            } catch {
              await scopeTx1.tx.execute(sql`ROLLBACK TO SAVEPOINT attr_capture`);
              // Attribution failure suppressed — receipt must always commit (AR-67/D3).
            }
          }
        } catch (err) {
          // Same-`tr` re-confirm (AC1): the UNIQUE violation marks the idempotent path — do NOT insert
          // a second receipt or re-capture; load the existing receipt below and re-evaluate lock-in.
          // (The tx is aborted after this error; closeScopeTx COMMIT becomes a no-op ROLLBACK.)
          if (paymentDomain.isReceiptTrDuplicate(err)) {
            idempotent = true;
          } else {
            throw err;
          }
        }
      } catch (err) {
        await closeScopeTx(scopeTx1, false);
        emitAuthAudit(deps, request, 'member_vyawastha_shulk.failure', {
          actorId: memberIdStr,
          pariwarId: pariwarIdStr,
          context: { reason: err instanceof ConflictError ? err.code : 'error' },
        });
        throw err;
      }
      await closeScopeTx(scopeTx1, ok1);

      if (attributionCaptured) {
        emitAuthAudit(deps, request, 'member_attribution.captured', {
          actorId: memberIdStr,
          pariwarId: pariwarIdStr,
        });
      }

      // ── tx-2: evaluate the gate + (if satisfied) emit the two events + write the snapshot column ──
      const scopeTx2 = await openScopeTx(deps, pariwarIdStr);
      let ok2 = false;
      // Set only when projectMemberState is actually called for member.lock_in_entered in this
      // request — the correct axis for the lock_in_entered audit (distinct from `idempotent` which
      // is about the receipt tr, and from `lockInEntered` which conflates two different paths).
      let lockInEnteredEventEmitted = false;
      let lockInPolicyVersion: string | undefined;
      try {
        // For an idempotent re-confirm the receipt was not (re)created in tx-1 — load it now.
        // P3: Filter by memberId to prevent cross-member receipt exposure (member B submitting member
        // A's tr would otherwise retrieve A's row and enter lock-in on A's behalf).
        if (idempotent) {
          const existing = await paymentDomain.getReceiptByTr(
            scopeTx2.tx,
            pariwarId,
            memberId,
            body.tr,
          );
          if (!existing) {
            // Vanishingly unlikely (the duplicate proved a row exists) — treat as a not-found.
            throw new ConflictError('Receipt not found', 'vyawastha_shulk.receipt_not_found');
          }
          receiptView = {
            paidAt: existing.paidAt.toISOString(),
            validThrough: existing.validThrough.toISOString(),
            amountInr: existing.amountInr,
            utr: existing.utr,
            paymentMethod: existing.paymentMethod,
          };
        }
        if (!receiptView) {
          // Unreachable: tx-1 set it on the fresh path, the block above on the idempotent path.
          throw new Error('[vyawastha-shulk] receipt view missing after persistence');
        }

        const state = await memberDomain.getMemberStateAt(scopeTx2.tx, memberId, now);

        // P7: Re-check terminal states at tx-2 entry — a concurrent withdrawal between tx-1 commit
        // and tx-2 open would otherwise produce a misleading outstanding:['kyc'] rather than a 409.
        // Receipt is already committed (tx-1); this 409 only rejects the transition attempt.
        if (TERMINAL_STATES.has(state)) {
          throw new ConflictError(
            'Member is in a terminal state',
            'vyawastha_shulk.member_terminal',
          );
        }

        let lockInEntered = false;
        let lockInDaysAtJoin: number | undefined;
        let outstanding: VyawasthaShulkConfirmResponse['outstanding'] = [];

        if (LOCK_IN_OR_PAST.has(state)) {
          // Already entered lock-in (idempotent re-confirm of a completed lock-in) — do NOT re-emit.
          lockInEntered = true;
          const rows = await scopeTx2.tx
            .select({ days: schema.members.lockInDaysAtJoin })
            .from(schema.members)
            .where(eq(schema.members.memberId, memberId))
            .limit(1);
          lockInDaysAtJoin = rows[0]?.days ?? undefined;
        } else {
          const gate = await memberDomain.evaluateLockInGate(scopeTx2.tx, pariwarId, memberId, now);
          if (!gate.satisfied) {
            // Receipt persisted (tx-1); NO lifecycle event — the member remains in pending-fee (AC2).
            outstanding = gate.outstanding;
          } else {
            // All five hold (the four facts + the receipt). Resolve the FR-8 lock-in policy.
            const policy = await memberDomain.resolveLockInPolicy(scopeTx2.tx, pariwarId);
            if (!policy) {
              // Receipt is durably committed (tx-1); this rolls back tx-2 only. Idempotent re-confirm
              // completes lock-in once the clause is provisioned (AC3).
              throw new ServiceUnavailableError(
                'The lock-in policy is not available',
                'lock_in.policy_unavailable',
              );
            }
            // Emit the transition (pending-fee → lock-in) THEN the clock-start marker (lock-in →
            // lock-in) in the SAME scope-tx (AC2 atomicity). actorId = the member's uuid (R7).
            await memberDomain.projectMemberState(scopeTx2.client, {
              memberId,
              pariwarId,
              eventType: 'member.vyawastha_shulk_paid',
              payload: {
                from_state: 'pending-fee',
                to_state: 'lock-in',
                trigger: 'vyawastha_shulk_paid',
                actor: 'member',
                utr: body.utr,
                amount_inr: amountInr,
              },
              actorId: memberIdStr,
            });
            await memberDomain.projectMemberState(scopeTx2.client, {
              memberId,
              pariwarId,
              eventType: 'member.lock_in_entered',
              payload: {
                from_state: 'lock-in',
                to_state: 'lock-in',
                trigger: 'lock_in_entered',
                actor: 'member',
                lock_in_days_at_join: policy.lockInDays,
                lock_in_policy_version: policy.lockInPolicyVersion,
              },
              actorId: memberIdStr,
            });
            // The derived read-cache column — same value, same scope-tx, AFTER the events (R3).
            await memberDomain.setLockInDaysAtJoin(scopeTx2.tx, memberId, policy.lockInDays);

            lockInEntered = true;
            lockInDaysAtJoin = policy.lockInDays;
            lockInPolicyVersion = policy.lockInPolicyVersion;
            lockInEnteredEventEmitted = true;
          }
        }

        const result: VyawasthaShulkConfirmResponse = {
          receipt: receiptView,
          lockInEntered,
          ...(lockInDaysAtJoin !== undefined ? { lockInDaysAtJoin } : {}),
          outstanding,
        };
        ok2 = true;

        // Fire-and-forget audits, AFTER ok2 — NO PII (masked UTR + amount; the snapshot is non-PII).
        //
        // `paid`  — fires iff a NEW receipt was persisted in this request (= !idempotent). The
        //   `!idempotent || lockInEntered` original condition was wrong: it fired even when idempotent
        //   and the member was already in lock-in (LOCK_IN_OR_PAST path), but no new receipt was
        //   written. Correct axis: "was a new receipt row inserted?"
        //
        // `lock_in_entered` — fires iff projectMemberState was actually called for that event this
        //   request (lockInEnteredEventEmitted). The `!idempotent` original condition had two bugs:
        //   (1) suppressed the audit on policy-503 re-confirms where events WERE emitted (idempotent=true
        //       because same tr, but lock_in_entered happened for the first time); (2) fired spuriously
        //   on already-locked-in fresh-tr confirms (idempotent=false but LOCK_IN_OR_PAST, no events).
        if (!idempotent) {
          emitAuthAudit(deps, request, 'member_vyawastha_shulk.paid', {
            actorId: memberIdStr,
            pariwarId: pariwarIdStr,
            context: { masked_utr: maskUtr(body.utr), amount_inr: amountInr },
          });
        }
        if (lockInEnteredEventEmitted && lockInDaysAtJoin !== undefined) {
          emitAuthAudit(deps, request, 'member.lock_in_entered', {
            actorId: memberIdStr,
            pariwarId: pariwarIdStr,
            context: {
              lock_in_days_at_join: lockInDaysAtJoin,
              lock_in_policy_version: lockInPolicyVersion,
            },
          });
        }
        return result;
      } catch (err) {
        // P5: Emit failure for ALL tx-2 errors, including lock_in.policy_unavailable — that 503 is
        // operationally significant (the Pariwar's clause is missing) and must leave an audit trace.
        // The prior ServiceUnavailableError guard incorrectly suppressed it.
        emitAuthAudit(deps, request, 'member_vyawastha_shulk.failure', {
          actorId: memberIdStr,
          pariwarId: pariwarIdStr,
          context: {
            reason: err instanceof ServiceUnavailableError ? err.code : 'lock_in_step_error',
          },
        });
        throw err;
      } finally {
        await closeScopeTx(scopeTx2, ok2);
      }
    },

    /** GET /api/v1/member/vyawastha-shulk/status — the UI's paid / lock-in view. */
    async status(request: FastifyRequest): Promise<VyawasthaShulkStatusResponse> {
      const { memberIdStr, pariwarIdStr } = memberCtx(request);
      const memberId = ids.memberId(memberIdStr);
      const pariwarId = ids.pariwarId(pariwarIdStr);
      const now = deps.clock();
      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        const latest = await paymentDomain.getLatestReceipt(scopeTx.tx, pariwarId, memberId);
        const state = await memberDomain.getMemberStateAt(scopeTx.tx, memberId, now);
        const gate = await memberDomain.evaluateLockInGate(scopeTx.tx, pariwarId, memberId, now);
        const result: VyawasthaShulkStatusResponse = {
          paid: latest !== null,
          ...(latest ? { validThrough: latest.validThrough.toISOString() } : {}),
          lockInEntered: LOCK_IN_OR_PAST.has(state),
          outstanding: gate.outstanding,
        };
        ok = true;
        return result;
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },
  };
}
