// The field-worker surface's keyed-write helpers — Story 13.1a (Task 5.1), EXTRACTED from Story 13.1's `handlers.ts` with NO
// behaviour change (13.1's `field-worker-handler-identity.test.ts` and `registration*.spec.ts` run unedited against it).
//
// ── THE WRITE: 12.2's `tenantWrite` SHAPE (`module.*` → `field_worker.*`), with ONE variance — 13.1 review R3 ──────────
//   `requireIdempotencyKey` → `releaseHookTx` (commit + detach the hook's READ tx — TR7) → `withIdempotency` (claim; a replay
//   returns the RECORDED result; a failure RELEASES the key — TR9) → `prepare` (⚠ the variance: NO transaction is open yet)
//   → `openScopeTx` (bare BEGIN = READ COMMITTED; `SET LOCAL ROLE twt_app`) → `run` inside `try` → `finally { closeScopeTx(false) }`
//   (a no-op once committed) → `mapFieldWorkerError`.
// The key is `${namespace(pariwarId, actorId)}:${key}` — the store keys on the STRING only and keeps ⛔ body fingerprint (13.1
// TR15), so a write with no body (13.1a's approval) puts the worker id in its namespace (13.1a TR6).

import { createHash } from 'node:crypto';

import { canonicalJsonStringify, idempotency } from '@twt/domain';
import type { FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { BadRequestError, ConflictError, UnauthorizedError } from '../../http-errors.js';
import type { ScopeTx } from '../../types.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';
import { mapFieldWorkerError } from './errors.js';

const IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60;

// TOTAL (12.2 review RP10): an unencodable shape hashes to a fixed marker, ⛔ a throw while the audit intent is built.
export function payloadHash(shape: Record<string, unknown>): string {
  let canonical: string;
  try {
    canonical = canonicalJsonStringify(shape);
  } catch {
    canonical = canonicalJsonStringify({ unhashable: true });
  }
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

/** The scope-resolution hook's READ transaction ends BEFORE the write (or the KMS calls) opens its own (the 12.2 copy). */
export async function releaseHookTx(request: FastifyRequest): Promise<void> {
  const hookTx = request.scopeTx;
  if (!hookTx?.scopeSet) return;
  hookTx.scopeSet = false;
  await closeScopeTx(hookTx, true).catch(() => undefined);
  // Detached, so nothing later in this request can reach a client that is back in the pool.
  request.scopeTx = undefined;
}

export interface WriteCtx {
  readonly scopeTx: ScopeTx;
  readonly pariwarId: string;
  readonly actorId: string;
  readonly traceId: string | null;
}

/** What `prepare` sees: no transaction exists yet, so no `scopeTx`. */
export type PrepareCtx = Omit<WriteCtx, 'scopeTx' | 'traceId'>;

export function createFieldWorkerWriteSupport(deps: AppDeps) {
  const idempotencyStore = idempotency.createKeyedStore(deps.pool);

  function requireIdempotencyKey(request: FastifyRequest): string {
    const raw = request.headers['idempotency-key'];
    const key = typeof raw === 'string' ? raw.trim() : '';
    if (key === '' || key.length > 200) throw new BadRequestError('An Idempotency-Key header is required', 'field_worker.idempotency_key_required');
    return key;
  }

  /** Claim the key; a replay returns the RECORDED response; a claim with ⛔ result yet is 409 in progress. */
  async function withIdempotency<T>(idemKey: string, run: () => Promise<T>): Promise<T> {
    const outcome = await idempotencyStore.claim(idemKey, IDEMPOTENCY_TTL_SECONDS);
    if (outcome === 'already_claimed') {
      const stored = await idempotencyStore.getResult(idemKey);
      if (stored !== null) return stored as T;
      throw new ConflictError('A request with this Idempotency-Key is already in progress — please wait and retry', 'field_worker.idempotency_in_progress');
    }
    let settled = false;
    try {
      const out = await run();
      await idempotencyStore.recordResult(idemKey, (out ?? { done: true }) as unknown as Record<string, unknown>);
      settled = true;
      return out;
    } finally {
      if (!settled) await idempotencyStore.release(idemKey).catch(() => undefined);
    }
  }

  /**
   * A tenant write: claim → `prepare` (NO transaction open — review R3) → its own scope transaction → `run` (pre-checks, then
   * the audited mutation) → ROLLBACK if `run` did not COMMIT. `namespace` builds the key's prefix (TR8 — the store is global,
   * so tenant operations are namespaced). What `prepare` returns is handed to `run`.
   */
  async function tenantWrite<T, Pre>(
    request: FastifyRequest,
    namespace: (pariwarId: string, actorId: string) => string,
    prepare: (ctx: PrepareCtx) => Promise<Pre>,
    run: (ctx: WriteCtx, pre: Pre) => Promise<T>,
  ): Promise<T> {
    const scopeTx0 = request.scopeTx;
    const actorId = request.requestContext.actorId;
    if (!scopeTx0 || !actorId) throw new UnauthorizedError('Authentication required', 'auth.session_required');
    const pariwarId = scopeTx0.pariwarId;
    const traceId = request.requestContext.traceId ?? null;
    const key = requireIdempotencyKey(request);
    await releaseHookTx(request);
    return withIdempotency(`${namespace(pariwarId, actorId)}:${key}`, async () => {
      let pre: Pre;
      try {
        pre = await prepare({ pariwarId, actorId });
      } catch (err) {
        return mapFieldWorkerError(err);
      }
      const scopeTx = await openScopeTx(deps, pariwarId);
      try {
        return await run({ scopeTx, pariwarId, actorId, traceId }, pre);
      } catch (err) {
        return mapFieldWorkerError(err);
      } finally {
        await closeScopeTx(scopeTx, false); // a no-op once the mutation committed
      }
    });
  }

  return { tenantWrite };
}
