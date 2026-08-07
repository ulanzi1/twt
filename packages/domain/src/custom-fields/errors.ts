// Custom-field domain error types — Story 10.12 (Task 1).
//
// Typed errors the definitions registry, the frozen-governance fence and the member value-write path
// raise. The app boundary maps them to HTTP status + a wire code (the `FlagVersionInvalidError` →
// 400 / `RoutingPolicyVersionConflictError` → 409 seam precedent); the domain fns carry NO HTTP.
//
// ⚠ WHY EVERY REJECTION HERE IS TYPED, AND WHY THE MESSAGES NAME THE CONTROL.
// This is the first extensibility mechanism in the system where a TENANT authors a shape the engine
// then honours. Every refusal is therefore a governance event a Pariwar admin reads at a form, not an
// internal assertion — so each message states WHAT was refused, WHICH control refused it, and (where
// the refusal is a deferral rather than a prohibition) says so plainly. A tenant told "invalid" with
// no reason will simply try variations until something sticks, which is how a fence gets walked around.

/** The wire codes the API layer maps these onto. Declared here so the domain owns the vocabulary and
 *  the handler's `mapPublishError` cannot invent a code the domain never raises. */
export const CUSTOM_FIELD_WIRE_CODES = [
  'custom_field.frozen_governance_key',
  'custom_field.naked_pii_key',
  'custom_field.pii_tier_unsupported',
  'custom_field.label_parity_required',
  'custom_field.definition_invalid',
  'custom_field.definition_conflict',
  'custom_field.effective_at_out_of_order',
  'custom_field.definition_not_found',
  'custom_field.cardinality_exceeded',
  'custom_field.values_invalid',
  'custom_field.payload_too_large',
  'custom_field.nesting_too_deep',
  'custom_field.incompatible_redefinition',
] as const;
export type CustomFieldWireCode = (typeof CUSTOM_FIELD_WIRE_CODES)[number];

/**
 * ⭐ THE LOAD-BEARING REFUSAL (AC3). Thrown when a proposed `field_key` collides with a frozen
 * governance control — a `payout_destination*` prefix from `fr-100-non-add.yaml`, or one of the
 * explicit `CUSTOM_FIELD_FORBIDDEN_KEY_PATTERNS` covering the epics.md:513 freeze table and the
 * load-bearing derived columns.
 *
 * The epic cites Story 1.16c's `schema-diff` gate as the enforcer of this. It is not and cannot be:
 * a custom field is a KEY INSIDE A JSONB PAYLOAD authored at runtime, and `schema-diff` scans four
 * committed-source roots. This error is the enforcement that citation assumed existed.
 */
export class CustomFieldFrozenGovernanceKeyError extends Error {
  public readonly name = 'CustomFieldFrozenGovernanceKeyError';
  public readonly code: CustomFieldWireCode = 'custom_field.frozen_governance_key';
  public constructor(
    public readonly fieldKey: string,
    /** The normalized form that matched — surfaced so an author sees WHY `Payout-Destinations` matched. */
    public readonly normalizedKey: string,
    public readonly pattern: string,
    public readonly control: string,
  ) {
    super(
      `custom field key '${fieldKey}' (normalized '${normalizedKey}') collides with the frozen ` +
        `governance control '${pattern}' — ${control}. A per-Pariwar custom field extends the data ` +
        'model; it may never reach around a control the architecture froze. Choose a key outside the ' +
        'frozen namespace, or take the change through the ADR / Sprint Change Proposal path.',
    );
  }
}

/**
 * Thrown when a key or label is shaped like naked PII regardless of the declared tier (AC4). A tenant
 * declaring `pii_tier: 3` on an Aadhaar-shaped field is precisely the "buggy or malicious tenant"
 * architecture §1.7 exists to defend against, and `members` is a CERTIFIED PII-FREE table.
 */
export class CustomFieldNakedPiiKeyError extends Error {
  public readonly name = 'CustomFieldNakedPiiKeyError';
  public readonly code: CustomFieldWireCode = 'custom_field.naked_pii_key';
  public constructor(
    public readonly fieldKey: string,
    public readonly marker: string,
    public readonly where: 'field_key' | 'label_en' | 'label_hi',
  ) {
    super(
      `custom field '${fieldKey}': the ${where} contains '${marker}', which names a personally ` +
        'identifying value. The `members` table is certified PII-free and a custom field is stored ' +
        'as plaintext JSONB on it — no declared tier makes that safe. Identifiers of this kind need ' +
        'a Tier-1 encrypted or Tier-2 blind-indexed host, which custom fields do not have in v1.',
    );
  }
}

