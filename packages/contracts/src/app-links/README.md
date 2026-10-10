# `packages/contracts/src/app-links/`

The **app-link** grammar — Story 6.30 (`2026-10-10-312` AL2 / AL3 / AL8, corrected by `-315` / `-316`). An app link is
`https://<domain><path>?c=<code>`: a fixed host, a fixed path from the list below, and an opaque 12-character base-62 code ONLY in
the query. The OS opens the TWT app for it (Android App Links / iOS Universal Links); on a phone without the app, the public site
serves a plain fallback page that ⛔ never reads the code.

## The ONE path list — `app-link-paths.json`

A JSON **data** file, so the app config (`apps/mobile/app.config.ts`, which cannot import TypeScript from this package) can
`require('@twt/contracts/src/app-links/app-link-paths.json')`. Every consumer reads it — ⛔ never a second copy:

| Consumer | Reads it through |
|---|---|
| the app's Android intent filters + iOS associated domain (`apps/mobile/app.config.ts`) | `require()` of the JSON |
| the two verification files (`apps/public/src/pages/.well-known/*.ts`) | `APP_LINK_PATH_LIST` + the builders |
| the fallback page per path (`apps/public/src/pages/<path>.astro`) + its PII-matrix entry | the page/matrix lockstep test |
| the app route per path (`apps/mobile/app/(…)/<path>.tsx`) | the strict route-map test |
| the login that keeps its place (`apps/mobile/lib/link-target.ts`) | `APP_LINK_PATHS` (an allowlist) |
| the senders (Story 6.27c — the neighbours' text) | `buildAppLinkUrl` + `APP_LINK_CODE_PATTERN` |

Adding a path is a deliberate grammar change: the JSON key, the hand-declared literal type in `paths.ts`, a mobile route, a
fallback page, a matrix entry, a Traefik `Path(...)` in `infra/dokploy/compose.yaml` and a DLT URL-whitelisting line — the
lockstep tests catch the first five.

## Exports

- `APP_LINK_PATHS` / `APP_LINK_PATH_LIST` — the typed view of the JSON (checked at module load).
- `APP_LINK_CODE_PARAM` (`'c'`), `APP_LINK_CODE_PATTERN` (`/^[A-Za-z0-9]{12}$/`).
- `buildAppLinkUrl(baseUrl, key, code)` — `baseUrl` must be a BARE https origin (normalise a configured value with the jobs-side
  `resolveHttpsOrigin`); throws on a bad base or code.
- `parseAppLinkCode(params)` — the code or `null` (missing / malformed / repeated).
- `parseIosAppIdsEnv` / `parseAndroidAppsEnv` — the `public` service's `APP_LINKS_IOS_APP_IDS` / `APP_LINKS_ANDROID_APPS`; `null`
  ⇒ the endpoint answers 404.
- `buildAppleAppSiteAssociation` / `buildAssetLinks` — the two file bodies, from a LIST of app identities.

## Not here

- The `twt://` push grammar — `../deep-links/` (untouched — AL13).
- The code's generation, storage and resolution — Story 6.27c.
- ⛔ Never log a code (6.27 PM21 (e)).
