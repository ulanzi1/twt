// The versioned custom-field definitions registry — Story 10.12 (Task 4; AC1/AC2/AC3).
//
// The Story 10.1 `helpdesk_routing_policy_versions` / Story 10.8 `feature_flag_versions` registry
// posture applied to TENANT-authored field shapes: publishing INSERTs a new version row; prior rows
// are NEVER mutated except the `superseded_by_version` forward-pointer. NO HTTP, NO auth (those live
// at the Task 6 admin routes); runs on the CALLER's transaction; the typed
// `CustomFieldDefinitionConflictError` is the 409 seam.
//
// ── ⭐ THIS MODULE IS THE SOLE SANCTIONED WRITER, AND THAT IS MECHANIZED ────────────────────────────
// `scripts/custom-field-governance/` leg (b) asserts that `insert(pariwarCustomFieldDefinitions)`
// appears ONLY in this file. That is not bookkeeping: `publishDefinitionVersion` is where the
// frozen-governance fence, the naked-PII detector, the PII-tier gate and the cardinality bound all
// run. An INSERT anywhere else bypasses all four in one move, while every existing test stays green.
// If you need a second write path, you need a review — not an allowlist entry.
//
// ── NO CODE-RESIDENT DEFAULT (story D2) ────────────────────────────────────────────────────────────
// Unlike BOTH precedents there is no `DEFAULT_CUSTOM_FIELD_SET` and no `DEFAULT_*_VERSION`. Those
// registries need a default because they must always resolve to something; a Pariwar with no
// custom-field definitions has NO CUSTOM FIELDS, which is a perfectly good state with no document to
// represent. Versions start at 1; zero rows resolves to an empty frozen set.
//
// ── IN FORCE IS BY INSTANT, NOT BY "LATEST ROW" (AC1) ──────────────────────────────────────────────
// `definitionsInForce(db, pariwarId, hostEntity, at)` selects, per `field_key`, the row with the
// greatest `effective_at <= at` (tie-broken by `desc(version)`), and excludes rows retired at or
// before `at`. Resolving by "latest row" instead would make a point-in-time replay return a
// definition that had not yet been published when the value was written.

import { and, asc, desc, eq, inArray, lte, sql } from 'drizzle-orm';
import { createHash } from 'node:crypto';

import { canonicalJsonStringify } from '../canonical-json.js';
import type { Db } from '../db.js';
import type { PariwarCustomFieldDefinitionId, PariwarId, UserId } from '../ids/index.js';
import { clampLimit } from '../pagination.js';
import {
  pariwarCustomFieldDefinitions,
  type CustomFieldDefinitionJson,
  type PariwarCustomFieldDefinitionRow,
} from '../schema/pariwar_custom_field_definitions.js';
import {
  CustomFieldCardinalityExceededError,
  CustomFieldDefinitionConflictError,
  CustomFieldDefinitionNotFoundError,
  CustomFieldEffectiveAtOutOfOrderError,
} from './errors.js';
import { CUSTOM_FIELD_DEFINITIONS_MAX_PER_PARIWAR } from './limits.js';
import type { CustomFieldHostEntity } from './types.js';
import { assertCompatibleRedefinition, validateCustomFieldDefinition, type InForceDefinition } from './validate.js';

/** The single-row lookup bound. A fixed, non-caller-supplied limit, still routed through `clampLimit`
 *  because the `domain-accessor-invariants` gate reads a bare or named `.limit()` as unclamped
 *  regardless of provenance (the exact Story 10.7 miss). */
const DEFINITION_LOOKUP_LIMIT = 1;

/** The list bound for a Pariwar's definition history. Sized above the cardinality ceiling so a full
 *  in-force set plus its version history is never silently truncated mid-page. */
const DEFINITION_LIST_CAP = 1000;

/** True iff `err` (or its wrapped cause) is a Postgres unique-violation (23505).
 *  ⚠ Check BOTH: with this pg/drizzle pairing the code frequently hides on `err.cause.code`. */
function isUniqueViolation(err: unknown): boolean {
  const direct = (err as { code?: string }).code;
  const cause = (err as { cause?: { code?: string } }).cause?.code;
  return direct === '23505' || cause === '23505';
}

