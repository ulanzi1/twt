// The field-worker LIFECYCLE handlers — Story 13.1c (Task 4.1; AD2, AD3, AD4, AD6; AC1, AC2, AC4–AC7).
//
//   · POST …/field-workers/:fieldWorkerId/move         → `field_worker.posted` (a Pariwar Admin's direct move; `field_worker.move`)
//   · POST …/field-workers/:fieldWorkerId/suspend      → `field_worker.suspended`   (`field_worker.suspend`)
//   · POST …/field-workers/:fieldWorkerId/reactivate   → `field_worker.reactivated` (`field_worker.reactivate`)
//   · POST …/field-workers/:fieldWorkerId/terminate    → `field_worker.terminated`  (`field_worker.terminate`; Q-1 C, `-453`)
// Each answers 200 `FieldWorkerLifecycleResult` — ⛔ a name, a mobile or a code (I6).
//
// ONE act, ONE event, ONE audit line (13.1 QE6: the audit action IS the event type — a move's is `field_worker.posted`, ⛔ `moved`).
// Each command takes the VERIFIED result its gate stored (AD3 / AD4 — passed on unchanged, ⛔ recomputed) and judges it again under
// the row lock: the key, the target = the LOCKED district, and for a move the expected source (13.1 D7).
//
// The write is `tenantWrite` (`write-support.ts`) with the WORKER ID in the key's namespace (13.1a TR6 — the keyed store keeps no
// body fingerprint, so a key reused for another worker must not replay this one's 200). `prepare` does nothing (no transaction
// is open there). `run`, in order:
//   1. a move only: `to_district` must be a RECORDED district of the Pariwar at the transaction's `now()` (422 district_unknown);
//   2. a PRE-READ of the worker on the write transaction: absent ⇒ 404 `field_worker.not_found` (a lost race only — the gate's
//      loader saw it); an act the state does not allow ⇒ 409 `illegal_transition`; the worker no longer in the district the gate
//      passed ⇒ 409 `authorization_stale`; a move whose `from_district` is not the worker's district ⇒ 409 `authorization_stale`,
//      one to the district they are in ⇒ 409 `district_unchanged`. Each refused HERE writes NO audit line (I7, TR2);
//   3. ONE `audit.withCompensatingAudit` whose `mutate` runs the command (with the intent's id — the row's `audit_id` afterwards)
//      and COMMITS. A refusal only the lock sees (a concurrent act) throws inside `mutate`: the transaction rolls back and the
//      `_rolled_back` twin is written (TR2). Errors propagate (13.1a TR4) to `mapFieldWorkerError`.
// ⚠ The terminate route is built and merged, but is not used on a real worker before row 13-1f's undo and appeal record exist
// (roster Row 50 (f), decision `-455`). Do NOT write the word that names how codes are made anywhere in this file, not even in a
// comment: the reach fence (AT9) rejects it in a field-worker file.

import type {
  FieldWorkerLifecycleResult,
  MoveFieldWorkerRequest,
  SuspendFieldWorkerRequest,
  TerminateFieldWorkerRequest,
} from '@twt/contracts';
import { audit, fieldWorker, ids, type rbac } from '@twt/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { closeScopeTx } from '../multi-tenant/scope-tx.js';
import { createFieldWorkerWriteSupport, payloadHash, type WriteCtx } from './write-support.js';

/** The key each act gates on (AD5, catalog v61). `move`: `pariwar_admin` only (`-443` Q1 A); the rest: `district_admin` + `pariwar_admin`. */
export const FIELD_WORKER_MOVE_KEY = 'field_worker.move';
export const FIELD_WORKER_SUSPEND_KEY = 'field_worker.suspend';
export const FIELD_WORKER_REACTIVATE_KEY = 'field_worker.reactivate';
export const FIELD_WORKER_TERMINATE_KEY = 'field_worker.terminate';

type Act = 'move' | 'suspend' | 'reactivate' | 'terminate';
type ActEvent = 'field_worker.posted' | 'field_worker.suspended' | 'field_worker.reactivated' | 'field_worker.terminated';

