// Story 6.30 AC2 — the app-link grammar (`2026-10-10-312` AL2 / AL3 / AL8): the ONE path list as data, the
// URL builder and code parser, the env schemas, and the two verification-file bodies.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  APP_LINK_CODE_PARAM,
  APP_LINK_CODE_PATTERN,
  APP_LINK_PATHS,
  APP_LINK_PATH_LIST,
  buildAppLinkUrl,
  buildAppleAppSiteAssociation,
  buildAssetLinks,
  parseAndroidAppsEnv,
  parseAppLinkCode,
  parseIosAppIdsEnv,
  type AppLinkKey,
} from '../src/index.js';

const JSON_PATH = new URL('../src/app-links/app-link-paths.json', import.meta.url);
const CODE = 'Ab3dE5gH9kLm';
const FP = Array.from({ length: 32 }, (_, i) => (i * 7 + 16).toString(16).toUpperCase().padStart(2, '0')).join(':');
const FP2 = Array.from({ length: 32 }, () => 'AB').join(':');

describe('the ONE path list — JSON ↔ TypeScript view', () => {
  it('the TS view equals the JSON file, key for key', () => {
    const json = JSON.parse(readFileSync(JSON_PATH, 'utf8')) as Record<string, string>;
    expect({ ...APP_LINK_PATHS }).toEqual(json);
    expect([...APP_LINK_PATH_LIST].sort()).toEqual(Object.values(json).sort());
  });

  it('holds the hand-declared literal (a JSON import widens to string)', () => {
    expect(APP_LINK_PATHS.peerRequest).toBe('/peer-request');
  });

  it('has no duplicate paths', () => {
    expect(new Set(APP_LINK_PATH_LIST).size).toBe(APP_LINK_PATH_LIST.length);
  });

  // The by-package-path `require()` that `apps/mobile/app.config.ts` uses is proved FROM apps/mobile
  // (`tests/unit/app-links-lockstep.test.ts` + the `expo config` CI job) — a package cannot resolve itself
  // by name here (⛔ no `exports` map).
});

describe('buildAppLinkUrl', () => {
  it('forms <origin>/peer-request?c=<12 base62>', () => {
    const url = buildAppLinkUrl('https://example.org', 'peerRequest', CODE);
    expect(url).toBe(`https://example.org/peer-request?c=${CODE}`);
    expect(url).toMatch(/^https:\/\/example\.org\/peer-request\?c=[A-Za-z0-9]{12}$/);
  });

  it('keeps a non-default port', () => {
    expect(buildAppLinkUrl('https://example.org:8443', 'peerRequest', CODE)).toBe(
      `https://example.org:8443/peer-request?c=${CODE}`,
    );
  });

  it.each([
    ['a trailing slash', 'https://example.org/'],
    ['a path', 'https://example.org/app'],
    ['http', 'http://example.org'],
    ['credentials', 'https://u:p@example.org'],
    ['a query', 'https://example.org?x=1'],
    ['a fragment', 'https://example.org#x'],
    ['an upper-case host (un-normalised)', 'https://Example.org'],
    ['an explicit :443 (un-normalised)', 'https://example.org:443'],
    ['blank', ''],
    ['not a URL', 'example.org'],
  ])('refuses a base with %s', (_label, base) => {
    expect(() => buildAppLinkUrl(base, 'peerRequest', CODE)).toThrow(/bare https origin/);
  });

  it.each([
    ['too short', 'Ab3dE5gH9kL'],
    ['too long', 'Ab3dE5gH9kLmN'],
    ['a non-base62 character', 'Ab3dE5gH9k-m'],
    ['a URL-special character', 'Ab3dE5gH9k&m'],
    ['empty', ''],
  ])('refuses a malformed code (%s)', (_label, code) => {
    expect(() => buildAppLinkUrl('https://example.org', 'peerRequest', code)).toThrow(/malformed/);
  });

  it('refuses an unknown key (a JS caller) — ⛔ never https://host/undefined?c=…', () => {
    expect(() => buildAppLinkUrl('https://example.org', 'nope' as AppLinkKey, CODE)).toThrow(/unknown app-link key/);
  });
});

describe('parseAppLinkCode', () => {
  it('returns a valid single code', () => {
    expect(parseAppLinkCode({ [APP_LINK_CODE_PARAM]: CODE })).toBe(CODE);
    expect(parseAppLinkCode({ c: CODE, lang: 'hi' })).toBe(CODE);
  });

  it.each([
    ['missing', {}],
    ['undefined', { c: undefined }],
    ['malformed', { c: 'short' }],
    ['repeated (array)', { c: [CODE, CODE] }],
    ['single-element array', { c: [CODE] }],
  ])('returns null when %s', (_label, params) => {
    expect(parseAppLinkCode(params)).toBeNull();
  });

  it('the pattern is exactly 12 base-62 characters', () => {
    expect(APP_LINK_CODE_PATTERN.test(CODE)).toBe(true);
    expect(APP_LINK_CODE_PATTERN.test(`${CODE}\n`)).toBe(false);
  });
});