/**
 * DB-authoritative "now" — never `new Date()`, which is the application server's clock and subject to
 * skew across instances.
 *
 * ⚠ `db.execute()` returns RAW driver rows, NOT drizzle-decoded ones: `now()` comes back as a STRING
 * (`'2026-08-06 11:05:45.901628+00'`), never a Date. Typing it `<{ now: Date }>` and using it
 * directly compiles fine and then fails at RUNTIME inside drizzle's timestamp encoder
 * (`value.toISOString is not a function`) — and only on the path where the caller omits
 * `effectiveAt`, which a suite that always passes it would never catch. Coerce explicitly. (Story
 * 10.8 hit exactly this; `helpdesk/registry.ts` still carries the latent version.)
 */
async function dbNow(db: Db): Promise<Date> {
  const result = await db.execute<{ now: string | Date }>(sql`select now() as now`);
  const raw = result.rows[0]?.now;
  if (raw instanceof Date) return raw;
  return raw ? new Date(raw) : new Date();
}

/** One in-force definition row, resolved. */
export interface InForceCustomFieldDefinition extends InForceDefinition {
  id: PariwarCustomFieldDefinitionId;
  effectiveAt: Date;
}

/**
 * Resolve the definition set IN FORCE for `(pariwarId, hostEntity)` at instant `at` (AC1).
 *
 * Per `field_key`: the row with the greatest `effective_at <= at`, tie-broken by `desc(version)`.
 * Rows whose `retired_at <= at` are EXCLUDED from the in-force set — a retired field governs no new
 * writes. (Its stored values stay readable; that is `readMemberCustomFields`'s concern, not this one.)
 *
 * Returns a FROZEN array, sorted by `field_key`, so the caller cannot mutate a resolved set and so
 * `definitionSetVersion` over it is deterministic. Runs on the caller's scoped transaction.
 */
export async function definitionsInForce(
  db: Db,
  pariwarId: PariwarId,
  hostEntity: CustomFieldHostEntity,
  at: Date,
): Promise<readonly InForceCustomFieldDefinition[]> {
  // ⭐ [Review][Patch] `DISTINCT ON (field_key)`, computed by Postgres over the FULL matching row set —
  // not the "fetch a fixed-size page, then fold the winner in TS" shape this function shipped with.
  // That shape had a real bug: `ORDER BY field_key ASC, …` then `.limit(DEFINITION_LIST_CAP)` truncates
  // the candidate rows BEFORE folding, so once a Pariwar's TOTAL historical row count for this host
  // (unbounded — retiring and republishing the same 32-field ceiling churns rows forever; only the
  // IN-FORCE count is bounded) exceeded the cap, alphabetically-late field_keys could be silently
  // dropped from the in-force set entirely — not just from a display list, from the set member-value
  // writes are validated against. The prior comment's "bounded by the cardinality ceiling times its
  // version history" was the flawed premise: version history is exactly the unbounded factor.
  // `db.selectDistinctOn` is drizzle's native, typed builder (no raw-`sql` escape hatch, no manual
  // 42P10 risk) as long as `ORDER BY` leads with the same expression as `DISTINCT ON` — it does here.
  const rows = await db
    .selectDistinctOn([pariwarCustomFieldDefinitions.fieldKey])
    .from(pariwarCustomFieldDefinitions)
    .where(
      and(
        eq(pariwarCustomFieldDefinitions.pariwarId, pariwarId),
        eq(pariwarCustomFieldDefinitions.hostEntity, hostEntity),
        lte(pariwarCustomFieldDefinitions.effectiveAt, at),
      ),
    )
    .orderBy(
      asc(pariwarCustomFieldDefinitions.fieldKey),
      desc(pariwarCustomFieldDefinitions.effectiveAt),
      desc(pariwarCustomFieldDefinitions.version),
    );

  const winners = new Map<string, PariwarCustomFieldDefinitionRow>();
  for (const row of rows) {
    // DISTINCT ON already yields exactly one (the governing) row per field_key.
    winners.set(row.fieldKey, row);
  }

  const out: InForceCustomFieldDefinition[] = [];
  for (const row of winners.values()) {
    // ⚠ Retirement is evaluated AS OF `at`, not as of now: a field retired last week was still in
    // force for a value written the month before, and a replay must see it that way.
    if (row.retiredAt !== null && row.retiredAt.getTime() <= at.getTime()) continue;
    out.push({
      id: row.id,
      fieldKey: row.fieldKey,
      version: row.version,
      definition: row.definition,
      retiredAt: row.retiredAt,
      effectiveAt: row.effectiveAt,
    });
  }
  out.sort((a, b) => (a.fieldKey < b.fieldKey ? -1 : a.fieldKey > b.fieldKey ? 1 : 0));
  return Object.freeze(out);
}