const ACT: Record<Act, { key: string; event: ActEvent }> = {
  move: { key: FIELD_WORKER_MOVE_KEY, event: 'field_worker.posted' },
  suspend: { key: FIELD_WORKER_SUSPEND_KEY, event: 'field_worker.suspended' },
  reactivate: { key: FIELD_WORKER_REACTIVATE_KEY, event: 'field_worker.reactivated' },
  terminate: { key: FIELD_WORKER_TERMINATE_KEY, event: 'field_worker.terminated' },
};

/** The VERIFIED result the gate stored for `key` — ⛔ recomputed; a missing one is a route registered without its gate (500). */
function storedAuthorization(request: FastifyRequest, key: string): rbac.VerifiedAuthorization {
  const authorization = request.authorizations?.[key];
  if (authorization === undefined) throw new Error(`[field-worker] a lifecycle act ran without the ${key} gate`);
  return authorization;
}

export function createFieldWorkerLifecycleHandlers(deps: AppDeps) {
  const { tenantWrite } = createFieldWorkerWriteSupport(deps);

  /**
   * The shared write: the pre-read refusals (no audit line), then ONE audited command that COMMITS inside `mutate`. `hashShape` is
   * the canonical audit hash input beyond the worker id (⛔ a name, a mobile or a code); `command` runs the domain command.
   */
  async function act<T extends FieldWorkerLifecycleResult>(
    request: FastifyRequest,
    reply: FastifyReply,
    which: Act,
    opts: {
      hashShape: Record<string, unknown>;
      /** A move's extra checks on the pre-read row, AFTER the legality and gate-district checks (AD4: source, then unchanged). */
      preCheck?: (worker: fieldWorker.FieldWorkerView) => void;
      /** A move's `to_district` recorded-district check (AD6), BEFORE the pre-read. */
      before?: (ctx: WriteCtx, pariwarId: ids.PariwarId) => Promise<void>;
      command: (ctx: WriteCtx, base: CommandBase & { auditId: string }, worker: fieldWorker.FieldWorkerView) => Promise<T>;
    },
  ): Promise<FastifyReply> {
    const { key, event } = ACT[which];
    const authorization = storedAuthorization(request, key);
    // The BRANDED, lower-cased id — one spelling in the idempotency key, the commands and the locator.
    const fieldWorkerId = ids.fieldWorkerId((request.params as { fieldWorkerId: string }).fieldWorkerId);

    const out = await tenantWrite(
      request,
      (p, a) => `field_worker.${which}:${p}:${a}:${fieldWorkerId}`,
      async () => undefined,
      async (ctx): Promise<T> => {
        const pariwarId = ids.pariwarId(ctx.pariwarId);
        if (opts.before) await opts.before(ctx, pariwarId);
        const worker = await fieldWorker.getFieldWorker(ctx.scopeTx.tx, pariwarId, fieldWorkerId);
        if (worker === null) throw new fieldWorker.FieldWorkerGenesisMissingError(fieldWorkerId);
        // Refused BEFORE the wrapper (I7): no audit line for an act that will not be attempted.
        if (fieldWorker.nextFieldWorkerState(worker.currentState, event) === null) {
          throw new fieldWorker.FieldWorkerIllegalTransitionError(fieldWorkerId, worker.currentState, event);
        }
        if (which !== 'move' && worker.district !== authorization.target.value) {
          // The worker moved between the gate's read and this one; the command would refuse it under the lock too (AD3 (3d)).
          throw new fieldWorker.FieldWorkerAuthorizationStaleError(fieldWorkerId, authorization.target.value);
        }
        opts.preCheck?.(worker);
        const base: CommandBase = { pariwarId, fieldWorkerId, actor: 'operator', actorId: ctx.actorId, authorization };
        return audit.withCompensatingAudit(deps.servicePool, {
          auditIntent: {
            pariwarId: ctx.pariwarId,
            actorId: ctx.actorId,
            actorRole: authorization.role,
            action: event,
            resourceLocator: `field_worker/${fieldWorkerId}`,
            requestPayloadHash: payloadHash({ field_worker_id: fieldWorkerId, ...opts.hashShape }),
            traceId: ctx.traceId,
          },
          mutate: async ({ auditId }) => {
            const result = await opts.command(ctx, { ...base, auditId }, worker);
            await closeScopeTx(ctx.scopeTx, true); // COMMIT — inside `mutate`, so a failed COMMIT writes the compensating line
            return result;
          },
        });
      },
    );
    return reply.code(200).send(out);
  }

  /** `POST …/:fieldWorkerId/move` — AC1, AC2. */
  async function move(request: FastifyRequest, reply: FastifyReply) {
    const body = request.body as MoveFieldWorkerRequest;
    return act(request, reply, 'move', {
      hashShape: { from_district: body.from_district, to_district: body.to_district, reason_code: body.reason_code },
      before: async (ctx, pariwarId) => {
        const at = (await ctx.scopeTx.client.query<{ now: Date }>('SELECT now() AS now')).rows[0]!.now;
        await fieldWorker.assertDistrictRecorded(ctx.scopeTx.tx, pariwarId, body.to_district, at);
      },
      preCheck: (worker) => {
        if (worker.district !== body.from_district) throw new fieldWorker.FieldWorkerAuthorizationStaleError(worker.fieldWorkerId, body.from_district);
        if (worker.district === body.to_district) throw new fieldWorker.FieldWorkerDistrictUnchangedError(worker.fieldWorkerId);
      },
      command: async (ctx, base, worker) => {
        const r = await fieldWorker.postFieldWorker(ctx.scopeTx.client, {
          ...base,
          toDistrict: body.to_district,
          expectedFromDistrict: body.from_district,
          reasonCode: body.reason_code,
        });
        // A move keeps the state and its reason (G4) — from the pre-read row, which the lock confirmed unchanged in state.
        return { field_worker_id: worker.fieldWorkerId, district: r.district, current_state: r.state, state_reason_code: worker.stateReasonCode, ended_on: worker.endedOn };
      },
    });
  }

  /** `POST …/:fieldWorkerId/suspend` — AC4. */
  async function suspend(request: FastifyRequest, reply: FastifyReply) {
    const body = request.body as SuspendFieldWorkerRequest;
    return act(request, reply, 'suspend', {
      hashShape: { reason_code: body.reason_code },
      command: async (ctx, base, worker) => {
        const r = await fieldWorker.suspendFieldWorker(ctx.scopeTx.client, { ...base, reasonCode: body.reason_code });
        return { field_worker_id: worker.fieldWorkerId, district: r.district, current_state: r.state, state_reason_code: body.reason_code, ended_on: null };
      },
    });
  }

  /** `POST …/:fieldWorkerId/reactivate` — AC5 (the body is `{}`). */
  async function reactivate(request: FastifyRequest, reply: FastifyReply) {
    return act(request, reply, 'reactivate', {
      hashShape: {},
      command: async (ctx, base, worker) => {
        const r = await fieldWorker.reactivateFieldWorker(ctx.scopeTx.client, base);
        return { field_worker_id: worker.fieldWorkerId, district: r.district, current_state: r.state, state_reason_code: null, ended_on: null };
      },
    });
  }

  /** `POST …/:fieldWorkerId/terminate` — AC6 (Q-1 C: every reason, from every state but `terminated`). */
  async function terminate(request: FastifyRequest, reply: FastifyReply) {
    const body = request.body as TerminateFieldWorkerRequest;
    return act(request, reply, 'terminate', {
      hashShape: { reason_code: body.reason_code, ended_on: body.ended_on },
      command: async (ctx, base, worker) => {
        const r = await fieldWorker.terminateFieldWorker(ctx.scopeTx.client, { ...base, reasonCode: body.reason_code, endedOn: body.ended_on });
        return { field_worker_id: worker.fieldWorkerId, district: r.district, current_state: r.state, state_reason_code: body.reason_code, ended_on: body.ended_on };
      },
    });
  }

  return { move, suspend, reactivate, terminate };
}

/** What every lifecycle command takes besides its own fields. */
interface CommandBase {
  pariwarId: ids.PariwarId;
  fieldWorkerId: ids.FieldWorkerId;
  actor: 'operator';
  actorId: string;
  authorization: rbac.VerifiedAuthorization;
}
