// The field-worker READ handlers — Story 13.1a (Tasks 7, 8; AD4, AD7, AD8, AD9; decision `-447` items 1, 3, 4; AC5–AC8).
//
//   · GET …/field-workers/districts              → the Pariwar's recorded districts (no key; not personal data)
//   · GET …/field-workers?state=&district=…       → a keyset page, NAMES decrypted (`field_worker.view`)
//   · GET …/field-workers/:fieldWorkerId          → one worker's identity, name + full mobile decrypted (`field_worker.view`)
//   · GET …/field-workers/:fieldWorkerId/code     → an ACTIVE worker's code, to read out to them (`field_worker.read_code`)
//
// ⭐ NOTHING IS RELEASED BEFORE A DURABLE, ACTOR-NAMING AUDIT LINE EXISTS (AD7, I5). Each read runs its decrypt / its door read as
// the `mutate` of ONE `audit.withCompensatingAudit` — the intent line is written first, in its own transaction, and a failed
// write throws before anything is decrypted or read (⛔ `emitAuthAudit`: fire-and-forget, TR8). A refusal made BEFORE the
// wrapper (a 409 `code_not_available`, a 409 `authorization_stale`, a 400 cursor) writes no line (13.1's convention).
// ⛔ A name, a mobile or a code in any audit field (action, locator, hash input), log line or error.
//
// ── The disclosed row is the row the gate covered (`-447` item 1 — review R2) ──────────────────────────────────────
// The per-worker gate read the worker's district on ONE statement (`gate.ts`); a move could commit before the read that
// discloses. So the IDENTITY read selects the sealed row QUALIFIED by the authorization's district (`getFieldWorkerSealedIdentity`)
// and the CODE read locks the row `FOR SHARE` (`lockFieldWorkerForCodeRead`) and re-checks both district and `active` on that
// locked row, writes the line, then reads the door on the SAME (hook) transaction — a suspend / terminate / move waits for it
// (review R3). A mismatch is 409 `field_worker.authorization_stale`, with no line and no read.
//
// ── Decrypt placement (AD9, TR7) ──────────────────────────────────────────────────────────────────────────────────
// The list and the identity read the CIPHERTEXT on the hook's transaction, then RELEASE it (`releaseHookTx`), then decrypt — a
// KMS round trip inside an open tenant transaction holds a pooled connection. The list decrypts at most 25 names with bounded
// concurrency (8); one failure fails the WHOLE response (503 key service / 500 unreadable — `-447` item 4), ⛔ a blank name.
// The list's line is written AFTER the page read and BEFORE any decrypt, and its locator names the page's worker ids
// (`-447` item 3 — review R7).

import type { FieldWorkerCodeResponse, FieldWorkerDistrictsResponse, FieldWorkerIdentityResponse, FieldWorkerListQuery, FieldWorkerListResponse } from '@twt/contracts';
import { audit, fieldWorker, ids } from '@twt/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { UnauthorizedError } from '../../http-errors.js';
import type { ScopeTx } from '../../types.js';
import { DIRECTORY_DECRYPT_CONCURRENCY, mapWithConcurrency } from '../kyc/bounded-decrypt.js';
import { readAttributionCodeForRequest } from './attribution-code-access.js';
import { codeNotAvailableError, mapFieldWorkerError } from './errors.js';
import { decryptFieldWorkerField } from './field-worker-crypto.js';
import { payloadHash, releaseHookTx } from './write-support.js';

/** The key the by-hand code read gates on (AD6) — `district_admin` (own district), `pariwar_admin` (any). */
export const FIELD_WORKER_READ_CODE_KEY = 'field_worker.read_code';
/** The key the list and the identity read gate on (AD6) — `district_admin` (own district), `pariwar_admin` (any). */
export const FIELD_WORKER_VIEW_KEY = 'field_worker.view';

function scopeOf(request: FastifyRequest): { scopeTx: ScopeTx; actorId: string; traceId: string | null } {
  const scopeTx = request.scopeTx;
  const actorId = request.requestContext.actorId;
  if (!scopeTx || !actorId) throw new UnauthorizedError('Authentication required', 'auth.session_required');
  return { scopeTx, actorId, traceId: request.requestContext.traceId ?? null };
}

