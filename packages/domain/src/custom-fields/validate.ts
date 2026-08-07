// Custom-field validation — Story 10.12 (Task 3; AC2/AC4/AC5/AC9; story D3, D6).
//
// TWO hand-written imperative validators, both accumulating `reasons: string[]` and throwing ONE
// aggregate typed error — modelled exactly on `validateRoutingPolicyRules` (helpdesk/registry.ts) and
// `validateFlagVersionInput` (feature-flags/registry.ts). Collecting every reason means one
// round-trip fixes the form; failing on the first means a tenant admin discovers their four problems
// one submission at a time.
//
// ── ⚠ DO NOT BUILD A ZOD SCHEMA FROM A DATABASE ROW (story D3) ─────────────────────────────────────
// The obvious move is to compile each definition into a Zod schema at request time. Resist it:
//   · There is NO PRECEDENT in this repo for building a Zod schema from data. The closest,
//     `requireIdentityTransition` (claim/events.ts:74), is a compile-time factory over a ZodRawShape
//     — a different thing entirely.
//   · `zod-to-json-schema` and `ajv` are NOT dependencies of any package here. Adding one needs its
//     own ADR and a capability-bar-style attestation, for a runtime that would then interpret
//     tenant-authored input.
//   · The two nearest analogues in the repo are both hand-written imperative validators.
// With seven scalar types and four bounds, the hand-written version is short, produces better error
// messages, and adds no dependency and no interpreter.
//
// ── ⚠ VALIDATION IS NOT THE FENCE ──────────────────────────────────────────────────────────────────
// This module checks that a definition is WELL-FORMED. Whether it is PERMITTED is
// `frozen-governance.ts`'s job, and the writer calls both. Do not fold the fence in here: a validator
// gets relaxed over time as authors hit its edges, and the fence must not travel with it.

import {
  CustomFieldDefinitionInvalidError,
  CustomFieldIncompatibleRedefinitionError,
  CustomFieldLabelParityRequiredError,
  CustomFieldNestingTooDeepError,
  CustomFieldPayloadTooLargeError,
  CustomFieldPiiTierUnsupportedError,
  CustomFieldValuesInvalidError,
} from './errors.js';
import { assertNotFrozenGovernanceKey, assertNotNakedPii, normalizeFieldKey } from './frozen-governance.js';
import {
  CUSTOM_FIELDS_MAX_NESTING_DEPTH,
  CUSTOM_FIELDS_MAX_PAYLOAD_BYTES,
  CUSTOM_FIELD_MAX_ARRAY_ITEMS,
  CUSTOM_FIELD_MAX_ENUM_VALUES,
  CUSTOM_FIELD_MAX_KEY_LENGTH,
  CUSTOM_FIELD_MAX_LABEL_LENGTH,
  CUSTOM_FIELD_MAX_STRING_LENGTH,
  jsonDepth,
  payloadByteLength,
} from './limits.js';
import {
  CUSTOM_FIELD_HOST_ENTITIES,
  CUSTOM_FIELD_TYPES,
  PII_TIERS,
  SUPPORTED_PII_TIERS,
  type CustomFieldValue,
  type PiiTier,
} from './types.js';
import type { CustomFieldDefinitionJson } from '../schema/pariwar_custom_field_definitions.js';

/** A `field_key` is a lowercase snake_case identifier. Bounded, non-PII, machine-readable — the
 *  `flag_key` convention. Enforced as a shape so a key can never be a sentence or a path. */
const FIELD_KEY_REGEX = /^[a-z][a-z0-9_]*$/;

/** ISO calendar date, `YYYY-MM-DD`. The `date` field type's storage form. */
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Validate a caller-authored definition body BEFORE it is persisted (AC2/AC4/AC9).
 *
 * Runs the frozen-governance fence and the naked-PII detector FIRST and lets them throw on their own
 * typed errors — those two rejections must never be flattened into a generic "invalid" list, because
 * they mean something categorically different from a malformed field and the operator needs to see
 * which one they hit.
 *
 * @throws CustomFieldFrozenGovernanceKeyError — the key names a frozen control (AC3 layer 1).
 * @throws CustomFieldNakedPiiKeyError — the key or a label is PII-shaped (AC4).
 * @throws CustomFieldPiiTierUnsupportedError — tier 1 or 2 (AC4; a DEFERRAL, see the error).
 * @throws CustomFieldLabelParityRequiredError — a missing label (AC9).
 * @throws CustomFieldDefinitionInvalidError — everything else, all reasons at once.
 */
