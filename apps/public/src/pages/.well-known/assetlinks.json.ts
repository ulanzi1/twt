// `/.well-known/assetlinks.json` — Android App Links (Story 6.30, `2026-10-10-312` AL8).
//
// A server-rendered ENDPOINT, ⛔ never prerendered and ⛔ never a file in `public/` (the AASA file's reason
// applies to both — one rule for the pair). The env is read INSIDE `GET` (⛔ not at module load).
// Body: one `delegate_permission/common.handle_all_urls` statement per package in `APP_LINKS_ANDROID_APPS`
// (a JSON list `[{ "package": "…", "sha256": ["AA:BB:…"] }]` — with Play App Signing, GOOGLE's signing-key
// fingerprint, plus the upload / EAS key for sideloaded builds). Unset / invalid ⇒ 404.

import type { APIRoute } from 'astro';

import { buildAssetLinks, parseAndroidAppsEnv } from '@twt/contracts';

import { wellKnownJson, wellKnownNotFound } from '../../lib/well-known.server.js';

export const GET: APIRoute = () => {
  const raw = process.env.APP_LINKS_ANDROID_APPS;
  const apps = parseAndroidAppsEnv(raw);
  return apps === null
    ? wellKnownNotFound('APP_LINKS_ANDROID_APPS', raw, '/.well-known/assetlinks.json')
    : wellKnownJson(buildAssetLinks(apps));
};
