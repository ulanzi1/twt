// The attribution-code ALLOCATOR — Story 13.2 (Task 4; AC4; AT3 / AT4 / AT6 / AT9).
//
// Runs in the CALLER's scoped transaction (Story 13.1's "Add Field Worker", through the API door) and opens none: a nested
// `db.transaction()` would COMMIT the caller's tx early (TR1) — hence raw SAVEPOINT SQL per attempt, the shape of
// `telegram-opt-in/write.ts` `createPendingOptIn`. Per attempt: draw → (an injected `generate` only) format / deny-list check →
// skip a candidate a member already TYPED in this Pariwar (AT4 — those strings predate every holder) → INSERT under a savepoint.
// A 23505 is matched by CONSTRAINT NAME (⛔ any 23505): the code's own unique ⇒ redraw; the worker's unique ⇒
// `FieldWorkerAlreadyHasAttributionCodeError`; anything else is rethrown. ⛔ Event (AT10 — the append-only row IS the record).

import { and, eq, sql } from 'drizzle-orm';
import type pg from 'pg';

import { bindScopedDb } from '../db.js';
import type { AttributionCodeId, FieldWorkerId, PariwarId } from '../ids/index.js';
import { uniqueViolationConstraint } from '../marketplace/errors.js';
import { fieldWorkerAttributionCodes } from '../schema/field_worker_attribution_codes.js';
import { memberAttribution } from '../schema/member_attribution.js';
import { ATTRIBUTION_CODE_PATTERN, generateAttributionCode, isDenylistedAttributionCode } from './code.js';
import {
  AttributionCodeAllocationExhaustedError,
  FieldWorkerAlreadyHasAttributionCodeError,
  InvalidAttributionCodeError,
} from './errors.js';
import { assertTxBoundScope } from './tx-guard.js';

/** The default number of draws before the allocator gives up and the caller flags it (AT6 — eight clashes at 10⁴ codes ≈ 10⁻¹⁶). */
export const ATTRIBUTION_CODE_MAX_ATTEMPTS = 8;

const MAX_ATTEMPTS_CEILING = 32;
const PARIWAR_CODE_UQ = 'field_worker_attribution_codes_pariwar_code_uq';
const FIELD_WORKER_UQ = 'field_worker_attribution_codes_field_worker_uq';

export interface AllocateAttributionCodeInput {
  pariwarId: PariwarId;
  fieldWorkerId: FieldWorkerId;
}

export interface AllocateAttributionCodeOptions {
  /** Draws before giving up — an integer in 1..32 (default `ATTRIBUTION_CODE_MAX_ATTEMPTS`). */
  maxAttempts?: number;
  /** TEST SEAM ONLY (AT9) — forces clashes. The API door does ⛔ forward it; the reach fence fails any non-test caller. */
  generate?: () => string;
}

export interface AllocatedAttributionCode {
  attributionCodeId: AttributionCodeId;
  code: string;
  allocatedAt: Date;
  /** The 1-based draw that succeeded (stored as `allocation_attempts`). */
  attempts: number;
}

/**
 * Allocate the field worker's one permanent code in the Pariwar.
 *
 * @throws RangeError                                 `maxAttempts` is not an integer in 1..32 (⛔ statement sent).
 * @throws AttributionCodeRequiresTransactionError / PariwarScopeMissingError / InvalidPariwarScopeError /
 *         AttributionPariwarScopeMismatchError      the handle or its scope (`assertTxBoundScope`).
 * @throws InvalidAttributionCodeError                an injected `generate` returned a malformed or deny-listed code.
 * @throws FieldWorkerAlreadyHasAttributionCodeError  the worker already holds a code (⛔ retried).
 * @throws AttributionCodeAllocationExhaustedError    every draw clashed — the caller flags it in its own tx and rethrows (C1).
 */
export async function allocateAttributionCode(
  client: pg.PoolClient,
  input: AllocateAttributionCodeInput,
  opts: AllocateAttributionCodeOptions = {},
): Promise<AllocatedAttributionCode> {
  // (0) PURE checks — ⛔ statement before them (AT8 v2 i ORDER, TR14).
  const maxAttempts = opts.maxAttempts ?? ATTRIBUTION_CODE_MAX_ATTEMPTS;
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > MAX_ATTEMPTS_CEILING) {
    throw new RangeError(`maxAttempts must be an integer in 1..${String(MAX_ATTEMPTS_CEILING)}`);
  }
  const generate = opts.generate ?? generateAttributionCode;

  // (1) One connection, in a transaction, scoped to this Pariwar.
  await assertTxBoundScope(client, input.pariwarId);
  const db = bindScopedDb(client);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const candidate = generate();
    if (!ATTRIBUTION_CODE_PATTERN.test(candidate)) throw new InvalidAttributionCodeError('format');
    if (isDenylistedAttributionCode(candidate)) throw new InvalidAttributionCodeError('denylisted');

    // AT4 — a code a member already typed in THIS Pariwar is never handed out (explicit `pariwar_id`: RLS is ⛔ the filter, TR3).
    const typed = await db
      .select({ one: sql<number>`1` })
      .from(memberAttribution)
      .where(and(eq(memberAttribution.pariwarId, input.pariwarId), eq(memberAttribution.attributionSource, candidate)))
      .limit(1);
    if (typed.length > 0) continue;

    await client.query('SAVEPOINT allocate_attribution_code');
    try {
      const inserted = await db
        .insert(fieldWorkerAttributionCodes)
        .values({
          pariwarId: input.pariwarId,
          fieldWorkerId: input.fieldWorkerId,
          code: candidate,
          allocationAttempts: attempt,
        })
        .returning({
          attributionCodeId: fieldWorkerAttributionCodes.attributionCodeId,
          code: fieldWorkerAttributionCodes.code,
          allocatedAt: fieldWorkerAttributionCodes.allocatedAt,
        });
      const row = inserted[0];
      if (!row) throw new Error('[allocateAttributionCode] insert returned no row — check session scope');
      await client.query('RELEASE SAVEPOINT allocate_attribution_code');
      return { ...row, attempts: attempt };
    } catch (err) {
      await client.query('ROLLBACK TO SAVEPOINT allocate_attribution_code');
      const constraint = uniqueViolationConstraint(err);
      if (constraint === PARIWAR_CODE_UQ) continue;
      if (constraint === FIELD_WORKER_UQ) {
        throw new FieldWorkerAlreadyHasAttributionCodeError(input.pariwarId, input.fieldWorkerId);
      }
      throw err;
    }
  }
  throw new AttributionCodeAllocationExhaustedError(input.pariwarId, maxAttempts);
}
