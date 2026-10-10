// Story 6.30 AC6 — the plain fallback page (`2026-10-10-312` AL11, `-315` C7; N12–N14). The house way (⛔ no
// `.astro` harness): the pure `peer-request-render.ts` model is tested directly — both languages, ⛔ no
// hard-coded brand, store buttons only when configured, ⛔ no code in its output — and `peer-request.astro` /
// `PublicShell.astro` are pinned by source scans.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { t } from '@twt/i18n';
import { describe, expect, it } from 'vitest';

import { buildPeerRequestPageModel } from '../src/lib/peer-request-render.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const strip = (src: string): string => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const PAGE = readFileSync(path.join(here, '../src/pages/peer-request.astro'), 'utf8');
const PAGE_CODE = strip(PAGE);
const SHELL = readFileSync(path.join(here, '../src/layouts/PublicShell.astro'), 'utf8');

const DISTINCTIVE_CODE = 'Zq7Xw3Kp9Lm2';
const ANDROID_URL = 'https://play.google.com/store/apps/details?id=org.example.fixture';
const IOS_URL = 'https://apps.apple.com/in/app/fixture/id1234567890';

const text = (model: ReturnType<typeof buildPeerRequestPageModel>): string => JSON.stringify(model);

describe('the render model', () => {
  it('both languages, Hindi first, each block marked with its language', () => {
    const model = buildPeerRequestPageModel({});
    expect(model.blocks.map((block) => block.lang)).toEqual(['hi', 'en']);
    expect(model.blocks[0]!.paragraphs.join(' ')).toMatch(/[ऀ-ॿ]/);
    expect(model.blocks[1]!.paragraphs).toEqual([
      'Please open the app to answer.',
      "The request is also on your app's home screen.",
      "Don't have the app? Install it, then open the link in your message again — or call the helpline number in your message.",
    ]);
  });

  it('says "your message", never "your text"; carries no helpline number', () => {
    const all = text(buildPeerRequestPageModel({}));
    expect(all).toContain('your message');
    expect(all).not.toMatch(/your text/i);
    expect(all).not.toMatch(/\d{6,}|\+91/);
  });

  it('⛔ no hard-coded brand — "the app" without APP_DISPLAY_NAME', () => {
    const all = text(buildPeerRequestPageModel({}));
    expect(all).not.toMatch(/TWT|Prototype|Teachers|Welfare|Trust/);
  });

  it('names the app from APP_DISPLAY_NAME when set (both languages)', () => {
    const model = buildPeerRequestPageModel({ APP_DISPLAY_NAME: '  Fixture Name  ' });
    expect(model.blocks[1]!.paragraphs[0]).toBe('Please open the Fixture Name app to answer.');
    expect(model.blocks[0]!.paragraphs[0]).toContain('Fixture Name');
    expect(buildPeerRequestPageModel({ APP_DISPLAY_NAME: '   ' }).blocks[1]!.paragraphs[0]).toBe('Please open the app to answer.');
  });

  it('the title is neutral copy, the same value used as trustName', () => {
    const model = buildPeerRequestPageModel({});
    expect(model.title).toBe(
      `${t('page_title', undefined, { locale: 'hi', namespace: 'app-links' })} / ${t('page_title', undefined, { locale: 'en', namespace: 'app-links' })}`,
    );
  });

  it('⛔ no store buttons unless configured', () => {
    expect(buildPeerRequestPageModel({}).storeButtons).toEqual([]);
    expect(buildPeerRequestPageModel({ APP_STORE_URL_ANDROID: '', APP_STORE_URL_IOS: ' ' }).storeButtons).toEqual([]);
  });

  it('a configured store gets a bilingual button to that URL', () => {
    const model = buildPeerRequestPageModel({ APP_STORE_URL_ANDROID: ANDROID_URL, APP_STORE_URL_IOS: IOS_URL });
    expect(model.storeButtons.map((button) => [button.platform, button.href])).toEqual([
      ['android', ANDROID_URL],
      ['ios', IOS_URL],
    ]);
    expect(model.storeButtons[0]!.label).toBe('Google Play से इंस्टॉल करें / Install from Google Play');
  });

  it.each([
    ['http', 'http://play.google.com/store/apps/details?id=x'],
    ['a foreign host', 'https://example.org/app'],
    ['the other store', IOS_URL],
    ['not a URL', 'play.google.com/store'],
    ['credentials', 'https://u:p@play.google.com/store'],
  ])('⛔ no Android button for %s', (_label, url) => {
    expect(buildPeerRequestPageModel({ APP_STORE_URL_ANDROID: url }).storeButtons).toEqual([]);
  });

  it('⛔ never contains the link code — whatever the env (Invariant 3)', () => {
    for (const env of [
      {},
      { APP_DISPLAY_NAME: 'X', APP_STORE_URL_ANDROID: ANDROID_URL, APP_STORE_URL_IOS: IOS_URL },
    ]) {
      expect(text(buildPeerRequestPageModel(env))).not.toContain(DISTINCTIVE_CODE);
    }
  });

  it('takes ⛔ no URL / request input — its only parameter is the env', () => {
    expect(buildPeerRequestPageModel.length).toBe(1);
    const src = strip(readFileSync(path.join(here, '../src/lib/peer-request-render.ts'), 'utf8'));
    expect(src).not.toMatch(/Astro|searchParams|fetch\(|\brequest\b|process\.env/);
  });
});

describe('every new app-links key resolves through the real t() (⛔ never a stub)', () => {
  const KEYS = ['page_title', 'body.open_app', 'body.open_named_app', 'body.home_screen', 'body.no_app', 'store.android', 'store.ios'];
  for (const locale of ['hi', 'en'] as const) {
    it.each(KEYS)(`[${locale}] %s`, (key) => {
      const value = t(key, key === 'body.open_named_app' ? { app_name: 'X' } : undefined, { locale, namespace: 'app-links' });
      expect(value.trim().length).toBeGreaterThan(0);
    });
  }
});

describe('peer-request.astro (source scan)', () => {
  it('renders <PublicShell with hideLanguageToggle, noindex and branding={null}', () => {
    expect(PAGE_CODE).toMatch(/<PublicShell[^>]*\bhideLanguageToggle\b/);
    expect(PAGE_CODE).toMatch(/<PublicShell[^>]*\bnoindex\b/);
    expect(PAGE_CODE).toMatch(/<PublicShell[^>]*branding=\{null\}/);
    expect(PAGE_CODE).toMatch(/<PublicShell[^>]*locale="hi"/);
    expect(PAGE_CODE).toMatch(/<PublicShell[^>]*title=\{model\.title\}[^>]*trustName=\{model\.title\}/);
  });

  it('sets no-referrer and its Cache-Control, and ⛔ no Vary', () => {
    expect(PAGE_CODE).toContain("Astro.response.headers.set('Referrer-Policy', 'no-referrer')");
    expect(PAGE_CODE).toContain("Astro.response.headers.set('Cache-Control', 'public, max-age=300')");
    expect(PAGE_CODE).not.toMatch(/Vary/i);
  });

  it('⛔ never reads Astro.url / Astro.request / searchParams / fetch', () => {
    expect(PAGE_CODE).not.toMatch(/Astro\.url|Astro\.request|searchParams|fetch\(|Astro\.params/);
  });

  it('marks each block with its language and adds ⛔ no scoped style', () => {
    expect(PAGE_CODE).toContain('<section lang={block.lang}>');
    expect(PAGE_CODE).not.toMatch(/<style/);
  });
});

describe('PublicShell.astro — the hideLanguageToggle prop', () => {
  it('declares the prop, defaulting to false', () => {
    expect(SHELL).toContain('hideLanguageToggle?: boolean;');
    expect(SHELL).toContain('hideLanguageToggle = false');
  });

  it('⛔ never calls withLang() outside the !hideLanguageToggle block', () => {
    // Every CALL in the whole file (frontmatter included) — only the definition is exempt.
    const code = strip(SHELL);
    const guard = code.indexOf('{!hideLanguageToggle && (');
    const close = code.indexOf('</nav>', guard);
    expect(guard).toBeGreaterThan(-1);
    const calls = [...code.matchAll(/(?<!function )withLang\(/g)].map((match) => match.index!);
    expect(calls.length).toBeGreaterThan(0);
    for (const at of calls) {
      expect(at).toBeGreaterThan(guard);
      expect(at).toBeLessThan(close);
    }
  });
});
