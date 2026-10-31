// Story 12.1 (AC7) — the closed, versioned filter grammars + `parseModuleManifest`. DB-free.
//
// Every REJECT row below is one AC7 leg and must throw the typed `ModuleManifestInvalidError` (⛔ a bare
// ZodError). The ACCEPT vectors are frozen: a grammar change that stops accepting one is a breaking change
// and needs `version: 2` (QE9).

import { describe, expect, it } from 'vitest';

import {
  ELIGIBILITY_MEMBER_STATES,
  EligibilityFilterV1Schema,
  ModuleBrandingBundleSchema,
  ScopeFilterV1Schema,
  parseModuleManifest,
} from '../../src/marketplace/filters.js';
import { ModuleManifestInvalidError } from '../../src/marketplace/errors.js';
import * as marketplace from '../../src/marketplace/index.js';
import { MEMBER_LIFECYCLE_STATES } from '../../src/schema/members.js';

const PARTNER = '0f8fad5b-d9cb-469f-a165-70867728950e';

function manifest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    partner_id: PARTNER,
    name_en: 'HDFC home loan',
    name_hi: 'एचडीएफसी गृह ऋण',
    description_en: 'A home-loan offer for members.',
    description_hi: 'सदस्यों के लिए गृह ऋण प्रस्ताव।',
    eligibility_filter: { version: 1, clauses: [] },
    scope_filter: { version: 1, scope: 'members-all' },
    valid_from: '2026-11-01T00:00:00.000Z',
    valid_until: '2026-12-01T00:00:00.000Z',
    slot_capacity: 50,
    lead_handoff_url: 'https://leads.partner.example/hdfc/twt-bihar',
    lead_handoff_signing_key_secret_name: 'marketplace-hdfc-signing-key',
    branding_bundle: { version: 1, logo_object_key: 'partners/hdfc/logo.png', accent_color_hex: '#004c8f' },
    ...overrides,
  };
}

function expectInvalid(input: unknown): void {
  expect(() => parseModuleManifest(input)).toThrow(ModuleManifestInvalidError);
}

describe('parseModuleManifest — accepted vectors (frozen)', () => {
  it('accepts the canonical manifest and converts valid_* to Date, partner_id to a lower-case brand', () => {
    const m = parseModuleManifest(manifest({ partner_id: PARTNER.toUpperCase() }));
    expect(m.partnerId).toBe(PARTNER);
    expect(m.validFrom).toEqual(new Date('2026-11-01T00:00:00.000Z'));
    expect(m.validUntil).toEqual(new Date('2026-12-01T00:00:00.000Z'));
    expect(m.slotCapacity).toBe(50);
    expect(m.scopeFilter).toEqual({ version: 1, scope: 'members-all' });
    expect(m.eligibilityFilter).toEqual({ version: 1, clauses: [] });
  });

  it('trims the bilingual text', () => {
    const m = parseModuleManifest(manifest({ name_en: '  LIC term plan  ', description_hi: ' विवरण ' }));
    expect(m.nameEn).toBe('LIC term plan');
    expect(m.descriptionHi).toBe('विवरण');
  });

  it.each([
    ['members-all', { version: 1, scope: 'members-all' }],
    ['state', { version: 1, scope: 'state', values: ['Bihar'] }],
    ['district', { version: 1, scope: 'district', values: ['Patna', 'Gaya'] }],
  ])('accepts the %s scope', (_l, scope) => {
    expect(parseModuleManifest(manifest({ scope_filter: scope })).scopeFilter).toEqual(scope);
  });

  it('accepts a member_state_in clause and zero clauses (no restriction beyond scope)', () => {
    const f = { version: 1, clauses: [{ kind: 'member_state_in', states: ['active', 'active-in-grace'] }] };
    expect(parseModuleManifest(manifest({ eligibility_filter: f })).eligibilityFilter).toEqual(f);
    expect(EligibilityFilterV1Schema.parse({ version: 1, clauses: [] })).toEqual({ version: 1, clauses: [] });
  });

  it('accepts an uncapped module (slot_capacity null) and a null-everything branding bundle', () => {
    const m = parseModuleManifest(
      manifest({ slot_capacity: null, branding_bundle: { version: 1, logo_object_key: null, accent_color_hex: null } }),
    );
    expect(m.slotCapacity).toBeNull();
    expect(m.brandingBundle).toEqual({ version: 1, logo_object_key: null, accent_color_hex: null });
  });

  it('accepts a past valid_from (the window-vs-now rule is authorModule’s, against DB time — A5)', () => {
    expect(() => parseModuleManifest(manifest({ valid_from: '2001-01-01T00:00:00Z' }))).not.toThrow();
  });

  it('the eligible member states are every lifecycle state except withdrawn / anonymized (A4)', () => {
    expect([...ELIGIBILITY_MEMBER_STATES].sort()).toEqual(
      MEMBER_LIFECYCLE_STATES.filter((s) => s !== 'withdrawn' && s !== 'anonymized').sort(),
    );
  });
});

