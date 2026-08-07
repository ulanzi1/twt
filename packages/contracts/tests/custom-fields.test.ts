// Per-Pariwar custom-field contracts — Story 10.12 (Task 6).
//
// TWO jobs: (1) the test-only sync-guard binding the contract enums to the `@twt/domain` source
// tuples (a contracts SOURCE file cannot import domain — the RN bundle boundary — so this test, which
// never ships, is the mechanical drift guard, per [[project_contracts_domain_bundle_boundary]]);
// (2) the `.strict()` behaviour + snake_case wire shape of the DTOs.
//
// ⚠ THE ROUND-TRIP TEST IS NOT DECORATION. The `definition` body is stored as JSONB byte-for-byte and
// served on the wire unchanged, so wire and storage share one shape. camelCase-domain vs
// snake_case-contracts is this project's most repeated bug class, and here there is no adapter to
// catch it — a camelCase key would simply be stored, served, and rejected by nothing until a reader
// dereferenced the snake_case name and got `undefined`.

import { customFields } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import {
  CustomFieldDefinition,
  CustomFieldHostEntity,
  CustomFieldType,
  MemberCustomFieldsEnvelope,
  PiiTier,
  PublishCustomFieldDefinitionRequest,
  SetMemberCustomFieldsRequest,
} from '../src/custom-fields/index.js';

/** A minimal valid definition — reused so each test varies exactly one thing. */
const validDefinition = {
  field_key: 'school_block_code',
  label_en: 'School block code',
  label_hi: 'विद्यालय प्रखंड कोड',
  field_type: 'string' as const,
  max_length: 32,
  pii_tier: 3 as const,
  required: false,
  indexed: false,
};

describe('custom-fields contract ↔ domain sync-guard', () => {
  it('CustomFieldType matches the domain CUSTOM_FIELD_TYPES tuple', () => {
    // Drift here is the dangerous kind: a type the API accepts but the validator does not know would
    // be persisted as a valid-looking definition and then fail EVERY member write against it, with
    // the failure surfacing to whoever tried to store a value rather than to whoever authored the field.
    expect([...CustomFieldType.options]).toEqual([...customFields.CUSTOM_FIELD_TYPES]);
  });

  it('PiiTier matches the domain PII_TIERS tuple', () => {
    const contractTiers = PiiTier.options.map((o) => o.value);
    expect(contractTiers).toEqual([...customFields.PII_TIERS]);
  });

  it('CustomFieldHostEntity matches the domain CUSTOM_FIELD_HOST_ENTITIES tuple', () => {
    expect([...CustomFieldHostEntity.options]).toEqual([...customFields.CUSTOM_FIELD_HOST_ENTITIES]);
  });

  it('⚠ the tier VOCABULARY is wider than what the server ACCEPTS, deliberately', () => {
    // Keeping 1 and 2 expressible is what lets the rejection name the missing substrate instead of
    // claiming the tier does not exist. If this ever collapses to [3], the deferral becomes a lie.
    expect(customFields.SUPPORTED_PII_TIERS).toEqual([3]);
    expect(PiiTier.options.length).toBeGreaterThan(customFields.SUPPORTED_PII_TIERS.length);
  });
});

