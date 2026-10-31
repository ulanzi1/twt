// Story 12.1 (AC3) — the five `module.*` payload schemas. DB-free.
//
// Asserts: exact vocabulary membership (`toEqual`, ⛔ a bare length — a length passes when one event is
// added and another removed); accept / reject per schema; `.strict()`; `from_state` is null ONLY at genesis;
// a lead is `active → active` only, with actor `member` only (I11) and lower-case ids (QE8); every other
// event refuses actor `member`.

import { describe, expect, it } from 'vitest';

import {
  MODULE_EVENT_PAYLOAD_SCHEMAS,
  MODULE_EVENT_TYPES,
  ModuleActivatedPayloadSchema,
  ModuleArchivedPayloadSchema,
  ModuleAuthoredPayloadSchema,
  ModuleLeadSubmittedPayloadSchema,
  ModuleScheduledPayloadSchema,
  moduleActorSchema,
} from '../../src/marketplace/events.js';

const MODULE = '6ba7b810-9dad-41d1-80b4-00c04fd430c8';
const PARIWAR = '11111111-1111-1111-1111-111111111111';
const MEMBER = '9b2f6c6e-3f4a-4d5b-8c7d-1e2f3a4b5c6d';
const LEAD = 'c56a4180-65aa-42ec-a945-5fd21dec0538';

function authored(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    from_state: null,
    to_state: 'draft',
    trigger: 'module.author',
    actor: 'operator',
    module_id: MODULE,
    pariwar_id: PARIWAR,
    manifest_schema_version: 1,
    partner_id: '0f8fad5b-d9cb-469f-a165-70867728950e',
    name_en: 'HDFC home loan',
    name_hi: 'एचडीएफसी गृह ऋण',
    description_en: 'A home-loan offer.',
    description_hi: 'गृह ऋण प्रस्ताव।',
    eligibility_filter: { version: 1, clauses: [] },
    scope_filter: { version: 1, scope: 'members-all' },
    valid_from: '2026-11-01T00:00:00.000Z',
    valid_until: '2026-12-01T00:00:00.000Z',
    slot_capacity: 10,
    lead_handoff_url: 'https://leads.partner.example/hdfc',
    lead_handoff_signing_key_secret_name: 'marketplace-hdfc-signing-key',
    branding_bundle: { version: 1, logo_object_key: null, accent_color_hex: null },
    ...overrides,
  };
}

function lead(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    lead_id: LEAD,
    member_id: MEMBER,
    slots_remaining_after: 9,
    from_state: 'active',
    to_state: 'active',
    trigger: 'module.lead_submit',
    actor: 'member',
    ...overrides,
  };
}

describe('module.* vocabulary', () => {
  it('MODULE_EVENT_TYPES is exactly the five events, in lifecycle order', () => {
    expect(MODULE_EVENT_TYPES).toEqual([
      'module.authored',
      'module.scheduled',
      'module.activated',
      'module.lead_submitted',
      'module.archived',
    ]);
  });

  it('every event type has its named schema bound (same object)', () => {
    expect(Object.keys(MODULE_EVENT_PAYLOAD_SCHEMAS).sort()).toEqual([...MODULE_EVENT_TYPES].sort());
    expect(MODULE_EVENT_PAYLOAD_SCHEMAS['module.authored']).toBe(ModuleAuthoredPayloadSchema);
    expect(MODULE_EVENT_PAYLOAD_SCHEMAS['module.scheduled']).toBe(ModuleScheduledPayloadSchema);
    expect(MODULE_EVENT_PAYLOAD_SCHEMAS['module.activated']).toBe(ModuleActivatedPayloadSchema);
    expect(MODULE_EVENT_PAYLOAD_SCHEMAS['module.lead_submitted']).toBe(ModuleLeadSubmittedPayloadSchema);
    expect(MODULE_EVENT_PAYLOAD_SCHEMAS['module.archived']).toBe(ModuleArchivedPayloadSchema);
  });

  it('the actor set is the claim set (member / operator / trustee / system)', () => {
    expect(moduleActorSchema.options).toEqual(['member', 'operator', 'trustee', 'system']);
  });

  it('names follow the single-dot snake_case convention (⛔ the epic’s module.lead-submitted)', () => {
    for (const t of MODULE_EVENT_TYPES) expect(t).toMatch(/^module\.[a-z_]+$/);
  });
});