describe('parseModuleManifest — rejected (AC7), each with ModuleManifestInvalidError', () => {
  it.each(['role', 'cohort', 'public', 'block', 'pariwar'])('an unknown scope %s', (scope) => {
    expectInvalid(manifest({ scope_filter: { version: 1, scope, values: ['x'] } }));
    expectInvalid(manifest({ scope_filter: { version: 1, scope } }));
  });

  it.each([
    ['empty values', { version: 1, scope: 'state', values: [] }],
    ['duplicate values', { version: 1, scope: 'district', values: ['Patna', 'Patna'] }],
    ['an empty-string value', { version: 1, scope: 'state', values: [''] }],
    ['more than 200 values', { version: 1, scope: 'state', values: Array.from({ length: 201 }, (_, i) => `s${i}`) }],
    ['values on members-all', { version: 1, scope: 'members-all', values: ['Bihar'] }],
    ['state without values', { version: 1, scope: 'state' }],
  ])('a scope with %s', (_l, scope) => {
    expectInvalid(manifest({ scope_filter: scope }));
  });

  it('values are NOT normalised: a case/space variant is a distinct value (byte-identical matching)', () => {
    const scope = { version: 1, scope: 'state', values: ['Bihar', 'bihar', ' Bihar'] };
    expect(ScopeFilterV1Schema.parse(scope)).toEqual(scope);
  });

  it.each([
    ['an unknown clause (age_band)', { version: 1, clauses: [{ kind: 'age_band', min: 18, max: 60 }] }],
    [
      'a duplicate clause kind',
      {
        version: 1,
        clauses: [
          { kind: 'member_state_in', states: ['active'] },
          { kind: 'member_state_in', states: ['lock-in'] },
        ],
      },
    ],
    ['an empty states list', { version: 1, clauses: [{ kind: 'member_state_in', states: [] }] }],
    ['duplicate states', { version: 1, clauses: [{ kind: 'member_state_in', states: ['active', 'active'] }] }],
    ['the withdrawn state', { version: 1, clauses: [{ kind: 'member_state_in', states: ['withdrawn'] }] }],
    ['the anonymized state', { version: 1, clauses: [{ kind: 'member_state_in', states: ['anonymized'] }] }],
    ['an unknown state', { version: 1, clauses: [{ kind: 'member_state_in', states: ['deceased'] }] }],
    ['more than 8 clauses', { version: 1, clauses: Array.from({ length: 9 }, () => ({ kind: 'member_state_in', states: ['active'] })) }],
    ['an extra clause key', { version: 1, clauses: [{ kind: 'member_state_in', states: ['active'], extra: 1 }] }],
  ])('an eligibility filter with %s', (_l, f) => {
    expectInvalid(manifest({ eligibility_filter: f }));
  });

  it.each([
    ['scope version 2', { scope_filter: { version: 2, scope: 'members-all' } }],
    ['eligibility version 2', { eligibility_filter: { version: 2, clauses: [] } }],
    ['branding version 2', { branding_bundle: { version: 2, logo_object_key: null, accent_color_hex: null } }],
    ['an extra scope key', { scope_filter: { version: 1, scope: 'members-all', extra: true } }],
    ['an extra eligibility key', { eligibility_filter: { version: 1, clauses: [], extra: true } }],
    ['an extra branding key', { branding_bundle: { version: 1, logo_object_key: null, accent_color_hex: null, x: 1 } }],
    ['an extra manifest key', { commission_terms: '2%' }],
    ['a module_id key (a command arg, not input)', { module_id: PARTNER }],
    ['a pariwar_id key (a command arg, not input)', { pariwar_id: PARTNER }],
    ['a manifest_schema_version key (a constant, not input)', { manifest_schema_version: 1 }],
  ])('%s', (_l, o) => {
    expectInvalid(manifest(o));
  });

  it('a missing content key', () => {
    const m = manifest();
    delete m['lead_handoff_url'];
    expectInvalid(m);
  });

  it.each([
    ['http:', 'http://leads.partner.example/x'],
    ['userinfo', 'https://user:pass@leads.partner.example/x'],
    ['a username only', 'https://user@leads.partner.example/x'],
    ['a query string', 'https://leads.partner.example/x?member=1'],
    ['a bare "?"', 'https://leads.partner.example/x?'],
    ['a fragment', 'https://leads.partner.example/x#frag'],
    ['a bare "#"', 'https://leads.partner.example/x#'],
    ['an IPv4 host', 'https://10.0.0.5/x'],
    ['an IPv4 host in hex (normalised by the parser)', 'https://0x7f.0.0.1/x'],
    ['an IPv4 host as one integer', 'https://2130706433/x'],
    ['an IPv6 host', 'https://[::1]/x'],
    ['localhost', 'https://localhost/x'],
    ['localhost with a trailing dot', 'https://localhost./x'],
    ['a *.localhost name', 'https://api.localhost/x'],
    ['not a URL', 'leads.partner.example/x'],
    ['a trailing newline (the parser strips it — RV3)', 'https://leads.partner.example/x\n'],
    ['a leading space (the parser strips it — RV3)', ' https://leads.partner.example/x'],
    ['an embedded tab (the parser deletes it — RV3)', 'https://leads.partner.example/x\ty'],
    ['an embedded carriage return (RV3)', 'https://leads.partner.example/x\ry'],
    ['a space in the path (RV3)', 'https://leads.partner.example/x y'],
    ['a NUL (RV3)', 'https://leads.partner.example/x\u0000'],
    ['a backslash (read as "/" — RV3)', 'https://leads.partner.example\\x'],
    ['an "@" in the PATH (stricter than "no userinfo" — RV4, recorded)', 'https://partner.example/@team/hook'],
    ['a lone surrogate (the parser turns it into U+FFFD; Postgres refuses the raw JSON — RP1)', 'https://leads.partner.example/x\ud800'],
    ['"https:host" — no slashes (RP1)', 'https:leads.partner.example/x'],
    ['"https:/host" — one slash (RP1)', 'https:/leads.partner.example/x'],
    ['"https:///host" — three slashes (RP1)', 'https:///leads.partner.example/x'],
    ['an upper-case scheme and host (RP1)', 'HTTPS://Leads.Partner.Example/x'],
    ['an explicit default port (RP1)', 'https://leads.partner.example:443/x'],
    ['dot segments (RP1)', 'https://leads.partner.example/a/../b'],
    ['an un-encoded non-ASCII path character (RP1)', 'https://leads.partner.example/café'],
    ['a no-break space in the path (RP1)', 'https://leads.partner.example/x y'],
    ['over 2048 characters', `https://leads.partner.example/${'a'.repeat(2048)}`],
  ])('a lead_handoff_url with %s', (_l, url) => {
    expectInvalid(manifest({ lead_handoff_url: url }));
  });

  it.each([
    ['a NUL in name_en', { name_en: 'a\u0000b' }],
    ['a NUL in description_hi', { description_hi: 'x\u0000' }],
    ['an unpaired high surrogate in name_hi', { name_hi: 'a\ud800b' }],
    ['an unpaired low surrogate in description_en', { description_en: '\udc00' }],
    ['a NUL in a scope value', { scope_filter: { version: 1, scope: 'state', values: ['Bi\u0000har'] } }],
    ['an unpaired surrogate in a scope value', { scope_filter: { version: 1, scope: 'state', values: ['Bi\ud800har'] } }],
    ['a 121-character scope value', { scope_filter: { version: 1, scope: 'district', values: ['x'.repeat(121)] } }],
    ['a NUL in the logo key', { branding_bundle: { version: 1, logo_object_key: 'a\u0000b', accent_color_hex: null } }],
  ])('%s (RV5 — Postgres refuses it, so it is a manifest error here)', (_l, o) => {
    expectInvalid(manifest(o));
  });

  it('RV5 accepts a well-formed surrogate pair (an emoji) and a 120-character scope value', () => {
    const m = parseModuleManifest(
      manifest({ name_en: 'Offer \u{1F393}', scope_filter: { version: 1, scope: 'district', values: ['x'.repeat(120)] } }),
    );
    expect(m.nameEn).toBe('Offer \u{1F393}');
    expect(m.scopeFilter).toEqual({ version: 1, scope: 'district', values: ['x'.repeat(120)] });
  });

  it.each(['', 'has space', 'slash/name', 'a'.repeat(256), 'projects/p/secrets/x'])('a bad secret name %j', (name) => {
    expectInvalid(manifest({ lead_handoff_signing_key_secret_name: name }));
  });

  it.each([
    ['valid_until = valid_from', { valid_from: '2026-11-01T00:00:00Z', valid_until: '2026-11-01T00:00:00Z' }],
    ['valid_until < valid_from', { valid_from: '2026-11-02T00:00:00Z', valid_until: '2026-11-01T00:00:00Z' }],
    ['a non-ISO date', { valid_from: '1 Nov 2026' }],
  ])('%s', (_l, o) => {
    expectInvalid(manifest(o));
  });

  it.each([0, -1, 1.5, '5'])('slot_capacity %j', (cap) => {
    expectInvalid(manifest({ slot_capacity: cap }));
  });

  it.each([
    ['an empty name', { name_en: '   ' }],
    ['a 121-char name', { name_hi: 'क'.repeat(121) }],
    ['an empty description', { description_en: '' }],
    ['a 2001-char description', { description_hi: 'd'.repeat(2001) }],
    ['a non-uuid partner_id', { partner_id: 'hdfc' }],
  ])('%s', (_l, o) => {
    expectInvalid(manifest(o));
  });

  it.each([
    ['an upper-case accent', { version: 1, logo_object_key: null, accent_color_hex: '#004C8F' }],
    ['a 3-digit accent', { version: 1, logo_object_key: null, accent_color_hex: '#04c' }],
    ['an empty logo key', { version: 1, logo_object_key: '', accent_color_hex: null }],
  ])('a branding bundle with %s', (_l, b) => {
    expect(ModuleBrandingBundleSchema.safeParse(b).success).toBe(false);
    expectInvalid(manifest({ branding_bundle: b }));
  });

  it('wraps the ZodError (⛔ throws it bare)', () => {
    try {
      parseModuleManifest(manifest({ slot_capacity: 0 }));
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ModuleManifestInvalidError);
      expect((err as ModuleManifestInvalidError).issues.length).toBeGreaterThan(0);
    }
  });

  it('AC7: no evaluator is exported — which members SEE a module is Story 12.3’s predicate (RP13)', () => {
    const names = Object.keys(marketplace);
    expect(names.length).toBeGreaterThan(20); // the barrel really was read
    expect(names.filter((n) => /evaluat|isEligible|isOfferable|matchesScope|matchesAudience|resolveAudience/i.test(n))).toEqual([]);
  });

  it.each([null, undefined, 'manifest', 42, []])('a non-object input %j', (input) => {
    expectInvalid(input);
  });
});