describe('the env schemas (N3)', () => {
  it('parses a comma list of iOS app ids', () => {
    expect(parseIosAppIdsEnv('ABCDE12345.org.example.app')).toEqual([{ iosAppId: 'ABCDE12345.org.example.app' }]);
    expect(parseIosAppIdsEnv(' ABCDE12345.org.example.app , ZYXWV98765.org.example.other ')).toEqual([
      { iosAppId: 'ABCDE12345.org.example.app' },
      { iosAppId: 'ZYXWV98765.org.example.other' },
    ]);
  });

  it.each([
    ['unset', undefined],
    ['blank', '  '],
    ['a lower-case Team ID', 'abcde12345.org.example.app'],
    ['a 9-character Team ID', 'ABCDE1234.org.example.app'],
    ['no bundle id', 'ABCDE12345'],
    ['a one-segment bundle id', 'ABCDE12345.app'],
    ['a bad bundle id character', 'ABCDE12345.org.exa mple.app'],
    ['an empty entry', 'ABCDE12345.org.example.app,'],
    ['a repeated id', 'ABCDE12345.org.example.app,ABCDE12345.org.example.app'],
  ])('refuses iOS ids: %s', (_label, raw) => {
    expect(parseIosAppIdsEnv(raw)).toBeNull();
  });

  it('parses the Android JSON list, upper-casing fingerprints', () => {
    const raw = JSON.stringify([{ package: 'org.example.app', sha256: [FP.toLowerCase()] }]);
    expect(parseAndroidAppsEnv(raw)).toEqual([{ androidPackage: 'org.example.app', sha256Fingerprints: [FP] }]);
  });

  it.each([
    ['unset', undefined],
    ['blank', ''],
    ['not JSON', '{oops'],
    ['an object, not a list', JSON.stringify({ package: 'org.example.app', sha256: [FP] })],
    ['an empty list', '[]'],
    ['no fingerprint', JSON.stringify([{ package: 'org.example.app', sha256: [] }])],
    ['a short fingerprint', JSON.stringify([{ package: 'org.example.app', sha256: ['AB:CD'] }])],
    ['a fingerprint without colons', JSON.stringify([{ package: 'org.example.app', sha256: [FP.replace(/:/g, '')] }])],
    ['a non-hex fingerprint', JSON.stringify([{ package: 'org.example.app', sha256: [FP.replace(/^../, 'ZZ')] }])],
    ['a bad package', JSON.stringify([{ package: 'example', sha256: [FP] }])],
    ['a package starting with a digit', JSON.stringify([{ package: '1org.example', sha256: [FP] }])],
    ['an unknown key (.strict())', JSON.stringify([{ package: 'org.example.app', sha256: [FP], extra: 1 }])],
    ['a repeated package', JSON.stringify([{ package: 'org.example.app', sha256: [FP] }, { package: 'org.example.app', sha256: [FP2] }])],
  ])('refuses Android apps: %s', (_label, raw) => {
    expect(parseAndroidAppsEnv(raw)).toBeNull();
  });
});

describe('the two verification-file bodies', () => {
  it('AASA for ONE app: one {"/": path} component per path, no "?" component', () => {
    const body = buildAppleAppSiteAssociation([{ iosAppId: 'ABCDE12345.org.example.app' }]);
    expect(body).toEqual({
      applinks: {
        details: [{ appIDs: ['ABCDE12345.org.example.app'], components: [{ '/': '/peer-request' }] }],
      },
    });
    const components = body.applinks.details[0]!.components;
    expect(components.map((component) => component['/'])).toEqual([...APP_LINK_PATH_LIST]);
    expect(JSON.stringify(body)).not.toContain('"?"');
  });

  it('AASA for TWO apps lists both ids', () => {
    const body = buildAppleAppSiteAssociation([
      { iosAppId: 'ABCDE12345.org.example.app' },
      { iosAppId: 'ZYXWV98765.org.example.other' },
    ]);
    expect(body.applinks.details).toHaveLength(1);
    expect(body.applinks.details[0]!.appIDs).toEqual(['ABCDE12345.org.example.app', 'ZYXWV98765.org.example.other']);
  });

  it('assetlinks for ONE app: one handle_all_urls statement', () => {
    expect(buildAssetLinks([{ androidPackage: 'org.example.app', sha256Fingerprints: [FP] }])).toEqual([
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: { namespace: 'android_app', package_name: 'org.example.app', sha256_cert_fingerprints: [FP] },
      },
    ]);
  });

  it('assetlinks for TWO apps: one statement per package', () => {
    const body = buildAssetLinks([
      { androidPackage: 'org.example.app', sha256Fingerprints: [FP] },
      { androidPackage: 'org.example.other', sha256Fingerprints: [FP, FP2] },
    ]);
    expect(body.map((statement) => statement.target.package_name)).toEqual(['org.example.app', 'org.example.other']);
    expect(body[1]!.target.sha256_cert_fingerprints).toEqual([FP, FP2]);
  });

  it('refuses an empty identity list (⛔ never a body that verifies nothing)', () => {
    expect(() => buildAppleAppSiteAssociation([])).toThrow();
    expect(() => buildAssetLinks([])).toThrow();
  });
});