/**
 * ⭐ The REPLAY PIN written onto a member row's envelope: a deterministic hash over the in-force
 * `(field_key, version)` pairs (AC1).
 *
 * A value written under one definition set can be re-validated against exactly that set, rather than
 * against whatever is in force when someone later asks. Without it a retirement, a widened enum or a
 * newly-required field silently rewrites the meaning of history.
 *
 * Deterministic by construction: the pairs are sorted by `field_key` and serialized with
 * `canonicalJsonStringify` (RFC 8785), never bare `JSON.stringify` — key order in a JS object is
 * insertion order, so a set assembled in a different order would otherwise hash differently while
 * meaning the same thing.
 */
export function definitionSetVersion(
  definitions: readonly { fieldKey: string; version: number }[],
): string {
  const pairs = [...definitions]
    .map((d) => [d.fieldKey, d.version] as const)
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const canonical = canonicalJsonStringify(pairs.map(([k, v]) => ({ field_key: k, version: v })));
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

/** Fetch one exact `(pariwarId, hostEntity, fieldKey, version)` row — the replay/audit path. Returns
 *  `null` when that version does not exist. */
export async function definitionVersion(
  db: Db,
  pariwarId: PariwarId,
  hostEntity: CustomFieldHostEntity,
  fieldKey: string,
  version: number,
): Promise<PariwarCustomFieldDefinitionRow | null> {
  const rows = await db
    .select()
    .from(pariwarCustomFieldDefinitions)
    .where(
      and(
        eq(pariwarCustomFieldDefinitions.pariwarId, pariwarId),
        eq(pariwarCustomFieldDefinitions.hostEntity, hostEntity),
        eq(pariwarCustomFieldDefinitions.fieldKey, fieldKey),
        eq(pariwarCustomFieldDefinitions.version, version),
      ),
    )
    .limit(clampLimit(DEFINITION_LOOKUP_LIMIT, { default: DEFINITION_LOOKUP_LIMIT, cap: DEFINITION_LOOKUP_LIMIT }));
  return rows[0] ?? null;
}

/**
 * ⭐ [Review][Patch] Fetch the FULL rows for an exact set of definition ids — the complete wire shape
 * for `definitionsInForce`'s result (which carries only the columns the resolver needs, not
 * `hostEntity`/`authoredByActor`/`actorDisplay`/`supersededByVersion`/`createdAt`).
 *
 * Bounded by the CARDINALITY ceiling (`CUSTOM_FIELD_DEFINITIONS_MAX_PER_PARIWAR`, ≤32), not by a
 * history-page window — the caller this exists for (`listDefinitions`) used to rebuild in-force wire
 * rows by looking them up inside a `HISTORY_LIMIT`-capped version-history page, so an in-force
 * definition could silently disappear from the response once a Pariwar's total historical row count
 * exceeded that cap. Looking up exactly the in-force ids has no such ceiling to exceed.
 */
export async function definitionRowsByIds(
  db: Db,
  pariwarId: PariwarId,
  hostEntity: CustomFieldHostEntity,
  ids: readonly PariwarCustomFieldDefinitionId[],
): Promise<PariwarCustomFieldDefinitionRow[]> {
  if (ids.length === 0) return [];
  return db
    .select()
    .from(pariwarCustomFieldDefinitions)
    .where(
      and(
        eq(pariwarCustomFieldDefinitions.pariwarId, pariwarId),
        eq(pariwarCustomFieldDefinitions.hostEntity, hostEntity),
        inArray(pariwarCustomFieldDefinitions.id, ids),
      ),
    )
    .limit(
      clampLimit(ids.length, {
        default: CUSTOM_FIELD_DEFINITIONS_MAX_PER_PARIWAR,
        cap: CUSTOM_FIELD_DEFINITIONS_MAX_PER_PARIWAR,
      }),
    );
}

/** Every version row for a Pariwar + host, newest first — the admin history list (AC8). */
export async function listDefinitionVersions(
  db: Db,
  pariwarId: PariwarId,
  hostEntity: CustomFieldHostEntity,
  limit?: number,
): Promise<PariwarCustomFieldDefinitionRow[]> {
  return db
    .select()
    .from(pariwarCustomFieldDefinitions)
    .where(
      and(
        eq(pariwarCustomFieldDefinitions.pariwarId, pariwarId),
        eq(pariwarCustomFieldDefinitions.hostEntity, hostEntity),
      ),
    )
    .orderBy(
      asc(pariwarCustomFieldDefinitions.fieldKey),
      desc(pariwarCustomFieldDefinitions.version),
    )
    .limit(clampLimit(limit, { default: DEFINITION_LIST_CAP, cap: DEFINITION_LIST_CAP }));
}

/** How many definitions are IN FORCE for a Pariwar + host at `at` — the cardinality-bound input.
 *  Counts in-force fields, not rows: version history and retired fields do not consume the budget,
 *  because retiring a field is precisely how a Pariwar makes room for another. */
export async function countDefinitions(
  db: Db,
  pariwarId: PariwarId,
  hostEntity: CustomFieldHostEntity,
  at: Date,
): Promise<number> {
  return (await definitionsInForce(db, pariwarId, hostEntity, at)).length;
}

export interface PublishDefinitionVersionInput {
  pariwarId: PariwarId;
  hostEntity: CustomFieldHostEntity;
  /** The tenant-authored field shape. Its `field_key` IS the identity — validated, fenced, pinned. */
  definition: CustomFieldDefinitionJson;
  /** The version's effective instant. Defaults to DB now(). */
  effectiveAt?: Date;
  /** Non-null retires the field AS OF that instant. Set by `retireDefinition`, not by ordinary
   *  publishes. A ROW COLUMN, never a key inside `definition` — see the schema header. */
  retiredAt?: Date | null;
  /**
   * WHO authored it. REQUIRED, not optional: `null` means a system/seed write and must be passed
   * EXPLICITLY. The 10.8 lesson — a required property turns an omission into a COMPILE error at every
   * call site, and the 0095 append-only trigger makes a row with a forgotten actor unfixable.
   */
  authoredByActor: UserId | null;
  /** The authoring admin's `users.display_name`, SNAPSHOT at publish time. Required and explicit for
   *  the same reason; the API handler blocks the publish when it is missing rather than falling back
   *  ([[project_admin_display_name_attribution]]). */
  actorDisplay: string | null;
  /** The PRE-GENERATED audit anchor (the Story 2.4 pattern). The audit LINE itself is the CALLER's
   *  obligation — the narrow-write posture. Pass `null` explicitly for a write with no anchor. */
  auditId: string | null;
  /** Optional caller-supplied row id (defaults to DB gen_random_uuid()). */
  id?: PariwarCustomFieldDefinitionId;
}

/**
 * ⭐ Publish the next version of a custom-field definition (AC1/AC2/AC3).
 *
 * Order of operations, and every step is load-bearing:
 *   1. VALIDATE the body — and, inside that, run the FENCE and the naked-PII detector first. A
 *      forbidden key must be refused before anything about it is read, counted or stored.
 *   2. Resolve the in-force set (one query, reused for the cardinality bound).
 *   3. Resolve the MOST RECENT row ever published under this key — retired or not.
 *   4. ⭐ [Review][Patch] If this key has ANY prior row (step 3), assert the redefinition is COMPATIBLE
 *      (AC2 "no silent renames": type immutable, enum widening only) — checked against the prior row
 *      REGARDLESS of retired status. Checking only the in-force row (as originally shipped) let a
 *      retire-then-republish of the same key silently change its `field_type`/narrow its
 *      `enum_values`, even though historically-stored member values were written under the old,
 *      now-incompatible shape and stay readable during the deprecation window.
 *   5. Enforce the cardinality bound — only for a key NOT currently in force; republishing an
 *      already-in-force key does not grow the set, and refusing a retirement because the Pariwar is
 *      at its ceiling would be an absurd deadlock (retirement is the only way down). Un-retiring a key
 *      (republishing over a retired one) DOES grow the in-force count and is correctly bound here.
 *   6. DB-authoritative clock; reject an out-of-order `effective_at`.
 *   7. INSERT `.returning()`; a 23505 is the 409 seam; an empty return is the RLS-silent-filter guard.
 *   8. Point the PRIOR latest row's `superseded_by_version` forward — the only mutable column.
 *
 * Runs on the CALLER's transaction, so steps 6 and 7 are atomic with respect to any observer (AC1's
 * "in the same transaction" requirement).
 *
 * @throws CustomFieldFrozenGovernanceKeyError | CustomFieldNakedPiiKeyError |
 *   CustomFieldPiiTierUnsupportedError | CustomFieldLabelParityRequiredError |
 *   CustomFieldDefinitionInvalidError — from validation.
 * @throws CustomFieldIncompatibleRedefinitionError — an incompatible second version of a key.
 * @throws CustomFieldCardinalityExceededError — the §1.7 bound.
 * @throws CustomFieldEffectiveAtOutOfOrderError | CustomFieldDefinitionConflictError.
 */
export async function publishDefinitionVersion(
  db: Db,
  input: PublishDefinitionVersionInput,
): Promise<PariwarCustomFieldDefinitionRow> {
  // (1) Validate + FENCE. Throws before anything is read or written.
  validateCustomFieldDefinition(input.definition, input.hostEntity);

  const fieldKey = input.definition.field_key;
  const now = await dbNow(db);
  const effectiveAt = input.effectiveAt ?? now;

  // (2) The in-force set as of the moment this version takes effect — the right instant for the
  // cardinality bound (a field retired before `effectiveAt` is genuinely not in the set this version
  // joins).
  const inForce = await definitionsInForce(db, input.pariwarId, input.hostEntity, effectiveAt);
  const existing = inForce.find((d) => d.fieldKey === fieldKey);

  // (3) The prior LATEST row for this key (across ALL instants and statuses — retired included, NOT
  // just in-force) — the version counter, the supersession target, AND the AC2 compatibility-check
  // basis. Retired and future rows count here: the version sequence is per key and must never reuse a
  // number, whatever the row's status.
  const priorRows = await db
    .select({
      version: pariwarCustomFieldDefinitions.version,
      effectiveAt: pariwarCustomFieldDefinitions.effectiveAt,
      definition: pariwarCustomFieldDefinitions.definition,
    })
    .from(pariwarCustomFieldDefinitions)
    .where(
      and(
        eq(pariwarCustomFieldDefinitions.pariwarId, input.pariwarId),
        eq(pariwarCustomFieldDefinitions.hostEntity, input.hostEntity),
        eq(pariwarCustomFieldDefinitions.fieldKey, fieldKey),
      ),
    )
    .orderBy(desc(pariwarCustomFieldDefinitions.version))
    .limit(clampLimit(DEFINITION_LOOKUP_LIMIT, { default: DEFINITION_LOOKUP_LIMIT, cap: DEFINITION_LOOKUP_LIMIT }));
  const priorRow = priorRows[0];

  // (4) ⭐ [Review][Patch] AC2 — no silent renames / no narrowing. Checked against the most recent row
  // EVER published under this key, regardless of retired status — `existing` (in-force only) was the
  // wrong basis: it let a retire-then-republish of the same key skip this check entirely.
  if (priorRow) assertCompatibleRedefinition(priorRow.definition, input.definition);

  // (5) The §1.7 cardinality bound — for a key not currently IN FORCE. See the doc comment above.
  if (!existing && inForce.length >= CUSTOM_FIELD_DEFINITIONS_MAX_PER_PARIWAR) {
    throw new CustomFieldCardinalityExceededError(inForce.length, CUSTOM_FIELD_DEFINITIONS_MAX_PER_PARIWAR);
  }

  const priorVersion = priorRow?.version ?? null;
  // Versions start at 1 — no code default owns version 1 here (story D2).
  const nextVersion = (priorVersion ?? 0) + 1;

  // Reject a publish whose effectiveAt precedes this key's latest existing version: it would make the
  // creation-order supersession chain disagree with effective_at-based resolution, so the row the
  // chain calls "latest" would not be the row `definitionsInForce` returns.
  if (priorRow && effectiveAt.getTime() < priorRow.effectiveAt.getTime()) {
    throw new CustomFieldEffectiveAtOutOfOrderError(fieldKey, effectiveAt, priorRow.effectiveAt);
  }

  // (6) INSERT.
  let inserted: PariwarCustomFieldDefinitionRow | undefined;
  try {
    const rows = await db
      .insert(pariwarCustomFieldDefinitions)
      .values({
        id: input.id ?? undefined,
        pariwarId: input.pariwarId,
        hostEntity: input.hostEntity,
        fieldKey,
        version: nextVersion,
        definition: input.definition,
        effectiveAt,
        retiredAt: input.retiredAt ?? null,
        authoredByActor: input.authoredByActor,
        actorDisplay: input.actorDisplay,
        auditId: input.auditId,
      })
      .returning();
    inserted = rows[0];
  } catch (err) {
    if (isUniqueViolation(err)) throw new CustomFieldDefinitionConflictError(fieldKey, nextVersion);
    throw err;
  }
  if (!inserted) {
    // Under RLS a missing scope silently filters the INSERT to 0 rows — surface it rather than return
    // a phantom (the addPoolName / createRoutingPolicyVersion / createFlagVersion precedent).
    throw new Error(
      '[publishDefinitionVersion] INSERT returned no row — check the tx has app.pariwar_id scope set',
    );
  }

  // (7) Point the prior latest row forward — the ONLY legitimately-mutable column, and the only
  // UPDATE the 0095 append-only trigger permits.
  if (priorVersion !== null) {
    await db
      .update(pariwarCustomFieldDefinitions)
      .set({ supersededByVersion: nextVersion })
      .where(
        and(
          eq(pariwarCustomFieldDefinitions.pariwarId, input.pariwarId),
          eq(pariwarCustomFieldDefinitions.hostEntity, input.hostEntity),
          eq(pariwarCustomFieldDefinitions.fieldKey, fieldKey),
          eq(pariwarCustomFieldDefinitions.version, priorVersion),
        ),
      );
  }

  return inserted;
}

export interface RetireDefinitionInput {
  pariwarId: PariwarId;
  hostEntity: CustomFieldHostEntity;
  fieldKey: string;
  /** When the retirement takes effect. Defaults to DB now(). */
  retiredAt?: Date;
  authoredByActor: UserId | null;
  actorDisplay: string | null;
  auditId: string | null;
}

/**
 * Retire a custom field (AC1).
 *
 * ⚠ A THIN WRAPPER OVER `publishDefinitionVersion`, DELIBERATELY. Retirement is a VERSION, not a
 * DELETE and not a status flip: it republishes the CURRENT in-force definition body byte-for-byte
 * with `retired_at` populated. Two consequences that are the whole point:
 *
 *   · The retired version's body is IDENTICAL to the body its stored values were written under, so a
 *     replay of those values against this version still validates. A retirement that also edited the
 *     shape would break exactly the history it was meant to close.
 *   · There is ONE writer, ONE audit shape and ONE fence invocation. A separate `retire` write path
 *     would be a second place for the fence to be forgotten — and it is the path least likely to be
 *     re-reviewed, because "we're only turning it off" reads as safe.
 *
 * @throws CustomFieldDefinitionNotFoundError when the field has no in-force definition to retire.
 */
export async function retireDefinition(
  db: Db,
  input: RetireDefinitionInput,
): Promise<PariwarCustomFieldDefinitionRow> {
  const at = input.retiredAt ?? (await dbNow(db));
  const inForce = await definitionsInForce(db, input.pariwarId, input.hostEntity, at);
  const current = inForce.find((d) => d.fieldKey === input.fieldKey);
  if (!current) throw new CustomFieldDefinitionNotFoundError(input.fieldKey, input.hostEntity);

  return publishDefinitionVersion(db, {
    pariwarId: input.pariwarId,
    hostEntity: input.hostEntity,
    // The CURRENT body, unchanged. See the doc comment.
    definition: current.definition,
    effectiveAt: at,
    retiredAt: at,
    authoredByActor: input.authoredByActor,
    actorDisplay: input.actorDisplay,
    auditId: input.auditId,
  });
}
