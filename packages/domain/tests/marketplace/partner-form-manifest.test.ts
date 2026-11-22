// Story 12.5b (Task 2; AC1, AC3, AC11's issue paths; QE2, QE3; G25, TR31) — the manifest's ROUTE, DB-free.
//
// `parseModuleManifest` parses `lead_route` FIRST, then that route's strict arm, so every issue keeps its FIELD path — a `z.union`
// would report ONE issue at `[]` and the wizard would open its summary step instead of the field (G25). AC3: the partner page URL
// rule, every refusal by a typed `ModuleManifestInvalidError`.

import { describe, expect, it } from 'vitest';

import { ModuleManifestInvalidError } from '../../src/marketplace/errors.js';
import { modulePartnerFormUrlSchema, parseModuleManifest } from '../../src/marketplace/filters.js';

const PARTNER = '0f8fad5b-d9cb-469f-a165-70867728950e';
const PAGE = 'https://partner.example/apply?offer=twt-bihar-lic';

function base(): Record<string, unknown> {
  return {
    partner_id: PARTNER,
    name_en: 'LIC term plan',
    name_hi: 'एलआईसी टर्म प्लान',
    description_en: 'A term-plan offer for members.',
    description_hi: 'सदस्यों के लिए टर्म प्लान प्रस्ताव।',
    eligibility_filter: { version: 1, clauses: [] },
    scope_filter: { version: 1, scope: 'members-all' },
    valid_from: '2026-11-01T00:00:00.000Z',
    valid_until: '2026-12-01T00:00:00.000Z',
    branding_bundle: { version: 1, logo_object_key: null, accent_color_hex: null },
  };
}
const partnerForm = (o: Record<string, unknown> = {}) => ({ ...base(), lead_route: 'partner_form', partner_form_url: PAGE, ...o });
const trustSends = (o: Record<string, unknown> = {}) => ({
  ...base(),
  lead_route: 'trust_sends',
  slot_capacity: 5,
  lead_handoff_url: 'https://leads.partner.example/lic',
  lead_handoff_signing_key_secret_name: 'marketplace-lic-signing-key',
  ...o,
});

/** The issues `input` is refused with (a typed error — ⛔ a bare ZodError). */
function issuesOf(input: unknown): { path: (string | number)[]; message: string }[] {
  try {
    parseModuleManifest(input);
  } catch (e) {
    expect(e).toBeInstanceOf(ModuleManifestInvalidError);
    return (e as ModuleManifestInvalidError).issues.map((i) => ({ path: [...i.path], message: i.message }));
  }
  throw new Error('expected ModuleManifestInvalidError');
}

describe('Story 12.5b — the route (QE2)', () => {
  it('AC1: a partner_form manifest parses to the partner_form shape — ⛔ places, ⛔ handoff URL, ⛔ signing key', () => {
    const m = parseModuleManifest(partnerForm());
    expect(m).toMatchObject({
      leadRoute: 'partner_form',
      partnerFormUrl: PAGE,
      slotCapacity: null,
      leadHandoffUrl: null,
      leadHandoffSigningKeySecretName: null,
    });
  });

  it('the admin client may send the other route\'s keys as null (every key is sent) — both routes', () => {
    expect(parseModuleManifest(partnerForm({ slot_capacity: null, lead_handoff_url: null, lead_handoff_signing_key_secret_name: null })).leadRoute).toBe(
      'partner_form',
    );
    expect(parseModuleManifest(trustSends({ partner_form_url: null }))).toMatchObject({ leadRoute: 'trust_sends', partnerFormUrl: null, slotCapacity: 5 });
  });

  it.each([
    ['missing', undefined],
    ['unknown', 'both'],
    ['wrong type', 1],
  ])('a %s lead_route is ONE issue at path [lead_route]', (_l, route) => {
    const input = route === undefined ? base() : { ...base(), lead_route: route };
    const issues = issuesOf(input);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.path).toEqual(['lead_route']);
  });

  it.each([
    ['partner_form + places', partnerForm({ slot_capacity: 5 }), ['slot_capacity'], 'no places'],
    ['partner_form + a handoff URL', partnerForm({ lead_handoff_url: 'https://leads.partner.example/lic' }), ['lead_handoff_url'], 'sends nothing'],
    ['partner_form + a signing key', partnerForm({ lead_handoff_signing_key_secret_name: 'k' }), ['lead_handoff_signing_key_secret_name'], 'sends nothing'],
    ['partner_form with ⛔ page', partnerForm({ partner_form_url: undefined }), ['partner_form_url'], 'Required'],
    ['trust_sends + a partner page', trustSends({ partner_form_url: PAGE }), ['partner_form_url'], "partner's own page"],
    ['trust_sends with ⛔ handoff URL', trustSends({ lead_handoff_url: null }), ['lead_handoff_url'], 'Expected string'],
  ])('G25 / AC11: %s is refused with the issue at THAT field\'s path', (_l, input, path, message) => {
    const issues = issuesOf(JSON.parse(JSON.stringify(input)));
    expect(issues.map((i) => i.path)).toEqual([path]);
    expect(issues[0]!.message).toContain(message);
  });

  it('a field error on a partner_form manifest keeps its own path too (⛔ a root-level union issue)', () => {
    const issues = issuesOf(partnerForm({ name_hi: 'LIC' }));
    expect(issues.map((i) => i.path)).toEqual([['name_hi']]);
  });

  it('the input still refuses an unknown key and the manifest_schema_version key on either route (strict)', () => {
    expect(issuesOf(partnerForm({ extra: 1 })).map((i) => i.path)).toEqual([[]]);
    expect(issuesOf(partnerForm({ manifest_schema_version: 2 }))[0]!.message).toMatch(/Unrecognized key/);
  });
});

