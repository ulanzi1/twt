note because this is in a monorepo had to remove react, react-dom, and react-native-web deps and change metro.config.js a bit.

## The app config and its variants (Story 6.30)

`app.config.ts` replaced the prototype's `app.json` (`2026-10-10-312` AL1 / AL7). The build variant is **`APP_VARIANT`**, set in each
`eas.json` build profile's `env` (`development` / `preview` / `production`) — ⛔ never `EAS_BUILD_PROFILE`, which the EAS CLI does not
see when it evaluates the config locally before upload.

- **Unset / `development` / `preview`** — today's prototype identity, unchanged (`tests/fixtures/app-config-prototype.json`).
- **`production`** — the identity comes from `APP_IDENTITY_NAME`, `APP_IDENTITY_SCHEME`, `APP_IDENTITY_IOS_BUNDLE_ID`,
  `APP_IDENTITY_ANDROID_PACKAGE`; the config **throws** when any is unset (⛔ never a silent prototype production build). The values are
  BigDev's / the Trust's decision (roster Row 29 (a)) and go in the production profile's `eas.json` `env` — ⛔ never placeholders.
  `APP_LINKS_HOST` (the same profile `env`) adds the Android App Links intent filter (exact paths from
  `@twt/contracts/src/app-links/app-link-paths.json`) and `applinks:<host>`; unset ⇒ no link settings.
- **`eas submit`** evaluates the config with the shell env alone — run it with `APP_VARIANT=production` and the `APP_IDENTITY_*` values
  exported, or it resolves the wrong identity.
- `extra.eas.projectId` is written as ONE literal in the static base when the EAS project is created (`-316` E1) — absent until then.
- After changing the identity or the link settings, regenerate the native projects: `pnpm dlx expo prebuild --clean` (local, untracked
  `android/` / `ios/` dirs keep stale native config otherwise).
- `pnpm --filter @twt/mobile app-config:check` (the `expo-config` CI job) runs the real Expo loader for every variant.
