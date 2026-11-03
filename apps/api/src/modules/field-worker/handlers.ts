// The field-worker registration handler — Story 13.1 (Task 7; QE9, QE17, QE18, QE22; AC8, AC13). The FIRST production
// caller of the field-worker primitive AND of Story 13.2's attribution-code registry (through the door, C1).
//
// ── THE WRITE: 12.2's `tenantWrite` SHAPE, copied unchanged (`module.*` → `field_worker.*`) ───────────────────
//   `requireIdempotencyKey` → `releaseHookTx` (commit + detach the hook's READ tx — TR7) → `withIdempotency` (claim; a replay
//   returns the RECORDED result; a failure RELEASES the key — TR9) → `openScopeTx` (bare BEGIN = READ COMMITTED; `SET LOCAL
//   ROLE twt_app`) → `run` inside `try` → `finally { closeScopeTx(false) }` (a no-op once committed) → `mapFieldWorkerError`.
// `run`, in order (QE9): mint the id → the CONTENT rules (422 name / mobile — after the guards, before any KMS call) → the
//   admin's `display_name` (absent ⇒ 409, ⛔ fallback, BEFORE any write) → `assertDistrictRecorded` at the transaction's own
//   `now()` (422 — BEFORE the KMS calls, so an unlisted district costs no encrypt) → seal name + mobile and the mobile index
//   (the transaction is open and idle meanwhile — accepted) → the duplicate-mobile PRE-CHECK (409, ⛔ audit line) →
//   `audit.withCompensatingAudit` whose `mutate` runs `registerFieldWorker` THEN `allocateAttributionCodeForRequest` on the
//   SAME transaction and COMMITS inside `mutate` (I11 — both or neither).
// Exhaustion: the door's re-exported class is caught by `instanceof`; the flag wrapper (its OWN committed transaction) is tried
//   and a failing flag write is logged by SQLSTATE only and SWALLOWED; the ORIGINAL exhaustion error is rethrown ⇒ the
//   `_rolled_back` audit line, the rollback, 503.
//
// ── What leaves this handler (I8, QE22) ─────────────────────────────────────────────────────────────────────────
// The 201 is `{ field_worker_id, district, current_state, kyc_status }` — ⛔ the code (allocated here, read only after approval
// by Story 13.1a / 13.1b), ⛔ a name, ⛔ a mobile. The audit intent's `resourceLocator` is `field_worker/<id>`, its `hashShape`
// `{ field_worker_id, district }` (a SHA-256 of a 10-digit mobile can be brute-forced), its `actorRole` the VERIFIED
// authorization's role — the object the gate stored, passed on unchanged and ⛔ recomputed (QE18, TR13). The district is ⛔
// trimmed or normalised: the gate compared the raw body bytes and the command refuses a genesis whose district differs from the
// authorization's target (TR12).

import { createHash, randomUUID } from 'node:crypto';

import type { RegisterFieldWorkerRequest, RegisterFieldWorkerResponse } from '@twt/contracts';
import { audit, canonicalJsonStringify, encryption, fieldWorker, idempotency, ids, marketplace } from '@twt/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { AdminDisplayNameMissingError, ApiError, BadRequestError, ConflictError, UnauthorizedError } from '../../http-errors.js';
import type { ScopeTx } from '../../types.js';
import { getDisplayName } from '../auth/admin/admin-auth.repo.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';
import {
  AttributionCodeAllocationExhaustedError,
  allocateAttributionCodeForRequest,
  flagAllocationExhaustedForRequest,
} from './attribution-code-access.js';
import { mapFieldWorkerError } from './errors.js';
import { sealFieldWorkerIdentity } from './field-worker-crypto.js';

const IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60;

/** The ONE permission key this surface gates on (QE10, catalog v59). ⚠ Also the genesis event's `trigger` value. */
export const FIELD_WORKER_REGISTER_KEY = 'field_worker.register';

/** A worker's name, as stored (QE9): NFC, trimmed, 1–120 characters. */
export const FIELD_WORKER_NAME_MAX_LENGTH = 120;