describe('ModuleAuthoredPayloadSchema', () => {
  it('accepts the genesis shape', () => {
    expect(ModuleAuthoredPayloadSchema.safeParse(authored()).success).toBe(true);
    expect(ModuleAuthoredPayloadSchema.safeParse(authored({ actor: 'system' })).success).toBe(true);
    expect(ModuleAuthoredPayloadSchema.safeParse(authored({ slot_capacity: null })).success).toBe(true);
  });

  it.each([
    ['actor member', { actor: 'member' }],
    ['a non-null from_state', { from_state: 'draft' }],
    ['to_state scheduled', { to_state: 'scheduled' }],
    ['manifest_schema_version 2', { manifest_schema_version: 2 }],
    ['an extra key', { commission_terms: '2%' }],
    ['an empty trigger', { trigger: '' }],
    ['a non-ISO valid_from', { valid_from: 'tomorrow' }],
    ['an http url', { lead_handoff_url: 'http://leads.partner.example/hdfc' }],
    ['a role scope', { scope_filter: { version: 1, scope: 'role', values: ['x'] } }],
    ['an upper-case module_id', { module_id: MODULE.toUpperCase() }],
  ])('rejects %s', (_l, o) => {
    expect(ModuleAuthoredPayloadSchema.safeParse(authored(o)).success).toBe(false);
  });

  it('rejects a missing content key', () => {
    const p = authored();
    delete p['branding_bundle'];
    expect(ModuleAuthoredPayloadSchema.safeParse(p).success).toBe(false);
  });

  it.each([
    ['a NUL in name_en', { name_en: 'a\u0000b' }],
    ['an unpaired surrogate in name_hi', { name_hi: 'a\ud800b' }],
    ['a 121-character scope value', { scope_filter: { version: 1, scope: 'district', values: ['x'.repeat(121)] } }],
    ['a NUL in the logo key', { branding_bundle: { version: 1, logo_object_key: 'a\u0000b', accent_color_hex: null } }],
    ['a lead URL with a trailing newline', { lead_handoff_url: 'https://leads.partner.example/hdfc\n' }],
    ['a lead URL that is not canonical (upper-case host)', { lead_handoff_url: 'HTTPS://Leads.Partner.Example/hdfc' }],
    ['a lead URL with a lone surrogate', { lead_handoff_url: 'https://leads.partner.example/x\ud800' }],
    ['an "@" in the lead URL path', { lead_handoff_url: 'https://partner.example/@team/hook' }],
  ])('rejects %s — the same field rules as the manifest input, not only the row (RP9)', (_l, o) => {
    expect(ModuleAuthoredPayloadSchema.safeParse(authored(o)).success).toBe(false);
  });

  it.each([
    ['valid_until before valid_from', { valid_from: '2026-12-01T00:00:00.000Z', valid_until: '2026-11-01T00:00:00.000Z' }],
    ['valid_until = valid_from', { valid_from: '2026-11-01T00:00:00.000Z', valid_until: '2026-11-01T00:00:00.000Z' }],
  ])('rejects %s — the SAME window rule as the manifest input, not only the row CHECK (RV7)', (_l, o) => {
    expect(ModuleAuthoredPayloadSchema.safeParse(authored(o)).success).toBe(false);
  });
});

