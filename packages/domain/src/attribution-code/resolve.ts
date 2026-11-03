// The ONE lookup by code + the holder read — Story 13.2 (Task 5; AC5 / AC6; AT2 / AT4 (c) / AT8 v2 i; I4 / I6 / I7).
//
// `resolveAttribution` is the ONLY export keyed by `code`, and it CANNOT be called without a Pariwar: the Pariwar is a required
// argument, must equal the connection's own scope (`assertTxBoundScope`), and is an explicit predicate in the SQL (RLS is ⛔ the
// filter — the owner role bypasses it, TR3). It returns the code's HOLDER, ⛔ the holder's eligibility (I6 — FR-85's
// "deactivated" is Story 13.1's state, applied by the caller, C2).
//
// ⭐ AT4 (c) — a code credits its holder only for a capture made AT OR AFTER its allocation (I7). The instant is NAMED, ⛔ passed:
// `{ captureId }` compares against that `member_attribution` row's persisted `captured_at`, read in the SAME statement; `'now'`
// against `clock_timestamp()`. Both comparisons run in Postgres on the stored `timestamptz` values at MICROSECOND precision —
// ⛔ JS `Date` (which keeps milliseconds) and ⛔ `date_trunc` anywhere in between.

import { and, eq } from 'drizzle-orm';
import type pg from 'pg';

import { UUID_REGEX, bindScopedDb } from '../db.js';
import type { FieldWorkerId, MemberAttributionId, PariwarId } from '../ids/index.js';
import { fieldWorkerAttributionCodes } from '../schema/field_worker_attribution_codes.js';
import { ATTRIBUTION_CODE_PATTERN } from './code.js';
import { AttributionCaptureMismatchError, InvalidAttributionCodeError } from './errors.js';
import { assertTxBoundScope } from './tx-guard.js';

/** The instant a code must have been allocated by: a named capture's `captured_at`, or the database's clock now. */
export type AttributionAsOf = { captureId: MemberAttributionId } | 'now';

export interface ResolveAttributionInput {
  code: string;
  pariwarId: PariwarId;
  asOf: AttributionAsOf;
}

/** `asOf` is exactly `'now'` or `{ captureId: <uuid> }`; returns the capture id, or null for `'now'`. */
function parseAsOf(asOf: unknown): string | null {
  if (asOf === 'now') return null;
  if (typeof asOf === 'object' && asOf !== null && !Array.isArray(asOf)) {
    const keys = Object.keys(asOf);
    const captureId = (asOf as { captureId?: unknown }).captureId;
    if (keys.length === 1 && keys[0] === 'captureId' && typeof captureId === 'string' && UUID_REGEX.test(captureId)) {
      return captureId;
    }
  }
  throw new TypeError("asOf must be 'now' or { captureId: <member_attribution id> }");
}

/**
 * Resolve a code to its holder in the Pariwar, as of a named capture or now.
 *
 * @returns the holder, or null when the code is un-held in the Pariwar or was allocated only AFTER the `asOf` instant.
 * @throws InvalidAttributionCodeError        `code` is not six ASCII digits (⛔ statement sent).
 * @throws TypeError                          `asOf` is neither form (⛔ statement sent).
 * @throws AttributionCodeRequiresTransactionError / PariwarScopeMissingError / InvalidPariwarScopeError /
 *         AttributionPariwarScopeMismatchError the handle or its scope (`assertTxBoundScope`).
 * @throws AttributionCaptureMismatchError    `{ captureId }` names no capture in the Pariwar, or a capture of another code.
 */
export async function resolveAttribution(
  client: pg.PoolClient,
  input: ResolveAttributionInput,
): Promise<FieldWorkerId | null> {
  // (0) PURE checks (AT8 v2 i ORDER, TR14).
  if (typeof input.code !== 'string' || !ATTRIBUTION_CODE_PATTERN.test(input.code)) {
    throw new InvalidAttributionCodeError('format');
  }
  const captureId = parseAsOf(input.asOf);

  // (1) One connection, in a transaction, scoped to this Pariwar.
  await assertTxBoundScope(client, input.pariwarId);

  // (2) ONE statement. `'now'`: the DB clock in that statement.
  if (captureId === null) {
    const { rows } = await client.query<{ field_worker_id: FieldWorkerId }>(
      `SELECT fwac.field_worker_id
         FROM field_worker_attribution_codes fwac
        WHERE fwac.pariwar_id = $1::uuid AND fwac.code = $2 AND fwac.allocated_at <= clock_timestamp()`,
      [input.pariwarId, input.code],
    );
    return rows[0]?.field_worker_id ?? null;
  }

  // `{ captureId }`: DRIVEN FROM the capture (a LEFT JOIN) so "no such capture" (0 rows) and "not held / held only later"
  // (a row with a NULL holder) stay distinguishable — an INNER JOIN would return 0 rows for both.
  const { rows } = await client.query<{ code_match: boolean; field_worker_id: FieldWorkerId | null }>(
    `SELECT ma.attribution_source = $2 AS code_match, fwac.field_worker_id
       FROM member_attribution ma
       LEFT JOIN field_worker_attribution_codes fwac
         ON fwac.pariwar_id = $1::uuid AND fwac.code = $2 AND fwac.allocated_at <= ma.captured_at
      WHERE ma.attribution_id = $3::uuid AND ma.pariwar_id = $1::uuid`,
    [input.pariwarId, input.code, captureId],
  );
  const row = rows[0];
  if (!row || !row.code_match) throw new AttributionCaptureMismatchError(input.pariwarId, captureId);
  return row.field_worker_id;
}

export interface ReadAttributionCodeForFieldWorkerInput {
  pariwarId: PariwarId;
  fieldWorkerId: FieldWorkerId;
}

/**
 * The code a field worker holds in the Pariwar — the read Story 13.3's "my code" screen and Story 13.1 use instead of a code
 * column on `field_workers` (AT2). Null when the worker holds none here.
 */
export async function readAttributionCodeForFieldWorker(
  client: pg.PoolClient,
  input: ReadAttributionCodeForFieldWorkerInput,
): Promise<{ code: string; allocatedAt: Date } | null> {
  await assertTxBoundScope(client, input.pariwarId);
  const rows = await bindScopedDb(client)
    .select({ code: fieldWorkerAttributionCodes.code, allocatedAt: fieldWorkerAttributionCodes.allocatedAt })
    .from(fieldWorkerAttributionCodes)
    .where(
      and(
        eq(fieldWorkerAttributionCodes.pariwarId, input.pariwarId),
        eq(fieldWorkerAttributionCodes.fieldWorkerId, input.fieldWorkerId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}
