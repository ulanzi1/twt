// The plain fallback page's render model — Story 6.30 (`2026-10-10-312` AL11, corrected by `-315` C7; N12–N14).
//
// ALL `/peer-request` display logic lives HERE (house convention — `.astro` files have no unit tests; the page
// is a thin wrapper, pinned by source scans). A phone WITHOUT the app opens `https://<domain>/peer-request?c=<code>`
// in the browser and lands on this page.
//
// ⛔ THE PAGE NEVER READS, ECHOES OR RESOLVES THE CODE (Invariant 3). This model's ONLY inputs are fixed copy
// and three env values — ⛔ no URL, ⛔ no request, ⛔ no API call, ⛔ no database. So the body is the same for
// every visitor and every code (⇒ cacheable, ⛔ no `Vary`), and a page that could answer "is this code
// real?" — an oracle, and a fourth public API route — cannot be built from here.
//
// The words: BOTH languages on ONE page, Hindi first (⛔ no language toggle — `PublicShell`'s toggle would
// copy `?c=` into its links). The app is ⛔ never named by a hard-coded brand (PRD OQ-1 may change it): the
// name comes from `APP_DISPLAY_NAME` when set, else the words say "the app". ⛔ No helpline number (the
// message carries it — ⛔ never a second source). Store buttons ONLY for a configured store URL (⛔ no dead
// link), and only to that store's own host.

import { t } from '@twt/i18n';

/** The env this model reads — all optional, all public values (the `public` service's env). */
export interface PeerRequestPageEnv {
  readonly APP_DISPLAY_NAME?: string;
  readonly APP_STORE_URL_ANDROID?: string;
  readonly APP_STORE_URL_IOS?: string;
}

export interface PeerRequestLanguageBlock {
  readonly lang: 'hi' | 'en';
  readonly paragraphs: readonly string[];
}

export interface PeerRequestStoreButton {
  readonly platform: 'android' | 'ios';
  readonly href: string;
  /** Hindi first, then English — one bilingual label per button. */
  readonly label: string;
}

export interface PeerRequestPageModel {
  /** The page title AND `PublicShell`'s `trustName` (the same value, so the shell dedupes — ⛔ never a Trust name). */
  readonly title: string;
  readonly blocks: readonly PeerRequestLanguageBlock[];
  readonly storeButtons: readonly PeerRequestStoreButton[];
}

/** The two stores, each held to its own host — a mistyped or foreign URL shows ⛔ no button. */
const STORE_HOSTS = {
  android: 'play.google.com',
  ios: 'apps.apple.com',
} as const;

function storeUrl(raw: string | undefined, platform: keyof typeof STORE_HOSTS): string | null {
  const value = raw?.trim();
  if (value === undefined || value === '') return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.hostname !== STORE_HOSTS[platform] || url.username !== '' || url.password !== '') {
    return null;
  }
  return url.toString();
}

const tr = (lang: 'hi' | 'en', key: string, params?: Record<string, string>): string =>
  t(key, params, { locale: lang, namespace: 'app-links' });

/** Builds the page from fixed copy + env. Pure — the same env gives the same page. */
export function buildPeerRequestPageModel(env: PeerRequestPageEnv): PeerRequestPageModel {
  const appName = env.APP_DISPLAY_NAME?.trim() || null;
  const block = (lang: 'hi' | 'en'): PeerRequestLanguageBlock => ({
    lang,
    paragraphs: [
      appName === null ? tr(lang, 'body.open_app') : tr(lang, 'body.open_named_app', { app_name: appName }),
      tr(lang, 'body.home_screen'),
      tr(lang, 'body.no_app'),
    ],
  });

  const storeButtons: PeerRequestStoreButton[] = [];
  for (const [platform, raw] of [
    ['android', env.APP_STORE_URL_ANDROID],
    ['ios', env.APP_STORE_URL_IOS],
  ] as const) {
    const href = storeUrl(raw, platform);
    if (href !== null) {
      storeButtons.push({ platform, href, label: `${tr('hi', `store.${platform}`)} / ${tr('en', `store.${platform}`)}` });
    }
  }

  return {
    title: `${tr('hi', 'page_title')} / ${tr('en', 'page_title')}`,
    blocks: [block('hi'), block('en')],
    storeButtons,
  };
}
