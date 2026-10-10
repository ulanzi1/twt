// packages/contracts/src/app-links/paths.ts
//
// The app-link URL grammar — Story 6.30 (`2026-10-10-312` AL2 / AL3). An app link is an `https://` URL
// that the OS hands to the TWT app (Android App Links / iOS Universal Links), or — on a phone without the
// app — to the public site's plain fallback page. Its shape is FIXED: `<origin><path>?c=<code>` — a fixed
// host, a fixed path, the opaque code ONLY in the query (India's operators whitelist a URL's fixed part; a
// dynamic part is allowed only after the `?`).
//
// ── ONE list, as DATA (Invariant 4) ───────────────────────────────────────────────────────────────────
// The paths live in `app-link-paths.json`, ⛔ not here: `apps/mobile/app.config.ts` cannot import TypeScript
// from this package (Expo loads the config with plain Node resolution) but CAN `require()` a JSON file —
// so the JSON is the single source for the app's intent filters, the two verification files, the
// fallback pages, the route-map test and the senders' URL builder. ⛔ Never a second copy of a path.
// A JSON import widens to `string`, so the literal type below is declared by hand; the module-load check
// and `tests/app-links.test.ts` hold it to the JSON. A new path is a deliberate grammar change (the
// `DeepLinkResource` discipline) — it also needs a mobile route, a fallback page and a matrix entry,
// each enforced by its own lockstep test.
//
// ── A separate grammar from `deep-links/` ─────────────────────────────────────────────────────────────
// `twt://p/<pariwarId>/…` (Story 5.2's push grammar) is untouched (AL13). An app link carries ⛔ no
// Pariwar id, ⛔ no credential and ⛔ no personal data — a path and an opaque code.

import appLinkPathsJson from './app-link-paths.json';

/** The app-link paths, keyed. The literal types are declared by hand (a JSON import widens to `string`). */
export interface AppLinkPaths {
  readonly peerRequest: '/peer-request';
}
export type AppLinkKey = keyof AppLinkPaths;
export type AppLinkPath = AppLinkPaths[AppLinkKey];

const DECLARED_KEYS: readonly AppLinkKey[] = ['peerRequest'];

function checkAppLinkPaths(raw: Readonly<Record<string, unknown>>): AppLinkPaths {
  const keys = Object.keys(raw).sort();
  if (keys.join(',') !== [...DECLARED_KEYS].sort().join(',')) {
    throw new Error(`[app-links] app-link-paths.json keys ${keys.join(',')} ≠ the declared ${DECLARED_KEYS.join(',')}`);
  }
  const seen = new Set<string>();
  for (const key of keys) {
    const path = raw[key];
    // An exact, single-segment-or-more path: leading `/`, lower-case letters, digits and `-` per segment,
    // ⛔ no trailing `/`, query or fragment — the Android filter and the AASA component match it EXACTLY.
    if (typeof path !== 'string' || !/^(\/[a-z0-9]+(-[a-z0-9]+)*)+$/.test(path)) {
      throw new Error(`[app-links] app-link-paths.json "${key}" is not an exact lower-case path`);
    }
    if (seen.has(path)) throw new Error(`[app-links] app-link-paths.json repeats the path ${path}`);
    seen.add(path);
  }
  return Object.freeze({ ...raw }) as unknown as AppLinkPaths;
}

/** The app-link paths — the TypeScript view of `app-link-paths.json`, checked at module load. */
export const APP_LINK_PATHS: AppLinkPaths = checkAppLinkPaths(appLinkPathsJson);

/** Every app-link path, in the declared key order. */
export const APP_LINK_PATH_LIST: readonly AppLinkPath[] = Object.freeze(
  DECLARED_KEYS.map((key) => APP_LINK_PATHS[key]),
);

/** The ONE query parameter an app link carries. */
export const APP_LINK_CODE_PARAM = 'c';

/**
 * The opaque code's shape (6.27 PM21 (a)): 12 base-62 characters — URI-safe by construction, so the URL
 * needs ⛔ no encoding. 6.27c's generator and route consume this; ⛔ never a second pattern.
 */
export const APP_LINK_CODE_PATTERN = /^[A-Za-z0-9]{12}$/;

/**
 * True iff `baseUrl` is a BARE https origin — exactly what `URL.origin` gives back (lower-case host, ⛔ no
 * default port, path, trailing `/`, credentials, query or fragment). The jobs-side
 * `resolveHttpsOrigin` normalises a configured value into this form.
 */
function isBareHttpsOrigin(baseUrl: string): boolean {
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    return false;
  }
  return url.protocol === 'https:' && url.origin === baseUrl;
}

/**
 * Builds `<baseUrl><path>?c=<code>`. Throws on a base that is ⛔ not a bare https origin (a path or a
 * trailing `/` is refused — normalise it with `resolveHttpsOrigin` first) and on a malformed code: a
 * wrong URL in a text cannot be recalled, so a bad input is a loud configuration error, ⛔ never a guess.
 */
export function buildAppLinkUrl(baseUrl: string, key: AppLinkKey, code: string): string {
  if (!isBareHttpsOrigin(baseUrl)) {
    throw new Error('[app-links] buildAppLinkUrl: the base is not a bare https origin');
  }
  if (!APP_LINK_CODE_PATTERN.test(code)) {
    throw new Error('[app-links] buildAppLinkUrl: the code is malformed');
  }
  return `${baseUrl}${APP_LINK_PATHS[key]}?${APP_LINK_CODE_PARAM}=${code}`;
}

/** The search-params shape expo-router hands a screen (`useLocalSearchParams` / `useGlobalSearchParams`). */
export type AppLinkSearchParams = Readonly<Record<string, string | readonly string[] | undefined>>;

/**
 * The code from a link's search params, or `null` when it is missing, malformed or repeated (an array).
 * ⛔ Never logged by any caller (6.27 PM21 (e)).
 */
export function parseAppLinkCode(params: AppLinkSearchParams): string | null {
  const raw = params[APP_LINK_CODE_PARAM];
  if (typeof raw !== 'string') return null;
  return APP_LINK_CODE_PATTERN.test(raw) ? raw : null;
}
