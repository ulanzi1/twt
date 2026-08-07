// The `members.custom_fields` read/write path — Story 10.12 (Task 5; AC6, story D6).
//
// The ONE place tenant-authored custom-field VALUES are written. Validates every supplied key against
// the Pariwar's in-force definition set, enforces the AC5 limit classes, stamps the
// `definition_set_version` replay pin, and writes with the plain scoped UPDATE shape from
// `member/lock-in.ts:82`.
//
// ── ⭐ NO PROJECTOR GUARD, AND THAT IS CORRECT (AC6) ────────────────────────────────────────────────
// The migration-0018 `app.member_state_writer` trigger fires ONLY when `state` / `state_event_version`
// change. This write touches neither, so it is a plain in-scope-tx UPDATE with no session variable and
// no `member-state-invariant` allowlist entry — exactly `setLockInDaysAtJoin`'s shape. The gate scans
// for `.update(members).set({ state })`; `{ customFields }` is not that, and making it look like that
// would be the mistake.
//
// ── ⚠ `members` IS A CERTIFIED PII-FREE TABLE ──────────────────────────────────────────────────────
// (`member_identities.ts`: "The `members` table stays PII-FREE (Story 3.1 — it is the lifecycle
// anchor)".) Hanging tenant-authored data on it is the single most likely review objection to this
// story, and the mitigation is STRUCTURAL rather than a promise: every definition declares `pii_tier`,
// v1 accepts only 3, and a naked-PII key/label detector catches mis-declaration — all three enforced
// at DEFINITION time, in `validateCustomFieldDefinition` + `frozen-governance.ts`, so no value can
// reach this column under a field that never passed them.
//
// ── D6: UNKNOWN KEYS FAIL, THEY ARE NEVER DROPPED ──────────────────────────────────────────────────
// A member write carrying a key with no in-force definition FAILS. The tempting alternative — silently
// ignore unknown keys — turns a client bug into invisible data loss, and turns a retired field into a
// value that vanishes without anyone being told. This is the JSONB analogue of the `.strict()` rule
// the contracts layer already applies everywhere. It is not negotiable. (A retired field's STORED
// values remain readable — the §1.7 deprecation window; only new writes are refused.)

