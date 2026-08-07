// packages/contracts/src/custom-fields/member-values.ts
//
// The member custom-field VALUE transport DTOs (Story 10.12, Task 6; AC6/AC7).
//
// Contracts discipline: no `@twt/domain` import, snake_case wire, `.strict()`, no `ZodCatch`.
// See `definition.ts`'s header for the full statement.
//
// ── ⚠ WHY THE VALUE SCHEMA IS A PERMISSIVE UNION AND NOT A GENERATED SHAPE ─────────────────────────
// A custom field's real type is known only from the Pariwar's in-force definition set, which lives in
// the database. A wire contract cannot express "this key is an integer for Pariwar A and an enum for
// Pariwar B", and the tempting fix — building a Zod schema per request from the definition rows — is
// explicitly refused (story D3: no precedent in this repo, no JSON-Schema dependency in any package,
// and it would put an interpreter over tenant-authored input on the request path).
//
// So the wire type is the UNION OF WHAT THE SEVEN TYPES CAN HOLD, and the real validation is the
// server's hand-written `validateCustomFieldValues`, which checks each value against its definition
// and returns `400 custom_field.values_invalid` with every reason at once. The contract bounds the
// SHAPE (no nested objects, no unbounded arrays); the server enforces the MEANING.
//
// This is an honest division, not a gap: the same is true of `cohort_definition` in Story 10.8, where
// the wire shape is bounded and the semantic check is a domain validator.

import { z } from 'zod';

import { Iso8601Datetime } from '../_common/primitives.js';

/**
 * One stored custom-field value. `null` CLEARS a field — distinct from the key being ABSENT, which
 * for a required field is a validation error and for any field is a rejected unknown key on write.
 *
 * ⚠ NO NESTED OBJECTS. v1 ships flat scalars plus bounded string arrays; §1.7 permits "small bounded
 * objects" and that narrowing is a recorded deferral. Expressing it here rather than only in the
 * server means a client cannot even construct the unsupported shape.
 */
export const CustomFieldValue = z.union([
  z.string().max(512),
  z.number(),
  z.boolean(),
  z.array(z.string().max(512)).max(32),
  z.null(),
]);
export type CustomFieldValue = z.output<typeof CustomFieldValue>;

/**
 * The stored envelope on a member row.
 *
 * ⭐ `definition_set_version` IS THE REPLAY PIN — a deterministic hash over the in-force
 * `(field_key, version)` pairs at write time. A value written under one definition set can be
 * re-validated against exactly that set rather than against whatever is in force when someone later
 * asks; without it, a retirement or a widened enum silently rewrites the meaning of history.
 *
 * Both pins are nullable because a member who has never had a custom-field write carries the column
 * DEFAULT `'{}'` — that is "no write has happened", not "the write lost its provenance".
 */
export const MemberCustomFieldsEnvelope = z
  .object({
    definition_set_version: z.string().nullable(),
    written_at: Iso8601Datetime.nullable(),
    /** Keyed by `field_key`. May contain values for fields since RETIRED — that is §1.7's deprecation
     *  window, and filtering them out on read would make a retirement retroactively erase data the
     *  member supplied in good faith. */
    values: z.record(z.string().max(64), CustomFieldValue),
  })
  .strict();
export type MemberCustomFieldsEnvelope = z.output<typeof MemberCustomFieldsEnvelope>;

/** `GET /api/v1/p/{pariwarId}/custom-fields/members/{memberId}/values`. */
export const MemberCustomFieldsResponse = z
  .object({
    member_id: z.string(),
    custom_fields: MemberCustomFieldsEnvelope,
  })
  .strict();
export type MemberCustomFieldsResponse = z.output<typeof MemberCustomFieldsResponse>;

/**
 * `PUT /api/v1/p/{pariwarId}/custom-fields/members/{memberId}/values`.
 *
 * ⚠ A WHOLE-SET REPLACE, NOT A PATCH — hence PUT rather than PATCH. Merge semantics would make
 * "clear this field" unexpressible without a sentinel, and would let a client holding a stale
 * definition set leave a retired field's value in place forever by simply not mentioning it. It is
 * also what makes `definition_set_version` meaningful: the pin describes the WHOLE stored set.
 *
 * ⚠ UNKNOWN KEYS ARE REJECTED, NEVER DROPPED (story D6). A key with no in-force definition fails the
 * write with `400 custom_field.values_invalid`. Silently ignoring it would turn a client bug into
 * invisible data loss. This is the JSONB analogue of the `.strict()` rule applied everywhere else in
 * this package — the server does it, because only the server knows which keys are defined.
 */
export const SetMemberCustomFieldsRequest = z
  .object({
    values: z.record(z.string().max(64), CustomFieldValue),
  })
  .strict();
export type SetMemberCustomFieldsRequest = z.output<typeof SetMemberCustomFieldsRequest>;