describe('transition schemas', () => {
  const base = { trigger: 't', actor: 'operator' };

  it('scheduled is draft → scheduled only', () => {
    expect(ModuleScheduledPayloadSchema.safeParse({ ...base, from_state: 'draft', to_state: 'scheduled' }).success).toBe(true);
    expect(ModuleScheduledPayloadSchema.safeParse({ ...base, from_state: 'scheduled', to_state: 'scheduled' }).success).toBe(false);
    expect(ModuleScheduledPayloadSchema.safeParse({ ...base, from_state: null, to_state: 'scheduled' }).success).toBe(false);
  });

  it('activated is draft | scheduled → active only', () => {
    for (const from of ['draft', 'scheduled']) {
      expect(ModuleActivatedPayloadSchema.safeParse({ ...base, from_state: from, to_state: 'active' }).success).toBe(true);
    }
    for (const from of ['active', 'archived', null]) {
      expect(ModuleActivatedPayloadSchema.safeParse({ ...base, from_state: from, to_state: 'active' }).success).toBe(false);
    }
  });

  it('archived is draft | scheduled | active → archived, with a known reason', () => {
    for (const from of ['draft', 'scheduled', 'active']) {
      expect(
        ModuleArchivedPayloadSchema.safeParse({ ...base, from_state: from, to_state: 'archived', reason: 'trustee_archived' })
          .success,
      ).toBe(true);
    }
    expect(
      ModuleArchivedPayloadSchema.safeParse({ ...base, from_state: 'archived', to_state: 'archived', reason: 'trustee_archived' })
        .success,
    ).toBe(false);
    expect(
      ModuleArchivedPayloadSchema.safeParse({ ...base, from_state: 'active', to_state: 'archived', reason: 'restored' }).success,
    ).toBe(false);
    expect(ModuleArchivedPayloadSchema.safeParse({ ...base, from_state: 'active', to_state: 'archived' }).success).toBe(false);
  });

  it('every non-lead transition refuses actor member, and accepts system / trustee', () => {
    const arms = [
      [ModuleScheduledPayloadSchema, { from_state: 'draft', to_state: 'scheduled' }],
      [ModuleActivatedPayloadSchema, { from_state: 'draft', to_state: 'active' }],
      [ModuleArchivedPayloadSchema, { from_state: 'active', to_state: 'archived', reason: 'trustee_archived' }],
    ] as const;
    for (const [schema, shape] of arms) {
      expect(schema.safeParse({ ...shape, trigger: 't', actor: 'member' }).success).toBe(false);
      expect(schema.safeParse({ ...shape, trigger: 't', actor: 'system' }).success).toBe(true);
      expect(schema.safeParse({ ...shape, trigger: 't', actor: 'trustee' }).success).toBe(true);
      expect(schema.safeParse({ ...shape, trigger: 't', actor: 'system', extra: 1 }).success).toBe(false);
    }
  });
});

describe('ModuleLeadSubmittedPayloadSchema', () => {
  it('accepts a capped and an uncapped lead', () => {
    expect(ModuleLeadSubmittedPayloadSchema.safeParse(lead()).success).toBe(true);
    expect(ModuleLeadSubmittedPayloadSchema.safeParse(lead({ slots_remaining_after: 0 })).success).toBe(true);
    expect(ModuleLeadSubmittedPayloadSchema.safeParse(lead({ slots_remaining_after: null })).success).toBe(true);
  });

  it.each([
    ['actor operator (I11)', { actor: 'operator' }],
    ['actor system', { actor: 'system' }],
    ['from_state draft', { from_state: 'draft' }],
    ['to_state archived', { to_state: 'archived' }],
    ['an upper-case member_id', { member_id: MEMBER.toUpperCase() }],
    ['an upper-case lead_id', { lead_id: LEAD.toUpperCase() }],
    ['a non-uuid lead_id', { lead_id: 'lead-1' }],
    ['a negative slots_remaining_after', { slots_remaining_after: -1 }],
    ['a fractional slots_remaining_after', { slots_remaining_after: 1.5 }],
    ['an extra key (⛔ PII)', { member_name: 'Asha' }],
  ])('rejects %s', (_l, o) => {
    expect(ModuleLeadSubmittedPayloadSchema.safeParse(lead(o)).success).toBe(false);
  });

  it('requires slots_remaining_after to be present (null, ⛔ omitted)', () => {
    const p = lead();
    delete p['slots_remaining_after'];
    expect(ModuleLeadSubmittedPayloadSchema.safeParse(p).success).toBe(false);
  });
});