export function validateCustomFieldDefinition(
  definition: CustomFieldDefinitionJson,
  hostEntity: string,
): void {
  const reasons: string[] = [];

  // ── Structural floor. Everything below dereferences these, so a non-object must not proceed. ────
  if (!isObject(definition)) {
    throw new CustomFieldDefinitionInvalidError(['definition must be an object']);
  }

  const fieldKey = definition.field_key;
  if (typeof fieldKey !== 'string' || fieldKey.length === 0) {
    throw new CustomFieldDefinitionInvalidError(['field_key must be a non-empty string']);
  }

  // ── ⭐ THE FENCE, BEFORE ANYTHING ELSE (AC3: "build it FIRST, before the thing it fences") ───────
  assertNotFrozenGovernanceKey(fieldKey);

  const labelEn = typeof definition.label_en === 'string' ? definition.label_en : '';
  const labelHi = typeof definition.label_hi === 'string' ? definition.label_hi : '';

  // ── AC9: Hindi parity. Checked before the PII detector so a definition missing a label gets the
  // parity error rather than a confusing PII scan over an empty string. ───────────────────────────
  const missingLabels: string[] = [];
  if (labelEn.trim().length === 0) missingLabels.push('label_en');
  if (labelHi.trim().length === 0) missingLabels.push('label_hi');
  if (missingLabels.length > 0) {
    throw new CustomFieldLabelParityRequiredError(fieldKey, missingLabels);
  }

  assertNotNakedPii(fieldKey, labelEn, labelHi);

  // ── AC4: the tier gate. Its own typed error, naming the deferral. ────────────────────────────────
  const piiTier = definition.pii_tier;
  if (typeof piiTier !== 'number' || !(PII_TIERS as readonly number[]).includes(piiTier)) {
    reasons.push(`pii_tier must be one of ${PII_TIERS.join(' | ')}`);
  } else if (!SUPPORTED_PII_TIERS.includes(piiTier as PiiTier)) {
    throw new CustomFieldPiiTierUnsupportedError(fieldKey, piiTier);
  }

  // ── Everything below accumulates. ────────────────────────────────────────────────────────────────
  if (!FIELD_KEY_REGEX.test(fieldKey)) {
    reasons.push(
      `field_key '${fieldKey}' must be lowercase snake_case starting with a letter (matched against ${String(FIELD_KEY_REGEX)})`,
    );
  }
  if (fieldKey.length > CUSTOM_FIELD_MAX_KEY_LENGTH) {
    reasons.push(`field_key must be at most ${String(CUSTOM_FIELD_MAX_KEY_LENGTH)} characters`);
  }
  // ⚠ A key that NORMALIZES differently from itself would match the fence under one spelling and be
  // stored under another. The regex above already forbids `-`/`.`/spaces, so this is belt-and-braces
  // — but it is the exact invariant the fence depends on, so it is asserted rather than assumed.
  if (normalizeFieldKey(fieldKey) !== fieldKey) {
    reasons.push(`field_key '${fieldKey}' must already be in normalized form ('${normalizeFieldKey(fieldKey)}')`);
  }

  if (labelEn.length > CUSTOM_FIELD_MAX_LABEL_LENGTH) {
    reasons.push(`label_en must be at most ${String(CUSTOM_FIELD_MAX_LABEL_LENGTH)} characters`);
  }
  if (labelHi.length > CUSTOM_FIELD_MAX_LABEL_LENGTH) {
    reasons.push(`label_hi must be at most ${String(CUSTOM_FIELD_MAX_LABEL_LENGTH)} characters`);
  }

  if (!(CUSTOM_FIELD_HOST_ENTITIES as readonly string[]).includes(hostEntity)) {
    reasons.push(
      `host_entity '${hostEntity}' is not supported — v1 hosts custom fields on ` +
        `${CUSTOM_FIELD_HOST_ENTITIES.join(' | ')} only (claims and pools are a recorded, gated deferral)`,
    );
  }

  const fieldType = definition.field_type;
  if (typeof fieldType !== 'string' || !(CUSTOM_FIELD_TYPES as readonly string[]).includes(fieldType)) {
    reasons.push(
      `field_type '${String(fieldType)}' is not one of ${CUSTOM_FIELD_TYPES.join(' | ')} — the type ` +
        'set is fixed, deliberately: it is what keeps this a bounded declarative form rather than an ' +
        'expression language',
    );
  }

  if (typeof definition.required !== 'boolean') reasons.push('required must be a boolean');
  if (typeof definition.indexed !== 'boolean') reasons.push('indexed must be a boolean');

  // ── Per-type bounds. Each is checked WHERE IT APPLIES and refused where it does not: a `max_items`
  // on a `boolean` field is not harmless noise, it is a sign the author believes something untrue
  // about what they are creating. ─────────────────────────────────────────────────────────────────
  const { enum_values: enumValues, max_length: maxLength, max_items: maxItems } = definition;

  if (fieldType === 'enum') {
    if (!Array.isArray(enumValues) || enumValues.length === 0) {
      reasons.push("field_type 'enum' requires a non-empty enum_values list");
    } else {
      if (enumValues.length > CUSTOM_FIELD_MAX_ENUM_VALUES) {
        reasons.push(`enum_values must have at most ${String(CUSTOM_FIELD_MAX_ENUM_VALUES)} entries`);
      }
      if (enumValues.some((v) => typeof v !== 'string' || v.length === 0)) {
        reasons.push('enum_values must be non-empty strings');
      }
      if (new Set(enumValues).size !== enumValues.length) {
        reasons.push('enum_values must not contain duplicates');
      }
    }
  } else if (enumValues !== undefined) {
    reasons.push(`enum_values is only meaningful for field_type 'enum' (got '${String(fieldType)}')`);
  }

  const takesMaxLength = fieldType === 'string' || fieldType === 'string_array';
  if (maxLength !== undefined) {
    if (!takesMaxLength) {
      reasons.push(`max_length is only meaningful for 'string' / 'string_array' (got '${String(fieldType)}')`);
    } else if (!Number.isInteger(maxLength) || maxLength < 1 || maxLength > CUSTOM_FIELD_MAX_STRING_LENGTH) {
      reasons.push(`max_length must be an integer in [1, ${String(CUSTOM_FIELD_MAX_STRING_LENGTH)}]`);
    }
  }

  if (maxItems !== undefined) {
    if (fieldType !== 'string_array') {
      reasons.push(`max_items is only meaningful for 'string_array' (got '${String(fieldType)}')`);
    } else if (!Number.isInteger(maxItems) || maxItems < 1 || maxItems > CUSTOM_FIELD_MAX_ARRAY_ITEMS) {
      reasons.push(`max_items must be an integer in [1, ${String(CUSTOM_FIELD_MAX_ARRAY_ITEMS)}]`);
    }
  }

  // No key beyond the declared vocabulary. The JSONB analogue of `.strict()` — an unrecognised key in
  // a definition body is either a typo (silently ignored forever) or an attempt to smuggle semantics
  // past the validator, and neither should be stored.
  const known = new Set([
    'field_key',
    'label_en',
    'label_hi',
    'field_type',
    'enum_values',
    'max_length',
    'max_items',
    'pii_tier',
    'required',
    'indexed',
  ]);
  for (const key of Object.keys(definition)) {
    if (!known.has(key)) reasons.push(`unknown definition key '${key}'`);
  }

  if (reasons.length > 0) throw new CustomFieldDefinitionInvalidError(reasons);
}

