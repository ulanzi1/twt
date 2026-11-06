// THE API DOOR to the attribution-code registry — Story 13.2 (Task 6.4; AC10; AT8 v2 iii). The ONLY `apps/api` file that names
// `attributionCode` (the repo-wide reach fence, apps/api/tests/unit/attribution-code-reach-fence.test.ts); the one other `apps/*` file is
// Story 13.1b's reviewed job, `apps/jobs/src/scheduler/field-worker-code-sms.ts`, which has no request to take a Pariwar from. ⛔ Route uses it yet:
// Story 13.1 ("Add Field Worker" — allocate, flag), 13.3 ("my code" — read), 13.4 (trustee flags — list) and 13.8 (signup —
// resolve) are its callers.
//
// ⭐ What the door guarantees: Pariwar CONTEXT. Every wrapper takes the Pariwar ONLY from the authenticated request
// (`requestContext.pariwarId` — written by exactly the member-session guard and the scope-resolution hook, the writer pin) through
// ONE private helper, `authenticatedScope`, checks that the caller's `ScopeTx` is scoped to that same Pariwar, and the domain
// re-proves it on the connection (`assertTxBoundScope`). ⛔ Wrapper takes a Pariwar argument — a request-less caller (a backfill
// job, C4) is a REVIEWED addition to the fence's allow-list with its own named Pariwar source (TR4b).
// ⭐ What it does ⛔ guarantee: AUTHORIZATION. Each calling route owns it (13.1: admin session → scope → the Panel-ratified
// field-worker key, BEFORE allocate / flag). The flag records ONLY the authenticated actor (⛔ actor option) and their
// server-resolved `users.display_name` (Story 6.11 R5 — a missing name blocks, ⛔ fallback).
// ⭐ The six domain error classes are re-exported BY NAME so a caller can `instanceof` them and read `.attempts` without naming
// `attributionCode` (which the fence forbids). The export list is PINNED to these eleven names; the shape is pinned too
// (parameter names / types / option keys, `request` reached only through `authenticatedScope`, ⛔ `generate`, and — review R2-1 —
// each scoped wrapper's first two statements: the `const` Pariwar binding from `authenticatedScope(request)` and the
// `assertScopeTxIsRequestScope` pre-check, with `scopeTx` read only as that assertion's argument and as `.client`).

