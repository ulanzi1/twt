// The UNDO of a mistaken ending — Story 13.1f (Task 5.1; AD5, AD6; decision `2026-11-16-464`; the Panel's `2026-11-17-465` Q6 B; AC1–AC3,
// AC8).
//
//   · POST …/field-workers/:fieldWorkerId/undo-ending   → `field_worker.ending_undone` (`field_worker.undo_ending`, pariwar_admin)
//
// The Panel's `-454` Q1 A: "The Pariwar Admin may undo any ending made by mistake, restoring the worker as they were, with the same
// code" — EXCEPT, from `-465` Q6 B, an ending whose appeal the Trustee Panel heard and refused ("once you have refused, only a new
// decision of yours restores the worker"). 13.1c's `act` shape: `tenantWrite` with the worker id in the key's namespace (13.1a TR6);
// `run`, in order: the PRE-READ refusals — not found (a lost race only), not `terminated` (409 illegal_transition), the gate's district
// stale (409), the version the screen showed (409 ending_changed), a Panel-refused appeal on this ending (409 appeal_refused_by_panel),
// another LIVE row holding the number (409 number_registered_again — the blind index only, ⛔ decrypted) — each writes NO audit line
// (I7); then ONE `withCompensatingAudit` whose `mutate` runs `undoFieldWorkerEnding` (it re-judges each under the lock) and COMMITS. The
// 200 is built from the COMMAND's result (G24) — ⛔ a name, a mobile or a code.

import type { FieldWorkerLifecycleResult, UndoFieldWorkerEndingRequest } from '@twt/contracts';
import { audit, fieldWorker, ids, type rbac } from '@twt/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { closeScopeTx } from '../multi-tenant/scope-tx.js';
import { createFieldWorkerWriteSupport, payloadHash } from './write-support.js';

/** The key the undo gates on (AD10, catalog v63) — `pariwar_admin` only (`-454` Q1 A; confirmed `-465` Q5 A). */
export const FIELD_WORKER_UNDO_ENDING_KEY = 'field_worker.undo_ending';

export function createFieldWorkerUndoHandlers(deps: AppDeps) {
  const { tenantWrite } = createFieldWorkerWriteSupport(deps);

  /** `POST …/:fieldWorkerId/undo-ending` — AC1. */
  async function undo(request: FastifyRequest, reply: FastifyReply) {
    const authorization: rbac.VerifiedAuthorization | undefined = request.authorizations?.[FIELD_WORKER_UNDO_ENDING_KEY];
    if (authorization === undefined) throw new Error('[field-worker] the undo ran without the field_worker.undo_ending gate');
    const fieldWorkerId = ids.fieldWorkerId((request.params as { fieldWorkerId: string }).fieldWorkerId);
    const body = request.body as UndoFieldWorkerEndingRequest;

    const out = await tenantWrite(
      request,
      (p, a) => `field_worker.undo_ending:${p}:${a}:${fieldWorkerId}`,
      async () => undefined,
      async (ctx): Promise<FieldWorkerLifecycleResult> => {
        const pariwarId = ids.pariwarId(ctx.pariwarId);
        const db = ctx.scopeTx.tx;
        const worker = await fieldWorker.getFieldWorker(db, pariwarId, fieldWorkerId);
        if (worker === null) throw new fieldWorker.FieldWorkerGenesisMissingError(fieldWorkerId);
        if (worker.currentState !== 'terminated') {
          throw new fieldWorker.FieldWorkerIllegalTransitionError(fieldWorkerId, worker.currentState, 'field_worker.ending_undone');
        }
        if (worker.district !== authorization.target.value) throw new fieldWorker.FieldWorkerAuthorizationStaleError(fieldWorkerId, authorization.target.value);
        if (worker.stateEventVersion !== body.expected_ending_version) {
          throw new fieldWorker.FieldWorkerEndingChangedError(fieldWorkerId, body.expected_ending_version);
        }
        if (await fieldWorker.hasPanelRefusedAppealOnCurrentEnding(db, pariwarId, fieldWorkerId)) {
          throw new fieldWorker.FieldWorkerAppealRefusedByPanelError(fieldWorkerId, worker.stateEventVersion);
        }
        await assertNumberFree(db, pariwarId, fieldWorkerId);
        return audit.withCompensatingAudit(deps.servicePool, {
          auditIntent: {
            pariwarId: ctx.pariwarId,
            actorId: ctx.actorId,
            actorRole: authorization.role,
            action: 'field_worker.ending_undone',
            resourceLocator: `field_worker/${fieldWorkerId}`,
            requestPayloadHash: payloadHash({ field_worker_id: fieldWorkerId, expected_ending_version: body.expected_ending_version }),
            traceId: ctx.traceId,
          },
          mutate: async ({ auditId }) => {
            const r = await fieldWorker.undoFieldWorkerEnding(ctx.scopeTx.client, {
              pariwarId,
              fieldWorkerId,
              auditId,
              actor: 'operator',
              actorId: ctx.actorId,
              authorization,
              expectedEndingVersion: body.expected_ending_version,
            });
            await closeScopeTx(ctx.scopeTx, true); // COMMIT — inside `mutate`, so a failed COMMIT writes the compensating line
            return lifecycleResultOfUndo(fieldWorkerId, r);
          },
        });
      },
    );
    return reply.code(200).send(out);
  }

  return { undo };
}

/** AD5 — another LIVE row of this Pariwar holds the worker's number (the blind index, ⛔ decrypted) ⇒ 409, before any audit line. */
export async function assertNumberFree(db: Parameters<typeof fieldWorker.getFieldWorker>[0], pariwarId: ids.PariwarId, fieldWorkerId: ids.FieldWorkerId): Promise<void> {
  const index = await fieldWorker.getFieldWorkerMobileIndex(db, pariwarId, fieldWorkerId);
  if (index === null) throw new fieldWorker.FieldWorkerGenesisMissingError(fieldWorkerId);
  const live = await fieldWorker.findLiveFieldWorkerByMobileIndex(db, pariwarId, index);
  if (live !== null && live !== fieldWorkerId) throw new fieldWorker.FieldWorkerNumberRegisteredAgainError(fieldWorkerId);
}

/** The 200 of an undo — from the COMMAND's result (the restored reason, no last day, the undo event's version — G24). */
export function lifecycleResultOfUndo(fieldWorkerId: ids.FieldWorkerId, r: fieldWorker.FieldWorkerUndoResult): FieldWorkerLifecycleResult {
  return {
    field_worker_id: fieldWorkerId,
    district: r.district,
    current_state: r.state,
    state_reason_code: r.reasonCode,
    ended_on: null,
    state_event_version: r.eventVersion,
  };
}