/**
 * Thrown when a definition declares `pii_tier` 1 or 2 (AC4). ⚠ Read the message carefully: this is a
 * DEFERRAL, not a judgement that the field is illegitimate. Tier-1 needs per-value envelope
 * encryption (a per-row DEK has no home inside a shared JSONB column) and Tier-2 needs a blind-index
 * host column; neither substrate exists for a JSONB key today.
 *
 * ⚠ The epic's own worked example — "alternate ID number" (epics.md:3603) — is Tier-2 by direct
 * analogy to architecture §2.7's classification of the eHRMS ID, so it does NOT pass this guard.
 * That is ESCALATION 2, deliberately raised rather than resolved by relaxing the guard.
 */
export class CustomFieldPiiTierUnsupportedError extends Error {
  public readonly name = 'CustomFieldPiiTierUnsupportedError';
  public readonly code: CustomFieldWireCode = 'custom_field.pii_tier_unsupported';
  public constructor(
    public readonly fieldKey: string,
    public readonly piiTier: number,
  ) {
    super(
      `custom field '${fieldKey}' declares pii_tier ${String(piiTier)}, which custom fields do not ` +
        'yet support — this is a missing substrate, not a rejected requirement. Tier-1 values need ' +
        'per-value envelope encryption and Tier-2 values need a blind-index column; a shared JSONB ' +
        'column can host neither. Only pii_tier 3 (non-identifying) is accepted in v1.',
    );
  }
}

/**
 * Thrown when a definition omits either label (AC9). Freeze-table row 10 (epics.md:526) — "every
 * member-visible string carries Hindi parity" — and `packages/i18n/per-pariwar/` is a BUILD-TIME
 * strings directory a runtime-authored label can never reach. Requiring both NOW, while no member
 * surface renders them, is deliberate: an English-only label becomes an un-backfillable parity
 * violation the moment a renderer lands.
 */
export class CustomFieldLabelParityRequiredError extends Error {
  public readonly name = 'CustomFieldLabelParityRequiredError';
  public readonly code: CustomFieldWireCode = 'custom_field.label_parity_required';
  public constructor(
    public readonly fieldKey: string,
    public readonly missing: readonly string[],
  ) {
    super(
      `custom field '${fieldKey}' is missing ${missing.join(' and ')} — every field needs both an ` +
        'English and a Hindi label. Member surfaces are Hindi-primary (freeze-table row 10), and a ' +
        'label authored in one language today cannot be backfilled once values exist under it.',
    );
  }
}

/**
 * Thrown when a caller-authored definition is malformed — BEFORE it is persisted. The
 * `FlagVersionInvalidError` / `RoutingPolicyDocumentInvalidError` posture: accumulate EVERY reason so
 * one round-trip fixes the form, and surface it to the admin who authored it rather than to whatever
 * later write it silently corrupts.
 */
export class CustomFieldDefinitionInvalidError extends Error {
  public readonly name = 'CustomFieldDefinitionInvalidError';
  public readonly code: CustomFieldWireCode = 'custom_field.definition_invalid';
  public constructor(public readonly reasons: readonly string[]) {
    super(`custom field definition is invalid: ${reasons.join('; ')}`);
  }
}

/**
 * Thrown when a second version of the SAME `field_key` would change its `field_type` or NARROW its
 * `enum_values` (AC2, "no silent renames"). Widening an enum is permitted; narrowing is not, because
 * stored values written under the wider set would silently become invalid without anyone being told.
 * Changing a field's MEANING means retiring one key and publishing another.
 */
export class CustomFieldIncompatibleRedefinitionError extends Error {
  public readonly name = 'CustomFieldIncompatibleRedefinitionError';
  public readonly code: CustomFieldWireCode = 'custom_field.incompatible_redefinition';
  public constructor(
    public readonly fieldKey: string,
    public readonly reasons: readonly string[],
  ) {
    super(
      `custom field '${fieldKey}' cannot be redefined this way: ${reasons.join('; ')}. ` +
        'A published field_key is part of the version pin — changing what it MEANS means retiring ' +
        'this key and publishing a new one, so values already stored under it stay interpretable.',
    );
  }
}

/**
 * Thrown on a racing duplicate `(pariwar_id, host_entity, field_key, version)` — the 409 seam. Two
 * admins publishing the same field can independently compute the same stale `nextVersion`; the loser
 * re-reads and retries.
 */
