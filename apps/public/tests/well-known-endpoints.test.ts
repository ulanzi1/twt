// Story 6.30 AC5 — the two `/.well-known/` verification files (`2026-10-10-312` AL8). Each endpoint's `GET`
// is called DIRECTLY (a direct call sees the endpoint's own response — production would serve a null-body
// 404 as the HTML 404 page, still a 404). ⚠ The PII-scrape gate cannot see these `.ts` endpoints (it
// collects `.astro` pages only) — this file carries the "⛔ no member data" check; the gap is a
// deferred-work item.

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { APIContext } from 'astro';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildAppleAppSiteAssociation, buildAssetLinks } from '@twt/contracts';

import { GET as aasaGet } from '../src/pages/.well-known/apple-app-site-association.js';
import { GET as assetLinksGet } from '../src/pages/.well-known/assetlinks.json.js';

const FP = Array.from({ length: 32 }, (_, i) => (i + 16).toString(16).toUpperCase()).join(':');
const IOS_ID = 'ABCDE12345.org.example.fixture';
const ANDROID = [{ package: 'org.example.fixture', sha256: [FP] }];
const ENV_KEYS = ['APP_LINKS_IOS_APP_IDS', 'APP_LINKS_ANDROID_APPS'] as const;

const call = async (get: typeof aasaGet): Promise<Response> => get({} as APIContext);

let saved: Record<string, string | undefined> = {};
beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  for (const key of ENV_KEYS) delete process.env[key];
});
afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

function expectServed(res: Response): void {
  expect(res.status).toBe(200);
  expect(res.headers.get('content-type')).toBe('application/json');
  expect(res.headers.get('cache-control')).toBe('public, max-age=3600');
  expect(res.headers.get('location')).toBeNull();
}

describe('apple-app-site-association', () => {
  it('serves the builder body for a configured app id', async () => {
    process.env.APP_LINKS_IOS_APP_IDS = IOS_ID;
    const res = await call(aasaGet);
    expectServed(res);
    expect(await res.json()).toEqual(buildAppleAppSiteAssociation([{ iosAppId: IOS_ID }]));
  });

  it.each([['unset', undefined], ['blank', ' '], ['invalid', 'not-an-app-id']])('404 when %s', async (_label, value) => {
    if (value !== undefined) process.env.APP_LINKS_IOS_APP_IDS = value;
    const res = await call(aasaGet);
    expect(res.status).toBe(404);
    expect(res.headers.get('location')).toBeNull();
  });

  it('reads the env per REQUEST (⛔ not at module load)', async () => {
    expect((await call(aasaGet)).status).toBe(404);
    process.env.APP_LINKS_IOS_APP_IDS = IOS_ID;
    expect((await call(aasaGet)).status).toBe(200);
    delete process.env.APP_LINKS_IOS_APP_IDS;
    expect((await call(aasaGet)).status).toBe(404);
  });
});

describe('assetlinks.json', () => {
  it('serves the builder body for a configured app', async () => {
    process.env.APP_LINKS_ANDROID_APPS = JSON.stringify(ANDROID);
    const res = await call(assetLinksGet);
    expectServed(res);
    expect(await res.json()).toEqual(buildAssetLinks([{ androidPackage: 'org.example.fixture', sha256Fingerprints: [FP] }]));
  });

  it.each([['unset', undefined], ['blank', ''], ['not JSON', '{'], ['invalid', '[{"package":"x","sha256":[]}]']])(
    '404 when %s',
    async (_label, value) => {
      if (value !== undefined) process.env.APP_LINKS_ANDROID_APPS = value;
      const res = await call(assetLinksGet);
      expect(res.status).toBe(404);
      expect(res.headers.get('location')).toBeNull();
    },
  );

  it('reads the env per REQUEST (⛔ not at module load)', async () => {
    expect((await call(assetLinksGet)).status).toBe(404);
    process.env.APP_LINKS_ANDROID_APPS = JSON.stringify(ANDROID);
    expect((await call(assetLinksGet)).status).toBe(200);
  });
});

describe('a SET-but-invalid identity variable warns the operator (code review 2026-10-11)', () => {
  const cases = [
    ['APP_LINKS_IOS_APP_IDS', aasaGet, `${IOS_ID},`],
    ['APP_LINKS_ANDROID_APPS', assetLinksGet, JSON.stringify([{ package: 'org.example.fixture', sha256: [FP], name: 'x' }])],
  ] as const;

  for (const [variable, get, invalid] of cases) {
    it(`${variable}: invalid ⇒ 404 + ONE warning naming the variable, ⛔ never the value`, async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      try {
        process.env[variable] = invalid;
        expect((await call(get)).status).toBe(404);
        expect(warn).toHaveBeenCalledTimes(1);
        const message = String(warn.mock.calls[0]![0]);
        expect(message).toContain(variable);
        expect(message).not.toContain(invalid);
      } finally {
        warn.mockRestore();
      }
    });

    it(`${variable}: unset or blank ⇒ 404 and ⛔ no warning`, async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      try {
        expect((await call(get)).status).toBe(404);
        process.env[variable] = '  ';
        expect((await call(get)).status).toBe(404);
        expect(warn).not.toHaveBeenCalled();
      } finally {
        warn.mockRestore();
      }
    });
  }
});

describe('⛔ no member data — the bodies carry ONLY the identity values and the app-link paths', () => {
  it('every string in either body is an identity value, a path, or a fixed protocol word', async () => {
    process.env.APP_LINKS_IOS_APP_IDS = IOS_ID;
    process.env.APP_LINKS_ANDROID_APPS = JSON.stringify(ANDROID);
    const strings: string[] = [];
    const walk = (value: unknown): void => {
      if (typeof value === 'string') strings.push(value);
      else if (Array.isArray(value)) value.forEach(walk);
      else if (value !== null && typeof value === 'object') Object.values(value).forEach(walk);
    };
    walk(await (await call(aasaGet)).json());
    walk(await (await call(assetLinksGet)).json());
    const allowed = new Set([IOS_ID, '/peer-request', 'org.example.fixture', FP, 'android_app', 'delegate_permission/common.handle_all_urls']);
    expect(strings.filter((value) => !allowed.has(value))).toEqual([]);
  });
});

describe('the endpoints are server-rendered and read env inside GET (source scan)', () => {
  const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/pages/.well-known');
  for (const file of ['apple-app-site-association.ts', 'assetlinks.json.ts']) {
    const src = readFileSync(path.join(dir, file), 'utf8').replace(/\/\/.*$/gm, '');
    it(`${file}: ⛔ no prerender export, ⛔ no import.meta.env, ⛔ no redirect`, () => {
      expect(src).not.toMatch(/prerender/);
      expect(src).not.toMatch(/import\.meta\.env/);
      expect(src).not.toMatch(/redirect|Location/);
    });
    it(`${file}: process.env is read inside GET`, () => {
      expect(src.indexOf('process.env')).toBeGreaterThan(src.indexOf('export const GET'));
    });
  }

  it('⛔ no static copy of either file under public/ (it would be served as octet-stream)', () => {
    const publicDir = path.resolve(dir, '../../../public/.well-known');
    for (const name of ['apple-app-site-association', 'assetlinks.json']) {
      expect(existsSync(path.join(publicDir, name))).toBe(false);
    }
  });
});
