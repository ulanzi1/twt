// packages/contracts/src/custom-fields/definition.ts
//
// The custom-field DEFINITION transport DTOs (Story 10.12, Task 6; AC7/AC9).
//
// ── Contracts discipline ──────────────────────────────────────────────────────────────────────────
// A contracts SOURCE file MUST NOT import `@twt/domain` (the browser-bundle rule — the domain barrel
// re-exports pg-touching namespaces, which drags `pg` into the RN Metro bundle). Plain Zod primitives
// only; the domain↔contracts enum equality is pinned by a TEST-only sync-guard
// (tests/custom-fields.test.ts), which MAY import the domain because it never ships.
//
// snake_case wire, `.strict()` throughout, and NO `ZodCatch` (the OpenAPI emitter throws on it).
//
// ⚠ THE INNER KEYS OF `definition` MATCH THE STORED JSONB BYTE-FOR-BYTE. The domain persists this
// exact object as `pariwar_custom_field_definitions.definition`, so wire and storage are the same
// shape — deliberately, because a translation layer between them is where camelCase/snake_case drift
// (this project's most repeated bug class) would live. There is no adapter here to get wrong.
//
// ── PII discipline ────────────────────────────────────────────────────────────────────────────────
// ⚠ `pii_tier` accepts 1|2|3 in the VOCABULARY but the server accepts only 3 (a definition declaring
// 1 or 2 is rejected with `custom_field.pii_tier_unsupported`, whose message names the deferral). The
// split is deliberate: keeping 1 and 2 expressible means the rejection can say "not yet supported,
// here is why" instead of "not a valid tier". Narrowing this enum to `[3]` would turn a recorded
// deferral into a lie about what the tiers are.
//
// `label_en` / `label_hi` are field NAMES authored by a Pariwar admin — controlled tenant metadata,
// never member data. The server additionally refuses PII-shaped keys and labels regardless of tier.

import { z } from 'zod';

import { Iso8601Datetime } from '../_common/primitives.js';

/** The FIXED custom-field type set. Mirrors the domain `CUSTOM_FIELD_TYPES` (test-only sync-guard).
 *  A fixed enum is what keeps this a bounded declarative form rather than an expression language. */
export const CustomFieldType = z.enum([
  'string',
  'integer',
  'decimal',
  'boolean',
  'date',
  'enum',
  'string_array',
]);
export type CustomFieldType = z.output<typeof CustomFieldType>;

/** The declarable PII tiers. Mirrors the domain `PII_TIERS`. See the header for why 1 and 2 stay
 *  expressible even though only 3 is accepted. */
export const PiiTier = z.union([z.literal(1), z.literal(2), z.literal(3)]);
export type PiiTier = z.output<typeof PiiTier>;

/** The entities a custom field may hang off. `member` only in v1 (claims/pools are a gated deferral —
 *  story D7). Mirrors the domain `CUSTOM_FIELD_HOST_ENTITIES`. */
export const CustomFieldHostEntity = z.enum(['member']);
export type CustomFieldHostEntity = z.output<typeof CustomFieldHostEntity>;

/** A `field_key` — lowercase snake_case, bounded, non-PII. Part of the version pin, so it can never
 *  be renamed: changing a field's meaning is retire-one-key-and-publish-another. */
export const CustomFieldKey = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z][a-z0-9_]*$/, 'field_key must be lowercase snake_case starting with a letter');

/**
 * The tenant-authored field shape — stored verbatim as the `definition` JSONB body.
 *
 * ⚠ `retired_at` IS NOT HERE, and must never be added. It is a ROW COLUMN. Retirement republishes
 * this exact body with the column set, so a retired field's shape stays byte-identical to the shape
 * its stored values were written under; a `retired_at` inside would make the two differ and break
 * that property (see `PublishCustomFieldDefinitionRequest`).
 */
export const CustomFieldDefinition = z
  .object({
    field_key: CustomFieldKey,
    /** English label. Admin surfaces are English-primary (ux-design-specification.md:2379). */
    label_en: z.string().min(1).max(120),
    /** ⚠ Hindi label — REQUIRED, not optional (AC9). Freeze-table row 10: "every member-visible string
     *  carries Hindi parity". Required NOW, while no member surface renders it, because a label
     *  authored English-only today becomes an un-backfillable parity violation the moment a renderer
     *  lands. `packages/i18n/per-pariwar/` is a BUILD-TIME directory a runtime label can never reach. */
    label_hi: z.string().min(1).max(120),
    field_type: CustomFieldType,
    /** `enum` only. May be WIDENED by a later version, never narrowed. */
    enum_values: z.array(z.string().min(1).max(512)).min(1).max(64).optional(),
    /** `string` / `string_array` only. */
    max_length: z.number().int().min(1).max(512).optional(),
    /** `string_array` only. */
    max_items: z.number().int().min(1).max(32).optional(),
    pii_tier: PiiTier,
    required: z.boolean(),
    /** ⚠ A RECORDED REQUEST, NEVER AN ACTION. `true` means a query pattern was identified; the
     *  functional index is a drizzle-kit migration authored by a human. A tenant admin issues no DDL. */
    indexed: z.boolean(),
  })
  .strict();