import { and, eq, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { MemberId, PariwarId } from '../ids/index.js';
import { clampLimit } from '../pagination.js';
import { members } from '../schema/members.js';
import { CUSTOM_FIELDS_GIN_INDEX_BUDGET_BYTES } from './limits.js';
import { definitionSetVersion, definitionsInForce } from './registry.js';
import {
  normalizeEnvelope,
  type CustomFieldHostEntity,
  type CustomFieldValue,
  type MemberCustomFieldsJson,
} from './types.js';
import { validateCustomFieldValues } from './validate.js';

/** Custom fields hang off members in v1. Named rather than inlined so the claims/pools extension
 *  (story D7) is a parameter change, not a search-and-replace. */
const MEMBER_HOST: CustomFieldHostEntity = 'member';

const MEMBER_LOOKUP_LIMIT = 1;

export interface SetMemberCustomFieldsInput {
  pariwarId: PariwarId;
  memberId: MemberId;
  /** The COMPLETE value set for this member. Not a patch — see the doc comment on the function. */
  values: Record<string, unknown>;
  /** The PRE-GENERATED audit anchor. The audit LINE is the CALLER's obligation (narrow-write posture). */
  auditId: string | null;
  /** The instant the write is evaluated at. Defaults to DB now(). Injected for replay/tests. */
  at?: Date;
}

/**
 * DB-authoritative "now". See `registry.ts`'s `dbNow` for why `db.execute` needs the string coercion.
 */
async function dbNow(db: Db): Promise<Date> {
  const result = await db.execute<{ now: string | Date }>(sql`select now() as now`);
  const raw = result.rows[0]?.now;
  if (raw instanceof Date) return raw;
  return raw ? new Date(raw) : new Date();
}

/**
 * Write a member's custom-field values (AC6).
 *
 * ⚠ THIS IS A WHOLE-SET REPLACE, NOT A PATCH, and the choice is deliberate. A merge semantics would
 * make "clear this field" unexpressible without a sentinel, and would mean a client holding a stale
 * definition set could leave a retired field's value in place forever by simply not mentioning it. A
 * replace makes the written envelope exactly what the caller asserted, which is also what makes the
 * `definition_set_version` pin meaningful: the pin describes the WHOLE stored set, not a fragment.
 * Callers that want to change one field read, modify, and write back.
 *
 * Order of operations:
 *   1. Resolve the in-force definition set at `at`.
 *   2. Validate: every key known, none retired, each value conforming, all required keys present,
 *      payload within the byte and depth limits (AC5 classes 1 and 2).
 *   3. Stamp the envelope with `definition_set_version` + `written_at`.
 *   4. Plain scoped UPDATE — the `setLockInDaysAtJoin` shape.
 *
 * ⚠ THE WHERE CLAUSE CARRIES `pariwar_id` EXPLICITLY, even though RLS already scopes the transaction.
 * Belt and braces on the one table where a mis-scoped write would attach one Pariwar's tenant-authored
 * data to another Pariwar's member — and RLS protects the row, not the caller's argument, so a wrong
 * `memberId` from the caller is a bug RLS cannot see.
 *
 * @throws CustomFieldValuesInvalidError | CustomFieldPayloadTooLargeError | CustomFieldNestingTooDeepError
 * @throws Error when the member does not exist in this Pariwar's scope.
 */
export async function setMemberCustomFields(
  db: Db,
  input: SetMemberCustomFieldsInput,
): Promise<MemberCustomFieldsJson> {
  const at = input.at ?? (await dbNow(db));

  // (1) The in-force set at `at`.
  const inForce = await definitionsInForce(db, input.pariwarId, MEMBER_HOST, at);

  // (2) Validate — strict unknown-key rejection, per-type conformance, limits. Throws on any problem.
  validateCustomFieldValues(input.values, inForce);

  // (3) The envelope, with the replay pin.
  const envelope: MemberCustomFieldsJson = {
    definition_set_version: definitionSetVersion(inForce),
    written_at: at.toISOString(),
    values: input.values as Record<string, CustomFieldValue>,
  };

  // (4) The plain scoped UPDATE (`member/lock-in.ts:82`). No `state` touched → no 0018 guard needed.
  const updated = await db
    .update(members)
    .set({ customFields: envelope, updatedAt: at })
    .where(and(eq(members.memberId, input.memberId), eq(members.pariwarId, input.pariwarId)))
    .returning({ memberId: members.memberId });

  if (updated.length === 0) {
    // Under RLS a missing scope silently filters the UPDATE to 0 rows — surface it rather than report
    // a phantom success (the publishDefinitionVersion / addPoolName precedent).
    throw new Error(
      `[setMemberCustomFields] UPDATE matched no row for member ${input.memberId} — the member does ` +
        'not exist in this Pariwar, or the tx has no app.pariwar_id scope set',
    );
  }

  return envelope;
}

/**
 * Read a member's custom-field envelope.
 *
 * ⚠ Returns the STORED values verbatim, including values for fields since RETIRED — that is §1.7's
 * deprecation window ("old fields supported in readers until a deprecation window closes"), and it is
 * why retirement is a version rather than a delete. Filtering retired fields out here would make a
 * retirement retroactively erase data the member supplied in good faith.
 *
 * Always normalizes through {@link normalizeEnvelope}: the column DEFAULT is a bare `'{}'`, so a
 * member who has never had a custom-field write has no `values` key at all.
 */
export async function readMemberCustomFields(
  db: Db,
  pariwarId: PariwarId,
  memberId: MemberId,
): Promise<MemberCustomFieldsJson | null> {
  const rows = await db
    .select({ customFields: members.customFields })
    .from(members)
    .where(and(eq(members.memberId, memberId), eq(members.pariwarId, pariwarId)))
    .limit(clampLimit(MEMBER_LOOKUP_LIMIT, { default: MEMBER_LOOKUP_LIMIT, cap: MEMBER_LOOKUP_LIMIT }));

  const row = rows[0];
  if (!row) return null;
  return normalizeEnvelope(row.customFields);
}

/** The observed GIN-index size against its budget (AC5 limit class 3). */
export interface GinIndexBudgetReading {
  indexName: string;
  bytes: number;
  budgetBytes: number;
  /** True when the observed size has crossed the alarm threshold. */
  overBudget: boolean;
}

/**
 * Read the `members_custom_fields_gin_idx` size from `pg_relation_size` and compare it to
 * `CUSTOM_FIELDS_GIN_INDEX_BUDGET_BYTES` (AC5 limit class 3).
 *
 * ⚠ AN OBSERVED SIGNAL, NOT A WRITE-TIME CHECK, and the distinction is the whole design. Checking an
 * index's size on every row write would put a catalog read on a hot path to enforce a bound that moves
 * in AGGREGATE, not per row — the check would be wrong at the only moment it mattered (a bulk import)
 * and expensive at every moment it did not. This is surfaced for AR-31 observability; §1.7's
 * "write-rate limit when approached" is a separate mechanism and is NOT built (ESCALATION 3).
 *
 * ⚠ The index is repo-global, not per-Pariwar — Postgres has one index over the whole `members` table.
 * The budget is expressed per-Pariwar because that is how §1.7 frames it, so on a multi-tenant
 * deployment this reading is the SUM across tenants and the threshold should be read as an aggregate
 * alarm, not a per-tenant attribution. Per-Pariwar attribution would need the partial functional
 * indexes described in `per-pariwar/<id>/index-inventory.ts`, which do not exist at v1.
 */
export async function ginIndexBytes(db: Db): Promise<GinIndexBudgetReading> {
  const indexName = 'members_custom_fields_gin_idx';
  const result = await db.execute<{ bytes: string | number | null }>(
    sql`select pg_relation_size(to_regclass('public.members_custom_fields_gin_idx')) as bytes`,
  );
  const raw = result.rows[0]?.bytes;
  // `pg_relation_size` returns bigint → a STRING through the pg driver; and `to_regclass` returns
  // NULL (→ a NULL size) when the index does not exist, which is a legitimate pre-migration state
  // rather than an error.
  const bytes = raw === null || raw === undefined ? 0 : Number(raw);
  return {
    indexName,
    bytes,
    budgetBytes: CUSTOM_FIELDS_GIN_INDEX_BUDGET_BYTES,
    overBudget: bytes > CUSTOM_FIELDS_GIN_INDEX_BUDGET_BYTES,
  };
}
