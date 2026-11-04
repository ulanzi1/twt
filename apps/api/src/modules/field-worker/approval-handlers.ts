// The field-worker APPROVAL handler — Story 13.1a (Task 6; AD2, AD3, AD7; decision `-447` item 2; AC1–AC3).
//
//   · POST …/p/:pariwarId/field-workers/:fieldWorkerId/approve   → `pending_kyc` → `active`, 200 (⛔ a code, ⛔ a name, ⛔ a mobile)
//
// ONE act, ONE transaction, TWO events (AD2 — 13.1 QE21 option B2): `field_worker.kyc_completed` (the approving officer accepts
// the identity check done at the interview) then `field_worker.activated`, each carrying the SAME verified `field_worker.approve`
// result the gate stored (AD3 — passed on unchanged, ⛔ recomputed). `activated` also writes the approver's display name to the
// row (`-447` item 2 — read in `prepare`, with NO transaction open; missing ⇒ 409 `admin.display_name_missing` BEFORE any write).
//
// The write is `tenantWrite` (`write-support.ts`) with the WORKER ID in the key's namespace (TR6 — the body is `{}`, and the
// keyed store keeps no body fingerprint, so a key reused for another worker must not replay this one's 200).
// `run`, in order:
//   1. a PRE-READ of the worker on the write transaction: absent ⇒ 404 `field_worker.not_found` (a lost race only — the gate's
//      loader saw it); not `pending_kyc` ⇒ 409 `field_worker.illegal_transition` with NO audit line (AC2 a). Only a race loser
//      reaches the first command, and is refused there under the row lock (TR5 — guard (2) beats guard (3)).
//   2. AD7's NESTED `audit.withCompensatingAudit` pair — ONE line per EVENT (13.1 QE6: audit action = event type): the OUTER
//      writes the `field_worker.kyc_completed` intent and its `mutate` runs `recordFieldWorkerKycCompleted` (with that intent's
//      id) and THEN opens the INNER wrapper, which writes the `field_worker.activated` intent and whose `mutate` runs
//      `activateFieldWorker` (with the inner id — the row's `audit_id` afterwards, 13.1 QE14) and COMMITS. A first-command
//      failure writes only the kyc twin; a second-command failure writes BOTH twins and the whole transaction rolls back.
//   ⚠ TR4 — a failed second command rolls back only ITS savepoint: the error MUST propagate (⛔ catch, ⛔ retry) so the
//   `finally closeScopeTx(false)` rolls the first command back too. A half-approved worker is never committed (I2).
// The 200 is built from the SECOND command's RETURN value (13.1 RB1). ⛔ The word that names how codes are made appears in
// this file (the reach fence's AT9 — TR9).

import type { ApproveFieldWorkerResponse } from '@twt/contracts';
import { audit, fieldWorker, ids } from '@twt/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { AdminDisplayNameMissingError } from '../../http-errors.js';
import { getDisplayName } from '../auth/admin/admin-auth.repo.js';
import { closeScopeTx } from '../multi-tenant/scope-tx.js';
import { createFieldWorkerWriteSupport, payloadHash } from './write-support.js';

/** The ONE key the approval gates on (AD6, catalog v60) — `pariwar_admin` only (`-443` Q4 A). */
export const FIELD_WORKER_APPROVE_KEY = 'field_worker.approve';

export function createFieldWorkerApprovalHandlers(deps: AppDeps) {
  const { tenantWrite } = createFieldWorkerWriteSupport(deps);

  /** `POST …/field-workers/:fieldWorkerId/approve` — record `kyc_completed` + `activated` in ONE transaction (AD2). */
  async function approve(request: FastifyRequest, reply: FastifyReply) {
    // The VERIFIED result the gate stored (AD3, I3) — passed on unchanged to BOTH commands; ⛔ recomputed.
    const authorization = request.authorizations?.[FIELD_WORKER_APPROVE_KEY];
    if (authorization === undefined) {
      // Programming error — the route was registered without its `requirePermissionHook`. Fail loud (500).
      throw new Error('[field-worker] approve ran without the field_worker.approve gate');
    }
    // The BRANDED, lower-cased id — one spelling in the idempotency key, the commands and the locator.
    const fieldWorkerId = ids.fieldWorkerId((request.params as { fieldWorkerId: string }).fieldWorkerId);

    const out = await tenantWrite(
      request,
      (p, a) => `field_worker.approve:${p}:${a}:${fieldWorkerId}`,
      // PREPARE — inside the claim, BEFORE any transaction: the approver's display name (6.11 R5; ⛔ fallback; its own pool
      // connection, taken while NO scope transaction holds one — 13.1 review R3).
      async (ctx) => {
        const approvedByDisplay = await getDisplayName(deps.pool, ctx.actorId);
        if (approvedByDisplay === null) throw new AdminDisplayNameMissingError(ctx.actorId);
        return { approvedByDisplay };
      },
      async (ctx, pre): Promise<ApproveFieldWorkerResponse> => {
        const pariwarId = ids.pariwarId(ctx.pariwarId);
        const worker = await fieldWorker.getFieldWorker(ctx.scopeTx.tx, pariwarId, fieldWorkerId);
        if (worker === null) throw new fieldWorker.FieldWorkerGenesisMissingError(fieldWorkerId);
        if (worker.currentState !== 'pending_kyc') {
          // AC2 (a) — refused BEFORE the wrapper: no audit line for an act that will not be attempted.
          throw new fieldWorker.FieldWorkerIllegalTransitionError(fieldWorkerId, worker.currentState, 'field_worker.kyc_completed');
        }
        const command = { pariwarId, fieldWorkerId, actor: 'operator' as const, actorId: ctx.actorId, authorization };
        const intent = {
          pariwarId: ctx.pariwarId,
          actorId: ctx.actorId,
          actorRole: authorization.role,
          resourceLocator: `field_worker/${fieldWorkerId}`,
          // ⛔ A name, a mobile or a code — the worker id and the (non-personal) district only.
          requestPayloadHash: payloadHash({ field_worker_id: fieldWorkerId, district: worker.district }),
          traceId: ctx.traceId,
        };
        return audit.withCompensatingAudit(deps.servicePool, {
          auditIntent: { ...intent, action: 'field_worker.kyc_completed' },
          mutate: async ({ auditId: kycAuditId }) => {
            await fieldWorker.recordFieldWorkerKycCompleted(ctx.scopeTx.client, { ...command, auditId: kycAuditId });
            return audit.withCompensatingAudit(deps.servicePool, {
              auditIntent: { ...intent, action: 'field_worker.activated' },
              mutate: async ({ auditId }) => {
                const activated = await fieldWorker.activateFieldWorker(ctx.scopeTx.client, {
                  ...command,
                  auditId,
                  approvedByDisplay: pre.approvedByDisplay,
                });
                await closeScopeTx(ctx.scopeTx, true); // COMMIT — inside `mutate`, so a failed COMMIT writes BOTH compensating lines
                return {
                  field_worker_id: fieldWorkerId,
                  district: activated.district,
                  current_state: activated.state,
                  kyc_status: activated.kycStatus,
                };
              },
            });
          },
        });
      },
    );
    return reply.code(200).send(out);
  }

  return { approve };
}