export class CustomFieldDefinitionConflictError extends Error {
  public readonly name = 'CustomFieldDefinitionConflictError';
  public readonly code: CustomFieldWireCode = 'custom_field.definition_conflict';
  public constructor(
    public readonly fieldKey: string,
    public readonly version: number,
  ) {
    super(
      `custom field '${fieldKey}' version ${String(version)} already exists — a concurrent publish ` +
        'won the race; re-read the latest version and retry',
    );
  }
}

/** Thrown when a publish's `effectiveAt` precedes the field's latest existing version — which would
 *  make the supersession chain inconsistent with in-force-by-instant resolution. The
 *  `FlagEffectiveFromOutOfOrderError` twin. */
export class CustomFieldEffectiveAtOutOfOrderError extends Error {
  public readonly name = 'CustomFieldEffectiveAtOutOfOrderError';
  public readonly code: CustomFieldWireCode = 'custom_field.effective_at_out_of_order';
  public constructor(
    public readonly fieldKey: string,
    public readonly attempted: Date,
    public readonly latest: Date,
  ) {
    super(
      `custom field '${fieldKey}': effective_at ${attempted.toISOString()} precedes the field's ` +
        `latest version's effective_at ${latest.toISOString()} — versions publish forward in time`,
    );
  }
}

/** Thrown when a retire targets a `field_key` with no in-force definition. Retirement is a VERSION,
 *  so it needs a current definition body to republish with `retired_at` set (AC1). */
export class CustomFieldDefinitionNotFoundError extends Error {
  public readonly name = 'CustomFieldDefinitionNotFoundError';
  public readonly code: CustomFieldWireCode = 'custom_field.definition_not_found';
  public constructor(
    public readonly fieldKey: string,
    public readonly hostEntity: string,
  ) {
    super(
      `custom field '${fieldKey}' has no in-force definition for host '${hostEntity}' — nothing to ` +
        'retire. Retirement republishes the current definition with retired_at set; it is never a DELETE.',
    );
  }
}

/** Thrown when publishing would exceed the §1.7 per-Pariwar definition cardinality bound (AC5). The
 *  bound is Trustee-Panel-revisable operational policy — see `limits.ts`. */
export class CustomFieldCardinalityExceededError extends Error {
  public readonly name = 'CustomFieldCardinalityExceededError';
  public readonly code: CustomFieldWireCode = 'custom_field.cardinality_exceeded';
  public constructor(
    public readonly current: number,
    public readonly max: number,
  ) {
    super(
      `this Pariwar already has ${String(current)} in-force custom field definitions, the maximum ` +
        `being ${String(max)} — retire a field before publishing another. This ceiling is ` +
        'operational policy under Trustee-Panel review, not an architectural limit.',
    );
  }
}

/**
 * Thrown when a member custom-fields write fails validation against the in-force definition set —
 * including the D6 STRICT unknown-key rejection. Accumulates every reason.
 *
 * ⚠ Unknown keys FAIL; they are never silently dropped. Silently ignoring an unknown key turns a
 * client bug into invisible data loss and turns a retired field into a value that vanishes without
 * anyone being told. This is the JSONB analogue of the `.strict()` rule the contracts layer applies
 * everywhere.
 */
export class CustomFieldValuesInvalidError extends Error {
  public readonly name = 'CustomFieldValuesInvalidError';
  public readonly code: CustomFieldWireCode = 'custom_field.values_invalid';
  public constructor(public readonly reasons: readonly string[]) {
    super(`custom field values are invalid: ${reasons.join('; ')}`);
  }
}

/** Thrown when a write exceeds `CUSTOM_FIELDS_MAX_PAYLOAD_BYTES` (AC5, frozen limit class 1). */
export class CustomFieldPayloadTooLargeError extends Error {
  public readonly name = 'CustomFieldPayloadTooLargeError';
  public readonly code: CustomFieldWireCode = 'custom_field.payload_too_large';
  public constructor(
    public readonly bytes: number,
    public readonly max: number,
  ) {
    super(
      `custom fields payload is ${String(bytes)} bytes, the maximum being ${String(max)} — ` +
        'custom fields carry small structured values, never documents or blobs',
    );
  }
}

/** Thrown when a write exceeds `CUSTOM_FIELDS_MAX_NESTING_DEPTH` (AC5, frozen limit class 2). */
export class CustomFieldNestingTooDeepError extends Error {
  public readonly name = 'CustomFieldNestingTooDeepError';
  public readonly code: CustomFieldWireCode = 'custom_field.nesting_too_deep';
  public constructor(
    public readonly depth: number,
    public readonly max: number,
  ) {
    super(
      `custom fields payload nests ${String(depth)} levels deep, the maximum being ${String(max)} — ` +
        'v1 custom fields are flat scalars and bounded string arrays',
    );
  }
}
