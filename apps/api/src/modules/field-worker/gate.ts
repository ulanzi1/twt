// The field-worker routes' gate TARGETS — Story 13.1a (Task 5.2; AD4). `requirePermissionHook`'s `resolveValue` /
// `resolveDimension` are SYNCHRONOUS ("resolve from data an earlier preHandler already stashed; never query"), so:
//
//   (a) the three PER-WORKER routes (identity, approve, code) run `loadFieldWorkerGateDistrict` AFTER the scope hook: it reads the
//       worker on `request.scopeTx` and stashes the worker's CURRENT reporting district on `request.fieldWorkerGateDistrict`.
//       A missing worker — or another Pariwar's, which RLS and the explicit `pariwar_id` predicate both hide — stashes `null`,
//       and a `null` target fails CLOSED to 403 for EVERYONE, a Pariwar Admin included (`scopeContains` refuses an unresolved
//       target before it looks at the grant): the boundary never says whether a worker exists (the
//       `resolveNomineeNameCheckDistrict` precedent). The district read here is BEFORE any lock — the approval's commands
//       re-judge it under the row lock (AD3) and the reads re-judge it on the row they disclose (decision `-447` item 1).
//   (b) the LIST gates at `district` against the query's `district` VERBATIM when one is given, and at `pariwar` against the
//       Pariwar when it is not — so a District Admin must name a district they hold; only a Pariwar Admin can list across
//       districts. Both read the ALREADY-VALIDATED query (the Zod parse ran before the hooks).

import { fieldWorker, ids } from '@twt/domain';
import type { FastifyRequest, preHandlerHookHandler } from 'fastify';

import { UnauthorizedError } from '../../http-errors.js';

/** The per-worker routes' pre-gate loader (AD4 a). Runs after `scopeResolutionHook` (needs `request.scopeTx`). */
export function loadFieldWorkerGateDistrict(): preHandlerHookHandler {
  return async function preHandler(request: FastifyRequest): Promise<void> {
    const scopeTx = request.scopeTx;
    if (!scopeTx) throw new UnauthorizedError('Authentication required', 'auth.session_required');
    const { fieldWorkerId } = request.params as { fieldWorkerId: string };
    const worker = await fieldWorker.getFieldWorker(scopeTx.tx, ids.pariwarId(scopeTx.pariwarId), ids.fieldWorkerId(fieldWorkerId));
    request.fieldWorkerGateDistrict = worker?.district ?? null;
  };
}

/** `resolveValue` for the per-worker routes — the stash, `null` (deny) when absent. */
export function fieldWorkerGateDistrict(request: FastifyRequest): string | null {
  return request.fieldWorkerGateDistrict ?? null;
}

/** The list's query, as far as its gate reads it. */
function listDistrict(request: FastifyRequest): string | undefined {
  const district = (request.query as { district?: unknown } | undefined)?.district;
  return typeof district === 'string' ? district : undefined;
}

/** `resolveDimension` for the list (AD4 b): `district` when the query names one, else `pariwar`. */
export function listGateDimension(request: FastifyRequest): 'district' | 'pariwar' {
  return listDistrict(request) === undefined ? 'pariwar' : 'district';
}

/** `resolveValue` for the list (AD4 b): the query's district verbatim (⛔ trimmed — I11), else this request's Pariwar. */
export function listGateValue(request: FastifyRequest): string | null {
  const district = listDistrict(request);
  if (district !== undefined) return district;
  return request.scopeTx?.pariwarId ?? null;
}