describe('CustomFieldDefinition — the stored JSONB body, byte-for-byte', () => {
  it('accepts a well-formed definition and round-trips it unchanged', () => {
    const parsed = CustomFieldDefinition.parse(validDefinition);
    expect(parsed).toEqual(validDefinition);
  });

  it('⚠ REJECTS camelCase keys — the wire is snake_case (this repo\'s most repeated bug class)', () => {
    for (const camel of ['fieldKey', 'labelEn', 'fieldType', 'piiTier', 'maxLength']) {
      const body = { ...validDefinition, [camel]: 'x' };
      expect(CustomFieldDefinition.safeParse(body).success, camel).toBe(false);
    }
  });

  it('⚠ REJECTS `retired_at` INSIDE the definition body', () => {
    // It is a ROW COLUMN. Retirement republishes this exact body with the column set, so a retired
    // field's shape stays byte-identical to the shape its stored values were written under. A
    // `retired_at` in here would make the two differ and break that property silently.
    const body = { ...validDefinition, retired_at: '2026-08-06T00:00:00.000Z' };
    expect(CustomFieldDefinition.safeParse(body).success).toBe(false);
  });

  it('requires BOTH labels (AC9 — freeze-table row 10)', () => {
    expect(CustomFieldDefinition.safeParse({ ...validDefinition, label_hi: '' }).success).toBe(false);
    expect(CustomFieldDefinition.safeParse({ ...validDefinition, label_en: '' }).success).toBe(false);
    const noHindi: Record<string, unknown> = { ...validDefinition };
    delete noHindi.label_hi;
    expect(CustomFieldDefinition.safeParse(noHindi).success).toBe(false);
  });

  it('enforces the field_key shape (lowercase snake_case, bounded)', () => {
    for (const bad of ['Payout-Destinations', 'payout.destination', '1_leading_digit', 'has space', '']) {
      expect(CustomFieldDefinition.safeParse({ ...validDefinition, field_key: bad }).success, bad).toBe(
        false,
      );
    }
  });

  it('rejects an unknown key (.strict())', () => {
    expect(
      CustomFieldDefinition.safeParse({ ...validDefinition, encrypted: true }).success,
    ).toBe(false);
  });
});

describe('PublishCustomFieldDefinitionRequest — retired_at is a SIBLING of definition (AC7)', () => {
  it('accepts a plain publish', () => {
    const r = PublishCustomFieldDefinitionRequest.safeParse({ definition: validDefinition });
    expect(r.success).toBe(true);
  });

  it('accepts a retire — the SAME request with a top-level retired_at', () => {
    // Its PRESENCE is what routes this POST to `retireDefinition()`. One endpoint, because retirement
    // IS a version; a separate route would be a second write path for the fence to be forgotten on.
    const r = PublishCustomFieldDefinitionRequest.safeParse({
      definition: validDefinition,
      retired_at: '2026-08-06T00:00:00.000Z',
    });
    expect(r.success).toBe(true);
  });

  it('rejects an unknown sibling key (.strict())', () => {
    const r = PublishCustomFieldDefinitionRequest.safeParse({
      definition: validDefinition,
      force: true,
    });
    expect(r.success).toBe(false);
  });
});

describe('member value shapes', () => {
  it('accepts the four value kinds plus null', () => {
    const r = SetMemberCustomFieldsRequest.safeParse({
      values: { a: 'text', b: 42, c: true, d: ['x', 'y'], e: null },
    });
    expect(r.success).toBe(true);
  });

  it('⚠ rejects a NESTED OBJECT value — v1 is flat scalars + bounded string arrays', () => {
    // §1.7 permits "small bounded objects"; v1 narrows to flat, and expressing that here means a
    // client cannot even construct the unsupported shape.
    expect(SetMemberCustomFieldsRequest.safeParse({ values: { a: { b: 1 } } }).success).toBe(false);
    expect(SetMemberCustomFieldsRequest.safeParse({ values: { a: [{ b: 1 }] } }).success).toBe(false);
  });

  it('bounds array length and string length', () => {
    const longArray = Array.from({ length: 33 }, (_, i) => String(i));
    expect(SetMemberCustomFieldsRequest.safeParse({ values: { a: longArray } }).success).toBe(false);
    expect(SetMemberCustomFieldsRequest.safeParse({ values: { a: 'x'.repeat(513) } }).success).toBe(false);
  });

  it('the envelope carries the replay pin, nullable for a never-written member', () => {
    const r = MemberCustomFieldsEnvelope.safeParse({
      definition_set_version: null,
      written_at: null,
      values: {},
    });
    expect(r.success).toBe(true);
  });

  it('the envelope rejects an unknown key (.strict())', () => {
    const r = MemberCustomFieldsEnvelope.safeParse({
      definition_set_version: null,
      written_at: null,
      values: {},
      schema_version: 1,
    });
    expect(r.success).toBe(false);
  });
});