export type CustomFieldDefinition = z.output<typeof CustomFieldDefinition>;

/**
 * `POST /api/v1/p/{pariwarId}/custom-fields/definitions/{hostEntity}/{fieldKey}/versions` — publish
 * OR retire.
 *
 * ⚠ `retired_at` IS A SIBLING OF `definition`, NEVER A KEY INSIDE IT (AC7). Its PRESENCE is what
 * routes this same POST to the retire path: the handler calls `retireDefinition()` instead of
 * `publishDefinitionVersion()` and audits `custom_field.definition_retired`. One endpoint, because
 * retirement IS a version — a separate route would be a second write path for the governance fence to
 * be forgotten on, and it is the path least likely to be re-reviewed ("we're only turning it off").
 */
export const PublishCustomFieldDefinitionRequest = z
  .object({
    definition: CustomFieldDefinition,
    /** Optional effective instant; defaults to the DB's `now()`. */
    effective_at: Iso8601Datetime.optional(),
    /** Present ⇒ RETIRE. The `definition` body is ignored on this path (the server republishes the
     *  current in-force body unchanged); it stays required so the request shape is uniform. */
    retired_at: Iso8601Datetime.optional(),
  })
  .strict();
export type PublishCustomFieldDefinitionRequest = z.output<typeof PublishCustomFieldDefinitionRequest>;

/** One definition version row, as rendered to the admin console. */
export const CustomFieldDefinitionVersion = z
  .object({
    id: z.string(),
    host_entity: CustomFieldHostEntity,
    field_key: CustomFieldKey,
    version: z.number().int().positive(),
    definition: CustomFieldDefinition,
    effective_at: Iso8601Datetime,
    /** Non-null ⇒ this version retired the field at that instant. Its stored values stay readable
     *  during the deprecation window; no new value may be written for it. */
    retired_at: Iso8601Datetime.nullable(),
    authored_by_actor: z.string().nullable(),
    /** Display-name snapshot at publish time; null = a system/seed write, not "unknown actor". */
    actor_display: z.string().max(128).nullable(),
    /** The immutability forward-pointer; null = this is the latest version for its key. */
    superseded_by_version: z.number().int().positive().nullable(),
    created_at: Iso8601Datetime,
  })
  .strict();
export type CustomFieldDefinitionVersion = z.output<typeof CustomFieldDefinitionVersion>;

/**
 * `GET /api/v1/p/{pariwarId}/custom-fields/definitions` — the in-force set plus the full history.
 *
 * Both, in one response, deliberately: the admin surface renders in-force definitions as the working
 * list and history as provenance, and splitting them across two calls would let the two views be read
 * at different instants — so a field could appear retired in one panel and live in the other.
 */
export const CustomFieldDefinitionsResponse = z
  .object({
    host_entity: CustomFieldHostEntity,
    /** The definition-set replay pin as of this read — the same hash stamped on a member envelope. */
    definition_set_version: z.string(),
    /** In force right now: not retired, greatest `effective_at <= now`. Sorted by `field_key`. */
    in_force: z.array(CustomFieldDefinitionVersion),
    /** Every version row, including retired and superseded ones. */
    history: z.array(CustomFieldDefinitionVersion),
    /** True when the history was clipped by the read bound — surfaced so a consumer can never mistake
     *  a truncated provenance list for a complete one (the Story 10.8 Review-Pass-2 lesson). */
    has_more: z.boolean(),
  })
  .strict();
export type CustomFieldDefinitionsResponse = z.output<typeof CustomFieldDefinitionsResponse>;

/** The response to a publish/retire — the created version row. */
export const PublishCustomFieldDefinitionResponse = z
  .object({
    version: CustomFieldDefinitionVersion,
  })
  .strict();
export type PublishCustomFieldDefinitionResponse = z.output<typeof PublishCustomFieldDefinitionResponse>;
