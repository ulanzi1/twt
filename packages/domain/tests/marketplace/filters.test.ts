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
    // R3-6 — each of these EQUALS its own WHATWG href, so only the RFC 3986 rule refuses it.
    ['a malformed escape "%zz" (R3-6)', 'https://leads.partner.example/a%zz'],
    ['a bare "%" at the end (R3-6)', 'https://leads.partner.example/a%'],
    ['a one-digit escape "%a" (R3-6)', 'https://leads.partner.example/a%a'],
    ['a "|" in the path (R3-6)', 'https://leads.partner.example/a|b'],
    ['a "^" in the path (R3-6)', 'https://leads.partner.example/a^b'],
    ['a "[" / "]" in the path (R3-6)', 'https://leads.partner.example/a[b]'],
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

  // R3-4 / R4-1 — zod's `datetime` bounds only the WRITTEN digits; each of these passes it and must be refused here.
  const RANGE = 'must be a real instant in UTC years 2000–9999';
  const messagesOf = (input: unknown): string[] => {
    try {
      parseModuleManifest(input);
    } catch (err) {
      expect(err).toBeInstanceOf(ModuleManifestInvalidError);
      return (err as ModuleManifestInvalidError).issues.map((i) => i.message);
    }
    return expect.unreachable('parseModuleManifest accepted it');
  };

  it.each([
    ['a valid_until that is year 10000 in UTC', { valid_until: '9999-12-31T20:00:00-05:00' }],
    ['a valid_from in year 0000 UTC', { valid_from: '0000-06-01T00:00:00Z' }],
    ['a valid_from that is year 0000 in UTC (0001-01-01 at +05:30)', { valid_from: '0001-01-01T00:00:00+05:30' }],
    ['an offset of +24:00 (Date.parse is NaN)', { valid_until: '2026-12-01T00:00:00+24:00' }],
    // R4-1: drizzle reads these back through `new Date(text)` as 2001 / 1950 — the floor is 2000.
    ['a valid_from in year 0001 (read back as 2001 — R4-1)', { valid_from: '0001-01-01T00:00:00Z' }],
    ['a valid_from in year 0050 (read back as 1950 — R4-1)', { valid_from: '0050-01-01T00:00:00Z' }],
    ['a valid_from one millisecond before the 2000 floor (R4-1)', { valid_from: '1999-12-31T23:59:59.999Z' }],
  ])('%s (R3-4) — a manifest error, with no misleading window message', (_l, o) => {
    const messages = messagesOf(manifest(o));
    expect(messages).toContain(RANGE);
    expect(messages).not.toContain('valid_until must be after valid_from');
  });

  // R4-2 — a malformed string carries the ONE `datetime` issue: no range message, no window message — even when V8
  // can parse it (`'2027-01-01'`) and the pair is inverted.
  it.each([
    ['a non-date string', { valid_from: 'hello' }],
    ['a date-only valid_until before valid_from', { valid_from: '2026-11-01T00:00:00Z', valid_until: '2026-10-01' }],
    ['a slash-separated valid_from after valid_until', { valid_from: '2027/01/01', valid_until: '2026-12-01T00:00:00Z' }],
  ])('%s (R4-2) — only the datetime issue', (_l, o) => {
    expect(messagesOf(manifest(o))).toEqual(['Invalid datetime']);
  });

  it('R4-1 accepts the year bounds themselves: 2000-01-01 and 9999-12-31 in UTC', () => {
    const m = parseModuleManifest(manifest({ valid_from: '2000-01-01T00:00:00Z', valid_until: '9999-12-31T23:59:59.999Z' }));
    expect(m.validFrom.toISOString()).toBe('2000-01-01T00:00:00.000Z');
    expect(m.validUntil.toISOString()).toBe('9999-12-31T23:59:59.999Z');
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
    // R3-6 — every RFC 3986 sub-delim, `~`, `:` in the path, and a lower-case escape stay accepted.
    "https://leads.partner.example/x~y/!$&'()*+,;=:z",
    'https://leads.partner.example/caf%c3%a9',
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

// ── Story 12.2 (`2026-11-01-433` QE12; AC10) — the WRITE-ONLY display-text schemas ─────────────────────
// Every refused character sits at an INTERIOR position (`.trim()` would strip an edge one) and is built with
// `String.fromCodePoint`, so this file holds ⛔ raw invisible character (TR15).
describe('Story 12.2 — QE12 display-text rules (write-only schemas)', () => {
  const cp = (n: number): string => String.fromCodePoint(n);
  const en = (ch: string): string => `HDFC${ch}home`;
  const hi = (ch: string): string => `गृह${ch}ऋण`;

  // 12.2 code review round 1 (RP1). The four Hangul fillers are LETTERS (category Lo) that draw nothing, so the
  // letter-or-digit rule alone let a blank-looking name through; U+2028 / U+2029 are line / paragraph separators the
  // control-character rule (C0 / C1 only) never covered; the rest are format characters (category Cf) outside the
  // bidi / zero-width list. All are numeric code points — the source carries no invisible character (TR15).
  const FILLERS = [0x115f, 0x1160, 0x3164, 0xffa0];
  function reviewRound1Refused(): Array<[string, number]> {
    return [
      ['Hangul filler U+115F', 0x115f],
      ['Hangul jungseong filler U+1160', 0x1160],
      ['Hangul filler U+3164', 0x3164],
      ['halfwidth Hangul filler U+FFA0', 0xffa0],
      ['LINE SEPARATOR U+2028', 0x2028],
      ['PARAGRAPH SEPARATOR U+2029', 0x2029],
      ['Mongolian vowel separator U+180E', 0x180e],
      ['function application U+2061', 0x2061],
      ['invisible plus U+2064', 0x2064],
      ['deprecated format U+206A', 0x206a],
      ['deprecated format U+206F', 0x206f],
      ['interlinear annotation anchor U+FFF9', 0xfff9],
      ['tag letter A U+E0041', 0xe0041],
      ['cancel tag U+E007F', 0xe007f],
      // DN2 (BigDev: option 2) — the rest of Unicode's default-ignorable set, which `\p{Cf}` does not cover, and the Braille
      // blank. Each makes a name that reads identically to one without it, and a partner row can never be corrected.
      ['combining grapheme joiner U+034F', 0x034f],
      ['Khmer inherent vowel U+17B4', 0x17b4],
      ['Mongolian free variation selector U+180B', 0x180b],
      ['variation selector-1 U+FE00', 0xfe00],
      ['variation selector-14 U+FE0D', 0xfe0d],
      ['variation selector-17 U+E0100', 0xe0100],
      ['Braille blank U+2800', 0x2800],
    ];
  }

  const refused: Array<[string, number]> = [
    ['NUL', 0x0000],
    ['TAB', 0x0009],
    ['CR', 0x000d],
    ['US (0x1F)', 0x001f],
    ['DEL', 0x007f],
    ['C1 0x80', 0x0080],
    ['C1 0x85 (NEL)', 0x0085],
    ['C1 0x9F', 0x009f],
    ['ALM U+061C', 0x061c],
    ['LRM U+200E', 0x200e],
    ['RLM U+200F', 0x200f],
    ['LRE U+202A', 0x202a],
    ['RLE U+202B', 0x202b],
    ['PDF U+202C', 0x202c],
    ['LRO U+202D', 0x202d],
    ['RLO U+202E', 0x202e],
    ['LRI U+2066', 0x2066],
    ['RLI U+2067', 0x2067],
    ['FSI U+2068', 0x2068],
    ['PDI U+2069', 0x2069],
    ['ZWSP U+200B', 0x200b],
    ['WJ U+2060', 0x2060],
    ['BOM U+FEFF', 0xfeff],
    ['SHY U+00AD', 0x00ad],
    ...reviewRound1Refused(),
  ];

  it.each(refused)('refuses %s inside every one of the four module display schemas', (_l, code) => {
    const ch = cp(code);
    expect(marketplace.moduleDisplayNameEnSchema.safeParse(en(ch)).success).toBe(false);
    expect(marketplace.moduleDisplayNameHiSchema.safeParse(hi(ch)).success).toBe(false);
    expect(marketplace.moduleDisplayDescriptionEnSchema.safeParse(en(ch)).success).toBe(false);
    expect(marketplace.moduleDisplayDescriptionHiSchema.safeParse(hi(ch)).success).toBe(false);
  });

  it('LF is accepted inside a description and refused inside a name', () => {
    const lf = cp(0x0a);
    expect(marketplace.moduleDisplayDescriptionEnSchema.safeParse(en(lf)).success).toBe(true);
    expect(marketplace.moduleDisplayDescriptionHiSchema.safeParse(hi(lf)).success).toBe(true);
    expect(marketplace.moduleDisplayNameEnSchema.safeParse(en(lf)).success).toBe(false);
    expect(marketplace.moduleDisplayNameHiSchema.safeParse(hi(lf)).success).toBe(false);
  });

  it('ZWJ / ZWNJ inside Devanagari are ACCEPTED (conjunct control)', () => {
    for (const code of [0x200c, 0x200d]) {
      const v = `क्${cp(code)}ष`;
      expect(marketplace.moduleDisplayNameHiSchema.safeParse(v).success).toBe(true);
      expect(marketplace.moduleDisplayDescriptionHiSchema.safeParse(v).success).toBe(true);
      expect(marketplace.partnerDisplayNameHiSchema.safeParse(v).success).toBe(true);
    }
  });

  // (The Hindi half — ZWJ / ZWNJ still ACCEPTED in the `*_hi` schemas — is the test just above.)
  it('DN1: ZWJ / ZWNJ are REFUSED in every English display schema (a look-alike duplicate partner)', () => {
    for (const code of [0x200c, 0x200d]) {
      expect(marketplace.moduleDisplayNameEnSchema.safeParse(en(cp(code))).success).toBe(false);
      expect(marketplace.moduleDisplayDescriptionEnSchema.safeParse(en(cp(code))).success).toBe(false);
      expect(marketplace.partnerDisplayNameEnSchema.safeParse(en(cp(code))).success).toBe(false);
    }
  });

  it('RP1: every round-1 refusal holds in both partner schemas too', () => {
    for (const [, code] of reviewRound1Refused()) {
      expect(marketplace.partnerDisplayNameEnSchema.safeParse(en(cp(code))).success).toBe(false);
      expect(marketplace.partnerDisplayNameHiSchema.safeParse(hi(cp(code))).success).toBe(false);
    }
  });

  // DN2 (BigDev: option 2): U+FE0F / U+FE0E are the emoji / text PRESENTATION selectors. They are default-ignorable too, but stay
  // ALLOWED so a heart or a tick mark still works in a name or a description. The one residual look-alike is "LIC" + U+FE0F.
  it('DN2: U+FE0F / U+FE0E stay ACCEPTED in every display schema (an emoji with a presentation selector)', () => {
    for (const code of [0xfe0f, 0xfe0e]) {
      const heart = `Care ${cp(0x2764)}${cp(code)}`;
      expect(marketplace.moduleDisplayNameEnSchema.safeParse(heart).success).toBe(true);
      expect(marketplace.moduleDisplayDescriptionEnSchema.safeParse(heart).success).toBe(true);
      expect(marketplace.partnerDisplayNameEnSchema.safeParse(heart).success).toBe(true);
      expect(marketplace.moduleDisplayNameHiSchema.safeParse(hi(cp(code))).success).toBe(true);
      expect(marketplace.partnerDisplayNameHiSchema.safeParse(hi(cp(code))).success).toBe(true);
    }
  });

  // The wider refusal must not catch real text: matras, nukta, virama, danda, Devanagari digits, the rupee sign, curly quotes, an
  // en dash, emoji and a ZWJ inside a Devanagari conjunct (still allowed in `*_hi`).
  it('DN2: ordinary Hindi and English copy is still accepted', () => {
    const hindi = [
      'एचडीएफसी बैंक गृह ऋण',
      'क्ष त्र ज्ञ श्री',
      'ऑफ़र: ₹५ लाख तक का ऋण।',
      `क्${cp(0x200d)}ष और क्${cp(0x200c)}ष`,
      'बीमा – 5% की छूट',
    ];
    const english = ['HDFC home loan', 'LIC term plan (2026) – 5% off', 'Rahul’s “best” offer: ₹5 lakh', `Care ${cp(0x2764)}${cp(0xfe0f)} insurance`, `Win ${cp(0x1f389)} a prize`];
    for (const v of hindi) {
      expect(marketplace.moduleDisplayNameHiSchema.safeParse(v).success, v).toBe(true);
      expect(marketplace.moduleDisplayDescriptionHiSchema.safeParse(v).success, v).toBe(true);
      expect(marketplace.partnerDisplayNameHiSchema.safeParse(v).success, v).toBe(true);
    }
    for (const v of english) {
      expect(marketplace.moduleDisplayNameEnSchema.safeParse(v).success, v).toBe(true);
      expect(marketplace.moduleDisplayDescriptionEnSchema.safeParse(v).success, v).toBe(true);
      expect(marketplace.partnerDisplayNameEnSchema.safeParse(v).success, v).toBe(true);
    }
  });

  it('DN2: the other selectors are refused even next to a letter, in the English AND the Hindi schemas', () => {
    for (const code of [0x034f, 0xfe00, 0x180b, 0x2800]) {
      expect(marketplace.partnerDisplayNameEnSchema.safeParse(`LIC${cp(code)}`).success).toBe(false);
      expect(marketplace.partnerDisplayNameHiSchema.safeParse(`एलआईसी${cp(code)}`).success).toBe(false);
    }
  });

  it('RP1: a name made only of fillers is refused (it looked blank and passed the letter rule)', () => {
    for (const code of FILLERS) {
      expect(marketplace.partnerDisplayNameEnSchema.safeParse(cp(code)).success).toBe(false);
      expect(marketplace.moduleDisplayNameEnSchema.safeParse(cp(code).repeat(3)).success).toBe(false);
      expect(marketplace.moduleDisplayNameEnSchema.safeParse(`${cp(code)}LIC${cp(code)}`).success).toBe(false);
    }
  });

  it.each([['spaces and punctuation', ' - . , '], ['dashes only', '---'], ['a danda only', '।']])(
    'refuses a blank-looking value (%s)',
    (_l, v) => {
      expect(marketplace.moduleDisplayNameEnSchema.safeParse(v).success).toBe(false);
      expect(marketplace.moduleDisplayNameHiSchema.safeParse(v).success).toBe(false);
      expect(marketplace.moduleDisplayDescriptionEnSchema.safeParse(v).success).toBe(false);
    },
  );

  it.each([['LIC'], ['LIC ।'], ['12345']])('a *_hi value with NO Devanagari letter is refused: %s', (v) => {
    expect(marketplace.moduleDisplayNameHiSchema.safeParse(v).success).toBe(false);
    expect(marketplace.moduleDisplayDescriptionHiSchema.safeParse(v).success).toBe(false);
    // …while the English schemas accept the letter-bearing ones.
    if (/[A-Za-z0-9]/.test(v)) expect(marketplace.moduleDisplayNameEnSchema.safeParse(v).success).toBe(true);
  });

  it('mixed Latin + Devanagari passes the Hindi schema, and values are trimmed', () => {
    expect(marketplace.moduleDisplayNameHiSchema.parse('  LIC टर्म प्लान  ')).toBe('LIC टर्म प्लान');
    expect(marketplace.moduleDisplayNameEnSchema.parse('  LIC term plan ')).toBe('LIC term plan');
  });

  it('keeps 12.1 lengths: name 120 / 121, description 2000 / 2001', () => {
    expect(marketplace.moduleDisplayNameEnSchema.safeParse('n'.repeat(120)).success).toBe(true);
    expect(marketplace.moduleDisplayNameEnSchema.safeParse('n'.repeat(121)).success).toBe(false);
    expect(marketplace.moduleDisplayDescriptionHiSchema.safeParse('क'.repeat(2000)).success).toBe(true);
    expect(marketplace.moduleDisplayDescriptionHiSchema.safeParse('क'.repeat(2001)).success).toBe(false);
  });

  it('keeps 12.1’s storableText refine (an unpaired surrogate is refused)', () => {
    expect(marketplace.moduleDisplayNameEnSchema.safeParse(`ab${String.fromCharCode(0xd800)}cd`).success).toBe(false);
  });

  it('parseModuleManifest USES them: a Hindi name with no Devanagari is ModuleManifestInvalidError at path name_hi', () => {
    let caught: unknown;
    try {
      parseModuleManifest(manifest({ name_hi: 'LIC' }));
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ModuleManifestInvalidError);
    expect((caught as ModuleManifestInvalidError).issues.map((i) => i.path.join('.'))).toContain('name_hi');
  });

  it('parseModuleManifest refuses a bidi control inside description_en (path description_en)', () => {
    let caught: unknown;
    try {
      parseModuleManifest(manifest({ description_en: `A home${cp(0x202e)}loan` }));
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ModuleManifestInvalidError);
    expect((caught as ModuleManifestInvalidError).issues.map((i) => i.path.join('.'))).toEqual(['description_en']);
  });
});