/**
 * AC2's "no silent renames" second leg. A new version of an EXISTING `field_key` may not change its
 * `field_type` or NARROW its `enum_values`.
 *
 * Widening is permitted; narrowing is not. The asymmetry is the whole rule: every value already
 * stored under the old definition must stay valid under the new one, and a removed enum member
 * silently invalidates rows nobody is going to be told about. Changing a field's MEANING is retire +
 * publish-a-new-key, which leaves the old values interpretable under the definition they were written
 * against.
 *
 * @throws CustomFieldIncompatibleRedefinitionError
 */
export function assertCompatibleRedefinition(
  prior: CustomFieldDefinitionJson,
  next: CustomFieldDefinitionJson,
): void {
  const reasons: string[] = [];

  if (prior.field_type !== next.field_type) {
    reasons.push(
      `field_type cannot change from '${prior.field_type}' to '${next.field_type}' — values already ` +
        'stored under the old type would become uninterpretable',
    );
  }

  if (prior.field_type === 'enum' && next.field_type === 'enum') {
    const priorValues = prior.enum_values ?? [];
    const nextValues = new Set(next.enum_values ?? []);
    const removed = priorValues.filter((v) => !nextValues.has(v));
    if (removed.length > 0) {
      reasons.push(
        `enum_values cannot be narrowed — ${removed.map((v) => `'${v}'`).join(', ')} would be removed, ` +
          'silently invalidating any member row already holding one of them (widening is fine)',
      );
    }
  }

  // A shrinking bound is the same failure in a different coat: a stored 200-character value does not
  // stop existing because max_length dropped to 100.
  //
  // ⭐ [Review][Patch] Compare EFFECTIVE bounds (an absent bound resolves to the type's hard ceiling —
  // the same `?? CUSTOM_FIELD_MAX_*` resolution `validateOneValue` uses), not raw declared bounds. The
  // original comparison only fired when the PRIOR version explicitly declared a bound, so a version
  // with no `max_length` (effectively `CUSTOM_FIELD_MAX_STRING_LENGTH`) narrowing to an explicit
  // smaller value went unchecked — the exact failure this guard exists to catch, just approached from
  // the implicit-default side instead of the explicit side.
  const priorMaxLength = prior.max_length ?? CUSTOM_FIELD_MAX_STRING_LENGTH;
  const nextMaxLength = next.max_length ?? CUSTOM_FIELD_MAX_STRING_LENGTH;
  if (nextMaxLength < priorMaxLength) {
    reasons.push(
      `max_length cannot be reduced from ${String(priorMaxLength)} to ${String(nextMaxLength)} — ` +
        'longer values already stored would become invalid',
    );
  }
  const priorMaxItems = prior.max_items ?? CUSTOM_FIELD_MAX_ARRAY_ITEMS;
  const nextMaxItems = next.max_items ?? CUSTOM_FIELD_MAX_ARRAY_ITEMS;
  if (nextMaxItems < priorMaxItems) {
    reasons.push(
      `max_items cannot be reduced from ${String(priorMaxItems)} to ${String(nextMaxItems)} — ` +
        'longer arrays already stored would become invalid',
    );
  }

  // ⭐ [Review][Patch] `pii_tier` was entirely unchecked here. Masked today because v1 hard-rejects
  // every declared tier but 3 (D4/AC4) everywhere a definition is validated, so `prior.pii_tier` and
  // `next.pii_tier` are always both 3 — but the moment ESCALATION 2 resolves and tiers 1/2 become
  // writable, this guard is the only thing standing between a republish and a silent PII-sensitivity
  // reclassification of a field whose historical values were stored under the old declared tier.
  if (prior.pii_tier !== next.pii_tier) {
    reasons.push(
      `pii_tier cannot change from ${String(prior.pii_tier)} to ${String(next.pii_tier)} — a field's ` +
        'declared sensitivity is part of its identity; retire this key and publish a new one instead',
    );
  }

  if (reasons.length > 0) throw new CustomFieldIncompatibleRedefinitionError(next.field_key, reasons);
}

