// App-link grammar barrel — Story 6.30 (`2026-10-10-312` AL2). Re-exported from the `@twt/contracts` top
// barrel; ⛔ no `@twt/contracts/app-links` subpath is wired (the deep-links posture). `apps/mobile/app.config.ts`
// reads `app-link-paths.json` directly by package path — it cannot import this TypeScript.

export {
  APP_LINK_PATHS,
  APP_LINK_PATH_LIST,
  APP_LINK_CODE_PARAM,
  APP_LINK_CODE_PATTERN,
  buildAppLinkUrl,
  parseAppLinkCode,
  type AppLinkPaths,
  type AppLinkKey,
  type AppLinkPath,
  type AppLinkSearchParams,
} from './paths.js';
export {
  IosAppId,
  AndroidPackage,
  Sha256Fingerprint,
  AndroidAppEnvEntry,
  parseIosAppIdsEnv,
  parseAndroidAppsEnv,
  buildAppleAppSiteAssociation,
  buildAssetLinks,
  type IosAppIdentity,
  type AndroidAppIdentity,
} from './verification.js';