describe('Story 12.5b — the partner page URL rule (QE3; AC3)', () => {
  it.each([
    PAGE,
    'https://partner.example/apply',
    'https://partner.example/',
    'https://partner.example',
    'https://partner.example/apply?offer=twt&src=pariwar',
    'https://partner.example/a?x=1:2/3?4',
    'https://partner.example/caf%C3%A9?q=%20',
  ])('accepts %s and stores it exactly as written', (url) => {
    expect(parseModuleManifest(partnerForm({ partner_form_url: url })).partnerFormUrl).toBe(url);
  });

  it.each([
    ['http:', 'http://partner.example/apply?offer=x'],
    ['a fragment', 'https://partner.example/apply?offer=x#top'],
    ['a bare # (empty fragment)', 'https://partner.example/apply#'],
    ['a bare ? (empty query)', 'https://partner.example/apply?'],
    ['userinfo', 'https://user:pass@partner.example/apply'],
    ['an @ anywhere (query)', 'https://partner.example/apply?who=a@b'],
    ['an @ anywhere (path)', 'https://partner.example/@team/apply'],
    ['an IPv4 literal', 'https://192.0.2.10/apply'],
    ['an IPv6 literal', 'https://[2001:db8::1]/apply'],
    ['localhost', 'https://localhost/apply'],
    ['a *.localhost name', 'https://partner.localhost/apply'],
    ['an explicit port', 'https://partner.example:8443/apply'],
    ['a default port (non-canonical)', 'https://partner.example:443/apply'],
    ['a space', 'https://partner.example/apply?offer=a b'],
    ['a tab', 'https://partner.example/apply\t'],
    ['a control character', 'https://partner.example/apply\u0001'],
    ['a backslash', 'https://partner.example\\apply'],
    ['an upper-case host (non-canonical)', 'https://Partner.example/apply'],
    ['a dot segment (non-canonical)', 'https://partner.example/a/../apply'],
    ['a bare origin with a query (non-canonical)', 'https://partner.example?offer=x'],
    ['a character outside RFC 3986 (|)', 'https://partner.example/a|b'],
    ['a character outside RFC 3986 (^ in the query)', 'https://partner.example/a?x=^'],
    ['a malformed % escape', 'https://partner.example/a?x=%zz'],
    ['not a URL', 'partner.example/apply'],
  ])('refuses %s (a typed ModuleManifestInvalidError at [partner_form_url])', (_l, url) => {
    const issues = issuesOf(partnerForm({ partner_form_url: url }));
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.every((i) => i.path[0] === 'partner_form_url')).toBe(true);
  });

  it('2048 characters are accepted, 2049 refused', () => {
    const head = 'https://partner.example/apply?offer=';
    expect(modulePartnerFormUrlSchema.safeParse(head + 'a'.repeat(2048 - head.length)).success).toBe(true);
    expect(issuesOf(partnerForm({ partner_form_url: head + 'a'.repeat(2049 - head.length) }))[0]!.path).toEqual(['partner_form_url']);
  });

  it('the lead URL rule is unchanged: a query is still refused there (G5)', () => {
    expect(issuesOf(trustSends({ lead_handoff_url: PAGE }))[0]!.path).toEqual(['lead_handoff_url']);
  });
});