/** The VERIFIED result the gate stored for `key` — ⛔ recomputed; a missing one is a route registered without its gate (500). */
function storedAuthorization(request: FastifyRequest, key: string) {
  const authorization = request.authorizations?.[key];
  if (authorization === undefined) throw new Error(`[field-worker] a read ran without the ${key} gate`);
  return authorization;
}

/** The gate's district for a per-worker route — always a string there (a `null` target was refused with 403). */
function gateDistrict(authorization: { target: { dimension: string; value: string | null } }): string {
  if (authorization.target.dimension !== 'district' || typeof authorization.target.value !== 'string') {
    throw new Error('[field-worker] a per-worker read was not gated at the district dimension');
  }
  return authorization.target.value;
}

export function createFieldWorkerReadHandlers(deps: AppDeps) {
  /** `GET …/field-workers/districts` (AC8) — session + a grant in this Pariwar; no key, no audit line (⛔ personal data). */
  async function districts(request: FastifyRequest): Promise<FieldWorkerDistrictsResponse> {
    const { scopeTx } = scopeOf(request);
    const at = (await scopeTx.client.query<{ now: Date }>('SELECT now() AS now')).rows[0]!.now;
    const r = await fieldWorker.listRecordedDistricts(scopeTx.tx, ids.pariwarId(scopeTx.pariwarId), at);
    return { districts: r.districts, districts_truncated: r.truncated };
  }

  /** `GET …/field-workers` (AC6) — a keyset page; one `field_worker.list_viewed` line per page, before any decrypt. */
  async function list(request: FastifyRequest, reply: FastifyReply) {
    const authorization = storedAuthorization(request, FIELD_WORKER_VIEW_KEY);
    const { scopeTx, actorId, traceId } = scopeOf(request);
    const q = request.query as FieldWorkerListQuery;
    try {
      // STRICT decode BEFORE any SQL (a failed cast would abort the transaction — AD10).
      const after = q.cursor === undefined ? undefined : fieldWorker.decodeFieldWorkerCursor(q.cursor);
      const limit = q.limit ?? fieldWorker.PAGE_FIELD_WORKERS_DEFAULT_LIMIT;
      const page = await fieldWorker.pageFieldWorkersForPariwar(scopeTx.tx, ids.pariwarId(scopeTx.pariwarId), {
        state: q.state,
        ...(q.district === undefined ? {} : { district: q.district }),
        ...(after === undefined ? {} : { after }),
        limit,
      });
      const pariwarId = scopeTx.pariwarId;
      await releaseHookTx(request);
      const out = await audit.withCompensatingAudit(deps.servicePool, {
        auditIntent: {
          pariwarId,
          actorId,
          actorRole: authorization.role,
          action: 'field_worker.list_viewed',
          // `-447` item 3 — WHICH workers the officer saw: the page's ids in page order (≤ 25 UUIDs ≈ 940 characters < 1,024).
          resourceLocator: `field_workers/${page.items.map((i) => i.view.fieldWorkerId).join(',')}`,
          // ⛔ `undefined` anywhere in the shape (`canonicalJsonStringify` throws on it — one constant hash); the cursor is in so two
          // pages of one filter differ. Not personal data.
          requestPayloadHash: payloadHash({ state: q.state, district: q.district ?? null, limit, cursor: q.cursor ?? null }),
          traceId,
        },
        mutate: async (): Promise<FieldWorkerListResponse> => {
          const names = await mapWithConcurrency(page.items, DIRECTORY_DECRYPT_CONCURRENCY, (i) =>
            decryptFieldWorkerField(i.nameCiphertext, pariwarId, deps.encryption),
          );
          return {
            items: page.items.map((i, n) => ({
              field_worker_id: i.view.fieldWorkerId,
              name: names[n]!,
              district: i.view.district,
              current_state: i.view.currentState,
              kyc_status: i.view.kycStatus,
              registered_by_display: i.view.registeredByDisplay,
              created_at: i.view.createdAt.toISOString(),
            })),
            next_cursor: page.nextCursor,
          };
        },
      });
      return reply.header('Cache-Control', 'no-store').send(out);
    } catch (err) {
      return mapFieldWorkerError(err);
    }
  }

  /** `GET …/field-workers/:fieldWorkerId` (AC7) — the identity; one `field_worker.identity_viewed` line before the decrypt. */
  async function identity(request: FastifyRequest, reply: FastifyReply) {
    const authorization = storedAuthorization(request, FIELD_WORKER_VIEW_KEY);
    const district = gateDistrict(authorization);
    const { scopeTx, actorId, traceId } = scopeOf(request);
    const fieldWorkerId = ids.fieldWorkerId((request.params as { fieldWorkerId: string }).fieldWorkerId);
    try {
      // `-447` item 1 — the row disclosed is the row still in the district the gate passed (ONE statement).
      const sealed = await fieldWorker.getFieldWorkerSealedIdentity(scopeTx.tx, ids.pariwarId(scopeTx.pariwarId), fieldWorkerId, { district });
      if (sealed === null) throw new fieldWorker.FieldWorkerAuthorizationStaleError(fieldWorkerId, district);
      const pariwarId = scopeTx.pariwarId;
      await releaseHookTx(request);
      const out = await audit.withCompensatingAudit(deps.servicePool, {
        auditIntent: {
          pariwarId,
          actorId,
          actorRole: authorization.role,
          action: 'field_worker.identity_viewed',
          resourceLocator: `field_worker/${fieldWorkerId}`,
          requestPayloadHash: payloadHash({ field_worker_id: fieldWorkerId, district }),
          traceId,
        },
        mutate: async (): Promise<FieldWorkerIdentityResponse> => {
          const name = await decryptFieldWorkerField(sealed.nameCiphertext, pariwarId, deps.encryption);
          const mobile = await decryptFieldWorkerField(sealed.mobileCiphertext, pariwarId, deps.encryption);
          const v = sealed.view;
          return {
            field_worker_id: v.fieldWorkerId,
            name,
            district: v.district,
            current_state: v.currentState,
            kyc_status: v.kycStatus,
            registered_by_display: v.registeredByDisplay,
            created_at: v.createdAt.toISOString(),
            mobile,
            approved_by_display: sealed.approvedByDisplay,
          };
        },
      });
      return reply.header('Cache-Control', 'no-store').send(out);
    } catch (err) {
      return mapFieldWorkerError(err);
    }
  }

  /** `GET …/field-workers/:fieldWorkerId/code` (AC5) — only while `active`; one `field_worker.code_read` line before the read. */
  async function readCode(request: FastifyRequest, reply: FastifyReply) {
    const authorization = storedAuthorization(request, FIELD_WORKER_READ_CODE_KEY);
    const district = gateDistrict(authorization);
    const { scopeTx, actorId, traceId } = scopeOf(request);
    const fieldWorkerId = ids.fieldWorkerId((request.params as { fieldWorkerId: string }).fieldWorkerId);
    try {
      // `-447` item 1 — locked FOR SHARE on the hook's transaction until the request ends: the door is read on the same one.
      const row = await fieldWorker.lockFieldWorkerForCodeRead(scopeTx.tx, ids.pariwarId(scopeTx.pariwarId), fieldWorkerId);
      if (row === null || row.district !== district) throw new fieldWorker.FieldWorkerAuthorizationStaleError(fieldWorkerId, district);
      // AD8 / I1 — no code before approval, none while suspended or ended. ⛔ An audit line, ⛔ a door call (TR1).
      if (row.currentState !== 'active') throw codeNotAvailableError(row.currentState);
      const out = await audit.withCompensatingAudit(deps.servicePool, {
        auditIntent: {
          pariwarId: scopeTx.pariwarId,
          actorId,
          actorRole: authorization.role,
          action: 'field_worker.code_read',
          resourceLocator: `field_worker/${fieldWorkerId}`,
          requestPayloadHash: payloadHash({ field_worker_id: fieldWorkerId, district }),
          traceId,
        },
        mutate: async (): Promise<FieldWorkerCodeResponse> => {
          const held = await readAttributionCodeForRequest(request, scopeTx, { fieldWorkerId });
          if (held === null) {
            // An integrity fault — registration allocates the code in the worker's own transaction (G1). ⛔ A made-up code.
            throw new Error('[field-worker] an active worker has no attribution code');
          }
          return { field_worker_id: fieldWorkerId, code: held.code };
        },
      });
      return reply.header('Cache-Control', 'no-store').send(out);
    } catch (err) {
      return mapFieldWorkerError(err);
    }
  }

  return { districts, list, identity, readCode };
}
