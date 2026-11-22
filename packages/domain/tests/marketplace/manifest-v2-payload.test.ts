// Story 12.5b (Task 2; AC1, AC2; QE2; TR4) — the genesis payload is v1 OR v2, DB-free.
//
// ⭐ AC2 / TR4: a STORED v1 genesis is re-parsed on every fold. This file builds it with the LITERAL `1` (⛔ a constant), runs with
// `MODULE_MANIFEST_SCHEMA_VERSION` already 2, and asserts the fold reads its capacity: an unreadable genesis folds to
// `slotsRemaining: null`, which is exactly what pointing the v1 arm at the bumped constant would have done to every old stream.

import { describe, expect, it } from 'vitest';

import {
  ModuleAuthoredPayloadSchema,
  ModuleAuthoredPayloadV1Schema,
  moduleAuthoredLeadRoute,
} from '../../src/marketplace/events.js';
import { foldModuleProjection } from '../../src/marketplace/state.js';
import { MODULE_MANIFEST_SCHEMA_VERSION, MODULE_MANIFEST_SCHEMA_VERSION_V1 } from '../../src/schema/marketplace_modules.js';

const common = {
  from_state: null,
  to_state: 'draft',
  trigger: 'module.author',
  actor: 'operator',
  module_id: '6ba7b810-9dad-41d1-80b4-00c04fd430c8',
  pariwar_id: '11111111-1111-1111-1111-111111111111',
  partner_id: '0f8fad5b-d9cb-469f-a165-70867728950e',
  name_en: 'Offer',
  name_hi: 'प्रस्ताव',
  description_en: 'An offer.',
  description_hi: 'एक प्रस्ताव।',
  eligibility_filter: { version: 1, clauses: [] },
  scope_filter: { version: 1, scope: 'members-all' },
  valid_from: '2026-11-01T00:00:00.000Z',
  valid_until: '2026-12-01T00:00:00.000Z',
  branding_bundle: { version: 1, logo_object_key: null, accent_color_hex: null },
};

/** A 12.1 genesis exactly as stored before Story 12.5b — the version is the LITERAL 1, ⛔ any constant. */
const STORED_V1 = {
  ...common,
  manifest_schema_version: 1,
  slot_capacity: 7,
  lead_handoff_url: 'https://leads.partner.example/x',
  lead_handoff_signing_key_secret_name: 'k',
};
const V2_TRUST_SENDS = {
  ...common,
  manifest_schema_version: 2,
  lead_route: 'trust_sends',
  slot_capacity: 4,
  lead_handoff_url: 'https://leads.partner.example/x',
  lead_handoff_signing_key_secret_name: 'k',
};
const V2_PARTNER_FORM = {
  ...common,
  manifest_schema_version: 2,
  lead_route: 'partner_form',
  partner_form_url: 'https://partner.example/apply?offer=twt',
  slot_capacity: null,
};

const genesis = (payload: unknown) => ({ type: 'module.authored', payload, eventVersion: 1 });
const ev = (type: string, eventVersion: number, payload: unknown = {}) => ({ type, payload, eventVersion });

describe('Story 12.5b — manifest v2 payloads (QE2)', () => {
  it('the constants: new manifests are written as 2; the v1 arm keeps 1 (TR4)', () => {
    expect(MODULE_MANIFEST_SCHEMA_VERSION).toBe(2);
    expect(MODULE_MANIFEST_SCHEMA_VERSION_V1).toBe(1);
  });

  it('AC2: a stored v1 genesis (literal 1) still parses — by the v1 arm and by the union — and reads as trust_sends', () => {
    expect(ModuleAuthoredPayloadV1Schema.safeParse(STORED_V1).success).toBe(true);
    const parsed = ModuleAuthoredPayloadSchema.safeParse(STORED_V1);
    expect(parsed.success).toBe(true);
    expect(moduleAuthoredLeadRoute(parsed.data!)).toBe('trust_sends');
  });

  it('AC2: a stored v1 stream FOLDS to the same projection — slotsRemaining = the stored capacity minus its leads (⛔ null)', () => {
    const lead = { lead_id: 'a', member_id: 'b', slots_remaining_after: 6, from_state: 'active', to_state: 'active', trigger: 't', actor: 'member' };
    expect(foldModuleProjection([genesis(STORED_V1)])).toEqual({ state: 'draft', version: 1, slotsRemaining: 7, archiveReason: null });
    expect(foldModuleProjection([genesis(STORED_V1), ev('module.activated', 2), ev('module.lead_submitted', 3, lead)])).toEqual({
      state: 'active',
      version: 3,
      slotsRemaining: 6,
      archiveReason: null,
    });
  });

  it('the v1 arm is UNCHANGED: a v1 payload with a route key, or at version 2 without one, is refused', () => {
    expect(ModuleAuthoredPayloadSchema.safeParse({ ...STORED_V1, lead_route: 'trust_sends' }).success).toBe(false);
    expect(ModuleAuthoredPayloadSchema.safeParse({ ...STORED_V1, manifest_schema_version: 2 }).success).toBe(false);
    expect(ModuleAuthoredPayloadV1Schema.safeParse({ ...STORED_V1, partner_form_url: null }).success).toBe(false);
  });

  it('AC1: a v2 trust_sends genesis parses and folds its capacity; it reads as trust_sends', () => {
    const parsed = ModuleAuthoredPayloadSchema.safeParse(V2_TRUST_SENDS);
    expect(parsed.success).toBe(true);
    expect(moduleAuthoredLeadRoute(parsed.data!)).toBe('trust_sends');
    expect(foldModuleProjection([genesis(V2_TRUST_SENDS)]).slotsRemaining).toBe(4);
  });

  it('AC1: a v2 partner_form genesis parses, reads as partner_form and folds to ⛔ places', () => {
    const parsed = ModuleAuthoredPayloadSchema.safeParse(V2_PARTNER_FORM);
    expect(parsed.success).toBe(true);
    expect(moduleAuthoredLeadRoute(parsed.data!)).toBe('partner_form');
    expect(foldModuleProjection([genesis(V2_PARTNER_FORM)]).slotsRemaining).toBeNull();
  });

  it.each([
    ['places', { slot_capacity: 3 }],
    ['a handoff URL key', { lead_handoff_url: 'https://leads.partner.example/x' }],
    ['a signing-key key', { lead_handoff_signing_key_secret_name: 'k' }],
    ['a NULL handoff URL key (the key must be absent)', { lead_handoff_url: null }],
    ['⛔ page', { partner_form_url: undefined }],
    ['a page with a fragment', { partner_form_url: 'https://partner.example/apply#x' }],
    ['version 1', { manifest_schema_version: 1 }],
  ])('a v2 partner_form genesis with %s is refused', (_l, o) => {
    expect(ModuleAuthoredPayloadSchema.safeParse(JSON.parse(JSON.stringify({ ...V2_PARTNER_FORM, ...o }))).success).toBe(false);
  });

  it('a v2 trust_sends genesis with a partner page is refused (the key is not in its arm)', () => {
    expect(ModuleAuthoredPayloadSchema.safeParse({ ...V2_TRUST_SENDS, partner_form_url: 'https://partner.example/apply' }).success).toBe(false);
  });

  it('every arm keeps the window rule (RV7)', () => {
    for (const p of [STORED_V1, V2_TRUST_SENDS, V2_PARTNER_FORM]) {
      expect(ModuleAuthoredPayloadSchema.safeParse({ ...p, valid_until: p.valid_from }).success).toBe(false);
    }
  });
});