import { attributionCode, ids } from '@twt/domain';
import type { FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { AdminDisplayNameMissingError } from '../../http-errors.js';
import type { ScopeTx } from '../../types.js';
import { getDisplayName } from '../auth/admin/admin-auth.repo.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';

export const InvalidAttributionCodeError = attributionCode.InvalidAttributionCodeError;
export type InvalidAttributionCodeError = InstanceType<typeof InvalidAttributionCodeError>;
export const AttributionPariwarScopeMismatchError = attributionCode.AttributionPariwarScopeMismatchError;
export type AttributionPariwarScopeMismatchError = InstanceType<typeof AttributionPariwarScopeMismatchError>;
export const FieldWorkerAlreadyHasAttributionCodeError = attributionCode.FieldWorkerAlreadyHasAttributionCodeError;
export type FieldWorkerAlreadyHasAttributionCodeError = InstanceType<typeof FieldWorkerAlreadyHasAttributionCodeError>;
export const AttributionCodeAllocationExhaustedError = attributionCode.AttributionCodeAllocationExhaustedError;
export type AttributionCodeAllocationExhaustedError = InstanceType<typeof AttributionCodeAllocationExhaustedError>;
export const AttributionCodeRequiresTransactionError = attributionCode.AttributionCodeRequiresTransactionError;
export type AttributionCodeRequiresTransactionError = InstanceType<typeof AttributionCodeRequiresTransactionError>;
export const AttributionCaptureMismatchError = attributionCode.AttributionCaptureMismatchError;
export type AttributionCaptureMismatchError = InstanceType<typeof AttributionCaptureMismatchError>;

/** The request's authenticated Pariwar (and actor, when one is set) — the ONLY reader of `request`. Unset Pariwar ⇒ loud 500. */
function authenticatedScope(request: FastifyRequest): { pariwarId: ids.PariwarId; actorId: string | undefined } {
  const pariwarId = request.requestContext.pariwarId;
  const actorId = request.requestContext.actorId;
  if (pariwarId === undefined || pariwarId === '') {
    throw new Error('[attribution-code-access] no authenticated Pariwar');
  }
  return { pariwarId: ids.pariwarId(pariwarId), actorId };
}

/** The caller's transaction must be scoped to the authenticated Pariwar — checked before any SQL. */
function assertScopeTxIsRequestScope(scopeTx: ScopeTx, pariwarId: ids.PariwarId): void {
  if (scopeTx.pariwarId.toLowerCase() !== pariwarId) {
    throw new AttributionPariwarScopeMismatchError(pariwarId, scopeTx.pariwarId);
  }
}

/** Resolve a 6-digit code to its holder in the request's Pariwar, as of a named capture or now (Story 13.8's signup). */
export async function resolveAttributionForRequest(
  request: FastifyRequest,
  scopeTx: ScopeTx,
  options: { code: string; asOf: attributionCode.AttributionAsOf },
): Promise<ids.FieldWorkerId | null> {
  const { pariwarId } = authenticatedScope(request);
  assertScopeTxIsRequestScope(scopeTx, pariwarId);
  return attributionCode.resolveAttribution(scopeTx.client, { code: options.code, pariwarId, asOf: options.asOf });
}

/** The code a field worker holds in the request's Pariwar (Story 13.3's "my code"; 13.1). */
export async function readAttributionCodeForRequest(
  request: FastifyRequest,
  scopeTx: ScopeTx,
  options: { fieldWorkerId: ids.FieldWorkerId },
): Promise<{ code: string; allocatedAt: Date } | null> {
  const { pariwarId } = authenticatedScope(request);
  assertScopeTxIsRequestScope(scopeTx, pariwarId);
  return attributionCode.readAttributionCodeForFieldWorker(scopeTx.client, { pariwarId, fieldWorkerId: options.fieldWorkerId });
}

/** Allocate the field worker's permanent code in the request's Pariwar, in the caller's transaction (Story 13.1). */
export async function allocateAttributionCodeForRequest(
  request: FastifyRequest,
  scopeTx: ScopeTx,
  options: { fieldWorkerId: ids.FieldWorkerId },
  opts?: { maxAttempts?: number },
): Promise<attributionCode.AllocatedAttributionCode> {
  const { pariwarId } = authenticatedScope(request);
  assertScopeTxIsRequestScope(scopeTx, pariwarId);
  // A FRESH options object — ⛔ the caller's `opts` forwarded (it could carry the test-only `generate`, AT9).
  return attributionCode.allocateAttributionCode(
    scopeTx.client,
    { pariwarId, fieldWorkerId: options.fieldWorkerId },
    { maxAttempts: opts?.maxAttempts },
  );
}

/** The request Pariwar's allocation flags, newest first (Story 13.4's trustee surface — render `actorDisplay`, C3). */
export async function listAllocationFlagsForRequest(
  request: FastifyRequest,
  scopeTx: ScopeTx,
  options: { limit?: number },
): Promise<attributionCode.AttributionCodeAllocationFlagView[]> {
  const { pariwarId } = authenticatedScope(request);
  assertScopeTxIsRequestScope(scopeTx, pariwarId);
  return attributionCode.listAllocationFlags(scopeTx.client, { pariwarId, limit: options.limit });
}

/**
 * Flag an exhausted allocation for trustee review in its OWN transaction, committed whatever happens to the request's (the
 * registration that failed rolls back — C1). The actor is the authenticated one; their display name is resolved server-side
 * BEFORE the transaction opens. Unset actor ⇒ loud 500; no display name ⇒ `AdminDisplayNameMissingError` and ⛔ row.
 */
export async function flagAllocationExhaustedForRequest(
  deps: AppDeps,
  request: FastifyRequest,
  options: { attempts: number },
): Promise<ids.AttributionCodeFlagId> {
  const { pariwarId, actorId } = authenticatedScope(request);
  if (actorId === undefined || actorId === '') {
    throw new Error('[attribution-code-access] no authenticated actor');
  }
  const actorDisplay = await getDisplayName(deps.pool, actorId);
  if (actorDisplay === null) throw new AdminDisplayNameMissingError(actorId);
  const scopeTx = await openScopeTx(deps, pariwarId);
  try {
    const flagId = await attributionCode.flagAllocationExhausted(scopeTx.client, {
      pariwarId,
      attempts: options.attempts,
      actorId: ids.userId(actorId),
      actorDisplay,
    });
    await closeScopeTx(scopeTx, true);
    return flagId;
  } catch (err) {
    await closeScopeTx(scopeTx, false);
    throw err;
  }
}