/** True iff `s` holds a UTF-16 surrogate without its pair (`String.prototype.isWellFormed` is ES2024 — the lib is ES2022). */
function hasUnpairedSurrogate(s: string): boolean {
  for (let i = 0; i < s.length; i += 1) {
    const unit = s.charCodeAt(i);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = s.charCodeAt(i + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      i += 1; // a well-formed pair
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return true;
    }
  }
  return false;
}

/**
 * The name's CONTENT rule (QE9) — `null` when it fails: NFC-normalised and trimmed; 1–120 characters (code points); no
 * control character (NUL included) and no unpaired surrogate. ⛔ Logged or echoed anywhere.
 */
export function normalizeFieldWorkerName(raw: string): string | null {
  if (hasUnpairedSurrogate(raw)) return null;
  const name = raw.normalize('NFC').trim();
  const length = [...name].length;
  if (length < 1 || length > FIELD_WORKER_NAME_MAX_LENGTH) return null;
  if (/\p{Cc}/u.test(name)) return null;
  return name;
}

// TOTAL (12.2 review RP10): an unencodable shape hashes to a fixed marker, ⛔ a throw while the audit intent is built.
function payloadHash(shape: Record<string, unknown>): string {
  let canonical: string;
  try {
    canonical = canonicalJsonStringify(shape);
  } catch {
    canonical = canonicalJsonStringify({ unhashable: true });
  }
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

export function createFieldWorkerHandlers(deps: AppDeps) {
  const idempotencyStore = idempotency.createKeyedStore(deps.pool);

  function requireIdempotencyKey(request: FastifyRequest): string {
    const raw = request.headers['idempotency-key'];
    const key = typeof raw === 'string' ? raw.trim() : '';
    if (key === '' || key.length > 200) throw new BadRequestError('An Idempotency-Key header is required', 'field_worker.idempotency_key_required');
    return key;
  }

  /** The scope-resolution hook's READ transaction ends BEFORE the write opens its own (the 12.2 copy). */
  async function releaseHookTx(request: FastifyRequest): Promise<void> {
    const hookTx = request.scopeTx;
    if (!hookTx?.scopeSet) return;
    hookTx.scopeSet = false;
    await closeScopeTx(hookTx, true).catch(() => undefined);
    // Detached, so nothing later in this request can reach a client that is back in the pool.
    request.scopeTx = undefined;
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

  interface WriteCtx {
    readonly scopeTx: ScopeTx;
    readonly pariwarId: string;
    readonly actorId: string;
    readonly traceId: string | null;
  }

  /**
   * A tenant write: claim → its own scope transaction → `run` (pre-checks, then the audited mutation) → ROLLBACK if `run`
   * did not COMMIT. `namespace` builds the key's prefix (TR8 — the store is global, so tenant operations are namespaced).
   */
  async function tenantWrite<T>(
    request: FastifyRequest,
    namespace: (pariwarId: string, actorId: string) => string,
    run: (ctx: WriteCtx) => Promise<T>,
  ): Promise<T> {
    const scopeTx0 = request.scopeTx;
    const actorId = request.requestContext.actorId;
    if (!scopeTx0 || !actorId) throw new UnauthorizedError('Authentication required', 'auth.session_required');
    const pariwarId = scopeTx0.pariwarId;
    const traceId = request.requestContext.traceId ?? null;
    const key = requireIdempotencyKey(request);
    await releaseHookTx(request);
    return withIdempotency(`${namespace(pariwarId, actorId)}:${key}`, async () => {
      const scopeTx = await openScopeTx(deps, pariwarId);
      try {
        return await run({ scopeTx, pariwarId, actorId, traceId });
      } catch (err) {
        return mapFieldWorkerError(err);
      } finally {
        await closeScopeTx(scopeTx, false); // a no-op once the mutation committed
      }
    });
  }

  /** `POST /api/v1/p/:pariwarId/field-workers` — register a worker and allocate their code in ONE transaction (QE9). */
  async function register(request: FastifyRequest, reply: FastifyReply) {
    const body = request.body as RegisterFieldWorkerRequest;
    // The VERIFIED result the gate stored (QE18) — passed on unchanged; ⛔ recomputed from `request.scopeGrants`.
    const authorization = request.authorizations?.[FIELD_WORKER_REGISTER_KEY];
    if (authorization === undefined) {
      // Programming error — the route was registered without its `requirePermissionHook`. Fail loud (500).
      throw new Error('[field-worker] register ran without the field_worker.register gate');
    }
    const out = await tenantWrite(
      request,
      (p, a) => `field_worker.register:${p}:${a}`,
      async (ctx): Promise<RegisterFieldWorkerResponse> => {
        const pariwarId = ids.pariwarId(ctx.pariwarId);
        const fieldWorkerId = ids.fieldWorkerId(randomUUID());

        // CONTENT rules (422) — after the guards, inside the claim, before any KMS call.
        const name = normalizeFieldWorkerName(body.name);
        if (name === null) throw new ApiError(422, 'field_worker.name_invalid', 'The name is not valid');
        const mobileE164 = encryption.normalizeMobile(body.mobile);
        if (mobileE164 === null) throw new ApiError(422, 'field_worker.mobile_invalid', 'The mobile number is not a valid Indian mobile number');

        // 6.11 R5 — the stored attribution; ⛔ fallback, BEFORE any write or audit line (G11).
        const registeredByDisplay = await getDisplayName(deps.pool, ctx.actorId);
        if (registeredByDisplay === null) throw new AdminDisplayNameMissingError(ctx.actorId);

        // QE17 — a LISTED district at THIS transaction's now(), compared byte for byte; BEFORE the KMS calls.
        const at = (await ctx.scopeTx.client.query<{ now: Date }>('SELECT now() AS now')).rows[0]!.now;
        await fieldWorker.assertDistrictRecorded(ctx.scopeTx.tx, pariwarId, body.district, at);

        const sealed = await sealFieldWorkerIdentity({ name, mobileE164 }, ctx.pariwarId, deps.encryption);

        // The duplicate-mobile PRE-CHECK (⛔ audit line on a refusal); the concurrent loser is caught by the index, by name.
        const live = await fieldWorker.findLiveFieldWorkerByMobileIndex(ctx.scopeTx.tx, pariwarId, sealed.mobileBlindIndex);
        if (live !== null) throw new fieldWorker.FieldWorkerMobileAlreadyRegisteredError(ctx.pariwarId);

        return audit.withCompensatingAudit(deps.servicePool, {
          auditIntent: {
            pariwarId: ctx.pariwarId,
            actorId: ctx.actorId,
            actorRole: authorization.role,
            action: 'field_worker.registered',
            resourceLocator: `field_worker/${fieldWorkerId}`,
            requestPayloadHash: payloadHash({ field_worker_id: fieldWorkerId, district: body.district }),
            traceId: ctx.traceId,
          },
          mutate: async ({ auditId }) => {
            const genesis = await fieldWorker.registerFieldWorker(ctx.scopeTx.client, {
              pariwarId,
              fieldWorkerId,
              auditId,
              actor: 'operator',
              actorId: ctx.actorId,
              nameCiphertext: sealed.nameCiphertext,
              mobileCiphertext: sealed.mobileCiphertext,
              mobileBlindIndex: sealed.mobileBlindIndex,
              registeredByDisplay,
              district: body.district,
              authorization,
            });
            try {
              // The SAME transaction (I11). The returned code is ⛔ copied anywhere (QE22).
              await allocateAttributionCodeForRequest(request, ctx.scopeTx, { fieldWorkerId });
            } catch (err) {
              if (err instanceof AttributionCodeAllocationExhaustedError) {
                try {
                  await flagAllocationExhaustedForRequest(deps, request, { attempts: err.attempts });
                } catch (flagErr) {
                  console.error('[field-worker] exhaustion flag failed', { code: marketplace.pgSqlstateOf(flagErr) });
                }
              }
              throw err; // the ORIGINAL error — ⇒ `_rolled_back`, the rollback, 503 for an exhaustion
            }
            await closeScopeTx(ctx.scopeTx, true); // COMMIT — inside `mutate`, so a failed COMMIT writes the compensating line
            return {
              field_worker_id: fieldWorkerId,
              district: body.district,
              current_state: genesis.state,
              kyc_status: genesis.kycStatus,
            };
          },
        });
      },
    );
    return reply.code(201).send(out);
  }

  return { register };
}
