# `packages/contracts/src/custom-fields/`

Transport-layer contracts for the **per-Pariwar custom fields** subsystem (FR-54, architecture §1.7) —
the definition registry's publish/retire/read shapes, and the member value envelope.

## Landing Story

**Story 10.12** — Per-Pariwar Custom Fields JSONB `[PRIMITIVE]`. The ADR is
`ADR-0037-per-tenant-custom-fields-jsonb` (status `drafted`; trustee ratification is a forward
obligation, not something the story asserts).

## Files

| File | What it carries |
|---|---|
| `definition.ts` | `CustomFieldDefinition` (the stored JSONB body, byte-identical on the wire), the publish/retire request, the version row and the definitions response. |
| `member-values.ts` | `MemberCustomFieldsEnvelope` (values + the `definition_set_version` replay pin), the read response and the whole-set replace request. |

## Discipline reminders

- **`.strict()` default.** Every `z.object({...})` ends with `.strict()` (architecture §Format
  patterns 3824-3826).
- **No `@twt/domain` import from a source file.** The domain barrel re-exports pg-touching namespaces
  and would drag `pg` into the RN Metro bundle. The domain↔contracts enum equality is pinned by
  `tests/custom-fields.test.ts`, which **may** import the domain because a test never ships.
- **No `ZodCatch`.** The OpenAPI emitter throws on it. A "sometimes this field is garbage" tolerance
  belongs in the API's projection layer, not in a published contract (the Story 10.8 Review-Pass-4
  lesson).
- **Tenant scoping.** Everything is under `/api/v1/p/<pariwar_id>/custom-fields/...`. There is no
  global tier and there must not be: a globally-authored custom field would be a schema change
  wearing a tenant's clothes.

## Two things that look like gaps and are not

**`pii_tier` accepts 1, 2 and 3, but the server accepts only 3.** Keeping 1 and 2 expressible is what
lets the rejection say *"not yet supported, and here is the substrate that is missing"* rather than
*"not a valid tier"*. Tier-1 needs per-value envelope encryption; Tier-2 needs a blind-index host
column; a shared JSONB column on the certified PII-free `members` table can host neither. Narrowing
the enum would turn a recorded deferral into a lie about what the tiers are.

**`CustomFieldValue` is a permissive union rather than a per-field shape.** A field's real type is
known only from the Pariwar's in-force definition rows, which live in the database — a wire contract
cannot express "integer for Pariwar A, enum for Pariwar B". Building a Zod schema per request from
those rows is explicitly refused (story D3). The contract bounds the **shape**; the server's
hand-written `validateCustomFieldValues` enforces the **meaning**, returning every reason at once.