/** One in-force definition, as the value validator consumes it. */
export interface InForceDefinition {
  fieldKey: string;
  version: number;
  definition: CustomFieldDefinitionJson;
  retiredAt: Date | null;
}

/**
 * Validate a member's supplied custom-field values against the in-force definition set (AC6).
 *
 * ⚠ UNKNOWN KEYS FAIL. They are never silently dropped (story D6). Silently ignoring an unknown key
 * turns a client bug into invisible data loss and turns a retired field into a value that vanishes
 * without anyone being told. This is the JSONB analogue of the `.strict()` rule the contracts layer
 * applies everywhere, and it is not negotiable.
 *
 * ⚠ A RETIRED field accepts NO NEW VALUES, while its already-stored values stay readable (§1.7's
 * deprecation window). Those are two different questions and this function answers only the write one.
 *
 * @throws CustomFieldValuesInvalidError — all reasons at once.
 * @throws CustomFieldPayloadTooLargeError | CustomFieldNestingTooDeepError — the AC5 limit classes.
 */
export function validateCustomFieldValues(
  values: Record<string, unknown>,
  inForce: readonly InForceDefinition[],
): asserts values is Record<string, CustomFieldValue> {
  const reasons: string[] = [];

  if (!isObject(values)) {
    throw new CustomFieldValuesInvalidError(['values must be an object']);
  }

  const byKey = new Map(inForce.map((d) => [d.fieldKey, d]));

  // ── D6: strict unknown-key rejection. ────────────────────────────────────────────────────────────
  for (const key of Object.keys(values)) {
    const def = byKey.get(key);
    if (!def) {
      reasons.push(
        `'${key}' has no in-force definition — unknown keys are rejected, never dropped, so a client ` +
          'bug cannot become invisible data loss',
      );
      continue;
    }
    if (def.retiredAt !== null) {
      reasons.push(
        `'${key}' was retired at ${def.retiredAt.toISOString()} — its stored values remain readable ` +
          'during the deprecation window, but no new value may be written for it',
      );
      continue;
    }
    reasons.push(...validateOneValue(key, values[key], def.definition));
  }

  // ── Required fields must be present (and non-null). A retired field is never required of a
  // writer, whatever its definition says. ─────────────────────────────────────────────────────────
  for (const def of inForce) {
    if (!def.definition.required || def.retiredAt !== null) continue;
    const supplied = Object.prototype.hasOwnProperty.call(values, def.fieldKey);
    if (!supplied || values[def.fieldKey] === null) {
      reasons.push(`'${def.fieldKey}' is required and must be supplied with a non-null value`);
    }
  }

  if (reasons.length > 0) throw new CustomFieldValuesInvalidError(reasons);

  // ── AC5 limit classes 1 and 2, on the VALUES object. Checked after per-field validation so a
  // structurally-broken payload reports its real problems rather than a size number. ──────────────
  const bytes = payloadByteLength(values);
  if (bytes > CUSTOM_FIELDS_MAX_PAYLOAD_BYTES) {
    throw new CustomFieldPayloadTooLargeError(bytes, CUSTOM_FIELDS_MAX_PAYLOAD_BYTES);
  }
  // Depth is measured on the ENVELOPE the column will hold (`{ …, values: {...} }`), not on the bare
  // values object — that is what the limit describes and what a reader will actually traverse.
  //
  // ⚠ NO `+ 1`. `jsonDepth({ values })` ALREADY measures the envelope: the envelope's other members
  // (`definition_set_version`, `written_at`) are scalars sitting at depth 1, so they cannot raise the
  // maximum above what the `values` branch contributes. Adding one double-counted the envelope and
  // made the effective ceiling 2 — which rejected EVERY write containing a `string_array`
  // (envelope → values → array → element is exactly the depth-3 case limits.ts describes as legal).
  // Caught by the seven-types integration test; do not "restore" the +1.
  const depth = jsonDepth({ values });
  if (depth > CUSTOM_FIELDS_MAX_NESTING_DEPTH) {
    throw new CustomFieldNestingTooDeepError(depth, CUSTOM_FIELDS_MAX_NESTING_DEPTH);
  }
}

