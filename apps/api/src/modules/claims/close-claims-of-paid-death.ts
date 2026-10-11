// Story 6.28 (`2026-10-11-318` Q1 A, `2026-10-11-319` OP4) — the API half of "the other open claims of a PAID death are
// closed", ONCE, for the sites that run it in their OWN transaction:
//   · H(i)  — the cycle commit's `postCommit`, once per distinct committed death (fresh commit OR replay);
//   · H(iv) — a final-writer handler whose writer was STOPPED by OP2 (`claim.DeathAlreadyFinallyApprovedError`), AFTER the
//             refused transaction is closed (Trap 14);
//   · OP14 (b) — the staff "Close this claim" action (`claims.cycle-freeze.handlers.ts`).
// Each opens its OWN scope transaction with a `lock_timeout`, reads ⛔ nothing of the claim in `request.scopeTx`, and takes
// the death's INTAKE key FIRST inside `claim.closeClaimsOfPaidDeath` (⛔ never from a transaction that already holds it —
// the helpline intake and the override write in the REQUEST transaction, committed only in `onSend`: Fact 5, Trap 2).
// H(i) / H(iv) failures are logged at error level with ids only and ⛔ never fail the request — the guard (OP2) is the
// control; a missed closure is R2 (recorded, ⛔ not addressed).

import { claim, ids } from '@twt/domain';
import type { FastifyBaseLogger } from 'fastify';

import type { AppDeps } from '../../context.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';

/** How long a closure waits on a lock before giving up (a timeout answers R2 / a retryable 503 — ⛔ never a hang). */
export const PAID_DEATH_CLOSURE_LOCK_TIMEOUT = '3s';

/** Postgres `lock_not_available` — what `lock_timeout` raises. */
const LOCK_NOT_AVAILABLE = '55P03';

export type PaidDeathClosureOutcome =
  | { readonly kind: 'done'; readonly result: claim.CloseClaimsOfPaidDeathResult; readonly deceasedMemberId: string }
  | { readonly kind: 'not_found' }
  | { readonly kind: 'lock_timeout' }
  | { readonly kind: 'failed' };

interface ClosureActor {
  readonly actor: claim.ClaimEventActor;
  readonly actorId: string;
}

async function inOwnTx<T>(deps: AppDeps, pariwarId: string, fn: (scope: Awaited<ReturnType<typeof openScopeTx>>) => Promise<T>): Promise<T> {
  const scope = await openScopeTx(deps, pariwarId);
  let ok = false;
  try {
    await scope.client.query(`SET LOCAL lock_timeout = '${PAID_DEATH_CLOSURE_LOCK_TIMEOUT}'`);
    const out = await fn(scope);
    ok = true;
    return out;
  } finally {
    await closeScopeTx(scope, ok);
  }
}

function isLockTimeout(err: unknown): boolean {
  return (err as { code?: unknown } | null)?.code === LOCK_NOT_AVAILABLE;
}

/**
 * Close the other open claims of `deceasedMemberId`'s death if its payment is committed — in its OWN transaction. H(i).
 * Never throws: a failure is logged (error, ids only) and answered `lock_timeout` / `failed`.
 */
export async function closeClaimsOfPaidDeathInOwnTx(
  deps: AppDeps,
  log: FastifyBaseLogger,
  input: ClosureActor & { readonly pariwarId: ids.PariwarId; readonly deceasedMemberId: ids.MemberId; readonly site: string },
): Promise<PaidDeathClosureOutcome> {
  try {
    const result = await inOwnTx(deps, input.pariwarId, (scope) =>
      claim.closeClaimsOfPaidDeath(scope.client, {
        pariwarId: input.pariwarId,
        deceasedMemberId: input.deceasedMemberId,
        actor: input.actor,
        actorId: input.actorId,
      }),
    );
    return { kind: 'done', result, deceasedMemberId: input.deceasedMemberId };
  } catch (err) {
    const timeout = isLockTimeout(err);
    log.error(
      { pariwar_id: input.pariwarId, deceased_member_id: input.deceasedMemberId, site: input.site, lock_timeout: timeout },
      'one payment per death: closing the other claims of a paid death failed — left to a later attempt (R2)',
    );
    return { kind: timeout ? 'lock_timeout' : 'failed' };
  }
}

/**
 * The same, keyed by ONE claim of the death (H(iv), "Close this claim"): reads the claim's immutable
 * `deceased_member_id` UNLOCKED in the SAME own transaction, before the intake key (the
 * `acquireSuspicionReversalLockForClaim` shape — the stop error carries ⛔ no member id). An unknown / other-Pariwar
 * claim (RLS-scoped) answers `not_found`. Never throws.
 */
export async function closeClaimsOfPaidDeathForClaim(
  deps: AppDeps,
  log: FastifyBaseLogger,
  input: ClosureActor & { readonly pariwarId: ids.PariwarId; readonly claimCaseId: ids.ClaimId; readonly site: string },
): Promise<PaidDeathClosureOutcome> {
  try {
    return await inOwnTx(deps, input.pariwarId, async (scope) => {
      const { rows } = await scope.client.query<{ deceased_member_id: string }>(
        'SELECT deceased_member_id FROM claims WHERE pariwar_id = $1 AND claim_case_id = $2 LIMIT 1',
        [input.pariwarId, input.claimCaseId],
      );
      const row = rows[0];
      if (!row) return { kind: 'not_found' } as const;
      const result = await claim.closeClaimsOfPaidDeath(scope.client, {
        pariwarId: input.pariwarId,
        deceasedMemberId: ids.memberId(row.deceased_member_id),
        actor: input.actor,
        actorId: input.actorId,
      });
      return { kind: 'done', result, deceasedMemberId: row.deceased_member_id } as const;
    });
  } catch (err) {
    const timeout = isLockTimeout(err);
    log.error(
      { pariwar_id: input.pariwarId, claim_case_id: input.claimCaseId, site: input.site, lock_timeout: timeout },
      'one payment per death: closing the claims of a paid death failed — left to a later attempt (R2)',
    );
    return { kind: timeout ? 'lock_timeout' : 'failed' };
  }
}

/**
 * ⭐ H(iv) — a final writer was refused: when (and only when) it was STOPPED by OP2, close the claim if the death's
 * payment is committed (a no-op while the other claim has only passed the vote). Run AFTER the refused transaction is
 * closed (Trap 14). ⛔ Never throws, ⛔ never changes the 409 the caller then answers.
 */
export async function closeClaimsAfterFinalStop(
  deps: AppDeps,
  log: FastifyBaseLogger,
  err: unknown,
  input: { readonly pariwarId: ids.PariwarId; readonly claimCaseId: ids.ClaimId; readonly actorId: string; readonly site: string },
): Promise<void> {
  if (!(err instanceof claim.DeathAlreadyFinallyApprovedError)) return;
  await closeClaimsOfPaidDeathForClaim(deps, log, { ...input, actor: 'system' });
}
