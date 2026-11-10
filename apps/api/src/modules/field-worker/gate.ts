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

import { fieldWorker, ids, rbac } from '@twt/domain';
import type { FastifyRequest, preHandlerHookHandler } from 'fastify';

import { UnauthorizedError } from '../../http-errors.js';
import { loadActorGrants } from '../rbac/index.js';

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

// ── Story 13.1d (AD5, AD6) — the move request's gate targets ────────────────────────────────────────────────────────────────
// Every target is a DISTRICT, stashed on `request.moveRequestGateDistrict` by a loader that runs after the scope hook (the
// resolver is synchronous). "Which end does the officer hold?" is answered GRANT-AWARE (G8 — the 6.19c / 6.18 precedent): each of
// the officer's grants in this Pariwar is tested with the REAL check against the source, then the destination; the first end one
// grant covers is the target (holding both ⇒ the source). A Pariwar grant covers both ends, so its holder is gated at the source.

/** The end of `ends` (in order) that one of the actor's grants covers for `key`, or null. */
async function heldEnd(request: FastifyRequest, key: string, ends: readonly string[]): Promise<string | null> {
  const scopeTx = request.scopeTx;
  const actorId = request.requestContext.actorId;
  if (!scopeTx || !actorId) throw new UnauthorizedError('Authentication required', 'auth.session_required');
  const grants = request.scopeGrants ?? (await loadActorGrants(scopeTx, actorId));
  request.scopeGrants = grants;
  for (const end of ends) {
    if (rbac.hasPermission(grants, key, { dimension: 'district', value: end, pariwarId: scopeTx.pariwarId })) return end;
  }
  return null;
}

/**
 * `POST …/:fieldWorkerId/move-requests` (AD5) — the end the officer holds: the body's `from_district`, else its `to_district` (the
 * ALREADY-VALIDATED body). The worker's row is read for its EXISTENCE only (code review CR24): a missing worker — or another Pariwar's,
 * which RLS and the explicit `pariwar_id` predicate both hide — stashes `null`, a 403 for EVERYONE, so the TENANT boundary never says
 * whether a worker exists in ANOTHER Pariwar (the per-worker routes' rule, above). ⛔ Its district here: the command judges `from_district`
 * against the LOCKED row (a stale one is 409 — the screen's staleness answer, for a worker who IS in this Pariwar).
 * ⚠ So WITHIN the Pariwar the answer does tell them apart: an officer who names a district they hold gets 409 for a worker who exists and 403
 * for an unknown id. That needs a worker UUID the officer already has, and nothing but the UUID is learned - the same class as the 403 body's
 * `details` (deferred-work CR31); `move-requests.spec.ts` (c) pins the 409, the CR24 leg the 403 (code review RP-19).
 */
export function loadMoveRequestOpenTarget(key: string): preHandlerHookHandler {
  return async function preHandler(request: FastifyRequest): Promise<void> {
    const scopeTx = request.scopeTx;
    if (!scopeTx) throw new UnauthorizedError('Authentication required', 'auth.session_required');
    const { fieldWorkerId } = request.params as { fieldWorkerId: string };
    const worker = await fieldWorker.getFieldWorker(scopeTx.tx, ids.pariwarId(scopeTx.pariwarId), ids.fieldWorkerId(fieldWorkerId));
    if (worker === null) {
      request.moveRequestGateDistrict = null;
      return;
    }
    const body = request.body as { from_district?: unknown; to_district?: unknown } | undefined;
    const ends = [body?.from_district, body?.to_district].filter((d): d is string => typeof d === 'string');
    request.moveRequestGateDistrict = await heldEnd(request, key, ends);
  };
}

/** Which district a per-request act gates at (AD5). */
export type MoveRequestGateFor = 'counterpart' | 'opener_end' | 'source' | 'either_end';

/**
 * The per-request routes' loader: reads the request on the hook transaction and stashes the act's district — the COUNTERPART (accept,
 * refuse), the OPENER's end (withdraw), the SOURCE (close; a Pariwar grant covers it), or the end the reader holds (`either_end`, the
 * detail — grant-aware, source first). A missing or another Pariwar's request stashes `null` (403 for everyone). The row is read
 * BEFORE any lock — the commands re-judge the target under the request's lock.
 */
export function loadMoveRequestGate(key: string, gateFor: MoveRequestGateFor): preHandlerHookHandler {
  return async function preHandler(request: FastifyRequest): Promise<void> {
    const scopeTx = request.scopeTx;
    if (!scopeTx) throw new UnauthorizedError('Authentication required', 'auth.session_required');
    const { moveRequestId } = request.params as { moveRequestId: string };
    const row = await fieldWorker.getMoveRequestGateRow(scopeTx.tx, ids.pariwarId(scopeTx.pariwarId), ids.fieldWorkerMoveRequestId(moveRequestId));
    if (row === null) {
      request.moveRequestGateDistrict = null;
      return;
    }
    switch (gateFor) {
      case 'counterpart':
        request.moveRequestGateDistrict = row.counterpartDistrict;
        return;
      case 'opener_end':
        request.moveRequestGateDistrict = row.openedAtEnd === 'from' ? row.fromDistrict : row.toDistrict;
        return;
      case 'source':
        request.moveRequestGateDistrict = row.fromDistrict;
        return;
      case 'either_end':
        request.moveRequestGateDistrict = await heldEnd(request, key, [row.fromDistrict, row.toDistrict]);
        return;
    }
  };
}

/** `resolveValue` for the move-request routes — the stash, `null` (deny) when absent. */
export function moveRequestGateDistrict(request: FastifyRequest): string | null {
  return request.moveRequestGateDistrict ?? null;
}