describe('lead_handoff_url — the canonical form is accepted (RP1)', () => {
  it.each([
    'https://leads.partner.example',
    'https://leads.partner.example/',
    'https://leads.partner.example/caf%C3%A9',
    'https://leads.partner.example:8443/hdfc',
    'https://leads.partner.example/a/b.c-d_e',
  ])('%s is stored exactly as written', (url) => {
    expect(parseModuleManifest(manifest({ lead_handoff_url: url })).leadHandoffUrl).toBe(url);
  });
});

// RP9 — each limit has BOTH sides: a `.max(119)` regression must fail, not only a missing `.max`.
// ⚠ MAX_ELIGIBILITY_CLAUSES = 8 has no accept-at-limit leg: each clause kind may appear once and v1 has ONE kind.
describe('limits — accepted AT the limit, refused one past it (RP9)', () => {
  const ORIGIN = 'https://leads.partner.example/';
  const accepts = (o: Record<string, unknown>): void => {
    expect(() => parseModuleManifest(manifest(o))).not.toThrow();
  };

  it('name: 120 / 121', () => {
    accepts({ name_en: 'n'.repeat(120), name_hi: 'क'.repeat(120) });
    expectInvalid(manifest({ name_en: 'n'.repeat(121) }));
  });
  it('description: 2000 / 2001', () => {
    accepts({ description_en: 'd'.repeat(2000) });
    expectInvalid(manifest({ description_en: 'd'.repeat(2001) }));
  });
  it('signing-key secret name: 255 / 256', () => {
    accepts({ lead_handoff_signing_key_secret_name: 'k'.repeat(255) });
    expectInvalid(manifest({ lead_handoff_signing_key_secret_name: 'k'.repeat(256) }));
  });
  it('lead_handoff_url: 2048 / 2049 characters', () => {
    accepts({ lead_handoff_url: ORIGIN + 'a'.repeat(2048 - ORIGIN.length) });
    expectInvalid(manifest({ lead_handoff_url: ORIGIN + 'a'.repeat(2049 - ORIGIN.length) }));
  });
  it('scope values: 200 / 201 values, and 120 / 121 characters each', () => {
    const values = (n: number) => Array.from({ length: n }, (_, i) => `s${i}`);
    accepts({ scope_filter: { version: 1, scope: 'state', values: values(200) } });
    expectInvalid(manifest({ scope_filter: { version: 1, scope: 'state', values: values(201) } }));
    accepts({ scope_filter: { version: 1, scope: 'district', values: ['x'.repeat(120)] } });
    expectInvalid(manifest({ scope_filter: { version: 1, scope: 'district', values: ['x'.repeat(121)] } }));
  });
  it('slot_capacity: the int4 maximum is accepted, one past it is a manifest error (⛔ a 22003)', () => {
    accepts({ slot_capacity: 2_147_483_647 });
    expectInvalid(manifest({ slot_capacity: 2_147_483_648 }));
  });
});