/** Per-type value validation. Returns reasons rather than throwing, so the caller accumulates. */
function validateOneValue(key: string, value: unknown, def: CustomFieldDefinitionJson): string[] {
  // An explicit null CLEARS a field. Distinct from the key being absent, which for a required field
  // is caught above — this is how a form empties an optional field without the writer having to guess.
  if (value === null) return [];

  const maxLength = def.max_length ?? CUSTOM_FIELD_MAX_STRING_LENGTH;
  const maxItems = def.max_items ?? CUSTOM_FIELD_MAX_ARRAY_ITEMS;

  switch (def.field_type) {
    case 'string':
      if (typeof value !== 'string') return [`'${key}' must be a string`];
      if (value.length > maxLength) return [`'${key}' must be at most ${String(maxLength)} characters`];
      return [];

    case 'integer':
      if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
        return [`'${key}' must be a safe integer`];
      }
      return [];

    case 'decimal':
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        return [`'${key}' must be a finite number`];
      }
      return [];

    case 'boolean':
      if (typeof value !== 'boolean') return [`'${key}' must be a boolean`];
      return [];

    case 'date': {
      if (typeof value !== 'string' || !ISO_DATE_REGEX.test(value)) {
        return [`'${key}' must be an ISO calendar date (YYYY-MM-DD)`];
      }
      // ⚠ The regex alone accepts 2026-02-31. Round-tripping through Date is what catches it: a
      // stored impossible date would be read back as a shifted real one, silently.
      const parsed = new Date(`${value}T00:00:00Z`);
      if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
        return [`'${key}' is not a real calendar date`];
      }
      return [];
    }

    case 'enum': {
      const allowed = def.enum_values ?? [];
      if (typeof value !== 'string' || !allowed.includes(value)) {
        return [`'${key}' must be one of ${allowed.map((v) => `'${v}'`).join(', ') || '(none declared)'}`];
      }
      return [];
    }

    case 'string_array': {
      if (!Array.isArray(value)) return [`'${key}' must be an array of strings`];
      const out: string[] = [];
      if (value.length > maxItems) out.push(`'${key}' must have at most ${String(maxItems)} items`);
      if (value.some((v) => typeof v !== 'string')) out.push(`'${key}' items must be strings`);
      else if (value.some((v) => (v as string).length > maxLength)) {
        out.push(`'${key}' items must be at most ${String(maxLength)} characters`);
      }
      return out;
    }

    default:
      // Unreachable for a validated definition; reported rather than thrown so a row somehow written
      // with an unknown type fails the WRITE it governs instead of crashing the request.
      return [`'${key}' has an unknown field_type '${String(def.field_type)}'`];
  }
}
