// The custom-field VOCABULARY — Story 10.12 (Task 3; AC2).
//
// A bounded declarative form, never an expression language. This module is the code authority for
// what a tenant may say; `packages/contracts/src/custom-fields/` mirrors it on the wire and a
// sync-guard test pins the two equal.
//
// ── WHY A FIXED TUPLE, IN THE feature_flag_versions.ts WORDS ───────────────────────────────────────
// "A FIXED enum, deliberately: it is what keeps the predicate a BOUNDED declarative form rather than
// an expression language." And: "NEVER an expression language: no JSONLogic, no eval, no mini-DSL."
// The same discipline applies with more force here, because the author of a custom field is a TENANT
// rather than a trustee. Seven scalar types and four bounds is the whole vocabulary. A request for an
// eighth type is a code change and a review — which is the point, not a limitation to route around.
//
// ── snake_case INNER KEYS ARE DELIBERATE ───────────────────────────────────────────────────────────
// The `definition` JSONB body uses snake_case keys (the `clause_versions` / `cohort_definition`
// convention) because it must match the `@twt/contracts` wire shape BYTE-FOR-BYTE. Domain TS fields
// are camelCase everywhere else in this repo; inside these JSONB bodies they are not, and that
// inconsistency is load-bearing. camelCase-domain vs snake_case-contracts is this project's most
// repeated bug class — the round-trip test in the contracts sync-guard is what keeps it honest.

/**
 * The complete set of types a custom field may declare (AC2). FIXED.
 *
 *   · `string`       — bounded text (`max_length`, capped by `CUSTOM_FIELD_MAX_STRING_LENGTH`).
 *   · `integer`      — a JS safe integer.
 *   · `decimal`      — a finite number. ⚠ NOT money: money in this system is integer paisa on a
 *                      dedicated column, and a tenant-authored decimal must never become a financial
 *                      amount (that is what the `fixed_amount*` denylist entry defends).
 *   · `boolean`      — true/false.
 *   · `date`         — an ISO `YYYY-MM-DD` calendar date, stored as a string. Deliberately NOT a
 *                      timestamp: a tenant-authored instant would carry a timezone question nobody
 *                      is positioned to answer, and every §1.7 example is a calendar date.
 *   · `enum`         — one of a declared `enum_values` list.
 *   · `string_array` — a bounded list of bounded strings (`max_items`, `max_length`). The ONLY
 *                      non-scalar shape in v1; nested objects are deferred (see the story's
 *                      out-of-scope table).
 */
export const CUSTOM_FIELD_TYPES = [
  'string',
  'integer',
  'decimal',
  'boolean',
  'date',
  'enum',
  'string_array',
] as const;
export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];

/**
 * The PII tiers a definition may DECLARE (architecture §2.7 — "new PII fields declare their tier at
 * schema definition"). All three are declarable in the vocabulary; only tier 3 is ACCEPTED in v1.
 *
 * ⚠ THE SPLIT IS DELIBERATE. Keeping 1 and 2 in the vocabulary while rejecting them at publish time
 * means the rejection can say "not yet supported, here is why" instead of "not a valid tier" — the
 * difference between a recorded deferral and a lie. See `CustomFieldPiiTierUnsupportedError`.
 */
export const PII_TIERS = [1, 2, 3] as const;
export type PiiTier = (typeof PII_TIERS)[number];

/**
 * The ONLY PII tier a v1 definition may declare (AC4).
 *
 * Tier-1 needs per-value envelope encryption — a per-row DEK has no home inside a shared JSONB
 * column. Tier-2 needs a blind-index host column. Neither substrate exists for a JSONB key, and
 * `members` is a certified PII-free table (`member_identities.ts`: "The `members` table stays
 * PII-FREE (Story 3.1 — it is the lifecycle anchor)").
 */
export const SUPPORTED_PII_TIERS: readonly PiiTier[] = Object.freeze([3]);

/**
 * The host entities a definition may target. `member` only in v1 — mirrored by the
 * `pariwar_custom_field_definitions_host_entity_ck` CHECK in migration 0095.
 *
 * ⚠ FR-54, epics.md:108 and §1.7 all name member, claim AND pool. Narrowing to one host is a REAL
 * coverage gap, recorded as a gated deferral rather than silently absorbed (story D7). Claims are
 * additionally guarded by §1.9/§1.13 against exactly this vector — a tenant-authored claim custom
 * field IS the payout-destination absorption those sections forbid — so they deserve their own story
 * with their own fence review, not a free ride on this one. The column exists from day one so the
 * extension is purely additive.
 */
export const CUSTOM_FIELD_HOST_ENTITIES = ['member'] as const;
export type CustomFieldHostEntity = (typeof CUSTOM_FIELD_HOST_ENTITIES)[number];

/**
 * A stored custom-field VALUE. The union of what the seven types can hold.
 *
 * `null` is included and means "the member has no value for this field" — distinct from the key being
 * ABSENT, which under the D6 strict rule would be a rejected unknown key on write. Storing an
 * explicit null lets a form clear a field without the writer having to guess whether the omission was
 * intentional.
 */
export type CustomFieldValue = string | number | boolean | string[] | null;

/**
 * The member's custom-fields payload envelope (`members.custom_fields`).
 *
 * ⚠ `definition_set_version` IS THE REPLAY PIN. It is a deterministic hash over the in-force
 * `(field_key, version)` pairs at write time, so a value written under one definition set can be
 * re-validated against exactly that set rather than against whatever is in force when someone later
 * asks. Without it a retirement or a widened enum silently rewrites the meaning of history.
 *
 * snake_case inner keys — see the module header.
 */
export interface MemberCustomFieldsJson {
  /** Deterministic hash of the in-force definition set at write time. `null` on the `{}` default. */
  definition_set_version: string | null;
  /** ISO-8601 instant of the write (DB-authoritative clock). `null` on the `{}` default. */
  written_at: string | null;
  /** The values, keyed by `field_key`. Empty on the `{}` default. */
  values: Record<string, CustomFieldValue>;
}

/** The empty envelope a member row carries before any custom-field write. Matches the column DEFAULT
 *  `'{}'::jsonb` in shape-compatible terms — readers normalize `{}` through {@link emptyEnvelope}. */
export function emptyEnvelope(): MemberCustomFieldsJson {
  return { definition_set_version: null, written_at: null, values: {} };
}

/**
 * Normalize whatever is in the column into a full envelope.
 *
 * ⚠ WHY THE COLUMN DEFAULT IS `'{}'` AND NOT THE FULL ENVELOPE. `ADD COLUMN … DEFAULT` on `members`
 * — a hot table named in architecture §1.8's online-migration rule — writes the default into every
 * existing row's tuple header, so the smallest possible default is the right one. The cost is that
 * readers must tolerate a bare `{}`, which is what this function is for. Never read
 * `row.customFields.values` directly.
 */
export function normalizeEnvelope(raw: unknown): MemberCustomFieldsJson {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return emptyEnvelope();
  const o = raw as Partial<MemberCustomFieldsJson>;
  const values =
    typeof o.values === 'object' && o.values !== null && !Array.isArray(o.values) ? o.values : {};
  return {
    definition_set_version: typeof o.definition_set_version === 'string' ? o.definition_set_version : null,
    written_at: typeof o.written_at === 'string' ? o.written_at : null,
    values,
  };
}
