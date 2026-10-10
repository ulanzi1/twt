// apps/mobile/app.config.ts — the app's Expo config (Story 6.30, `2026-10-10-312` AL1 / AL7, corrected by
// `-315` C1 and `-316` E1). It replaces the prototype's static `app.json`.
//
// ── The variant is `APP_VARIANT`, set in each `eas.json` build profile's `env` ─────────────────────────
// ⛔ Never `EAS_BUILD_PROFILE`: the EAS CLI evaluates this file LOCALLY before upload (to find the project
// and choose credentials) with ONLY the profile's `eas.json` `env` — `EAS_BUILD_PROFILE` exists only on
// the build worker, so a config keyed on it would resolve the PROTOTYPE locally.
//   • unset / `development` / `preview` ⇒ TODAY's prototype identity, byte-for-byte (local `expo start`,
//     `expo prebuild`, `build:web` and `eas update` without a profile env change nothing);
//   • `production` ⇒ the identity from `APP_IDENTITY_*` env — and the build FAILS when any is unset.
//     ⛔ Never a silent prototype production build; ⛔ never an invented identity (D-13 / PRD OQ-1 are
//     BigDev's / the Trust's — roster Row 29 (a)). An Android package can never change after the first
//     Play upload.
//   • any other value ⇒ the config THROWS (a typo such as `prod` must ⛔ not fall back to the prototype).
//
// ── App links (AL7) — production only ──────────────────────────────────────────────────────────────────
// From `APP_LINKS_HOST`: one `autoVerify` https intent filter with an EXACT `path` per app-link path (⛔
// never `pathPrefix` — `/peer-request` would also match `/peer-requests`) and `applinks:<host>`. Unset ⇒
// ⛔ no link settings (the app still builds; a link opens the browser → the public fallback page).
// `preview` gets ⛔ no link settings ⇒ the device proof (Row 29 (e)) needs a PRODUCTION-signed build.
//
// ── The ONE path list (Invariant 4) ────────────────────────────────────────────────────────────────────
// `require()` of the JSON BY PACKAGE NAME. Expo loads this file with `@expo/require-utils`: only this file
// is transpiled, its imports use plain Node resolution, and `@twt/contracts`' TypeScript barrel would fail
// `ERR_MODULE_NOT_FOUND` — so ⛔ never a `.ts` import from contracts here. A vitest run resolves through
// Vite and would hide that; the `expo-config` CI job (`scripts/check-app-config.mjs`) runs the real loader.
//
// ── `extra.eas.projectId` (`-316` E1) ──────────────────────────────────────────────────────────────────
// ONE public literal in the static base for EVERY variant, written when BigDev creates the EAS project
// (Row 29 (a)) — absent until then. ⛔ Never production-only (every `eas build` evaluates with its OWN
// profile's env; `eas submit` / `eas env:*` with the shell env alone). `slug` is ONE value for every
// variant (eas-cli refuses a slug that differs from the EAS project's).

import type { ExpoConfig } from 'expo/config';

const APP_LINK_PATHS: Readonly<Record<string, string>> = require('@twt/contracts/src/app-links/app-link-paths.json');

interface AppIdentity {
  readonly name: string;
  readonly scheme: string;
  readonly iosBundleIdentifier: string;
  readonly androidPackage: string;
}

/** Today's prototype identity — kept for every non-production variant. */
const PROTOTYPE_IDENTITY: AppIdentity = {
  name: 'TWT P0-5 Prototype',
  scheme: 'twtp05',
  iosBundleIdentifier: 'org.teacherswelfaretrust.p0prototype',
  androidPackage: 'org.teacherswelfaretrust.p0prototype',
};

export const APP_VARIANTS = ['development', 'preview', 'production'] as const;
export type AppVariant = (typeof APP_VARIANTS)[number];

/** The production identity's env names (N1). */
export const APP_IDENTITY_ENV = [
  'APP_IDENTITY_NAME',
  'APP_IDENTITY_SCHEME',
  'APP_IDENTITY_IOS_BUNDLE_ID',
  'APP_IDENTITY_ANDROID_PACKAGE',
] as const;

type Env = Readonly<Record<string, string | undefined>>;

function nonBlank(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed === '' ? undefined : trimmed;
}

function resolveVariant(env: Env): AppVariant | undefined {
  const raw = nonBlank(env.APP_VARIANT);
  if (raw === undefined) return undefined;
  if (!(APP_VARIANTS as readonly string[]).includes(raw)) {
    throw new Error(`[app.config] APP_VARIANT="${raw}" is not one of ${APP_VARIANTS.join(' / ')}`);
  }
  return raw as AppVariant;
}

function productionIdentity(env: Env): AppIdentity {
  const missing = APP_IDENTITY_ENV.filter((name) => nonBlank(env[name]) === undefined);
  if (missing.length > 0) {
    throw new Error(
      `[app.config] APP_VARIANT=production needs ${missing.join(', ')} — the production identity is never invented (roster Row 29 (a))`,
    );
  }
  return {
    name: nonBlank(env.APP_IDENTITY_NAME)!,
    scheme: nonBlank(env.APP_IDENTITY_SCHEME)!,
    iosBundleIdentifier: nonBlank(env.APP_IDENTITY_IOS_BUNDLE_ID)!,
    androidPackage: nonBlank(env.APP_IDENTITY_ANDROID_PACKAGE)!,
  };
}

/** A bare host name (`example.org`) — ⛔ no scheme, port, path or trailing dot. */
function resolveLinksHost(env: Env): string | undefined {
  const host = nonBlank(env.APP_LINKS_HOST);
  if (host === undefined) return undefined;
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(host)) {
    throw new Error(`[app.config] APP_LINKS_HOST="${host}" is not a lower-case host name`);
  }
  return host;
}

/** The Android intent filters + iOS associated domains for `host` — one EXACT path per app-link path. */
export function appLinkSettings(host: string): {
  intentFilters: NonNullable<NonNullable<ExpoConfig['android']>['intentFilters']>;
  associatedDomains: string[];
} {
  return {
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: Object.values(APP_LINK_PATHS).map((path) => ({ scheme: 'https', host, path })),
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
    associatedDomains: [`applinks:${host}`],
  };
}

/** The whole config as a pure function of the env — `export default` below hands it `process.env`. */
export function resolveAppConfig(env: Env): ExpoConfig {
  const variant = resolveVariant(env);
  const identity = variant === 'production' ? productionIdentity(env) : PROTOTYPE_IDENTITY;
  const host = variant === 'production' ? resolveLinksHost(env) : undefined;
  const links = host === undefined ? undefined : appLinkSettings(host);

  return {
    name: identity.name,
    slug: 'twt-p0-5-prototype',
    version: '0.1.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: identity.scheme,
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/images/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: false,
      bundleIdentifier: identity.iosBundleIdentifier,
      ...(links === undefined ? {} : { associatedDomains: links.associatedDomains }),
    },
    android: {
      package: identity.androidPackage,
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      ...(links === undefined ? {} : { intentFilters: links.intentFilters }),
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      'expo-font',
      [
        'expo-build-properties',
        {
          ios: { newArchEnabled: true },
          android: { newArchEnabled: true },
        },
      ],
      'expo-web-browser',
      [
        'expo-notifications',
        {
          icon: './assets/images/icon.png',
          color: '#202020',
          defaultChannel: 'default',
        },
      ],
      'expo-secure-store',
      'expo-sharing',
    ],
    experiments: {
      typedRoutes: true,
    },
  };
}

export default (): ExpoConfig => resolveAppConfig(process.env);
