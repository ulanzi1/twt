// packages/contracts/src/app-links/verification.ts
//
// The two verification files — Story 6.30 (`2026-10-10-312` AL2 / AL8). The public site serves
// `/.well-known/apple-app-site-association` (iOS Universal Links) and `/.well-known/assetlinks.json`
// (Android App Links) so the OS opens the app for an app-link path. Both are KEYED by the app's identity
// (Apple Team ID + bundle id; Android package + signing-key fingerprints) — values this story ⛔ never
// invents (AL1, Invariant 5): they arrive as env on the `public` service, are validated here, and an
// unset or invalid value means the endpoint answers 404 — ⛔ never a body that verifies the wrong app.
//
// ── Why the schemas live here (N3) ────────────────────────────────────────────────────────────────────
// `apps/public` has ⛔ no `zod` dependency; contracts does. The endpoints call the env parsers below and
// the pure body builders — ⛔ no I/O here, ⛔ no clock.
//
// ── A LIST of identities (FR-61, AL2) ─────────────────────────────────────────────────────────────────
// One app per Pariwar is planned; v1 ships one. ⚠ ONE app per host per path — two apps verified for one
// host + path give an Android chooser and undefined iOS behaviour ⇒ at the second Pariwar the host
// becomes per-Pariwar. The list shape is kept so that change is config, ⛔ not a grammar change.

import { z } from 'zod';

import { APP_LINK_PATH_LIST, type AppLinkPath } from './paths.js';

/** `<TEAMID>.<bundleId>` — a 10-character upper-case Apple Team ID, then a reverse-DNS bundle id. */
export const IosAppId = z
  .string()
  .regex(/^[A-Z0-9]{10}\.[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/, 'not <TEAMID>.<bundleId>');

/** A Java-style Android application id (`org.example.app`). */
export const AndroidPackage = z
  .string()
  .regex(/^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/, 'not an Android package name');

/**
 * A SHA-256 signing-certificate fingerprint: 32 colon-separated upper-case hex pairs. The input is
 * UPPER-CASED first — a lower-case paste from `keytool` or a console must ⛔ not become a silent 404.
 */
export const Sha256Fingerprint = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim().toUpperCase() : value),
  z.string().regex(/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/, 'not a SHA-256 fingerprint'),
);

/** One Android app as the `APP_LINKS_ANDROID_APPS` env lists it. */
export const AndroidAppEnvEntry = z
  .object({
    package: AndroidPackage,
    sha256: z.array(Sha256Fingerprint).min(1),
  })
  .strict();

/** The identity the AASA builder takes. */
export interface IosAppIdentity {
  readonly iosAppId: string;
}

/** The identity the assetlinks builder takes. */
export interface AndroidAppIdentity {
  readonly androidPackage: string;
  readonly sha256Fingerprints: readonly string[];
}

function hasDuplicates(values: readonly string[]): boolean {
  return new Set(values).size !== values.length;
}

/**
 * `APP_LINKS_IOS_APP_IDS` — a comma list of `<TEAMID>.<bundleId>`. Returns `null` when unset, blank,
 * any entry invalid, or an id repeated (⇒ the endpoint answers 404).
 */
export function parseIosAppIdsEnv(raw: string | undefined): IosAppIdentity[] | null {
  if (raw === undefined || raw.trim() === '') return null;
  const ids = raw.split(',').map((part) => part.trim());
  if (ids.some((id) => !IosAppId.safeParse(id).success) || hasDuplicates(ids)) return null;
  return ids.map((iosAppId) => ({ iosAppId }));
}

/**
 * `APP_LINKS_ANDROID_APPS` — a JSON list `[{ "package": "…", "sha256": ["AA:BB:…"] }]`. Returns `null`
 * when unset, blank, ⛔ not JSON, empty, any entry invalid, or a package repeated (⇒ the endpoint answers
 * 404). Fingerprints come back upper-cased.
 */
export function parseAndroidAppsEnv(raw: string | undefined): AndroidAppIdentity[] | null {
  if (raw === undefined || raw.trim() === '') return null;
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  const parsed = z.array(AndroidAppEnvEntry).min(1).safeParse(json);
  if (!parsed.success) return null;
  if (hasDuplicates(parsed.data.map((app) => app.package))) return null;
  return parsed.data.map((app) => ({ androidPackage: app.package, sha256Fingerprints: app.sha256 }));
}

/**
 * The `apple-app-site-association` body: one `details` entry listing every app id, its `components` one
 * `{"/": path}` per app-link path — EXACT paths, and ⛔ no `"?"` component (iOS, like Android, opens the
 * app with or without `c`; the screen handles a missing code).
 */
export function buildAppleAppSiteAssociation(
  apps: readonly IosAppIdentity[],
  paths: readonly AppLinkPath[] = APP_LINK_PATH_LIST,
): { applinks: { details: { appIDs: string[]; components: { '/': string }[] }[] } } {
  if (apps.length === 0) throw new Error('[app-links] buildAppleAppSiteAssociation: no app identity');
  return {
    applinks: {
      details: [
        {
          appIDs: apps.map((app) => app.iosAppId),
          components: paths.map((path) => ({ '/': path })),
        },
      ],
    },
  };
}

/** The `assetlinks.json` body: one `handle_all_urls` statement per Android package. */
export function buildAssetLinks(apps: readonly AndroidAppIdentity[]): {
  relation: string[];
  target: { namespace: 'android_app'; package_name: string; sha256_cert_fingerprints: string[] };
}[] {
  if (apps.length === 0) throw new Error('[app-links] buildAssetLinks: no app identity');
  return apps.map((app) => ({
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: app.androidPackage,
      sha256_cert_fingerprints: [...app.sha256Fingerprints],
    },
  }));
}
